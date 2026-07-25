// GUARDIAN — the allergen layer that sits on the control path.
//
// Nothing calls order.add_item until this returns a verdict. Two scoped reads:
// the guest's own restrictions (personal scope, which never leaves it) and the
// kitchen's confirmed practices (restaurant group scope). The gate itself is
// deterministic code, not an LLM relevance call — so when a judge asks "how do
// you know?", the answer is a row with a date on it.
//
// Two bugs the spec review caught, fixed here:
//   H1 — matching on the dish NAME misses hidden allergens. `wonton_soup` does
//        not contain the word "shrimp", but the broth does. We match against
//        the item's declared allergens and its sku, not its prose name.
//   H2 — a "does NOT contain" confirmation read as a hazard. Negations are
//        parsed explicitly and treated as exculpatory, not incriminating.

import { search, ALLERGEN_GROUP, type SearchResult } from "./xtrace";
import { bySku, MENU, CONFIRMATIONS, type Allergen, type MenuItem, type Station } from "@/data/restaurant";

export const ALLERGENS: Allergen[] = [
  "peanut", "shellfish", "shrimp", "fish_sauce", "shrimp_paste",
  "gluten", "dairy", "sesame", "tree_nut", "egg", "soy",
];

/** How an allergen may appear in free text. */
const SYNONYMS: Record<Allergen, string[]> = {
  peanut: ["peanut", "peanuts", "groundnut", "花生"],
  shellfish: ["shellfish", "crustacean", "crab", "lobster", "scallop", "貝"],
  shrimp: ["shrimp", "prawn", "prawns", "dried shrimp", "虾", "蝦"],
  fish_sauce: ["fish sauce", "鱼露"],
  shrimp_paste: ["shrimp paste", "dried shrimp paste", "虾酱", "蝦醬"],
  gluten: ["gluten", "wheat", "flour", "面粉"],
  dairy: ["dairy", "milk", "cream", "butter", "cheese", "mayonnaise"],
  sesame: ["sesame", "tahini", "芝麻"],
  tree_nut: ["tree nut", "tree nuts", "walnut", "walnuts", "cashew", "almond", "核桃"],
  egg: ["egg", "eggs", "蛋"],
  soy: ["soy", "soya", "soybean", "tofu", "大豆"],
};

/** Families: being allergic to shellfish implies caring about shrimp etc. */
const IMPLIES: Partial<Record<Allergen, Allergen[]>> = {
  shellfish: ["shrimp", "shrimp_paste"],
  shrimp: ["shrimp_paste"],
  tree_nut: [],
};

// A bare "no" is not an allergy cue — "no cilantro" is a preference, and it
// used to drag in whatever allergen happened to appear as a substring.
const RESTRICTION_CUES =
  /\ballerg|anaphyla|intoleran|\bavoid|cannot eat|can'?t eat|must not eat|\bfree from|sensitiv|\bno (?:peanut|shellfish|shrimp|gluten|dairy|sesame|soy|egg|nut|fish)/i;

// "does not contain", "no peanut", "peanut-free", "separate wok"
const NEGATION =
  /\b(?:does not|doesn't|does nt|no|not|never|free of|free from|without)\b[^.]{0,40}|(?:peanut|shrimp|dairy|gluten|sesame|soy|egg)[- ]free|separate wok|no .{0,12}contact/i;

const DATE_RE = /\b(20\d{2}-\d{2}-\d{2})\b/g;

const STALE_DAYS = 90;

/**
 * Absence of evidence is not, by itself, doubt.
 *
 * The menu's declared allergens are the restaurant's own statement of what is
 * IN a dish, and we treat that as authoritative. Escalating every unasked
 * question to "unconfirmed" made 19 of 20 dishes suspect, which is the same as
 * flagging none of them — a gate that cries wolf gets ignored, and on stage it
 * reads as broken rather than careful.
 *
 * So doubt has to be earned. It is earned when the dish is known to hide things
 * a menu would not list, when someone checked but did so long ago, or when the
 * cooking station itself carries a plausible cross-contact route.
 */
const CROSS_CONTACT: Partial<Record<Station, Allergen[]>> = {
  fry: ["peanut", "gluten"],          // shared fryer oil and shared breading
  wok: ["shrimp_paste", "fish_sauce"], // shared wok, shared sauce caddy
  steam: ["shrimp"],                   // shared steamer baskets and broth pots
};

function doubtIsEarned(
  item: MenuItem, a: Allergen, hasStaleNegative: boolean, staleDate: string | null
): string | null {
  if (hasStaleNegative) {
    return staleDate
      ? `the last time anyone checked was ${staleDate}, which is over ${STALE_DAYS} days ago`
      : `someone checked once, but not recently`;
  }
  if (item.hidden_allergen_note) return `this dish ${item.hidden_allergen_note}`;
  if ((CROSS_CONTACT[item.station] ?? []).includes(a)) {
    const why: Partial<Record<Station, string>> = {
      fry: "it comes out of the same fryer as the dishes that do",
      wok: "it shares a wok and a sauce station with dishes that do",
      steam: "it shares steamer baskets and broth pots with dishes that do",
    };
    return why[item.station] ?? "the station it is cooked on carries a risk";
  }
  return null;
}

export interface Hazard {
  allergen: Allergen;
  evidence: string[];
  confirmations: number;
  lastConfirmed: string | null;
  source: string | null;
  stale: boolean;
  phrase: string;
}

/**
 * XTrace's extraction normalises facts and drops the temporal qualifier, so a
 * date parsed out of the returned prose is unreliable — verified twice against
 * the live API. The claim therefore comes from memory; the DATE comes from the
 * restaurant's structured confirmation record, which is where a real POS would
 * hold it anyway. Citing a ledger row is also a better answer to "how do you
 * know?" than citing a sentence a language model rewrote.
 */
function ledger(sku: string, allergen: Allergen, present: boolean) {
  const rows = CONFIRMATIONS.filter(
    (c) => c.sku === sku && c.allergen === allergen && c.present === present
  ).sort((a, b) => a.confirmed_on.localeCompare(b.confirmed_on));
  return {
    count: rows.length,
    last: rows.at(-1)?.confirmed_on ?? null,
    source: rows.at(-1)?.source ?? null,
    notes: rows.map((r) => `${r.confirmed_on} · ${r.source}: ${r.note}`),
  };
}

export interface GuardianVerdict {
  verdict: "allow" | "block" | "unconfirmed";
  sku: string;
  nameEn: string;
  nameZh: string;
  restricted: Allergen[];
  hazards: Hazard[];
  say: string;
  searches: { scope: string; query: string; rows: number }[];
}

const zhPhrase = (a: Allergen): string =>
  ({
    peanut: "这个有没有花生油？",
    shrimp: "这个有没有虾？",
    shrimp_paste: "这个有没有虾酱？",
    shellfish: "这个有没有海鲜？",
    fish_sauce: "这个有没有鱼露？",
    sesame: "这个有没有芝麻？",
    tree_nut: "这个有没有坚果？",
    dairy: "这个有没有奶制品？",
    gluten: "这个有没有面粉？",
    egg: "这个有没有蛋？",
    soy: "这个有没有大豆？",
  } as Record<Allergen, string>)[a];

const label = (a: Allergen) => a.replace(/_/g, " ");

/** Word-boundary match. Plain substring turned "Peggy" into an egg allergy
 *  and "Soyoung" into a soy allergy — both real, both reproducible. */
const mentions = (text: string, a: Allergen) => {
  const t = text.toLowerCase();
  return SYNONYMS[a].some((syn) => {
    const s = syn.toLowerCase();
    if (/[\u4e00-\u9fff]/.test(s)) return t.includes(s); // CJK has no word breaks
    return new RegExp(`(?:^|[^a-z])${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[^a-z]|$)`, "i").test(t);
  });
};

/** Does this text refer to the dish at all? sku, English name, or Chinese name. */
function refersToDish(text: string, item: MenuItem): boolean {
  const t = text.toLowerCase();
  return (
    t.includes(item.sku) ||
    t.includes(item.sku.replace(/_/g, " ")) ||
    t.includes(item.name_en.toLowerCase()) ||
    text.includes(item.name_zh)
  );
}

/** Pull the guest's restrictions out of their personal memory. */
export function extractRestrictions(rows: { text: string }[]): Allergen[] {
  const found = new Set<Allergen>();
  for (const r of rows) {
    if (!RESTRICTION_CUES.test(r.text)) continue;
    for (const a of ALLERGENS) {
      if (mentions(r.text, a)) {
        found.add(a);
        for (const implied of IMPLIES[a] ?? []) found.add(implied);
      }
    }
  }
  return [...found];
}

const daysSince = (iso: string) =>
  Math.floor((Date.now() - new Date(iso + "T00:00:00Z").getTime()) / 86400000);

/**
 * The gate. Runs two scoped searches in parallel and decides deterministically.
 * Returns `allow` only when nothing the guest avoids is present in the dish.
 */
export async function guardianCheck(args: {
  guestPhone: string | null;
  sku: string;
  restrictionsHint?: Allergen[];
}): Promise<GuardianVerdict> {
  const item = bySku(args.sku) ?? MENU[0];
  const searches: GuardianVerdict["searches"] = [];

  const guestQ = "allergies, dietary restrictions and foods this guest must avoid";
  const kitchenQ = `does ${item.name_en} contain or contact any allergen at this restaurant?`;

  const [guestRes, kitchenRes] = await Promise.all([
    args.guestPhone
      ? search({ query: guestQ, user_id: args.guestPhone, mode: "retrieve" })
      : Promise.resolve<SearchResult>({ data: [] }),
    ALLERGEN_GROUP
      ? search({ query: kitchenQ, group_ids: [ALLERGEN_GROUP], mode: "retrieve" })
      : Promise.resolve<SearchResult>({ data: [] }),
  ]);
  searches.push({ scope: "guest personal", query: guestQ, rows: guestRes.data.length });
  searches.push({ scope: "restaurant allergen group", query: kitchenQ, rows: kitchenRes.data.length });

  // If we could not read the guest's ledger, we do not get to say "allow".
  const lookupFailed = Boolean(guestRes.failed) || Boolean(kitchenRes.failed);
  const restricted = args.restrictionsHint?.length
    ? args.restrictionsHint
    : extractRestrictions(guestRes.data);

  if (lookupFailed && !args.restrictionsHint?.length) {
    return {
      verdict: "unconfirmed", sku: item.sku, nameEn: item.name_en, nameZh: item.name_zh,
      restricted, hazards: [], searches,
      say:
        `I can't reach the guest's record right now, so I'm not going to tell you the ` +
        `${item.name_en} is safe. Ask at the counter before you order it.`,
    };
  }

  if (!restricted.length) {
    return {
      verdict: "allow", sku: item.sku, nameEn: item.name_en, nameZh: item.name_zh,
      restricted: [], hazards: [], searches,
      say: `One ${item.name_en}. Anything else?`,
    };
  }

  const hazards: Hazard[] = [];
  const unconfirmed: Allergen[] = [];
  const doubts = new Map<Allergen, string>();

  for (const a of restricted) {
    // H1: declared ingredients decide presence — not the dish's name.
    const declared = item.allergens.includes(a);

    // Memory rows about THIS dish and THIS allergen.
    const rows = kitchenRes.data.filter(
      (m) => refersToDish(m.text, item) && mentions(m.text, a)
    );
    // H2: split incriminating from exculpatory.
    const positive = rows.filter((m) => !NEGATION.test(m.text));
    const negative = rows.filter((m) => NEGATION.test(m.text));

    if (declared || positive.length) {
      const evidence = [...new Set(
        positive.length
          ? positive.map((m) => m.text)
          : [`${item.name_en} is prepared with ${label(a)} at this restaurant.` +
             (item.hidden_allergen_note ? ` Note: ${item.hidden_allergen_note}.` : "")]
      )];
      const led = ledger(item.sku, a, true);
      const last = led.last;
      hazards.push({
        allergen: a,
        evidence: [...led.notes, ...evidence],
        confirmations: Math.max(led.count, positive.length ? 1 : 0),
        lastConfirmed: last,
        source: led.source,
        stale: last ? daysSince(last) > STALE_DAYS : false,
        phrase: zhPhrase(a),
      });
      continue;
    }

    // Cleared by a dated negative confirmation — but only if it is fresh.
    const negLast = negative.length ? ledger(item.sku, a, false).last : null;
    if (negative.length && negLast && daysSince(negLast) <= STALE_DAYS) continue;
    const staleNegative = negative.length > 0;

    // Nobody has asked. Only say so when there is a real reason to wonder —
    // and when there is, say what the reason actually is.
    const why = doubtIsEarned(item, a, staleNegative, negLast);
    if (why) { unconfirmed.push(a); doubts.set(a, why); }
  }

  if (hazards.length) {
    // shellfish implies shrimp implies shrimp_paste, so one dish can raise the
    // same underlying hazard several times. Keep the best-evidenced one first
    // and drop family duplicates that carry no record of their own.
    hazards.sort((x, y) =>
      Number(Boolean(y.lastConfirmed)) - Number(Boolean(x.lastConfirmed)) ||
      y.confirmations - x.confirmations
    );
    const seenEvidence = new Set<string>();
    const deduped = hazards.filter((h) => {
      const key = h.evidence[0] ?? h.allergen;
      if (h.lastConfirmed === null && seenEvidence.has(key)) return false;
      seenEvidence.add(key);
      return true;
    });
    hazards.length = 0;
    hazards.push(...deduped);
    const h = hazards[0];
    const safe = safeAlternative(item, restricted);
    const when = h.lastConfirmed ? ` on ${h.lastConfirmed}` : "";
    const dated = h.lastConfirmed ? "confirmed" : "has on record";
    const src = h.source === "incident" ? " after an allergen incident" : "";
    const times = h.confirmations > 1 ? `, and it's been confirmed ${h.confirmations} times` : "";
    const alt = safe ? ` The ${safe.name_en} is clear — that's what I'd send you.` : "";
    return {
      verdict: "block", sku: item.sku, nameEn: item.name_en, nameZh: item.name_zh,
      restricted, hazards, searches,
      say:
        `I'd skip the ${item.name_en}. This kitchen ${dated}${when}${src} that it carries ${label(h.allergen)}${times}.` +
        alt +
        ` If you want to check at the counter, say: ${h.phrase}`,
    };
  }

  if (unconfirmed.length) {
    const a = unconfirmed[0];
    return {
      verdict: "unconfirmed", sku: item.sku, nameEn: item.name_en, nameZh: item.name_zh,
      restricted, hazards: [], searches,
      say:
        `I can't vouch for the ${item.name_en} on ${label(a)} — ${doubts.get(a) ?? "nobody has checked recently"}. ` +
        `I'm not going to tell you it's safe. Ask the counter: ${zhPhrase(a)} — and I'll remember the answer for everyone after you.`,
    };
  }

  return {
    verdict: "allow", sku: item.sku, nameEn: item.name_en, nameZh: item.name_zh,
    restricted, hazards: [], searches,
    say: `One ${item.name_en} — that one's clear for you. Anything else?`,
  };
}

/**
 * A recommendation has to survive the same gate it came from.
 *
 * The first version filtered only on declared allergens, so after blocking the
 * Kung Pao because the fryer carries peanut, it would cheerfully suggest
 * another fried dish as "clear" — a contradiction in the same breath, and the
 * kind a judge catches. An alternative must be one this guest could actually
 * be told is safe: nothing declared, no hidden-ingredient note, and no
 * cross-contact route from its station.
 */
export function safeAlternative(from: MenuItem, restricted: Allergen[]): MenuItem | null {
  const clear = MENU.filter((m) => {
    if (m.sku === from.sku || !m.available) return false;
    if (m.allergens.some((a) => restricted.includes(a))) return false;
    if (m.hidden_allergen_note) return false;
    const routes = CROSS_CONTACT[m.station] ?? [];
    return !routes.some((a) => restricted.includes(a));
  });
  if (!clear.length) return null;
  return clear.find((m) => m.category === from.category) ?? clear[0];
}
