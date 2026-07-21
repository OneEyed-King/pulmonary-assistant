import type { Metadata } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "PulmoLens",
  description: "AI-powered pulmonology chart review on top of a FHIR patient record system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jakarta.variable} ${plexMono.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col">
          <header className="border-b border-border bg-white/60 px-6 py-4 backdrop-blur-sm">
            <a href="/patients" className="flex items-center gap-2 font-display text-lg font-semibold text-gray-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground">
                ⌘
              </span>
              PulmoLens
            </a>
          </header>
          <main className="flex-1 px-6 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
