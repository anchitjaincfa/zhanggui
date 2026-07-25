// The console-driven call path.
//
// POST { scenario }            → start a call, run beat 0, return callId
// POST { callId, step: true }  → advance one beat
// POST { reset: true }         → wipe the stage
//
// Beats advance on command rather than on a timer, so the presenter can stop
// and talk over any moment — which is what you actually want on stage.

import { NextResponse } from "next/server";
import { SCENARIOS, scenarioList } from "@/lib/scenarios";
import { createCall, emit, getCall, resetAll, updateCall, eventsFor } from "@/lib/store";
import { closeCall, runAction, type RunContext } from "@/lib/engine";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

interface Body { scenario?: string; callId?: string; step?: boolean; reset?: boolean }

export async function POST(req: Request) {
  let body: Body = {};
  try { body = (await req.json()) as Body; } catch { /* empty body is fine */ }

  try {
    if (body.reset) {
      await resetAll();
      return NextResponse.json({ ok: true, reset: true });
    }

    // ── Advance an existing call by one beat.
    if (body.callId && body.step) {
      const call = await getCall(body.callId);
      if (!call) return NextResponse.json({ ok: false, error: "no such call" }, { status: 404 });

      const scenarioId = (call.summary ?? "").split(":")[0];
      const scenario = SCENARIOS[scenarioId];
      if (!scenario) return NextResponse.json({ ok: false, error: "call has no scenario" }, { status: 400 });

      const cursor = Number((call.summary ?? "").split(":")[1] ?? "0");
      const next = cursor + 1;
      // A presenter double-tapping Next must not run the same beat twice.
      // Claim the slot before doing any work; a loser sees its own write fail.
      const { data: claimed } = await (await import("@/lib/store")).db()
        .from("calls")
        .update({ summary: `${scenarioId}:${next}` })
        .eq("id", call.id)
        .eq("summary", `${scenarioId}:${cursor}`)
        .select("id");
      if (!claimed || claimed.length === 0) {
        return NextResponse.json({ ok: true, callId: call.id, beat: cursor, skipped: "double-tap" });
      }
      if (next >= scenario.beats.length) {
        const evs = await eventsFor(call.id);
        const transcript = evs
          .filter((e) => e.kind === "transcript")
          .map((e) => ({
            role: String((e.detail as { role?: string }).role ?? "assistant"),
            content: String((e.detail as { text?: string }).text ?? ""),
          }));
        closeCall({ callId: call.id, phone: call.caller_phone }, transcript, true);
        await updateCall(call.id, { status: "ended", ended_at: new Date().toISOString() });
        return NextResponse.json({ ok: true, callId: call.id, done: true, beat: cursor });
      }

      await runBeat(scenarioId, next, call.id, call.caller_phone);
      return NextResponse.json({
        ok: true, callId: call.id, beat: next,
        remaining: scenario.beats.length - next - 1,
        done: next >= scenario.beats.length - 1,
      });
    }

    // ── Start a fresh call.
    const scenario = SCENARIOS[body.scenario ?? "mei"];
    if (!scenario) {
      return NextResponse.json({ ok: false, error: "unknown scenario", scenarios: scenarioList() }, { status: 400 });
    }
    await resetAll();
    const callId = await createCall({
      phone: scenario.phone,
      language: scenario.language,
      channel: "phone",
    });
    await updateCall(callId, { summary: `${scenario.id}:0` });
    await emit(callId, "status", "ringing", { scenario: scenario.id, label: scenario.label });
    await runBeat(scenario.id, 0, callId, scenario.phone);

    return NextResponse.json({
      ok: true, callId, beat: 0,
      scenario: scenario.id, label: scenario.label,
      totalBeats: scenario.beats.length,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

async function runBeat(scenarioId: string, index: number, callId: string, phone: string | null) {
  const scenario = SCENARIOS[scenarioId];
  const beat = scenario.beats[index];
  if (!beat) return;

  const ctx: RunContext = { callId, phone };

  if (beat.note) await emit(callId, "status", "note", { note: beat.note, beat: index });

  if (beat.who === "caller" && beat.text) {
    await emit(callId, "transcript", "caller", { role: "user", text: beat.text });
  }

  for (const action of beat.actions ?? []) {
    await runAction(ctx, action);
  }

  // A desk line only speaks if no action already produced one for this beat.
  if (beat.who === "desk" && beat.text) {
    await emit(callId, "transcript", "desk", { role: "assistant", text: beat.text });
  }
}

export async function GET() {
  return NextResponse.json({ scenarios: scenarioList() });
}
