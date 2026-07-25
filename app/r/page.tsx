"use client";

// Today — the screen the owner leaves open on the counter all night.
//
// It answers exactly one question, and it answers it before you read anything:
// is anything wrong right now? A calm green band means no. A red band means a
// dish was stopped and here is which one. Everything else on the page is
// secondary and sits below the fold of attention.

import Link from "next/link";
import Shell, { useT, useLive } from "./Shell";
import { allergen } from "@/lib/i18n";

interface Guardian {
  ts: string; sku: string; nameEn: string; nameZh: string;
  verdict: "allow" | "block" | "unconfirmed"; say: string;
  restricted?: string[];
  hazards?: { allergen?: string; confirmations?: number; lastConfirmed?: string | null; phrase?: string }[];
}
interface State {
  call?: { status?: string; guestName?: string | null; phone?: string | null; durationSec?: number };
  guardian?: Guardian[];
  transcript?: { role: string; text: string }[];
  order?: { lines?: { blocked?: boolean }[] };
  memory?: unknown[];
  guestCard?: { name?: string | null; restrictions?: string[] } | null;
}

export default function TodayPage() {
  return (
    <Shell title="navToday" ask="askToday">
      <Body />
    </Shell>
  );
}

const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function Body() {
  const { t, lang } = useT();
  const { data } = useLive<State>("/api/state?callId=latest", 2000);

  const guardian = data?.guardian ?? [];
  const stops = guardian.filter((g) => g.verdict !== "allow");
  const latestStop = stops[stops.length - 1] ?? null;
  const live = data?.call?.status === "active" || data?.call?.status === "ringing";
  const ordersTaken = (data?.order?.lines ?? []).filter((l) => !l.blocked).length;

  return (
    <div className="flex flex-col gap-6">
      {/* ── the answer, before anything else ─────────────────────── */}
      <section
        className={`r-card stripe ${latestStop ? "stripe-stop" : "stripe-safe"} overflow-hidden`}
      >
        <div className="flex flex-wrap items-start justify-between gap-5 p-6 lg:p-7">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span className={`chip ${latestStop ? "chip-stop" : "chip-safe"}`}>
                {latestStop ? t("needsLook") : t("allGood")}
              </span>
              {live && (
                <span className="chip chip-ask">
                  <span className="live-dot inline-block h-2 w-2 rounded-full" style={{ background: "var(--ms-blue)" }} />
                  {t("onCall")}
                  {typeof data?.call?.durationSec === "number" && (
                    <span className="num ml-1 opacity-70">{mmss(data.call.durationSec)}</span>
                  )}
                </span>
              )}
            </div>

            {latestStop ? (
              <>
                <p className="mt-4 text-[15px] font-semibold" style={{ color: "var(--muted)" }}>
                  {t("weStopped")}
                </p>
                <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[38px] font-bold leading-none lg:text-[46px]">{latestStop.nameZh}</span>
                  <span className="text-[19px] font-medium" style={{ color: "var(--ink-2)" }}>{latestStop.nameEn}</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(latestStop.hazards ?? []).slice(0, 3).map((h, i) => (
                    <span key={i} className="chip chip-stop">{allergen(String(h.allergen ?? ""), lang)}</span>
                  ))}
                </div>
                {latestStop.hazards?.[0]?.phrase && (
                  <div
                    className="mt-5 inline-block rounded-lg border-2 border-dashed px-5 py-3"
                    style={{ borderColor: "var(--stop-line)", background: "var(--stop-bg)" }}
                  >
                    <p className="eyebrow mb-1">{t("sayAtCounter")}</p>
                    <p className="text-[26px] font-semibold leading-tight" style={{ color: "var(--stop-ink)" }}>
                      {latestStop.hazards[0].phrase}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="mt-4 text-[22px] font-semibold leading-snug lg:text-[26px]" style={{ textWrap: "balance" }}>
                  {live ? t("liveNow") : t("quietNow")}
                </p>
                {live && data?.call?.guestName && (
                  <p className="mt-2 text-[17px]" style={{ color: "var(--muted)" }}>
                    {data.call.guestName}
                    {data.call.phone ? ` · ${data.call.phone}` : ""}
                  </p>
                )}
              </>
            )}
          </div>

          {latestStop && (
            <Link
              href="/r/safety"
              className="rounded-lg px-4 py-2.5 text-[15px] font-semibold"
              style={{ background: "var(--ms-amber)", color: "#0a0a0a" }}
            >
              {t("viewAll")} →
            </Link>
          )}
        </div>
      </section>

      {/* ── the four numbers, in plain words ─────────────────────── */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={t("callsToday")} value={data?.call?.status ? 1 : 0} href="/r/calls" />
        <Stat label={t("ordersToday")} value={ordersTaken} href="/r/kitchen" />
        <Stat label={t("stoppedToday")} value={stops.length} href="/r/safety" tone={stops.length ? "stop" : undefined} />
        <Stat label={t("regularsKnown")} value={3} href="/r/guests" />
      </section>

      {/* ── the live conversation, if there is one ───────────────── */}
      <section className="r-card overflow-hidden">
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--line)" }}>
          <h2 className="text-[17px] font-semibold">{live ? t("onCall") : t("noCall")}</h2>
          <Link href="/r/calls" className="text-[14px] font-semibold" style={{ color: "var(--ms-blue)" }}>
            {t("viewAll")} →
          </Link>
        </div>
        <div className="flex flex-col gap-3 p-6">
          {(data?.transcript ?? []).slice(-4).map((l, i) => (
            <div key={i} className="flex flex-col gap-1">
              <span className="eyebrow">{l.role === "user" ? t("guestSaid") : t("weSaid")}</span>
              <p
                className="max-w-[62ch] rounded-lg px-4 py-2.5 text-[16px] leading-relaxed"
                style={{
                  background: l.role === "user" ? "var(--sunk)" : "var(--card)",
                  border: `1px solid var(--line)`,
                }}
              >
                {l.text}
              </p>
            </div>
          ))}
          {!(data?.transcript ?? []).length && (
            <p className="py-6 text-center text-[15px]" style={{ color: "var(--muted)" }}>
              {t("noCalls")}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label, value, href, tone,
}: { label: string; value: number; href: string; tone?: "stop" }) {
  return (
    <Link href={href} className="r-card block p-5 transition hover:shadow-[var(--shadow-lift)]">
      <p className="text-[13px] font-medium leading-snug" style={{ color: "var(--muted)" }}>{label}</p>
      <p
        className="num mt-2 text-[40px] font-bold leading-none"
        style={{ color: tone === "stop" ? "var(--stop-ink)" : "var(--ink)" }}
      >
        {value}
      </p>
    </Link>
  );
}
