import type { Metadata } from "next";
import { Inter, Spectral } from "next/font/google";

import { Providers } from "@/app/providers";
import "./globals.css";

/**
 * The two faces the whole product is set in.
 *
 * They were previously loaded by `app/onboarding/page.tsx` alone, because the
 * onboarding flow was the only screen designed. Every screen now uses them, so
 * they are loaded once here — a route-level `next/font` call would ship the
 * same files again under a second CSS variable.
 *
 * Spectral carries names, headings, and anything that should read as printed.
 * Inter carries labels, buttons, and interface text.
 */
const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "The Memoir Project",
    template: "%s — The Memoir Project",
  },
  description:
    "One memoir, one link, and everyone who knew them. Private until you publish it yourself.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spectral.variable} ${inter.variable} h-full antialiased`}
    >
      {/* Stays a server component. Only `Providers` crosses into the browser. */}
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
