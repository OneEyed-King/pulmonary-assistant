import Link from "next/link";
import { LayoutGrid, Activity, FlaskConical, Pill, History } from "lucide-react";
import { getPatientChart } from "@/lib/fhir";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PatientHeader } from "@/components/patient-header";
import { AttentionTiles } from "@/components/attention-tiles";
import { ClinicalAlerts } from "@/components/clinical-alerts";
import { VitalsPanel } from "@/components/vitals-panel";
import { ConditionsList } from "@/components/conditions-list";
import { AllergyList } from "@/components/allergy-list";
import { EncounterTimeline } from "@/components/encounter-timeline";
import { MedicationTimeline } from "@/components/medication-timeline";
import { MedicationsTable } from "@/components/medications-table";
import { ClinicalNotes } from "@/components/clinical-notes";
import { PreviousVisitCards } from "@/components/previous-visit-cards";
import { LabComparisonCards } from "@/components/lab-comparison-cards";
import { LabReportsTable } from "@/components/lab-reports-table";
import { TrendChart } from "@/components/trend-chart";
import { PhysicianBrief } from "@/components/physician-brief";
import { ClinicalChangesList } from "@/components/clinical-changes-list";
import { LOINC } from "@/lib/observations";
import { humanName } from "@/lib/fhir-types";

export const dynamic = "force-dynamic";

const navItemClass = "w-full justify-start px-3 py-2";

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  let chart: Awaited<ReturnType<typeof getPatientChart>>;
  try {
    chart = await getPatientChart(params.id);
  } catch (err) {
    return (
      <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Could not load this patient&apos;s chart. Make sure the local HAPI/docker-compose stack is running.
        <div className="mt-2 font-mono text-xs opacity-80">
          {err instanceof Error ? err.message : String(err)}
        </div>
      </Card>
    );
  }

  const { patient, encounters, conditions, medications, observations, diagnosticReports, compositions, allergies } =
    chart;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/patients">
          <Button variant="ghost" size="sm">
            ← All patients
          </Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/patients/${patient.id}/edit`}>
            <Button variant="outline" size="sm">
              Edit patient
            </Button>
          </Link>
          <Link href={`/patients/${patient.id}/visit`}>
            <Button size="sm">Start Visit</Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="overview" className="grid grid-cols-1 gap-4 lg:grid-cols-[168px_1fr_300px] lg:items-start">
        <TabsList className="flex w-full flex-col items-stretch gap-0.5 bg-transparent p-0 lg:sticky lg:top-4">
          <p className="mb-1 px-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">Chart</p>
          <TabsTrigger value="overview" icon={<LayoutGrid className="h-4 w-4 shrink-0" />} className={navItemClass}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="timeline" icon={<Activity className="h-4 w-4 shrink-0" />} className={navItemClass}>
            Timeline
          </TabsTrigger>
          <TabsTrigger value="labs" icon={<FlaskConical className="h-4 w-4 shrink-0" />} className={navItemClass}>
            Labs
          </TabsTrigger>
          <TabsTrigger value="medications" icon={<Pill className="h-4 w-4 shrink-0" />} className={navItemClass}>
            Medications
          </TabsTrigger>
          <TabsTrigger value="notes" icon={<History className="h-4 w-4 shrink-0" />} className={navItemClass}>
            Notes Archive
          </TabsTrigger>
        </TabsList>

        <div className="min-w-0 space-y-5">
          <PatientHeader patient={patient} conditions={conditions} allergies={allergies} encounters={encounters} />

          <TabsContent value="overview" className="space-y-5">
            <PhysicianBrief patientId={patient.id!} />
            <AttentionTiles observations={observations} encounters={encounters} medications={medications} />
            <ClinicalChangesList observations={observations} encounters={encounters} medications={medications} />
            <VitalsPanel observations={observations} />
            <div className="grid gap-4 md:grid-cols-2">
              <ConditionsList conditions={conditions} />
              <AllergyList allergies={allergies} />
            </div>
            <PreviousVisitCards
              encounters={encounters}
              compositions={compositions}
              diagnosticReports={diagnosticReports}
              conditions={conditions}
              medications={medications}
              observations={observations}
              patientName={humanName(patient.name)}
            />
          </TabsContent>

          <TabsContent value="timeline" className="grid gap-4 md:grid-cols-2">
            <EncounterTimeline encounters={encounters} />
            <MedicationTimeline medications={medications} />
          </TabsContent>

          <TabsContent value="labs" className="space-y-4">
            <LabComparisonCards observations={observations} />
            <div className="grid gap-4 md:grid-cols-2">
              <TrendChart
                title="Spirometry — FEV1 / FVC"
                observations={observations}
                unitLabel="L"
                series={[
                  { label: "FEV1", codes: LOINC.FEV1, color: "#2563eb" },
                  { label: "FVC", codes: LOINC.FVC, color: "#7c3aed" },
                ]}
              />
              <TrendChart
                title="Peak Expiratory Flow"
                observations={observations}
                unitLabel="L/min"
                series={[{ label: "PEF", codes: LOINC.PEF, color: "#059669" }]}
              />
              <TrendChart
                title="Asthma Control Test (ACT) Score"
                observations={observations}
                unitLabel="score"
                series={[{ label: "ACT", codes: LOINC.ACT_SCORE, color: "#d97706" }]}
              />
              <TrendChart
                title="Oxygen Saturation"
                observations={observations}
                unitLabel="%"
                series={[{ label: "SpO2", codes: LOINC.SPO2, color: "#dc2626" }]}
              />
            </div>
            <LabReportsTable
              diagnosticReports={diagnosticReports}
              observations={observations}
              patientName={humanName(patient.name)}
            />
          </TabsContent>

          <TabsContent value="medications">
            <MedicationsTable medications={medications} />
          </TabsContent>

          <TabsContent value="notes">
            <ClinicalNotes
              compositions={compositions}
              diagnosticReports={diagnosticReports}
              observations={observations}
              patientName={humanName(patient.name)}
            />
          </TabsContent>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4">
          <ClinicalAlerts observations={observations} encounters={encounters} medications={medications} />
        </aside>
      </Tabs>
    </div>
  );
}
