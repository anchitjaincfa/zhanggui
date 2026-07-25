"use client";

// The handset.
//
// B90 has no cell signal and WhatsApp calling needs a verified business
// account, so the phone comes back a different way: open this page on an
// actual phone over the venue wifi and hand it to a judge. They hold a phone,
// they press call, they talk to a restaurant. Meanwhile the projector shows
// the console reacting to the same call in real time.
//
// Deliberately its own route: full-bleed, thumb-sized, nothing to explain.

import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "connecting" | "live" | "error";

const GUESTS = [
  { phone: "+14155550142", label: "Mei Lin", zh: "", hint: "peanut allergy · the block" },
  { phone: "+14155550188", label: "Mrs Wong", zh: "王太太", hint: "11-year regular · 中文" },
  { phone: "+14155550175", label: "Danny Ortiz", zh: "", hint: "shellfish · hidden shrimp" },
  { phone: "", label: "Unknown caller", zh: "", hint: "never called before" },
];

export default function CallPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [who, setWho] = useState(GUESTS[0]);
  const [err, setErr] = useState<string | null>(null);
  const [vol, setVol] = useState(0);
  const [lines, setLines] = useState<{ role: string; text: string }[]>([]);
  const [secs, setSecs] = useState(0);
  const vapiRef = useRef<{ start: (id: string, o?: unknown) => Promise<unknown>; stop: () => void; on: (e: string, cb: (...a: never[]) => void) => void } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const key = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

  useEffect(() => {
    if (status !== "live") return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => { scroller.current?.scrollTo({ top: 1e6, behavior: "smooth" }); }, [lines]);
  useEffect(() => () => { try { vapiRef.current?.stop(); } catch { /* gone */ } }, []);

  const start = useCallback(async () => {
    if (!key || !assistantId) { setErr("Voice keys not configured"); setStatus("error"); return; }
    setErr(null); setLines([]); setSecs(0); setStatus("connecting");
    try {
      const mod = await import("@vapi-ai/web");
      const Vapi = (mod.default ?? mod) as unknown as new (k: string) => NonNullable<typeof vapiRef.current>;
      const vapi = new Vapi(key);
      vapiRef.current = vapi;
      vapi.on("call-start", (() => setStatus("live")) as never);
      vapi.on("call-end", (() => { setStatus("idle"); setVol(0); }) as never);
      vapi.on("volume-level", ((v: number) => setVol(v)) as never);
      vapi.on("error", ((e: unknown) => { setErr(e instanceof Error ? e.message : String(e)); setStatus("error"); }) as never);
      vapi.on("message", ((m: { type?: string; role?: string; transcript?: string; transcriptType?: string }) => {
        if (m?.type === "transcript" && m.transcriptType === "final" && m.transcript) {
          setLines((l) => [...l, { role: m.role === "user" ? "user" : "assistant", text: m.transcript! }]);
        }
      }) as never);
      await vapi.start(assistantId, { variableValues: { callerPhone: who.phone || "unknown" } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e)); setStatus("error");
    }
  }, [key, assistantId, who]);

  const stop = useCallback(() => { try { vapiRef.current?.stop(); } catch { /* gone */ } setStatus("idle"); }, []);

  const live = status === "live";
  const mmss = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-8 pt-8">
      <div className="text-center">
        <p className="text-3xl font-semibold tracking-[0.2em] text-[var(--jade)]">掌櫃</p>
        <p className="mono mt-1 text-[10px] tracking-[0.3em] text-[var(--muted)]">ZHANGGUI · FRONT DESK</p>
        <p className="mt-3 text-xl font-medium">金龍 Golden Dragon</p>
      </div>

      {!live && (
        <>
          <p className="mono mt-7 text-center text-[10px] tracking-widest text-[var(--muted)]">
            WHO IS CALLING
          </p>
          <div className="mt-3 space-y-2">
            {GUESTS.map((g) => (
              <button
                key={g.label}
                onClick={() => setWho(g)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                  who.label === g.label
                    ? "border-[var(--jade)] bg-[var(--jade)]/10"
                    : "border-[var(--line)]"
                }`}
              >
                <span>
                  <span className="block text-[17px] font-medium">
                    {g.zh ? <span className="mr-2">{g.zh}</span> : null}{g.label}
                  </span>
                  <span className="mono block text-[10px] text-[var(--muted)]">{g.hint}</span>
                </span>
                {who.label === g.label && (
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--jade)]" />
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {live && (
        <>
          <div className="mt-6 text-center">
            <p className="mono text-[11px] tracking-widest text-[var(--jade)]">ON CALL · 通話中</p>
            <p className="mono mt-1 text-3xl tabular-nums">{mmss}</p>
          </div>
          <div className="mt-4 flex h-10 items-end justify-center gap-[3px]">
            {Array.from({ length: 28 }).map((_, i) => (
              <span
                key={i}
                className="w-[3px] rounded-sm bg-[var(--jade)] transition-all duration-100"
                style={{ height: `${Math.max(3, Math.min(40, vol * 130 * (0.4 + Math.abs(Math.sin(i * 1.6)))))}px` }}
              />
            ))}
          </div>
          <div ref={scroller} className="mt-5 flex-1 space-y-2 overflow-y-auto">
            {lines.map((l, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-snug ${
                  l.role === "user"
                    ? "ml-auto border border-[var(--line)] bg-transparent"
                    : "bg-[var(--panel)]"
                }`}
              >
                {l.text}
              </div>
            ))}
            {!lines.length && (
              <p className="mono pt-6 text-center text-[11px] text-[var(--muted)]">listening…</p>
            )}
          </div>
        </>
      )}

      <div className="mt-auto pt-7">
        <button
          onClick={live ? stop : start}
          disabled={status === "connecting"}
          className={`flex w-full items-center justify-center gap-3 rounded-full py-5 text-[18px] font-semibold transition active:scale-[0.98] ${
            live ? "bg-[var(--vermilion)] text-white" : "bg-[var(--jade)] text-black"
          } disabled:opacity-60`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               style={live ? { transform: "rotate(135deg)" } : undefined}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z" />
          </svg>
          {live ? "End call" : status === "connecting" ? "Connecting…" : "Call the front desk"}
        </button>

        {err && <p className="mono mt-3 text-center text-[11px] text-[var(--vermilion)]">{err} — allow the microphone and try again.</p>}
        {!err && (
          <p className="mono mt-3 text-center text-[10px] leading-relaxed text-[var(--muted)]">
            over wifi · no mobile signal needed<br />
            the desk identifies the caller from memory before it answers
          </p>
        )}
      </div>
    </main>
  );
}
