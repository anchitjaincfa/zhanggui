// XTrace Memory API client — plain fetch, no SDK, so it runs anywhere.
//
// Hard-won facts about this API, established by probing the live org:
//   • `namespace` and `limit` are silently ignored on search. Restaurant
//     scoping on READS must go through group_ids; slice results yourself.
//   • An unscoped search 422s. Always pass user_id or group_ids.
//   • search({user_id, group_ids}) is an INTERSECTION. For a union, run two
//     searches in parallel and merge.
//   • Scores run low (best observed 0.396) and 0.0 rows are still returned.
//     Never gate on a score threshold — match deterministically instead.
//   • lesson/procedure rows and POST /v1/memories/trigger are unavailable on
//     this org. Everything is built on facts + episodes.

const BASE = process.env.XTRACE_BASE_URL || "https://api.production.xtrace.ai";
const KEY = process.env.XTRACE_API_KEY || "";

export const KITCHEN_GROUP = process.env.ZG_KITCHEN_GROUP || "";
export const ALLERGEN_GROUP = process.env.ZG_ALLERGEN_GROUP || "";

export type MemoryType = "fact" | "artifact" | "episode";

export interface Memory {
  id: string;
  type: MemoryType | string;
  text: string;
  user_id?: string | null;
  conv_id?: string | null;
  group_ids?: string[];
  categories?: string[];
  score?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  details?: Record<string, unknown>;
}

export interface SearchResult {
  data: Memory[];
  context?: string | null;
}

interface Res<T> { ok: boolean; status: number; body: T }

async function api<T = unknown>(path: string, init?: RequestInit): Promise<Res<T>> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { "x-api-key": KEY, "content-type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = text; }
  return { ok: res.ok, status: res.status, body: body as T };
}

export interface SearchOpts {
  query: string;
  user_id?: string;
  group_ids?: string[];
  mode?: "compose" | "retrieve";
  include?: MemoryType[];
}

/** One scoped vector search. Returns [] rather than throwing — a live phone
 *  call must never dead-air because memory had a bad minute. */
export async function search(opts: SearchOpts): Promise<SearchResult> {
  if (!opts.user_id && !(opts.group_ids && opts.group_ids.length)) return { data: [] };
  const r = await api<SearchResult>("/v1/memories/search", {
    method: "POST",
    body: JSON.stringify({
      query: opts.query,
      ...(opts.user_id ? { user_id: opts.user_id } : {}),
      ...(opts.group_ids?.length ? { group_ids: opts.group_ids } : {}),
      mode: opts.mode ?? "retrieve",
      ...(opts.include ? { include: opts.include } : {}),
    }),
  });
  if (!r.ok) return { data: [] };
  return { data: r.body?.data ?? [], context: r.body?.context ?? null };
}

/** Union across scopes — the thing AND-scoping cannot express in one call. */
export async function searchMany(query: string, scopes: Omit<SearchOpts, "query">[]): Promise<Memory[]> {
  const runs = await Promise.all(scopes.map((s) => search({ ...s, query })));
  const seen = new Set<string>();
  const out: Memory[] = [];
  for (const r of runs) {
    for (const m of r.data) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      out.push(m);
    }
  }
  return out.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

export interface IngestOpts {
  messages: { role: string; content: string }[];
  user_id: string;
  conv_id: string;
  group_ids?: string[];
  agent_id?: string;
  namespace?: string;
  agentic?: boolean;
  outcome?: "resolved" | "failed";
  extract_artifacts?: boolean;
  wait?: boolean;
}

export interface IngestJob {
  id?: string;
  job_id?: string;
  status?: string;
  result?: { memories_created?: { id: string; type: string; text: string }[] };
  error?: unknown;
}

export async function ingest(o: IngestOpts): Promise<IngestJob | null> {
  const { wait, ...rest } = o;
  const r = await api<IngestJob>(`/v1/memories${wait ? "?wait=true" : ""}`, {
    method: "POST",
    body: JSON.stringify({ extract_artifacts: false, ...rest }),
  });
  if (!r.ok && r.status !== 202) return null;
  return r.body;
}

export async function pollJob(jobId: string, timeoutMs = 40000): Promise<IngestJob | null> {
  const deadline = Date.now() + timeoutMs;
  let delay = 700;
  while (Date.now() < deadline) {
    const r = await api<IngestJob>(`/v1/memories/jobs/${jobId}`);
    const s = r.body?.status;
    if (s === "succeeded" || s === "failed") return r.body;
    await new Promise((res) => setTimeout(res, delay));
    delay = Math.min(delay * 1.5, 4000);
  }
  return null;
}

/** Fire-and-forget write. Memory that arrives a few seconds late is fine;
 *  a caller left listening to silence is not. */
export function ingestDetached(o: IngestOpts): void {
  void ingest({ ...o, wait: false }).catch(() => {});
}

export async function listGroups(): Promise<{ id: string; name: string }[]> {
  const r = await api<{ data?: { id: string; name: string }[] }>("/v1/groups");
  return r.body?.data ?? [];
}

export async function createGroup(name: string, prompt?: string): Promise<string | null> {
  const r = await api<{ id?: string }>("/v1/groups", {
    method: "POST",
    body: JSON.stringify(prompt ? { name, prompt } : { name }),
  });
  return r.body?.id ?? null;
}

export const configured = () => Boolean(KEY);
