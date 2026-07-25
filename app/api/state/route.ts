// What the console reads, ~1 Hz. Projects the raw event log into the shape
// the UI was built against. Deliberately dumb: all the thinking already
// happened when the events were written.

import { NextResponse } from "next/server";
import { eventsFor, getCall, latestCallId, type EventRow } from "@/lib/store";
import { bySku } from "@/data/restaurant";
import { SCENARIOS } from "@/lib/scenarios";

export const dynamic = "force-dynamic";

const d = <T,>(e: EventRow) => (e.detail && typeof e.detail === "object" ? e.detail : {}) as T;

const EMPTY = {
  call: {
    id: "", phone: null, guestName: null, guestNameZh: null,
    language: "en", status: "idle", channel: "phone",
    startedAt: new Date().toISOString(), durationSec: 0,
  },
  transcript: [], memory: [], guestCard: null, guardian: [],
  secretMenu: [], order: { lines: [], status: "idle", pickupMinutes: null, totalCents: 0 },
  kds: { ticketId: null, stations: [], notes: [] }, receipt: [],
  scenarios: Object.values(SCENARIOS).map((s) => ({ id: s.id, label: s.label, blurb: s.blurb })),
  beat: { index: 0, total: 0, note: null as string | null },
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("callId");
    const callId = !q || q === "latest" ? await latestCallId() : q;
    if (!callId) return NextResponse.json(EMPTY);

    const call = await getCall(callId);
    if (!call) return NextResponse.json(EMPTY);
    const events = await eventsFor(callId);

    const transcript = events
      .filter((e) => e.kind === "transcript")
      .map((e) => {
        const x = d<{ role?: string; text?: string }>(e);
        return { role: x.role === "user" ? "user" : "assistant", text: x.text ?? "", ts: e.ts };
      });

    const memRows = events.filter((e) => e.kind === "memory");
    const memory = memRows.map((e, i) => {
      const x = d<{ source?: string; scope?: string; type?: string; text?: string }>(e);
      return {
        ts: e.ts,
        source: x.source ?? "memory",
        scope: (x.scope ?? "personal") as "personal" | "kitchen" | "allergen",
        type: (x.type ?? "fact") as "fact" | "episode" | "artifact",
        text: x.text ?? "",
        isNew: i >= memRows.length - 3,
      };
    });

    const guardian = events
      .filter((e) => e.kind === "guardian")
      .map((e) => {
        const x = d<Record<string, unknown>>(e);
        return {
          ts: e.ts,
          sku: String(x.sku ?? ""),
          nameEn: String(x.nameEn ?? ""),
          nameZh: String(x.nameZh ?? ""),
          verdict: String(x.verdict ?? "allow") as "allow" | "block" | "unconfirmed",
          say: String(x.say ?? ""),
          restricted: (x.restricted as string[]) ?? [],
          hazards: (x.hazards as unknown[]) ?? [],
          searches: (x.searches as unknown[]) ?? [],
        };
      });

    const secretMenu = events
      .filter((e) => e.kind === "secret_menu")
      .map((e) => d<{ sku: string; nameEn: string; nameZh: string; phrase: string; reason: string }>(e));

    const orderEvents = events.filter((e) => e.kind === "order");
    const lines = orderEvents.map((e) =>
      d<{ sku: string; nameEn: string; nameZh: string; qty: number; modifiers: string[]; blocked: boolean; priceCents: number; station: string }>(e)
    );
    const blockedLines = guardian
      .filter((g) => g.verdict !== "allow")
      .map((g) => ({
        sku: g.sku, nameEn: g.nameEn, nameZh: g.nameZh, qty: 1,
        modifiers: [] as string[], blocked: true, priceCents: 0,
        station: bySku(g.sku)?.station ?? "wok",
      }));

    const kdsEvent = events.find((e) => e.kind === "kds");
    const stationMap = new Map<string, string[]>();
    for (const l of lines) {
      const st = l.station ?? "wok";
      stationMap.set(st, [...(stationMap.get(st) ?? []), `${l.qty}× ${l.nameEn}${l.modifiers?.length ? ` (${l.modifiers.join(", ")})` : ""}`]);
    }

    const receipt = events
      .filter((e) => e.kind === "receipt")
      .map((e) => {
        const x = d<{ tool?: string; args?: object; result?: string; surface?: string }>(e);
        return { ts: e.ts, tool: x.tool ?? "", args: x.args ?? {}, result: x.result ?? "", surface: x.surface ?? "" };
      });

    const notes = events.filter((e) => e.kind === "status" && d<{ note?: string }>(e).note);
    const lastNote = notes.length ? d<{ note?: string }>(notes[notes.length - 1]).note ?? null : null;

    const scenarioId = (call.summary ?? "").split(":")[0];
    const beatIndex = Number((call.summary ?? "").split(":")[1] ?? "0");
    const total = SCENARIOS[scenarioId]?.beats.length ?? 0;

    // Guest card is assembled from the recalled personal rows, so the panel
    // shows exactly what the agent was working from — nothing more.
    const personal = memory.filter((m) => m.scope === "personal").map((m) => m.text);
    const guestCard = call.caller_phone
      ? {
          phone: call.caller_phone,
          name: call.guest_name,
          nameZh: call.guest_name && /[一-鿿]/.test(call.guest_name) ? call.guest_name : null,
          language: call.language,
          restrictions: [...new Set(
            personal.flatMap((t) => {
              const hits: string[] = [];
              for (const a of ["peanut", "shellfish", "shrimp", "sesame", "gluten", "dairy", "soy", "egg", "tree nut", "fish sauce", "shrimp paste"]) {
                if (new RegExp(`\\b${a}`, "i").test(t) && /allerg|avoid|cannot|can't/i.test(t)) hits.push(a);
              }
              return hits;
            })
          )],
          dislikes: personal.filter((t) => /dislike|too sweet|no cilantro|avoids/i.test(t)).slice(0, 3),
          spice: personal.find((t) => /spic|numbing|heat|sour/i.test(t)) ?? null,
          fulfilment: personal.find((t) => /pickup|collect|delivery/i.test(t)) ?? null,
          cadence: personal.find((t) => /every|regular for|usually/i.test(t)) ?? null,
          notes: personal,
          orderCount: personal.length,
          knownSince: null as string | null,
        }
      : null;

    return NextResponse.json({
      call: {
        id: call.id,
        phone: call.caller_phone,
        guestName: call.guest_name,
        guestNameZh: guestCard?.nameZh ?? null,
        language: call.language,
        status: call.status,
        channel: call.channel,
        startedAt: call.started_at,
        durationSec: Math.max(0, Math.round((Date.now() - new Date(call.started_at).getTime()) / 1000)),
      },
      transcript,
      memory,
      guestCard,
      guardian,
      secretMenu,
      order: {
        lines: [...lines, ...blockedLines],
        status: call.status === "ended" ? "fired" : "building",
        pickupMinutes: kdsEvent ? (d<{ pickupMinutes?: number }>(kdsEvent).pickupMinutes ?? null) : null,
        totalCents: lines.reduce((s, l) => s + (l.priceCents ?? 0), 0),
      },
      kds: {
        ticketId: kdsEvent ? `GD-${String(kdsEvent.id).slice(-4)}` : null,
        stations: [...stationMap.entries()].map(([station, items]) => ({ station, items })),
        notes: guardian.filter((g) => g.verdict !== "allow").map((g) => `${g.nameEn}: ${g.verdict}`),
      },
      receipt,
      scenarios: Object.values(SCENARIOS).map((s) => ({ id: s.id, label: s.label, blurb: s.blurb })),
      beat: { index: beatIndex, total, note: lastNote },
    });
  } catch (err) {
    return NextResponse.json({ ...EMPTY, error: err instanceof Error ? err.message : String(err) });
  }
}
