import { OpenAIApi, Configuration } from "openai-edge";

const config = new Configuration({
  apiKey: process.env.OPEN_API_KEY,
});

const openai = new OpenAIApi(config);

export async function getEmbeddings(text: string) {
  console.log("texxxt", text);
  const responce = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: text.replace(/\n/g, " "),
  });
  const result = await responce.json();
  console.log(" embeddings succuess?", result.data[0].embedding[0]);
  return result.data[0].embedding as number[];
}
