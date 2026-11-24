"use client";

import { copyFor } from "@/lib/copy";
import { ConversationPanel } from "./ConversationPanel";
import { FarmerProfile } from "./FarmerProfile";
import { Header } from "./Header";
import { useSession } from "./SessionProvider";

export function AppShell() {
  const {
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
    sendText,
    speakAloud,
    addDocument,
    startApplication,
    reset,
  } = useSession();
  const copy = copyFor(session.language);

  return (
    <>
      <Header
        language={session.language}
        onLanguage={setLanguage}
        onOpenProfile={() => setProfileOpen(true)}
      />
      <main className="mx-auto grid w-full max-w-6xl items-start gap-8 px-4 lg:grid-cols-[minmax(0,1.7fr)_380px] lg:px-6">
        <ConversationPanel
          language={session.language}
          messages={session.messages}
          profile={session.profile}
          voice={voice}
          interim={interim}
          typing={typing}
          speechHint={speechHint}
          applications={session.applications.map((item) => item.loanId)}
          onMic={onMic}
          onTypeToggle={() => setTyping(!typing)}
          onSend={sendText}
          onListen={speakAloud}
          onStart={(loan) => startApplication(loan.id)}
        />
        <aside className="hidden h-[calc(100dvh-4rem)] overflow-y-auto py-6 lg:block">
          <FarmerProfile
              language={session.language}
              profile={session.profile}
              savedAt={session.savedAt}
              onUpload={addDocument}
              onReset={reset}
            />
        </aside>
      </main>
      {profileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label={copy.close}
            className="absolute inset-0 bg-black/30"
            onClick={() => setProfileOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 top-8 overflow-y-auto rounded-t-3xl bg-[#F6F4EF] p-4">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="h-11 rounded-full bg-white px-4 text-base text-[#1C1916]"
              >
                {copy.close}
              </button>
            </div>
            <FarmerProfile
              language={session.language}
              profile={session.profile}
              savedAt={session.savedAt}
              onUpload={addDocument}
              onReset={reset}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
