import type { ReactNode } from "react";
import { Alert } from "@/components/ui";
import { requirePageActor } from "@/server/auth/actor";

export default async function OfficerLayout({ children }: { children: ReactNode }) {
  const actor = await requirePageActor(["GOV_OFFICER", "BANK_OFFICER"], "/officer");
  if (!actor.route) {
    return (
      <Alert tone="error" title="No reviewing organization">
        Your officer account is not assigned to an organization yet. Ask an administrator to assign you.
      </Alert>
    );
  }
  return <>{children}</>;
}
