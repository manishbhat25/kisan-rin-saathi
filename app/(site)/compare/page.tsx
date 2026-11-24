import type { Metadata } from "next";
import { Alert, LinkButton, PageHeader } from "@/components/ui";
import { ROUTE_COMPARISON } from "@/lib/content/routeComparison";
import { getDict } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Compare financing routes" };

export default async function ComparePage() {
  const { t } = await getDict();
  return (
    <div>
      <PageHeader
        eyebrow="Compare"
        title="Government scheme or bank loan?"
        subtitle="A side-by-side look at the two financing routes in this portal. Not sure? You can apply through one and still explore the other later."
      />
      <Alert tone="warning" className="mb-6">
        {ROUTE_COMPARISON.disclaimer}
      </Alert>

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Comparison of government scheme and bank loan</caption>
          <thead className="hidden bg-surface md:table-header-group">
            <tr>
              <th scope="col" className="w-48 px-4 py-3 font-semibold text-muted">Topic</th>
              <th scope="col" className="px-4 py-3 text-base font-bold text-brand-800">Government scheme</th>
              <th scope="col" className="px-4 py-3 text-base font-bold text-sky-900">Bank loan</th>
            </tr>
          </thead>
          <tbody>
            {ROUTE_COMPARISON.rows.map((row) => (
              <tr key={row.topic} className="block border-t border-line md:table-row">
                <th scope="row" className="block bg-surface px-4 pt-3 pb-1 font-semibold text-ink md:table-cell md:bg-transparent md:py-3 md:align-top">
                  {row.topic}
                </th>
                <td className="block px-4 py-2 align-top md:table-cell md:py-3">
                  <span className="font-semibold text-brand-800 md:hidden">Government: </span>
                  {row.government}
                </td>
                <td className="block px-4 pb-3 pt-1 align-top md:table-cell md:py-3">
                  <span className="font-semibold text-sky-900 md:hidden">Bank: </span>
                  {row.bank}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <LinkButton href="/farmer/applications/new?route=GOVERNMENT">{t.applyGov}</LinkButton>
        <LinkButton href="/farmer/applications/new?route=BANK" className="bg-sky-800 hover:bg-sky-900">
          {t.applyBank}
        </LinkButton>
        <LinkButton href="/eligibility" variant="secondary">
          {t.viewRequirements}
        </LinkButton>
      </div>
    </div>
  );
}
