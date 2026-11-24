import type { ReactNode } from "react";
import { label } from "@/lib/domain/constants";
import { getDict } from "@/lib/i18n-server";
import { currentActor, type Actor } from "@/server/auth/actor";
import { AppHeader } from "./AppHeader";

export async function navFor(actor: Actor | null) {
  const { t } = await getDict();
  if (!actor) {
    return [
      { href: "/", label: t.navHome },
      { href: "/compare", label: t.navCompare },
      { href: "/eligibility", label: t.navEligibility },
      { href: "/help", label: t.navHelp },
    ];
  }
  if (actor.role === "FARMER") {
    return [
      { href: "/farmer", label: t.navDashboard },
      { href: "/farmer/applications", label: t.navApplications },
      { href: "/compare", label: t.navCompare },
      { href: "/assistant", label: t.navAssistant },
      { href: "/farmer/profile", label: t.navProfile },
      { href: "/help", label: t.navHelp },
    ];
  }
  if (actor.role === "OPERATOR") {
    return [
      { href: "/operator", label: t.navDashboard },
      { href: "/compare", label: t.navCompare },
      { href: "/eligibility", label: t.navEligibility },
      { href: "/help", label: t.navHelp },
    ];
  }
  return [
    { href: "/officer", label: t.navQueue },
    { href: "/eligibility", label: t.navEligibility },
    { href: "/help", label: t.navHelp },
  ];
}

export async function PageShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const actor = await currentActor();
  const { t } = await getDict();
  const nav = await navFor(actor);
  return (
    <>
      <a href="#main" className="skip-link">
        {t.skip}
      </a>
      <AppHeader
        nav={nav}
        user={
          actor
            ? {
                displayName: actor.displayName,
                role: actor.role,
                roleLabel: label(actor.role),
                organizationName: actor.organizationName,
              }
            : null
        }
      />
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900">{t.demoBanner}</div>
      <main id="main" className={`mx-auto w-full ${wide ? "max-w-7xl" : "max-w-6xl"} px-4 py-6 sm:py-8`}>
        {children}
      </main>
      <footer className="border-t border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted">
          Kisan Rin Saathi — prototype decision-support portal. Model results are advisory. Synthetic data only; do not
          enter real identity numbers or bank credentials.
        </div>
      </footer>
    </>
  );
}
