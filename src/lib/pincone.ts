import { Pinecone, PineconeRecord } from "@pinecone-database/pinecone";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import md5 from "md5";
import {
  Document,
  RecursiveCharacterTextSplitter,
} from "@pinecone-database/doc-splitter";
import { getEmbeddings } from "./embeddings";
import { convertToAscii } from "./utils";

export const getPineconeClient = () => {
  return new Pinecone({
    environment: process.env.PINECONE_ENVIRONMENT!,
    apiKey: process.env.PINECONE_API_KEY!,
  });
};

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
  };
};

export async function loadS3IntoPinecone(fileKey: string) {
  // 1. obtain the pdf -> downlaod and read from pdf
  console.log("downloading s3 into file system");
  const file_name = await downloadFromS3(fileKey);
  if (!file_name) {
    throw new Error("could not download from s3");
  }
  console.log("loading pdf into memory" + file_name);
  const loader = new PDFLoader(file_name);
  const pages = (await loader.load()) as PDFPage[];

  // 2. split and segment the pdf
  const documents = await Promise.all(pages.map(prepareDocument));
  console.log("creating embedings");
  // 3. vectorise and embed individual documents
  const vectors = await Promise.all(documents.flat().map(embedDocument));
  console.log(" got vectors in loads3 funtion? ", vectors.length);

  //   // 4. upload to pinecone
  const client = await getPineconeClient();
  const pineconeIndex = await client.index("chatpdf");
  // const namespace = pineconeIndex.namespace(convertToAscii(fileKey));

  console.log("inserting vectors into pinecone");
  //batching
  const encoder = new TextEncoder();
  const batchSizeLimit = 4194303; // 4 MB limit
  let currentBatch: PineconeRecord[] = [];
  let currentBatchSize = 0;

  for (const vector of vectors) {
    const vectorBytes = encoder.encode(JSON.stringify(vector)).length;

    if (currentBatchSize + vectorBytes <= batchSizeLimit) {
      currentBatch.push(vector);
      currentBatchSize += vectorBytes;
    } else {
      // Upsert currentBatch into Pinecone
      await pineconeIndex.upsert(currentBatch);

      // Reset batch and size
      currentBatch = [vector];
      currentBatchSize = vectorBytes;
    }
  }

  // Upsert the last batch (if not empty)
  if (currentBatch.length > 0) {
    await pineconeIndex.upsert(currentBatch);
  }

  //batching end
  //await pineconeIndex.upsert(vectors);

  return documents[0];
}

async function embedDocument(doc: Document) {
  try {
    const embeddings: Array<number> = await getEmbeddings(doc.pageContent);
    const hash = md5(doc.pageContent);

    return {
      id: hash,
      values: embeddings,
      metadata: {
        text: doc.metadata.text,
        pageNumber: doc.metadata.pageNumber,
      },
    } as PineconeRecord;
  } catch (error) {
    console.log("error in embeddocument function", error);
    throw error;
  }
}

export const truncateStringByBytes = (str: string, bytes: number) => {
  const enc = new TextEncoder();
  return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, bytes));
};

async function prepareDocument(page: PDFPage) {
  let { pageContent, metadata } = page;
  pageContent = pageContent.replace(/\n/g, "");
  // split the docs
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 20,
  });
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        pageNumber: metadata.loc.pageNumber,
        text: truncateStringByBytes(pageContent, 36000),
      },
    }),
  ]);
  return docs;
}

// import { Pinecone } from "@pinecone-database/pinecone";
// const pinecone = new Pinecone({
//   apiKey: "your-api-key",
//   environment: "your-environment",
// });
// const index = pinecone.index("example-index");
// // In a more realistic scenario, these vector values are
// // the output of a model. Values must match the dimension
// // of the index.
// const records = [
//   { id: "1", values: [0.1, 0.2, 0.3] },
//   { id: "2", values: [0.4, 0.5, 0.6] },
// ];
// // Upsert a record in the default namespace
// await index.upsert(records);
// // Upsert a record in a non-default namespace (for paid indexes only)
// const ns = index.namespace("example-namespace");
// await ns.upsert(records);
