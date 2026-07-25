// Purple Kow 紫牛 — Berkeley bubble tea. Placeholder until the researched
// menu lands; shape matches data/restaurant.ts exactly.
import type { MenuItem, Confirmation, SeedGuest } from "./restaurant";

export const RESTAURANT = {
  id: "purple_kow", name: "Purple Kow", name_zh: "紫牛",
  cuisine: "Bubble tea", opsUserId: "ops_purple_kow", phone: "+14155550200",
} as const;

export const MENU: MenuItem[] = [];
export const CONFIRMATIONS: Confirmation[] = [];
export const KITCHEN_FACTS: string[] = [];
export const GUESTS: SeedGuest[] = [];
