"use client";
import { uploadToS3 } from "@/lib/s3";
import { useMutation } from "@tanstack/react-query";
import { Inbox, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const FileUpload = () => {
  const router = useRouter();
  const [uploading, setuploading] = useState(false);
  const { mutate, isLoading } = useMutation({
    mutationFn: async ({
      file_key,
      file_name,
    }: {
      file_key: string;
      file_name: string;
    }) => {
      const respose = await axios.post("/api/create-chat", {
        file_key,
        file_name,
      });
      return respose.data;
    },
  });

  const { getRootProps, getInputProps } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      //console.log(acceptedFiles);
      const file = acceptedFiles[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error("file too large > 10MB");
        return;
      }
      try {
        setuploading(true);
        const data = await uploadToS3(file);
        if (!data?.file_key || !data.file_name) {
          toast.error("something went wrong s3 upload");
          return;
        }
        mutate(data, {
          onSuccess: ({ chat_id }) => {
            //console.log(" apiiiii chat id", chat_id);
            toast.success("chat has been created");
            router.push(`/chat/${chat_id}`);
          },
        });
      } catch (err) {
        toast.error("Error creating chat");
      } finally {
        setuploading(false);
      }
    },
  });
  return (
    <div className="p-2 bg-white rounded-xl">
      FileUpload
      <div
        {...getRootProps({
          className:
            "border-dashed boreder-2 rounded-xl cursor-pointer bg-gray-200 py-8 flex justify-center items-center flex-col ",
        })}
      >
        <input {...getInputProps()} />
        {uploading || isLoading ? (
          <>
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
            <p className="mt-2 text-sm text-slate-500">spilling tea to gpt</p>
          </>
        ) : (
          <>
            <Inbox className="w-10 h-10 text-blue-500" />
            <p className="mt-2 text-sm text-slate-600">Drop Your PDF</p>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
