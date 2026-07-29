import { NextRequest, NextResponse } from "next/server";
import { getPatientChart } from "@/lib/fhir";
import { buildClinicalContext, summarySystemPrompt } from "@/lib/ai-summary";
import { specialtyFromPatient } from "@/lib/specialty";

export async function POST(req: NextRequest) {
  const { patientId } = (await req.json()) as { patientId?: string };
  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured. Add it to .env.local and restart the dev server." },
      { status: 500 }
    );
  }

  let chart;
  try {
    chart = await getPatientChart(patientId);
  } catch (err) {
    return NextResponse.json(
      { error: `Could not load chart data: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    );
  }

  const specialty = specialtyFromPatient(chart.patient);
  const context = buildClinicalContext(chart, specialty);
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  let completionRes: Response;
  try {
    completionRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        temperature: 0.3,
        messages: [
          { role: "system", content: summarySystemPrompt(specialty) },
          { role: "user", content: context },
        ],
      }),
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Could not reach OpenAI: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    );
  }

  if (!completionRes.ok) {
    const body = await completionRes.text().catch(() => "");
    return NextResponse.json(
      { error: `OpenAI request failed (${completionRes.status}): ${body}` },
      { status: 502 }
    );
  }

  const data = await completionRes.json();
  const content: string | undefined = data.choices?.[0]?.message?.content;

  let parsed: { headline: string; points: string[] };
  try {
    parsed = JSON.parse(content ?? "{}");
    if (!parsed.headline) parsed.headline = content ?? "No summary returned.";
    if (!Array.isArray(parsed.points)) parsed.points = [];
  } catch {
    parsed = { headline: content ?? "No summary returned.", points: [] };
  }

  return NextResponse.json(parsed);
}
