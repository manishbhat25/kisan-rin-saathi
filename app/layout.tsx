import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { getLang } from "@/lib/i18n-server";
import "./globals.css";

const fontStylesheet =
  "https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Noto+Sans+Gujarati:wght@400;500;600;700&family=Noto+Sans+Gurmukhi:wght@400;500;600;700&family=Noto+Sans+Kannada:wght@400;500;600;700&family=Noto+Sans+Malayalam:wght@400;500;600;700&family=Noto+Sans+Tamil:wght@400;500;600;700&family=Noto+Sans+Telugu:wght@400;500;600;700&display=swap";

export const metadata: Metadata = {
  title: { default: "Kisan Rin Saathi — Agricultural financing portal", template: "%s · Kisan Rin Saathi" },
  description: "Compare, apply for and track government scheme support and agricultural bank loans.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1b6b45",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={fontStylesheet} />
      </head>
      <body className="antialiased">
        <Providers lang={lang}>{children}</Providers>
      </body>
    </html>
  );
}
