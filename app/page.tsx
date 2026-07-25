"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ActionReceipt } from "@/components/ActionReceipt";
import CallButton from "@/components/CallButton";
import { Controls } from "@/components/Controls";
import { GhostCrm } from "@/components/GhostCrm";
import { GuardianOverlay, GuardianPanel } from "@/components/Guardian";
import { GuestCard } from "@/components/GuestCard";
import { Header } from "@/components/Header";
import { LiveCall } from "@/components/LiveCall";
import { KdsPanel, OrderPanel } from "@/components/OrderKds";
import { SecretMenu } from "@/components/SecretMenu";
import {
  EMPTY_STATE,
  normalizeState,
  type GuardianRow,
  type Scenario,
  type ZgState,
} from "@/components/types";

const FAST_MS = 900;
const SLOW_MS = 4000;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

export default function Console() {
  const [state, setState] = useState<ZgState>(EMPTY_STATE);
  const [callId, setCallId] = useState<string>("latest");
  const [epoch, setEpoch] = useState(0);
  const [paused, setPaused] = useState(false);
  const [online, setOnline] = useState(true);
  const [syncedAt, setSyncedAt] = useState<number>(() => Date.now());
  const [now, setNow] = useState<number>(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState<Scenario | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<GuardianRow | null>(null);
  const activeCall = useRef<string | null>(null);
  const [autoplay, setAutoplay] = useState(true);
  // Floor mode strips the demo scaffolding so the console reads as the product
  // a restaurant would actually run, not a pitch. ?mode=floor or the F key.
  const [floor, setFloor] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setFloor(new URLSearchParams(window.location.search).get("mode") === "floor");
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA)$/.test(t.tagName)) return;
      if (e.key === "f" || e.key === "F") setFloor((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const status = state.call?.status ?? "idle";
  const live = status === "active" || status === "ringing";
  const cadence = live ? FAST_MS : SLOW_MS;

  const cadenceRef = useRef<number>(SLOW_MS);
  useEffect(() => {
    cadenceRef.current = cadence;
  }, [cadence]);

  /* ── poll ────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (paused) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = async () => {
      try {
        const res = await fetch(
          `/api/state?callId=${encodeURIComponent(callId)}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const json: unknown = await res.json();
          if (!stopped) {
            setState(normalizeState(json));
            setSyncedAt(Date.now());
            setOnline(true);
          }
        } else if (!stopped) {
          setOnline(false);
        }
      } catch {
        if (!stopped) setOnline(false);
      }
      if (!stopped) timer = setTimeout(run, cadenceRef.current);
    };

    void run();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [callId, epoch, paused]);

  /* ── local second hand, so the timer doesn't stutter between polls ─ */
  useEffect(() => {
    if (status !== "active") return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [status]);

  const seconds =
    (state.call?.durationSec ?? 0) +
    (status === "active" ? Math.max(0, (now - syncedAt) / 1000) : 0);

  /* ── guardian takeover ───────────────────────────────────────────── */
  const hydrated = useRef(false);
  const lastVerdictKey = useRef<string | null>(null);

  useEffect(() => {
    const rows = state.guardian;
    const last = rows.length > 0 ? rows[rows.length - 1] : null;
    if (!last) return;
    const key = `${last.ts}|${last.sku}|${last.verdict}`;
    if (lastVerdictKey.current === key) return;
    const firstSighting = !hydrated.current;
    lastVerdictKey.current = key;
    hydrated.current = true;
    if (!firstSighting && last.verdict !== "allow") setOverlay(last);
  }, [state.guardian]);

  // The beat pump. Scenarios advance on a timer so the demo runs itself;
  // space pauses it, N nudges it forward by hand.
  useEffect(() => {
    if (!autoplay) return;
    const t = setInterval(() => {
      if (activeCall.current) void step();
    }, 2600);
    return () => clearInterval(t);
  }, [autoplay, step]);

  /* ── controls ────────────────────────────────────────────────────── */
  const runScenario = useCallback(async (s: Scenario) => {
    setBusy(true);
    setRunning(s);
    setPaused(false);
    setOverlay(null);
    setNote(`running ${s} …`);
    lastVerdictKey.current = null;
    hydrated.current = true;
    setCallId("latest");
    setEpoch((e) => e + 1);
    try {
      const res = await fetch("/api/sim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenario: s, reset: true }),
      });
      const json: unknown = await res.json().catch(() => null);
      const id =
        isRecord(json) && typeof json.callId === "string" ? json.callId : null;
      if (id) { setCallId(id); activeCall.current = id; }
      setEpoch((e) => e + 1);
      setNote(null);
    } catch {
      setNote("sim unreachable — check /api/sim");
    } finally {
      setBusy(false);
    }
  }, []);

  /** Advance one beat. Returns true while the scenario still has beats left. */
  const step = useCallback(async (): Promise<boolean> => {
    const id = activeCall.current;
    if (!id) return false;
    try {
      const res = await fetch("/api/sim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ callId: id, step: true }),
      });
      const json: unknown = await res.json().catch(() => null);
      setEpoch((e) => e + 1);
      if (isRecord(json) && json.done === true) { activeCall.current = null; return false; }
      return true;
    } catch {
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setPaused(true);
    setState(EMPTY_STATE);
    setCallId("latest");
    setOverlay(null);
    setRunning(null);
    lastVerdictKey.current = null;
    hydrated.current = false;
    setNote("console cleared · press 1 · 2 · 3");
  }, []);

  const seed = useCallback(async () => {
    setBusy(true);
    setNote("seeding memory …");
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const json: unknown = await res.json().catch(() => null);
      const counts = isRecord(json) && isRecord(json.counts) ? json.counts : null;
      const summary = counts
        ? Object.entries(counts)
            .map(([k, v]) => `${k} ${typeof v === "number" ? v : "·"}`)
            .join(" · ")
        : "done";
      setNote(`seeded · ${summary}`.slice(0, 64));
    } catch {
      setNote("seed unreachable — check /api/seed");
    } finally {
      setBusy(false);
    }
  }, []);

  /* ── stage keys ──────────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " ") { e.preventDefault(); setAutoplay((v) => !v); }
      else if (e.key === "n" || e.key === "N") void step();
      else if (e.key === "1") void runScenario("mei");
      else if (e.key === "2") void runScenario("wong");
      else if (e.key === "3") void runScenario("danny");
      else if (e.key === "r" || e.key === "R") reset();
      else if (e.key === "s" || e.key === "S") void seed();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runScenario, reset, seed, step]);

  return (
    <main className="flex min-h-dvh flex-col lg:h-dvh lg:min-h-[700px] lg:overflow-hidden">
      <Header
        call={state.call}
        seconds={seconds}
        online={online || paused}
        cadenceMs={cadence}
        beat={state.beat}
        error={state.error}
      />

      {/* main floor */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 p-2.5 lg:grid-cols-12">
        <LiveCall
          call={state.call}
          transcript={state.transcript}
          className="min-h-[280px] lg:col-span-3 lg:min-h-0"
        />

        <div className="flex min-h-0 flex-col gap-2.5 lg:col-span-5">
          <GuardianPanel
            rows={state.guardian}
            onOpen={() =>
              setOverlay(
                state.guardian.length > 0
                  ? state.guardian[state.guardian.length - 1]
                  : null,
              )
            }
            className="min-h-[260px] lg:min-h-0 lg:flex-[7]"
          />
          <div className="grid min-h-0 grid-cols-1 gap-2.5 sm:grid-cols-2 lg:flex-[4]">
            <OrderPanel order={state.order} className="min-h-[170px] lg:min-h-0" />
            <KdsPanel kds={state.kds} className="min-h-[170px] lg:min-h-0" />
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-2.5 lg:col-span-4">
          <GuestCard
            guest={state.guestCard}
            className="shrink-0 lg:max-h-[50%]"
          />
          <GhostCrm
            memory={state.memory}
            className="min-h-[300px] lg:min-h-0 lg:flex-1"
          />
        </div>
      </div>

      {/* dock */}
      <div className="grid shrink-0 grid-cols-1 gap-2.5 px-2.5 pb-2.5 lg:h-[204px] lg:grid-cols-12">
        <SecretMenu
          items={state.secretMenu}
          className="min-h-[150px] lg:col-span-4 lg:min-h-0"
        />
        <ActionReceipt
          rows={state.receipt}
          className={`min-h-[150px] lg:min-h-0 ${floor ? "lg:col-span-6" : "lg:col-span-3"}`}
        />
        <div className={floor ? "lg:col-span-2" : "lg:col-span-2"}>
          <CallButton />
        </div>
        {!floor && (
          <Controls
            onScenario={(s) => void runScenario(s)}
            onReset={reset}
            onSeed={() => void seed()}
            busy={busy}
            running={running}
            note={note}
            meta={state.scenarios}
            className="min-h-[150px] lg:col-span-3 lg:min-h-0"
          />
        )}
      </div>

      <GuardianOverlay row={overlay} onClose={() => setOverlay(null)} />
    </main>
  );
}
