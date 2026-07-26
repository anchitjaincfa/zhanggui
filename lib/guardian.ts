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

import { search, type SearchResult } from "./xtrace";
import { getShop, groupsFor, scopedUserId, safetyScopeId, type Shop } from "./shop";
import { MENU, CONFIRMATIONS, type Allergen, type MenuItem, type Station } from "@/data/restaurant";

export const ALLERGENS: Allergen[] = [
  "peanut", "shellfish", "shrimp", "fish_sauce", "shrimp_paste",
  "gluten", "dairy", "sesame", "tree_nut", "egg", "soy",
];

/** How an allergen may appear in free text. */
const SYNONYMS: Record<Allergen, string[]> = {
  peanut: ["peanut", "groundnut", "花生"],
  // "seafood" belongs here even though it is looser than shellfish. It is how
  // most people actually say it on the phone, and it was returning NO
  // restrictions at all — the gate's worst possible answer. Treating it as the
  // shellfish family over-restricts a fish-only guest by a dish or two; the
  // alternative was silently serving shrimp to someone who told us not to.
  shellfish: ["shellfish", "seafood", "crustacean", "crab", "lobster", "scallop", "clam", "oyster", "貝", "海鲜", "海鮮"],
  shrimp: ["shrimp", "prawn", "dried shrimp", "虾", "蝦"],
  fish_sauce: ["fish sauce", "鱼露", "魚露"],
  shrimp_paste: ["shrimp paste", "dried shrimp paste", "虾酱", "蝦醬"],
  gluten: ["gluten", "wheat", "flour", "面粉", "麸质", "麵粉"],
  dairy: ["dairy", "milk", "cream", "butter", "cheese", "mayonnaise", "lactose", "yogurt", "yoghurt", "ghee", "牛奶", "奶制品", "乳制品"],
  sesame: ["sesame", "tahini", "芝麻"],
  tree_nut: ["tree nut", "walnut", "cashew", "almond", "pecan", "pistachio", "hazelnut", "macadamia", "核桃", "腰果", "杏仁"],
  egg: ["egg", "鸡蛋", "蛋"],
  soy: ["soy", "soya", "soybean", "tofu", "大豆", "豆腐"],
};

/** "I have a nut allergy" names no specific nut. A gate cannot guess which one
 *  they meant, so it must assume both families. */
const GENERIC_NUT = /(?:^|[^a-z])nuts?(?:[^a-z]|$)|坚果|堅果/i;

/** Families: being allergic to shellfish implies caring about shrimp etc. */
const IMPLIES: Partial<Record<Allergen, Allergen[]>> = {
  shellfish: ["shrimp", "shrimp_paste"],
  shrimp: ["shrimp_paste"],
  tree_nut: [],
};

// A bare "no" is not an allergy cue — "no cilantro" is a preference, and it
// used to drag in whatever allergen happened to appear as a substring.
//
// The first version only recognised the way a form asks the question. People do
// not say "I cannot eat peanuts"; they say "I can't have peanuts", "it makes me
// sick", "我对花生过敏". Every phrasing this missed was scored as *no
// restrictions at all*, which is the one wrong answer a gate must never give —
// so the cue list is deliberately generous. A false cue costs a question at the
// counter; a missed cue costs an ambulance.
const RESTRICTION_CUES = new RegExp(
  [
    "\\ballerg", "anaphyla", "epipen", "epi-pen", "intoleran", "coeliac", "celiac",
    "\\bavoid", "\\bcut out\\b", "stay(?:s)? away from", "\\bkeep .{0,12}away from",
    "(?:cannot|can'?t|can not|do(?:es)?n'?t|won'?t|must not|mustn'?t|shouldn'?t|should not)" +
      "\\s+(?:eat|have|touch|take|do|handle|go near)",
    "\\bfree from\\b", "\\bfree of\\b", "[a-z]-free\\b", "sensitiv", "reacts? (?:badly )?to",
    "makes? (?:me|him|her|them) (?:sick|ill)", "\\bno\\b\\s+[a-z]{0,8}\\s*(?:allerg)",
    "\\bno (?:peanut|shellfish|shrimp|prawn|gluten|wheat|dairy|milk|sesame|soy|egg|nut|fish|seafood)",
    // Mandarin. 过敏 = allergic · 不能吃 = cannot eat · 忌 = must abstain from
    "过敏", "過敏", "不能吃", "不可以吃", "不吃", "忌口", "\\u5fcc", "敏感", "受不了",
  ].join("|"),
  "i"
);

// "does not contain", "no peanut", "peanut-free", "separate wok"
const NEGATION =
  /\b(?:does not|doesn't|does nt|no|not|never|free of|free from|without)\b[^.]{0,40}|(?:peanut|shrimp|dairy|gluten|sesame|soy|egg)[- ]free|separate wok|no .{0,12}contact|不含|没有花生|沒有/i;

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
// The `rowsIn`/`menu` defaults below resolve to Golden Dragon deliberately —
// it is DEFAULT_SHOP, the same thing getShop(null) returns. guardianCheck always
// passes the caller's shop explicitly, so the defaults only apply to a direct
// call that never named a restaurant.
function ledger(sku: string, allergen: Allergen, present: boolean, rowsIn = CONFIRMATIONS) {
  const rows = rowsIn.filter(
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
 *  and "Soyoung" into a soy allergy — both real, both reproducible.
 *
 *  The boundary then over-corrected: "cashew" stopped matching "cashews",
 *  because a trailing s is a letter. Plurals fold in here rather than by
 *  listing every form, and curly apostrophes normalise so a phone transcript's
 *  "can’t" reads the same as a typed "can't". */
const norm = (s: string) => s.toLowerCase().replace(/[‘’ʼ]/g, "'");

const mentions = (text: string, a: Allergen) => {
  const t = norm(text);
  return SYNONYMS[a].some((syn) => {
    const s = norm(syn);
    if (/[\u4e00-\u9fff]/.test(s)) return t.includes(s); // CJK has no word breaks
    const esc = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^a-z])${esc}(?:e?s)?(?:[^a-z]|$)`, "i").test(t);
  });
};

/**
 * Is the allergen NEGATED, in the clause where it is actually mentioned?
 *
 * A whole-row negation test is too blunt in the direction that matters. Split
 * on clause boundaries, keep only the clauses naming this allergen, and clear
 * the hazard only if every one of them negates it. One unqualified "contains
 * peanut" outvotes any amount of reassuring prose around it.
 */
/** Phrases that look like negation but are in fact a warning. "Not safe for
 *  peanut allergies" was being read as "contains no peanut" — the exact
 *  inversion of what the kitchen meant. */
const DANGER_DESPITE_NOT =
  /\bnot safe\b|\bnot suitable\b|\bnot ok\b|\bnot okay\b|\bnot recommended\b|\bnot for\b|\bunsafe\b|\bavoid\b|\bnot free\b/i;

export function isNegatedFor(text: string, a: Allergen): boolean {
  if (DANGER_DESPITE_NOT.test(text)) return false;
  const clauses = text.split(/[.;:!?]|,(?=\s*(?:but|however|though)\b)|\bbut\b|\bhowever\b|[。；！？]/i);
  const naming = clauses.filter((c) => c.trim() && mentions(c, a));
  if (!naming.length) return NEGATION.test(text); // fall back to the old behaviour
  return naming.every((c) => NEGATION.test(c));
}

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
    const text = norm(r.text);
    if (!RESTRICTION_CUES.test(text)) continue;
    // Some people name the condition, not the ingredient. "I have celiac
    // disease" contains no allergen word at all and was extracting nothing.
    if (/\bcoeliac|\bceliac/.test(text)) found.add("gluten");
    if (/lactose|dairy.free|\bvegan\b/.test(text)) found.add("dairy");
    for (const a of ALLERGENS) {
      if (mentions(text, a)) {
        found.add(a);
        for (const implied of IMPLIES[a] ?? []) found.add(implied);
      }
    }
    // "a nut allergy" without naming the nut. Peanuts are a legume and tree
    // nuts are not, but nobody saying this sentence means that distinction —
    // and the gate does not get to pick the more convenient reading.
    if (GENERIC_NUT.test(text) && !found.has("tree_nut")) {
      found.add("tree_nut");
      found.add("peanut");
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
  /** Omitted ⇒ Golden Dragon, byte-identical to the original behaviour. */
  shop?: Shop | string | null;
}): Promise<GuardianVerdict> {
  const shop = typeof args.shop === "string" || args.shop == null
    ? getShop(args.shop ?? null) : args.shop;
  const menu = shop.menu;
  const allergenGroup = groupsFor(shop).allergen;
  const item = menu.find((m) => m.sku === args.sku) ?? menu[0];
  const searches: GuardianVerdict["searches"] = [];

  const guestQ = "allergies, dietary restrictions and foods this guest must avoid";
  const kitchenQ = `does ${item.name_en} contain or contact any allergen at this restaurant?`;

  // The guest read is two reads: this restaurant's own record of them, and the
  // allergy they may have declared at a different one. A gate that only knew
  // what THIS shop had been told would be safe for regulars and useless for
  // everyone else.
  const ownId = args.guestPhone ? scopedUserId(shop, args.guestPhone) : null;
  const sharedId = args.guestPhone ? safetyScopeId(args.guestPhone) : null;

  const [guestRes, sharedRes, kitchenRes] = await Promise.all([
    ownId
      ? search({ query: guestQ, user_id: ownId, mode: "retrieve" })
      : Promise.resolve<SearchResult>({ data: [] }),
    sharedId && sharedId !== ownId
      ? search({ query: guestQ, user_id: sharedId, mode: "retrieve" })
      : Promise.resolve<SearchResult>({ data: [] }),
    allergenGroup
      ? search({ query: kitchenQ, group_ids: [allergenGroup], mode: "retrieve" })
      : Promise.resolve<SearchResult>({ data: [] }),
  ]);
  searches.push({ scope: "guest personal", query: guestQ, rows: guestRes.data.length });
  if (sharedId && sharedId !== ownId) {
    searches.push({ scope: "allergies carried between restaurants", query: guestQ, rows: sharedRes.data.length });
  }
  searches.push({ scope: "restaurant allergen group", query: kitchenQ, rows: kitchenRes.data.length });

  // If we could not read a ledger, we do not get to say "allow".
  //
  // These two failures are not interchangeable. A hint carried in from the call
  // ("she just told us she's allergic to peanuts") substitutes for the GUEST
  // ledger, so a guest-side failure is survivable. It says nothing about what
  // is in the food, so a KITCHEN-side failure is not — and the old single flag
  // let a non-empty hint wave both of them through.
  const fromMemory = [
    ...extractRestrictions(guestRes.data),
    ...extractRestrictions(sharedRes.data),
  ];
  const restricted = args.restrictionsHint?.length
    ? [...new Set([...args.restrictionsHint, ...fromMemory])]
    : [...new Set(fromMemory)];

  const guestUnreadable =
    (Boolean(guestRes.failed) || Boolean(sharedRes.failed)) && !args.restrictionsHint?.length;
  const kitchenUnreadable = Boolean(kitchenRes.failed);

  if (guestUnreadable || kitchenUnreadable) {
    return {
      verdict: "unconfirmed", sku: item.sku, nameEn: item.name_en, nameZh: item.name_zh,
      restricted, hazards: [], searches,
      say: guestUnreadable
        ? `I can't reach the guest's record right now, so I'm not going to tell you the ` +
          `${item.name_en} is safe. Ask at the counter before you order it.`
        : `I can't reach the kitchen's allergen record right now, so I can't tell you what's ` +
          `in the ${item.name_en}. Ask at the counter before you order it.`,
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
    // H2: split incriminating from exculpatory — but scope the negation to the
    // clause that actually names the allergen. Testing the whole row let a
    // stray "not" anywhere in the sentence clear a hazard, so
    // "this dish is not safe: contains peanut" read as exculpatory.
    const positive = rows.filter((m) => !isNegatedFor(m.text, a));
    const negative = rows.filter((m) => isNegatedFor(m.text, a));

    if (declared || positive.length) {
      const evidence = [...new Set(
        positive.length
          ? positive.map((m) => m.text)
          : [`${item.name_en} is prepared with ${label(a)} at this restaurant.` +
             (item.hidden_allergen_note ? ` Note: ${item.hidden_allergen_note}.` : "")]
      )];
      const led = ledger(item.sku, a, true, shop.confirmations);
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
    const negLast = negative.length ? ledger(item.sku, a, false, shop.confirmations).last : null;
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
    const safe = safeAlternative(item, restricted, menu);
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
export function safeAlternative(
  from: MenuItem, restricted: Allergen[], menu: MenuItem[] = MENU
): MenuItem | null {
  const clear = menu.filter((m) => {
    if (m.sku === from.sku || !m.available) return false;
    if (m.allergens.some((a) => restricted.includes(a))) return false;
    if (m.hidden_allergen_note) return false;
    const routes = CROSS_CONTACT[m.station] ?? [];
    return !routes.some((a) => restricted.includes(a));
  });
  if (!clear.length) return null;
  return clear.find((m) => m.category === from.category) ?? clear[0];
}
