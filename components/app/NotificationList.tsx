"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/components/providers";
import { Button, EmptyState, cx, formatDate } from "@/components/ui";
import { apiFetch } from "@/lib/client/api";

interface Item {
  id: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationList({ items }: { items: Item[] }) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const unread = items.filter((item) => !item.readAt).length;

  async function markAll() {
    setBusy(true);
    await apiFetch("/api/notifications/read-all", { method: "POST" }).catch(() => null);
    setBusy(false);
    router.refresh();
  }

  if (items.length === 0) return <EmptyState title="No notifications yet">Updates about your applications will appear here.</EmptyState>;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted">{unread} unread</p>
        {unread > 0 ? (
          <Button variant="ghost" onClick={() => void markAll()} loading={busy}>
            {t.markAllRead}
          </Button>
        ) : null}
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white" data-testid="notification-list">
        {items.map((item) => {
          const content = (
            <>
              <span className="flex items-start justify-between gap-3">
                <span className={cx("font-semibold", !item.readAt && "text-brand-900")}>
                  {!item.readAt ? <span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand-600 align-middle" aria-label="Unread" /> : null}
                  {item.title}
                </span>
                <span className="shrink-0 text-xs text-muted">{formatDate(item.createdAt, true)}</span>
              </span>
              <span className="mt-1 block text-sm text-muted">{item.body}</span>
            </>
          );
          return (
            <li key={item.id} className={cx(!item.readAt && "bg-brand-50/50")}>
              {item.link ? (
                <Link
                  href={item.link}
                  className="block px-4 py-3 hover:bg-surface"
                  onClick={() => {
                    if (!item.readAt) void apiFetch(`/api/notifications/${item.id}/read`, { method: "POST" }).catch(() => null);
                  }}
                >
                  {content}
                </Link>
              ) : (
                <div className="px-4 py-3">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
