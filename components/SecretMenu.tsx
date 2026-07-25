"use client";

import { MENU } from "@/data/restaurant";
import type { SecretItem } from "./types";
import { Chip, Panel } from "./Ui";

export function SecretMenu({
  items,
  className = "",
}: {
  items: SecretItem[];
  className?: string;
}) {
  const live = items.length > 0;
  const offMenu = MENU.filter((m) => !m.english_listed);

  return (
    <Panel
      label="Secret menu"
      zh="隱藏菜單"
      accent={live ? "text-gold" : "text-muted"}
      className={className}
      right={
        live ? (
          <Chip className="border-gold/40 bg-gold/10 text-gold">
            offered on this call
          </Chip>
        ) : (
          <span className="mono text-[9.5px] tracking-[0.16em] text-dim uppercase">
            {offMenu.length} in kitchen scope
          </span>
        )
      }
      bodyClassName="zg-scroll overflow-y-auto"
    >
      {live ? (
        <div className="flex flex-col gap-2 px-3 py-2.5">
          {items.map((it) => (
            <article
              key={it.sku}
              className="zg-rise rounded-[8px] border border-gold/30 bg-gold/[0.06] px-3 py-2.5"
            >
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <span className="zh-hero text-[27px] leading-none text-gold">
                  {it.nameZh}
                </span>
                <span className="text-[12.5px] font-semibold text-ink">
                  {it.nameEn}
                </span>
                <span className="mono ml-auto text-[8px] tracking-[0.16em] text-dim uppercase">
                  off the english menu
                </span>
              </div>
              {it.reason ? (
                <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-muted">
                  {it.reason}
                </p>
              ) : null}
              {it.phrase ? (
                <div className="mt-1.5 rounded-[6px] border border-dashed border-gold/45 bg-black/35 px-2.5 py-1">
                  <div className="mono text-[8px] font-bold tracking-[0.22em] text-gold uppercase">
                    order it like this · 這樣點
                  </div>
                  <div className="zh mt-0.5 text-[18px] leading-tight text-ink">
                    {it.phrase}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 px-3 py-2.5">
          <p className="mono text-[8.5px] tracking-[0.16em] text-dim uppercase">
            kitchen capability in scope · not yet surfaced on this call
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {offMenu.map((m) => (
              <span
                key={m.sku}
                title={m.name_en}
                className="flex min-w-0 items-baseline gap-1.5"
              >
                <span className="zh shrink-0 text-[16px] text-muted">
                  {m.name_zh}
                </span>
                <span className="mono truncate text-[8.5px] text-dim">
                  {m.name_en}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
