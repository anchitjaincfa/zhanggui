"use client";

// The frame every restaurant page sits in.
//
// Six pages, one question each. An owner should never have to hold two ideas
// at once, and should never meet a word invented by engineers. The language
// toggle is in the top-right because it is the first control a Chinese-first
// owner reaches for, and it must be findable without reading English.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { t, type Lang, type Key } from "@/lib/i18n";

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "en",
  setLang: () => {},
});

export const useLang = () => useContext(LangCtx);
export const useT = () => {
  const { lang } = useLang();
  return { lang, t: (k: Key) => t(k, lang) };
};

const NAV: { href: string; key: Key; icon: React.ReactNode }[] = [
  { href: "/r", key: "navToday", icon: <path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" /> },
  { href: "/r/calls", key: "navCalls", icon: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.8.7a2 2 0 0 1 1.7 2z" /> },
  { href: "/r/guests", key: "navGuests", icon: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" /></> },
  { href: "/r/safety", key: "navSafety", icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /> },
  { href: "/r/menu", key: "navMenu", icon: <><path d="M4 3h16v18H4z" /><path d="M8 8h8M8 12h8M8 16h5" /></> },
  { href: "/r/kitchen", key: "navKitchen", icon: <><path d="M3 11h18" /><path d="M5 11V7a7 7 0 0 1 14 0v4" /><path d="M6 11v10h12V11" /></> },
];

export default function Shell({
  children,
  title,
  ask,
  right,
}: {
  children: React.ReactNode;
  title: Key;
  ask: Key;
  right?: React.ReactNode;
}) {
  const [lang, setLang] = useState<Lang>("en");
  const pathname = usePathname();

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("zg-lang") : null;
    if (saved === "zh" || saved === "en") setLang(saved);
  }, []);
  const change = (l: Lang) => {
    setLang(l);
    try { window.localStorage.setItem("zg-lang", l); } catch { /* private mode */ }
  };

  return (
    <LangCtx.Provider value={{ lang, setLang: change }}>
      <div className="rest flex min-h-screen flex-col lg:flex-row">
        {/* ── rail ─────────────────────────────────────────────── */}
        <nav
          className="flex shrink-0 gap-1 overflow-x-auto border-b px-3 py-2 lg:w-[212px] lg:flex-col lg:gap-0.5 lg:overflow-visible lg:border-b-0 lg:border-r lg:px-3 lg:py-5"
          style={{ borderColor: "var(--line)", background: "var(--card)" }}
        >
          <div className="mb-0 hidden items-baseline gap-2 px-3 pb-6 lg:flex">
            <span className="text-[26px] font-bold leading-none tracking-tight" style={{ color: "var(--ms-amber-deep)" }}>掌櫃</span>
            <span className="text-[11px] font-semibold tracking-[.16em]" style={{ color: "var(--muted)" }}>
              {t("tagline", lang).toUpperCase()}
            </span>
          </div>

          {NAV.map((n) => {
            const active = n.href === "/r" ? pathname === "/r" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className="flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-[15px] font-medium transition"
                style={{
                  background: active ? "var(--ms-amber)" : "transparent",
                  color: active ? "#0a0a0a" : "var(--ink-2)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  {n.icon}
                </svg>
                {t(n.key, lang)}
              </Link>
            );
          })}

          <div className="ml-auto flex items-center lg:ml-0 lg:mt-auto lg:block lg:pt-6">
            <div className="flex rounded-lg p-0.5" style={{ background: "var(--sunk)", border: "1px solid var(--line)" }}>
              {(["en", "zh"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => change(l)}
                  aria-pressed={lang === l}
                  className="flex-1 rounded-md px-3 py-1.5 text-[13px] font-semibold transition"
                  style={{
                    background: lang === l ? "var(--card)" : "transparent",
                    color: lang === l ? "var(--ink)" : "var(--muted)",
                    boxShadow: lang === l ? "var(--shadow)" : "none",
                  }}
                >
                  {l === "en" ? "English" : "中文"}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* ── page ─────────────────────────────────────────────── */}
        <main className="min-w-0 flex-1">
          <header
            className="flex flex-wrap items-end justify-between gap-4 border-b px-6 py-5 lg:px-9 lg:py-7"
            style={{ borderColor: "var(--line)" }}
          >
            <div>
              <h1 className="text-[27px] font-bold leading-tight tracking-tight lg:text-[32px]" style={{ textWrap: "balance" }}>
                {t(title, lang)}
              </h1>
              <p className="mt-1 text-[15px]" style={{ color: "var(--muted)" }}>{t(ask, lang)}</p>
            </div>
            {right}
          </header>
          <div className="px-6 py-6 lg:px-9 lg:py-8">{children}</div>
        </main>
      </div>
    </LangCtx.Provider>
  );
}

/** Shared poller so every page reads the same live state. */
export function useLive<T>(url: string, ms = 2000): { data: T | null; err: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(url, { cache: "no-store" });
        const j = (await r.json()) as T;
        if (alive) { setData(j); setErr(false); }
      } catch {
        if (alive) setErr(true);
      }
    };
    void tick();
    const id = setInterval(tick, ms);
    return () => { alive = false; clearInterval(id); };
  }, [url, ms]);
  return { data, err };
}
