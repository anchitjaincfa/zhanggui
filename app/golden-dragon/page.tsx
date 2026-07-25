// 金龍 Golden Dragon — the restaurant's own public website.
//
// Deliberately not the MenuSifu palette: this is the restaurant's brand, not
// the software's. Lacquer red and gold on warm paper, the way a Sichuan house
// would actually present itself.
//
// Photography is Creative Commons (Openverse), credited in the footer. Only
// five dishes have a genuine match, so the photos live in their own signature
// strip rather than inline in the menu — a photo beside the wrong dish is
// worse than no photo, and a half-photographed grid reads as unfinished.
//
// The phone number is the point of the page. It is the largest thing after the
// name, and it is a tel: link, so a judge can call it straight off the screen.

import type { Metadata } from "next";
import { MENU, RESTAURANT } from "@/data/restaurant";
import credits from "@/data/photo-credits.json";

// Which dish photo sits with which sku.
const SHOT: Record<string, string> = {
  kung_pao_chicken: "/img/kung_pao.jpg",
  dan_dan_noodles: "/img/dan_dan.jpg",
  mapo_tofu: "/img/mapo_tofu.jpg",
  hong_you_chao_shou: "/img/wonton.jpg",
  gan_bian_si_ji_dou: "/img/greens.jpg",
};

export const metadata: Metadata = {
  title: "金龍 Golden Dragon — Sichuan, Berkeley",
  description:
    "Sichuan cooking in Berkeley since 2014. Numbing, sour, and properly hot. Order by phone — we answer every call.",
};

const PHONE_DISPLAY = "(415) 853-9353";
const PHONE_LINK = "+14158539353";

const money = (c: number) => `$${(c / 100).toFixed(2)}`;

const CATEGORY_ORDER = ["Cold", "Poultry", "Beef", "Pork", "Seafood", "Vegetable", "Noodles", "Soup"];

export default function GoldenDragonSite() {
  const listed = MENU.filter((m) => m.english_listed);
  const secret = MENU.filter((m) => !m.english_listed);
  const byCategory = CATEGORY_ORDER.map((c) => ({
    category: c,
    items: listed.filter((m) => m.category === c),
  })).filter((g) => g.items.length);

  return (
    <div className="gd">
      {/* ── hero ────────────────────────────────────────────── */}
      <header className="gd-hero">
        <div className="gd-hero-photo" aria-hidden="true" />
        <div className="gd-wrap">
          <p className="gd-eyebrow">川菜 · SICHUAN · BERKELEY</p>
          <h1 className="gd-mark">金龍</h1>
          <p className="gd-name">Golden Dragon</p>
          <p className="gd-lede">
            Numbing, sour, and properly hot. Cooked the way it is cooked in Chengdu,
            by people who learned it there.
          </p>

          <a className="gd-phone" href={`tel:${PHONE_LINK}`}>
            <span className="gd-phone-label">Order by phone · 電話訂餐</span>
            <span className="gd-phone-num">{PHONE_DISPLAY}</span>
          </a>
          <p className="gd-phone-note">
            We answer every call, in English or 中文. No app, no account.
          </p>
        </div>
      </header>

      {/* ── the menu ────────────────────────────────────────── */}
      <section className="gd-signature" aria-label="Signature dishes">
        <div className="gd-wrap">
          <h2 className="gd-h2">
            招牌菜 <span>What we are known for</span>
          </h2>
          <ul className="gd-sig-list">
            {MENU.filter((m) => SHOT[m.sku]).map((m) => (
              <li key={m.sku} className="gd-sig">
                <img src={SHOT[m.sku]} alt={`${m.name_en} — ${m.name_zh}`} loading="lazy" />
                <p className="gd-sig-zh">{m.name_zh}</p>
                <p className="gd-sig-en">{m.name_en}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <main className="gd-wrap gd-main">
        <section>
          <h2 className="gd-h2">
            菜單 <span>Menu</span>
          </h2>

          {byCategory.map((group) => (
            <div key={group.category} className="gd-group">
              <h3 className="gd-cat">{group.category}</h3>
              <ul className="gd-list">
                {group.items.map((m) => (
                  <li key={m.sku} className="gd-item">
                    <div className="gd-item-head">
                      <span className="gd-zh">{m.name_zh}</span>
                      <span className="gd-dots" aria-hidden="true" />
                      <span className="gd-price">{money(m.price_cents)}</span>
                    </div>
                    <p className="gd-en">
                      {m.name_en}
                      {m.base_spice >= 4 && <span className="gd-hot" title="Very hot">　辣辣辣</span>}
                      {m.base_spice === 3 && <span className="gd-hot" title="Hot">　辣辣</span>}
                    </p>
                    <p className="gd-blurb">{m.blurb}</p>
                    {m.allergens.length > 0 && (
                      <p className="gd-allergen">
                        Contains {m.allergens.map((a) => a.replace(/_/g, " ")).join(", ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {/* ── off-menu ──────────────────────────────────────── */}
        <section className="gd-secret">
          <h2 className="gd-h2 gd-h2-light">
            隱藏菜單 <span>Ask for these</span>
          </h2>
          <p className="gd-secret-lede">
            Not printed on the English menu. The regulars order them anyway —
            now so can you. Say the Chinese, or just point at this page.
          </p>
          <ul className="gd-secret-list">
            {secret.map((m) => (
              <li key={m.sku} className="gd-secret-item">
                <p className="gd-secret-zh">{m.name_zh}</p>
                <p className="gd-secret-en">
                  {m.name_en} <span>{money(m.price_cents)}</span>
                </p>
                <p className="gd-blurb">{m.blurb}</p>
                <p className="gd-say">「{m.order_phrase_zh}」</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── allergies ─────────────────────────────────────── */}
        <section className="gd-note">
          <h2 className="gd-h2">
            過敏 <span>Allergies</span>
          </h2>
          <p>
            Tell us on the phone and we will check before we cook. Some dishes carry
            things the name does not say — the fryer uses peanut oil, and several
            &ldquo;vegetarian&rdquo; dishes are finished with dried shrimp. We would
            rather say <em>we are not sure</em> than guess.
          </p>
        </section>
      </main>

      {/* ── footer ──────────────────────────────────────────── */}
      <footer className="gd-foot">
        <div className="gd-wrap gd-foot-grid">
          <div>
            <p className="gd-foot-h">Hours</p>
            <p>Tue – Sun · 11:30 – 21:30</p>
            <p>Closed Mondays</p>
          </div>
          <div>
            <p className="gd-foot-h">Find us</p>
            <p>2131 University Avenue</p>
            <p>Berkeley, California</p>
          </div>
          <div>
            <p className="gd-foot-h">Order</p>
            <a href={`tel:${PHONE_LINK}`} className="gd-foot-phone">{PHONE_DISPLAY}</a>
            <p>Pickup · 20 minutes</p>
          </div>
        </div>
        <p className="gd-credit">
          Photographs by Bernt Rostad · jules:stonesoup · Andrea_Nguyen · roland · insatiablemunch · Thank You (23 Millions+) views — Creative Commons BY, via Openverse.
        </p>
        <p className="gd-colophon">
          {RESTAURANT.name_zh} {RESTAURANT.name} · Sichuan cooking since 2014
        </p>
      </footer>

      <style>{`
        .gd {
          --lacquer: #9e2a2b;
          --gold:    #c9a227;
          --ink:     #1a1614;
          --ink-2:   #55483f;
          --paper:   #fbf7f0;
          --paper-2: #f4ede1;
          --rule:    #e3d8c6;
          background: var(--paper);
          color: var(--ink);
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
            "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
          min-height: 100vh;
        }
        .gd-wrap { width: min(100% - 2.5rem, 62rem); margin-inline: auto; }

        /* hero */
        .gd-hero {
          background:
            radial-gradient(120% 90% at 50% -10%, #b8383a 0%, var(--lacquer) 45%, #7d1f20 100%);
          color: var(--paper);
          padding: clamp(3.5rem, 9vw, 7rem) 0 clamp(3rem, 7vw, 5rem);
          text-align: center;
          position: relative; overflow: hidden;
        }
        .gd-hero-photo {
          position: absolute; inset: 0;
          background-image: url("/img/hero.jpg");
          background-size: cover; background-position: center 60%;
          opacity: .26; filter: saturate(.85) contrast(1.05);
          mix-blend-mode: luminosity;
        }
        .gd-wrap { position: relative; z-index: 1; }
        .gd-signature { padding: clamp(2.6rem, 6vw, 4rem) 0 0; }
        .gd-sig-list {
          list-style: none; margin: 1.8rem 0 0; padding: 0; display: grid; gap: 1.4rem;
          grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
        }
        .gd-sig img {
          width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block;
          border-radius: 5px; background: var(--paper-2);
        }
        .gd-sig-zh { margin: .7rem 0 0; font-size: 1.2rem; font-weight: 700; }
        .gd-sig-en { margin: .1rem 0 0; font-size: .88rem; color: var(--ink-2); }
        .gd-credit {
          text-align: center; margin: 2.2rem auto 0; max-width: 46rem;
          font-size: .72rem; line-height: 1.6; color: #9a8e7e;
        }
        .gd-hero::after {
          content: ""; position: absolute; inset: 0;
          background-image:
            repeating-linear-gradient(45deg, rgba(201,162,39,.06) 0 2px, transparent 2px 22px);
          pointer-events: none;
        }
        .gd-eyebrow {
          font-size: .72rem; letter-spacing: .34em; font-weight: 700;
          color: var(--gold); margin: 0 0 1.6rem;
        }
        .gd-mark {
          font-size: clamp(5rem, 19vw, 11rem); line-height: .82; margin: 0;
          font-weight: 800; letter-spacing: .04em; color: var(--paper);
          text-shadow: 0 3px 0 rgba(0,0,0,.14);
        }
        .gd-name {
          margin: 1.1rem 0 0; font-size: clamp(1.15rem, 3.4vw, 1.7rem);
          letter-spacing: .42em; text-transform: uppercase; font-weight: 600;
          color: var(--gold);
        }
        .gd-lede {
          margin: 1.6rem auto 0; max-width: 34rem; font-size: 1.06rem;
          line-height: 1.65; color: #f3ddd7; text-wrap: balance;
        }
        .gd-phone {
          display: inline-flex; flex-direction: column; gap: .35rem;
          margin-top: 2.6rem; padding: 1.15rem 2.4rem;
          background: var(--gold); color: #2a1a06; border-radius: 4px;
          text-decoration: none; transition: transform .15s ease, filter .15s ease;
        }
        .gd-phone:hover { transform: translateY(-2px); filter: brightness(1.06); }
        .gd-phone-label { font-size: .68rem; letter-spacing: .22em; font-weight: 700; text-transform: uppercase; }
        .gd-phone-num {
          font-size: clamp(1.7rem, 5.5vw, 2.5rem); font-weight: 800;
          letter-spacing: .02em; font-variant-numeric: tabular-nums;
        }
        .gd-phone-note { margin: .95rem 0 0; font-size: .9rem; color: #edcfc8; }

        /* menu */
        .gd-main { padding: clamp(3rem, 7vw, 5.5rem) 0; }
        .gd-h2 {
          font-size: clamp(1.7rem, 4.5vw, 2.3rem); margin: 0 0 .4rem;
          font-weight: 700; letter-spacing: .02em;
        }
        .gd-h2 span {
          display: inline-block; margin-left: .8rem; font-size: .78rem;
          letter-spacing: .3em; text-transform: uppercase; color: var(--ink-2);
          vertical-align: middle; font-weight: 700;
        }
        .gd-group { margin-top: 2.8rem; }
        .gd-cat {
          font-size: .74rem; letter-spacing: .26em; text-transform: uppercase;
          color: var(--lacquer); font-weight: 700; margin: 0 0 1.1rem;
          padding-bottom: .55rem; border-bottom: 2px solid var(--rule);
        }
        .gd-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 1.9rem;
          grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr)); }
        .gd-item-head { display: flex; align-items: baseline; gap: .6rem; }
        .gd-zh { font-size: 1.45rem; font-weight: 700; letter-spacing: .02em; }
        .gd-dots { flex: 1; border-bottom: 1px dotted var(--rule); transform: translateY(-.25rem); }
        .gd-price { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--ink-2); }
        .gd-en { margin: .2rem 0 0; font-size: 1rem; font-weight: 600; }
        .gd-hot { color: var(--lacquer); font-size: .82rem; letter-spacing: .1em; }
        .gd-blurb { margin: .35rem 0 0; font-size: .93rem; line-height: 1.55; color: var(--ink-2); max-width: 34rem; }
        .gd-allergen {
          margin: .45rem 0 0; font-size: .74rem; letter-spacing: .06em;
          text-transform: uppercase; color: #8a6a2f; font-weight: 700;
        }

        /* off-menu */
        .gd-secret {
          margin-top: clamp(3.5rem, 8vw, 6rem); padding: clamp(2.2rem, 5vw, 3.4rem);
          background: var(--ink); color: var(--paper); border-radius: 6px;
        }
        .gd-h2-light span { color: var(--gold); }
        .gd-secret-lede { margin: .9rem 0 2.2rem; max-width: 40rem; line-height: 1.65; color: #d8cec2; }
        .gd-secret-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 2rem;
          grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr)); }
        .gd-secret-zh { margin: 0; font-size: 1.9rem; font-weight: 700; color: var(--gold); }
        .gd-secret-en { margin: .3rem 0 0; font-weight: 600; }
        .gd-secret-en span { color: #b9ab99; font-weight: 500; margin-left: .4rem; font-variant-numeric: tabular-nums; }
        .gd-secret .gd-blurb { color: #b9ab99; }
        .gd-say {
          margin: .8rem 0 0; padding: .5rem .8rem; font-size: 1.05rem;
          border: 1px dashed rgba(201,162,39,.5); border-radius: 4px;
          display: inline-block; color: var(--paper);
        }

        /* allergies */
        .gd-note { margin-top: clamp(3rem, 7vw, 5rem); }
        .gd-note p { max-width: 44rem; line-height: 1.7; color: var(--ink-2); font-size: 1.02rem; }

        /* footer */
        .gd-foot { background: var(--paper-2); border-top: 3px solid var(--lacquer); padding: 3rem 0 2rem; margin-top: clamp(3rem, 7vw, 5rem); }
        .gd-foot-grid { display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); }
        .gd-foot-grid p { margin: .2rem 0; color: var(--ink-2); }
        .gd-foot-h { font-size: .7rem !important; letter-spacing: .24em; text-transform: uppercase;
          font-weight: 700; color: var(--lacquer) !important; margin-bottom: .6rem !important; }
        .gd-foot-phone { font-size: 1.3rem; font-weight: 800; color: var(--ink); text-decoration: none;
          font-variant-numeric: tabular-nums; display: inline-block; margin-bottom: .3rem; }
        .gd-colophon { text-align: center; margin: 2.6rem 0 0; font-size: .8rem; letter-spacing: .1em; color: #8b7f70; }

        .gd a:focus-visible { outline: 3px solid var(--gold); outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) { .gd * { transition: none !important; } }
      `}</style>
    </div>
  );
}
