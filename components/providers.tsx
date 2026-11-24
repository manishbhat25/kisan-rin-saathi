"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useState, type ReactNode } from "react";
import { DICTS, type Dict, type Lang } from "@/lib/i18n";

const I18nContext = createContext<{ lang: Lang; t: Dict }>({ lang: "en", t: DICTS.en });

export function Providers({ lang, children }: { lang: Lang; children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 15_000 } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <I18nContext.Provider value={{ lang, t: DICTS[lang] }}>{children}</I18nContext.Provider>
    </QueryClientProvider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
