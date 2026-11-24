import { MicIcon, SoftSpinner, Waveform } from "./icons";
import type { VoiceState } from "@/lib/types";

export function VoiceButton({
  state,
  label,
  onPress,
}: {
  state: VoiceState;
  label: string;
  onPress: () => void;
}) {
  const active = state === "listening" || state === "speaking";
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={onPress}
        aria-label={label}
        aria-pressed={active}
        className={`grid h-28 w-28 place-items-center rounded-full bg-[#1B6B45] text-white shadow-[0_12px_28px_rgba(27,107,69,0.22)] transition active:scale-[0.98] ${
          active ? "ring-8 ring-[#1B6B45]/15" : ""
        }`}
      >
        {state === "processing" ? <SoftSpinner /> : active ? <Waveform /> : <MicIcon />}
      </button>
      <p className="mt-4 text-center text-lg font-medium text-[#1C1916]">{label}</p>
    </div>
  );
}
