import { getContext } from "@/lib/context";
import { db } from "@/lib/db";
import { chats, messages as _messages } from "@/lib/db/schema";
import { Message, OpenAIStream, StreamingTextResponse } from "ai";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "edge";
import { Configuration, OpenAIApi } from "openai-edge";
const config = new Configuration({
  apiKey: process.env.OPEN_API_KEY,
});
const openai = new OpenAIApi(config);

export async function POST(req: Request) {
  try {
    const { messages, chatId } = await req.json();

    const lastMessage = messages[messages.length - 1];
    const _chats = await db.select().from(chats).where(eq(chats.id, chatId));
    if (_chats.length != 1) {
      return NextResponse.json({ error: "chat not found" });
    }

    const fileKey = _chats[0].fileKey;

    const context = await getContext(lastMessage.content, fileKey);

    let foundtext = context
      .map((doc) => doc.text)
      .join("\n")
      .substring(0, 3000);

    let pageNumbers = context.map((doc) => doc.pageNumber).join(", ");

    console.log("final ", pageNumbers);

    const prompt = {
      role: "system",
      content: `AI assistant is a brand new, powerful, human-like artificial intelligence.
      The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
      AI is a well-behaved and well-mannered individual.
      AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.
      AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in conversation.
      START CONTEXT BLOCK:
      """
      ${foundtext}
      
      """
      END OF CONTEXT BLOCK
      AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation from a pdf.
      If the context does not provide the answer to question, the AI assistant will say, "I'm sorry, but I don't know the answer to that question".
      AI assistant will not apologize for previous responses, but instead will indicated new information was gained.
      AI assistant will not invent anything that is not drawn directly from the context.
      AND ALWAYS MENTION THE pages numbers in your responce which is provided here:
      Page Numbers: ${pageNumbers} 
      `,
    };
    const responce = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",

      messages: [
        prompt,
        ...messages.filter((message: Message) => message.role === "user"),
      ],
      stream: true,
    });

    const stream = OpenAIStream(responce, {
      onStart: async () => {
        await db.insert(_messages).values({
          chatId,
          content: lastMessage.content,
          role: "user",
        });
      },
      onCompletion: async (completion) => {
        await db.insert(_messages).values({
          chatId,
          content: completion,
          role: "system",
        });
      },
    });
    return new StreamingTextResponse(stream);
  } catch (error) {
    return NextResponse.json({ error });
  }
}
