// 金龍 Golden Dragon — the seed world.
// Items 9, 15, 16 exist specifically so Guardian catches allergens a menu
// would never list: shrimp in the wonton base, shrimp paste in the
// "vegetarian" green beans. That is the beat where it stops looking like
// keyword matching.

export type Allergen =
  | "peanut" | "shellfish" | "shrimp" | "fish_sauce" | "shrimp_paste"
  | "gluten" | "dairy" | "sesame" | "tree_nut" | "egg" | "soy";

export type Station = "wok" | "fry" | "cold" | "bar" | "steam";

export interface MenuItem {
  sku: string;
  name_en: string;
  name_zh: string;
  pinyin: string;
  category: string;
  price_cents: number;
  english_listed: boolean; // false ⇒ Secret Menu
  station: Station;
  base_spice: 0 | 1 | 2 | 3 | 4 | 5;
  available: boolean; // 86 flag
  weekday_only?: boolean;
  allergens: Allergen[];
  hidden_allergen_note?: string;
  order_phrase_zh: string;
  blurb: string;
}

export const RESTAURANT = {
  id: "golden_dragon",
  name: "Golden Dragon",
  name_zh: "金龍",
  cuisine: "Sichuan",
  opsUserId: "ops_golden_dragon",
  phone: "+14155550100",
} as const;

export const MENU: MenuItem[] = [
  { sku: "kung_pao_chicken", name_en: "Kung Pao Chicken", name_zh: "宫保鸡丁", pinyin: "gōng bǎo jī dīng", category: "Poultry", price_cents: 1650, english_listed: true, station: "fry", base_spice: 3, available: true, allergens: ["peanut"], hidden_allergen_note: "fried in peanut oil", order_phrase_zh: "我要一个宫保鸡丁", blurb: "Diced chicken, dried chilli, Sichuan pepper, peanuts." },
  { sku: "suan_cai_yu", name_en: "Pickled Mustard Green Fish", name_zh: "酸菜鱼", pinyin: "suān cài yú", category: "Seafood", price_cents: 2850, english_listed: false, station: "wok", base_spice: 2, available: true, weekday_only: true, allergens: [], order_phrase_zh: "我要一个酸菜鱼，中辣", blurb: "Sour pickled greens, white fish, numbing broth. Black cod on weekdays." },
  { sku: "dan_dan_noodles", name_en: "Dan Dan Noodles", name_zh: "担担面", pinyin: "dàn dàn miàn", category: "Noodles", price_cents: 1200, english_listed: true, station: "wok", base_spice: 3, available: true, allergens: ["peanut", "sesame", "gluten"], order_phrase_zh: "我要一个担担面", blurb: "Sesame, chilli oil, minced pork, preserved vegetable." },
  { sku: "salt_pepper_squid", name_en: "Salt & Pepper Squid", name_zh: "椒盐鱿鱼", pinyin: "jiāo yán yóu yú", category: "Seafood", price_cents: 1850, english_listed: true, station: "fry", base_spice: 1, available: true, allergens: ["shellfish", "gluten"], order_phrase_zh: "我要一个椒盐鱿鱼", blurb: "Crisp squid, white pepper, fried garlic and chilli." },
  { sku: "mapo_tofu", name_en: "Mapo Tofu", name_zh: "麻婆豆腐", pinyin: "má pó dòu fu", category: "Vegetable", price_cents: 1450, english_listed: true, station: "wok", base_spice: 4, available: true, allergens: ["soy"], order_phrase_zh: "我要一个麻婆豆腐", blurb: "Silken tofu, fermented bean, numbing Sichuan pepper." },
  { sku: "shui_zhu_niu", name_en: "Boiled Beef in Chilli Oil", name_zh: "水煮牛肉", pinyin: "shuǐ zhǔ niú ròu", category: "Beef", price_cents: 2250, english_listed: true, station: "wok", base_spice: 5, available: true, allergens: [], order_phrase_zh: "我要一个水煮牛肉", blurb: "Sliced beef poached in chilli broth, blanketed in dried chilli." },
  { sku: "fu_qi_fei_pian", name_en: "Beef & Tripe in Chilli", name_zh: "夫妻肺片", pinyin: "fū qī fèi piàn", category: "Cold", price_cents: 1550, english_listed: false, station: "cold", base_spice: 3, available: true, allergens: ["peanut", "sesame"], order_phrase_zh: "我要一个夫妻肺片", blurb: "The real one. Beef shin and tripe, chilli oil, crushed peanut." },
  { sku: "walnut_shrimp", name_en: "Walnut Shrimp", name_zh: "核桃虾", pinyin: "hé táo xiā", category: "Seafood", price_cents: 2450, english_listed: true, station: "fry", base_spice: 0, available: true, allergens: ["shellfish", "shrimp", "tree_nut", "dairy"], order_phrase_zh: "我要一个核桃虾", blurb: "Crisp prawns, candied walnuts, sweet mayonnaise glaze." },
  { sku: "gan_bian_si_ji_dou", name_en: "Dry-Fried Green Beans", name_zh: "干煸四季豆", pinyin: "gān biān sì jì dòu", category: "Vegetable", price_cents: 1350, english_listed: true, station: "wok", base_spice: 2, available: true, allergens: ["shrimp_paste"], hidden_allergen_note: "reads vegetarian; the wok base carries dried shrimp paste", order_phrase_zh: "我要一个干煸四季豆", blurb: "Blistered green beans, minced pork, preserved mustard." },
  { sku: "hui_guo_rou", name_en: "Twice-Cooked Pork", name_zh: "回锅肉", pinyin: "huí guō ròu", category: "Pork", price_cents: 1850, english_listed: true, station: "wok", base_spice: 3, available: true, allergens: ["soy"], order_phrase_zh: "我要一个回锅肉", blurb: "Pork belly boiled then seared with leek and broad-bean paste." },
  { sku: "la_zi_ji", name_en: "Chongqing Chilli Chicken", name_zh: "辣子鸡", pinyin: "là zǐ jī", category: "Poultry", price_cents: 1950, english_listed: true, station: "fry", base_spice: 5, available: true, allergens: ["gluten"], order_phrase_zh: "我要一个辣子鸡", blurb: "Hunt for the chicken in a mountain of dried chilli." },
  { sku: "kou_shui_ji", name_en: "Mouthwatering Chicken", name_zh: "口水鸡", pinyin: "kǒu shuǐ jī", category: "Cold", price_cents: 1650, english_listed: false, station: "cold", base_spice: 3, available: true, allergens: ["peanut", "sesame"], order_phrase_zh: "我要一个口水鸡", blurb: "Poached chicken under red oil, peanut, and Sichuan pepper." },
  { sku: "yu_xiang_qie_zi", name_en: "Fish-Fragrant Aubergine", name_zh: "鱼香茄子", pinyin: "yú xiāng qié zi", category: "Vegetable", price_cents: 1550, english_listed: true, station: "wok", base_spice: 2, available: true, allergens: ["soy", "fish_sauce"], hidden_allergen_note: "no fish in the name's sense, but the sauce carries fish sauce", order_phrase_zh: "我要一个鱼香茄子", blurb: "Aubergine braised in the sweet-sour-spicy 'fish fragrant' sauce." },
  { sku: "chuan_bei_liang_fen", name_en: "Chilled Mung Bean Jelly", name_zh: "川北凉粉", pinyin: "chuān běi liáng fěn", category: "Cold", price_cents: 1050, english_listed: false, station: "cold", base_spice: 2, available: true, allergens: ["sesame"], order_phrase_zh: "我要一个川北凉粉", blurb: "Cold, slippery, garlicky. What the staff eat in summer." },
  { sku: "wonton_soup", name_en: "Wonton Soup", name_zh: "馄饨汤", pinyin: "hún tún tāng", category: "Soup", price_cents: 1150, english_listed: true, station: "steam", base_spice: 0, available: true, allergens: ["shrimp", "gluten", "egg"], hidden_allergen_note: "the wonton filling and the broth base both carry dried shrimp", order_phrase_zh: "我要一个馄饨汤", blurb: "Pork and shrimp wontons in clear broth." },
  { sku: "xo_green_beans", name_en: "XO Green Beans", name_zh: "XO酱四季豆", pinyin: "XO jiàng sì jì dòu", category: "Vegetable", price_cents: 1650, english_listed: false, station: "wok", base_spice: 2, available: true, allergens: ["shrimp", "shellfish"], hidden_allergen_note: "XO sauce is built on dried scallop and shrimp", order_phrase_zh: "我要一个XO酱四季豆", blurb: "Green beans in house XO. Not on the English menu." },
  { sku: "tea_smoked_duck", name_en: "Tea-Smoked Duck", name_zh: "樟茶鸭", pinyin: "zhāng chá yā", category: "Poultry", price_cents: 3200, english_listed: false, station: "steam", base_spice: 1, available: true, allergens: [], order_phrase_zh: "我要半只樟茶鸭", blurb: "Camphor and tea smoked, steamed, then crisped. Order half." },
  { sku: "hong_you_chao_shou", name_en: "Wontons in Chilli Oil", name_zh: "红油抄手", pinyin: "hóng yóu chāo shǒu", category: "Soup", price_cents: 1250, english_listed: true, station: "steam", base_spice: 3, available: true, allergens: ["shrimp", "gluten", "egg"], order_phrase_zh: "我要一个红油抄手", blurb: "The same wontons, but drowned in red oil and vinegar." },
  { sku: "suan_la_fen", name_en: "Hot & Sour Sweet Potato Noodles", name_zh: "酸辣粉", pinyin: "suān là fěn", category: "Noodles", price_cents: 1150, english_listed: true, station: "wok", base_spice: 4, available: true, allergens: ["peanut", "soy"], order_phrase_zh: "我要一个酸辣粉", blurb: "Slippery sweet-potato noodles, vinegar heat, fried soybean." },
  { sku: "bang_bang_ji", name_en: "Bang Bang Chicken", name_zh: "棒棒鸡", pinyin: "bàng bàng jī", category: "Cold", price_cents: 1450, english_listed: true, station: "cold", base_spice: 2, available: true, allergens: ["peanut", "sesame"], order_phrase_zh: "我要一个棒棒鸡", blurb: "Shredded chicken, sesame paste, chilli oil." },
];

export const bySku = (sku: string) => MENU.find((m) => m.sku === sku);

// ── Allergen confirmations. Dated and attributed: this is what Guardian cites.
export interface Confirmation {
  sku: string;
  allergen: Allergen;
  present: boolean;
  confirmed_on: string; // ISO date
  source: "staff" | "incident" | "order_history";
  note: string;
}

export const CONFIRMATIONS: Confirmation[] = [
  { sku: "kung_pao_chicken", allergen: "peanut", present: true, confirmed_on: "2026-03-03", source: "staff", note: "Kitchen staff confirmed the fryer uses peanut oil for this dish." },
  { sku: "kung_pao_chicken", allergen: "peanut", present: true, confirmed_on: "2026-03-03", source: "incident", note: "A guest with a peanut allergy reacted after ordering this dish." },
  { sku: "kung_pao_chicken", allergen: "peanut", present: true, confirmed_on: "2026-06-11", source: "staff", note: "Re-confirmed at the June kitchen audit: still peanut oil." },
  { sku: "gan_bian_si_ji_dou", allergen: "shrimp_paste", present: true, confirmed_on: "2026-05-20", source: "staff", note: "Reads vegetarian on the menu, but the wok base carries dried shrimp paste." },
  { sku: "wonton_soup", allergen: "shrimp", present: true, confirmed_on: "2026-04-02", source: "staff", note: "Both the wonton filling and the broth base carry dried shrimp." },
  { sku: "xo_green_beans", allergen: "shrimp", present: true, confirmed_on: "2026-05-20", source: "staff", note: "House XO sauce is built on dried scallop and dried shrimp." },
  { sku: "suan_cai_yu", allergen: "peanut", present: false, confirmed_on: "2026-06-11", source: "staff", note: "Cooked in a separate wok with soybean oil. No peanut contact." },
  { sku: "walnut_shrimp", allergen: "tree_nut", present: true, confirmed_on: "2026-02-28", source: "staff", note: "Candied walnuts are folded through at the pass." },
  // Deliberately stale (>90 days) — this powers Guardian's honest-refusal beat.
  { sku: "mapo_tofu", allergen: "peanut", present: false, confirmed_on: "2026-01-15", source: "staff", note: "Believed peanut-free, but nobody has re-checked since January." },
];

// ── Kitchen capability. What this kitchen can actually do tonight.
export const KITCHEN_FACTS: string[] = [
  "Golden Dragon can make suan cai yu (酸菜鱼) with black cod instead of tilapia on weekdays, when the fish delivery arrives fresh.",
  "Golden Dragon will make tea-smoked duck (樟茶鸭) as a half portion if the guest asks, even though the menu only lists whole.",
  "Golden Dragon's chef will adjust numbing (麻) separately from heat (辣) on any wok dish if the guest asks for it.",
  "Golden Dragon keeps XO green beans (XO酱四季豆) off the English menu, but makes them nightly for Chinese-speaking regulars.",
  "Golden Dragon's cold station makes fu qi fei pian (夫妻肺片) the traditional way with beef shin and tripe, not the Americanised version.",
  "Golden Dragon staff eat chuan bei liang fen (川北凉粉) in summer; it is made fresh daily but never listed in English.",
];

// ── Guests. The phone number is the identity — no app, no account.
export interface SeedGuest {
  phone: string;
  name: string;
  name_zh?: string;
  language: "en" | "zh";
  facts: string[];
}

export const GUESTS: SeedGuest[] = [
  {
    phone: "+14155550142",
    name: "Mei Lin",
    language: "en",
    facts: [
      "Mei Lin's daughter has a severe peanut allergy and cannot eat anything cooked in peanut oil.",
      "Mei Lin orders for four people, usually including one child.",
      "Mei Lin prefers pickup and usually arrives about ten minutes later than she says.",
      "Mei Lin likes sour and numbing flavours and dislikes anything sweet.",
      "Mei Lin sent back a dish in March for being too sweet; she now avoids sweet-glazed dishes.",
      "Mei Lin speaks English on the phone but reads the Chinese menu.",
    ],
  },
  {
    phone: "+14155550188",
    name: "Mrs Wong",
    name_zh: "王太太",
    language: "zh",
    facts: [
      "Mrs Wong (王太太) always orders the same thing: dan dan noodles with no cilantro and extra vinegar.",
      "Mrs Wong calls every other Friday at about 6:40 in the evening.",
      "Mrs Wong speaks Mandarin on the phone and prefers to be greeted in Mandarin.",
      "Mrs Wong always collects in person and pays cash.",
      "Mrs Wong has been a Golden Dragon regular for eleven years.",
    ],
  },
  {
    phone: "+14155550175",
    name: "Danny Ortiz",
    language: "en",
    facts: [
      "Danny Ortiz is allergic to shellfish and shrimp, including dried shrimp and shrimp paste.",
      "Danny Ortiz is vegetarian on weekdays but eats meat at weekends.",
      "Danny Ortiz likes very high heat and always asks for the spiciest option.",
      "Danny Ortiz orders on his way home from work, usually about 7pm on a Tuesday.",
    ],
  },
];
