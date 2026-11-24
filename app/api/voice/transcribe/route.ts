import { sarvamConfigured, transcribeSpeech } from "@/lib/sarvam";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const language = form?.get("language");
  const audio = form?.get("audio");
  if (!form || typeof language !== "string" || !(audio instanceof Blob)) {
    return Response.json({ error: "audio and language are required" }, { status: 400 });
  }

  if (!sarvamConfigured()) {
    return Response.json({
      demo: true,
      text: "",
      message: "Browser speech recognition is used until Sarvam is connected.",
    });
  }

  const filename = audio instanceof File && audio.name ? audio.name : "speech.webm";
  try {
    const result = await transcribeSpeech(audio, filename, language);
    return Response.json({
      demo: false,
      text: result.transcript,
      languageCode: result.languageCode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "speech-to-text failed";
    return Response.json({ demo: true, text: "", message }, { status: 502 });
  }
}
