"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/** Modal built on the native <dialog> element: focus trapping, Escape and backdrop come from the browser. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="w-[min(100%-2rem,36rem)] rounded-2xl p-0 text-ink shadow-2xl backdrop:bg-slate-900/50"
    >
      {open ? (
        <div className="p-6">
          <h2 id={titleId} className="text-xl font-bold">
            {title}
          </h2>
          <div className="mt-3 space-y-3 text-sm">{children}</div>
          {footer ? <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div> : null}
        </div>
      ) : null}
    </dialog>
  );
}
