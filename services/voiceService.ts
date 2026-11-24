import { SPEECH_LANG } from "@/lib/languages";
import type { LanguageCode } from "@/lib/types";

/**
 * Voice adapter.
 *
 * When /api/voice/status reports Sarvam is configured, the mic records audio
 * and the server transcribes it. Replies play the WAV clips returned by
 * /api/voice/speak. The browser speech APIs are the fallback when the key
 * is missing or Sarvam fails. SARVAM_API_KEY is read only on the server.
 */

type RecognitionCtor = new () => RecognitionInstance;

interface RecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}

interface ListenControl {
  stop: () => void;
  discard: () => void;
}

export interface ListenHandlers {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (error: string) => void;
  onEnd: () => void;
  onProcessing?: () => void;
}

let sarvamEnabled: boolean | null = null;

export async function usesSarvam(): Promise<boolean> {
  if (sarvamEnabled !== null) return sarvamEnabled;
  try {
    const response = await fetch("/api/voice/status");
    const data = (await response.json()) as { enabled?: boolean };
    sarvamEnabled = Boolean(data.enabled);
  } catch {
    sarvamEnabled = false;
  }
  return sarvamEnabled;
}

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const host = window as Window & {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

export function canListen(): boolean {
  if (typeof window === "undefined") return false;
  return recognitionCtor() !== null || typeof MediaRecorder !== "undefined";
}

function listenWithBrowser(
  language: LanguageCode,
  handlers: ListenHandlers,
): ListenControl | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = SPEECH_LANG[language];
  recognition.continuous = false;
  recognition.interimResults = true;
  let finalText = "";
  let settled = false;

  const finish = (text: string) => {
    if (settled) return;
    settled = true;
    if (text.trim()) handlers.onFinal(text.trim());
    else handlers.onEnd();
  };

  recognition.onresult = (event) => {
    let interim = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const piece = event.results[index][0]?.transcript ?? "";
      if (event.results[index].isFinal) finalText = `${finalText} ${piece}`.trim();
      else interim = `${interim} ${piece}`.trim();
    }
    handlers.onInterim(`${finalText} ${interim}`.trim());
  };
  recognition.onerror = (event) => {
    const code = event.error ?? "error";
    if (code === "no-speech" || code === "aborted") {
      finish(finalText);
      return;
    }
    if (!settled) {
      settled = true;
      handlers.onError(code);
    }
  };
  recognition.onend = () => finish(finalText);
  recognition.start();
  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        finish(finalText);
      }
    },
    discard: () => {
      settled = true;
      try {
        recognition.abort();
      } catch {
        handlers.onEnd();
      }
    },
  };
}

function recorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

async function listenWithSarvam(
  language: LanguageCode,
  handlers: ListenHandlers,
): Promise<ListenControl | null> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return null;
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    return null;
  }
  const mime = recorderMime();
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  let settled = false;
  let cancelled = false;

  const release = () => {
    stream.getTracks().forEach((track) => track.stop());
  };

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.onstop = () => {
    release();
    if (settled || cancelled) {
      settled = true;
      handlers.onEnd();
      return;
    }
    const blob = new Blob(chunks, { type: recorder.mimeType || mime || "audio/webm" });
    if (blob.size < 800) {
      settled = true;
      handlers.onEnd();
      return;
    }
    handlers.onProcessing?.();
    const extension = blob.type.includes("mp4") ? "m4a" : "webm";
    void transcribeAudio(blob, language, `speech.${extension}`)
      .then((result) => {
        if (settled) return;
        settled = true;
        if (result.text.trim()) handlers.onFinal(result.text.trim());
        else handlers.onEnd();
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        handlers.onError("transcribe");
      });
  };
  recorder.start();
  return {
    stop: () => {
      if (recorder.state !== "inactive") recorder.stop();
      else release();
    },
    discard: () => {
      cancelled = true;
      if (recorder.state !== "inactive") recorder.stop();
      else {
        release();
        handlers.onEnd();
      }
    },
  };
}

export async function startListening(
  language: LanguageCode,
  handlers: ListenHandlers,
): Promise<ListenControl | null> {
  if (await usesSarvam()) {
    const recorded = await listenWithSarvam(language, handlers);
    if (recorded) return recorded;
  }
  return listenWithBrowser(language, handlers);
}

function playClip(base64: string, attach: (audio: HTMLAudioElement) => void): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(`data:audio/wav;base64,${base64}`);
    attach(audio);
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    void audio.play().catch(() => resolve());
  });
}

function speakWithBrowser(text: string, language: LanguageCode, done: () => void): void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    window.setTimeout(done, 700);
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = SPEECH_LANG[language];
  utterance.rate = 0.96;
  utterance.onend = done;
  utterance.onerror = done;
  window.speechSynthesis.speak(utterance);
  window.setTimeout(() => {
    if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) done();
  }, 350);
  window.setTimeout(done, Math.min(20000, 800 + text.length * 55));
}

export function speak(
  text: string,
  language: LanguageCode,
): { done: Promise<void>; cancel: () => void } {
  let settled = false;
  let resolveDone = () => {};
  let audio: HTMLAudioElement | null = null;
  const done = new Promise<void>((resolve) => {
    resolveDone = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
  });

  void (async () => {
    try {
      const response = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });
      const payload = (await response.json()) as { audios?: string[] };
      const clips = Array.isArray(payload.audios) ? payload.audios.filter(Boolean) : [];
      if (settled) return;
      if (clips.length > 0) {
        for (const clip of clips) {
          if (settled) return;
          await playClip(clip, (element) => {
            audio = element;
          });
        }
        resolveDone();
        return;
      }
    } catch {
      // Fall through to the browser voice.
    }
    if (!settled) speakWithBrowser(text, language, resolveDone);
  })();

  return {
    done,
    cancel: () => {
      audio?.pause();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
      resolveDone();
    },
  };
}

export async function transcribeAudio(
  audio: Blob,
  language: LanguageCode,
  filename = "speech.webm",
): Promise<{ text: string; demo: boolean }> {
  const body = new FormData();
  body.append("audio", audio, filename);
  body.append("language", language);
  const response = await fetch("/api/voice/transcribe", { method: "POST", body });
  if (!response.ok) throw new Error("transcribe failed");
  return response.json() as Promise<{ text: string; demo: boolean }>;
}
