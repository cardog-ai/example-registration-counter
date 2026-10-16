import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Atkinson_Hyperlegible_Mono } from "next/font/google";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  variable: "--font-atkinson",
  display: "swap",
  weight: ["400", "500", "700"],
  // No metric overrides ship for this family; skip the adjusted fallback.
  adjustFontFallback: false,
});
const atkinsonMono = Atkinson_Hyperlegible_Mono({
  subsets: ["latin"],
  variable: "--font-atkinson-mono",
  display: "swap",
  weight: ["400", "500", "700"],
  // No metric overrides ship for this family; skip the adjusted fallback.
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: { default: "Registration counter · Department of Vehicle Services", template: "%s · Vehicle Services" },
  description: "The registration counter's VIN check: check digit, decode, and the registration fields filled from the VIN.",
};

export const viewport: Viewport = { themeColor: "#0e1116", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA" className={`${atkinson.variable} ${atkinsonMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
