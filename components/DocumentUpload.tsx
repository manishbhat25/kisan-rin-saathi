"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { copyFor } from "@/lib/copy";
import { DOCUMENT_KINDS } from "@/lib/profile";
import type { DocumentKind, DocumentRecord, LanguageCode } from "@/lib/types";

export function DocumentUpload({
  language,
  documents,
  onUpload,
}: {
  language: LanguageCode;
  documents: DocumentRecord[];
  onUpload: (kind: DocumentKind, file: File) => void;
}) {
  const copy = copyFor(language);
  const [previews, setPreviews] = useState<Partial<Record<DocumentKind, string>>>({});
  const previewsRef = useRef(previews);
  previewsRef.current = previews;

  useEffect(() => {
    return () => {
      Object.values(previewsRef.current).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, []);

  return (
    <div className="mt-2">
      <p className="mb-1 text-base font-medium text-[#1C1916]">{copy.documentsLabel}</p>
      <ul className="divide-y divide-black/5">
        {DOCUMENT_KINDS.map((kind) => {
          const saved = documents.find((item) => item.kind === kind);
          const preview = previews[kind];
          return (
            <li key={kind} className="flex items-center gap-3 py-3">
              {preview ? (
                <img src={preview} alt="" className="h-12 w-12 rounded-xl object-cover" />
              ) : (
                <span className={`grid h-12 w-12 place-items-center rounded-xl text-sm ${saved ? "bg-[#E5F2EA] text-[#1B6B45]" : "bg-black/5 text-[#5C574F]"}`}>
                  {saved ? "✓" : ""}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-base text-[#1C1916]">{copy.docs[kind]}</p>
                {saved ? <p className="truncate text-base text-[#5C574F]">{saved.fileName}</p> : null}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <FileButton
                  label={copy.photo}
                  accept="image/*"
                  capture
                  onFile={(file) => choose(kind, file, setPreviews, onUpload)}
                />
                <FileButton
                  label={copy.chooseFile}
                  accept="image/*,.pdf"
                  onFile={(file) => choose(kind, file, setPreviews, onUpload)}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function choose(
  kind: DocumentKind,
  file: File,
  setPreviews: Dispatch<SetStateAction<Partial<Record<DocumentKind, string>>>>,
  onUpload: (kind: DocumentKind, file: File) => void,
) {
  if (file.type.startsWith("image/")) {
    const url = URL.createObjectURL(file);
    setPreviews((current) => {
      if (current[kind]) URL.revokeObjectURL(current[kind]);
      return { ...current, [kind]: url };
    });
  }
  onUpload(kind, file);
}

function FileButton({
  label,
  accept,
  capture,
  onFile,
}: {
  label: string;
  accept: string;
  capture?: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-base text-[#1C1916]">
      {label}
      <input
        type="file"
        accept={accept}
        capture={capture ? "environment" : undefined}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </label>
  );
}
