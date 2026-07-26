// Guardian, exposed directly.
//
// Two reasons this exists. It lets a judge point at ANY dish for ANY guest and
// watch the gate run live — the strongest answer to "is that hardcoded?". And
// it makes the safety property testable as a matrix rather than by anecdote.
//
//   GET /api/guardian?sku=wonton_soup&phone=%2B14155550175
//   GET /api/guardian?all=1&phone=%2B14155550175      ← every dish at once
//   GET /api/guardian?all=1&shop=purple_kow&phone=…   ← the boba shop
//
// The `shop` parameter is the whole argument for the architecture: the same
// gate, the same code path, a completely different cuisine. Omit it and you get
// Golden Dragon, byte-for-byte as before.

import { NextResponse } from "next/server";
import { guardianCheck } from "@/lib/guardian";
import { tryShop } from "@/lib/shop";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const phone = url.searchParams.get("phone");
  const sku = url.searchParams.get("sku");
  const all = url.searchParams.get("all");
  const shop = tryShop(url.searchParams.get("shop"));
  if (!shop) {
    return NextResponse.json(
      { error: `Unknown shop "${url.searchParams.get("shop")}"`, shops: ["golden_dragon", "purple_kow"] },
      { status: 400 }
    );
  }
  const menu = shop.menu;

  try {
    if (all) {
      // Run every dish for one guest. Concurrency-capped so we don't hammer
      // the memory API with 20 simultaneous searches.
      const out: unknown[] = [];
      const items = [...menu];
      while (items.length) {
        const batch = items.splice(0, 4);
        const verdicts = await Promise.all(
          batch.map((m) => guardianCheck({ guestPhone: phone, sku: m.sku, shop }))
        );
        for (const [i, v] of verdicts.entries()) {
          const item = batch[i];
          // Ground truth: the dish's declared allergens vs the guest's list.
          const shouldFlag = item.allergens.some((a) => v.restricted.includes(a));
          out.push({
            sku: v.sku,
            nameEn: v.nameEn,
            declared: item.allergens,
            restricted: v.restricted,
            verdict: v.verdict,
            shouldFlag,
            // The only genuinely dangerous outcome: we said yes to a dish that
            // contains something this guest cannot eat.
            UNSAFE: shouldFlag && v.verdict === "allow",
            lastConfirmed: v.hazards[0]?.lastConfirmed ?? null,
            confirmations: v.hazards[0]?.confirmations ?? 0,
          });
        }
      }
      const unsafe = out.filter((o) => (o as { UNSAFE: boolean }).UNSAFE);
      return NextResponse.json({
        shop: shop.slug,
        restaurant: shop.restaurant.name,
        phone,
        restricted: (out[0] as { restricted?: string[] })?.restricted ?? undefined,
        total: out.length,
        unsafeCount: unsafe.length,
        unsafe,
        results: out,
      });
    }

    if (!sku || !menu.some((m) => m.sku === sku)) {
      return NextResponse.json({
        hint: "?sku=<sku>&phone=<E.164>[&shop=purple_kow]  or  ?all=1&phone=<E.164>",
        shop: shop.slug,
        restaurant: shop.restaurant.name,
        shops: ["golden_dragon", "purple_kow"],
        guests: shop.guests.map((g) => ({ name: g.name, phone: g.phone })),
        skus: menu.map((m) => ({ sku: m.sku, name: m.name_en, zh: m.name_zh, allergens: m.allergens })),
      });
    }

    const v = await guardianCheck({ guestPhone: phone, sku, shop });
    return NextResponse.json({ shop: shop.slug, ...v });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
