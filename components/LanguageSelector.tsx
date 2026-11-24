"use client";

import { useEffect, useRef, useState } from "react";
import { copyFor } from "@/lib/copy";
import { LANGUAGE_OPTIONS } from "@/lib/languages";
import type { LanguageCode } from "@/lib/types";

export function LanguageSelector({
  language,
  onChange,
}: {
  language: LanguageCode;
  onChange: (language: LanguageCode) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const copy = copyFor(language);
  const current = LANGUAGE_OPTIONS.find((option) => option.id === language);
  const buttonLabel = language === "auto" ? "हिन्दी" : current?.label ?? "हिन्दी";

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
        className="h-11 rounded-full border border-black/10 bg-white px-4 text-base text-[#1C1916]"
      >
        {buttonLabel}
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] overflow-auto rounded-2xl border border-black/10 bg-white p-2 shadow-lg">
          <ul role="listbox" aria-label={buttonLabel}>
            {LANGUAGE_OPTIONS.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.id === language}
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                  className={`w-full rounded-xl px-3 py-3 text-left text-base ${
                    option.id === language ? "bg-[#E5F2EA] text-[#1B6B45]" : "text-[#1C1916]"
                  }`}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
          <p className="px-3 py-3 text-base text-[#5C574F]">{copy.autoNote}</p>
        </div>
      ) : null}
    </div>
  );
}
