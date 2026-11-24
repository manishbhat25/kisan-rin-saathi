import { sarvamConfigured, synthesizeSpeech } from "@/lib/sarvam";
import { MAX_SPEAK_CHARS, guardPaidVoiceCall, logVoiceFailure } from "@/server/voiceGuard";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { text?: string; language?: string } | null;
  if (!body || typeof body.text !== "string" || !body.text.trim()) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }
  if (body.text.length > MAX_SPEAK_CHARS) {
    return Response.json({ error: `text must be ${MAX_SPEAK_CHARS} characters or fewer` }, { status: 400 });
  }

  if (!sarvamConfigured()) {
    return Response.json({ demo: true, text: body.text, audios: [] });
  }

  const blocked = await guardPaidVoiceCall("speak");
  if (blocked) return blocked;

  try {
    const audios = await synthesizeSpeech(body.text, body.language ?? "hi");
    return Response.json({ demo: false, audios });
  } catch (error) {
    logVoiceFailure("text-to-speech", error);
    return Response.json({ demo: true, text: body.text, audios: [], message: "Speech is unavailable right now." }, { status: 502 });
  }
}
