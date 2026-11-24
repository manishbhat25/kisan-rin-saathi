import { advance } from "@/lib/demoConversation";
import type { TurnInput, TurnResult } from "@/lib/types";

export async function sendTurn(input: TurnInput): Promise<TurnResult> {
  try {
    const response = await fetch("/api/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error("conversation failed");
    const data = (await response.json()) as TurnResult;
    return data;
  } catch {
    return advance(input);
  }
}
