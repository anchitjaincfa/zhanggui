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

import { search, ALLERGEN_GROUP } from "./xtrace";
import { bySku, MENU, type Allergen, type MenuItem } from "@/data/restaurant";

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

const RESTRICTION_CUES =
  /\ballerg|anaphyla|intoleran|avoid|cannot eat|can't eat|cant eat|must not eat|no\b|free from|sensitiv/i;

// "does not contain", "no peanut", "peanut-free", "separate wok"
const NEGATION =
  /\b(?:does not|doesn't|does nt|no|not|never|free of|free from|without)\b[^.]{0,40}|(?:peanut|shrimp|dairy|gluten|sesame|soy|egg)[- ]free|separate wok|no .{0,12}contact/i;

const DATE_RE = /\b(20\d{2}-\d{2}-\d{2})\b/g;

const STALE_DAYS = 90;

export interface Hazard {
  allergen: Allergen;
  evidence: string[];
  confirmations: number;
  lastConfirmed: string | null;
  stale: boolean;
  phrase: string;
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

const mentions = (text: string, a: Allergen) => {
  const t = text.toLowerCase();
  return SYNONYMS[a].some((s) => t.includes(s.toLowerCase()));
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
      : Promise.resolve({ data: [] }),
    ALLERGEN_GROUP
      ? search({ query: kitchenQ, group_ids: [ALLERGEN_GROUP], mode: "retrieve" })
      : Promise.resolve({ data: [] }),
  ]);
  searches.push({ scope: "guest personal", query: guestQ, rows: guestRes.data.length });
  searches.push({ scope: "restaurant allergen group", query: kitchenQ, rows: kitchenRes.data.length });

  const restricted = args.restrictionsHint?.length
    ? args.restrictionsHint
    : extractRestrictions(guestRes.data);

  if (!restricted.length) {
    return {
      verdict: "allow", sku: item.sku, nameEn: item.name_en, nameZh: item.name_zh,
      restricted: [], hazards: [], searches,
      say: `One ${item.name_en}. Anything else?`,
    };
  }

  const hazards: Hazard[] = [];
  const unconfirmed: Allergen[] = [];

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
      const dates = positive.flatMap((m) => m.text.match(DATE_RE) ?? []).sort();
      const last = dates.at(-1) ?? null;
      hazards.push({
        allergen: a,
        evidence,
        confirmations: positive.length,
        lastConfirmed: last,
        stale: last ? daysSince(last) > STALE_DAYS : false,
        phrase: zhPhrase(a),
      });
      continue;
    }

    // Cleared by a dated negative confirmation — but only if it is fresh.
    if (negative.length) {
      const dates = [...new Set(negative.flatMap((m) => m.text.match(DATE_RE) ?? []))].sort();
      const last = dates.at(-1) ?? null;
      if (last && daysSince(last) <= STALE_DAYS) continue; // genuinely allow
      unconfirmed.push(a);
      continue;
    }

    // Nobody has ever asked. We do not get to guess.
    unconfirmed.push(a);
  }

  if (hazards.length) {
    const h = hazards[0];
    const safe = safeAlternative(item, restricted);
    const when = h.lastConfirmed ? ` on ${h.lastConfirmed}` : "";
    const dated = h.lastConfirmed ? "confirmed" : "has on record";
    const times = h.confirmations > 1 ? `, and it's been confirmed ${h.confirmations} times` : "";
    const alt = safe ? ` The ${safe.name_en} is clear — that's what I'd send you.` : "";
    return {
      verdict: "block", sku: item.sku, nameEn: item.name_en, nameZh: item.name_zh,
      restricted, hazards, searches,
      say:
        `I'd skip the ${item.name_en}. This kitchen ${dated}${when} that it carries ${label(h.allergen)}${times}.` +
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
        `Nobody has confirmed whether the ${item.name_en} is safe for ${label(a)} here recently. ` +
        `I'm not going to tell you it's safe — ask the counter: ${zhPhrase(a)} — and I'll remember the answer for everyone after you.`,
    };
  }

  return {
    verdict: "allow", sku: item.sku, nameEn: item.name_en, nameZh: item.name_zh,
    restricted, hazards: [], searches,
    say: `One ${item.name_en} — that one's clear for you. Anything else?`,
  };
}

/** Nearest dish that carries none of the guest's restrictions. */
export function safeAlternative(from: MenuItem, restricted: Allergen[]): MenuItem | null {
  const clear = MENU.filter(
    (m) => m.sku !== from.sku && m.available && !m.allergens.some((a) => restricted.includes(a))
  );
  if (!clear.length) return null;
  const sameCat = clear.find((m) => m.category === from.category);
  return sameCat ?? clear[0];
}
