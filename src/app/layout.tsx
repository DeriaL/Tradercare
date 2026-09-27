import type { Metadata, Viewport } from "next";
import { Geologica, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { DevStill } from "@/components/site/DevStill";
import { ScrollProgress, SmoothScroll } from "@/components/site/SmoothScroll";

const sans = Geologica({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

// market data (quotes, axes, tickets) is set in a monospace, the way terminals show it
const mono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
  display: "swap",
});


export const metadata: Metadata = {
  metadataBase: new URL("https://traderscare.io"),
  title: "Traders Care: журнал угод, аналітика і проп-правила для трейдерів",
  description:
    "Журнал угод з синхронізацією MetaTrader, аналітика, контроль проп-правил наживо і AI-асистент. Торгуй за своїми правилами й бач ціну кожного відхилення.",
  alternates: { canonical: "/uk" },
  openGraph: {
    title: "Traders Care",
    description: "Кожне відхилення має ціну. Traders Care рахує її за тебе.",
    url: "https://traderscare.io/uk",
    siteName: "Traders Care",
    locale: "uk_UA",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0c0a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <DevStill />
        <SmoothScroll />
        <ScrollProgress />
        {children}
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
