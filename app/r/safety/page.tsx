"use client";

// SAFETY — "What did we stop someone from eating?"
//
// Newest first, because the thing that just happened is the thing an owner
// wants. Each card has to survive being read from three metres away in a loud
// kitchen, so it carries a coloured left stripe AND a word — never colour on
// its own.
//
// The bordered box at the bottom of a card is the point of the whole product:
// the exact sentence, in Chinese, that a guest can say at the counter. It is
// the only thing on this page that is bigger than the dish name, and it is
// deliberately the last thing you read.

import Shell, { useT, useLive } from "../Shell";
import "../theme.css";
import { allergen, type Key, type Lang } from "@/lib/i18n";
import { fmtDate } from "@/components/types";

/* ── the slice of /api/state this page reads ──────────────────────── */

interface Hazard {
  allergen?: string | null;
  confirmations?: number | null;
  lastConfirmed?: string | null;
  evidence?: string[] | null;
  phrase?: string | null;
}

interface GuardianRow {
  ts?: string | null;
  sku?: string | null;
  nameEn?: string | null;
  nameZh?: string | null;
  verdict?: string | null;
  say?: string | null;
  restricted?: string[] | null;
  hazards?: Hazard[] | null;
}

interface SafetyState {
  guardian?: GuardianRow[] | null;
}

type Tone = "stop" | "ask" | "safe";

const toneOf = (verdict: string | null | undefined): Tone =>
  verdict === "block" ? "stop" : verdict === "unconfirmed" ? "ask" : "safe";

const TONE_WORD: Record<Tone, Key> = { stop: "stop", ask: "check", safe: "safe" };

/* ── page ─────────────────────────────────────────────────────────── */

export default function SafetyPage() {
  return (
    <Shell title="navSafety" ask="askSafety">
      <Body />
    </Shell>
  );
}

function Body() {
  const { t, lang } = useT();
  const { data } = useLive<SafetyState>("/api/state?callId=latest", 2000);

  const rows = (data?.guardian ?? []).filter((r): r is GuardianRow => Boolean(r));
  const newestFirst = [...rows].reverse();

  if (newestFirst.length === 0) {
    return (
      <div className="r-card stripe stripe-safe px-6 py-14 text-center">
        <span className="chip chip-safe">{t("allGood")}</span>
        <div className="mt-4 text-[22px] font-semibold">{t("noStops")}</div>
        <p className="mx-auto mt-3 max-w-[38rem] text-[16px] leading-relaxed" style={{ color: "var(--muted)" }}>
          {t("quietNow")}
        </p>
      </div>
    );
  }

  const stopped = newestFirst.filter((r) => toneOf(r.verdict) === "stop").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`chip ${stopped > 0 ? "chip-stop" : "chip-safe"}`}>
          {t("weStopped")} <span className="num">{stopped}</span>
        </span>
        <span className="chip chip-flat">
          {t("navSafety")} <span className="num">{newestFirst.length}</span>
        </span>
      </div>

      <div className="flex flex-col gap-6">
        {newestFirst.map((row, i) => (
          <SafetyCard key={`${row.ts ?? "g"}-${row.sku ?? i}-${i}`} row={row} lang={lang} t={t} />
        ))}
      </div>
    </div>
  );
}

function SafetyCard({
  row,
  lang,
  t,
}: {
  row: GuardianRow;
  lang: Lang;
  t: (k: Key) => string;
}) {
  const tone = toneOf(row.verdict);
  const hazards = (row.hazards ?? []).filter((h): h is Hazard => Boolean(h));
  const top = hazards[0] ?? null;

  const restricted = (row.restricted ?? []).filter((a) => typeof a === "string" && a.length > 0);
  const names = [top?.allergen, ...restricted].filter(
    (a): a is string => typeof a === "string" && a.length > 0,
  );
  const shownAllergens = [...new Set(names)].slice(0, 4);

  const confirmations = typeof top?.confirmations === "number" ? top.confirmations : 0;
  const lastConfirmed = top?.lastConfirmed ?? null;
  const phrase = (top?.phrase ?? "").trim();

  const nameZh = (row.nameZh ?? "").trim();
  const nameEn = (row.nameEn ?? "").trim() || (row.sku ?? "").replace(/_/g, " ");

  return (
    <article className={`r-card stripe stripe-${tone} p-6 lg:p-8`}>
      {/* dish + word */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {nameZh ? (
            <>
              <h2 className="text-[32px] font-bold leading-tight lg:text-[38px]">{nameZh}</h2>
              <div className="mt-1 text-[17px]" style={{ color: "var(--ink-2)" }}>
                {nameEn}
              </div>
            </>
          ) : (
            <h2 className="text-[28px] font-bold leading-tight lg:text-[32px]">{nameEn || "—"}</h2>
          )}
        </div>
        <span className={`chip chip-${tone} shrink-0 text-[15px]`} style={{ padding: "8px 14px" }}>
          {t(TONE_WORD[tone])}
        </span>
      </header>

      {/* why */}
      {shownAllergens.length > 0 && (
        <div className="mt-6">
          <div className="eyebrow">{t("becauseOf")}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {shownAllergens.map((a) => (
              <span
                key={a}
                className={`chip ${tone === "safe" ? "chip-safe" : tone === "ask" ? "chip-ask" : "chip-stop"} text-[16px]`}
                style={{ padding: "7px 13px" }}
              >
                {allergen(a, lang)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* the evidence — a date and a count, not an opinion */}
      {(lastConfirmed || confirmations > 0) && (
        <p className="mt-5 text-[16px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {lastConfirmed && (
            <>
              {t("confirmedOn")} <span className="num font-semibold">{fmtDate(lastConfirmed)}</span>
            </>
          )}
          {lastConfirmed && confirmations > 0 && " · "}
          {confirmations > 0 && (
            <>
              <span className="num font-semibold">{confirmations}</span> {t("timesChecked")}
            </>
          )}
        </p>
      )}

      {/* the sentence a guest can actually say at the counter */}
      {phrase && (
        <div
          className="mt-6 rounded-[10px] px-6 py-7"
          style={{ background: "var(--sunk)", border: "2px solid var(--line-2)" }}
        >
          <div className="eyebrow">{t("sayAtCounter")}</div>
          <p className="mt-3 text-[28px] font-bold leading-snug lg:text-[34px]" style={{ color: "var(--ink)" }}>
            {phrase}
          </p>
        </div>
      )}
    </article>
  );
}
