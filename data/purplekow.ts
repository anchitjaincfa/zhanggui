// 紫牛 Purple Kow — the boba world.
// The beat here is different from Golden Dragon's. Nothing in a bubble tea shop
// *looks* like an allergen: it is tea, fruit, and something the industry is
// legally allowed to print the word "non-dairy" on. Items b1_purple_kow_milk_tea,
// taro_iced_milk and c13_fresh_orange_yakult exist so Guardian catches milk
// protein in three drinks whose names, categories and marketing all say otherwise.
//
// PROVENANCE: drink names, categories and the shape of the menu are modelled on the
// real Purple Kow at 2508 Channing Way, Berkeley. Allergen data, confirmations,
// kitchen facts, guests and the phone number are FICTIONAL demo content. The real
// shop publishes no allergen information and has made no statement about creamer.

import type { MenuItem, Confirmation, SeedGuest } from "./restaurant";

export const RESTAURANT = {
  id: "purple_kow",
  name: "Purple Kow",
  name_zh: "紫牛",
  cuisine: "Bubble tea",
  opsUserId: "ops_purple_kow",
  phone: "+15105550188",
} as const;

export const MENU: MenuItem[] = [
  { sku: "a1_purple_kow_iced_tea", name_en: "A1. Purple Kow Iced Tea", name_zh: "紫牛招牌冰茶", pinyin: "zǐ niú zhāo pái bīng chá", category: "Fresh Teas", price_cents: 625, english_listed: true, station: "bar", base_spice: 0, available: true, allergens: [], hidden_allergen_note: "no allergens in the recipe, but it goes through the same shaker as every milk tea on the bar", order_phrase_zh: "我要一杯紫牛招牌冰茶，半糖少冰", blurb: "The house black-tea base, shaken cold. Nothing added but sugar." },
  { sku: "a2_roast_oolong_iced_tea", name_en: "A2. Roast Oolong Iced Tea", name_zh: "炭焙乌龙冰茶", pinyin: "tàn bèi wū lóng bīng chá", category: "Fresh Teas", price_cents: 625, english_listed: true, station: "bar", base_spice: 0, available: true, allergens: [], order_phrase_zh: "我要一杯炭焙乌龙冰茶，无糖", blurb: "Charcoal-roasted oolong, brewed in small batches through the day." },
  { sku: "b1_purple_kow_milk_tea", name_en: "B1. Purple Kow Milk Tea", name_zh: "紫牛奶茶", pinyin: "zǐ niú nǎi chá", category: "Milk Teas", price_cents: 650, english_listed: true, station: "bar", base_spice: 0, available: true, allergens: ["dairy", "soy"], hidden_allergen_note: "the default build uses powdered 'non-dairy' creamer, which contains sodium caseinate — a milk protein — plus soy lecithin. 'Non-dairy' means low-lactose, not milk-free. Only the organic-milk or oat-milk build is honest about being a milk drink, and only the oat build can be made dairy-free.", order_phrase_zh: "我要一杯紫牛奶茶，半糖少冰", blurb: "The signature. Choice of black or green tea, organic milk or oat." },
  { sku: "b2_roast_oolong_milk_tea", name_en: "B2. Roast Oolong Milk Tea", name_zh: "炭焙乌龙奶茶", pinyin: "tàn bèi wū lóng nǎi chá", category: "Milk Teas", price_cents: 650, english_listed: true, station: "bar", base_spice: 0, available: true, allergens: ["dairy", "soy"], hidden_allergen_note: "same creamer base as B1 unless the guest asks for oat milk", order_phrase_zh: "我要一杯炭焙乌龙奶茶，半糖少冰", blurb: "The best-seller. Roasted oolong carries milk better than black tea does." },
  { sku: "b5_hazelnut_milk_tea", name_en: "B5. Hazelnut Milk Tea", name_zh: "榛果奶茶", pinyin: "zhēn guǒ nǎi chá", category: "Milk Teas", price_cents: 650, english_listed: true, station: "bar", base_spice: 0, available: true, allergens: ["dairy", "soy", "tree_nut"], hidden_allergen_note: "hazelnut syrup; the bar cannot confirm whether the syrup is nut extract or artificial flavour, so it is treated as tree nut", order_phrase_zh: "我要一杯榛果奶茶，半糖少冰", blurb: "Milk tea with hazelnut syrup. Sweet even at 50%." },
  { sku: "b8_matcha_milk_green_tea", name_en: "B8. Matcha Milk Green Tea", name_zh: "抹茶牛奶绿", pinyin: "mǒ chá niú nǎi lǜ", category: "Milk Teas", price_cents: 650, english_listed: true, station: "bar", base_spice: 0, available: true, allergens: ["dairy", "soy"], hidden_allergen_note: "the matcha is a pre-sweetened blend that already carries creamer before any milk is poured", order_phrase_zh: "我要一杯抹茶牛奶绿，半糖少冰", blurb: "Ceremonial-grade matcha whisked to order, then milk." },
  { sku: "b11_thai_milk_tea", name_en: "B11. Thai Tea", name_zh: "泰式奶茶", pinyin: "tài shì nǎi chá", category: "Milk Teas", price_cents: 650, english_listed: true, station: "bar", base_spice: 0, available: true, allergens: ["dairy", "soy"], hidden_allergen_note: "listed as the only decaf option, so guests reach for it as 'the safe one'; it is the most dairy-heavy drink on the board — creamer plus sweetened condensed milk", order_phrase_zh: "我要一杯泰式奶茶，半糖少冰", blurb: "Our only decaffeinated tea. Orange, spiced, unapologetically sweet." },
  { sku: "c14_fresh_strawberry_green_tea", name_en: "C14. Fresh Strawberry Green Tea", name_zh: "鲜草莓绿茶", pinyin: "xiān cǎo méi lǜ chá", category: "Fresh Fruit Teas", price_cents: 650, english_listed: true, station: "cold", base_spice: 0, available: true, allergens: [], hidden_allergen_note: "recipe is clean, but it is built in the shared shaker and the strawberry purée sits beside the crema in the same cold well", order_phrase_zh: "我要一杯鲜草莓绿茶，半糖少冰", blurb: "Green tea and house strawberry purée, topped with real fruit bits." },
  { sku: "c13_fresh_orange_yakult", name_en: "C13. Fresh Orange Yakult", name_zh: "鲜橙养乐多", pinyin: "xiān chéng yǎng lè duō", category: "Yakult Teas", price_cents: 675, english_listed: true, station: "cold", base_spice: 0, available: true, allergens: ["dairy"], hidden_allergen_note: "sold as the kid-friendly, caffeine-free, no-tea option made with fresh orange juice — but Yakult is a fermented skim-milk drink and contains milk protein. Parents order this one *because* it sounds like juice.", order_phrase_zh: "我要一杯鲜橙养乐多，正常糖", blurb: "Fresh-squeezed orange and Yakult. No tea, no caffeine. Kids' favourite." },
  { sku: "d2_pudding_boba", name_en: "D2. Iced Milk with Pudding & Boba", name_zh: "布丁波霸鲜奶", pinyin: "bù dīng bō bà xiān nǎi", category: "Purple Kow Iced Milks", price_cents: 750, english_listed: true, station: "bar", base_spice: 0, available: true, allergens: ["dairy", "egg"], hidden_allergen_note: "the pudding is an egg custard set with milk; nothing in the word 'pudding' says egg", order_phrase_zh: "我要一杯布丁波霸鲜奶，半糖少冰", blurb: "The house iced milk over warm boba and a scoop of egg pudding." },
  { sku: "d10_pistachio_matcha_pudding_boba", name_en: "D10. Pistachio & Matcha Pudding & Boba", name_zh: "开心果抹茶布丁鲜奶", pinyin: "kāi xīn guǒ mǒ chá bù dīng xiān nǎi", category: "Purple Kow Iced Milks", price_cents: 750, english_listed: true, station: "bar", base_spice: 0, available: true, allergens: ["dairy", "egg", "tree_nut"], hidden_allergen_note: "pistachio paste is a tree nut and the matcha pudding is the same egg-custard base as D2", order_phrase_zh: "我要一杯开心果抹茶布丁鲜奶，半糖少冰", blurb: "Pistachio iced milk, matcha pudding, boba. Green on green." },
  { sku: "taro_iced_milk", name_en: "Taro Iced Milk", name_zh: "芋头鲜奶", pinyin: "yù tóu xiān nǎi", category: "Purple Kow Iced Milks", price_cents: 750, english_listed: true, station: "bar", base_spice: 0, available: true, allergens: ["dairy", "soy"], hidden_allergen_note: "taro is a root vegetable, but the taro here is an all-in-one powder blend whose second ingredient is milk powder. Swapping to oat milk does NOT make this drink dairy-free — the powder already carried the milk.", order_phrase_zh: "我要一杯芋头鲜奶，加水晶波霸，半糖少冰", blurb: "Purple, thick, faintly nutty. Comes with crystal boba." },
  { sku: "e2_toffee_black_tea_crema", name_en: "E2. Toffee Black Tea Crema", name_zh: "太妃红茶奶盖", pinyin: "tài fēi hóng chá nǎi gài", category: "Tea Cremas", price_cents: 735, english_listed: true, station: "bar", base_spice: 0, available: true, allergens: ["dairy"], hidden_allergen_note: "the tea underneath is dairy-free; the crema cap poured over it is whipped sweetened cream, and it cannot be left off without the drink ceasing to be a crema", order_phrase_zh: "我要一杯太妃红茶奶盖，半糖少冰", blurb: "Iced toffee black tea under a cap of house-made sweetened cream." },
  { sku: "f5_twins_qq", name_en: "F5. Twins QQ Jelly", name_zh: "仙草布丁奶茶", pinyin: "xiān cǎo bù dīng nǎi chá", category: "QQ (Special Jelly Drinks)", price_cents: 750, english_listed: true, station: "bar", base_spice: 0, available: true, allergens: ["dairy", "soy", "egg"], hidden_allergen_note: "two toppings, two problems: pudding brings egg, and the milk-tea base brings creamer. The grass jelly itself is set with starch of unconfirmed origin — gluten status unknown.", order_phrase_zh: "我要一杯仙草布丁奶茶，半糖少冰", blurb: "Milk black tea with both grass jelly and pudding. The chewy one." },
  { sku: "f4_honey_aloe_vera", name_en: "F4. Honey with Aloe Vera", name_zh: "蜂蜜芦荟茶", pinyin: "fēng mì lú huì chá", category: "QQ (Special Jelly Drinks)", price_cents: 750, english_listed: true, station: "cold", base_spice: 0, available: true, allergens: [], hidden_allergen_note: "genuinely clean: brewed tea, honey, aloe from a sealed jar with its own scoop. This is the drink to hand a dairy-allergic guest.", order_phrase_zh: "我要一杯蜂蜜芦荟茶，半糖少冰", blurb: "Honey tea with cool aloe cubes. No milk, no creamer, no cap." },
  { sku: "black_sesame_oolong_latte", name_en: "Black Sesame Oolong Latte", name_zh: "黑芝麻乌龙拿铁", pinyin: "hēi zhī má wū lóng ná tiě", category: "Barista Specials", price_cents: 700, english_listed: false, station: "bar", base_spice: 0, available: true, allergens: ["dairy", "sesame"], hidden_allergen_note: "black sesame paste — sesame is a US major allergen and the paste is ground on the same spare blender jar used for the slushes", order_phrase_zh: "我要一杯黑芝麻乌龙拿铁，半糖少冰", blurb: "Roast oolong and stone-ground black sesame. Ask for it; it isn't on the board." },
  { sku: "mango_sticky_rice_oolong_milk_tea", name_en: "Mango Sticky Rice Oolong Milk Tea", name_zh: "芒果糯米乌龙奶茶", pinyin: "máng guǒ nuò mǐ wū lóng nǎi chá", category: "Barista Specials", price_cents: 700, english_listed: false, station: "bar", base_spice: 0, available: true, allergens: ["dairy", "soy"], hidden_allergen_note: "'sticky rice' is the aroma of the oolong, not an added grain; the dairy comes from the creamer, as always", order_phrase_zh: "我要一杯芒果糯米乌龙奶茶，半糖少冰", blurb: "Glutinous-rice-scented oolong, milk, fresh mango. Summer only, off-menu." },
  { sku: "codys_mango_matcha_moo_moo", name_en: "Cody's Mango Matcha Moo Moo", name_zh: "芒果抹茶奶昔", pinyin: "máng guǒ mǒ chá nǎi xī", category: "Barista Specials", price_cents: 775, english_listed: false, station: "cold", base_spice: 0, available: true, allergens: ["dairy"], hidden_allergen_note: "'Moo Moo' means it is capped with sweetened cream — the name is the only warning", order_phrase_zh: "我要一杯芒果抹茶奶昔，半糖", blurb: "Mango slush, matcha layer, crema cap. Named after the barista who built it." },
  { sku: "jordans_matcha_strawberry_crema", name_en: "Jordan's Matcha Strawberry Crema", name_zh: "抹茶草莓奶盖", pinyin: "mǒ chá cǎo méi nǎi gài", category: "Barista Specials", price_cents: 775, english_listed: false, station: "cold", base_spice: 0, available: true, allergens: ["dairy"], order_phrase_zh: "我要一杯抹茶草莓奶盖，半糖少冰", blurb: "Layered strawberry and matcha under crema. Regulars order it by name." },
  { sku: "shans_strawberry_green_tea_crema", name_en: "Shan's Strawberry Green Tea with Crema", name_zh: "草莓绿茶奶盖", pinyin: "cǎo méi lǜ chá nǎi gài", category: "Barista Specials", price_cents: 750, english_listed: false, station: "cold", base_spice: 0, available: true, allergens: ["dairy"], hidden_allergen_note: "this is C14 with a crema cap; the base is dairy-free and the bar will happily build it without the cap on request", order_phrase_zh: "我要一杯草莓绿茶，加奶盖，半糖少冰", blurb: "The strawberry green tea, but capped. Ask for it without the cap and it's just C14." },
];

export const bySku = (sku: string) => MENU.find((m) => m.sku === sku);


export const CONFIRMATIONS: Confirmation[] = [
  { sku: "b1_purple_kow_milk_tea", allergen: "dairy", present: true, confirmed_on: "2026-06-18", source: "staff", note: "Bar lead read the creamer tub at the June audit: sodium caseinate is the third ingredient. 'Non-dairy creamer' contains milk protein. Only the oat-milk build is dairy-free." },
  { sku: "b1_purple_kow_milk_tea", allergen: "dairy", present: true, confirmed_on: "2026-05-09", source: "incident", note: "A milk-allergic guest was told the drink was 'non-dairy' and reacted within twenty minutes. Root cause: staff read 'non-dairy' on the tub as 'dairy-free'." },
  { sku: "taro_iced_milk", allergen: "dairy", present: true, confirmed_on: "2026-06-18", source: "staff", note: "Taro is an all-in-one powder; the supplier's allergen panel declares skimmed milk powder. Swapping to oat milk does not remove the dairy." },
  { sku: "c13_fresh_orange_yakult", allergen: "dairy", present: true, confirmed_on: "2026-04-30", source: "staff", note: "Yakult is a fermented skim-milk drink. Confirmed off the bottle. The menu calls this the kid-friendly no-tea option, which is exactly why it gets missed." },
  { sku: "d2_pudding_boba", allergen: "egg", present: true, confirmed_on: "2026-05-22", source: "staff", note: "Pudding is an egg custard set with milk, made in-house every morning. Same base for matcha pudding and Tcho chocolate pudding." },
  { sku: "b5_hazelnut_milk_tea", allergen: "tree_nut", present: true, confirmed_on: "2026-03-14", source: "incident", note: "A guest with a hazelnut allergy reacted. The bar now treats every nut-named syrup as tree nut regardless of whether the flavour is natural." },
  { sku: "black_sesame_oolong_latte", allergen: "sesame", present: true, confirmed_on: "2026-06-02", source: "staff", note: "Stone-ground black sesame paste, added by the scoop. Sesame is a declarable major allergen; the drink is off-menu so it never appears on any printed board." },
  { sku: "f5_twins_qq", allergen: "dairy", present: true, confirmed_on: "2026-06-27", source: "order_history", note: "Every Twins QQ ticket in the last quarter was rung in on the milk-tea base; nobody has ever ordered it built on plain tea." },
  // Negative confirmation — the drink Guardian can actually recommend.
  { sku: "f4_honey_aloe_vera", allergen: "dairy", present: false, confirmed_on: "2026-07-06", source: "staff", note: "Confirmed safe for milk allergy: brewed tea, honey, aloe from a sealed jar with a dedicated scoop. No creamer, no crema, no shared topping scoop." },
  // Deliberately stale (>90 days) — this powers Guardian's honest-refusal beat.
  { sku: "a1_purple_kow_iced_tea", allergen: "gluten", present: false, confirmed_on: "2026-02-11", source: "staff", note: "Boba supplier said cassava starch only, no wheat on the line. Nobody has re-checked since February and the supplier changed in April." },
];

// ── Kitchen capability. What this bar can actually do today.
export const KITCHEN_FACTS: string[] = [
  "Purple Kow can build any milk tea on oat milk instead of powdered creamer, which is the only way to make a milk tea genuinely dairy-free — the guest has to ask, because creamer is the default.",
  "Purple Kow will make any crema drink (奶盖) without the cream cap; the tea underneath is unchanged, and for the strawberry green tea that turns it back into a plain C14.",
  "Purple Kow's bar sets sugar at 0%, 25%, 50%, 75% or 100% and ice at none, less, regular or extra, on any drink including the slushes.",
  "Purple Kow makes off-menu barista specials named after the staff who invented them — Cody's, Jordan's, Shan's — and regulars order them by first name without looking at the board.",
  "Purple Kow can swap any topping one-for-one at no charge: boba, crystal boba, grass jelly, lychee jelly, coffee jelly, aloe, red bean, or pudding.",
  "Purple Kow's toppings share one cold well and one wet scoop, so the bar cannot promise a topping-free cup is free of contact with pudding or grass jelly unless the drink is made from a sealed jar.",
];

// ── Guests. The phone number is the identity — no app, no account.

export const GUESTS: SeedGuest[] = [
  {
    phone: "+15105550142",
    name: "Priya Raghavan",
    language: "en",
    facts: [
      "Priya Raghavan has a diagnosed milk-protein allergy and carries an epinephrine auto-injector; she reacts to casein, not lactose.",
      "Priya Raghavan orders the B1 Purple Kow Milk Tea and asks for it 'non-dairy', believing that makes it safe — it does not, because the creamer contains sodium caseinate.",
      "Priya Raghavan can drink the same milk tea safely if it is built on oat milk instead of powdered creamer.",
      "Priya Raghavan must avoid taro, every crema and Moo Moo, all pudding, and anything containing Yakult.",
      "Priya Raghavan reacted here in May 2026 after being told a drink was non-dairy; she has ordered nothing but the honey aloe tea since.",
      "Priya Raghavan orders on her way to the library, usually Thursday evenings.",
    ],
    facts_zh: [
      "普莉雅對牛奶蛋白過敏，隨身帶腎上腺素筆；她過敏的是酪蛋白，不是乳糖。",
      "普莉雅會點紫牛奶茶並要求「非乳製」，以為這樣就安全——其實不然，奶精裡含酪蛋白鈉。",
      "普莉雅如果改用燕麥奶而不是奶精粉來做同一杯奶茶，就可以安心喝。",
      "普莉雅必須避開芋頭、所有奶蓋和奶昔、所有布丁，以及任何含養樂多的飲料。",
      "普莉雅二○二六年五月在店裡出過事，店員跟她說那杯是「非乳製」；之後她只點蜂蜜蘆薈茶。",
      "普莉雅通常在去圖書館的路上點單，多半是星期四晚上。",
    ],
  },
  {
    phone: "+15105550163",
    name: "Marcus Oyelaran",
    language: "en",
    facts: [
      "Marcus Oyelaran is allergic to tree nuts, including hazelnut, almond and pistachio, and treats any nut-named syrup as unsafe.",
      "Marcus Oyelaran must avoid the B5 hazelnut milk tea and the D10 pistachio iced milk, and asks whether the blender jar has been washed since the sesame drink.",
      "Marcus Oyelaran is fine with dairy and usually orders the roast oolong milk tea with extra boba.",
      "Marcus Oyelaran always asks for 25% sugar; he says everything here is sweeter than the number suggests.",
      "Marcus Oyelaran orders for himself and his study group on Sunday afternoons, usually four drinks.",
    ],
    facts_zh: [
      "馬可仕對堅果過敏，包括榛果、杏仁和開心果，任何以堅果命名的糖漿他都當作不安全。",
      "馬可仕不能喝 B5 榛果奶茶和 D10 開心果鮮奶，而且會問果汁機打過黑芝麻之後有沒有洗過。",
      "馬可仕不忌奶製品，通常點炭焙烏龍奶茶，多加波霸。",
      "馬可仕每次都要四分糖；他說這裡的甜度比數字上看起來還要甜。",
      "馬可仕星期天下午幫自己和讀書會訂，通常四杯。",
    ],
  },
  {
    phone: "+15105550119",
    name: "Tiffany Ng",
    name_zh: "吳婷婷",
    language: "zh",
    facts: [
      "Tiffany Ng (吳婷婷) has no allergies at all; she simply orders the same way every single time.",
      "Tiffany Ng always asks for 50% sugar, less ice, and extra boba, and will send a drink back if the sugar is full.",
      "Tiffany Ng orders the Toffee Black Tea Crema and always asks for the crema cap on the side in a small cup.",
      "Tiffany Ng speaks Cantonese on the phone and prefers to be greeted in Chinese.",
      "Tiffany Ng comes in most weekday afternoons between classes and pays with the same card every time.",
      "Tiffany Ng knows the off-menu barista specials by name and orders Shan's without looking at the board.",
    ],
    facts_zh: [
      "吳婷婷完全沒有過敏，她只是每次都點得一模一樣。",
      "吳婷婷固定要半糖、少冰、加波霸，如果做成全糖她會退回去。",
      "吳婷婷都點太妃紅茶奶盖，而且會要求奶蓋另外用小杯裝。",
      "吳婷婷電話裡說廣東話，喜歡別人用中文跟她打招呼。",
      "吳婷婷平日下午下課空檔常來，每次都用同一張卡付款。",
      "吳婷婷記得那些不在菜單上的店員特調，直接報「Shan 的那杯」，不用看菜單。",
    ],
  },
];