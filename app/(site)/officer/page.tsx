import Link from "next/link";
import { ApplicationTable } from "@/components/app/views";
import { Input, Select } from "@/components/forms/fields";
import { Button, EmptyState, PageHeader, Stat } from "@/components/ui";
import { STATUSES } from "@/lib/domain/constants";
import { statusLabel } from "@/lib/i18n";
import { getDict } from "@/lib/i18n-server";
import { requirePageActor } from "@/server/auth/actor";
import { listApplications, officerStats } from "@/server/domain/queries";

export const metadata = { title: "Application queue" };

const QUEUES = [
  { key: "NEW", label: "New", hint: "Submitted or resubmitted", accent: "sky", statuses: ["SUBMITTED", "RESUBMITTED"] },
  { key: "REVIEW", label: "In review", hint: "Being assessed", accent: "violet", statuses: ["UNDER_REVIEW", "ASSESSMENT_PENDING", "ASSESSMENT_COMPLETED", "HUMAN_REVIEW_REQUIRED"] },
  { key: "WAITING", label: "Waiting for farmer", hint: "Changes requested", accent: "amber", statuses: ["CHANGES_REQUESTED"] },
  { key: "DONE", label: "Decided", hint: "Approved, rejected or withdrawn", accent: "brand", statuses: ["APPROVED", "REJECTED", "WITHDRAWN"] },
] as const;

export default async function OfficerQueue({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; queue?: string }> }) {
  const params = await searchParams;
  const actor = await requirePageActor(["GOV_OFFICER", "BANK_OFFICER"], "/officer");
  const queue = QUEUES.find((item) => item.key === params.queue);
  const [all, stats, { t, lang }] = await Promise.all([
    listApplications(actor, { status: params.status, q: params.q }),
    officerStats(actor),
    getDict(),
  ]);
  const apps = queue ? all.filter((app) => (queue.statuses as readonly string[]).includes(app.status)) : all;
  const count = (statuses: readonly string[]) => statuses.reduce((sum, status) => sum + (stats[status] ?? 0), 0);
  const filtered = Boolean(params.status || params.q || params.queue);

  return (
    <div>
      <PageHeader
        eyebrow={actor.organizationName ?? undefined}
        title={t.navQueue}
        subtitle={actor.route === "GOVERNMENT" ? "Government scheme applications assigned to your department." : "Bank loan applications assigned to your branch."}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {QUEUES.map((item) => (
          <Stat
            key={item.key}
            label={item.label}
            value={count(item.statuses)}
            hint={item.hint}
            accent={item.accent}
            href={params.queue === item.key ? "/officer" : `/officer?queue=${item.key}`}
            active={params.queue === item.key}
          />
        ))}
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-4" role="search" aria-label="Filter applications">
        <div className="min-w-52 flex-1">
          <label htmlFor="q" className="block text-sm font-semibold">
            Search
          </label>
          <Input id="q" name="q" defaultValue={params.q ?? ""} placeholder="Reference, name or district" className="mt-1" />
        </div>
        <div className="min-w-48">
          <label htmlFor="status" className="block text-sm font-semibold">
            Status
          </label>
          <Select id="status" name="status" defaultValue={params.status ?? "ALL"} className="mt-1">
            <option value="ALL">All statuses</option>
            {STATUSES.filter((status) => status !== "DRAFT").map((status) => (
              <option key={status} value={status}>
                {statusLabel(status, lang)}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit">Apply filters</Button>
        {filtered ? (
          <Link href="/officer" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-brand-700 underline">
            Clear
          </Link>
        ) : null}
      </form>

      {apps.length === 0 ? (
        <EmptyState title={filtered ? "No applications match these filters" : "No applications yet"}>
          {filtered ? "Try a different search or status." : "Submitted applications for your route will appear here."}
        </EmptyState>
      ) : (
        <>
          <p className="mb-2 text-sm text-muted" role="status">
            Showing {apps.length} application{apps.length === 1 ? "" : "s"}
            {queue ? ` · ${queue.label}` : ""}
          </p>
          <ApplicationTable items={apps} hrefBase="/officer/applications" audience="officer" lang={lang} />
        </>
      )}
    </div>
  );
}
