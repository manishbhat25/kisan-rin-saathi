import type { Metadata } from "next";
import { Alert, LinkButton, PageHeader } from "@/components/ui";
import { ROUTE_COMPARISON, ROUTE_COMPARISON_HI } from "@/lib/content/routeComparison";
import { getDict } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Compare financing routes" };

const COPY = {
  en: {
    eyebrow: "Compare",
    title: "Government scheme or bank loan?",
    subtitle: "A side-by-side look at the two financing routes in this portal. Not sure? You can apply through one and still explore the other later.",
    caption: "Comparison of government scheme and bank loan",
    topic: "Topic",
    government: "Government scheme",
    bank: "Bank loan",
    governmentShort: "Government",
    bankShort: "Bank",
  },
  hi: {
    eyebrow: "तुलना",
    title: "सरकारी योजना या बैंक ऋण?",
    subtitle: "इस पोर्टल के दोनों वित्त विकल्पों की आमने-सामने तुलना। पक्का नहीं है? आप एक से आवेदन करके बाद में दूसरा भी देख सकते हैं।",
    caption: "सरकारी योजना और बैंक ऋण की तुलना",
    topic: "विषय",
    government: "सरकारी योजना",
    bank: "बैंक ऋण",
    governmentShort: "सरकारी",
    bankShort: "बैंक",
  },
};

export default async function ComparePage() {
  const { t, lang } = await getDict();
  const copy = COPY[lang];
  const comparison = lang === "hi" ? ROUTE_COMPARISON_HI : ROUTE_COMPARISON;
  return (
    <div>
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.subtitle} />
      <Alert tone="warning" className="mb-6">
        {comparison.disclaimer}
      </Alert>

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{copy.caption}</caption>
          <thead className="hidden bg-surface md:table-header-group">
            <tr>
              <th scope="col" className="w-48 px-4 py-3 font-semibold text-muted">{copy.topic}</th>
              <th scope="col" className="px-4 py-3 text-base font-bold text-brand-800">{copy.government}</th>
              <th scope="col" className="px-4 py-3 text-base font-bold text-sky-900">{copy.bank}</th>
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr key={row.topic} className="block border-t border-line md:table-row">
                <th scope="row" className="block bg-surface px-4 pt-3 pb-1 font-semibold text-ink md:table-cell md:bg-transparent md:py-3 md:align-top">
                  {row.topic}
                </th>
                <td className="block px-4 py-2 align-top md:table-cell md:py-3">
                  <span className="font-semibold text-brand-800 md:hidden">{copy.governmentShort}: </span>
                  {row.government}
                </td>
                <td className="block px-4 pb-3 pt-1 align-top md:table-cell md:py-3">
                  <span className="font-semibold text-sky-900 md:hidden">{copy.bankShort}: </span>
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
