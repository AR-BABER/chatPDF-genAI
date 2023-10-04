import { Pinecone } from "@pinecone-database/pinecone";
import { convertToAscii } from "./utils";
import { getEmbeddings } from "./embeddings";

export async function getMatchesFromEmbeddings(
  embeddings: number[],
  fileKey: string
) {
  try {
    console.log("query embedings", embeddings[0]);
    const client = await new Pinecone({
      environment: process.env.PINECONE_ENVIRONMENT!,
      apiKey: process.env.PINECONE_API_KEY!,
    });
    const pineconeIndex = await client.index("chatpdf");
    //const namespace = pineconeIndex.namespace(convertToAscii(fileKey));

    const queryResult = await pineconeIndex.query({
      topK: 5,
      vector: embeddings,
      includeMetadata: true,
    });
    console.log("all outcome from vdb", queryResult);
    return queryResult.matches || [];
  } catch (error) {
    console.log("error querying embeddings", error);
    throw error;
  }
}

export async function getContext(query: string, fileKey: string) {
  //console.log("query context", query);

  const queryEmbeddings = await getEmbeddings(query);
  const matches = await getMatchesFromEmbeddings(queryEmbeddings, fileKey);
  //console.log("matches", matches);
  const qualifyingDocs = matches.filter(
    (match) => match.score && match.score > 0.7
  );

  type Metadata = {
    text: string;
    pageNumber: number;
  };

  //let docs = qualifyingDocs.map((match) => (match.metadata as Metadata).text);
  let docs = qualifyingDocs.map((match) => ({
    text: (match.metadata as Metadata).text,
    pageNumber: (match.metadata as Metadata).pageNumber,
  }));
  console.log("context found, ");
  return docs;

  // 5 vectors

  // return docs.join("\n").substring(0, 3000);
}
