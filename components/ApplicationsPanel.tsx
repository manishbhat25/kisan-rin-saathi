"use client";

import { copyFor } from "@/lib/copy";
import { Header } from "./Header";
import { useSession } from "./SessionProvider";

export function ApplicationsPanel() {
  const { session, setLanguage } = useSession();
  const copy = copyFor(session.language);

  return (
    <>
      <Header language={session.language} onLanguage={setLanguage} />
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="text-3xl font-semibold text-[#1C1916]">{copy.applicationsTitle}</h1>
        <p className="mt-3 text-lg leading-relaxed text-[#5C574F]">{copy.applicationsNote}</p>
        {session.applications.length === 0 ? (
          <p className="mt-8 text-lg text-[#1C1916]">{copy.applicationsEmpty}</p>
        ) : (
          <ul className="mt-8 space-y-3">
            {session.applications.map((application) => {
              const key = application.loanId === "sbi-kcc" ? "sbi" : application.loanId;
              const loan = copy.loans[key];
              return (
                <li key={application.id} className="rounded-3xl border border-black/5 bg-white p-5">
                  <p className="text-xl font-semibold text-[#1C1916]">{loan.name}</p>
                  <p className="mt-1 text-base text-[#5C574F]">{loan.lender}</p>
                  <p className="mt-3 text-base text-[#1B6B45]">{copy.appStatus}</p>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
