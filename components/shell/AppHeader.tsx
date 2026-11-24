"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { LANG_COOKIE } from "@/lib/i18n";
import { useI18n } from "@/components/providers";
import { cx } from "@/components/ui";

export interface HeaderUser {
  displayName: string;
  role: string;
  roleLabel: string;
  organizationName: string | null;
}

interface NavItem {
  href: string;
  label: string;
}

function LeafLogo() {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-700 text-white" aria-hidden>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14Z" />
        <path d="M5 19 13 11" />
      </svg>
    </span>
  );
}

function NotificationBell() {
  const { t } = useI18n();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<{ unread: number }>("/api/notifications"),
    refetchInterval: 30_000,
  });
  const unread = data?.unread ?? 0;
  return (
    <Link
      href="/notifications"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink hover:bg-brand-50"
      aria-label={`${t.notifications}${unread ? ` (${unread} unread)` : ""}`}
      data-testid="notification-bell"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {unread > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs font-bold leading-5 text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

export function AppHeader({ user, nav }: { user: HeaderUser | null; nav: NavItem[] }) {
  const { t, lang } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  function toggleLanguage() {
    document.cookie = `${LANG_COOKIE}=${lang === "en" ? "hi" : "en"}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST", body: {} });
    } finally {
      window.location.assign("/login");
    }
  }

  // The longest matching nav entry wins, so "/farmer" is not active on "/farmer/applications".
  const activeHref = nav
    .map((item) => item.href)
    .filter((href) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.length - a.length)[0];
  const isActive = (href: string) => href === activeHref;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link href={user ? (user.role === "FARMER" ? "/farmer" : user.role === "OPERATOR" ? "/operator" : "/officer") : "/"} className="flex items-center gap-2">
          <LeafLogo />
          <span className="hidden text-base font-bold text-ink sm:block">{t.appName}</span>
        </Link>
        <nav aria-label="Main" className="ml-4 hidden flex-1 items-center gap-1 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cx(
                "rounded-lg px-3 py-2 text-sm font-medium",
                isActive(item.href) ? "bg-brand-50 text-brand-800" : "text-muted hover:bg-surface hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={toggleLanguage}
            className="h-10 rounded-lg px-3 text-sm font-medium text-brand-800 hover:bg-brand-50"
            lang={lang === "en" ? "hi" : "en"}
          >
            {t.language}
          </button>
          {user ? (
            <>
              <NotificationBell />
              <div className="hidden text-right md:block">
                <p className="text-sm font-semibold leading-tight text-ink">{user.displayName}</p>
                <p className="text-xs text-muted">{user.organizationName ?? user.roleLabel}</p>
              </div>
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="hidden h-10 rounded-lg px-3 text-sm font-medium text-muted hover:bg-surface hover:text-ink md:block"
              >
                {t.logout}
              </button>
            </>
          ) : (
            <Link href="/login" className="hidden h-10 items-center rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 sm:inline-flex">
              {t.login}
            </Link>
          )}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="Menu"
            onClick={() => setOpen((value) => !value)}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      {open ? (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-line bg-white px-4 py-3 lg:hidden">
          <ul className="grid gap-1">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cx("block rounded-lg px-3 py-2.5 font-medium", isActive(item.href) ? "bg-brand-50 text-brand-800" : "text-ink")}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 border-t border-line pt-2">
              {user ? (
                <button type="button" onClick={signOut} className="block w-full rounded-lg px-3 py-2.5 text-left font-medium text-ink">
                  {t.logout} ({user.displayName})
                </button>
              ) : (
                <Link href="/login" className="block rounded-lg px-3 py-2.5 font-medium text-brand-800">
                  {t.login}
                </Link>
              )}
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
