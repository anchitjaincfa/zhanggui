// Live call state. Supabase, schema `zhanggui`.
// Memory lives in XTrace; this is only the ephemeral theatre of one call —
// transcript lines, tool calls, what changed on which surface.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL || "",
      process.env.SUPABASE_KEY || "",
      { db: { schema: "zhanggui" }, auth: { persistSession: false } }
    );
  }
  return client;
}

export type EventKind =
  | "transcript" | "memory" | "guardian" | "secret_menu"
  | "order" | "kds" | "receipt" | "status";

export interface CallRow {
  id: string;
  vapi_call_id: string | null;
  restaurant_id: string;
  caller_phone: string | null;
  guest_name: string | null;
  language: string;
  channel: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  transcript: unknown;
  summary: string | null;
}

export async function createCall(input: {
  phone?: string | null;
  guestName?: string | null;
  language?: string;
  channel?: string;
  vapiCallId?: string | null;
}): Promise<string> {
  const { data, error } = await db()
    .from("calls")
    .insert({
      caller_phone: input.phone ?? null,
      guest_name: input.guestName ?? null,
      language: input.language ?? "en",
      channel: input.channel ?? "phone",
      vapi_call_id: input.vapiCallId ?? null,
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function latestCallId(): Promise<string | null> {
  const { data } = await db()
    .from("calls")
    .select("id")
    .order("started_at", { ascending: false })
    .limit(1);
  return (data as { id: string }[] | null)?.[0]?.id ?? null;
}

export async function getCall(id: string): Promise<CallRow | null> {
  const { data } = await db().from("calls").select("*").eq("id", id).single();
  return (data as CallRow) ?? null;
}

export async function updateCall(id: string, patch: Record<string, unknown>) {
  await db().from("calls").update(patch).eq("id", id);
}

export async function findCallByVapiId(vapiCallId: string): Promise<CallRow | null> {
  const { data } = await db().from("calls").select("*").eq("vapi_call_id", vapiCallId).limit(1);
  return (data as CallRow[] | null)?.[0] ?? null;
}

export async function emit(
  callId: string,
  kind: EventKind,
  title: string,
  detail: Record<string, unknown> = {}
) {
  await db().from("events").insert({ call_id: callId, kind, title, detail });
}

export async function emitMany(
  callId: string,
  rows: { kind: EventKind; title: string; detail?: Record<string, unknown> }[]
) {
  if (!rows.length) return;
  await db()
    .from("events")
    .insert(rows.map((r) => ({ call_id: callId, kind: r.kind, title: r.title, detail: r.detail ?? {} })));
}

export interface EventRow {
  id: number;
  call_id: string;
  ts: string;
  kind: EventKind;
  title: string | null;
  detail: Record<string, unknown>;
}

export async function eventsFor(callId: string): Promise<EventRow[]> {
  const { data } = await db()
    .from("events")
    .select("*")
    .eq("call_id", callId)
    .order("ts", { ascending: true })
    .order("id", { ascending: true });
  return (data as EventRow[]) ?? [];
}

export async function resetAll() {
  await db().from("events").delete().neq("id", -1);
  await db().from("memory_log").delete().neq("id", -1);
  await db().from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await db().from("calls").delete().neq("id", "00000000-0000-0000-0000-000000000000");
}
