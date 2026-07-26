// Two restaurants, one engine.
//
// Golden Dragon is the demo that works and must not regress, so every entry
// point defaults to it and behaves exactly as before. Purple Kow is additive:
// you get it only by asking for it with ?shop=purple_kow. Nothing about the
// Sichuan path changes unless that parameter is present.
//
// The bet worth making here is that the allergen argument is not about
// Sichuan food at all. A bubble tea shop has its own hidden ingredient —
// "non-dairy" creamer is built on sodium caseinate, a milk protein — and the
// same gate catches it without a line of new logic.

import * as GoldenDragon from "@/data/restaurant";
import * as PurpleKow from "@/data/purplekow";
import type { Allergen, MenuItem, Confirmation, SeedGuest } from "@/data/restaurant";

export interface Shop {
  slug: string;
  restaurant: {
    id: string; name: string; name_zh: string; cuisine: string;
    opsUserId: string; phone: string;
  };
  menu: MenuItem[];
  confirmations: Confirmation[];
  kitchenFacts: string[];
  guests: SeedGuest[];
  /** Group ids differ per shop so one restaurant never reads another's memory. */
  kitchenGroupEnv: string;
  allergenGroupEnv: string;
}

const GOLDEN: Shop = {
  slug: "golden_dragon",
  restaurant: GoldenDragon.RESTAURANT,
  menu: GoldenDragon.MENU,
  confirmations: GoldenDragon.CONFIRMATIONS,
  kitchenFacts: GoldenDragon.KITCHEN_FACTS,
  guests: GoldenDragon.GUESTS,
  kitchenGroupEnv: "ZG_KITCHEN_GROUP",
  allergenGroupEnv: "ZG_ALLERGEN_GROUP",
};

const PURPLE: Shop = {
  slug: "purple_kow",
  restaurant: PurpleKow.RESTAURANT,
  menu: PurpleKow.MENU,
  confirmations: PurpleKow.CONFIRMATIONS,
  kitchenFacts: PurpleKow.KITCHEN_FACTS,
  guests: PurpleKow.GUESTS,
  kitchenGroupEnv: "PK_KITCHEN_GROUP",
  allergenGroupEnv: "PK_ALLERGEN_GROUP",
};

export const SHOPS: Record<string, Shop> = {
  golden_dragon: GOLDEN,
  purple_kow: PURPLE,
  // friendly aliases, so a URL can say ?shop=boba
  gd: GOLDEN,
  boba: PURPLE,
  pk: PURPLE,
};

export const DEFAULT_SHOP = "golden_dragon";

/** Resolve a shop. NO parameter means Golden Dragon; an unrecognised one is an
 *  error, not a fallback.
 *
 *  This used to degrade a typo to the known-good demo, which sounded friendly
 *  and was actually a data-exposure bug: `?shop=purple_ko` quietly answered
 *  with the Sichuan restaurant's menu, guest phone list and identity to someone
 *  who had plainly asked for the other business. Absent means default; wrong
 *  means wrong. */
export function getShop(slug?: string | null): Shop {
  if (slug === undefined || slug === null || slug.trim() === "") return GOLDEN;
  const hit = SHOPS[slug.toLowerCase().trim()];
  if (!hit) throw new UnknownShopError(slug);
  return hit;
}

export class UnknownShopError extends Error {
  constructor(public readonly slug: string) {
    super(`Unknown shop "${slug}". Known: ${Object.keys(SHOPS).join(", ")}`);
    this.name = "UnknownShopError";
  }
}

/** Never throws — used where a bad URL should not 500. */
export function tryShop(slug?: string | null): Shop | null {
  try { return getShop(slug); } catch { return null; }
}

export function shopFromRequest(req: Request): Shop {
  return getShop(new URL(req.url).searchParams.get("shop"));
}

/** This shop's memory groups, and only this shop's. Callers must NOT fall back
 *  to the Golden Dragon constants when these are empty: an unconfigured Purple
 *  Kow would then read — and write — the Sichuan restaurant's allergen ledger,
 *  which is the exact failure the registry exists to prevent. Empty means
 *  "no group", and the gate treats that as knowing nothing. */
export const groupsFor = (shop: Shop) => ({
  kitchen: process.env[shop.kitchenGroupEnv] || "",
  allergen: process.env[shop.allergenGroupEnv] || "",
});

export const bySkuIn = (shop: Shop, sku: string): MenuItem | undefined =>
  shop.menu.find((m) => m.sku === sku);

/**
 * The memory scope for one guest at one restaurant.
 *
 * XTrace's personal gate keys on `user_id`, and `namespace` is ignored on
 * search — verified against the live API — so a bare phone number is a single
 * global scope that every restaurant can read. That is wrong for a guest book:
 * a boba shop has no business knowing what someone orders at a Sichuan
 * restaurant.
 *
 * Golden Dragon keeps the bare phone so the profiles already seeded under it
 * still resolve; every other shop is prefixed. The prefix is the isolation.
 */
export const scopedUserId = (shop: Shop, phone: string): string =>
  shop.slug === DEFAULT_SHOP ? phone : `${shop.slug}:${phone}`;

/**
 * The one thing that is deliberately NOT scoped.
 *
 * An allergy is a fact about a person, not about a restaurant, and a guest who
 * told one business they carry an EpiPen should not have to tell the next one
 * before it can hurt them. So safety reads also consult the bare phone scope —
 * and only ever extract restrictions from it, never history or preferences.
 */
export const safetyScopeId = (phone: string): string => phone;

export type { Allergen, MenuItem, Confirmation, SeedGuest };
