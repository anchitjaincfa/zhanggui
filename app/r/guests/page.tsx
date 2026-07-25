"use client";

// REGULARS — "Who are our regulars, and what do they want?"
//
// The customer book an owner never had time to write. Nobody typed any of it;
// it fell out of the phone calls. The two things that must read from across a
// counter are the name and the red "cannot eat" chips — everything else is
// supporting detail.
//
// /api/state only carries whoever is on the phone right now, so the book itself
// comes from the restaurant's own guest list and the live call is used only to
// mark one card as "on a call".

import Shell, { useT, useLive } from "../Shell";
import "../theme.css";
import { allergen, type Key, type Lang } from "@/lib/i18n";
import { GUESTS, MENU, type SeedGuest } from "@/data/restaurant";
import { fmtPhone } from "@/components/types";

/* ── the slice of /api/state this page reads ──────────────────────── */

interface GuestCard {
  phone?: string | null;
  name?: string | null;
  nameZh?: string | null;
}

interface CallInfo {
  status?: string | null;
}

interface GuestsState {
  call?: CallInfo | null;
  guestCard?: GuestCard | null;
}

/* ── reading a guest's facts without asking a machine ─────────────── */

const digits = (p: string | null | undefined) => (p ?? "").replace(/\D/g, "");

/** Words that mean "must not eat", so "no cilantro" never becomes an allergy. */
const CUE = /allerg|anaphyla|intoleran|avoid|cannot eat|can'?t eat|must not eat|free from|sensitiv/i;

const SYNONYMS: Record<string, string[]> = {
  peanut: ["peanut", "peanuts", "groundnut"],
  shellfish: ["shellfish", "crustacean", "crab", "lobster", "scallop"],
  shrimp: ["shrimp", "prawn", "prawns"],
  shrimp_paste: ["shrimp paste"],
  fish_sauce: ["fish sauce"],
  gluten: ["gluten", "wheat", "flour"],
  dairy: ["dairy", "milk", "cream", "butter", "cheese"],
  sesame: ["sesame", "tahini"],
  tree_nut: ["tree nut", "tree nuts", "walnut", "walnuts", "cashew", "almond"],
  egg: ["egg", "eggs"],
  soy: ["soy", "soya", "soybean"],
};

/** shellfish implies shrimp implies shrimp paste — an owner would assume it. */
const IMPLIES: Record<string, string[]> = {
  shellfish: ["shrimp", "shrimp_paste"],
  shrimp: ["shrimp_paste"],
};

const mentions = (text: string, word: string) =>
  new RegExp(`(?:^|[^a-z])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[^a-z]|$)`, "i").test(text);

function cannotEat(facts: string[]): string[] {
  const found = new Set<string>();
  for (const fact of facts) {
    if (!CUE.test(fact)) continue;
    for (const [key, words] of Object.entries(SYNONYMS)) {
      if (words.some((w) => mentions(fact, w))) {
        found.add(key);
        for (const implied of IMPLIES[key] ?? []) found.add(implied);
      }
    }
  }
  return [...found];
}

/** Dishes this guest is on record asking for, matched against the real menu. */
function usualDishes(facts: string[]): { nameEn: string; nameZh: string }[] {
  const out: { nameEn: string; nameZh: string }[] = [];
  for (const item of MENU) {
    const hit = facts.some(
      (f) => f.toLowerCase().includes(item.name_en.toLowerCase()) || f.includes(item.name_zh),
    );
    if (hit) out.push({ nameEn: item.name_en, nameZh: item.name_zh });
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
  const { data } = useLive<GuestsState>("/api/state?callId=latest", 2000);

  const onPhone = digits(data?.guestCard?.phone);
  const callLive = data?.call?.status === "active" || data?.call?.status === "ringing";
  const book: SeedGuest[] = GUESTS ?? [];

  // Somebody is on the phone who is not in the book yet. Say so rather than
  // silently leaving them out.
  const strangerOnPhone =
    onPhone.length > 0 && !book.some((g) => digits(g.phone) === onPhone) ? data?.guestCard ?? null : null;

  if (book.length === 0 && !strangerOnPhone) {
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
      {strangerOnPhone && (
        <article className="r-card stripe stripe-ask p-6 lg:p-7">
          <span className="chip chip-ask">
            <span
              className="live-dot inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: "var(--ms-blue)" }}
              aria-hidden="true"
            />
            {t("onCall")}
          </span>
          <div className="mt-4 text-[26px] font-bold leading-tight">
            {(strangerOnPhone.nameZh ?? strangerOnPhone.name ?? "").trim() || t("newGuest")}
          </div>
          <div className="num mt-1.5 text-[18px] font-semibold" style={{ color: "var(--muted)" }}>
            {fmtPhone(strangerOnPhone.phone)}
          </div>
          <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "var(--muted)" }}>
            {t("learnedFrom")} · {t("fromCalls")}
          </p>
        </article>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {book.map((guest) => (
          <GuestBookCard
            key={guest.phone}
            guest={guest}
            lang={lang}
            t={t}
            onCall={digits(guest.phone) === onPhone && callLive}
          />
        ))}
      </div>
    </div>
  );
}

function GuestBookCard({
  guest,
  lang,
  t,
  onCall,
}: {
  guest: SeedGuest;
  lang: Lang;
  t: (k: Key) => string;
  onCall: boolean;
}) {
  // Allergens and dishes are derived from the English facts because the
  // matchers are English; the Chinese prose is for reading, not parsing.
  const source = guest.facts ?? [];
  const shown = (lang === "zh" ? guest.facts_zh : guest.facts) ?? source;
  const avoid = cannotEat(source);
  const dishes = usualDishes(source);
  const zh = (guest.name_zh ?? "").trim();

  return (
    <article className={`r-card stripe ${onCall ? "stripe-ask" : ""} flex flex-col gap-5 p-6 lg:p-7`}>
      {/* name + phone */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {zh ? (
            <>
              <h2 className="text-[30px] font-bold leading-tight lg:text-[34px]">{zh}</h2>
              <div className="text-[17px]" style={{ color: "var(--ink-2)" }}>
                {guest.name}
              </div>
            </>
          ) : (
            <h2 className="text-[26px] font-bold leading-tight lg:text-[29px]">{guest.name}</h2>
          )}
          <div className="num mt-2 text-[17px] font-semibold" style={{ color: "var(--muted)" }}>
            {fmtPhone(guest.phone)}
          </div>
        </div>

        {onCall && (
          <span className="chip chip-ask">
            <span
              className="live-dot inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: "var(--ms-blue)" }}
              aria-hidden="true"
            />
            {t("onCall")}
          </span>
        )}
      </header>

      {/* cannot eat — the line that stops an ambulance being called */}
      <div>
        <div className="eyebrow">{t("avoids")}</div>
        {avoid.length === 0 ? (
          <p className="mt-2 text-[16px]" style={{ color: "var(--muted)" }}>
            —
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {avoid.map((a) => (
              <span key={a} className="chip chip-stop text-[15px]">
                {allergen(a, lang)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* usually orders */}
      <div>
        <div className="eyebrow">{t("usualOrder")}</div>
        {dishes.length === 0 ? (
          <p className="mt-2 text-[16px]" style={{ color: "var(--muted)" }}>
            —
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {dishes.map((d) => (
              <li key={d.nameEn} className="r-sunk px-4 py-3">
                <div className="text-[22px] font-semibold leading-tight">{d.nameZh}</div>
                <div className="text-[15px]" style={{ color: "var(--muted)" }}>
                  {d.nameEn}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* what we know, and how we know it */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="eyebrow">{t("knownFor")}</div>
          <div className="text-[13px]" style={{ color: "var(--muted)" }}>
            {t("learnedFrom")} · {t("fromCalls")} · <span className="num">{shown.length}</span>
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="mt-2 text-[16px]" style={{ color: "var(--muted)" }}>
            {t("noGuests")}
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {shown.map((f, i) => (
              <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
                <span aria-hidden="true" style={{ color: "var(--muted)" }}>
                  ·
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
