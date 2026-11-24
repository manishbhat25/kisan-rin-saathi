import { CheckIcon, EmptyIcon } from "./icons";

export function ProfileField({
  label,
  value,
  filled,
}: {
  label: string;
  value: string;
  filled: boolean;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-black/5 py-3">
      <span className={filled ? "mt-0.5 text-[#1B6B45]" : "mt-0.5 text-black/25"}>
        {filled ? <CheckIcon /> : <EmptyIcon />}
      </span>
      <div className="flex min-w-0 flex-1 items-baseline justify-between gap-4">
        <span className="text-base text-[#5C574F]">{label}</span>
        <span className={`text-right text-base font-medium ${filled ? "text-[#1C1916]" : "text-[#8A847C]"}`}>
          {value}
        </span>
      </div>
    </div>
  );
}
