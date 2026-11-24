import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Help and FAQ" };

const FAQ = [
  {
    q: "Which route should I choose?",
    a: "If you cultivate 5 acres or less and need small support for inputs, irrigation or equipment, the government scheme may suit you. If you need a larger amount or have a regular income to repay from, the bank loan may suit you better. Use the comparison page to decide.",
  },
  {
    q: "Can I save my application and finish later?",
    a: "Yes. Every step saves a draft. Your draft stays in your account until you submit or withdraw it.",
  },
  {
    q: "What happens after I submit?",
    a: "An officer from the reviewing organization opens your application, may run an eligibility assessment, and either asks for changes, escalates it, approves it or rejects it. You get a notification at each step.",
  },
  {
    q: "The officer asked for changes. What do I do?",
    a: "Open the application from your dashboard. The fields and documents the officer asked about are highlighted. Make the changes, add a note if needed, and press “Resubmit application”. Your earlier version is kept for the record.",
  },
  {
    q: "Is the eligibility result a loan approval?",
    a: "No. The assessment is advice for the officer, based on demonstration criteria and a model trained on synthetic data. Only the officer's recorded decision changes your status, and in this prototype even an approval is not a real loan sanction.",
  },
  {
    q: "My application was rejected. Can I try the other route?",
    a: "Yes. On the rejected application, choose “Explore other financing route”. You decide which details to copy into the new application. Being rejected on one route does not decide the other.",
  },
  {
    q: "Can someone at a service centre apply for me?",
    a: "Yes. In your profile, create a one-time assistance code and share it in person with the operator. The application is saved in your account and you can see and track it yourself. You can withdraw the operator's access at any time.",
  },
  {
    q: "What documents can I upload?",
    a: "PDF, JPG or PNG files up to 5 MB. Please do not upload real identity numbers to this demo — use sample documents.",
  },
];

export default function HelpPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Help" title="Questions farmers often ask" />
      <div className="space-y-3">
        {FAQ.map((item) => (
          <details key={item.q} className="group rounded-xl border border-line bg-white p-4 open:shadow-sm">
            <summary className="cursor-pointer list-none font-semibold text-ink marker:hidden">
              <span className="mr-2 inline-block text-brand-700 transition-transform group-open:rotate-90" aria-hidden>
                ›
              </span>
              {item.q}
            </summary>
            <p className="mt-2 text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
