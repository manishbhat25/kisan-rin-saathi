import { cookies } from "next/headers";
import { DICTS, LANG_COOKIE, type Lang } from "./i18n";

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  return store.get(LANG_COOKIE)?.value === "hi" ? "hi" : "en";
}

export async function getDict() {
  const lang = await getLang();
  return { lang, t: DICTS[lang] };
}
