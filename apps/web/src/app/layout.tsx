import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import { AppFrame } from "@/components/app-frame";
import { getSiteUrl } from "@/lib/site-url";
import { CHURCH } from "@/data/church";

// 제목·성경구절용 명조. 본문은 산세리프 — 명조는 --font-display 로만 노출한다.
const serif = Noto_Serif_KR({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = Noto_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: CHURCH.name,
    template: `%s | ${CHURCH.name}`,
  },
  description: `${CHURCH.name} — 예배 안내, 설교, 교회 소식과 성도의 교제`,
  openGraph: {
    siteName: CHURCH.name,
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`h-full antialiased ${serif.variable} ${sans.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <ThemeProvider>
          <AppFrame>{children}</AppFrame>
        </ThemeProvider>
      </body>
    </html>
  );
}
