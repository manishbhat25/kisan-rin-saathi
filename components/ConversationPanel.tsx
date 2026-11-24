"use client";

import { useEffect, useRef } from "react";
import { copyFor } from "@/lib/copy";
import type { ChatMessage, FarmerProfile, LanguageCode, LoanOption, VoiceState } from "@/lib/types";
import { LoanCard } from "./LoanCard";
import { TextComposer } from "./TextComposer";
import { VoiceButton } from "./VoiceButton";

export function ConversationPanel({
  language,
  messages,
  profile,
  voice,
  interim,
  typing,
  speechHint,
  applications,
  onMic,
  onTypeToggle,
  onSend,
  onListen,
  onStart,
}: {
  language: LanguageCode;
  messages: ChatMessage[];
  profile: FarmerProfile;
  voice: VoiceState;
  interim: string;
  typing: boolean;
  speechHint: string | null;
  applications: string[];
  onMic: () => void;
  onTypeToggle: () => void;
  onSend: (text: string) => void;
  onListen: (text: string) => void;
  onStart: (loan: LoanOption) => void;
}) {
  const copy = copyFor(language);
  const endRef = useRef<HTMLDivElement>(null);
  const label =
    voice === "listening"
      ? copy.voiceListening
      : voice === "processing"
        ? copy.voiceProcessing
        : voice === "speaking"
          ? copy.voiceSpeaking
          : copy.voiceIdle;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, interim, voice]);

  return (
    <section className="flex h-[calc(100dvh-4rem)] flex-col">
      <div className="flex-1 space-y-8 overflow-y-auto py-8">
        {messages.map((message) => (
          <div key={message.id}>
            {message.role === "ai" ? (
              <p className="max-w-3xl whitespace-pre-wrap text-xl leading-relaxed text-[#1C1916] sm:text-2xl">
                {message.text}
              </p>
            ) : (
              <p className="ml-auto w-fit max-w-xl rounded-3xl bg-[#E5F2EA] px-5 py-3 text-lg leading-relaxed text-[#1C1916]">
                {message.text}
              </p>
            )}
            {message.loans && message.loans.length > 0 ? (
              <div className="mt-5 space-y-4">
                {message.loans.map((loan) => (
                  <LoanCard
                    key={loan.id}
                    loan={loan}
                    profile={profile}
                    language={language}
                    added={applications.includes(loan.id)}
                    onListen={onListen}
                    onStart={() => onStart(loan)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t border-black/5 bg-[#F6F4EF] px-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4">
        {interim ? <p className="mb-4 text-center text-lg text-[#5C574F]">{copy.heard}: {interim}</p> : null}
        {speechHint ? <p className="mb-4 text-center text-base text-[#5C574F]">{speechHint}</p> : null}
        {typing ? (
          <div className="mb-5">
            <TextComposer placeholder={copy.placeholder} sendLabel={copy.send} onSend={onSend} />
          </div>
        ) : null}
        <VoiceButton state={voice} label={label} onPress={onMic} />
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={onTypeToggle}
            className="text-lg text-[#1C1916] underline decoration-black/20 underline-offset-4"
          >
            {typing ? copy.backToVoice : copy.typeInstead}
          </button>
        </div>
      </div>
    </section>
  );
}
