export function ProgressIndicator({
  percent,
  label,
}: {
  percent: number;
  label: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-base font-medium text-[#1C1916]">Loan Readiness</p>
        <p className="text-base text-[#5C574F]">{label}</p>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-black/5"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Loan Readiness"
      >
        <div className="h-full rounded-full bg-[#1B6B45]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
