"use client";

// CALLS — "Who is on the phone, and what did they say?"
//
// One screen, read top to bottom: is the phone busy, who is it, how long has it
// been, what was said, and what we did about it. Nothing on this page is named
// after the machine that produced it. A tool call is not "order.add_item", it
// is "Added to the order" — and when the same tool refused, it is "Stopped an
// unsafe dish", because that is the thing the owner actually cares about.

import Shell, { useT, useLive } from "../Shell";
import "../theme.css";
import type { Key, Lang } from "@/lib/i18n";
import { fmtClock, fmtDuration, fmtPhone } from "@/components/types";

/* ── the slice of /api/state this page reads ──────────────────────── */

interface CallInfo {
  id?: string | null;
  phone?: string | null;
  guestName?: string | null;
  guestNameZh?: string | null;
  language?: string | null;
  status?: string | null;
  channel?: string | null;
  startedAt?: string | null;
  durationSec?: number | null;
}

interface Turn {
  role?: string | null;
  text?: string | null;
  ts?: string | null;
}

interface ReceiptRow {
  ts?: string | null;
  tool?: string | null;
  result?: string | null;
  surface?: string | null;
}

interface CallsState {
  call?: CallInfo | null;
  transcript?: Turn[] | null;
  receipt?: ReceiptRow[] | null;
}

/* ── plain language for the things we did ─────────────────────────── */

type Phrase = { en: string; zh: string };
const say = (p: Phrase, lang: Lang) => p[lang];

const DID: Record<string, Phrase> = {
  "guest.identify": { en: "Looked up the guest", zh: "查了客人的資料" },
  "menu.lookup": { en: "Checked the menu", zh: "查了菜單" },
  "order.add_item": { en: "Added to the order", zh: "加進訂單" },
  "order.finalize": { en: "Sent to the kitchen", zh: "送去後廚" },
};
const STOPPED: Phrase = { en: "Stopped an unsafe dish", zh: "攔下了不安全的菜" };
const HELD: Phrase = { en: "Waited for the kitchen to confirm", zh: "等廚房確認才敢上" };
const OTHER: Phrase = { en: "Checked something for the guest", zh: "幫客人查了一下" };

type Tone = "stop" | "ask" | "flat";

function describe(r: ReceiptRow, lang: Lang): { label: string; tone: Tone } {
  const tool = r.tool ?? "";
  const result = (r.result ?? "").toUpperCase();
  if (tool === "order.add_item") {
    if (result.startsWith("BLOCKED")) return { label: say(STOPPED, lang), tone: "stop" };
    if (result.startsWith("HELD")) return { label: say(HELD, lang), tone: "ask" };
    return { label: say(DID["order.add_item"], lang), tone: "flat" };
  }
  const known = DID[tool];
  return { label: known ? say(known, lang) : say(OTHER, lang), tone: "flat" };
}

/* ── page ─────────────────────────────────────────────────────────── */

export default function CallsPage() {
  return (
    <Shell title="navCalls" ask="askCalls">
      <Body />
    </Shell>
  );
}

function Body() {
  const { t, lang } = useT();
  const { data } = useLive<CallsState>("/api/state?callId=latest", 2000);

  const call = data?.call ?? null;
  const turns = (data?.transcript ?? []).filter((x) => (x?.text ?? "").trim().length > 0);
  const doings = (data?.receipt ?? []).filter((x) => Boolean(x));

  const status = call?.status ?? "idle";
  const isLive = status === "active" || status === "ringing";
  const statusKey: Key =
    status === "active" ? "onCall" : status === "ringing" ? "ringing" : status === "ended" ? "ended" : "noCall";

  const hasCall = Boolean(call?.id);
  const name = (call?.guestName ?? "").trim();
  const nameZh = (call?.guestNameZh ?? "").trim();

  return (
    <div className="flex flex-col gap-6">
      {/* ── who is on the phone ─────────────────────────────────── */}
      <section className={`r-card stripe ${isLive ? "stripe-ask" : ""} p-6 lg:p-7`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`chip ${isLive ? "chip-ask" : "chip-flat"}`}>
            {isLive && (
              <span
                className="live-dot inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: "var(--ms-blue)" }}
                aria-hidden="true"
              />
            )}
            {t(statusKey)}
          </span>
          {hasCall && (
            <span className="chip chip-flat">
              {t("duration")} <span className="num">{fmtDuration(call?.durationSec ?? 0)}</span>
            </span>
          )}
        </div>

        <div className="mt-5">
          <div className="eyebrow">{t("guestSaid")}</div>
          {nameZh ? (
            <>
              <div className="mt-1.5 text-[30px] font-bold leading-tight lg:text-[34px]">{nameZh}</div>
              {name && name !== nameZh && (
                <div className="text-[17px]" style={{ color: "var(--ink-2)" }}>
                  {name}
                </div>
              )}
            </>
          ) : (
            <div className="mt-1.5 text-[26px] font-bold leading-tight lg:text-[30px]">
              {name || t("newGuest")}
            </div>
          )}
          <div className="num mt-2 text-[18px] font-semibold" style={{ color: "var(--muted)" }}>
            {fmtPhone(call?.phone)}
          </div>
        </div>

        {!hasCall && (
          <p className="mt-5 text-[16px] leading-relaxed" style={{ color: "var(--muted)" }}>
            {t("quietNow")}
          </p>
        )}
      </section>

      {/* ── what was said ───────────────────────────────────────── */}
      <section className="r-card p-6 lg:p-7">
        <h2 className="text-[19px] font-bold">{t("askCalls")}</h2>

        {turns.length === 0 ? (
          <EmptyBlock headline={t(statusKey)} sub={hasCall ? t("askCalls") : t("noCalls")} />
        ) : (
          <ol className="mt-5 flex flex-col gap-4">
            {turns.map((turn, i) => {
              const guest = turn.role === "user";
              return (
                <li key={`${turn.ts ?? "t"}-${i}`} className={`flex ${guest ? "justify-start" : "justify-end"}`}>
                  <div className="w-full max-w-[46rem]">
                    <div className={`flex items-baseline gap-2 ${guest ? "" : "justify-end"}`}>
                      <span className="eyebrow">{guest ? t("guestSaid") : t("weSaid")}</span>
                      <span className="num text-[11px]" style={{ color: "var(--muted)" }}>
                        {fmtClock(turn.ts)}
                      </span>
                    </div>
                    <p
                      className={`mt-1.5 rounded-[10px] px-5 py-4 text-[17px] leading-relaxed lg:text-[18px] ${
                        guest ? "r-sunk" : ""
                      }`}
                      style={
                        guest
                          ? { color: "var(--ink)" }
                          : {
                              background: "var(--card)",
                              border: "1px solid var(--line-2)",
                              color: "var(--ink)",
                              boxShadow: "var(--shadow)",
                            }
                      }
                    >
                      {turn.text}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* ── what we did ─────────────────────────────────────────── */}
      <section className="r-card p-6 lg:p-7">
        <h2 className="text-[19px] font-bold">{t("whatWeDid")}</h2>

        {doings.length === 0 ? (
          <EmptyBlock
            headline={hasCall ? t("allGood") : t("noCalls")}
            sub={hasCall ? t("askCalls") : t("quietNow")}
          />
        ) : (
          <ul className="mt-5 flex flex-col gap-3">
            {doings.map((row, i) => {
              const { label, tone } = describe(row, lang);
              return (
                <li
                  key={`${row.ts ?? "r"}-${i}`}
                  className={`r-sunk stripe ${
                    tone === "stop" ? "stripe-stop" : tone === "ask" ? "stripe-ask" : ""
                  } flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4`}
                >
                  <span className="num text-[13px]" style={{ color: "var(--muted)" }}>
                    {fmtClock(row.ts)}
                  </span>
                  <span className="text-[17px] font-semibold">{label}</span>
                  {tone !== "flat" && (
                    <span className={`chip ${tone === "stop" ? "chip-stop" : "chip-ask"} ml-auto`}>
                      {tone === "stop" ? t("stop") : t("check")}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Empty is a designed state: say what will appear here, and why. */
function EmptyBlock({ headline, sub }: { headline: string; sub: string }) {
  return (
    <div className="r-sunk mt-5 px-6 py-10 text-center">
      <div className="text-[18px] font-semibold">{headline}</div>
      <p className="mx-auto mt-2 max-w-[34rem] text-[15px] leading-relaxed" style={{ color: "var(--muted)" }}>
        {sub}
      </p>
    </div>
  );
}
