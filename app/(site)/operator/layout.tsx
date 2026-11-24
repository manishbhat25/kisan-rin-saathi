import type { ReactNode } from "react";
import { requirePageActor } from "@/server/auth/actor";

export default async function OperatorLayout({ children }: { children: ReactNode }) {
  await requirePageActor(["OPERATOR"], "/operator");
  return <>{children}</>;
}
