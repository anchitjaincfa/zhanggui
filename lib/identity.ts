// WHO IS THIS? — identity without an account.
//
// A restaurant cannot ask a caller to log in. Caller ID is the natural key and
// it fails constantly: people call from a partner's phone, a work line, a
// number they changed last year, or with caller ID withheld. So the desk asks
// the question a human host would ask — "have you ordered with us before?" —
// and then asks for one thing a person always knows and never has to look up.
//
// A birthday is not a password and this file does not pretend otherwise. It is
// a *disambiguator*: it narrows a caller to a very small set, and when it
// narrows to exactly one person, the number they are calling from is written
// back so the question never has to be asked again. When it narrows to more
// than one — which happens, and one of the seeded profiles proves it — the
// desk asks for a name rather than guessing. Guessing is how you read one
// guest's allergies off another guest's record.

import { PROFILES, byPhone, byBirthday, type Profile } from "@/data/guests";
import { ingestDetached, search } from "./xtrace";
import { getShop, scopedUserId, type Shop } from "./shop";
import { RESTAURANT } from "@/data/restaurant";

// ── Hearing a date ─────────────────────────────────────────────────────────
// Speech-to-text hands over dates in whatever shape the speaker used. All of
// these are the same day and all of them have to parse:
//   "10 January 1994" · "January tenth, nineteen ninety four" · "1/10/1994"
//   "17-jun-93" · "the seventeenth of June nineteen ninety-three" · "1993-06-17"

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
  // Mandarin: 一月 … 十二月, and the bare 1月 form
  一月: 1, 二月: 2, 三月: 3, 四月: 4, 五月: 5, 六月: 6,
  七月: 7, 八月: 8, 九月: 9, 十月: 10, 十一月: 11, 十二月: 12,
};

const CARDINAL: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
};

/**
 * Ordinals are kept separate from cardinals, and it is not pedantry.
 *
 * "November nineteenth nineteen fifty seven" used to parse as 1969-11-07,
 * because the year scanner saw "nineteenth" (19), took it for the start of a
 * year, and ate the real year's words as its tail. A date that is wrong but
 * confident is the most dangerous output this file can produce — it attaches a
 * caller to a stranger's allergy record. A year never begins with an ordinal.
 */
const ORDINAL: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7,
  eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13,
  fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17,
  eighteenth: 18, nineteenth: 19, twentieth: 20, thirtieth: 30,
};

const ONES: Record<string, number> = { ...CARDINAL, ...ORDINAL };

/**
 * "nineteen ninety four" → 1994 · "two thousand one" → 2001
 *
 * Returns which words it consumed as well as the year. Without that, "January
 * tenth nineteen ninety four" reads the *tenth* as part of the year and the
 * date comes out as 2004-01-19 — a confidently wrong answer, which is worse
 * than no answer when the next step is reading someone's allergies aloud.
 */
export function spokenYearAt(words: string[]): { year: number; used: Set<number> } | null {
  for (let i = 0; i < words.length; i++) {
    // A year is spoken in cardinals. "nineteenth" is a day, always.
    const head = CARDINAL[words[i]];

    // "two thousand (and) five"
    if (head !== undefined && words[i + 1] === "thousand") {
      const used = new Set([i, i + 1]);
      let rest = 0;
      for (let j = i + 2; j < Math.min(words.length, i + 5); j++) {
        if (words[j] === "and") { used.add(j); continue; }
        const v = CARDINAL[words[j]];
        if (v === undefined || v > 99 || rest + v > 99) break;
        rest += v; used.add(j);
      }
      const year = head * 1000 + rest;
      if (year >= 1900 && year <= 2026) return { year, used };
    }

    // "nineteen ninety four" / "twenty oh five"
    //
    // The second word must be a TENS word (or "oh"/"hundred"). Without that
    // rule, "July twenty third nineteen ninety" read "twenty three nineteen"
    // as the year 2022 and then had no day left to find. A year is not spoken
    // as "twenty three"; a date is.
    const next = words[i + 1];
    const startsAYear =
      next === "oh" || next === "hundred" ||
      (CARDINAL[next] !== undefined && CARDINAL[next] >= 20 && CARDINAL[next] % 10 === 0);

    if (head !== undefined && head >= 17 && head <= 20 && startsAYear) {
      const used = new Set([i]);
      let tail = 0;
      for (let j = i + 1; j < Math.min(words.length, i + 3); j++) {
        if (words[j] === "oh" || words[j] === "hundred") { used.add(j); continue; }
        // Cardinals only: an ordinal here is the day, not part of the year.
        const v = CARDINAL[words[j]];
        if (v === undefined || v > 99 || tail + v > 99) break;
        tail += v; used.add(j);
      }
      const year = head * 100 + tail;
      if (year >= 1900 && year <= 2026 && used.size > 1) return { year, used };
    }
  }
  return null;
}

/**
 * The day, from the words the year did not claim.
 *
 * "thirty first" is two words and one number. Reading only the first of them
 * turned the 31st into the 30th — a silent off-by-one in an identifier.
 */
export function spokenDay(words: string[], used?: Set<number>): number | null {
  for (let i = 0; i < words.length; i++) {
    if (used?.has(i)) continue;
    const v = ONES[words[i]];
    if (v === undefined) continue;
    // "twenty second", "thirty first"
    if ((v === 20 || v === 30) && !used?.has(i + 1)) {
      const unit = ONES[words[i + 1]];
      if (unit !== undefined && unit >= 1 && unit <= 9) return v + unit;
    }
    if (v >= 1 && v <= 31) return v;
  }
  return null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Parse a spoken or typed birthday into ISO. Returns null rather than a guess:
 * a wrong date silently attaches a caller to a stranger's allergy record.
 */
export function parseBirthday(input: string): string | null {
  if (!input) return null;
  const raw = input.toLowerCase().replace(/[‘’ʼ]/g, "'").trim();

  // Already ISO.
  const iso = raw.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) return `${iso[1]}-${pad(+iso[2])}-${pad(+iso[3])}`;

  // Mandarin: 1993年6月17日
  const zh = raw.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?/);
  if (zh) return `${zh[1]}-${pad(+zh[2])}-${pad(+zh[3])}`;

  // Month name in either order: "10 jan 1994" / "january 10 1994"
  const cleaned = raw.replace(/(\d+)(st|nd|rd|th)\b/g, "$1").replace(/[,]/g, " ");
  const monthWord = Object.keys(MONTHS).find((m) =>
    new RegExp(`(?:^|[^a-z一-鿿])${m}(?:[^a-z一-鿿]|$)`).test(cleaned)
  );
  if (monthWord) {
    const month = MONTHS[monthWord];
    const nums = (cleaned.match(/\b\d{1,4}\b/g) ?? []).map(Number);
    const words = cleaned.split(/[^a-z]+/).filter(Boolean);
    const spoken = spokenYearAt(words);

    const year = nums.find((n) => n > 31) ?? spoken?.year ?? null;
    // The day may be a digit, or a word the year did NOT already claim.
    const day = nums.find((n) => n >= 1 && n <= 31) ?? spokenDay(words, spoken?.used);

    if (year && day && year > 1900 && year < 2026) return `${year}-${pad(month)}-${pad(day)}`;
    return null;
  }

  // Numeric US order: 1/10/1994 or 01-10-94
  const num = cleaned.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
  if (num) {
    let [, m, d, y] = num;
    let year = +y;
    if (year < 100) year += year > 30 ? 1900 : 2000;
    // Both readings are possible; only accept when one is unambiguous.
    if (+m > 12 && +d <= 12) [m, d] = [d, m];
    if (+m > 12 || +d > 31) return null;
    if (year > 1900 && year < 2026) return `${year}-${pad(+m)}-${pad(+d)}`;
  }

  // Fully spoken: "january tenth nineteen ninety four" handled above; this
  // catches "the tenth of january, nineteen ninety four" without digits.
  const words = cleaned.split(/[^a-z]+/).filter(Boolean);
  const y2 = spokenYearAt(words);
  if (y2) {
    const mw = words.find((w) => MONTHS[w] !== undefined);
    const di = words.findIndex(
      (w, i) => !y2.used.has(i) && ONES[w] !== undefined && ONES[w] >= 1 && ONES[w] <= 31
    );
    if (mw && di >= 0) return `${y2.year}-${pad(MONTHS[mw])}-${pad(ONES[words[di]])}`;
  }
  return null;
}

/** Read a date back the way a person says it, for confirmation. */
export function sayBirthday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const name = Object.keys(MONTHS).find((k) => MONTHS[k] === m && k.length > 3 && !/[一-鿿]/.test(k));
  return `${d} ${(name ?? "").replace(/^./, (c) => c.toUpperCase())} ${y}`;
}

// ── Resolution ─────────────────────────────────────────────────────────────

export type IdentityOutcome =
  | { status: "known"; profile: Profile; via: "phone" }
  | { status: "matched"; profile: Profile; via: "birthday" }
  | { status: "ambiguous"; candidates: Profile[] }
  | { status: "unparsed" }
  | { status: "nomatch" };

/** Caller ID first — it costs nothing and asks the guest for nothing. */
export function identifyByPhone(phone: string | null): Profile | null {
  return phone ? byPhone(phone) : null;
}

/**
 * The second attempt, when the number is unknown. Narrow by birthday, then by
 * name if the birthday alone is not unique.
 */
export function identifyByBirthday(spoken: string, nameHint?: string): IdentityOutcome {
  const iso = parseBirthday(spoken);
  if (!iso) return { status: "unparsed" };
  const hits = byBirthday(iso);
  if (!hits.length) return { status: "nomatch" };
  if (hits.length === 1) return { status: "matched", profile: hits[0], via: "birthday" };

  if (nameHint) {
    // Whole-token match only. Substring matching made "Priyanka" resolve to
    // Priya Raman and handed over her record — and "not Priya" matched too.
    // The hint arrives as the whole utterance, so tokenise and compare words.
    const said = new Set(
      nameHint.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean)
    );
    const negated = /\bnot\b|\bisn'?t\b|\bwrong\b/i.test(nameHint);
    const narrowed = negated ? [] : hits.filter((p) => {
      const parts = p.name.toLowerCase().split(/\s+/);
      return parts.some((part) => said.has(part));
    });
    if (narrowed.length === 1) return { status: "matched", profile: narrowed[0], via: "birthday" };
  }
  return { status: "ambiguous", candidates: hits };
}

/**
 * Write the new number onto the profile that owns it, so the birthday question
 * is asked exactly once per phone. Detached — a caller never waits on a write.
 */
export function linkPhoneToProfile(profile: Profile, phone: string, shop: Shop = getShop(null)): void {
  if (!phone || phone === profile.phone) return;
  ingestDetached({
    messages: [
      {
        role: "user",
        content:
          `${profile.name} confirmed their date of birth ${profile.birthday} on a call from ` +
          `${phone}. This number now belongs to ${profile.name} ` +
          `(profile ${profile.id}, primary number ${profile.phone}) at ${RESTAURANT.name}. ` +
          `Their standing preferences: ${describe(profile)}`,
      },
      { role: "assistant", content: `Linked ${phone} to ${profile.name}.` },
    ],
    user_id: scopedUserId(shop, phone),
    conv_id: `link_${profile.id}_${phone.replace(/\D/g, "")}`,
    agent_id: "frontdesk",
    namespace: `rest_${RESTAURANT.id}`,
  });
}

/** One line a voice model can read aloud without sounding like a database. */
export function describe(p: Profile): string {
  const bits: string[] = [];
  if (p.restrictions.length) bits.push(`must avoid ${p.restrictions.join(", ").replace(/_/g, " ")}`);
  bits.push(`heat level ${p.spice} out of 5`);
  bits.push(`usually ${p.fulfilment}`);
  if (p.usual.length) bits.push(`usual order ${p.usual.map((s) => s.replace(/_/g, " ")).join(" and ")}`);
  if (p.visits) bits.push(`${p.visits} previous orders since ${p.since}`);
  return bits.join("; ");
}

/** Everything the desk can say about someone the moment it knows who they are. */
export function greeting(p: Profile): string {
  const zh = p.language === "zh";
  const usual = p.usual[0]?.replace(/_/g, " ");
  return zh
    ? `${p.name_zh ?? p.name}，欢迎回来。${p.restrictions.length ? `记录显示您不能吃${p.restrictions.join("、").replace(/_/g, "")}。` : ""}${usual ? `还是老样子吗？` : ""}`
    : `Welcome back, ${p.name.split(" ")[0]}.` +
      (p.restrictions.length ? ` I have you down as avoiding ${p.restrictions.join(" and ").replace(/_/g, " ")}.` : "") +
      (usual ? ` Your usual is the ${usual} — want that again?` : "");
}

/** Cross-check the local registry against what memory holds for this number. */
export async function memoryFor(phone: string, shop: Shop = getShop(null)) {
  const r = await search({
    query: "who is this guest, their preferences, allergies, and order history",
    user_id: scopedUserId(shop, phone),
    mode: "retrieve",
  });
  return r;
}

export { PROFILES, type Profile };
