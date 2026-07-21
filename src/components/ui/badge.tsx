import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "green" | "amber" | "red" | "gray" | "blue";

// Soft, low-saturation badge fills (light -50 tint + -700 text) rather than punchy -100/-800
// pairs — reads calmer against the app's warm background without losing legibility.
const toneClasses: Record<Tone, string> = {
  default: "bg-gray-50 text-gray-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-rose-50 text-rose-700",
  gray: "bg-gray-50 text-gray-600",
  blue: "bg-sky-50 text-sky-700",
};

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
