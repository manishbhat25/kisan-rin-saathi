import { sarvamConfigured, transcribeSpeech } from "@/lib/sarvam";
import { MAX_AUDIO_BYTES, guardPaidVoiceCall, logVoiceFailure } from "@/server/voiceGuard";

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_AUDIO_BYTES + 64 * 1024) {
    return Response.json({ error: "audio must be 5 MB or smaller" }, { status: 413 });
  }
  const form = await request.formData().catch(() => null);
  const language = form?.get("language");
  const audio = form?.get("audio");
  if (!form || typeof language !== "string" || !(audio instanceof Blob)) {
    return Response.json({ error: "audio and language are required" }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return Response.json({ error: "audio must be 5 MB or smaller" }, { status: 413 });
  }

  if (!sarvamConfigured()) {
    return Response.json({
      demo: true,
      text: "",
      message: "Browser speech recognition is used until Sarvam is connected.",
    });
  }

  const blocked = await guardPaidVoiceCall("transcribe");
  if (blocked) return blocked;

  const filename = audio instanceof File && audio.name ? audio.name : "speech.webm";
  try {
    const result = await transcribeSpeech(audio, filename, language);
    return Response.json({
      demo: false,
      text: result.transcript,
      languageCode: result.languageCode,
    });
  } catch (error) {
    logVoiceFailure("speech-to-text", error);
    return Response.json({ demo: true, text: "", message: "Speech recognition is unavailable right now." }, { status: 502 });
  }
}
