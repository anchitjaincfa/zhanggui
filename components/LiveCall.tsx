"use client";

import { useEffect, useRef } from "react";
import { RESTAURANT } from "@/data/restaurant";
import {
  fmtClock,
  fmtPhone,
  type TranscriptTurn,
  type ZgCall,
} from "./types";
import { Chip, Listening, Panel, PhoneIcon } from "./Ui";

export function LiveCall({
  call,
  transcript,
  className = "",
}: {
  call: ZgCall | null;
  transcript: TranscriptTurn[];
  className?: string;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const count = transcript.length;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [count]);

  const active = call?.status === "active";
  const callerLabel =
    call?.guestName ?? (call?.phone ? fmtPhone(call.phone) : "CALLER");

  return (
    <Panel
      label="Live call"
      zh="通話"
      accent="text-jade"
      className={className}
      right={
        <>
          {call?.channel === "pos" ? (
            <Chip className="border-gold/40 bg-gold/10 text-gold">POS</Chip>
          ) : null}
          {call?.language ? (
            <Chip className="border-line2 bg-panel2 text-muted">
              {call.language === "zh" ? "中文" : "EN"}
            </Chip>
          ) : null}
          <span className="mono text-[10px] text-dim">{count} turns</span>
        </>
      }
      bodyClassName="zg-scroll overflow-y-auto"
    >
      {count === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
          <div className="zh-hero zg-breathe text-[64px] leading-none text-line2 select-none">
            掌櫃
          </div>
          <div className="space-y-1">
            <p className="mono text-[10.5px] tracking-[0.24em] text-dim uppercase">
              the line is open
            </p>
            <p className="max-w-[26ch] text-[12.5px] leading-relaxed text-muted">
              Nobody is on the phone. The front desk is listening.
            </p>
          </div>
          <div className="zg-inset flex flex-col items-center gap-1 px-5 py-3">
            <span className="mono text-[9px] tracking-[0.24em] text-dim uppercase">
              {RESTAURANT.name_zh} {RESTAURANT.name}
            </span>
            <span className="mono flex items-center gap-2 text-[17px] font-semibold text-ink">
              <PhoneIcon className="size-4 text-jade" />
              {fmtPhone(RESTAURANT.phone)}
            </span>
            <span className="mono text-[10px] text-dim">
              sip:golden-dragon@sip.vapi.ai
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 px-3 py-3">
          {transcript.map((t, i) => (
            <Turn
              key={`${t.ts}-${i}`}
              turn={t}
              callerLabel={callerLabel}
              isLast={i === count - 1}
            />
          ))}
          {active ? (
            <div className="flex items-center gap-2.5 pt-1 pl-2">
              <Listening />
              <span className="mono text-[10px] tracking-[0.2em] text-dim uppercase">
                listening
              </span>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      )}
    </Panel>
  );
}

function Turn({
  turn,
  callerLabel,
  isLast,
}: {
  turn: TranscriptTurn;
  callerLabel: string;
  isLast: boolean;
}) {
  const isAgent = turn.role === "assistant";
  return (
    <div className={`zg-rise ${isAgent ? "" : "pl-5"}`}>
      <div className="mb-1 flex items-baseline gap-2">
        <span
          className={`mono text-[9.5px] font-bold tracking-[0.2em] uppercase ${
            isAgent ? "text-jade" : "text-gold"
          }`}
        >
          {isAgent ? "掌櫃 ZHANGGUI" : callerLabel}
        </span>
        <span className="mono text-[9px] text-dim">{fmtClock(turn.ts)}</span>
      </div>
      <p
        className={`rounded-[7px] border px-3 py-2 text-[14.5px] leading-[1.5] ${
          isAgent
            ? "border-jade/25 bg-jade/[0.07] text-ink"
            : "border-line bg-black/25 text-muted"
        } ${isLast && isAgent ? "shadow-[0_0_28px_-16px_rgba(53,196,143,0.9)]" : ""}`}
      >
        {turn.text}
      </p>
    </div>
  );
}
