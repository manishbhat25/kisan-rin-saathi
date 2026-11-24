import type { LanguageCode, UiLanguage } from "./types";

export const LANGUAGE_OPTIONS: { id: LanguageCode; label: string }[] = [
  { id: "hi", label: "हिन्दी" },
  { id: "en", label: "English" },
  { id: "mr", label: "मराठी" },
  { id: "gu", label: "ગુજરાતી" },
  { id: "pa", label: "ਪੰਜਾਬੀ" },
  { id: "bn", label: "বাংলা" },
  { id: "ta", label: "தமிழ்" },
  { id: "te", label: "తెలుగు" },
  { id: "kn", label: "ಕನ್ನಡ" },
  { id: "ml", label: "മലയാളം" },
  {
    id: "auto",
    label: "अपनी भाषा बोलें — AI पहचानने की कोशिश करेगा",
  },
];

export const SPEECH_LANG: Record<LanguageCode, string> = {
  hi: "hi-IN",
  en: "en-IN",
  mr: "mr-IN",
  gu: "gu-IN",
  pa: "pa-IN",
  bn: "bn-IN",
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  auto: "hi-IN",
};

export function resolveLang(language: LanguageCode): UiLanguage {
  return language === "auto" ? "hi" : language;
}

export function fill(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(vars[key] ?? ""),
  );
}
