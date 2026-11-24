import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { label } from "@/lib/domain/constants";
import { statusLabel, type Lang } from "@/lib/i18n";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "danger" | "ghost" | "warning";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 disabled:bg-brand-700/50",
  secondary: "border border-line bg-white text-ink hover:bg-surface disabled:text-muted",
  danger: "bg-red-700 text-white hover:bg-red-800 disabled:bg-red-700/50",
  warning: "bg-amber-600 text-white hover:bg-amber-700 disabled:bg-amber-600/50",
  ghost: "text-brand-800 hover:bg-brand-50 disabled:text-muted",
};

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed";

export function Button({
  variant = "primary",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(BASE, VARIANTS[variant], className)}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={cx(BASE, VARIANTS[variant], className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)}
    />
  );
}

export function Card({ className, children, ...props }: ComponentProps<"section">) {
  return (
    <section {...props} className={cx("rounded-xl border border-line bg-white p-5 shadow-sm", className)}>
      {children}
    </section>
  );
}

export function CardTitle({ children, action, id }: { children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="text-lg font-semibold text-ink">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="text-sm font-medium text-brand-700">{eyebrow}</p> : null}
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-3xl text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-300",
  SUBMITTED: "bg-sky-50 text-sky-800 ring-sky-200",
  UNDER_REVIEW: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  ASSESSMENT_PENDING: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  ASSESSMENT_COMPLETED: "bg-violet-50 text-violet-800 ring-violet-200",
  CHANGES_REQUESTED: "bg-amber-50 text-amber-900 ring-amber-300",
  RESUBMITTED: "bg-sky-50 text-sky-800 ring-sky-200",
  HUMAN_REVIEW_REQUIRED: "bg-orange-50 text-orange-900 ring-orange-300",
  APPROVED: "bg-emerald-50 text-emerald-800 ring-emerald-300",
  REJECTED: "bg-red-50 text-red-800 ring-red-300",
  WITHDRAWN: "bg-slate-100 text-slate-600 ring-slate-300",
};

export function StatusBadge({ status, lang = "en" }: { status: string; lang?: Lang }) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT,
      )}
      data-status={status}
    >
      {statusLabel(status, lang)}
    </span>
  );
}

const OUTCOME_STYLES: Record<string, string> = {
  ELIGIBLE: "bg-emerald-50 text-emerald-800 ring-emerald-300",
  NOT_ELIGIBLE: "bg-red-50 text-red-800 ring-red-300",
  NEEDS_REVIEW: "bg-amber-50 text-amber-900 ring-amber-300",
};

export function OutcomeBadge({ outcome, stale }: { outcome: string; stale?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span
        className={cx(
          "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
          OUTCOME_STYLES[outcome] ?? OUTCOME_STYLES.NEEDS_REVIEW,
        )}
      >
        {label(outcome)}
      </span>
      {stale ? (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-300">
          Outdated
        </span>
      ) : null}
    </span>
  );
}

export function RouteBadge({ route }: { route: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold",
        route === "GOVERNMENT" ? "bg-brand-50 text-brand-800" : "bg-sky-50 text-sky-900",
      )}
    >
      {route === "GOVERNMENT" ? "Government scheme" : "Bank loan"}
    </span>
  );
}

const ALERT_STYLES = {
  info: "border-sky-200 bg-sky-50 text-sky-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  warning: "border-amber-300 bg-amber-50 text-amber-950",
  error: "border-red-200 bg-red-50 text-red-950",
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
  role,
}: {
  tone?: keyof typeof ALERT_STYLES;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  return (
    <div role={role ?? (tone === "error" ? "alert" : undefined)} className={cx("rounded-lg border px-4 py-3 text-sm", ALERT_STYLES[tone], className)}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? "mt-1" : undefined}>{children}</div> : null}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-white/60 px-6 py-10 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {children ? <div className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</div> : null}
      {action ? <div className="mt-4 flex justify-center gap-2">{action}</div> : null}
    </div>
  );
}

const STAT_ACCENTS = {
  brand: { bar: "bg-brand-600", value: "text-brand-800" },
  amber: { bar: "bg-amber-500", value: "text-amber-800" },
  sky: { bar: "bg-sky-500", value: "text-sky-900" },
  violet: { bar: "bg-violet-500", value: "text-violet-900" },
  slate: { bar: "bg-slate-400", value: "text-ink" },
};

export function Stat({
  label: text,
  value,
  href,
  tone,
  accent,
  hint,
  active,
}: {
  label: string;
  value: ReactNode;
  href?: string;
  tone?: string;
  accent?: keyof typeof STAT_ACCENTS;
  hint?: ReactNode;
  active?: boolean;
}) {
  const style = accent ? STAT_ACCENTS[accent] : undefined;
  const body = (
    <>
      {style ? <span aria-hidden className={cx("absolute inset-y-0 left-0 w-1.5", style.bar)} /> : null}
      <span className="block text-sm font-medium text-muted">{text}</span>
      <span className={cx("mt-1 block text-3xl font-bold tabular-nums", tone ?? style?.value ?? "text-ink")}>{value}</span>
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </>
  );
  const className = cx(
    "relative block overflow-hidden rounded-xl border bg-white p-4 shadow-sm",
    style && "pl-5",
    active ? "border-brand-600 ring-2 ring-brand-600/30" : "border-line",
  );
  return href ? (
    <Link href={href} aria-current={active ? "true" : undefined} className={cx(className, "transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function ProgressBar({ value, label: text }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-medium text-muted">
        <span>{text}</span>
        <span className="tabular-nums text-brand-800">{pct}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-brand-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={text}>
        <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function DescriptionList({ items }: { items: { term: string; value: ReactNode; highlight?: boolean }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.term}
          className={cx("min-w-0 rounded-md", item.highlight && "bg-amber-50 px-2 py-1 ring-1 ring-amber-300")}
        >
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">{item.term}</dt>
          <dd className="mt-0.5 break-words text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function formatDate(value: string | Date | null | undefined, withTime = false): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}
