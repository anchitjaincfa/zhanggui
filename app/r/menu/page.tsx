"use client";

// The menu, as the owner holds it in his head.
//
// Two lists, not one. The English menu is what strangers order from; the
// second list is the food the restaurant is actually known for — the dishes
// a Chinese-speaking regular asks for by name. Most software flattens those
// two into one table and quietly loses the second. Here the second list is
// given the richer card, because it is the more valuable one.
//
// The Chinese name is the headline. English sits underneath it, the way it
// does on the wall. A dish that reads vegetarian but carries shrimp paste is
// flagged in red before anyone has to scroll.

import { useMemo, useState } from "react";
import Shell, { useT } from "../Shell";
import "../theme.css";
import { MENU, type MenuItem } from "@/data/restaurant";
import { allergen, station, type Lang } from "@/lib/i18n";

export default function Page() {
  return (
    <Shell title="navMenu" ask="askMenu">
      <Body />
    </Shell>
  );
}

/* Words this page needs that the shared dictionary does not carry.
   Kept in the owner's vocabulary, never in schema words. */
const CATEGORY: Record<string, { en: string; zh: string }> = {
  all: { en: "Everything", zh: "全部" },
  Poultry: { en: "Chicken & duck", zh: "雞鴨" },
  Seafood: { en: "Fish & seafood", zh: "海鮮" },
  Noodles: { en: "Noodles", zh: "麵食" },
  Vegetable: { en: "Vegetables", zh: "蔬菜" },
  Beef: { en: "Beef", zh: "牛肉" },
  Pork: { en: "Pork", zh: "豬肉" },
  Cold: { en: "Cold dishes", zh: "涼菜" },
  Soup: { en: "Soup", zh: "湯" },
};
const catLabel = (c: string, lang: Lang): string => CATEGORY[c]?.[lang] ?? c;

const LOCAL = {
  heat: { en: "Heat", zh: "辣度" },
  noHeat: { en: "Not spicy", zh: "不辣" },
  emptyGroup: { en: "Nothing in this group", zh: "這個分類沒有菜" },
  emptyOff: { en: "Every dish in this group is on the English menu", zh: "這個分類的菜都在英文菜單上" },
  cooked: { en: "Cooked at", zh: "出菜工位" },
  weekday: { en: "Weekdays only", zh: "只有平日" },
  watch: { en: "The name does not say this", zh: "菜名看不出來" },
  soldCount: { en: "sold out right now", zh: "道菜賣完了" },
} as const;
const L = (k: keyof typeof LOCAL, lang: Lang): string => LOCAL[k][lang];

const money = (cents: number): string => `$${(Math.max(0, cents || 0) / 100).toFixed(2)}`;

function Body() {
  const { t, lang } = useT();
  const [cat, setCat] = useState<string>("all");
  /* Sold-out lives on this screen only. Tapping it changes what the owner
     sees, nothing else — so the button never promises more than it does. */
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  const dishes = useMemo<MenuItem[]>(() => (Array.isArray(MENU) ? MENU : []), []);

  const categories = useMemo<string[]>(() => {
    const seen: string[] = [];
    for (const d of dishes) {
      const c = d.category || "";
      if (c && !seen.includes(c)) seen.push(c);
    }
    return seen;
  }, [dishes]);

  const countIn = (c: string): number =>
    c === "all" ? dishes.length : dishes.filter((d) => d.category === c).length;

  const shown = dishes.filter((d) => cat === "all" || d.category === cat);
  const onMenu = shown.filter((d) => d.english_listed);
  const offMenu = shown.filter((d) => !d.english_listed);

  const isOut = (d: MenuItem): boolean => flipped[d.sku] ?? d.available === false;
  const toggle = (sku: string, now: boolean) =>
    setFlipped((prev) => ({ ...prev, [sku]: !now }));
  const soldOutCount = dishes.filter(isOut).length;

  return (
    <div className="flex flex-col gap-9">
      {/* ── filter ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {["all", ...categories].map((c) => {
            const active = c === cat;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                aria-pressed={active}
                className="flex min-h-[46px] items-center gap-2 rounded-full px-4 py-2 text-[15px] font-semibold transition"
                style={{
                  background: active ? "var(--ms-amber)" : "var(--card)",
                  color: active ? "#0a0a0a" : "var(--ink-2)",
                  border: `1px solid ${active ? "var(--ms-amber)" : "var(--line)"}`,
                  boxShadow: active ? "var(--shadow-lift)" : "var(--shadow)",
                }}
              >
                {catLabel(c, lang)}
                <span
                  className="num text-[13px] font-bold"
                  style={{ color: active ? "#0a0a0a" : "var(--muted)", opacity: active ? 0.7 : 1 }}
                >
                  {countIn(c)}
                </span>
              </button>
            );
          })}
        </div>
        {soldOutCount > 0 && (
          <p className="text-[14px]" style={{ color: "var(--muted)" }}>
            <span className="num font-bold" style={{ color: "var(--stop-ink)" }}>{soldOutCount}</span>{" "}
            {L("soldCount", lang)}
          </p>
        )}
      </div>

      {/* ── the dishes an English reader can find ──────────────── */}
      <section className="flex flex-col gap-4">
        <SectionHead label={t("onMenu")} count={onMenu.length} />
        {onMenu.length === 0 ? (
          <EmptyRow text={L("emptyGroup", lang)} />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {onMenu.map((d) => (
              <Dish key={d.sku} dish={d} out={isOut(d)} onToggle={() => toggle(d.sku, isOut(d))} />
            ))}
          </div>
        )}
      </section>

      {/* ── the dishes that are the reason people come back ────── */}
      <section className="flex flex-col gap-4">
        <SectionHead label={t("offMenu")} count={offMenu.length} accent />
        {offMenu.length === 0 ? (
          <EmptyRow text={L("emptyOff", lang)} />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {offMenu.map((d) => (
              <Dish key={d.sku} dish={d} out={isOut(d)} onToggle={() => toggle(d.sku, isOut(d))} secret />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHead({ label, count, accent }: { label: string; count: number; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {accent && (
        <span
          className="inline-block h-6 w-1.5 rounded-full"
          style={{ background: "var(--ms-amber)" }}
          aria-hidden
        />
      )}
      <h2 className="text-[20px] font-bold leading-tight lg:text-[23px]" style={{ color: "var(--ink)" }}>
        {label}
      </h2>
      <span className="chip chip-flat num">{count}</span>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div
      className="r-sunk flex min-h-[112px] items-center justify-center px-6 py-8 text-center text-[16px]"
      style={{ color: "var(--muted)" }}
    >
      {text}
    </div>
  );
}

function Dish({
  dish,
  out,
  onToggle,
  secret,
}: {
  dish: MenuItem;
  out: boolean;
  onToggle: () => void;
  secret?: boolean;
}) {
  const { t, lang } = useT();
  const allergens = Array.isArray(dish.allergens) ? dish.allergens : [];
  const hidden = (dish.hidden_allergen_note ?? "").trim();
  const phrase = (dish.order_phrase_zh ?? "").trim();
  const spice = typeof dish.base_spice === "number" ? dish.base_spice : 0;

  return (
    <article
      className={`r-card flex flex-col gap-4 p-5 lg:p-6 ${secret ? "stripe" : ""}`}
      style={{
        borderLeftColor: secret ? "var(--ms-amber)" : undefined,
        boxShadow: secret ? "var(--shadow-lift)" : "var(--shadow)",
        opacity: out ? 0.72 : 1,
      }}
    >
      {/* name + price */}
      <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-2">
        <div className="min-w-0">
          {secret && (
            <span
              className="chip mb-2 inline-flex"
              style={{ background: "var(--ms-amber)", borderColor: "var(--ms-amber)", color: "#0a0a0a" }}
            >
              {t("offMenu")}
            </span>
          )}
          <h3
            className="text-[27px] font-bold leading-[1.25] lg:text-[30px]"
            style={{ letterSpacing: ".03em", textDecoration: out ? "line-through" : "none" }}
            lang="zh"
          >
            {dish.name_zh || dish.name_en}
          </h3>
          <p className="mt-1 text-[17px] font-semibold" style={{ color: "var(--ink-2)" }}>
            {dish.name_en}
          </p>
          {dish.pinyin && (
            <p className="mt-0.5 text-[13px] italic" style={{ color: "var(--muted)" }}>
              {dish.pinyin}
            </p>
          )}
        </div>
        <p className="num shrink-0 text-[24px] font-bold leading-none lg:text-[26px]">
          {money(dish.price_cents)}
        </p>
      </div>

      {dish.blurb && (
        <p className="text-[15px] leading-relaxed" style={{ color: "var(--muted)" }}>
          {dish.blurb}
        </p>
      )}

      {/* how a guest asks for it — only the off-menu dishes need this */}
      {secret && phrase && (
        <div className="r-sunk px-4 py-3">
          <p className="eyebrow">{t("howToOrder")}</p>
          <p className="mt-1.5 text-[21px] font-semibold leading-snug lg:text-[23px]" style={{ letterSpacing: ".03em" }} lang="zh">
            「{phrase}」
          </p>
        </div>
      )}

      {/* the ingredient the name hides */}
      {hidden && (
        <div
          className="stripe stripe-stop rounded-[var(--r)] px-4 py-3"
          style={{ background: "var(--stop-bg)", border: "1px solid var(--stop-line)", borderLeftWidth: 5 }}
        >
          <p className="eyebrow" style={{ color: "var(--stop-ink)" }}>
            {L("watch", lang)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="eyebrow" style={{ color: "var(--stop-ink)" }}>{t("contains")}</span>
            {allergens.map((a) => (
              <span key={a} className="chip chip-stop text-[15px]">
                {allergen(a, lang)}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--stop-ink)" }}>
            {hidden}
          </p>
        </div>
      )}

      {/* everything else it contains */}
      {!hidden && allergens.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow">{t("contains")}</span>
          {allergens.map((a) => (
            <span key={a} className="chip chip-flat text-[14px]">
              {allergen(a, lang)}
            </span>
          ))}
        </div>
      )}

      {/* kitchen facts */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]" style={{ color: "var(--muted)" }}>
        <span>
          <span className="eyebrow">{L("cooked", lang)}</span>{" "}
          <span className="text-[14px] font-semibold" style={{ color: "var(--ink-2)" }}>
            {station(dish.station, lang)}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="eyebrow">{L("heat", lang)}</span>
          {spice === 0 ? (
            <span className="text-[14px] font-semibold" style={{ color: "var(--ink-2)" }}>
              {L("noHeat", lang)}
            </span>
          ) : (
            <span className="flex gap-1" aria-label={`${L("heat", lang)} ${spice}/5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: n <= spice ? "var(--ms-red)" : "var(--line-2)" }}
                />
              ))}
            </span>
          )}
        </span>
        {dish.weekday_only && <span className="chip chip-flat text-[13px]">{L("weekday", lang)}</span>}
      </div>

      {/* availability — the one thing on this page an owner changes */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
        <span className={`chip text-[14px] ${out ? "chip-stop" : "chip-safe"}`}>
          {out ? t("soldOut") : t("available")}
        </span>
        <button
          onClick={onToggle}
          aria-pressed={out}
          className="min-h-[48px] rounded-[var(--r)] px-5 text-[15px] font-semibold transition"
          style={{
            background: out ? "var(--ms-amber)" : "var(--sunk)",
            color: out ? "#0a0a0a" : "var(--ink-2)",
            border: `1px solid ${out ? "var(--ms-amber)" : "var(--line-2)"}`,
          }}
        >
          {out ? t("markAvailable") : t("markSoldOut")}
        </button>
      </div>
    </article>
  );
}
