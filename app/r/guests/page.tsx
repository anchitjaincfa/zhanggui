"use client";

// REGULARS — "Who are our regulars, and what do they want?"
//
// The customer book an owner never had time to write. Nobody typed any of it;
// it fell out of the phone calls. Every card carries the whole of what we know
// about one person, in the order an owner would want it: who they are, what
// they cannot eat, what they always order, and then the small things.
//
// The two things that must read from across a counter are the name and the red
// "cannot eat" chips. A guest with a restriction gets a red stripe down the
// left of the card, so the dangerous ones are countable at a glance without
// reading a single word.
//
// The book is a static list, so nothing here can fail to load.

import Shell, { useT } from "../Shell";
import "../theme.css";
import { allergen, type Key, type Lang } from "@/lib/i18n";
import { PROFILES, type Profile } from "@/data/guests";
import { bySku } from "@/data/restaurant";
import { fmtPhone } from "@/components/types";

/* ── dates, written the way a person says them ────────────────────── */

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "1993-06-17" → "17 Jun 1993" / "1993年6月17日". Never parsed as a Date:
 *  a bare ISO day parses as UTC midnight and would show the day before here. */
function fmtDay(iso: string, lang: Lang): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return iso || "—";
  const year = m[1] ?? "";
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (lang === "zh") return `${year}年${month}月${day}日`;
  return `${day} ${MONTHS_EN[month - 1] ?? m[2]} ${year}`;
}

/* ── heat, as a word plus a shape ─────────────────────────────────── */

const SPICE_KEYS: Key[] = ["spice0", "spice1", "spice2", "spice3", "spice4", "spice5"];
const spiceKey = (n: number): Key =>
  SPICE_KEYS[Math.min(5, Math.max(0, Math.round(Number(n) || 0)))] ?? "spice0";

/* ── skus are never shown to a person; they become dish names ─────── */

interface Dish { nameEn: string; nameZh: string }

function dishes(usual: string[] | undefined): Dish[] {
  const out: Dish[] = [];
  for (const sku of usual ?? []) {
    const item = bySku(sku);
    if (item) out.push({ nameEn: item.name_en, nameZh: item.name_zh });
  }
  return out;
}

/* ── page ─────────────────────────────────────────────────────────── */

export default function GuestsPage() {
  return (
    <Shell title="navGuests" ask="askGuests">
      <Body />
    </Shell>
  );
}

function Body() {
  const { t, lang } = useT();

  const book: Profile[] = PROFILES ?? [];
  const withAvoids = book.filter((g) => (g.restrictions ?? []).length > 0).length;

  if (book.length === 0) {
    return (
      <div className="r-card px-6 py-14 text-center">
        <div className="text-[20px] font-semibold">{t("noGuests")}</div>
        <p className="mx-auto mt-3 max-w-[36rem] text-[16px] leading-relaxed" style={{ color: "var(--muted)" }}>
          {t("learnedFrom")} · {t("fromCalls")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── how many people are in the book ───────────────────────── */}
      <section className="r-card flex flex-wrap items-end gap-x-12 gap-y-5 p-6 lg:p-7">
        <div>
          <p className="eyebrow">{t("inTheBook")}</p>
          <p className="num mt-2 text-[44px] font-bold leading-none">{book.length}</p>
        </div>
        <div>
          <p className="eyebrow">{t("withAvoids")}</p>
          <p className="num mt-2 text-[44px] font-bold leading-none" style={{ color: "var(--stop-ink)" }}>
            {withAvoids}
          </p>
        </div>
        <p className="ml-auto text-[14px]" style={{ color: "var(--muted)" }}>
          {t("learnedFrom")} · {t("fromCalls")}
        </p>
      </section>

      {/* ── the book itself ───────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        {book.map((guest) => (
          <GuestCard key={guest.id} guest={guest} lang={lang} t={t} />
        ))}
      </div>
    </div>
  );
}

function GuestCard({
  guest,
  lang,
  t,
}: {
  guest: Profile;
  lang: Lang;
  t: (k: Key) => string;
}) {
  const avoid = guest.restrictions ?? [];
  const usual = dishes(guest.usual);
  const notes = guest.notes ?? [];
  const zh = (guest.name_zh ?? "").trim();

  return (
    <article
      className={`r-card stripe ${avoid.length ? "stripe-stop" : ""} flex flex-col gap-5 p-5 lg:p-6`}
    >
      {/* ── who ────────────────────────────────────────────────── */}
      <header>
        {zh ? (
          <>
            <h2 className="text-[27px] font-bold leading-tight">{zh}</h2>
            <div className="text-[16px]" style={{ color: "var(--ink-2)" }}>{guest.name}</div>
          </>
        ) : (
          <h2 className="text-[24px] font-bold leading-tight">{guest.name}</h2>
        )}
        <div className="num mt-2 text-[16px] font-semibold" style={{ color: "var(--muted)" }}>
          {fmtPhone(guest.phone)}
        </div>
      </header>

      {/* ── cannot eat — the line that stops an ambulance ───────── */}
      <div>
        <div className="eyebrow">{t("avoids")}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {avoid.length === 0 ? (
            <span className="chip chip-flat">{t("nothingToAvoid")}</span>
          ) : (
            avoid.map((a) => (
              <span key={a} className="chip chip-stop text-[15px]">{allergen(a, lang)}</span>
            ))
          )}
        </div>
      </div>

      {/* ── the small facts, in one block ──────────────────────── */}
      <div className="r-sunk grid grid-cols-2 gap-x-5 gap-y-4 px-4 py-4">
        <Fact label={t("birthday")}>
          <span className="num">{fmtDay(guest.birthday, lang)}</span>
        </Fact>
        <Fact label={t("speaks")}>{guest.language === "zh" ? t("langZh") : t("langEn")}</Fact>
        <Fact label={t("heat")}>
          <span className="flex items-center gap-2">
            {t(spiceKey(guest.spice))}
            <Pips level={guest.spice} />
          </span>
        </Fact>
        <Fact label={t("takesIt")}>{guest.fulfilment === "delivery" ? t("delivery") : t("pickup")}</Fact>
        <Fact label={t("visits")}>
          <span className="num">{guest.visits}</span>
        </Fact>
        <Fact label={t("orderingSince")}>
          <span className="num">{fmtDay(guest.since, lang)}</span>
        </Fact>
      </div>

      {/* ── what they always order ─────────────────────────────── */}
      <div>
        <div className="eyebrow">{t("usualOrder")}</div>
        {usual.length === 0 ? (
          <p className="mt-2 text-[16px]" style={{ color: "var(--muted)" }}>—</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {usual.map((d) => (
              <li key={d.nameEn} className="r-sunk px-4 py-2.5">
                <div className="text-[19px] font-semibold leading-tight">{d.nameZh}</div>
                <div className="text-[14px]" style={{ color: "var(--muted)" }}>{d.nameEn}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── when they call ─────────────────────────────────────── */}
      <div>
        <div className="eyebrow">{t("whenTheyOrder")}</div>
        <p className="mt-1.5 text-[15px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
          {guest.cadence || "—"}
        </p>
      </div>

      {/* ── everything else we picked up on the phone ──────────── */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="eyebrow">{t("knownFor")}</div>
          <div className="num text-[13px]" style={{ color: "var(--muted)" }}>{notes.length}</div>
        </div>
        {notes.length === 0 ? (
          <p className="mt-2 text-[15px]" style={{ color: "var(--muted)" }}>—</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {notes.map((n, i) => (
              <li
                key={i}
                className="flex gap-2.5 text-[15px] leading-relaxed"
                style={{ color: "var(--ink-2)" }}
              >
                <span aria-hidden="true" style={{ color: "var(--muted)" }}>·</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="eyebrow">{label}</div>
      <div className="mt-1 text-[15px] font-semibold leading-snug">{children}</div>
    </div>
  );
}

/** Heat as a shape as well as a word — colour is never the only signal. */
function Pips({ level }: { level: number }) {
  const n = Math.min(5, Math.max(0, Math.round(Number(level) || 0)));
  return (
    <span className="inline-flex gap-1" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="inline-block h-1.5 w-3 rounded-full"
          style={{ background: i < n ? "var(--ink-2)" : "var(--line-2)" }}
        />
      ))}
    </span>
  );
}
