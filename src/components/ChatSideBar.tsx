"use client";
import { DrizzleChat } from "@/lib/db/schema";
import Link from "next/link";
import { chats as dbchats } from "@/lib/db/schema";
import { Button } from "./ui/button";
import {
  Delete,
  MessageCircle,
  PlusCircle,
  Router,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";
import React from "react";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { useRouter } from "next/navigation";
import { UserButton, auth } from "@clerk/nextjs";
type Props = {
  chats: DrizzleChat[];
  chatId: number;
};

export const ChatSideBar = ({ chats, chatId }: Props) => {
  const [loading, setloading] = React.useState(false);
  const router = useRouter();

  const handleSubscription = async () => {
    try {
      setloading(true);
      const responce = await axios.get("/api/stripe");
      window.location.href = responce.data.url;
    } catch (error) {}
  };
  return (
    <div className="w-full h-screen p-4 text-gray-200 bg-gray-900 overflow-scroll">
      <Link href="/">
        <Button>
          <PlusCircle className="mr-2 w-4 h-4" /> New Chat
        </Button>
      </Link>
      <div className="flex flex-col gap-2 mt-4">
        {chats.map((chat) => (
          <Link key={chat.id} href={`/chat/${chat.id}`}>
            <div
              className={cn("rounded-lh p-3 text-slate-300 flex items-center", {
                "bg-blue-500 text-white": chat.id === chatId,
                "hover:text-white": chat.id !== chatId,
              })}
            >
              <MessageCircle className="mr-2" />
              <p className="w-full overflow-hidden text-sm truncate whitespace-nowrap text-ellipsis">
                {chat.pdfName}
              </p>
              <Button
                className="bg-gray-900 flex items-center space-x-2 px-4 py-2"
                onClick={async () => {
                  await db.delete(dbchats).where(eq(dbchats.id, chat.id));
                  const { userId } = await auth();
                  let firstChat;
                  if (userId) {
                    firstChat = await db
                      .select()
                      .from(dbchats)
                      .where(eq(dbchats.userId, userId));
                    if (firstChat) {
                      firstChat = firstChat[0];
                    }
                  }
                  console.log("huha", firstChat);
                  router.push(`chat/${firstChat?.id}`);
                }}
              >
                <Trash2 className="w-4 h-4   " />
              </Button>
            </div>
          </Link>
        ))}
      </div>

      <div className=" mt-3 bottom-10 left-4">
        <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
          <Link href="/"> Home</Link>
          <Link href="/"> Source</Link>
        </div>
        <Button
          className="mt-2 text-white bg-slate-700 "
          disabled={loading}
          onClick={handleSubscription}
        >
          {" "}
          Upgrade to PRO
        </Button>
      </div>
    </div>
  );
};
