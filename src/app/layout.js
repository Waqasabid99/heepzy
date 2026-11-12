import { Manrope, Oswald } from "next/font/google";
import { ThemeScript } from "@/components/theme/theme-script";
import "./globals.css";

// Typefaces from the Heepzy design: Oswald (display, prices) + Manrope (UI/body).
const body = Manrope({ variable: "--font-body", subsets: ["latin"], display: "swap" });
const heading = Oswald({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "Heepzy — Shoes delivered across Pakistan", template: "%s · Heepzy" },
  description: "Shop sneakers, formal shoes, sandals and more. Cash on delivery and card payments across Pakistan.",
  applicationName: "Heepzy",
  openGraph: { type: "website", siteName: "Heepzy", locale: "en_PK" },
  formatDetection: { telephone: false },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0c" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-PK" data-theme="light" className={`${body.variable} ${heading.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
