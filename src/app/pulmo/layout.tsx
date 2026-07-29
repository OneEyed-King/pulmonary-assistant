import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PulmoLens",
};

export default function PulmoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col">
      <header className="border-b border-border bg-white/60 px-6 py-4 backdrop-blur-sm">
        <a href="/pulmo/patients" className="flex items-center gap-2 font-display text-lg font-semibold text-gray-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground">
            ⌘
          </span>
          PulmoLens
          <span className="ml-1 text-xs font-normal text-muted-foreground">Pulmonology</span>
        </a>
      </header>
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
