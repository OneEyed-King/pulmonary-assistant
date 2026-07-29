"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import type { Condition } from "@/lib/fhir-types";
import {
  UPPER_ROW,
  LOWER_ROW,
  STATUS_STYLE,
  buildToothFindings,
  currentStatus,
  toothLabel,
  type ToothFinding,
} from "@/lib/odontogram";

function Tooth({ number, findings }: { number: number; findings: ToothFinding[] | undefined }) {
  const status = currentStatus(findings);
  const style = STATUS_STYLE[status];
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative flex flex-col items-center">
      <button
        type="button"
        onClick={() => findings && setOpen((o) => !o)}
        title={toothLabel(number)}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md border-2 text-[11px] font-semibold text-gray-700 transition-transform",
          findings ? "cursor-pointer hover:scale-105" : "cursor-default"
        )}
        style={{ backgroundColor: style.fill, borderColor: style.stroke }}
      >
        {number}
      </button>
      {open && findings && (
        <div className="absolute top-11 z-20 w-56 rounded-md border border-border bg-white p-2.5 text-left shadow-lg">
          <p className="text-xs font-semibold text-gray-900">{toothLabel(number)}</p>
          <div className="mt-1.5 space-y-1.5">
            {findings.map((f, i) => (
              <div key={i} className="text-xs">
                <p className="font-medium text-gray-800">
                  {f.conditionText}
                  {f.date && <span className="ml-1 font-normal text-muted-foreground">· {formatDate(f.date)}</span>}
                </p>
                {f.detail && <p className="text-muted-foreground">{f.detail}</p>}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-1.5 text-[11px] font-medium text-primary hover:underline"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

export function Odontogram({ conditions }: { conditions: Condition[] }) {
  const byTooth = buildToothFindings(conditions);
  const anyFindings = byTooth.size > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Odontogram</CardTitle>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {Object.entries(STATUS_STYLE).map(([key, s]) => (
              <span key={key} className="flex items-center gap-1">
                <span
                  className="h-2.5 w-2.5 rounded-sm border"
                  style={{ backgroundColor: s.fill, borderColor: s.stroke }}
                />
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!anyFindings && (
          <p className="mb-3 text-sm text-muted-foreground">
            No tooth-specific findings on file yet — chart shows a healthy baseline.
          </p>
        )}
        <div className="overflow-x-auto">
          <div className="inline-flex min-w-full flex-col items-center gap-2 py-1">
            <div className="flex gap-1.5">
              {UPPER_ROW.map((n) => (
                <Tooth key={n} number={n} findings={byTooth.get(n)} />
              ))}
            </div>
            <div className="my-0.5 h-px w-full bg-border" />
            <div className="flex gap-1.5">
              {LOWER_ROW.map((n) => (
                <Tooth key={n} number={n} findings={byTooth.get(n)} />
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Universal Numbering System (1–32). Click a highlighted tooth for details.
        </p>
      </CardContent>
    </Card>
  );
}
