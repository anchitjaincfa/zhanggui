"use client";

import { RESTAURANT } from "@/data/restaurant";
import {
  fmtDuration,
  fmtPhone,
  type Beat,
  type CallStatus,
  type ZgCall,
} from "./types";
import { Listening, PhoneIcon } from "./Ui";

const STATUS: Record<
  CallStatus,
  { label: string; zh: string; text: string; dot: string; ring: string }
> = {
  idle: {
    label: "STANDBY",
    zh: "待機",
    text: "text-muted",
    dot: "bg-dim",
    ring: "border-line2 bg-panel2",
  },
  ringing: {
    label: "RINGING",
    zh: "來電",
    text: "text-gold",
    dot: "bg-gold",
    ring: "border-gold/50 bg-gold/10",
  },
  active: {
    label: "ON CALL",
    zh: "通話中",
    text: "text-jade",
    dot: "bg-jade",
    ring: "border-jade/50 bg-jade/10",
  },
  ended: {
    label: "ENDED",
    zh: "已結束",
    text: "text-muted",
    dot: "bg-line2",
    ring: "border-line2 bg-panel2",
  },
};

export function Header({
  call,
  seconds,
  online,
  cadenceMs,
  beat,
  error,
}: {
  call: ZgCall | null;
  seconds: number;
  online: boolean;
  cadenceMs: number;
  beat: Beat | null;
  error: string | null;
}) {
  const status: CallStatus = call?.status ?? "idle";
  const s = STATUS[status];
  const live = status === "active";
  const named = call?.guestNameZh ?? call?.guestName ?? null;

  return (
    <header className="flex shrink-0 items-center gap-4 border-b border-line bg-panel/70 px-4 py-2.5 whitespace-nowrap backdrop-blur">
      {/* wordmark */}
      <div className="flex shrink-0 items-center gap-3">
        <span className="zh-hero text-[30px] leading-none text-jade">掌櫃</span>
        <div className="leading-tight">
          <div className="text-[17px] font-semibold tracking-[0.26em] text-ink">
            ZHANGGUI
          </div>
          <div className="mono text-[9px] tracking-[0.28em] text-dim uppercase">
            AI front desk
          </div>
        </div>
      </div>

      <div className="h-8 w-px shrink-0 bg-line" />

      {/* restaurant */}
      <div className="flex shrink-0 items-baseline gap-2.5">
        <span className="zh text-[22px] leading-none text-gold">
          {RESTAURANT.name_zh}
        </span>
        <span className="text-[14px] font-medium text-ink">{RESTAURANT.name}</span>
        <span className="mono hidden text-[9.5px] tracking-[0.2em] text-dim uppercase 2xl:inline">
          {RESTAURANT.cuisine} · Flushing
        </span>
      </div>

      {/* beat progress — where we are in the simulated call */}
      {beat && beat.total > 0 ? (
        <div className="hidden min-w-0 flex-1 items-center gap-2.5 lg:flex">
          <span className="mono shrink-0 text-[9px] tracking-[0.2em] text-dim uppercase">
            beat {Math.min(beat.index, beat.total)}/{beat.total}
          </span>
          <span className="flex shrink-0 gap-[3px]">
            {Array.from({ length: Math.min(beat.total, 14) }, (_, i) => (
              <span
                key={i}
                className={`block h-[3px] w-[9px] rounded-full ${
                  i < beat.index ? "bg-jade" : "bg-line2"
                }`}
              />
            ))}
          </span>
          {beat.note ? (
            <span className="min-w-0 truncate text-[11.5px] text-muted">
              {beat.note}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-4">
        {/* who is on the line */}
        {named ? (
          <div className="hidden items-baseline gap-2 2xl:flex">
            <span className="mono text-[9.5px] tracking-[0.2em] text-dim uppercase">
              on the line
            </span>
            <span
              className={`${call?.guestNameZh ? "zh text-[17px]" : "text-[15px] font-semibold"} text-ink`}
            >
              {named}
            </span>
          </div>
        ) : null}

        {/* number to call */}
        <div className="hidden text-right leading-tight lg:block">
          <div className="mono text-[9px] tracking-[0.24em] text-dim uppercase">
            call the front desk
          </div>
          <div className="mono flex items-center justify-end gap-1.5 text-[14px] font-semibold text-ink">
            <PhoneIcon className="size-3.5 text-jade" />
            {fmtPhone(RESTAURANT.phone)}
          </div>
          <div className="mono text-[9.5px] text-dim">
            sip:golden-dragon@sip.vapi.ai
          </div>
        </div>

        {/* status pill */}
        <div
          className={`flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 ${s.ring}`}
        >
          <span
            className={`inline-block size-2 rounded-full ${s.dot} ${s.text} ${live ? "zg-ping" : ""}`}
          />
          <span
            className={`mono text-[11px] font-bold tracking-[0.2em] ${s.text}`}
          >
            {s.label}
          </span>
          <span className={`zh text-[13px] ${s.text} opacity-70`}>{s.zh}</span>
          {live ? <Listening /> : null}
          <span className="mono min-w-[46px] text-right text-[15px] font-semibold tabular-nums text-ink">
            {fmtDuration(seconds)}
          </span>
        </div>

        {/* poll health */}
        <div className="hidden max-w-[190px] flex-col items-end leading-tight md:flex">
          <span className="mono text-[9px] tracking-[0.2em] text-dim uppercase">
            {error ? "api" : online ? "sync" : "offline"}
          </span>
          <span
            className={`mono max-w-full truncate text-[10px] ${
              error || !online ? "text-vermilion" : "text-jade"
            }`}
            title={error ?? undefined}
          >
            {error ? error : online ? `${cadenceMs}ms` : "retrying"}
          </span>
        </div>
      </div>
    </header>
  );
}
