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

/** Resolve a shop. Anything unrecognised falls back to Golden Dragon, so a
 *  typo in a URL degrades to the known-good demo rather than an error page. */
export function getShop(slug?: string | null): Shop {
  if (!slug) return GOLDEN;
  return SHOPS[slug.toLowerCase().trim()] ?? GOLDEN;
}

export function shopFromRequest(req: Request): Shop {
  try {
    return getShop(new URL(req.url).searchParams.get("shop"));
  } catch {
    return GOLDEN;
  }
}

export const groupsFor = (shop: Shop) => ({
  kitchen: process.env[shop.kitchenGroupEnv] || "",
  allergen: process.env[shop.allergenGroupEnv] || "",
});

export const bySkuIn = (shop: Shop, sku: string): MenuItem | undefined =>
  shop.menu.find((m) => m.sku === sku);

export type { Allergen, MenuItem, Confirmation, SeedGuest };
