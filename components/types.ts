// Shape of GET /api/state, plus tolerant normalisation.
// Every field on the wire is treated as possibly missing: the console must
// look intentional on a cold load, not broken.

export type Scenario = "mei" | "wong" | "danny";
export type CallStatus = "idle" | "ringing" | "active" | "ended";
export type Verdict = "allow" | "block" | "unconfirmed";
export type Scope = "personal" | "kitchen" | "allergen";

export interface ZgCall {
  id: string;
  phone: string | null;
  guestName: string | null;
  guestNameZh: string | null;
  language: "en" | "zh";
  status: CallStatus;
  channel: "phone" | "pos";
  startedAt: string;
  durationSec: number;
}

export interface TranscriptTurn {
  role: "assistant" | "user";
  text: string;
  ts: string;
}

export interface MemoryRow {
  ts: string;
  source: string;
  scope: Scope;
  type: "fact" | "episode" | "artifact";
  text: string;
  isNew: boolean;
}

export interface GuestCardData {
  phone: string;
  name: string;
  nameZh: string | null;
  language: string;
  restrictions: string[];
  dislikes: string[];
  spice: string | null;
  fulfilment: string | null;
  cadence: string | null;
  notes: string[];
  orderCount: number;
  knownSince: string | null;
}

export interface Hazard {
  allergen: string;
  confirmations: number;
  lastConfirmed: string | null;
  evidence: string[];
  phrase: string;
}

export interface GuardianRow {
  ts: string;
  sku: string;
  nameEn: string;
  nameZh: string;
  verdict: Verdict;
  say: string;
  restricted: string[];
  hazards: Hazard[];
}

export interface SecretItem {
  sku: string;
  nameEn: string;
  nameZh: string;
  phrase: string;
  reason: string;
}

export interface OrderLine {
  sku: string;
  nameEn: string;
  nameZh: string;
  qty: number;
  modifiers: string[];
  blocked: boolean;
}

export interface OrderState {
  lines: OrderLine[];
  status: string;
  pickupMinutes: number | null;
  totalCents: number;
}

export interface KdsStation {
  station: string;
  items: string[];
}

export interface KdsState {
  ticketId: string | null;
  stations: KdsStation[];
  notes: string[];
}

export interface ReceiptRow {
  ts: string;
  tool: string;
  args: Record<string, unknown>;
  result: string;
  surface: string;
}

/** Not in the published contract, but the route ships them — used when present. */
export interface ScenarioMeta {
  id: string;
  label: string;
  blurb: string;
}

export interface Beat {
  index: number;
  total: number;
  note: string | null;
}

export interface ZgState {
  call: ZgCall | null;
  transcript: TranscriptTurn[];
  memory: MemoryRow[];
  guestCard: GuestCardData | null;
  guardian: GuardianRow[];
  secretMenu: SecretItem[];
  order: OrderState | null;
  kds: KdsState | null;
  receipt: ReceiptRow[];
  scenarios: ScenarioMeta[];
  beat: Beat | null;
  error: string | null;
}

/* ── normalisation ─────────────────────────────────────────────────── */

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const arr = (v: unknown): Json[] =>
  Array.isArray(v) ? v.filter(isObj) : [];

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : fallback;

const strOrNull = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const numOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const bool = (v: unknown): boolean => v === true;

const strs = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : fallback;

export const EMPTY_STATE: ZgState = {
  call: null,
  transcript: [],
  memory: [],
  guestCard: null,
  guardian: [],
  secretMenu: [],
  order: null,
  kds: null,
  receipt: [],
  scenarios: [],
  beat: null,
  error: null,
};

export function normalizeState(input: unknown): ZgState {
  if (!isObj(input)) return EMPTY_STATE;

  const rawCall = isObj(input.call) ? input.call : null;
  const call: ZgCall | null = rawCall
    ? {
        id: str(rawCall.id),
        phone: strOrNull(rawCall.phone),
        guestName: strOrNull(rawCall.guestName),
        guestNameZh: strOrNull(rawCall.guestNameZh),
        language: oneOf(rawCall.language, ["en", "zh"] as const, "en"),
        status: oneOf(
          rawCall.status,
          ["idle", "ringing", "active", "ended"] as const,
          "idle",
        ),
        channel: oneOf(rawCall.channel, ["phone", "pos"] as const, "phone"),
        startedAt: str(rawCall.startedAt),
        durationSec: num(rawCall.durationSec),
      }
    : null;

  const rawOrder = isObj(input.order) ? input.order : null;
  const order: OrderState | null = rawOrder
    ? {
        lines: arr(rawOrder.lines).map((l) => ({
          sku: str(l.sku),
          nameEn: str(l.nameEn, str(l.sku)),
          nameZh: str(l.nameZh),
          qty: num(l.qty, 1),
          modifiers: strs(l.modifiers),
          blocked: bool(l.blocked),
        })),
        status: str(rawOrder.status, "open"),
        pickupMinutes: numOrNull(rawOrder.pickupMinutes),
        totalCents: num(rawOrder.totalCents),
      }
    : null;

  const rawKds = isObj(input.kds) ? input.kds : null;
  const kds: KdsState | null = rawKds
    ? {
        ticketId: strOrNull(rawKds.ticketId),
        stations: arr(rawKds.stations).map((s) => ({
          station: str(s.station, "pass"),
          items: strs(s.items),
        })),
        notes: strs(rawKds.notes),
      }
    : null;

  const rawGuest = isObj(input.guestCard) ? input.guestCard : null;
  const guestCard: GuestCardData | null = rawGuest
    ? {
        phone: str(rawGuest.phone),
        name: str(rawGuest.name, "Unknown guest"),
        nameZh: strOrNull(rawGuest.nameZh),
        language: str(rawGuest.language, "en"),
        restrictions: strs(rawGuest.restrictions),
        dislikes: strs(rawGuest.dislikes),
        spice: strOrNull(rawGuest.spice),
        fulfilment: strOrNull(rawGuest.fulfilment),
        cadence: strOrNull(rawGuest.cadence),
        notes: strs(rawGuest.notes),
        orderCount: num(rawGuest.orderCount),
        knownSince: strOrNull(rawGuest.knownSince),
      }
    : null;

  return {
    call,
    transcript: arr(input.transcript).map((t) => ({
      role: oneOf(t.role, ["assistant", "user"] as const, "assistant"),
      text: str(t.text),
      ts: str(t.ts),
    })),
    memory: arr(input.memory).map((m) => ({
      ts: str(m.ts),
      source: str(m.source, "memory"),
      scope: oneOf(m.scope, ["personal", "kitchen", "allergen"] as const, "personal"),
      type: oneOf(m.type, ["fact", "episode", "artifact"] as const, "fact"),
      text: str(m.text),
      isNew: bool(m.isNew),
    })),
    guestCard,
    guardian: arr(input.guardian).map((g) => ({
      ts: str(g.ts),
      sku: str(g.sku),
      nameEn: str(g.nameEn, str(g.sku)),
      nameZh: str(g.nameZh),
      verdict: oneOf(g.verdict, ["allow", "block", "unconfirmed"] as const, "allow"),
      say: str(g.say),
      restricted: strs(g.restricted),
      hazards: arr(g.hazards).map((h) => ({
        allergen: str(h.allergen),
        confirmations: num(h.confirmations),
        lastConfirmed: strOrNull(h.lastConfirmed),
        evidence: strs(h.evidence),
        phrase: str(h.phrase),
      })),
    })),
    secretMenu: arr(input.secretMenu).map((s) => ({
      sku: str(s.sku),
      nameEn: str(s.nameEn, str(s.sku)),
      nameZh: str(s.nameZh),
      phrase: str(s.phrase),
      reason: str(s.reason),
    })),
    order,
    kds,
    receipt: arr(input.receipt).map((r) => ({
      ts: str(r.ts),
      tool: str(r.tool, "tool"),
      args: isObj(r.args) ? r.args : {},
      result: str(r.result),
      surface: str(r.surface),
    })),
    scenarios: arr(input.scenarios)
      .map((s) => ({
        id: str(s.id),
        label: str(s.label, str(s.id)),
        blurb: str(s.blurb),
      }))
      .filter((s) => s.id.length > 0),
    beat: isObj(input.beat)
      ? {
          index: num(input.beat.index),
          total: num(input.beat.total),
          note: strOrNull(input.beat.note),
        }
      : null,
    error: strOrNull(input.error),
  };
}

/* ── formatting ────────────────────────────────────────────────────── */

export function fmtClock(ts: string | null | undefined): string {
  if (!ts) return "--:--:--";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts.slice(0, 8);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function fmtDate(ts: string | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts.slice(0, 10);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function fmtMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function fmtPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const d = phone.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) {
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  return phone;
}

export function titleCase(s: string): string {
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function fmtArgs(args: Record<string, unknown>): string {
  const parts = Object.entries(args).map(([k, v]) => {
    let val: string;
    if (typeof v === "string") val = v;
    else if (typeof v === "number" || typeof v === "boolean") val = String(v);
    else if (Array.isArray(v)) val = `[${v.length}]`;
    else if (v === null || v === undefined) val = "—";
    else val = "{…}";
    return `${k}=${val}`;
  });
  return parts.join("  ");
}
