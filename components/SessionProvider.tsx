"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { copyFor } from "@/lib/copy";
import { advance } from "@/lib/demoConversation";
import { buildLoans } from "@/lib/eligibility";
import { freshSession, loadSession, saveSession } from "@/lib/storage";
import type {
  DocumentKind,
  LanguageCode,
  LoanOption,
  SessionState,
  VoiceState,
} from "@/lib/types";
import { sendTurn } from "@/services/conversationService";
import { analyseDocument } from "@/services/documentService";
import { checkEligibility } from "@/services/eligibilityService";
import { saveProfile } from "@/services/farmerService";
import { speak, startListening } from "@/services/voiceService";

interface SessionContextValue {
  session: SessionState;
  voice: VoiceState;
  interim: string;
  typing: boolean;
  speechHint: string | null;
  profileOpen: boolean;
  setProfileOpen: (open: boolean) => void;
  setTyping: (open: boolean) => void;
  setLanguage: (language: LanguageCode) => void;
  onMic: () => void;
  sendText: (text: string) => void;
  speakAloud: (text: string) => void;
  addDocument: (kind: DocumentKind, file: File) => void;
  startApplication: (loanId: LoanOption["id"]) => void;
  reset: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(() => freshSession());
  const [hydrated, setHydrated] = useState(false);
  const [voice, setVoiceState] = useState<VoiceState>("idle");
  const [interim, setInterim] = useState("");
  const [typing, setTyping] = useState(false);
  const [speechHint, setSpeechHint] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const sessionRef = useRef(session);
  const voiceRef = useRef<VoiceState>("idle");
  const cancelSpeak = useRef<(() => void) | null>(null);
  const stopListen = useRef<((mode?: "discard") => void) | null>(null);
  const listenGen = useRef(0);
  const stopRequested = useRef(false);
  const turnRef = useRef(0);
  sessionRef.current = session;

  const setVoice = (next: VoiceState) => {
    voiceRef.current = next;
    setVoiceState(next);
  };

  useEffect(() => {
    const stored = loadSession();
    if (stored) setSession(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveSession(session);
    const timer = window.setTimeout(() => {
      void saveProfile(session.profile);
    }, 500);
    document.documentElement.lang = session.language === "auto" ? "hi" : session.language;
    return () => window.clearTimeout(timer);
  }, [session, hydrated]);

  useEffect(() => {
    if (!profileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profileOpen]);

  async function sendUtterance(text: string) {
    const spoken = text.trim();
    const busy = voiceRef.current === "processing";
    if (!spoken || busy) return;
    const turn = ++turnRef.current;
    const current = sessionRef.current;
    const farmerMessage = {
      id: crypto.randomUUID(),
      role: "farmer" as const,
      text: spoken,
      createdAt: new Date().toISOString(),
    };
    setSession((prev) => ({
      ...prev,
      messages: [...prev.messages, farmerMessage],
      savedAt: new Date().toISOString(),
    }));
    setVoice("processing");
    setInterim("");
    const started = Date.now();
    const payload = {
      utterance: spoken,
      step: current.step,
      profile: current.profile,
      language: current.language,
      pendingOwnership: current.pendingOwnership,
      clarifyCount: current.clarifyCount,
    };
    const result = await sendTurn(payload).catch(() => advance(payload));
    const wait = 450 - (Date.now() - started);
    if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait));
    if (turnRef.current !== turn) return;

    const aiMessage = {
      id: crypto.randomUUID(),
      role: "ai" as const,
      text: result.reply,
      createdAt: new Date().toISOString(),
      loans: result.loans ?? undefined,
    };
    setSession((prev) => ({
      ...prev,
      profile: {
        ...result.profile,
        documents:
          prev.profile.documents.length >= result.profile.documents.length
            ? prev.profile.documents
            : result.profile.documents,
      },
      step: result.step,
      pendingOwnership: result.pendingOwnership,
      clarifyCount: result.clarifyCount,
      messages: [...prev.messages, aiMessage],
      savedAt: new Date().toISOString(),
    }));
    setVoice("speaking");
    const playback = speak(result.reply, sessionRef.current.language);
    cancelSpeak.current = playback.cancel;
    await playback.done;
    if (turnRef.current === turn) setVoice("idle");
  }

  async function beginListen() {
    const generation = ++listenGen.current;
    setSpeechHint(null);
    stopListen.current?.("discard");
    setVoice("listening");
    const control = await startListening(sessionRef.current.language, {
      onInterim: setInterim,
      onProcessing: () => {
        if (listenGen.current === generation) setVoice("processing");
      },
      onFinal: (text) => {
        if (listenGen.current !== generation) return;
        setInterim("");
        setVoice("idle");
        void sendUtterance(text);
      },
      onError: () => {
        if (listenGen.current !== generation) return;
        setInterim("");
        if (stopRequested.current) {
          stopRequested.current = false;
          setVoice("idle");
          return;
        }
        setVoice("idle");
        setTyping(true);
        setSpeechHint(copyFor(sessionRef.current.language).speechMissing);
      },
      onEnd: () => {
        if (listenGen.current !== generation) return;
        setInterim("");
        if (stopRequested.current) {
          stopRequested.current = false;
          setVoice("idle");
          return;
        }
        if (voiceRef.current === "listening" || voiceRef.current === "processing") setVoice("idle");
      },
    });
    if (listenGen.current !== generation || stopRequested.current) {
      control?.discard();
      stopRequested.current = false;
      if (listenGen.current === generation) setVoice("idle");
      return;
    }
    if (!control) {
      setTyping(true);
      setSpeechHint(copyFor(sessionRef.current.language).speechMissing);
      setVoice("idle");
      return;
    }
    stopListen.current = (mode) => {
      if (mode === "discard") control.discard();
      else control.stop();
    };
    setVoice("listening");
  }

  function onMic() {
    if (voiceRef.current === "processing") return;
    if (voiceRef.current === "speaking") {
      turnRef.current += 1;
      cancelSpeak.current?.();
      setVoice("idle");
      beginListen();
      return;
    }
    if (voiceRef.current === "listening") {
      stopListen.current?.();
      setInterim("");
      return;
    }
    beginListen();
  }

  function speakAloud(text: string) {
    if (voiceRef.current === "listening") stopListen.current?.("discard");
    cancelSpeak.current?.();
    const turn = ++turnRef.current;
    setVoice("speaking");
    const playback = speak(text, sessionRef.current.language);
    cancelSpeak.current = playback.cancel;
    void playback.done.then(() => {
      if (turnRef.current === turn) setVoice("idle");
    });
  }

  function setLanguage(language: LanguageCode) {
    setSession((prev) => {
      const onlyWelcome = prev.messages.length === 1 && prev.messages[0]?.id === "welcome";
      return {
        ...prev,
        language,
        messages: onlyWelcome
          ? [{ ...prev.messages[0], text: copyFor(language).welcome }]
          : prev.messages,
        savedAt: new Date().toISOString(),
      };
    });
  }

  function addDocument(kind: DocumentKind, file: File) {
    const documents = [
      ...sessionRef.current.profile.documents.filter((item) => item.kind !== kind),
      { kind, fileName: file.name, uploadedAt: new Date().toISOString() },
    ];
    const profile = { ...sessionRef.current.profile, documents };
    setSession((prev) => ({
      ...prev,
      profile,
      messages: prev.messages.map((message) =>
        message.loans ? { ...message, loans: buildLoans(profile) } : message,
      ),
      savedAt: new Date().toISOString(),
    }));
    void analyseDocument({ kind, fileName: file.name, size: file.size });
    void checkEligibility(profile).then((loans) => {
      setSession((prev) => ({
        ...prev,
        messages: prev.messages.map((message) => (message.loans ? { ...message, loans } : message)),
      }));
    });
  }

  function startApplication(loanId: LoanOption["id"]) {
    setSession((prev) => {
      if (prev.applications.some((item) => item.loanId === loanId)) return prev;
      return {
        ...prev,
        applications: [
          ...prev.applications,
          { id: crypto.randomUUID(), loanId, createdAt: new Date().toISOString() },
        ],
        savedAt: new Date().toISOString(),
      };
    });
  }

  function reset() {
    turnRef.current += 1;
    cancelSpeak.current?.();
    stopListen.current?.();
    setVoice("idle");
    setInterim("");
    setSpeechHint(null);
    setSession(freshSession(sessionRef.current.language));
  }

  const value: SessionContextValue = {
    session,
    voice,
    interim,
    typing,
    speechHint,
    profileOpen,
    setProfileOpen,
    setTyping,
    setLanguage,
    onMic,
    sendText: (text) => {
      void sendUtterance(text);
    },
    speakAloud,
    addDocument,
    startApplication,
    reset,
  };

  if (!hydrated) {
    return <div className="min-h-dvh bg-[#F6F4EF]" />;
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
