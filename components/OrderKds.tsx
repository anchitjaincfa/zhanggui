"use client";

import { fmtMoney, type KdsState, type OrderState } from "./types";
import { Chip, Empty, Panel, TicketIcon } from "./Ui";

export function OrderPanel({
  order,
  className = "",
}: {
  order: OrderState | null;
  className?: string;
}) {
  const lines = order?.lines ?? [];
  const kept = lines.filter((l) => !l.blocked).length;

  return (
    <Panel
      label="Order"
      zh="訂單"
      accent="text-ink"
      className={className}
      right={
        <>
          {order?.status ? (
            <Chip className="border-line2 bg-panel2 text-muted">
              {order.status}
            </Chip>
          ) : null}
          {order?.pickupMinutes != null ? (
            <Chip className="border-jade/40 bg-jade/10 text-jade">
              pickup {order.pickupMinutes}m
            </Chip>
          ) : null}
        </>
      }
      bodyClassName="zg-scroll flex flex-col overflow-y-auto"
    >
      {lines.length === 0 ? (
        <Empty
          glyph="單"
          line="no lines yet"
          sub="Every line is written only after Guardian clears it."
        />
      ) : (
        <>
          <ul className="flex-1 divide-y divide-line">
            {lines.map((l, i) => (
              <li
                key={`${l.sku}-${i}`}
                className={`zg-rise flex items-baseline gap-2.5 px-3 py-2 ${
                  l.blocked ? "bg-vermilion/[0.07]" : ""
                }`}
              >
                <span className="mono w-6 shrink-0 text-[13px] font-bold text-dim tabular-nums">
                  {l.qty}×
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span
                      className={`zh text-[19px] leading-tight ${
                        l.blocked
                          ? "text-vermilion line-through decoration-vermilion decoration-2"
                          : "text-ink"
                      }`}
                    >
                      {l.nameZh || l.nameEn}
                    </span>
                    <span
                      className={`text-[12px] ${
                        l.blocked
                          ? "text-vermilion/80 line-through decoration-vermilion"
                          : "text-muted"
                      }`}
                    >
                      {l.nameEn}
                    </span>
                  </div>
                  {l.modifiers.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {l.modifiers.map((m, j) => (
                        <Chip
                          key={j}
                          className="border-line2 bg-panel2 text-muted"
                        >
                          {m}
                        </Chip>
                      ))}
                    </div>
                  ) : null}
                </div>
                {l.blocked ? (
                  <Chip className="border-vermilion bg-vermilion/15 text-vermilion">
                    blocked
                  </Chip>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="mono flex shrink-0 items-center gap-3 border-t border-line px-3 py-2 text-[10px] tracking-[0.16em] text-dim uppercase">
            <span>
              <span className="text-ink">{kept}</span> committed
            </span>
            {lines.length - kept > 0 ? (
              <span className="text-vermilion">
                {lines.length - kept} refused
              </span>
            ) : null}
            <span className="ml-auto text-[15px] font-semibold tracking-normal text-ink normal-case">
              {fmtMoney(order?.totalCents ?? 0)}
            </span>
          </div>
        </>
      )}
    </Panel>
  );
}

export function KdsPanel({
  kds,
  className = "",
}: {
  kds: KdsState | null;
  className?: string;
}) {
  const stations = kds?.stations ?? [];
  const fired = stations.length > 0;

  return (
    <Panel
      label="Kitchen display"
      zh="後廚"
      accent={fired ? "text-gold" : "text-muted"}
      className={className}
      right={
        kds?.ticketId ? (
          <span className="mono flex items-center gap-1.5 text-[10px] text-gold">
            <TicketIcon className="size-3.5" />
            {kds.ticketId}
          </span>
        ) : (
          <span className="mono text-[9.5px] tracking-[0.16em] text-dim uppercase">
            not fired
          </span>
        )
      }
      bodyClassName="zg-scroll overflow-y-auto"
    >
      {!fired ? (
        <Empty glyph="票" line="no ticket fired" />
      ) : (
        <div className="zg-rise space-y-2 px-3 py-2.5">
          {stations.map((s) => (
            <div key={s.station} className="flex gap-2.5">
              <div className="mono w-[54px] shrink-0 pt-[3px] text-[9.5px] font-bold tracking-[0.18em] text-gold uppercase">
                {s.station}
              </div>
              <ul className="min-w-0 flex-1 space-y-1">
                {s.items.map((it, i) => (
                  <li
                    key={i}
                    className="border-l-2 border-gold/40 pl-2 text-[13px] leading-snug text-ink"
                  >
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {(kds?.notes.length ?? 0) > 0 ? (
            <ul className="space-y-1 border-t border-line pt-2">
              {kds?.notes.map((n, i) => (
                <li
                  key={i}
                  className="mono text-[10.5px] leading-snug tracking-[0.06em] text-vermilion uppercase"
                >
                  ⚑ {n}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </Panel>
  );
}
