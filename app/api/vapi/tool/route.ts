// One tool instead of five.
//
// Vapi's dashboard "API Request" tool posts the schema-builder body straight to
// this URL, so a single router with an `action` discriminator is one thing to
// configure rather than five — which matters when you are wiring it at 4am and
// cannot afford a typo in the fifth form.
//
// Returns 200 unconditionally, for the same reason the webhook does: Vapi drops
// non-200 responses and the caller just hears nothing.

import { NextResponse } from "next/server";
import { createCall, findCallByVapiId, updateCall } from "@/lib/store";
import { doGuardian, doIdentify, doSecretMenu, doAdd, doFinalize, type RunContext } from "@/lib/engine";
import { tryShop, DEFAULT_SHOP } from "@/lib/shop";
import { resolveItem, didYouMean } from "@/lib/resolve";
import {
  identifyByPhone, identifyByBirthday, linkPhoneToProfile, describe, greeting, sayBirthday,
} from "@/lib/identity";
import { PROFILES } from "@/data/guests";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const say = (result: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ result, ...extra });

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try { body = (await req.json()) as Record<string, unknown>; } catch { /* keep going */ }

  // Parsed out here, not inside the catch. The catch used to re-derive the
  // action from the body and missed the `parameters` shape, so a thrown error
  // on an `add` fell through to "take the order normally" — the gate failing
  // open on exactly the payload Vapi's dashboard tool sends.
  let attempted = "";
  try {
    const i = (body.message ?? body) as Record<string, unknown>;
    const a = (i.arguments ?? i.parameters ?? i) as Record<string, unknown>;
    attempted = String(a?.action ?? "").toLowerCase().trim();
  } catch { /* attempted stays empty */ }

  try {
    // The dashboard tool may nest the model's arguments; accept either shape.
    const inner = (body.message ?? body) as Record<string, unknown>;
    const args = (inner.arguments ?? inner.parameters ?? inner) as Record<string, unknown>;

    // Which restaurant this number answers for. Vapi's tool URL carries it as
    // a query string (…/api/vapi/tool?shop=purple_kow), so one deployment can
    // serve two shops without either one knowing about the other.
    const shop = tryShop(new URL(req.url).searchParams.get("shop"));
    if (!shop) {
      return say(
        "This number is not configured for a known restaurant. Tell the caller " +
        "someone will pick up, and stop.",
        { configError: true }
      );
    }
    const MENU = shop.menu;

    const action = String(args.action ?? "").toLowerCase().trim();
    const sku = args.sku ? String(args.sku) : "";
    const query = args.query ? String(args.query) : "";
    const qty = Number(args.qty ?? 1) || 1;
    // "unknown" used to normalise to a bare "+", which matched nothing and
    // silently turned every caller into a stranger with no restrictions.
    const phoneRaw = args.phone ? String(args.phone).trim() : "";
    const digits = phoneRaw.replace(/\D/g, "");
    const phone =
      /^(unknown|null|undefined|none|)$/i.test(phoneRaw) || digits.length < 10
        ? null
        : `+${digits}`;

    // Vapi puts the call id in different places depending on which tool shape
    // fired, and the old code collapsed every miss to the literal "web" — so two
    // callers whose bodies lacked an id shared one row, and the second caller
    // inherited the first one's identity, order and Guardian history. Fall back
    // to a per-number key instead of a global one: still stable across the turns
    // of a single call, but never shared between two different phones.
    const asId = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    const call = (inner.call ?? body.call) as Record<string, unknown> | undefined;
    const rawCallId =
      asId(inner.callId) ??
      asId(call?.id) ??
      asId(args.callId) ??
      (digits ? `web_${digits}` : "web");
    // Scope the row to the shop. Golden Dragon keeps its bare ids so existing
    // rows still resolve; anything else is prefixed, so the same callId
    // arriving for two restaurants cannot end up on one ticket.
    const vapiCallId =
      shop.slug === DEFAULT_SHOP ? rawCallId : `${shop.slug}:${rawCallId}`;
    const existing = await findCallByVapiId(vapiCallId);
    const callId = existing?.id ?? (await createCall({ vapiCallId, phone, channel: "phone" }));
    const ctx: RunContext = { callId, phone: phone ?? existing?.caller_phone ?? null, shop };

    // Who this caller turned out to be, on THIS call.
    //
    // Identity from a birthday lives only in the response to the `birthday`
    // call. The `add` that follows is a fresh HTTP request with no memory of
    // it: a caller identified by birthday from an unrecognised phone arrived
    // at the gate as a stranger with no restrictions, and the gate — correctly,
    // given what it was told — allowed the dish. The name is already persisted
    // on the call row, so rehydrate the profile from it before every action.
    // The 22-profile registry belongs to Golden Dragon. A boba shop must not
    // read a Sichuan restaurant's guest book — same building, different
    // business, and greeting a stranger by name off another shop's records is
    // exactly the kind of leak this architecture is supposed to prevent.
    const ownRegistry = shop.slug === "golden_dragon";
    const profile = !ownRegistry
      ? null
      : identifyByPhone(ctx.phone) ??
        (existing?.guest_name
          ? PROFILES.find((p) => p.name === existing.guest_name) ?? null
          : null);

    switch (action) {
      // Caller ID first. It asks the guest for nothing, so it is always worth
      // trying before the desk starts interrogating anyone.
      case "identify": {
        const local = profile;
        if (local) {
          await updateCall(callId, { guest_name: local.name, language: local.language, caller_phone: ctx.phone });
          void doIdentify(ctx); // fills the Ghost CRM panel from memory, in the background
          return say(
            `KNOWN CALLER — do not ask for a birthday. ${greeting(local)} ` +
            `Details for your own use: ${describe(local)}. ` +
            (local.notes.slice(0, 3).join(" ") || ""),
            { known: true, name: local.name, restrictions: local.restrictions }
          );
        }
        const card = await doIdentify(ctx);
        if (card) {
          // Personal memory is scoped to the GUEST, not the restaurant —
          // XTrace ignores `namespace` on search, so a number's ledger is
          // visible from either shop. That is right for allergies, which
          // should follow a person everywhere, and wrong for order history:
          // a boba shop reading out "your usual is the shui zhu niu" is
          // another restaurant's business leaking through. So a shop that
          // does not own this guest gets the safety facts and nothing else.
          const restrictions = card.restrictions.join(", ") || "nothing recorded";
          if (!ownRegistry) {
            return say(
              `Known guest, but their history belongs to another restaurant — ` +
              `do NOT mention past orders or preferences. Must avoid: ${restrictions}. ` +
              `Greet them normally and take the order fresh.`,
              { known: true, restrictions: card.restrictions }
            );
          }
          return say(
            `Known guest: ${card.name ?? card.nameZh}. ` +
            `Must avoid: ${restrictions}. ` +
            card.notes.slice(0, 3).join(" "),
            { known: true }
          );
        }
        return say(
          "UNKNOWN NUMBER. Ask: 'Have you ordered with us before?' If they say yes, ask for " +
          "their date of birth and call this tool again with action=birthday and the date in " +
          "the `query` field. If they say no, take the order normally and do not ask again.",
          { known: false }
        );
      }

      // The second attempt. A birthday is a disambiguator, not a password —
      // when it lands on more than one person the desk asks for a name rather
      // than guessing, because guessing hands a stranger someone's allergies.
      case "birthday":
      case "dob": {
        // The birthday registry is Golden Dragon's. Without this fence, asking
        // the boba shop for "4 March 1988" handed back a Sichuan regular's
        // name, allergies, usual order and notes — and then linked the
        // caller's number to her profile. Fencing `identify` was not enough;
        // this is the same door with a different handle.
        if (!ownRegistry) {
          return say(
            "We don't look guests up by date of birth here. Take the order " +
            "normally and ask about allergies out loud.",
            { matched: false }
          );
        }
        const spoken = query || String(args.birthday ?? args.dob ?? args.date ?? "");
        // The dashboard tool schema only carries action/sku/phone/query, so a
        // name arrives inside `query` alongside the date ("10 Jan 1994, Anchit")
        // rather than in its own field. Feed the whole utterance in as the hint:
        // the date parser ignores the name, and the name matcher ignores the date.
        const nameHint = args.name ? String(args.name) : spoken || undefined;
        const out = identifyByBirthday(spoken, nameHint);

        if (out.status === "unparsed") {
          return say(
            "I didn't catch that date. Ask them to say it as day, month and year — " +
            "for example, the tenth of January nineteen ninety-four.",
            { matched: false }
          );
        }
        if (out.status === "nomatch") {
          return say(
            "No record matches that date of birth. Say: 'I can't find you under that date — " +
            "I'll start a fresh record.' Then take the order normally and stop asking.",
            { matched: false }
          );
        }
        if (out.status === "ambiguous") {
          return say(
            `That date matches ${out.candidates.length} people. Ask for their first name, then ` +
            `call this tool again with action=birthday, the same date in \`query\`, and the name ` +
            `in \`name\`. Do NOT read out any of their details until you know which one it is.`,
            { matched: false, ambiguous: out.candidates.length }
          );
        }

        const p = out.profile;
        if (ctx.phone) linkPhoneToProfile(p, ctx.phone);
        await updateCall(callId, { guest_name: p.name, language: p.language, caller_phone: ctx.phone });
        ctx.guest = {
          phone: ctx.phone ?? p.phone, name: p.name, nameZh: p.name_zh, language: p.language,
          restrictions: p.restrictions as never[], dislikes: [], spice: String(p.spice),
          fulfilment: p.fulfilment, cadence: p.cadence, notes: p.notes,
          orderCount: p.visits, knownSince: p.since, raw: [],
        };
        void doIdentify(ctx);
        return say(
          `MATCHED — this is ${p.name}, born ${sayBirthday(p.birthday)}. ${greeting(p)} ` +
          `${ctx.phone ? `I've linked ${ctx.phone} to them, so we won't ask again. ` : ""}` +
          `Details for your own use: ${describe(p)}. ${p.notes.slice(0, 3).join(" ")}`,
          { matched: true, name: p.name, restrictions: p.restrictions }
        );
      }

      case "specials":
      case "secret_menu": {
        const picks = await doSecretMenu(ctx);
        return say(
          picks.length
            ? picks.map((p) => `${p.nameEn} (${p.nameZh}) — order it by saying ${p.phrase}`).join("; ")
            : "Nothing off-menu tonight; offer from the printed menu."
        );
      }

      // "What do you have?" is a real question and used to get a bad answer:
      // a substring filter that returned nothing whenever the caller phrased it
      // like a person. An empty menu response is what makes the assistant tell
      // people a dish doesn't exist.
      case "menu":
      case "browse": {
        const q = query.trim();
        const listing = (items: typeof MENU) =>
          items.map((m) => `${m.sku}: ${m.name_en} (${m.name_zh}) $${(m.price_cents / 100).toFixed(2)}`).join("; ");

        if (!q || /^(menu|everything|all|what.*(have|got|serve|recommend))/i.test(q)) {
          const listed = MENU.filter((m) => m.available && m.english_listed);
          return say(`Full menu — ${listing(listed)}`);
        }
        // A category or a craving before a dish name: "noodles", "vegetarian",
        // "something not spicy", "chicken".
        const nq = q.toLowerCase();
        const byCategory = MENU.filter(
          (m) => m.available && (m.category.toLowerCase().includes(nq) || nq.includes(m.category.toLowerCase()))
        );
        if (byCategory.length) return say(`${byCategory[0].category} — ${listing(byCategory)}`);

        if (/mild|not spicy|no spice|no heat|less spicy|不辣/i.test(q)) {
          const mild = MENU.filter((m) => m.available && m.base_spice <= 1);
          return say(`Mild options — ${listing(mild)}`);
        }
        if (/spicy|hot|numbing|mala|辣/i.test(q)) {
          const hot = MENU.filter((m) => m.available && m.base_spice >= 4);
          return say(`The hot end — ${listing(hot)}`);
        }

        const r = resolveItem(q, MENU);
        if (r.item && r.confidence !== "fuzzy") {
          const m = r.item;
          return say(`${m.sku}: ${m.name_en} (${m.name_zh}) $${(m.price_cents / 100).toFixed(2)} — ${m.blurb}`);
        }
        const near = r.suggestions.length ? r.suggestions : MENU.filter((m) => m.available).slice(0, 4);
        return say(
          `No exact match for "${q}". Offer these instead, by name: ${listing(near)}. ` +
          `Do NOT tell the caller we have nothing — ask which of these they meant.`
        );
      }

      // The gate. The model is told plainly not to add the item on a refusal.
      case "add":
      case "add_item": {
        // The model sends whatever the caller said — "Kung Pao Chicken", "the
        // kung pao", "宫保鸡丁" — not our sku. Exact-match lookup here was the
        // reason a working system told callers their dish wasn't on the menu.
        const spoken = sku || query || String(args.item ?? args.dish ?? args.name ?? "");
        const r = resolveItem(spoken, MENU);

        if (!r.item) {
          return say(
            `I can't place "${spoken}". Ask which of these they meant: ${didYouMean(r)}. ` +
            `Do NOT say the restaurant doesn't serve it.`
          );
        }
        if (r.confidence === "fuzzy") {
          return say(
            `Not sure whether "${spoken}" means the ${r.item.name_en}. Ask the caller to confirm: ` +
            `"Did you mean the ${r.item.name_en}?" — or offer ${didYouMean(r)}. Do not add anything yet.`,
            { needsConfirmation: true }
          );
        }
        const item = r.item;
        if (!item.available) {
          const alt = MENU.filter((m) => m.available && m.category === item.category).slice(0, 2);
          return say(
            `The ${item.name_en} is 86'd tonight. Say so plainly and offer: ` +
            `${alt.map((m) => m.name_en).join(" or ") || "anything else on the menu"}.`
          );
        }
        // Hand the gate what we know about this caller even when the phone is
        // a stranger's — otherwise a birthday-identified guest is checked as
        // though they had told us nothing.
        if (profile && !ctx.guest) {
          ctx.guest = {
            phone: ctx.phone ?? profile.phone, name: profile.name, nameZh: profile.name_zh,
            language: profile.language, restrictions: profile.restrictions as never[],
            dislikes: [], spice: String(profile.spice), fulfilment: profile.fulfilment,
            cadence: profile.cadence, notes: profile.notes, orderCount: profile.visits,
            knownSince: profile.since, raw: [],
          };
        }
        const v = await doGuardian(ctx, item.sku);
        if (v.verdict === "allow") {
          // item.sku, not the caller's words — doAdd looks the item up again and
          // fails silently on a miss, which would drop the line from the ticket.
          await doAdd(ctx, item.sku, qty);
          return say(`Added ${qty}× ${item.name_en}. Anything else?`, { verdict: v.verdict });
        }
        return say(`DO NOT ADD THIS ITEM. Say this to the caller, in their language: ${v.say}`, {
          verdict: v.verdict,
          blocked: true,
        });
      }

      case "finalize": {
        const mins = Number(args.pickup_minutes ?? args.pickupMinutes ?? 20) || 20;
        await doFinalize(ctx, mins);
        return say(`Order sent to the kitchen. Tell them it'll be about ${mins} minutes.`);
      }

      case "escalate":
        return say("Tell the caller a member of staff will pick up, then stop talking.");

      // An unrecognised action used to be a dead end, which the model reads as
      // "this restaurant can't do that". Try to answer anyway.
      default: {
        if (query || sku) {
          const r = resolveItem(query || sku, MENU);
          if (r.item && r.confidence !== "fuzzy") {
            const m = r.item;
            return say(`${m.name_en} (${m.name_zh}) $${(m.price_cents / 100).toFixed(2)} — ${m.blurb}`);
          }
        }
        return say(
          `Unknown action "${action}". Valid actions: identify, birthday, specials, menu, add, ` +
          `finalize, escalate. Keep talking to the caller normally; do not mention this error.`
        );
      }
    }
  } catch (err) {
    // A blanket "take the order normally" is the right answer for a menu lookup
    // and exactly the wrong one for the gate: an exception thrown anywhere
    // inside an `add` would wave the item through unchecked. Refuse instead.
    const failedAction = attempted;
    const softError = err instanceof Error ? err.message : String(err);

    if (failedAction === "add" || failedAction === "add_item") {
      return say(
        "DO NOT ADD THIS ITEM. Say this to the caller, in their language: I can't check that one " +
        "against your record right now, so I'm not going to tell you it's safe. Please ask at the " +
        "counter before you order it.",
        { verdict: "unconfirmed", blocked: true, softError }
      );
    }
    return say(
      "Something went wrong looking that up. Take the order normally and mention you'll confirm at the counter.",
      { softError }
    );
  }
}

export async function GET(req: Request) {
  const shop = tryShop(new URL(req.url).searchParams.get("shop"));
  if (!shop) {
    return NextResponse.json(
      { error: "Unknown shop", shops: ["golden_dragon", "purple_kow"] },
      { status: 400 }
    );
  }
  const sample = shop.menu.find((m) => m.available) ?? shop.menu[0];
  return NextResponse.json({
    service: "zhanggui single-tool router",
    shop: shop.slug,
    restaurant: shop.restaurant.name,
    actions: ["identify", "birthday", "specials", "menu", "add", "finalize", "escalate"],
    body: { action: "add", sku: sample?.sku, phone: shop.guests[0]?.phone, qty: 1 },
  });
}
