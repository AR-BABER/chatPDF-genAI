import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function convertToAscii(inputString: string) {
  const asciiString = inputString.replace(/[^\x00-\x7f]/g, "");
  return asciiString;
}
