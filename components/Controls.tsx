"use client";

import type { Scenario, ScenarioMeta } from "./types";
import { Panel } from "./Ui";

const SCENARIOS: Array<{
  id: Scenario;
  key: string;
  zh: string;
  name: string;
  beat: string;
  tone: string;
}> = [
  {
    id: "mei",
    key: "1",
    zh: "梅",
    name: "Mei Lin",
    beat: "peanut · the block",
    tone: "hover:border-vermilion/60 hover:text-vermilion",
  },
  {
    id: "wong",
    key: "2",
    zh: "王太太",
    name: "Mrs Wong",
    beat: "the regular · 中文",
    tone: "hover:border-jade/60 hover:text-jade",
  },
  {
    id: "danny",
    key: "3",
    zh: "丹尼",
    name: "Danny Ortiz",
    beat: "hidden shrimp · unconfirmed",
    tone: "hover:border-gold/60 hover:text-gold",
  },
];

export function Controls({
  onScenario,
  onReset,
  onSeed,
  busy,
  running,
  note,
  meta = [],
  className = "",
}: {
  onScenario: (s: Scenario) => void;
  onReset: () => void;
  onSeed: () => void;
  busy: boolean;
  running: Scenario | null;
  note: string | null;
  meta?: ScenarioMeta[];
  className?: string;
}) {
  const byId = new Map(meta.map((m) => [m.id, m]));
  return (
    <Panel
      label="Demo control"
      zh="控台"
      accent="text-muted"
      className={className}
      right={
        <span className="mono text-[9px] tracking-[0.16em] text-dim uppercase">
          keys 1 · 2 · 3
        </span>
      }
    >
      <div className="flex h-full flex-col gap-1.5 px-2.5 py-2.5">
        <div className="grid flex-1 grid-cols-3 gap-1.5">
          {SCENARIOS.map((s) => {
            const active = running === s.id;
            return (
              <button
                key={s.id}
                type="button"
                disabled={busy}
                title={byId.get(s.id)?.blurb ?? s.beat}
                onClick={() => onScenario(s.id)}
                className={`group relative flex cursor-pointer flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[8px] border border-line bg-black/30 px-1.5 py-2 text-center transition-colors disabled:cursor-wait disabled:opacity-55 ${s.tone} ${
                  active ? "border-jade/70 bg-jade/[0.09]" : ""
                }`}
              >
                {active ? (
                  <span className="absolute inset-x-0 top-0 h-[2px] overflow-hidden">
                    <span className="zg-sweep block h-full w-1/3 bg-jade" />
                  </span>
                ) : null}
                <span className="mono absolute top-1 left-1.5 text-[8px] text-dim">
                  {s.key}
                </span>
                <span className="zh text-[21px] leading-none text-ink">
                  {s.zh}
                </span>
                <span className="text-[11px] font-semibold text-ink">
                  {s.name}
                </span>
                <span className="mono text-[8px] leading-tight tracking-[0.1em] text-dim uppercase">
                  {s.beat}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={onReset}
            disabled={busy}
            className="mono flex-1 cursor-pointer rounded-[6px] border border-line bg-black/30 px-2 py-1.5 text-[9.5px] font-semibold tracking-[0.2em] text-muted uppercase transition-colors hover:border-line2 hover:text-ink disabled:opacity-55"
          >
            reset
          </button>
          <button
            type="button"
            onClick={onSeed}
            disabled={busy}
            className="mono flex-1 cursor-pointer rounded-[6px] border border-line bg-black/30 px-2 py-1.5 text-[9.5px] font-semibold tracking-[0.2em] text-muted uppercase transition-colors hover:border-gold/50 hover:text-gold disabled:opacity-55"
          >
            seed memory
          </button>
        </div>

        <p className="mono h-[13px] shrink-0 truncate text-center text-[9px] tracking-[0.12em] text-dim uppercase">
          {note ?? "one memory spine · two mouths"}
        </p>
      </div>
    </Panel>
  );
}
