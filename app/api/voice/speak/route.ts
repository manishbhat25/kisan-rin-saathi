import { sarvamConfigured, synthesizeSpeech } from "@/lib/sarvam";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { text?: string; language?: string } | null;
  if (!body || typeof body.text !== "string" || !body.text.trim()) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }

  if (!sarvamConfigured()) {
    return Response.json({ demo: true, text: body.text, audios: [] });
  }

  try {
    const audios = await synthesizeSpeech(body.text, body.language ?? "hi");
    return Response.json({ demo: false, audios });
  } catch (error) {
    const message = error instanceof Error ? error.message : "text-to-speech failed";
    return Response.json({ demo: true, text: body.text, audios: [], message }, { status: 502 });
  }
}
