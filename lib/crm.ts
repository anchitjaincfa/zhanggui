// GHOST CRM + SECRET MENU.
//
// Ghost CRM: nobody ever types a customer in. The ledger accrues from the
// streams that already exist — caller ID, what was said, what was ordered.
// Secret Menu: what this kitchen can actually make, crossed with what this
// guest actually likes. The bridge is the product: dish, reason, and the exact
// phrase to say at the counter.

import { search, searchMany, ingestDetached, KITCHEN_GROUP, ALLERGEN_GROUP, type Memory } from "./xtrace";
import { type Allergen } from "@/data/restaurant";
import { extractRestrictions } from "./guardian";
import { getShop, groupsFor, type Shop } from "./shop";

export interface GuestCard {
  phone: string;
  name: string | null;
  nameZh: string | null;
  language: "en" | "zh";
  restrictions: Allergen[];
  dislikes: string[];
  spice: string | null;
  fulfilment: string | null;
  cadence: string | null;
  notes: string[];
  orderCount: number;
  knownSince: string | null;
  raw: Memory[];
}

const NAME_RE = /\b(?:Mrs?|Ms|Mr)\.? [A-Z][a-z]+|\b[A-Z][a-z]+ [A-Z][a-z]+\b/;
const ZH_NAME_RE = /[一-鿿]{2,4}(?:太太|先生|小姐)?/;

function pick(rows: Memory[], re: RegExp): string[] {
  return rows.filter((r) => re.test(r.text)).map((r) => r.text);
}

/** Everything the house knows about this number. */
export async function guestCard(phone: string): Promise<GuestCard | null> {
  const rows = await searchMany(
    "who is this guest: name, language, preferences, dislikes, allergies, how often they order, pickup or delivery",
    [{ user_id: phone, mode: "retrieve" }]
  );
  if (!rows.length) return null;

  const all = rows.map((r) => r.text);
  const joined = all.join(" ");

  const nameMatch = joined.match(NAME_RE);
  const zhMatch = joined.match(ZH_NAME_RE);
  const dislikes = pick(rows, /dislike|hate|avoids|sent back|too sweet|no cilantro/i);
  const spiceRow = pick(rows, /spic|heat|numbing|mild|hot\b/i)[0] ?? null;
  const fulfilRow = pick(rows, /pickup|collect|delivery|deliver/i)[0] ?? null;
  const cadenceRow = pick(rows, /every|weekly|fortnight|usually .*(?:day|pm)|regular for/i)[0] ?? null;
  const langZh = /mandarin|cantonese|chinese|中文/i.test(joined);
  const since = rows
    .map((r) => r.created_at)
    .filter(Boolean)
    .sort()[0] as string | undefined;

  return {
    phone,
    name: nameMatch?.[0] ?? null,
    nameZh: zhMatch?.[0] ?? null,
    language: langZh ? "zh" : "en",
    restrictions: extractRestrictions(rows),
    dislikes: dislikes.slice(0, 3),
    spice: spiceRow,
    fulfilment: fulfilRow,
    cadence: cadenceRow,
    notes: all,
    orderCount: rows.length,
    knownSince: since ?? null,
    raw: rows,
  };
}

export interface SecretPick {
  sku: string;
  nameEn: string;
  nameZh: string;
  phrase: string;
  reason: string;
}

/** What a twenty-year regular would order here, for this particular guest. */
export async function secretMenuFor(phone: string | null, opts?: { weekday?: boolean; shop?: Shop }): Promise<SecretPick[]> {
  const shop = opts?.shop ?? getShop(null);
  const kitchenGroup = groupsFor(shop).kitchen || KITCHEN_GROUP;
  const weekday = opts?.weekday ?? ![0, 6].includes(new Date().getDay());

  const [kitchen, guest] = await Promise.all([
    kitchenGroup
      ? search({
          query: "what can this kitchen actually make that is not on the English menu?",
          group_ids: [kitchenGroup],
          mode: "retrieve",
        })
      : Promise.resolve({ data: [] as Memory[] }),
    phone
      ? search({ query: "what flavours does this guest like and dislike?", user_id: phone, mode: "retrieve" })
      : Promise.resolve({ data: [] as Memory[] }),
  ]);

  const restricted = extractRestrictions(guest.data);
  const tastes = guest.data.map((g) => g.text.toLowerCase()).join(" ");
  const likesSour = /sour|vinegar|pickle|酸/.test(tastes);
  const likesNumbing = /numbing|mala|麻|sichuan pepper/.test(tastes);
  const avoidsSweet = /dislikes? .*sweet|too sweet|avoid.*sweet/.test(tastes);

  const candidates = shop.menu.filter(
    (m) => !m.english_listed && m.available && !m.allergens.some((a) => restricted.includes(a))
  ).filter((m) => (m.weekday_only ? weekday : true));

  const scored = candidates.map((m) => {
    let score = 1;
    const reasons: string[] = [];
    const kitchenNote = kitchen.data.find((k) => k.text.includes(m.name_zh) || k.text.toLowerCase().includes(m.name_en.toLowerCase()));
    if (kitchenNote) { score += 2; reasons.push(kitchenNote.text); }
    if (likesSour && /sour|pickle|vinegar|酸/i.test(m.name_en + m.blurb)) { score += 2; reasons.push("you lean sour"); }
    if (likesNumbing && m.base_spice >= 2) { score += 1; reasons.push("you like it numbing"); }
    if (avoidsSweet && /sweet|candied|glaze/i.test(m.blurb)) score -= 3;
    if (m.weekday_only && weekday) { score += 1; reasons.push("weekday only — the good fish is in"); }
    return { m, score, reasons };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ m, reasons }) => ({
      sku: m.sku,
      nameEn: m.name_en,
      nameZh: m.name_zh,
      phrase: m.order_phrase_zh,
      reason: reasons[0] ?? m.blurb,
    }));
}

/** 86 awareness — never offer what the kitchen cannot make tonight. */
export const availableSkus = (shop: Shop = getShop(null)) =>
  shop.menu.filter((m) => m.available).map((m) => m.sku);

/** Write the call back into memory. Detached: a caller must never wait on it. */
export function rememberCall(args: {
  phone: string;
  callId: string;
  transcript: { role: string; content: string }[];
  resolved: boolean;
  shop?: Shop;
}) {
  if (!args.transcript.length) return;
  const shop = args.shop ?? getShop(null);
  ingestDetached({
    messages: args.transcript,
    user_id: args.phone,
    conv_id: `call_${args.callId}`,
    agent_id: "frontdesk",
    namespace: `rest_${shop.restaurant.id}`,
    agentic: true,
    outcome: args.resolved ? "resolved" : "failed",
  });
}

/** A staff or guest confirmation about an allergen — the Guardian flywheel. */
export function confirmAllergen(args: {
  sku: string;
  allergen: string;
  present: boolean;
  source: string;
  date: string;
  shop?: Shop;
}) {
  const shop = args.shop ?? getShop(null);
  const item = shop.menu.find((m) => m.sku === args.sku);
  if (!item) return;
  // Writes go to THIS shop's allergen group. A confirmation about a boba drink
  // must never land in the Sichuan restaurant's ledger.
  const group = groupsFor(shop).allergen || ALLERGEN_GROUP;
  const verb = args.present ? "contains" : "does not contain";
  ingestDetached({
    messages: [
      {
        role: "user",
        content:
          `Confirmation recorded on ${args.date} by ${args.source}: ` +
          `${shop.restaurant.name} sku ${args.sku} (${item.name_en} / ${item.name_zh}) ` +
          `${verb} ${args.allergen.replace(/_/g, " ")}.`,
      },
      { role: "assistant", content: `Noted for ${item.name_en}.` },
    ],
    user_id: shop.restaurant.opsUserId,
    conv_id: `confirm_${shop.slug}_${args.sku}_${args.allergen}_${args.date}`,
    group_ids: group ? [group] : undefined,
    namespace: `rest_${shop.restaurant.id}`,
  });
}
