import type { ReactNode } from "react";
import { requirePageActor } from "@/server/auth/actor";

export default async function FarmerLayout({ children }: { children: ReactNode }) {
  await requirePageActor(["FARMER"], "/farmer");
  return <>{children}</>;
}
