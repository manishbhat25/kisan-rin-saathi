import { SPEECH_LANG } from "@/lib/languages";
import type { LanguageCode } from "@/lib/types";

const SARVAM_URL = "https://api.sarvam.ai";

export function sarvamConfigured(): boolean {
  return Boolean(process.env.SARVAM_API_KEY?.trim());
}

function key(): string {
  const value = process.env.SARVAM_API_KEY?.trim();
  if (!value) throw new Error("SARVAM_API_KEY is not set");
  return value;
}

export function sarvamLanguage(language: string, purpose: "stt" | "tts"): string {
  if (purpose === "stt" && language === "auto") return "unknown";
  if (language in SPEECH_LANG) return SPEECH_LANG[language as LanguageCode];
  return "hi-IN";
}

function chunks(text: string, limit = 2400): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= limit) return [clean];
  const parts: string[] = [];
  let rest = clean;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf("।", limit);
    if (cut < limit / 2) cut = rest.lastIndexOf(".", limit);
    if (cut < limit / 2) cut = rest.lastIndexOf(" ", limit);
    if (cut < 1) cut = limit;
    parts.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

export async function transcribeSpeech(
  audio: Blob,
  filename: string,
  language: string,
): Promise<{ transcript: string; languageCode: string | null }> {
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", "saaras:v3");
  form.append("mode", "transcribe");
  form.append("language_code", sarvamLanguage(language, "stt"));

  const response = await fetch(`${SARVAM_URL}/speech-to-text`, {
    method: "POST",
    headers: { "api-subscription-key": key() },
    body: form,
  });
  const payload = (await response.json().catch(() => null)) as {
    transcript?: string;
    language_code?: string | null;
    error?: { message?: string };
  } | null;
  if (!response.ok) {
    const message = payload?.error?.message || `speech-to-text failed (${response.status})`;
    throw new Error(message);
  }
  return {
    transcript: payload?.transcript?.trim() ?? "",
    languageCode: payload?.language_code ?? null,
  };
}

export async function synthesizeSpeech(text: string, language: string): Promise<string[]> {
  const languageCode = sarvamLanguage(language, "tts");
  const audios: string[] = [];
  for (const part of chunks(text)) {
    const response = await fetch(`${SARVAM_URL}/text-to-speech`, {
      method: "POST",
      headers: {
        "api-subscription-key": key(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: part,
        language_code: languageCode,
        model: "bulbul:v3",
        speaker: "shubh",
        pace: 0.9,
        output_audio_codec: "wav",
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      audios?: string[];
      error?: { message?: string };
    } | null;
    if (!response.ok) {
      const message = payload?.error?.message || `text-to-speech failed (${response.status})`;
      throw new Error(message);
    }
    const clip = payload?.audios?.[0];
    if (clip) audios.push(clip);
  }
  return audios;
}
