"use client";

// The phone, without the phone.
//
// Room B90 is a basement with no cell signal, so "a judge dials a real number"
// was never going to work. This is better anyway: the call runs over wifi
// through the laptop, so the room hears the voice AND watches Ghost CRM and
// Guardian move in the same frame, on the same screen. Nothing to dial,
// nothing to carry, no carrier in the loop.

import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "connecting" | "live" | "ending" | "error";

interface Line { role: "assistant" | "user"; text: string }

const GUESTS = [
  { phone: "+14155550142", label: "Mei Lin", hint: "peanut · the block" },
  { phone: "+14155550188", label: "王太太", hint: "the regular · 中文" },
  { phone: "+14155550175", label: "Danny", hint: "hidden shrimp" },
  { phone: "", label: "Unknown", hint: "new caller" },
];

export default function CallButton({ onLine }: { onLine?: (l: Line) => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [who, setWho] = useState(GUESTS[0]);
  const [err, setErr] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const vapiRef = useRef<{ start: (id: string, o?: unknown) => Promise<unknown>; stop: () => void; on: (e: string, cb: (...a: never[]) => void) => void } | null>(null);

  const key = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

  useEffect(() => () => { try { vapiRef.current?.stop(); } catch { /* already gone */ } }, []);

  const start = useCallback(async () => {
    if (!key || !assistantId) { setErr("Vapi keys not configured"); setStatus("error"); return; }
    setErr(null);
    setStatus("connecting");
    try {
      const mod = await import("@vapi-ai/web");
      const Vapi = (mod.default ?? mod) as unknown as new (k: string) => NonNullable<typeof vapiRef.current>;
      const vapi = new Vapi(key);
      vapiRef.current = vapi;

      vapi.on("call-start", (() => setStatus("live")) as never);
      vapi.on("call-end", (() => { setStatus("idle"); setVolume(0); }) as never);
      vapi.on("volume-level", ((v: number) => setVolume(v)) as never);
      vapi.on("error", ((e: unknown) => {
        setErr(e instanceof Error ? e.message : String(e));
        setStatus("error");
      }) as never);
      vapi.on("message", ((m: { type?: string; role?: string; transcript?: string; transcriptType?: string }) => {
        if (m?.type === "transcript" && m.transcriptType === "final" && m.transcript) {
          onLine?.({ role: m.role === "user" ? "user" : "assistant", text: m.transcript });
        }
      }) as never);

      // Hand the agent the caller's identity the way a phone network would.
      await vapi.start(assistantId, {
        variableValues: { callerPhone: who.phone || "unknown" },
        firstMessage: who.phone
          ? undefined
          : "Golden Dragon, this is the front desk. Pickup or delivery?",
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, [key, assistantId, who, onLine]);

  const stop = useCallback(() => {
    setStatus("ending");
    try { vapiRef.current?.stop(); } catch { /* ignore */ }
    setTimeout(() => setStatus("idle"), 400);
  }, []);

  const live = status === "live";

  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="mono text-[11px] tracking-widest text-[var(--muted)]">
          CALL THE FRONT DESK <span className="text-[var(--jade)]">致電</span>
        </span>
        <span className="mono text-[10px] text-[var(--muted)]">over wifi · no signal needed</span>
      </div>

      <div className="mb-3 grid grid-cols-4 gap-1.5">
        {GUESTS.map((g) => (
          <button
            key={g.label}
            disabled={live || status === "connecting"}
            onClick={() => setWho(g)}
            className={`rounded border px-2 py-1.5 text-left transition ${
              who.label === g.label
                ? "border-[var(--jade)] bg-[var(--jade)]/10"
                : "border-[var(--line)] hover:border-[var(--muted)]"
            } disabled:opacity-40`}
          >
            <div className="text-[13px] font-medium leading-tight">{g.label}</div>
            <div className="mono text-[9px] leading-tight text-[var(--muted)]">{g.hint}</div>
          </button>
        ))}
      </div>

      <button
        onClick={live ? stop : start}
        disabled={status === "connecting" || status === "ending"}
        className={`flex w-full items-center justify-center gap-3 rounded-md px-4 py-3 text-[15px] font-semibold transition ${
          live
            ? "bg-[var(--vermilion)] text-white"
            : "bg-[var(--jade)] text-black hover:brightness-110"
        } disabled:opacity-60`}
      >
        {live ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            End call
          </>
        ) : status === "connecting" ? (
          "Connecting…"
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z" />
            </svg>
            Call as {who.label}
          </>
        )}
      </button>

      {live && (
        <div className="mt-3 flex h-6 items-end justify-center gap-[3px]">
          {Array.from({ length: 24 }).map((_, i) => {
            const h = Math.max(3, Math.min(24, volume * 90 * (0.45 + Math.abs(Math.sin(i * 1.7)))));
            return <span key={i} className="w-[3px] rounded-sm bg-[var(--jade)] transition-all duration-100" style={{ height: `${h}px` }} />;
          })}
        </div>
      )}

      {err && (
        <p className="mono mt-2 text-[11px] leading-snug text-[var(--vermilion)]">
          {err}. Allow the microphone, then try again.
        </p>
      )}
      {!live && !err && (
        <p className="mono mt-2 text-[10px] leading-snug text-[var(--muted)]">
          Pick a caller, hit call, and talk. The agent identifies them from memory
          before it answers.
        </p>
      )}
    </div>
  );
}
