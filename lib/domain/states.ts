import statesData from "@/lib/data/indian_states.json";

export interface IndianState {
  code: string;
  name: string;
  aliases: string[];
}

export const INDIAN_STATES: IndianState[] = statesData;

const byCode = new Map(INDIAN_STATES.map((state) => [state.code, state]));

function clean(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function compact(value: string): string {
  return clean(value).replace(/[^a-z\u0900-\u097f&]/g, "");
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

/**
 * Maps a free-text state value (code, name, common misspelling) to a canonical state.
 * Returns null instead of guessing when the input is unknown or ambiguous.
 */
export function normalizeState(input: string | null | undefined): IndianState | null {
  if (!input) return null;
  const raw = clean(input);
  if (!raw) return null;

  const upper = raw.toUpperCase();
  if (byCode.has(upper)) return byCode.get(upper)!;

  const key = compact(raw);
  for (const state of INDIAN_STATES) {
    const candidates = [state.name, ...state.aliases].map(compact);
    if (candidates.includes(key)) return state;
  }

  if (key.length < 5) return null;
  let best: IndianState | null = null;
  let bestDistance = Infinity;
  let tie = false;
  for (const state of INDIAN_STATES) {
    for (const candidate of [state.name, ...state.aliases].map(compact)) {
      if (candidate.length < 5) continue;
      const distance = editDistance(key, candidate);
      if (distance < bestDistance) {
        best = state;
        bestDistance = distance;
        tie = false;
      } else if (distance === bestDistance && best && best.code !== state.code) {
        tie = true;
      }
    }
  }
  return best && !tie && bestDistance <= 2 ? best : null;
}

export function stateName(code: string | null | undefined): string {
  if (!code) return "—";
  return byCode.get(code)?.name ?? code;
}
