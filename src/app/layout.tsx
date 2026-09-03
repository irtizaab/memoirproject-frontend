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
      /*
        The theme script below writes `data-theme` onto this element before
        React hydrates, so the server-rendered markup and the DOM React finds
        will differ by exactly that attribute. This tells React that is
        expected here and nowhere else.
      */
      suppressHydrationWarning
    >
      <head>
        {/*
          Applies the saved theme before the first paint.

          It has to be inline, and it has to be here: React runs after the page
          is drawn, so anything that set the theme in a component would show one
          frame of ivory to somebody who chose dark — on every navigation. That
          flash is the thing that makes a theme toggle feel broken.

          No value means "follow the operating system", which the media query in
          `globals.css` already answers, so the script sets nothing in that case.
          Wrapped in try/catch because reading localStorage throws outright in
          some privacy modes, and a theme is not worth a blank page.

          The key is duplicated from `lib/theme/store.ts` because a script in
          the document head cannot import.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("memoir.theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}`,
          }}
        />
      </head>
      {/* Stays a server component. Only `Providers` crosses into the browser. */}
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
