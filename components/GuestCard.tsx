"use client";

import { fmtDate, fmtPhone, titleCase, type GuestCardData } from "./types";
import { Chip, Panel } from "./Ui";

export function GuestCard({
  guest,
  className = "",
}: {
  guest: GuestCardData | null;
  className?: string;
}) {
  if (!guest) {
    return (
      <Panel
        label="Guest card"
        zh="客人"
        accent="text-muted"
        className={className}
        right={
          <span className="mono text-[9.5px] tracking-[0.18em] text-dim uppercase">
            unidentified
          </span>
        }
      >
        <div className="flex items-center gap-3.5 px-3.5 py-3">
          <div className="zh-hero zg-breathe text-[30px] leading-none text-line2 select-none">
            客
          </div>
          <div>
            <p className="mono text-[10px] tracking-[0.2em] text-dim uppercase">
              no caller resolved
            </p>
            <p className="mt-1 text-[12px] leading-snug text-muted">
              Identity is the phone number. No account, no signup, no loyalty
              card.
            </p>
          </div>
        </div>
      </Panel>
    );
  }

  const facts: Array<[string, string]> = [];
  if (guest.spice) facts.push(["spice", guest.spice]);
  if (guest.fulfilment) facts.push(["fulfilment", guest.fulfilment]);
  if (guest.cadence) facts.push(["cadence", guest.cadence]);
  if (guest.knownSince) facts.push(["known since", fmtDate(guest.knownSince)]);
  facts.push(["orders", String(guest.orderCount)]);

  return (
    <Panel
      label="Guest card"
      zh="客人"
      accent="text-jade"
      className={className}
      right={
        <span className="mono text-[10px] text-muted">
          {fmtPhone(guest.phone)}
        </span>
      }
      bodyClassName="zg-scroll overflow-y-auto"
    >
      <div className="zg-fade space-y-2.5 px-3.5 py-3">
        {/* name */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {guest.nameZh ? (
            <span className="zh-hero text-[32px] leading-none text-ink">
              {guest.nameZh}
            </span>
          ) : null}
          <span
            className={`font-semibold text-ink ${guest.nameZh ? "text-[16px]" : "text-[24px]"}`}
          >
            {guest.name}
          </span>
          <Chip className="border-line2 bg-panel2 text-muted">
            {guest.language === "zh" ? "中文" : guest.language.toUpperCase()}
          </Chip>
        </div>

        {/* restrictions — always loud */}
        {guest.restrictions.length > 0 ? (
          <div className="rounded-[7px] border border-vermilion/40 bg-vermilion/[0.08] px-2.5 py-2">
            <div className="mono mb-1.5 text-[9px] font-bold tracking-[0.22em] text-vermilion uppercase">
              restrictions · 忌口
            </div>
            <div className="flex flex-wrap gap-1.5">
              {guest.restrictions.map((r) => (
                <span
                  key={r}
                  className="rounded-[4px] border border-vermilion/60 bg-vermilion/15 px-2 py-[3px] text-[12px] font-semibold text-vermilion"
                >
                  {titleCase(r)}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* facts */}
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {facts.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="mono text-[8.5px] tracking-[0.2em] text-dim uppercase">
                {k}
              </dt>
              <dd className="truncate text-[12.5px] text-ink" title={v}>
                {v}
              </dd>
            </div>
          ))}
        </dl>

        {guest.dislikes.length > 0 ? (
          <div>
            <div className="mono mb-1 text-[8.5px] tracking-[0.2em] text-dim uppercase">
              dislikes
            </div>
            <div className="flex flex-wrap gap-1.5">
              {guest.dislikes.map((d) => (
                <Chip key={d} className="border-line2 bg-panel2 text-muted">
                  {d}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}

        {guest.notes.length > 0 ? (
          <ul className="space-y-1 border-t border-line pt-2">
            {guest.notes.slice(0, 4).map((n, i) => (
              <li
                key={i}
                className="flex gap-2 text-[12px] leading-snug text-muted"
              >
                <span className="text-jade">·</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Panel>
  );
}
