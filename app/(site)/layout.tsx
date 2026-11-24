import type { ReactNode } from "react";
import { PageShell } from "@/components/shell/PageShell";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <PageShell>{children}</PageShell>;
}
