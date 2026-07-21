import { NextRequest, NextResponse } from "next/server";
import { buildNoteAssistPrompt, NOTE_ASSIST_SYSTEM_PROMPT, type NoteAssistContext } from "@/lib/note-assist";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<NoteAssistContext>;
  const shorthand = body.shorthand?.trim();
  if (!shorthand) {
    return NextResponse.json({ error: "shorthand is required" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured. Add it to .env.local and restart the dev server." },
      { status: 500 }
    );
  }

  const context: NoteAssistContext = {
    shorthand,
    activeConditions: body.activeConditions ?? [],
    stagedMedications: body.stagedMedications ?? [],
  };
  const prompt = buildNoteAssistPrompt(context);
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
        temperature: 0.2,
        messages: [
          { role: "system", content: NOTE_ASSIST_SYSTEM_PROMPT },
          { role: "user", content: prompt },
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
    const errBody = await completionRes.text().catch(() => "");
    return NextResponse.json({ error: `OpenAI request failed (${completionRes.status}): ${errBody}` }, { status: 502 });
  }

  const data = await completionRes.json();
  const content: string | undefined = data.choices?.[0]?.message?.content;

  let parsed: { subjective: string; objective: string; assessment: string; plan: string };
  try {
    const raw = JSON.parse(content ?? "{}");
    parsed = {
      subjective: typeof raw.subjective === "string" ? raw.subjective : "",
      objective: typeof raw.objective === "string" ? raw.objective : "",
      assessment: typeof raw.assessment === "string" ? raw.assessment : "",
      plan: typeof raw.plan === "string" ? raw.plan : "",
    };
  } catch {
    return NextResponse.json({ error: "Could not parse AI response." }, { status: 502 });
  }

  return NextResponse.json(parsed);
}
