"use client";

// Orders — the order itself, not the ticket.
//
// Kitchen answers "what do I cook next". This page answers a different
// question: what did this guest order, what is it going to cost, and where
// has the order got to. One order at a time, because a phone line takes one
// order at a time.
//
// Two rules, both because this is read across a room:
//   1. Nothing here is computed from a field the API does not actually send.
//      The status comes from call.status and whether a KDS ticket exists —
//      there is no "ready" event, so this page never claims one.
//   2. Every field is treated as possibly missing. On a fresh boot they are.

import { useMemo } from "react";
import Shell, { useT, useLive } from "../Shell";
import "../theme.css";
import { station } from "@/lib/i18n";

export default function Page() {
  return (
    <Shell title="navOrders" ask="askOrders">
      <Body />
    </Shell>
  );
}

/* ── the shape /api/state hands back ─────────────────────────────── */
interface OrderLine {
  sku?: string | null;
  nameEn?: string | null;
  nameZh?: string | null;
  qty?: number | null;
  modifiers?: string[] | null;
  blocked?: boolean | null;
  priceCents?: number | null;
  station?: string | null;
}
interface GuardianRow {
  sku?: string | null;
  verdict?: string | null;
  say?: string | null;
}
interface OrdersState {
  call?: {
    status?: string | null;
    guestName?: string | null;
    guestNameZh?: string | null;
    phone?: string | null;
  } | null;
  order?: {
    lines?: OrderLine[] | null;
    status?: string | null;
    pickupMinutes?: number | null;
    totalCents?: number | null;
  } | null;
  kds?: { ticketId?: string | null } | null;
  guardian?: GuardianRow[] | null;
}

const money = (cents: number): string => `$${(cents / 100).toFixed(2)}`;
const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

type Stage = "empty" | "taking" | "kitchen" | "closed";

function Body() {
  const { t, lang } = useT();
  const { data } = useLive<OrdersState>("/api/state?callId=latest", 2000);

  const lines = useMemo<OrderLine[]>(() => {
    const raw = data?.order?.lines;
    return Array.isArray(raw) ? raw.filter((l): l is OrderLine => !!l) : [];
  }, [data]);

  const guardian = useMemo<GuardianRow[]>(() => {
    const raw = data?.guardian;
    return Array.isArray(raw) ? raw.filter((g): g is GuardianRow => !!g) : [];
  }, [data]);

  const going = lines.filter((l) => l.blocked !== true);
  const blocked = lines.filter((l) => l.blocked === true);

  const ticketId = (data?.kds?.ticketId ?? "").trim();
  const callStatus = (data?.call?.status ?? "").trim();
  const onCall = callStatus === "active" || callStatus === "ringing";
  const pickup = data?.order?.pickupMinutes;
  const hasPickup = typeof pickup === "number" && Number.isFinite(pickup);

  // Everything below is derived only from what /api/state really sends:
  // a fired KDS ticket, and the call's own status.
  const stage: Stage =
    ticketId
      ? "kitchen"
      : onCall || going.length > 0 || blocked.length > 0
        ? callStatus === "ended"
          ? "closed"
          : "taking"
        : "empty";

  const totalCents = going.reduce((s, l) => s + num(l.priceCents), 0);
  const dishCount = going.reduce((s, l) => s + Math.max(1, num(l.qty, 1)), 0);

  const guestName = (data?.call?.guestName ?? "").trim();
  const guestPhone = (data?.call?.phone ?? "").trim();

  if (!data) {
    return (
      <p className="text-[15px]" style={{ color: "var(--muted)" }}>
        {t("loading")}
      </p>
    );
  }

  if (stage === "empty") {
    return (
      <div
        className="r-card flex flex-col items-center justify-center gap-4 px-6 py-20 text-center"
        style={{ borderStyle: "dashed", borderColor: "var(--line-2)" }}
      >
        <svg
          width="56" height="56" viewBox="0 0 24 24" fill="none"
          stroke="var(--line-2)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </svg>
        <p className="text-[26px] font-bold leading-tight lg:text-[30px]">{t("noOrder")}</p>
        <p className="max-w-[440px] text-[16px] leading-relaxed" style={{ color: "var(--muted)" }}>
          {t("noOrderWhy")}
        </p>
      </div>
    );
  }

  const chipClass =
    stage === "kitchen" ? "chip-safe" : stage === "taking" ? "chip-ask" : "chip-flat";
  const stripeClass =
    stage === "kitchen" ? "stripe-safe" : stage === "taking" ? "stripe-ask" : "";
  const statusWord =
    stage === "kitchen" ? t("statusInKitchen") : stage === "taking" ? t("statusTaking") : t("ended");
  const statusNote =
    stage === "kitchen" ? t("inKitchenNote") : stage === "taking" ? t("takingNote") : t("closedNote");

  return (
    <div className="flex flex-col gap-6">
      {/* ── where this order has got to ────────────────────────── */}
      <section className={`r-card stripe ${stripeClass} overflow-hidden`}>
        <div className="flex flex-wrap items-start justify-between gap-6 p-6 lg:p-7">
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{t("orderStatus")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className={`chip ${chipClass} text-[16px]`} style={{ padding: "8px 16px" }}>
                {stage === "taking" && (
                  <span
                    className="live-dot inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: "var(--ms-blue)" }}
                  />
                )}
                {statusWord}
              </span>
              {ticketId && <span className="chip chip-flat num text-[15px]">{ticketId}</span>}
            </div>
            <p className="mt-4 text-[22px] font-semibold leading-snug lg:text-[26px]" style={{ textWrap: "balance" }}>
              {statusNote}
            </p>
            {(guestName || guestPhone) && (
              <p className="mt-2 text-[17px]" style={{ color: "var(--muted)" }}>
                {guestName}
                {guestName && guestPhone ? " · " : ""}
                {guestPhone}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            {hasPickup && (
              <div
                className="r-sunk flex min-w-[160px] flex-col justify-center gap-1.5 px-5 py-4"
                style={{ background: "var(--safe-bg)", borderColor: "var(--safe-line)" }}
              >
                <span className="eyebrow" style={{ color: "var(--safe-ink)" }}>{t("pickupIn")}</span>
                <span
                  className="flex items-baseline gap-2 text-[34px] font-bold leading-none lg:text-[40px]"
                  style={{ color: "var(--safe-ink)" }}
                >
                  <span className="num">{pickup}</span>
                  <span className="text-[16px] font-semibold">{t("minutes")}</span>
                </span>
              </div>
            )}
            <div className="r-sunk flex min-w-[180px] flex-col justify-center gap-1.5 px-5 py-4">
              <span className="eyebrow">{t("orderTotal")}</span>
              <span className="num text-[34px] font-bold leading-none lg:text-[40px]">
                {money(totalCents)}
              </span>
              <span className="text-[14px] font-semibold" style={{ color: "var(--muted)" }}>
                <span className="num">{dishCount}</span> {t("dishes")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── the lines that are going to the kitchen ─────────────── */}
      <section className="r-card overflow-hidden">
        <header
          className="flex flex-wrap items-baseline justify-between gap-3 border-b px-6 py-4"
          style={{ borderColor: "var(--line)", background: "var(--sunk)" }}
        >
          <h2 className="text-[19px] font-semibold">{t("whatTheyOrdered")}</h2>
          <span className="chip chip-flat num text-[14px]">{going.length}</span>
        </header>

        {going.length === 0 ? (
          <p className="px-6 py-10 text-center text-[16px]" style={{ color: "var(--muted)" }}>
            {t("nothingOrderedYet")}
          </p>
        ) : (
          <ul className="flex flex-col">
            {going.map((l, i) => {
              const en = (l.nameEn ?? "").trim();
              const zh = (l.nameZh ?? "").trim();
              const qty = Math.max(1, num(l.qty, 1));
              const st = (l.station ?? "").trim();
              const mods = Array.isArray(l.modifiers)
                ? l.modifiers.filter((m): m is string => typeof m === "string" && m.trim().length > 0)
                : [];
              return (
                <li
                  key={`${l.sku ?? "line"}-${i}`}
                  className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b px-6 py-5 last:border-b-0"
                  style={{ borderColor: "var(--line)" }}
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <span
                      className="num shrink-0 rounded-lg px-3 py-1.5 text-[24px] font-bold leading-none lg:text-[28px]"
                      style={{ background: "var(--sunk)", border: "1px solid var(--line)" }}
                    >
                      ×{qty}
                    </span>
                    <div className="min-w-0">
                      <p
                        className="text-[32px] font-bold leading-[1.2] lg:text-[38px]"
                        style={{ letterSpacing: ".03em" }}
                        lang="zh"
                      >
                        {zh || en || "—"}
                      </p>
                      {zh && en && (
                        <p className="mt-1 text-[18px] font-semibold" style={{ color: "var(--ink-2)" }}>
                          {en}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {st && <span className="chip chip-flat text-[14px]">{station(st, lang)}</span>}
                        {mods.map((m, j) => (
                          <span key={`${m}-${j}`} className="chip chip-ask text-[14px]">{m}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="num shrink-0 text-[26px] font-bold leading-none lg:text-[30px]">
                    {money(num(l.priceCents))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {going.length > 0 && (
          <div
            className="flex flex-wrap items-baseline justify-between gap-3 border-t px-6 py-5"
            style={{ borderColor: "var(--line)", background: "var(--sunk)" }}
          >
            <span className="text-[19px] font-semibold">{t("orderTotal")}</span>
            <span className="num text-[30px] font-bold leading-none lg:text-[34px]">
              {money(totalCents)}
            </span>
          </div>
        )}
      </section>

      {/* ── what the allergen gate refused ──────────────────────── */}
      {blocked.length > 0 && (
        <section
          className="stripe stripe-stop rounded-[var(--r)] p-5 lg:p-6"
          style={{ background: "var(--stop-bg)", border: "1px solid var(--stop-line)", borderLeftWidth: 6 }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="chip chip-stop text-[15px]">{t("stop")}</span>
            <h2 className="text-[22px] font-bold leading-tight lg:text-[25px]" style={{ color: "var(--stop-ink)" }}>
              {t("notSent")}
            </h2>
          </div>
          <p className="mt-2 text-[16px] leading-relaxed" style={{ color: "var(--stop-ink)" }}>
            {t("notSentWhy")}
          </p>

          <ul className="mt-4 flex flex-col gap-3">
            {blocked.map((l, i) => {
              const en = (l.nameEn ?? "").trim();
              const zh = (l.nameZh ?? "").trim();
              const qty = Math.max(1, num(l.qty, 1));
              const st = (l.station ?? "").trim();
              const sku = (l.sku ?? "").trim();
              const g = sku ? guardian.find((x) => (x.sku ?? "") === sku) : undefined;
              const held = (g?.verdict ?? "") === "unconfirmed";
              const say = (g?.say ?? "").trim();
              return (
                <li
                  key={`${sku || "blocked"}-${i}`}
                  className="rounded-[var(--r)] px-5 py-4"
                  style={{ background: "var(--card)", border: "1px solid var(--stop-line)" }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
                    <div className="min-w-0" style={{ textDecoration: "line-through", textDecorationThickness: "2px" }}>
                      <p
                        className="text-[30px] font-bold leading-[1.2] lg:text-[34px]"
                        style={{ letterSpacing: ".03em", color: "var(--stop-ink)" }}
                        lang="zh"
                      >
                        {zh || en || "—"}
                      </p>
                      {zh && en && (
                        <p className="mt-0.5 text-[17px] font-semibold" style={{ color: "var(--stop-ink)" }}>
                          {en}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip chip-flat num text-[14px]">×{qty}</span>
                      {st && <span className="chip chip-flat text-[14px]">{station(st, lang)}</span>}
                      <span className="chip chip-stop text-[14px]">{held ? t("check") : t("stop")}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-[16px] font-semibold" style={{ color: "var(--stop-ink)" }}>
                    {t("notSentLine")}
                  </p>
                  {say && (
                    <p className="mt-1 text-[15px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
                      {say}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
