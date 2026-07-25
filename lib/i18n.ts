// Every word an owner reads, in both languages.
//
// Most of MenuSifu's 15,000 restaurants are run by people who do business in
// Chinese. A language toggle is not a nicety here — it decides whether the
// owner can use the product at all. So the dictionary is exhaustive: no
// English leaks through when the toggle says 中文.
//
// The copy rule throughout: name things the way a restaurant owner would.
// Not "Ghost CRM" — "Regulars". Not "Guardian" — "Safety". Not "action
// receipt" — "What we did".

export type Lang = "en" | "zh";

export const T = {
  brand:        { en: "ZHANGGUI",            zh: "掌櫃" },
  tagline:      { en: "Front desk",          zh: "前台" },

  // ── navigation
  navToday:     { en: "Today",               zh: "今天" },
  navCalls:     { en: "Calls",               zh: "來電" },
  navOrders:    { en: "Orders",              zh: "訂單" },
  navGuests:    { en: "Regulars",            zh: "熟客" },
  navSafety:    { en: "Safety",              zh: "安全" },
  navMenu:      { en: "Menu",                zh: "菜單" },
  navKitchen:   { en: "Kitchen",             zh: "後廚" },

  // ── the question each page answers, shown under its title
  askToday:     { en: "Is anything wrong right now?",        zh: "現在有沒有問題？" },
  askCalls:     { en: "Who is on the phone, and what did they say?", zh: "誰在打電話？說了什麼？" },
  askOrders:    { en: "What's cooking right now?",           zh: "現在在煮什麼？" },
  askGuests:    { en: "Who are our regulars, and what do they want?", zh: "我們的熟客是誰？他們要什麼？" },
  askSafety:    { en: "What did we stop someone from eating?",  zh: "我們攔下了什麼？" },
  askMenu:      { en: "What can the kitchen make tonight?",   zh: "今晚廚房能做什麼？" },
  askKitchen:   { en: "What is being cooked?",                zh: "現在在做什麼菜？" },

  // ── status
  onCall:       { en: "On a call",           zh: "通話中" },
  noCall:       { en: "Phone is quiet",      zh: "電話安靜" },
  allGood:      { en: "All good",            zh: "一切正常" },
  needsLook:    { en: "Needs a look",        zh: "需要注意" },
  ringing:      { en: "Ringing",             zh: "來電中" },
  ended:        { en: "Call ended",          zh: "通話結束" },

  // ── safety
  stop:         { en: "Do not serve",        zh: "不要上菜" },
  check:        { en: "Ask the kitchen",     zh: "問一下廚房" },
  safe:         { en: "Safe for this guest", zh: "這位客人可以吃" },
  becauseOf:    { en: "Because of",          zh: "原因" },
  confirmedOn:  { en: "Kitchen confirmed on", zh: "廚房確認日期" },
  timesChecked: { en: "times checked",       zh: "次確認" },
  sayAtCounter: { en: "Tell the guest to ask", zh: "讓客人這樣問" },
  weStopped:    { en: "We stopped",          zh: "我們攔下" },
  noStops:      { en: "Nothing stopped today", zh: "今天沒有攔下任何菜" },

  // ── guests
  avoids:       { en: "Cannot eat",          zh: "不能吃" },
  usualOrder:   { en: "Usually orders",      zh: "常點" },
  visits:       { en: "Times ordered",       zh: "點餐次數" },
  knownFor:     { en: "What we know",        zh: "我們知道的" },
  newGuest:     { en: "New guest",           zh: "新客人" },
  learnedFrom:  { en: "Learned from",        zh: "來源" },
  fromCalls:    { en: "past calls",          zh: "過往來電" },
  noGuests:     { en: "No regulars yet — they build up as people call", zh: "還沒有熟客 — 客人來電後會自動累積" },
  inTheBook:    { en: "Regulars in the book", zh: "名冊裡的熟客" },
  withAvoids:   { en: "Have something they cannot eat", zh: "有東西不能吃" },
  nothingToAvoid:{ en: "Nothing to avoid",   zh: "沒有忌口" },
  birthday:     { en: "Birthday",            zh: "生日" },
  phoneLabel:   { en: "Phone",               zh: "電話" },
  speaks:       { en: "Speaks",              zh: "說" },
  langEn:       { en: "English",             zh: "英文" },
  langZh:       { en: "Chinese",             zh: "中文" },
  heat:         { en: "Heat",                zh: "辣度" },
  spice0:       { en: "No chilli",           zh: "不要辣" },
  spice1:       { en: "Barely spicy",        zh: "微辣" },
  spice2:       { en: "A little spicy",      zh: "小辣" },
  spice3:       { en: "Medium",              zh: "中辣" },
  spice4:       { en: "Hot",                 zh: "大辣" },
  spice5:       { en: "Very hot",            zh: "特辣" },
  takesIt:      { en: "Takes it",            zh: "取餐方式" },
  pickup:       { en: "Collects in person",  zh: "本人自取" },
  delivery:     { en: "Delivered",           zh: "外送" },
  whenTheyOrder:{ en: "When they order",     zh: "什麼時候點餐" },
  orderingSince:{ en: "Ordering since",      zh: "第一次點餐" },

  // ── menu
  offMenu:      { en: "Not on the English menu", zh: "英文菜單上沒有" },
  onMenu:       { en: "On the menu",         zh: "菜單上有" },
  soldOut:      { en: "Sold out",            zh: "賣完了" },
  available:    { en: "Available",           zh: "有供應" },
  contains:     { en: "Contains",            zh: "含有" },
  howToOrder:   { en: "Guests order it by saying", zh: "客人這樣點" },
  markSoldOut:  { en: "Mark sold out",       zh: "標記賣完" },
  markAvailable:{ en: "Put back on",         zh: "恢復供應" },

  // ── kitchen
  ticket:       { en: "Ticket",              zh: "單子" },
  station:      { en: "Station",             zh: "工位" },
  noTickets:    { en: "No tickets yet",      zh: "還沒有單子" },
  pickupIn:     { en: "Pickup in",           zh: "取餐時間" },
  minutes:      { en: "minutes",             zh: "分鐘" },

  // ── orders
  orderStatus:  { en: "Order status",        zh: "訂單狀態" },
  statusTaking: { en: "Taking the order",    zh: "正在點餐" },
  statusInKitchen:{ en: "In the kitchen",    zh: "廚房在做" },
  takingNote:   { en: "Still on the phone. Nothing has gone to the kitchen yet.", zh: "還在電話上，還沒有送進廚房。" },
  inKitchenNote:{ en: "The ticket is with the kitchen.", zh: "單子已經送到廚房。" },
  closedNote:   { en: "The call ended before a ticket was sent.", zh: "通話結束前沒有送出單子。" },
  whatTheyOrdered:{ en: "What they ordered", zh: "點了什麼" },
  nothingOrderedYet:{ en: "No dishes on this order yet", zh: "這張單還沒有菜" },
  orderTotal:   { en: "Order total",         zh: "訂單金額" },
  dishes:       { en: "dishes",              zh: "道菜" },
  notSent:      { en: "Not going to the kitchen", zh: "不會送進廚房" },
  notSentWhy:   { en: "The guest cannot eat these, so we did not send them.", zh: "客人不能吃，所以我們沒有送出去。" },
  notSentLine:  { en: "Not sent to the kitchen", zh: "沒有送進廚房" },
  noOrder:      { en: "No order yet",        zh: "還沒有訂單" },
  noOrderWhy:   { en: "When someone calls and orders, it shows up here.", zh: "有人來電點餐時，訂單會顯示在這裡。" },

  // ── calls
  guestSaid:    { en: "Guest",               zh: "客人" },
  weSaid:       { en: "Front desk",          zh: "前台" },
  noCalls:      { en: "No calls yet today",  zh: "今天還沒有來電" },
  whatWeDid:    { en: "What we did",         zh: "我們做了什麼" },
  duration:     { en: "Length",              zh: "時長" },

  // ── today
  callsToday:   { en: "Calls today",         zh: "今天來電" },
  ordersToday:  { en: "Orders taken",        zh: "接到訂單" },
  stoppedToday: { en: "Unsafe dishes stopped", zh: "攔下不安全菜品" },
  regularsKnown:{ en: "Regulars we know",    zh: "認識的熟客" },
  liveNow:      { en: "Happening now",       zh: "正在發生" },
  quietNow:     { en: "The phone is quiet. Everything is running normally.", zh: "電話很安靜，一切運作正常。" },

  // ── misc
  restaurant:   { en: "Golden Dragon",       zh: "金龍" },
  viewAll:      { en: "See all",             zh: "查看全部" },
  back:         { en: "Back",                zh: "返回" },
  refresh:      { en: "Refresh",             zh: "重新整理" },
  loading:      { en: "Loading…",            zh: "載入中…" },
} as const;

export type Key = keyof typeof T;

export const t = (k: Key, lang: Lang): string => T[k][lang];

/** Allergen names, in words an owner uses — not schema keys. */
export const ALLERGEN_LABEL: Record<string, { en: string; zh: string }> = {
  peanut:       { en: "Peanut",        zh: "花生" },
  shellfish:    { en: "Shellfish",     zh: "貝類海鮮" },
  shrimp:       { en: "Shrimp",        zh: "蝦" },
  shrimp_paste: { en: "Shrimp paste",  zh: "蝦醬" },
  fish_sauce:   { en: "Fish sauce",    zh: "魚露" },
  gluten:       { en: "Wheat / gluten", zh: "麵粉" },
  dairy:        { en: "Dairy",         zh: "奶製品" },
  sesame:       { en: "Sesame",        zh: "芝麻" },
  tree_nut:     { en: "Tree nuts",     zh: "堅果" },
  egg:          { en: "Egg",           zh: "蛋" },
  soy:          { en: "Soy",           zh: "大豆" },
};

export const allergen = (a: string, lang: Lang): string =>
  ALLERGEN_LABEL[a]?.[lang] ?? a.replace(/_/g, " ");

export const STATION_LABEL: Record<string, { en: string; zh: string }> = {
  wok:   { en: "Wok",     zh: "炒鍋" },
  fry:   { en: "Fryer",   zh: "油炸" },
  cold:  { en: "Cold",    zh: "涼菜" },
  steam: { en: "Steam",   zh: "蒸籠" },
  bar:   { en: "Drinks",  zh: "飲料" },
};

export const station = (s: string, lang: Lang): string =>
  STATION_LABEL[s]?.[lang] ?? s;
