// The engine both mouths share.
//
// A phone call from Vapi and a simulated call from the console run through
// exactly the same code. That is the point of the architecture and it is also
// what makes the demo safe: if the phone dies, the console path is not a
// different, weaker system — it is the same system with a different input.

import { guardianCheck, type GuardianVerdict } from "./guardian";
import { guestCard, secretMenuFor, rememberCall, confirmAllergen, type GuestCard } from "./crm";
import { emit, emitMany, updateCall } from "./store";

import type { Action } from "./scenarios";
import { getShop, type Shop } from "./shop";

export interface RunContext {
  callId: string;
  phone: string | null;
  guest?: GuestCard | null;
  /** Omitted ⇒ Golden Dragon. */
  shop?: Shop;
}

const money = (c: number) => `$${(c / 100).toFixed(2)}`;

/** Identify the caller and spill what we know into the Ghost CRM panel. */
export async function doIdentify(ctx: RunContext): Promise<GuestCard | null> {
  if (!ctx.phone) {
    await emit(ctx.callId, "memory", "Unknown caller", {
      source: "caller ID", scope: "personal", type: "fact",
      text: "No caller ID on this call — treating as a new guest.",
    });
    return null;
  }
  const card = await guestCard(ctx.phone);
  if (!card) {
    await emit(ctx.callId, "memory", "New number", {
      source: "caller ID", scope: "personal", type: "fact",
      text: `${ctx.phone} has never called before. Starting a ledger.`,
    });
    return null;
  }

  await updateCall(ctx.callId, {
    guest_name: card.name ?? card.nameZh,
    language: card.language,
    caller_phone: ctx.phone,
  });

  await emitMany(
    ctx.callId,
    card.raw.slice(0, 10).map((m) => ({
      kind: "memory" as const,
      title: "recalled",
      detail: {
        source: "past calls · tickets", scope: "personal",
        type: String(m.type), text: m.text, memId: m.id,
        score: m.score ?? null,
      },
    }))
  );
  await emit(ctx.callId, "receipt", "guest.identify", {
    tool: "guest.identify",
    args: { phone: ctx.phone },
    result: `${card.name ?? card.nameZh ?? "known guest"} · ${card.restrictions.length} restriction(s) · ${card.raw.length} memories`,
    surface: "Guest card",
  });
  ctx.guest = card;
  return card;
}

export async function doSecretMenu(ctx: RunContext) {
  const picks = await secretMenuFor(ctx.phone, { shop: ctx.shop ?? getShop(null) });
  await emitMany(
    ctx.callId,
    picks.map((p) => ({ kind: "secret_menu" as const, title: p.nameEn, detail: { ...p } }))
  );
  if (picks.length) {
    const top = picks[0];
    await emit(ctx.callId, "transcript", "desk", {
      role: "assistant",
      text:
        `The kitchen has ${top.nameEn} tonight — ${top.nameZh}. It's not on the English menu. ` +
        `If you want to order it at the counter, say: ${top.phrase}`,
    });
    await emit(ctx.callId, "receipt", "menu.lookup", {
      tool: "menu.lookup",
      args: { offMenu: true, guest: ctx.phone },
      result: picks.map((p) => p.sku).join(", "),
      surface: "Secret menu",
    });
  }
  return picks;
}

/** Guardian on the control path: nothing is added until this returns. */
export async function doGuardian(ctx: RunContext, sku: string): Promise<GuardianVerdict> {
  const v = await guardianCheck({
    guestPhone: ctx.phone,
    sku,
    restrictionsHint: ctx.guest?.restrictions,
    shop: ctx.shop ?? getShop(null),
  });

  await emit(ctx.callId, "guardian", v.nameEn, {
    sku: v.sku, nameEn: v.nameEn, nameZh: v.nameZh,
    verdict: v.verdict, say: v.say,
    restricted: v.restricted, hazards: v.hazards, searches: v.searches,
  });
  await emit(ctx.callId, "transcript", "desk", { role: "assistant", text: v.say });
  await emit(ctx.callId, "receipt", "order.add_item", {
    tool: "order.add_item",
    args: { sku, guest: ctx.phone },
    result:
      v.verdict === "block" ? `BLOCKED — ${v.hazards[0]?.allergen} confirmed ${v.hazards[0]?.lastConfirmed ?? "undated"}`
      : v.verdict === "unconfirmed" ? "HELD — evidence stale, refused to certify"
      : "allowed",
    surface: v.verdict === "allow" ? "Order" : "Guardian",
  });
  return v;
}

export async function doAdd(ctx: RunContext, sku: string, qty = 1, modifiers: string[] = []) {
  const item = (ctx.shop ?? getShop(null)).menu.find((m) => m.sku === sku);
  if (!item) return;
  await emit(ctx.callId, "order", item.name_en, {
    sku, nameEn: item.name_en, nameZh: item.name_zh, qty, modifiers,
    blocked: false, priceCents: item.price_cents * qty, station: item.station,
  });
  await emit(ctx.callId, "receipt", "order.add_item", {
    tool: "order.add_item",
    args: { sku, qty, modifiers },
    result: `added · ${money(item.price_cents * qty)}`,
    surface: "Order",
  });
}

export async function doFinalize(ctx: RunContext, pickupMinutes: number) {
  await emit(ctx.callId, "kds", "ticket fired", { pickupMinutes });
  await emit(ctx.callId, "receipt", "order.finalize", {
    tool: "order.finalize",
    args: { pickupMinutes },
    result: "ticket fired to KDS",
    surface: "KDS",
  });
  await updateCall(ctx.callId, { status: "ended", ended_at: new Date().toISOString() });
}

export async function doConfirm(ctx: RunContext, sku: string, allergen: string, present: boolean) {
  const shop = ctx.shop ?? getShop(null);
  const date = new Date().toISOString().slice(0, 10);
  confirmAllergen({ sku, allergen, present, source: "guest asked at the counter", date, shop });
  await emit(ctx.callId, "memory", "confirmation written", {
    source: "guest asked at counter", scope: "allergen", type: "fact",
    text: `${date}: ${shop.menu.find((m) => m.sku === sku)?.name_en} ${present ? "contains" : "does not contain"} ${allergen.replace(/_/g, " ")}.`,
  });
}

export async function runAction(ctx: RunContext, a: Action) {
  switch (a.kind) {
    case "identify": await doIdentify(ctx); return;
    case "secret_menu": await doSecretMenu(ctx); return;
    case "guardian": await doGuardian(ctx, a.sku); return;
    case "add": await doAdd(ctx, a.sku, a.qty, a.modifiers); return;
    case "finalize": await doFinalize(ctx, a.pickupMinutes); return;
    case "confirm": await doConfirm(ctx, a.sku, a.allergen, a.present); return;
  }
}

/** Close the loop: the call itself becomes memory for next time. */
export function closeCall(ctx: RunContext, transcript: { role: string; content: string }[], resolved: boolean) {
  if (!ctx.phone) return;
  rememberCall({ phone: ctx.phone, callId: ctx.callId, transcript, resolved, shop: ctx.shop ?? getShop(null) });
}

export const menuForPrompt = (shop: Shop = getShop(null)) =>
  shop.menu.filter((m) => m.available && m.english_listed)
    .map((m) => `${m.sku} | ${m.name_en} (${m.name_zh}) ${money(m.price_cents)}`)
    .join("\n");

export const restaurantName = (shop: Shop = getShop(null)) => shop.restaurant.name;
