"use client";

import type { ReactNode } from "react";

/* ── panel shell ───────────────────────────────────────────────────── */

export function Panel({
  label,
  zh,
  accent = "text-muted",
  right,
  children,
  className = "",
  bodyClassName = "",
}: {
  label: string;
  zh?: string;
  accent?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`zg-panel flex min-h-0 flex-col ${className}`}>
      <header className="flex shrink-0 items-baseline gap-2.5 border-b border-line px-3.5 py-2">
        <h2
          className={`mono text-[10.5px] font-semibold tracking-[0.22em] uppercase ${accent}`}
        >
          {label}
        </h2>
        {zh ? <span className="zh text-[13px] text-dim">{zh}</span> : null}
        <div className="ml-auto flex items-center gap-2">{right}</div>
      </header>
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

/* ── small parts ───────────────────────────────────────────────────── */

export function Chip({
  children,
  className = "",
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`mono inline-flex items-center gap-1 rounded-[4px] border px-1.5 py-[2px] text-[9.5px] font-semibold tracking-[0.14em] uppercase whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
}

export function Meta({ children }: { children: ReactNode }) {
  return (
    <span className="mono text-[10px] tracking-[0.16em] text-dim uppercase">
      {children}
    </span>
  );
}

export function Empty({
  glyph,
  line,
  sub,
}: {
  glyph?: string;
  line: string;
  sub?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-8 text-center">
      {glyph ? (
        <div className="zh-hero zg-breathe text-[34px] text-line2 select-none">
          {glyph}
        </div>
      ) : null}
      <p className="mono text-[10.5px] tracking-[0.2em] text-dim uppercase">
        {line}
      </p>
      {sub ? <p className="max-w-[30ch] text-[11.5px] text-dim">{sub}</p> : null}
    </div>
  );
}

export function Rule() {
  return <div className="h-px w-full bg-line" />;
}

/* ── indicators ────────────────────────────────────────────────────── */

export function Dot({
  className = "bg-jade",
  pulse = false,
}: {
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span
      className={`inline-block size-[7px] shrink-0 rounded-full ${className} ${
        pulse ? "zg-ping" : ""
      }`}
      style={pulse ? { color: "currentColor" } : undefined}
    />
  );
}

export function Listening({ tone = "bg-jade" }: { tone?: string }) {
  return (
    <span className="inline-flex h-3 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`zg-bar block h-3 w-[2.5px] rounded-full ${tone}`}
          style={{ animationDelay: `${i * 110}ms` }}
        />
      ))}
    </span>
  );
}

/* ── inline SVG glyphs (no assets, no CDN) ─────────────────────────── */

export function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 2.5 4.5 5.6v6.1c0 4.7 3.1 8.4 7.5 9.8 4.4-1.4 7.5-5.1 7.5-9.8V5.6L12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BlockIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="m6.4 6.4 11.2 11.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function QuestionIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M9.6 9.3c.2-1.3 1.2-2.1 2.5-2.1 1.4 0 2.4.9 2.4 2.1 0 1.1-.6 1.6-1.6 2.2-.8.5-1.1 1-1.1 1.9v.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="11.8" cy="16.7" r="1" fill="currentColor" />
    </svg>
  );
}

export function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="m8.2 12.3 2.6 2.6 5-5.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PhoneIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M6.2 3.8h3l1.5 3.7-2 1.4a11.5 11.5 0 0 0 5.4 5.4l1.4-2 3.7 1.5v3c0 .9-.7 1.6-1.6 1.6A14.9 14.9 0 0 1 4.6 5.4c0-.9.7-1.6 1.6-1.6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TicketIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4.5 4.5h15v15l-2.5-1.4-2.5 1.4-2.5-1.4-2.5 1.4-2.5-1.4-2.5 1.4v-15Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M8 9h8M8 12.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
