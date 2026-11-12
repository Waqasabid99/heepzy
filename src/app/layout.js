import { Geist } from "next/font/google";
import { ThemeScript } from "@/components/theme/theme-script";
import "./globals.css";

// Placeholder typefaces until the final design references are applied.
const body = Geist({ variable: "--font-body", subsets: ["latin"], display: "swap" });

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
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#14161a" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-PK" data-theme="light" className={body.variable} suppressHydrationWarning>
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
