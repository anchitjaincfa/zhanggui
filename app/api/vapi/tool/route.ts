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
import { createCall, findCallByVapiId } from "@/lib/store";
import { doGuardian, doIdentify, doSecretMenu, doAdd, doFinalize, type RunContext } from "@/lib/engine";
import { MENU, RESTAURANT, bySku } from "@/data/restaurant";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const say = (result: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ result, ...extra });

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try { body = (await req.json()) as Record<string, unknown>; } catch { /* keep going */ }

  try {
    // The dashboard tool may nest the model's arguments; accept either shape.
    const inner = (body.message ?? body) as Record<string, unknown>;
    const args = (inner.arguments ?? inner.parameters ?? inner) as Record<string, unknown>;

    const action = String(args.action ?? "").toLowerCase().trim();
    const sku = args.sku ? String(args.sku) : "";
    const query = args.query ? String(args.query) : "";
    const qty = Number(args.qty ?? 1) || 1;
    const phoneRaw = args.phone ? String(args.phone) : "";
    const phone = phoneRaw ? (phoneRaw.startsWith("+") ? phoneRaw : `+${phoneRaw.replace(/\D/g, "")}`) : null;

    const vapiCallId = String(
      (inner.callId as string) ??
      ((inner.call as Record<string, unknown>)?.id as string) ??
      "web"
    );
    const existing = await findCallByVapiId(vapiCallId);
    const callId = existing?.id ?? (await createCall({ vapiCallId, phone, channel: "phone" }));
    const ctx: RunContext = { callId, phone: phone ?? existing?.caller_phone ?? null };

    switch (action) {
      case "identify": {
        const card = await doIdentify(ctx);
        if (!card) return say("New caller — nothing on this number yet. Take the order normally.");
        return say(
          `Known guest: ${card.name ?? card.nameZh}. ` +
          `Must avoid: ${card.restrictions.join(", ") || "nothing recorded"}. ` +
          card.notes.slice(0, 3).join(" ")
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

      case "menu": {
        const q = query.toLowerCase();
        const hits = MENU.filter(
          (m) => m.available &&
            (m.name_en.toLowerCase().includes(q) || m.name_zh.includes(query) || m.sku.includes(q))
        ).slice(0, 6);
        return say(
          hits.length
            ? hits.map((m) => `${m.sku}: ${m.name_en} (${m.name_zh}) $${(m.price_cents / 100).toFixed(2)}`).join("; ")
            : "No match on the menu. Ask them to describe it differently."
        );
      }

      // The gate. The model is told plainly not to add the item on a refusal.
      case "add":
      case "add_item": {
        const item = bySku(sku);
        if (!item) return say(`There's no item called ${sku}. Check the menu first.`);
        const v = await doGuardian(ctx, sku);
        if (v.verdict === "allow") {
          await doAdd(ctx, sku, qty);
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

      default:
        return say(
          `Unknown action "${action}". Valid actions: identify, specials, menu, add, finalize, escalate.`
        );
    }
  } catch (err) {
    return say(
      "Something went wrong looking that up. Take the order normally and mention you'll confirm at the counter.",
      { softError: err instanceof Error ? err.message : String(err) }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: "zhanggui single-tool router",
    restaurant: RESTAURANT.name,
    actions: ["identify", "specials", "menu", "add", "finalize", "escalate"],
    body: { action: "add", sku: "kung_pao_chicken", phone: "+14155550142", qty: 1 },
  });
}
