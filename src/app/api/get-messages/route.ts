import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "edge";
export const POST = async (req: Request) => {
  const { chatId } = await req.json();
  console.log("get messgaes chat id", chatId);
  const _messages = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId));

  return NextResponse.json(_messages);
};
