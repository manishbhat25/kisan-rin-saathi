import type { SessionState } from "./types";
import { emptyProfile } from "./profile";
import { copyFor } from "./copy";

const KEY = "kisan-rin-saathi-v1";

export function freshSession(language: SessionState["language"] = "hi"): SessionState {
  return {
    language,
    profile: emptyProfile(),
    messages: [
      {
        id: "welcome",
        role: "ai",
        text: copyFor(language).welcome,
        createdAt: new Date().toISOString(),
      },
    ],
    step: "name",
    pendingOwnership: null,
    clarifyCount: 0,
    applications: [],
    savedAt: null,
  };
}

export function loadSession(): SessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionState;
    if (!parsed.profile || !parsed.messages || !parsed.step) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: SessionState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Storage can fail on private mode or a full disk. The screen still works.
  }
}
