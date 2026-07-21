"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MEDICATION_CATALOG } from "@/lib/medication-catalog";
import type { Encounter } from "@/lib/fhir-types";
import { Trash2, Plus, ClipboardCheck, CheckCircle2, Sparkles } from "lucide-react";

const PRACTITIONER_REF = "Practitioner/1011";
const ORGANIZATION_REF = "Organization/1010";

interface StagedMedication {
  rxcui?: string;
  display: string;
  dosage: string;
}

interface NoteFields {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

function wrapDiv(text: string): string {
  return `<div xmlns='http://www.w3.org/1999/xhtml'>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
}

export function VisitWorkspace({
  patientId,
  patientName,
  encounter: initialEncounter,
  activeConditions,
  activeMedications,
}: {
  patientId: string;
  patientName: string;
  encounter: Encounter | null;
  activeConditions: string[];
  activeMedications: string[];
}) {
  const router = useRouter();
  const [encounter, setEncounter] = React.useState<Encounter | null>(initialEncounter);
  const [starting, setStarting] = React.useState(false);
  const [startError, setStartError] = React.useState<string | null>(null);

  const [stagedMeds, setStagedMeds] = React.useState<StagedMedication[]>([]);
  const [medChoice, setMedChoice] = React.useState<string>(MEDICATION_CATALOG[0].rxcui);
  const [medOtherText, setMedOtherText] = React.useState("");
  const [medDosage, setMedDosage] = React.useState(MEDICATION_CATALOG[0].defaultDosage);

  const [note, setNote] = React.useState<NoteFields>({ subjective: "", objective: "", assessment: "", plan: "" });
  const [shorthand, setShorthand] = React.useState("");
  const [expanding, setExpanding] = React.useState(false);
  const [expandError, setExpandError] = React.useState<string | null>(null);

  const [step, setStep] = React.useState<"chart" | "review" | "done">("chart");
  const [finalizing, setFinalizing] = React.useState(false);
  const [finalizeError, setFinalizeError] = React.useState<string | null>(null);

  const startVisit = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const res = await fetch("/api/fhir/Encounter", {
        method: "POST",
        headers: { "Content-Type": "application/fhir+json" },
        body: JSON.stringify({
          resourceType: "Encounter",
          status: "in-progress",
          class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "AMB", display: "ambulatory" },
          subject: { reference: `Patient/${patientId}` },
          participant: [{ individual: { reference: PRACTITIONER_REF, display: "Dr. Linh Nguyen" } }],
          serviceProvider: { reference: ORGANIZATION_REF },
          period: { start: new Date().toISOString() },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.issue?.[0]?.diagnostics ?? `Failed to start visit (${res.status})`);
      setEncounter(data);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : String(err));
    } finally {
      setStarting(false);
    }
  };

  const addMedication = () => {
    if (medChoice === "other") {
      if (!medOtherText.trim()) return;
      setStagedMeds((prev) => [...prev, { display: medOtherText.trim(), dosage: medDosage.trim() || "As directed" }]);
      setMedOtherText("");
    } else {
      const catalogItem = MEDICATION_CATALOG.find((m) => m.rxcui === medChoice);
      if (!catalogItem) return;
      setStagedMeds((prev) => [
        ...prev,
        { rxcui: catalogItem.rxcui, display: catalogItem.display, dosage: medDosage.trim() || catalogItem.defaultDosage },
      ]);
    }
  };

  const removeMedication = (idx: number) => setStagedMeds((prev) => prev.filter((_, i) => i !== idx));

  const noteHasContent = Object.values(note).some((v) => v.trim().length > 0);

  const expandNote = async () => {
    if (!shorthand.trim()) return;
    setExpanding(true);
    setExpandError(null);
    try {
      const res = await fetch("/api/ai/expand-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shorthand,
          activeConditions,
          stagedMedications: stagedMeds.map((m) => `${m.display} — ${m.dosage}`),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Failed to expand note (${res.status})`);
      setNote({
        subjective: data.subjective || "",
        objective: data.objective || "",
        assessment: data.assessment || "",
        plan: data.plan || "",
      });
    } catch (err) {
      setExpandError(err instanceof Error ? err.message : String(err));
    } finally {
      setExpanding(false);
    }
  };

  const finalize = async () => {
    if (!encounter?.id) return;
    setFinalizing(true);
    setFinalizeError(null);

    const nowISO = new Date().toISOString();
    const entries: Record<string, unknown>[] = [];

    entries.push({
      resource: { ...encounter, status: "finished", period: { ...encounter.period, end: nowISO } },
      request: { method: "PUT", url: `Encounter/${encounter.id}` },
    });

    for (const med of stagedMeds) {
      entries.push({
        resource: {
          resourceType: "MedicationRequest",
          status: "active",
          intent: "order",
          medicationCodeableConcept: med.rxcui
            ? { coding: [{ system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: med.rxcui, display: med.display }], text: med.display }
            : { text: med.display },
          subject: { reference: `Patient/${patientId}` },
          encounter: { reference: `Encounter/${encounter.id}` },
          authoredOn: nowISO.slice(0, 10),
          requester: { reference: PRACTITIONER_REF, display: "Dr. Linh Nguyen" },
          dosageInstruction: [{ text: med.dosage }],
        },
        request: { method: "POST", url: "MedicationRequest" },
      });
    }

    if (noteHasContent) {
      const sections = [
        { title: "Subjective", text: note.subjective },
        { title: "Objective", text: note.objective },
        { title: "Assessment", text: note.assessment },
        { title: "Plan", text: note.plan },
      ].filter((s) => s.text.trim().length > 0);

      entries.push({
        resource: {
          resourceType: "Composition",
          status: "final",
          type: { coding: [{ system: "http://loinc.org", code: "11506-3", display: "Progress note" }] },
          subject: { reference: `Patient/${patientId}` },
          encounter: { reference: `Encounter/${encounter.id}` },
          date: nowISO,
          author: [{ reference: PRACTITIONER_REF, display: "Dr. Linh Nguyen" }],
          title: "Visit Note",
          section: sections.map((s) => ({ title: s.title, text: { status: "generated", div: wrapDiv(s.text) } })),
        },
        request: { method: "POST", url: "Composition" },
      });
    }

    try {
      const res = await fetch("/api/fhir", {
        method: "POST",
        headers: { "Content-Type": "application/fhir+json" },
        body: JSON.stringify({ resourceType: "Bundle", type: "transaction", entry: entries }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      setStep("done");
      router.refresh();
    } catch (err) {
      setFinalizeError(err instanceof Error ? err.message : String(err));
    } finally {
      setFinalizing(false);
    }
  };

  if (!encounter) {
    return (
      <Card className="p-8 text-center">
        <p className="font-display text-lg font-semibold text-gray-900">Start visit for {patientName}?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This creates a new in-progress Encounter tied to today&apos;s appointment.
        </p>
        {startError && <p className="mt-3 text-sm text-red-600">{startError}</p>}
        <Button className="mt-4" onClick={startVisit} disabled={starting}>
          {starting ? "Starting…" : "Start Visit"}
        </Button>
      </Card>
    );
  }

  if (step === "done") {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
        <p className="mt-2 font-display text-lg font-semibold text-gray-900">Visit finalized</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {stagedMeds.length} medication{stagedMeds.length === 1 ? "" : "s"} and{" "}
          {noteHasContent ? "a visit note were" : "no note was"} saved to the FHIR server.
        </p>
        <a href={`/patients/${patientId}`}>
          <Button className="mt-4">Back to chart</Button>
        </a>
      </Card>
    );
  }

  if (step === "review") {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Review changes before saving
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                New medications ({stagedMeds.length})
              </p>
              {stagedMeds.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">None added.</p>
              ) : (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-gray-700">
                  {stagedMeds.map((m, i) => (
                    <li key={i}>
                      {m.display} — {m.dosage}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visit note</p>
              {!noteHasContent ? (
                <p className="mt-1 text-sm text-muted-foreground">No note written.</p>
              ) : (
                <div className="mt-1 space-y-1.5 text-sm text-gray-700">
                  {note.subjective && <p><span className="font-medium">Subjective:</span> {note.subjective}</p>}
                  {note.objective && <p><span className="font-medium">Objective:</span> {note.objective}</p>}
                  {note.assessment && <p><span className="font-medium">Assessment:</span> {note.assessment}</p>}
                  {note.plan && <p><span className="font-medium">Plan:</span> {note.plan}</p>}
                </div>
              )}
            </div>
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              Encounter will be marked <strong>finished</strong> for today&apos;s visit.
            </div>
            {finalizeError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{finalizeError}</div>
            )}
            <div className="flex gap-2">
              <Button onClick={finalize} disabled={finalizing}>
                {finalizing ? "Saving…" : "Confirm & Save to FHIR"}
              </Button>
              <Button variant="outline" onClick={() => setStep("chart")} disabled={finalizing}>
                Back to editing
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedCatalog = MEDICATION_CATALOG.find((m) => m.rxcui === medChoice);

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/[0.03] p-4">
        <p className="font-display text-lg font-semibold text-gray-900">{patientName}</p>
        <p className="text-xs text-muted-foreground">Encounter started {new Date(encounter.period?.start ?? "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {activeConditions.map((c, i) => (
            <Badge key={i} tone="blue">{c}</Badge>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Medications</CardTitle>
        </CardHeader>
        <CardContent>
          {activeMedications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active medications on file.</p>
          ) : (
            <ul className="list-disc space-y-0.5 pl-4 text-sm text-gray-700">
              {activeMedications.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Medication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Medication</Label>
              <Select
                value={medChoice}
                onChange={(e) => {
                  setMedChoice(e.target.value);
                  const item = MEDICATION_CATALOG.find((m) => m.rxcui === e.target.value);
                  if (item) setMedDosage(item.defaultDosage);
                }}
              >
                {MEDICATION_CATALOG.map((m) => (
                  <option key={m.rxcui} value={m.rxcui}>
                    {m.display}
                  </option>
                ))}
                <option value="other">Other (type manually)</option>
              </Select>
            </div>
            <div>
              <Label>Dosage instructions</Label>
              <Input value={medDosage} onChange={(e) => setMedDosage(e.target.value)} />
            </div>
          </div>
          {medChoice === "other" && (
            <div>
              <Label>Medication name</Label>
              <Input
                value={medOtherText}
                onChange={(e) => setMedOtherText(e.target.value)}
                placeholder="e.g. Roflumilast 500mcg"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                No RxNorm code on file for this — will be saved as free text.
              </p>
            </div>
          )}
          {medChoice !== "other" && selectedCatalog && (
            <p className="text-xs text-muted-foreground">RxNorm code {selectedCatalog.rxcui}</p>
          )}
          <Button variant="outline" onClick={addMedication}>
            <Plus className="h-4 w-4" />
            Add to visit
          </Button>

          {stagedMeds.length > 0 && (
            <div className="space-y-1.5 border-t border-border pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Staged this visit ({stagedMeds.length})
              </p>
              {stagedMeds.map((m, i) => (
                <div key={i} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
                  <span>
                    {m.display} — <span className="text-muted-foreground">{m.dosage}</span>
                  </span>
                  <button onClick={() => removeMedication(i)} className="text-muted-foreground hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Note Assist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Quick shorthand from the visit</Label>
          <Textarea
            rows={2}
            value={shorthand}
            onChange={(e) => setShorthand(e.target.value)}
            placeholder="e.g. wheezing better, adherence spotty pt admits missing doses, lungs clear, step up therapy, f/u 6wk"
          />
          <p className="text-xs text-muted-foreground">
            Expands your own shorthand into a draft SOAP note below — it only elaborates on what you write here
            (plus conditions/medications already in this visit), never invents findings. Review and edit before saving.
          </p>
          {expandError && <p className="text-sm text-red-600">{expandError}</p>}
          <Button variant="outline" size="sm" onClick={expandNote} disabled={expanding || !shorthand.trim()}>
            <Sparkles className="h-3.5 w-3.5" />
            {expanding ? "Expanding…" : "Expand with AI"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visit Note</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Subjective</Label>
            <Textarea rows={3} value={note.subjective} onChange={(e) => setNote({ ...note, subjective: e.target.value })} />
          </div>
          <div>
            <Label>Objective</Label>
            <Textarea rows={3} value={note.objective} onChange={(e) => setNote({ ...note, objective: e.target.value })} />
          </div>
          <div>
            <Label>Assessment</Label>
            <Textarea rows={3} value={note.assessment} onChange={(e) => setNote({ ...note, assessment: e.target.value })} />
          </div>
          <div>
            <Label>Plan</Label>
            <Textarea rows={3} value={note.plan} onChange={(e) => setNote({ ...note, plan: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => setStep("review")}>
          <ClipboardCheck className="h-4 w-4" />
          Review & Finalize
        </Button>
      </div>
    </div>
  );
}
