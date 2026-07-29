import Link from "next/link";
import { Stethoscope, Activity } from "lucide-react";
import { SPECIALTIES } from "@/lib/specialty";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16">
      <div className="mb-10 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">FHIR-native chart review</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-gray-900">
          Choose your specialty
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Same AI-assisted review, Care Gaps tracking, and staged visit workflow — tailored per specialty.
        </p>
      </div>

      <div className="grid w-full max-w-2xl gap-5 sm:grid-cols-2">
        <Link
          href={`${SPECIALTIES.pulmo.basePath}/patients`}
          className="group flex flex-col items-start gap-3 rounded-xl border border-border/70 bg-white p-6 shadow-[0_1px_3px_rgba(20,14,12,0.04)] transition-shadow hover:shadow-md"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Activity className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-semibold text-gray-900">PulmoLens</span>
          <span className="text-sm text-muted-foreground">
            AI-assisted chart review for pulmonology — PFT trends, asthma/COPD follow-up tracking.
          </span>
          <span className="mt-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Open PulmoLens →
          </span>
        </Link>

        <Link
          href={`${SPECIALTIES.denta.basePath}/patients`}
          className="group flex flex-col items-start gap-3 rounded-xl border border-border/70 bg-white p-6 shadow-[0_1px_3px_rgba(20,14,12,0.04)] transition-shadow hover:shadow-md"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <Stethoscope className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-semibold text-gray-900">DentaLens</span>
          <span className="text-sm text-muted-foreground">
            AI-assisted chart review for dental practices — odontogram, recall tracking, treatment plans.
          </span>
          <span className="mt-1 text-xs font-medium text-emerald-600 opacity-0 transition-opacity group-hover:opacity-100">
            Open DentaLens →
          </span>
        </Link>
      </div>
    </div>
  );
}
