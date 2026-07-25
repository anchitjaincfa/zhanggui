// Hearing a dish name the way a person says it.
//
// This file exists because of a live call that went wrong. The gate, the
// memory, the whole architecture worked — and the caller was still told
// "we don't have that", because the model sent "Kung Pao Chicken" and the
// lookup wanted `kung_pao_chicken`. An exact-match sku lookup is a fine
// database primitive and a terrible telephone.
//
// Nobody says "kung underscore pao underscore chicken". They say "the kung
// pao", "kungpao chicken", "宫保鸡丁", "gong bao ji ding", "the chicken with
// the peanuts". All of those have to land on the same dish, and when none of
// them do, the answer is "did you mean X?" — never "that isn't on the menu",
// which is a lie the restaurant then has to live with.

import type { MenuItem } from "@/data/restaurant";

/** Fold a spoken phrase down to comparable tokens. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // gōng bǎo → gong bao
    .replace(/[&]/g, " and ")
    .replace(/[^a-z0-9一-鿿]+/g, " ")
    .trim();
}

const STOP = new Set([
  "the", "a", "an", "one", "some", "order", "of", "with", "and", "please",
  "i", "ll", "id", "like", "want", "get", "have", "can", "we", "my", "for",
  "dish", "plate", "portion", "large", "small", "side", "extra",
]);

const tokens = (s: string) => normalize(s).split(" ").filter((w) => w && !STOP.has(w));

/** Words a guest uses that are not on the menu card. */
const ALIASES: Record<string, string> = {
  kungpao: "kung_pao_chicken",
  kung_pao: "kung_pao_chicken",
  gongbao: "kung_pao_chicken",
  gong_bao: "kung_pao_chicken",
  dandan: "dan_dan_noodles",
  dan_dan: "dan_dan_noodles",
  mapo: "mapo_tofu",
  ma_po: "mapo_tofu",
  mabo: "mapo_tofu",
  tofu: "mapo_tofu",
  wonton: "wonton_soup",
  wontons: "wonton_soup",
  squid: "salt_pepper_squid",
  calamari: "salt_pepper_squid",
  duck: "tea_smoked_duck",
  eggplant: "yu_xiang_qie_zi",
  aubergine: "yu_xiang_qie_zi",
  greenbeans: "gan_bian_si_ji_dou",
  green_beans: "gan_bian_si_ji_dou",
  stringbeans: "gan_bian_si_ji_dou",
  waterboiled: "shui_zhu_niu",
  boiledbeef: "shui_zhu_niu",
  twicecooked: "hui_guo_rou",
  porkbelly: "hui_guo_rou",
  laziji: "la_zi_ji",
  chilichicken: "la_zi_ji",
  chillichicken: "la_zi_ji",
  bangbang: "bang_bang_ji",
  hotandsour: "suan_la_fen",
  sourandspicy: "suan_la_fen",
  fishfragrant: "yu_xiang_qie_zi",
  shrimp: "walnut_shrimp",
  prawns: "walnut_shrimp",
  fish: "suan_cai_yu",
  noodles: "dan_dan_noodles",
  jelly: "chuan_bei_liang_fen",
  tripe: "fu_qi_fei_pian",
};

export interface Resolution {
  item: MenuItem | null;
  /** How sure we are. `exact` is safe to act on; `fuzzy` should be confirmed. */
  confidence: "exact" | "strong" | "fuzzy" | "none";
  /** Runners-up, so the assistant can ask "did you mean…" instead of refusing. */
  suggestions: MenuItem[];
}

/**
 * Find the dish a caller means. Never returns "no such dish" without also
 * returning something to offer instead.
 */
export function resolveItem(raw: string, menu: MenuItem[]): Resolution {
  const q = (raw ?? "").trim();
  if (!q) return { item: null, confidence: "none", suggestions: menu.filter((m) => m.available).slice(0, 3) };

  // 1. The sku, in any of the shapes a model might send it.
  const skuish = normalize(q).replace(/ /g, "_");
  const direct =
    menu.find((m) => m.sku === q) ??
    menu.find((m) => m.sku === skuish) ??
    menu.find((m) => normalize(m.name_en) === normalize(q)) ??
    menu.find((m) => m.name_zh === q.trim());
  if (direct) return { item: direct, confidence: "exact", suggestions: [] };

  // 2. A word the guest uses for it.
  const aliasHit = ALIASES[skuish] ?? ALIASES[normalize(q).replace(/ /g, "")];
  if (aliasHit) {
    const it = menu.find((m) => m.sku === aliasHit);
    if (it) return { item: it, confidence: "strong", suggestions: [] };
  }

  // 3. Chinese, which has no spaces to tokenise on.
  const zhHit = menu.find((m) => q.includes(m.name_zh) || m.name_zh.includes(q.trim()));
  if (zhHit) return { item: zhHit, confidence: "strong", suggestions: [] };

  // 4. Token overlap across every name we hold, plus the blurb, so "the chicken
  //    with the peanuts" can still land somewhere sensible.
  const qt = tokens(q);
  const scored = menu.map((m) => {
    const hay = [m.name_en, m.sku.replace(/_/g, " "), m.pinyin, m.category, m.blurb].join(" ");
    const ht = new Set(tokens(hay));
    const nameT = new Set(tokens([m.name_en, m.sku.replace(/_/g, " "), m.pinyin].join(" ")));
    let score = 0;
    for (const w of qt) {
      if (nameT.has(w)) score += 3;            // a word from the dish's own name
      else if (ht.has(w)) score += 1;          // a word from its description
      else if ([...nameT].some((n) => n.startsWith(w) || w.startsWith(n))) score += 2;
    }
    if (normalize(m.name_en).includes(normalize(q))) score += 4;
    if (normalize(q).includes(normalize(m.name_en))) score += 4;
    if (!m.available) score -= 2;
    return { m, score };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  const runnerUp = scored[1];
  if (!best || best.score <= 0) {
    return { item: null, confidence: "none", suggestions: menu.filter((m) => m.available).slice(0, 3) };
  }
  // A clear winner we can act on, versus a coin-flip we should ask about.
  const decisive = best.score >= 3 && best.score >= (runnerUp?.score ?? 0) + 2;
  return {
    item: best.m,
    confidence: decisive ? "strong" : "fuzzy",
    suggestions: scored.slice(decisive ? 1 : 0, decisive ? 3 : 3).map((s) => s.m),
  };
}

/** What to read back when we are not sure. */
export const didYouMean = (r: Resolution): string =>
  r.suggestions.slice(0, 3).map((m) => `${m.name_en} (${m.name_zh})`).join(", ");
