"use client";

// The screen above the pass.
//
// Read from two metres away, by a cook with wet hands who is not going to
// touch it. So: one column per station, big type, and no interaction at all.
//
// The half most kitchen screens leave out is the refused half. If the front
// desk turned a dish down because a guest cannot eat it, the kitchen has to
// see that as plainly as the dishes it must cook — otherwise someone helpfully
// makes it anyway. That list sits at the bottom, struck through, in red.

import { useMemo } from "react";
import Shell, { useT, useLive } from "../Shell";
import "../theme.css";
import { MENU } from "@/data/restaurant";
import { station, type Lang } from "@/lib/i18n";

export default function Page() {
  return (
    <Shell title="navKitchen" ask="askKitchen">
      <Body />
    </Shell>
  );
}

/* ── the shape /api/state hands back. Every field is treated as if it
      might be missing, because on a fresh boot most of them are. ── */
interface KdsStation {
  station?: string | null;
  items?: string[] | null;
}
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
interface KitchenState {
  kds?: {
    ticketId?: string | null;
    stations?: KdsStation[] | null;
    notes?: string[] | null;
  } | null;
  order?: {
    lines?: OrderLine[] | null;
    status?: string | null;
    pickupMinutes?: number | null;
    totalCents?: number | null;
  } | null;
}

const LOCAL = {
  refused: { en: "Do not cook these", zh: "這些不要做" },
  refusedWhy: { en: "The guest cannot eat them. They were not sent to the kitchen.", zh: "客人不能吃，沒有送進廚房。" },
  dishes: { en: "dishes", zh: "道菜" },
  waiting: { en: "The pass is clear. Nothing is waiting.", zh: "出菜口是空的，沒有等待的菜。" },
} as const;
const L = (k: keyof typeof LOCAL, lang: Lang): string => LOCAL[k][lang];

/* KDS lines arrive as one English string per item ("2× Mapo Tofu (extra
   spicy)"). The order lines carry the Chinese name, so we pair them back up
   and give the cook the name he actually calls it by. */
const ZH_BY_EN = new Map<string, string>(MENU.map((m) => [m.name_en, m.name_zh]));

function zhFor(itemText: string, lines: OrderLine[]): string | null {
  for (const l of lines) {
    const en = (l.nameEn ?? "").trim();
    if (en && itemText.includes(en)) return (l.nameZh ?? ZH_BY_EN.get(en) ?? "").trim() || null;
  }
  for (const [en, zh] of ZH_BY_EN) {
    if (itemText.includes(en)) return zh;
  }
  return null;
}

function Body() {
  const { t, lang } = useT();
  const { data } = useLive<KitchenState>("/api/state?callId=latest", 2000);

  const lines = useMemo<OrderLine[]>(() => {
    const raw = data?.order?.lines;
    return Array.isArray(raw) ? raw.filter((l): l is OrderLine => !!l) : [];
  }, [data]);
  const cooking = lines.filter((l) => !l.blocked);
  const refused = lines.filter((l) => l.blocked === true);

  const stations = useMemo<KdsStation[]>(() => {
    const raw = data?.kds?.stations;
    const list = Array.isArray(raw) ? raw.filter((s): s is KdsStation => !!s) : [];
    return list.filter((s) => (s.items?.length ?? 0) > 0 || (s.station ?? "").length > 0);
  }, [data]);

  const ticketId = (data?.kds?.ticketId ?? "").trim();
  const pickup = data?.order?.pickupMinutes;
  const hasPickup = typeof pickup === "number" && Number.isFinite(pickup);
  const itemCount = stations.reduce((n, s) => n + (s.items?.length ?? 0), 0);
  const nothing = data !== null && stations.length === 0 && refused.length === 0 && !ticketId;

  return (
    <div className="flex flex-col gap-7">
      {/* ── ticket header ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-stretch gap-4">
        <div className="r-card flex min-w-[220px] flex-1 flex-col justify-center gap-1.5 px-6 py-5">
          <span className="eyebrow">{t("ticket")}</span>
          <span className="num text-[34px] font-bold leading-none lg:text-[40px]">
            {ticketId || "—"}
          </span>
        </div>

        <div
          className="r-card flex min-w-[220px] flex-1 flex-col justify-center gap-1.5 px-6 py-5"
          style={hasPickup ? { background: "var(--safe-bg)", borderColor: "var(--safe-line)" } : undefined}
        >
          <span className="eyebrow" style={hasPickup ? { color: "var(--safe-ink)" } : undefined}>
            {t("pickupIn")}
          </span>
          {hasPickup ? (
            <span
              className="flex items-baseline gap-2 text-[34px] font-bold leading-none lg:text-[40px]"
              style={{ color: "var(--safe-ink)" }}
            >
              <span className="num">{pickup}</span>
              <span className="text-[17px] font-semibold">{t("minutes")}</span>
            </span>
          ) : (
            <span className="text-[34px] font-bold leading-none lg:text-[40px]">—</span>
          )}
        </div>

        {itemCount > 0 && (
          <div className="r-sunk flex min-w-[180px] flex-col justify-center gap-1.5 px-6 py-5">
            <span className="eyebrow">
              <span className="live-dot mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ background: "var(--ms-green)" }} />
              {t("liveNow")}
            </span>
            <span className="flex items-baseline gap-2 text-[34px] font-bold leading-none lg:text-[40px]">
              <span className="num">{itemCount}</span>
              <span className="text-[17px] font-semibold" style={{ color: "var(--muted)" }}>
                {L("dishes", lang)}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* ── nothing on ─────────────────────────────────────────── */}
      {nothing && (
        <div
          className="r-card flex flex-col items-center justify-center gap-4 px-6 py-20 text-center"
          style={{ borderStyle: "dashed", borderColor: "var(--line-2)" }}
        >
          <svg
            width="56"
            height="56"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--line-2)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 11h18" />
            <path d="M5 11V7a7 7 0 0 1 14 0v4" />
            <path d="M6 11v10h12V11" />
          </svg>
          <p className="text-[26px] font-bold leading-tight lg:text-[30px]">{t("noTickets")}</p>
          <p className="max-w-[420px] text-[16px] leading-relaxed" style={{ color: "var(--muted)" }}>
            {L("waiting", lang)}
          </p>
        </div>
      )}

      {/* ── the stations ───────────────────────────────────────── */}
      {stations.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stations.map((s, i) => {
            const key = (s.station ?? "").trim();
            const items = Array.isArray(s.items) ? s.items.filter((x) => typeof x === "string" && x.trim()) : [];
            return (
              <section key={key || `station-${i}`} className="r-card flex flex-col overflow-hidden">
                <header
                  className="flex items-baseline justify-between gap-3 border-b px-5 py-4"
                  style={{ borderColor: "var(--line)", background: "var(--sunk)" }}
                >
                  <div className="min-w-0">
                    <p className="eyebrow">{t("station")}</p>
                    <h2 className="mt-1 text-[26px] font-bold leading-none lg:text-[30px]" style={{ letterSpacing: ".03em" }}>
                      {key ? station(key, lang) : "—"}
                    </h2>
                  </div>
                  <span className="chip chip-flat num text-[14px]">{items.length}</span>
                </header>

                {items.length === 0 ? (
                  <p className="px-5 py-8 text-center text-[15px]" style={{ color: "var(--muted)" }}>
                    {L("waiting", lang)}
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {items.map((raw, j) => {
                      const zh = zhFor(raw, cooking);
                      return (
                        <li
                          key={`${raw}-${j}`}
                          className="border-b px-5 py-4 last:border-b-0"
                          style={{ borderColor: "var(--line)" }}
                        >
                          {zh && (
                            <p className="text-[30px] font-bold leading-[1.2] lg:text-[34px]" style={{ letterSpacing: ".03em" }} lang="zh">
                              {zh}
                            </p>
                          )}
                          <p
                            className={zh ? "mt-1 text-[17px] font-semibold" : "text-[24px] font-bold leading-snug lg:text-[27px]"}
                            style={{ color: zh ? "var(--ink-2)" : "var(--ink)" }}
                          >
                            {raw}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* ── what was refused, and must not quietly reappear ─────── */}
      {refused.length > 0 && (
        <section
          className="stripe stripe-stop rounded-[var(--r)] p-5 lg:p-6"
          style={{ background: "var(--stop-bg)", border: "1px solid var(--stop-line)", borderLeftWidth: 6 }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="chip chip-stop text-[15px]">{t("stop")}</span>
            <h2 className="text-[22px] font-bold leading-tight lg:text-[25px]" style={{ color: "var(--stop-ink)" }}>
              {L("refused", lang)}
            </h2>
          </div>
          <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--stop-ink)" }}>
            {L("refusedWhy", lang)}
          </p>

          <ul className="mt-4 flex flex-col gap-3">
            {refused.map((l, i) => {
              const en = (l.nameEn ?? "").trim();
              const zh = (l.nameZh ?? (en ? ZH_BY_EN.get(en) ?? "" : "")).trim();
              const qty = typeof l.qty === "number" && l.qty > 0 ? l.qty : 1;
              const st = (l.station ?? "").trim();
              return (
                <li
                  key={`${l.sku ?? "line"}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[var(--r)] px-4 py-3"
                  style={{ background: "var(--card)", border: "1px solid var(--stop-line)" }}
                >
                  <div className="min-w-0" style={{ textDecoration: "line-through", textDecorationThickness: "2px" }}>
                    <p className="text-[26px] font-bold leading-[1.2] lg:text-[29px]" style={{ letterSpacing: ".03em" }} lang="zh">
                      {zh || en || "—"}
                    </p>
                    {zh && en && (
                      <p className="mt-0.5 text-[16px] font-semibold" style={{ color: "var(--ink-2)" }}>
                        {en}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="chip chip-flat num text-[14px]">×{qty}</span>
                    {st && <span className="chip chip-flat text-[14px]">{station(st, lang)}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── still fetching, nothing to draw yet ─────────────────── */}
      {!data && (
        <p className="text-[15px]" style={{ color: "var(--muted)" }}>
          {t("loading")}
        </p>
      )}
    </div>
  );
}
