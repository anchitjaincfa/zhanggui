// Scripted callers, unscripted system.
//
// The caller's lines are fixed — that is just the human half of a rehearsed
// demo. Everything the system does in response is real: real scoped searches
// against XTrace, the real deterministic Guardian gate, real order writes.
// Nothing about the verdicts, the citations or the dates is hardcoded here.

export type Action =
  | { kind: "identify" }
  | { kind: "secret_menu" }
  | { kind: "guardian"; sku: string }
  | { kind: "add"; sku: string; qty?: number; modifiers?: string[] }
  | { kind: "finalize"; pickupMinutes: number }
  | { kind: "confirm"; sku: string; allergen: string; present: boolean };

export interface Beat {
  /** Who speaks this beat. `system` beats have no dialogue. */
  who: "caller" | "desk" | "system";
  /** Caller lines are verbatim; desk lines are a fallback if no action produces one. */
  text?: string;
  actions?: Action[];
  /** Presenter note, shown in the console but never spoken. */
  note?: string;
}

export interface Scenario {
  id: string;
  label: string;
  phone: string;
  language: "en" | "zh";
  blurb: string;
  beats: Beat[];
}

export const SCENARIOS: Record<string, Scenario> = {
  // ── The headline run. Unknown-to-the-room caller, hidden allergen, the block.
  mei: {
    id: "mei",
    label: "Mei Lin",
    phone: "+14155550142",
    language: "en",
    blurb: "A regular with a peanut-allergic daughter. Ends in a block with a dated citation.",
    beats: [
      { who: "system", actions: [{ kind: "identify" }], note: "Caller ID resolves against memory before the first word." },
      { who: "desk", text: "Golden Dragon, this is the front desk. Pickup or delivery?" },
      { who: "caller", text: "Pickup please. What's good tonight?" },
      { who: "system", actions: [{ kind: "secret_menu" }], note: "Kitchen capability × this guest's taste memory." },
      { who: "caller", text: "That sounds great. And a kung pao chicken for my daughter." },
      { who: "system", actions: [{ kind: "guardian", sku: "kung_pao_chicken" }], note: "THE BEAT. Guardian intercepts before the order write." },
      { who: "caller", text: "Oh — no, definitely not then. What about the green beans, she's fine with vegetables?" },
      { who: "system", actions: [{ kind: "guardian", sku: "gan_bian_si_ji_dou" }], note: "Reads vegetarian. Carries shrimp paste. This is where it stops looking like keyword matching." },
      { who: "caller", text: "Wow. Okay — the fish, and whatever's safe." },
      { who: "system", actions: [{ kind: "add", sku: "suan_cai_yu" }, { kind: "add", sku: "shui_zhu_niu" }] },
      { who: "system", actions: [{ kind: "finalize", pickupMinutes: 20 }] },
      { who: "desk", text: "That's the suan cai yu and the boiled beef, twenty minutes. See you shortly, Mei." },
    ],
  },

  // ── The short one. Thirty seconds, and the loudest beat in the demo.
  wong: {
    id: "wong",
    label: "王太太 Mrs Wong",
    phone: "+14155550188",
    language: "zh",
    blurb: "An eleven-year regular. Greeted by name, in Mandarin, with the usual already known.",
    beats: [
      { who: "system", actions: [{ kind: "identify" }], note: "Nothing was typed in. This came off her past calls." },
      { who: "desk", text: "王太太！还是老样子吗 — 担担面，不要香菜，多加醋？" },
      { who: "caller", text: "对，老样子。" },
      { who: "system", actions: [{ kind: "guardian", sku: "dan_dan_noodles" }] },
      { who: "system", actions: [{ kind: "add", sku: "dan_dan_noodles", modifiers: ["no cilantro", "extra vinegar"] }] },
      { who: "system", actions: [{ kind: "finalize", pickupMinutes: 15 }] },
      { who: "desk", text: "好的，十五分钟。" },
    ],
  },

  // ── The honest one. Stale evidence, and a system that refuses to certify.
  danny: {
    id: "danny",
    label: "Danny Ortiz",
    phone: "+14155550175",
    language: "en",
    blurb: "Shellfish allergy. Ends on the refusal — the strongest trust moment in the demo.",
    beats: [
      { who: "system", actions: [{ kind: "identify" }] },
      { who: "desk", text: "Golden Dragon, front desk. Pickup or delivery?" },
      { who: "caller", text: "Pickup. Can I get the wonton soup and the mapo tofu?" },
      { who: "system", actions: [{ kind: "guardian", sku: "wonton_soup" }], note: "Dried shrimp in the broth base. Nothing on the menu would tell you." },
      { who: "system", actions: [{ kind: "guardian", sku: "mapo_tofu" }], note: "Nobody has re-checked since January. It refuses to certify." },
      { who: "caller", text: "Fair enough. I'll ask when I get there." },
      { who: "system", actions: [{ kind: "add", sku: "shui_zhu_niu" }] },
      { who: "system", actions: [{ kind: "finalize", pickupMinutes: 20 }] },
      { who: "desk", text: "Boiled beef, twenty minutes. And I'll remember whatever they tell you about the tofu." },
    ],
  },
};

export const scenarioList = () =>
  Object.values(SCENARIOS).map((s) => ({ id: s.id, label: s.label, blurb: s.blurb, beats: s.beats.length }));
