import { advance } from "@/lib/demoConversation";
import { emptyProfile } from "@/lib/profile";
import type { TurnInput } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<TurnInput> | null;
  if (!body || typeof body.utterance !== "string") {
    return Response.json({ error: "utterance is required" }, { status: 400 });
  }

  const input: TurnInput = {
    utterance: body.utterance,
    step: body.step ?? "name",
    profile: body.profile ?? emptyProfile(),
    language: body.language ?? "hi",
    pendingOwnership: body.pendingOwnership ?? null,
    clarifyCount: Number(body.clarifyCount ?? 0),
  };

  return Response.json({
    ...advance(input),
    demo: !process.env.SARVAM_API_KEY,
  });
}
