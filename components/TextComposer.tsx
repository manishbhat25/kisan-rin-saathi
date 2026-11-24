"use client";

import { useState } from "react";

export function TextComposer({
  placeholder,
  sendLabel,
  onSend,
}: {
  placeholder: string;
  sendLabel: string;
  onSend: (text: string) => void;
}) {
  const [value, setValue] = useState("");

  return (
    <form
      className="flex w-full gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const text = value.trim();
        if (!text) return;
        onSend(text);
        setValue("");
      }}
    >
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-14 min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-4 text-lg text-[#1C1916] outline-none placeholder:text-[#6B6560]"
      />
      <button
        type="submit"
        className="h-14 shrink-0 rounded-2xl bg-[#1B6B45] px-5 text-lg font-medium text-white"
      >
        {sendLabel}
      </button>
    </form>
  );
}
