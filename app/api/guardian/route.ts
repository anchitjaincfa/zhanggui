// Guardian, exposed directly.
//
// Two reasons this exists. It lets a judge point at ANY dish for ANY guest and
// watch the gate run live — the strongest answer to "is that hardcoded?". And
// it makes the safety property testable as a matrix rather than by anecdote.
//
//   GET /api/guardian?sku=wonton_soup&phone=%2B14155550175
//   GET /api/guardian?all=1&phone=%2B14155550175      ← every dish at once

import { NextResponse } from "next/server";
import { guardianCheck } from "@/lib/guardian";
import { MENU, GUESTS, bySku } from "@/data/restaurant";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const phone = url.searchParams.get("phone");
  const sku = url.searchParams.get("sku");
  const all = url.searchParams.get("all");

  try {
    if (all) {
      // Run every dish for one guest. Concurrency-capped so we don't hammer
      // the memory API with 20 simultaneous searches.
      const out: unknown[] = [];
      const items = [...MENU];
      while (items.length) {
        const batch = items.splice(0, 4);
        const verdicts = await Promise.all(
          batch.map((m) => guardianCheck({ guestPhone: phone, sku: m.sku }))
        );
        for (const [i, v] of verdicts.entries()) {
          const item = batch[i];
          // Ground truth: the dish's declared allergens vs the guest's list.
          const shouldFlag = item.allergens.some((a) => v.restricted.includes(a));
          out.push({
            sku: v.sku,
            nameEn: v.nameEn,
            declared: item.allergens,
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
        phone,
        restricted: (out[0] as { restricted?: string[] })?.restricted ?? undefined,
        total: out.length,
        unsafeCount: unsafe.length,
        unsafe,
        results: out,
      });
    }

    if (!sku || !bySku(sku)) {
      return NextResponse.json({
        hint: "?sku=<sku>&phone=<E.164>  or  ?all=1&phone=<E.164>",
        guests: GUESTS.map((g) => ({ name: g.name, phone: g.phone })),
        skus: MENU.map((m) => ({ sku: m.sku, name: m.name_en, zh: m.name_zh, allergens: m.allergens })),
      });
    }

    const v = await guardianCheck({ guestPhone: phone, sku });
    return NextResponse.json(v);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
