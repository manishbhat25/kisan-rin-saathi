import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SessionProvider } from "@/components/SessionProvider";

export const metadata: Metadata = { title: "Voice assistant" };

export default function AssistantLayout({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
