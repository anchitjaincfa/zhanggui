"use client";

import { useEffect, useMemo, useRef } from "react";
import { fmtClock, type MemoryRow, type Scope } from "./types";
import { Chip, Empty, Panel } from "./Ui";

const SCOPES: Record<
  Scope,
  { label: string; zh: string; text: string; chip: string }
> = {
  personal: {
    label: "personal",
    zh: "個人",
    text: "text-jade",
    chip: "border-jade/40 bg-jade/10 text-jade",
  },
  kitchen: {
    label: "kitchen",
    zh: "後廚",
    text: "text-gold",
    chip: "border-gold/40 bg-gold/10 text-gold",
  },
  allergen: {
    label: "allergen",
    zh: "過敏",
    text: "text-vermilion",
    chip: "border-vermilion/40 bg-vermilion/10 text-vermilion",
  },
};

const rowKey = (m: MemoryRow, i: number) => `${m.ts}|${m.scope}|${m.text}|${i}`;

export function GhostCrm({
  memory,
  className = "",
}: {
  memory: MemoryRow[];
  className?: string;
}) {
  const seen = useRef<Set<string>>(new Set());

  // newest first — the panel grows downward from the top as the call runs
  const rows = useMemo(() => {
    return memory
      .map((m, i) => ({ m, key: rowKey(m, i) }))
      .sort((a, b) => (a.m.ts < b.m.ts ? 1 : a.m.ts > b.m.ts ? -1 : 0));
  }, [memory]);

  const fresh = new Set<string>();
  for (const r of rows) {
    if (!seen.current.has(r.key)) fresh.add(r.key);
  }

  useEffect(() => {
    for (const r of rows) seen.current.add(r.key);
  }, [rows]);

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.m.scope] = (acc[r.m.scope] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Panel
      label="Ghost CRM"
      zh="無形客檔"
      accent="text-ink"
      className={className}
      right={
        <>
          {(Object.keys(SCOPES) as Scope[]).map((s) => (
            <span key={s} className="flex items-center gap-1">
              <span
                className={`inline-block size-[6px] rounded-full ${
                  s === "personal"
                    ? "bg-jade"
                    : s === "kitchen"
                      ? "bg-gold"
                      : "bg-vermilion"
                } ${counts[s] ? "" : "opacity-30"}`}
              />
              <span className="mono text-[9.5px] text-dim">{counts[s] ?? 0}</span>
            </span>
          ))}
          <span className="mono ml-1 text-[10px] text-muted">
            {rows.length} rows
          </span>
        </>
      }
      bodyClassName="zg-scroll overflow-y-auto"
    >
      {rows.length === 0 ? (
        <Empty
          glyph="檔"
          line="no memory recalled yet"
          sub="Nothing is ever typed in. Rows accrue from the call, the ticket and the kitchen — each one carries where it came from."
        />
      ) : (
        <div className="flex flex-col gap-1.5 px-2.5 py-2.5">
          {rows.map(({ m, key }) => (
            <MemoryLine key={key} m={m} animate={fresh.has(key) || m.isNew} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function MemoryLine({ m, animate }: { m: MemoryRow; animate: boolean }) {
  const s = SCOPES[m.scope];
  return (
    <article
      className={`zg-inset relative overflow-hidden px-3 py-2 pl-3.5 ${s.text} ${
        animate ? "zg-new" : ""
      }`}
      style={
        animate
          ? undefined
          : { boxShadow: "inset 3px 0 0 currentColor", background: "rgba(0,0,0,0.28)" }
      }
    >
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <Chip className={s.chip}>
          {s.label}
          <span className="zh ml-0.5 text-[10px] opacity-80">{s.zh}</span>
        </Chip>
        <Chip className="border-line2 bg-panel2 text-muted">{m.source}</Chip>
        <span className="mono text-[9px] text-dim uppercase">{m.type}</span>
        <span className="mono ml-auto text-[9.5px] text-dim">
          {fmtClock(m.ts)}
        </span>
        {m.isNew ? (
          <Chip className="border-jade/50 bg-jade/15 text-jade">new</Chip>
        ) : null}
      </div>
      <p className="text-[13px] leading-[1.45] text-ink">{m.text}</p>
    </article>
  );
}
