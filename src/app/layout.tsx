import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "에바랑 — OPIc 모의고사",
  description: "실제 OPIc과 같은 순서로 응시하고, 답변 내용을 문항별로 첨삭받는 모의고사",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfcf8" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/wanted-sans@1.0.3/fonts/webfonts/variable/split/WantedSansVariable.css"
        />
        {/* The coffee button's lettering only: `text=` asks for just these letters. */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cookie&display=swap&text=Buymeacofe%20" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
