"use client";
import React from "react";
import { Input } from "./ui/input";
import { useChat } from "ai/react";
import { Button } from "./ui/button";
import { Send } from "lucide-react";
import { MessageList } from "./MessageList";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Message } from "ai";

type Props = { chatId: number };

export const ChatComponent = ({ chatId }: Props) => {
  const { data } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const responce = await axios.post<Message[]>("/api/get-messages", {
        chatId,
      });
      return responce.data;
    },
  });

  const { input, handleInputChange, handleSubmit, messages } = useChat({
    api: "/api/chat",
    body: {
      chatId,
    },
    initialMessages: data || [],
  });
  React.useEffect(() => {
    const messageContainer = document.getElementById("message-container");
    if (messageContainer) {
      messageContainer.scrollTo({
        top: messageContainer.scrollHeight,
        behavior: "smooth",
      });
    }
  });

  return (
    <div
      className="relative max-h-screen overflow-scroll"
      id="message-container"
    >
      <div className="p-2 bg-white h-fit sticky top-0 inset-x-0">
        <h3 className="text-xl font-bold">Chat</h3>
      </div>

      <MessageList messages={messages} />
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 inset-x-0 px-2 py-4 bg-white"
      >
        <div className="flex">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="ask any question"
            className="w-full"
          />
          <Button className="bg-blue-500 ml-2 m-2">
            <Send className="h-4 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
};
