"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Patient } from "@/lib/fhir-types";
import type { SpecialtyTag } from "@/lib/specialty";

const todayISO = () => new Date().toISOString().slice(0, 10);

const patientSchema = z.object({
  givenName: z.string().trim().min(1, "First name is required"),
  familyName: z.string().trim().min(1, "Last name is required"),
  gender: z.enum(["male", "female", "other", "unknown"], {
    errorMap: () => ({ message: "Select a gender" }),
  }),
  birthDate: z
    .string()
    .min(1, "Date of birth is required")
    .refine((v) => !isNaN(new Date(v).getTime()), "Enter a valid date")
    .refine((v) => v <= todayISO(), "Date of birth cannot be in the future"),
});

type PatientFormValues = z.infer<typeof patientSchema>;

function patientToDefaults(patient?: Patient): PatientFormValues {
  const name = patient?.name?.[0];
  return {
    givenName: name?.given?.[0] ?? "",
    familyName: name?.family ?? "",
    gender: (patient?.gender as PatientFormValues["gender"]) ?? "unknown",
    birthDate: patient?.birthDate ?? "",
  };
}

export function PatientForm({
  patient,
  basePath,
  specialtyTag,
}: {
  patient?: Patient;
  basePath: string;
  specialtyTag: SpecialtyTag;
}) {
  const router = useRouter();
  const isEdit = Boolean(patient?.id);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: patientToDefaults(patient),
  });

  const onSubmit = async (values: PatientFormValues) => {
    setSubmitting(true);
    setSubmitError(null);

    // Spread the existing resource first (on edit) so fields this form doesn't touch — address,
    // telecom, and critically meta.tag — survive the save instead of being silently dropped.
    // meta.tag is always re-stamped explicitly to this app's specialty, so it can never drift.
    const resource: Patient = {
      ...patient,
      resourceType: "Patient",
      ...(patient?.id ? { id: patient.id } : {}),
      name: [
        {
          use: "official",
          given: [values.givenName],
          family: values.familyName,
        },
      ],
      gender: values.gender,
      birthDate: values.birthDate,
      meta: { ...patient?.meta, tag: [specialtyTag] },
    };

    try {
      const res = await fetch(isEdit ? `/api/fhir/Patient/${patient!.id}` : "/api/fhir/Patient", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/fhir+json" },
        body: JSON.stringify(resource),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Server rejected the request (${res.status}): ${body}`);
      }

      const saved: Patient = await res.json();
      router.push(`${basePath}/patients/${saved.id}`);
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="givenName">First name</Label>
          <Input id="givenName" {...register("givenName")} />
          {errors.givenName && <p className="mt-1 text-xs text-red-600">{errors.givenName.message}</p>}
        </div>
        <div>
          <Label htmlFor="familyName">Last name</Label>
          <Input id="familyName" {...register("familyName")} />
          {errors.familyName && <p className="mt-1 text-xs text-red-600">{errors.familyName.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="gender">Gender</Label>
        <Select id="gender" {...register("gender")}>
          <option value="unknown">Select…</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </Select>
        {errors.gender && <p className="mt-1 text-xs text-red-600">{errors.gender.message}</p>}
      </div>

      <div>
        <Label htmlFor="birthDate">Date of birth</Label>
        <Input id="birthDate" type="date" max={todayISO()} {...register("birthDate")} />
        {errors.birthDate && <p className="mt-1 text-xs text-red-600">{errors.birthDate.message}</p>}
      </div>

      {submitError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Create patient"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
