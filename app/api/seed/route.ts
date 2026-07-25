// Rebuild the demo's memory state. Idempotent enough to re-run between
// rehearsals: XTrace consolidates repeats rather than duplicating them.
//
// The structural rule that matters (see spec C4): restaurant data is ingested
// under an OPERATOR pseudo-user, never a guest's phone. Otherwise kitchen facts
// pollute a real guest's personal scope and the personal-gate demo goes fuzzy.

import { NextResponse } from "next/server";
import { ingest, KITCHEN_GROUP, ALLERGEN_GROUP } from "@/lib/xtrace";
import { CONFIRMATIONS, GUESTS, KITCHEN_FACTS, MENU, RESTAURANT, bySku } from "@/data/restaurant";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const chunk = <T,>(xs: T[], n: number): T[][] =>
  xs.reduce<T[][]>((acc, x, i) => (i % n ? acc[acc.length - 1].push(x) : acc.push([x]), acc), []);

export async function POST() {
  if (!process.env.XTRACE_API_KEY) {
    return NextResponse.json({ ok: false, error: "XTRACE_API_KEY not set" }, { status: 500 });
  }

  const jobs: Promise<unknown>[] = [];
  const counts = { guests: 0, kitchen: 0, allergen: 0, menu: 0 };

  // ── Guests. Personal scope only. Never group-tagged: their allergies are
  //    health data and the server-side personal gate must be free to hold.
  for (const g of GUESTS) {
    counts.guests += g.facts.length;
    jobs.push(
      ingest({
        messages: [
          { role: "user", content: `Notes about the guest calling from ${g.phone}.` },
          ...g.facts.map((f) => ({ role: "assistant", content: f })),
        ],
        user_id: g.phone,
        conv_id: `seed_guest_${g.phone}`,
        agent_id: "frontdesk",
        namespace: `rest_${RESTAURANT.id}`,
        wait: true,
      })
    );
  }

  // ── Kitchen capability → operator scope + kitchen group.
  counts.kitchen = KITCHEN_FACTS.length;
  jobs.push(
    ingest({
      messages: [
        { role: "user", content: `What can the ${RESTAURANT.name} (${RESTAURANT.name_zh}) kitchen actually make?` },
        ...KITCHEN_FACTS.map((f) => ({ role: "assistant", content: f })),
      ],
      user_id: RESTAURANT.opsUserId,
      conv_id: "seed_kitchen_capability",
      group_ids: KITCHEN_GROUP ? [KITCHEN_GROUP] : undefined,
      namespace: `rest_${RESTAURANT.id}`,
      wait: true,
    })
  );

  // ── The off-menu items themselves, so Secret Menu has something to cite.
  const secret = MENU.filter((m) => !m.english_listed);
  counts.menu = secret.length;
  jobs.push(
    ingest({
      messages: [
        { role: "user", content: `Which ${RESTAURANT.name} dishes are not on the English menu?` },
        ...secret.map((m) => ({
          role: "assistant",
          content:
            `${RESTAURANT.name} makes ${m.name_en} (${m.name_zh}, ${m.pinyin}) but does not list it on the English menu. ` +
            `${m.blurb} To order it, say: ${m.order_phrase_zh}.` +
            (m.weekday_only ? " Weekdays only." : ""),
        })),
      ],
      user_id: RESTAURANT.opsUserId,
      conv_id: "seed_secret_menu",
      group_ids: KITCHEN_GROUP ? [KITCHEN_GROUP] : undefined,
      namespace: `rest_${RESTAURANT.id}`,
      wait: true,
    })
  );

  // ── Allergen confirmations → operator scope + allergen group.
  //    Each carries a date and a source. That date is what Guardian cites.
  counts.allergen = CONFIRMATIONS.length;
  for (const [i, group] of chunk(CONFIRMATIONS, 3).entries()) {
    jobs.push(
      ingest({
        messages: [
          { role: "user", content: `Allergen confirmations recorded at ${RESTAURANT.name}.` },
          ...group.map((c) => {
            const item = bySku(c.sku)!;
            const verb = c.present ? "contains" : "does not contain";
            return {
              role: "assistant",
              content:
                `On ${c.confirmed_on}, ${c.source === "incident" ? "an allergen incident established" : "kitchen staff confirmed"} that ` +
                `${RESTAURANT.name} sku ${c.sku} — ${item.name_en} (${item.name_zh}) — ${verb} ${c.allergen.replace(/_/g, " ")}. ${c.note}`,
            };
          }),
        ],
        user_id: RESTAURANT.opsUserId,
        conv_id: `seed_allergen_${i}`,
        group_ids: ALLERGEN_GROUP ? [ALLERGEN_GROUP] : undefined,
        namespace: `rest_${RESTAURANT.id}`,
        wait: true,
      })
    );
  }

  const settled = await Promise.allSettled(jobs);
  const failed = settled.filter((s) => s.status === "rejected" || s.value === null).length;

  return NextResponse.json({
    ok: failed === 0,
    counts,
    ingests: { total: jobs.length, failed },
    groups: { kitchen: KITCHEN_GROUP, allergen: ALLERGEN_GROUP },
  });
}

export async function GET() {
  return NextResponse.json({
    hint: "POST to rebuild demo memory",
    willSeed: {
      guests: GUESTS.map((g) => `${g.name} ${g.phone} (${g.facts.length} facts)`),
      kitchenFacts: KITCHEN_FACTS.length,
      secretMenu: MENU.filter((m) => !m.english_listed).length,
      confirmations: CONFIRMATIONS.length,
    },
  });
}
