"use client";

import Link from "next/link";
import { copyFor } from "@/lib/copy";
import type { LanguageCode } from "@/lib/types";
import { LeafMark } from "./icons";
import { LanguageSelector } from "./LanguageSelector";

export function Header({
  language,
  onLanguage,
  onOpenProfile,
}: {
  language: LanguageCode;
  onLanguage: (language: LanguageCode) => void;
  onOpenProfile?: () => void;
}) {
  const copy = copyFor(language);
  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-[#F6F4EF]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#1B6B45] text-white">
            <LeafMark />
          </span>
          <span className="truncate text-base font-semibold text-[#1C1916] sm:text-lg">Kisan Rin Saathi</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {onOpenProfile ? (
            <Link href="/applications" className="hidden h-11 items-center px-1 text-base text-[#1C1916] sm:inline-flex sm:px-3">
              {copy.myApplications}
            </Link>
          ) : null}
          {onOpenProfile ? (
            <button
              type="button"
              onClick={onOpenProfile}
              className="h-11 whitespace-nowrap rounded-full border border-black/10 bg-white px-3 text-base text-[#1C1916] lg:hidden"
            >
              {copy.myInfo}
            </button>
          ) : (
            <Link href="/" className="inline-flex h-11 items-center px-2 text-base text-[#1B6B45]">
              {copy.backToChat}
            </Link>
          )}
          <LanguageSelector language={language} onChange={onLanguage} />
        </div>
      </div>
    </header>
  );
}
