"use client";

import { useState } from "react";
import { Select } from "@/components/forms/fields";
import { cx, formatDate } from "@/components/ui";
import { label } from "@/lib/domain/constants";
import { fieldsFor } from "@/lib/domain/fields";
import type { ApplicationView } from "@/server/domain/queries";
import { formatValue } from "./views";

export function RevisionCompare({ view }: { view: ApplicationView }) {
  const revisions = view.revisions;
  const [from, setFrom] = useState(Math.max(1, revisions.length - 1));
  const [to, setTo] = useState(revisions.length);
  const [onlyChanges, setOnlyChanges] = useState(true);

  if (revisions.length < 2) {
    return <p className="text-sm text-muted">Only one revision has been submitted, so there is nothing to compare yet.</p>;
  }

  const a = revisions.find((revision) => revision.revisionNo === from);
  const b = revisions.find((revision) => revision.revisionNo === to);
  if (!a || !b) return null;

  const fields = fieldsFor(view.route);
  const rows = fields
    .map((field) => {
      const before = a.snapshot.details[field.key];
      const after = b.snapshot.details[field.key];
      return { field, before, after, changed: JSON.stringify(before ?? null) !== JSON.stringify(after ?? null) };
    })
    .filter((row) => !onlyChanges || row.changed);

  const docKey = (doc: { docType: string; sha256?: string; originalName?: string }) => `${doc.docType}:${doc.sha256 ?? doc.originalName}`;
  const beforeDocs = new Set(a.snapshot.documents.map(docKey));
  const afterDocs = new Set(b.snapshot.documents.map(docKey));
  const addedDocs = b.snapshot.documents.filter((doc) => !beforeDocs.has(docKey(doc)));
  const removedDocs = a.snapshot.documents.filter((doc) => !afterDocs.has(docKey(doc)));

  const picker = (id: string, text: string, value: number, onChange: (value: number) => void) => (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-muted">
        {text}
      </label>
      <Select id={id} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 min-w-40">
        {revisions.map((revision) => (
          <option key={revision.revisionNo} value={revision.revisionNo}>
            Revision {revision.revisionNo} · {formatDate(revision.createdAt)}
          </option>
        ))}
      </Select>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {picker("rev-from", "Compare", from, setFrom)}
        {picker("rev-to", "with", to, setTo)}
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyChanges} onChange={(event) => setOnlyChanges(event.target.checked)} className="h-4 w-4 accent-brand-700" />
          Only show changes
        </label>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[480px] text-left text-sm" data-testid="revision-diff">
          <caption className="sr-only">
            Differences between revision {from} and revision {to}
          </caption>
          <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-3 py-2">Field</th>
              <th scope="col" className="px-3 py-2">Revision {from}</th>
              <th scope="col" className="px-3 py-2">Revision {to}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-3 text-muted">
                  No field changes between these revisions.
                </td>
              </tr>
            ) : (
              rows.map(({ field, before, after, changed }) => (
                <tr key={field.key} className={cx("border-t border-line", changed && "bg-amber-50")}>
                  <th scope="row" className="px-3 py-2 font-medium">
                    {field.label}
                  </th>
                  <td className={cx("px-3 py-2", changed && "text-red-800 line-through decoration-red-400")}>{formatValue(view.route, field.key, before)}</td>
                  <td className={cx("px-3 py-2", changed && "font-semibold text-emerald-900")}>{formatValue(view.route, field.key, after)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {addedDocs.length > 0 || removedDocs.length > 0 ? (
        <div className="text-sm">
          <p className="font-semibold">Document changes</p>
          <ul className="mt-1 space-y-0.5">
            {addedDocs.map((doc) => (
              <li key={`add-${docKey(doc)}`} className="text-emerald-900">
                + {label(doc.docType)} ({doc.originalName})
              </li>
            ))}
            {removedDocs.map((doc) => (
              <li key={`rm-${docKey(doc)}`} className="text-red-800">
                − {label(doc.docType)} ({doc.originalName})
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
