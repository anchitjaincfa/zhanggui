"use client";

import { useEffect, useRef } from "react";
import { fmtArgs, fmtClock, type ReceiptRow } from "./types";
import { Empty, Panel } from "./Ui";

const SURFACE_TONE: Record<string, string> = {
  guardian: "border-vermilion/40 bg-vermilion/10 text-vermilion",
  memory: "border-jade/40 bg-jade/10 text-jade",
  crm: "border-jade/40 bg-jade/10 text-jade",
  order: "border-line2 bg-panel2 text-ink",
  kds: "border-gold/40 bg-gold/10 text-gold",
  kitchen: "border-gold/40 bg-gold/10 text-gold",
  menu: "border-gold/40 bg-gold/10 text-gold",
  call: "border-line2 bg-panel2 text-muted",
};

export function ActionReceipt({
  rows,
  className = "",
}: {
  rows: ReceiptRow[];
  className?: string;
}) {
  const endRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [rows.length]);

  return (
    <Panel
      label="Action receipt"
      zh="憑證"
      accent="text-muted"
      className={className}
      right={
        <span className="mono text-[9.5px] tracking-[0.16em] text-dim uppercase">
          tool → args → result → surface
        </span>
      }
      bodyClassName="zg-scroll overflow-y-auto"
    >
      {rows.length === 0 ? (
        <Empty
          line="no actions yet"
          sub="Every state change on this screen is traceable to a tool call and the memory row behind it."
        />
      ) : (
        <ul className="divide-y divide-line/70">
          {rows.map((r, i) => {
            const tone =
              SURFACE_TONE[r.surface.toLowerCase()] ??
              "border-line2 bg-panel2 text-muted";
            return (
              <li
                key={`${r.ts}-${i}`}
                className="zg-rise mono flex items-baseline gap-2.5 px-3 py-[5px] text-[10.5px] whitespace-nowrap"
              >
                <span className="shrink-0 text-dim">{fmtClock(r.ts)}</span>
                <span className="shrink-0 font-semibold text-jade">
                  {r.tool}
                </span>
                <span className="shrink-0 truncate text-dim">
                  {fmtArgs(r.args)}
                </span>
                <span className="shrink-0 text-line2">→</span>
                <span className="min-w-0 flex-1 truncate text-ink">
                  {r.result}
                </span>
                {r.surface ? (
                  <span
                    className={`shrink-0 rounded-[3px] border px-1.5 py-[1px] text-[8.5px] font-semibold tracking-[0.14em] uppercase ${tone}`}
                  >
                    {r.surface}
                  </span>
                ) : null}
              </li>
            );
          })}
          <li ref={endRef} className="h-0" />
        </ul>
      )}
    </Panel>
  );
}
