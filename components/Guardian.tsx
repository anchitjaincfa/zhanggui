"use client";

import { useEffect, type ReactElement } from "react";
import { CONFIRMATIONS, MENU } from "@/data/restaurant";
import {
  fmtClock,
  fmtDate,
  titleCase,
  type GuardianRow,
  type Verdict,
} from "./types";
import {
  BlockIcon,
  CheckIcon,
  Chip,
  Panel,
  QuestionIcon,
  ShieldIcon,
} from "./Ui";

type Look = {
  label: string;
  zh: string;
  text: string;
  border: string;
  bg: string;
  glow: string;
  line: string;
  Icon: (props: { className?: string }) => ReactElement;
};

const LOOK: Record<Verdict, Look> = {
  block: {
    label: "BLOCKED",
    zh: "攔截",
    text: "text-vermilion",
    border: "border-vermilion",
    bg: "bg-vermilion/[0.09]",
    glow: "shadow-[0_0_90px_-20px_rgba(226,86,74,0.85)]",
    line: "bg-vermilion",
    Icon: BlockIcon,
  },
  unconfirmed: {
    label: "UNCONFIRMED",
    zh: "未確認",
    text: "text-gold",
    border: "border-gold",
    bg: "bg-gold/[0.09]",
    glow: "shadow-[0_0_90px_-20px_rgba(217,164,65,0.8)]",
    line: "bg-gold",
    Icon: QuestionIcon,
  },
  allow: {
    label: "CLEARED",
    zh: "放行",
    text: "text-jade",
    border: "border-jade",
    bg: "bg-jade/[0.07]",
    glow: "shadow-[0_0_80px_-24px_rgba(53,196,143,0.7)]",
    line: "bg-jade",
    Icon: CheckIcon,
  },
};

/* ── the panel that lives in the grid ──────────────────────────────── */

export function GuardianPanel({
  rows,
  onOpen,
  className = "",
}: {
  rows: GuardianRow[];
  onOpen: () => void;
  className?: string;
}) {
  const latest = rows.length > 0 ? rows[rows.length - 1] : null;
  const look = latest ? LOOK[latest.verdict] : null;

  return (
    <Panel
      label="Guardian"
      zh="守門"
      accent={look ? look.text : "text-muted"}
      className={className}
      right={
        <>
          {rows.length > 1 ? (
            <span className="mono text-[9.5px] text-dim">
              {rows.length} checks
            </span>
          ) : null}
          {latest ? (
            <button
              type="button"
              onClick={onOpen}
              className="mono cursor-pointer rounded border border-line2 bg-panel2 px-2 py-[3px] text-[9px] tracking-[0.16em] text-muted uppercase transition-colors hover:border-line2 hover:text-ink"
            >
              enlarge
            </button>
          ) : (
            <Chip className="border-jade/40 bg-jade/10 text-jade">armed</Chip>
          )}
        </>
      }
      bodyClassName="zg-scroll overflow-y-auto"
    >
      {!latest || !look ? <GuardianStandby /> : <Verdict_ row={latest} size="panel" onOpen={onOpen} />}
    </Panel>
  );
}

function GuardianStandby() {
  const confirmed = CONFIRMATIONS.length;
  const dishes = new Set(CONFIRMATIONS.map((c) => c.sku)).size;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <ShieldIcon className="zg-breathe size-9 text-jade/60" />
      <div>
        <p className="mono text-[11px] font-bold tracking-[0.24em] text-jade uppercase">
          guardian armed
        </p>
        <p className="zh mt-0.5 text-[15px] text-jade/60">守門人已就位</p>
      </div>
      <p className="max-w-[46ch] text-[12.5px] leading-relaxed text-muted">
        Every order line is checked against the guest&apos;s own restrictions and
        this kitchen&apos;s dated confirmations — before the line is written, not
        after.
      </p>
      <div className="mono flex flex-wrap items-center justify-center gap-x-5 gap-y-1 pt-1 text-[10px] tracking-[0.16em] text-dim uppercase">
        <span>
          <span className="text-ink">{confirmed}</span> dated confirmations
        </span>
        <span>
          <span className="text-ink">{dishes}</span> dishes covered
        </span>
        <span>
          <span className="text-ink">{MENU.length}</span> menu items in scope
        </span>
      </div>
      <p className="mono max-w-[52ch] pt-1 text-[9.5px] leading-relaxed tracking-[0.1em] text-dim uppercase">
        advisory · it cannot see cross-contact
      </p>
    </div>
  );
}

/* ── the takeover ──────────────────────────────────────────────────── */

export function GuardianOverlay({
  row,
  onClose,
}: {
  row: GuardianRow | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!row) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [row, onClose]);

  if (!row) return null;
  const look = LOOK[row.verdict];

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="zg-fade fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-6 backdrop-blur-[3px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`zg-slam zg-scroll max-h-[92vh] w-full max-w-[1080px] overflow-y-auto rounded-xl border-2 bg-panel ${look.border} ${look.glow}`}
      >
        <Verdict_ row={row} size="stage" onOpen={onClose} />
        <div className="mono border-t border-line px-7 py-2 text-center text-[9.5px] tracking-[0.22em] text-dim uppercase">
          press esc or click anywhere to return to the console
        </div>
      </div>
    </div>
  );
}

/* ── shared body ───────────────────────────────────────────────────── */

function Verdict_({
  row,
  size,
  onOpen,
}: {
  row: GuardianRow;
  size: "panel" | "stage";
  onOpen: () => void;
}) {
  const look = LOOK[row.verdict];
  const stage = size === "stage";
  const Icon = look.Icon;

  return (
    <div
      className={`${stage ? "px-7 py-6" : "px-3.5 py-3"} ${look.bg} zg-fade`}
      onDoubleClick={stage ? undefined : onOpen}
    >
      {/* verdict line */}
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
        <Icon className={`${stage ? "size-9" : "size-5"} ${look.text}`} />
        <span
          className={`mono font-bold tracking-[0.2em] ${look.text} ${stage ? "text-[34px]" : "text-[16px]"}`}
        >
          {look.label}
        </span>
        <span
          className={`zh ${look.text} opacity-70 ${stage ? "text-[30px]" : "text-[16px]"}`}
        >
          {look.zh}
        </span>
        <span className="mono ml-auto text-[10px] tracking-[0.16em] text-dim uppercase">
          {row.verdict === "allow" ? "cleared at" : "intercepted at"}{" "}
          {fmtClock(row.ts)}
        </span>
      </div>

      <div className={`mt-1 h-px w-full ${look.line} opacity-30`} />

      {/* the dish */}
      <div
        className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 ${stage ? "mt-5" : "mt-2.5"}`}
      >
        {row.nameZh ? (
          <span
            className={`zh-hero text-ink ${stage ? "text-[64px]" : "text-[30px]"}`}
          >
            {row.nameZh}
          </span>
        ) : null}
        <span
          className={`font-semibold text-ink ${stage ? "text-[26px]" : "text-[15px]"}`}
        >
          {row.nameEn}
        </span>
        <span
          className={`mono text-dim ${stage ? "text-[12px]" : "text-[9.5px]"}`}
        >
          {row.sku}
        </span>
        {row.restricted.length > 0 ? (
          <span className="ml-auto flex flex-wrap gap-1.5">
            {row.restricted.map((r) => (
              <span
                key={r}
                className={`rounded-[4px] border border-vermilion/60 bg-vermilion/15 font-semibold text-vermilion ${
                  stage ? "px-2.5 py-1 text-[14px]" : "px-1.5 py-[2px] text-[10px]"
                }`}
              >
                {titleCase(r)}
              </span>
            ))}
          </span>
        ) : null}
      </div>

      {/* what it says out loud */}
      {row.say ? (
        <p
          className={`border-l-2 text-ink ${look.border} ${
            stage
              ? "mt-5 pl-4 text-[21px] leading-[1.45]"
              : "mt-2 line-clamp-3 pl-2.5 text-[13px] leading-snug"
          }`}
        >
          {row.say}
        </p>
      ) : null}

      {/* evidence */}
      {row.hazards.length > 0 ? (
        <div className={stage ? "mt-6 space-y-3" : "mt-2 space-y-1.5"}>
          <div className="mono text-[9.5px] font-bold tracking-[0.24em] text-dim uppercase">
            evidence · 憑據
          </div>
          {row.hazards.map((h, i) => (
            <div
              key={`${h.allergen}-${i}`}
              className={`zg-inset ${stage ? "px-4 py-3.5" : "px-2.5 py-2"}`}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span
                  className={`font-bold ${look.text} ${stage ? "text-[20px]" : "text-[13px]"}`}
                >
                  {titleCase(h.allergen)}
                </span>
                <span
                  className={`mono ${stage ? "text-[14px]" : "text-[10.5px]"} text-muted`}
                >
                  confirmed{" "}
                  <span className="font-bold text-ink">{h.confirmations}×</span>
                </span>
                <span
                  className={`mono ${stage ? "text-[14px]" : "text-[10.5px]"} text-muted`}
                >
                  last{" "}
                  <span className="font-bold text-ink">
                    {h.lastConfirmed ? fmtDate(h.lastConfirmed) : "never"}
                  </span>
                </span>
              </div>
              {h.evidence.length > 0 ? (
                <ul className={stage ? "mt-2.5 space-y-1.5" : "mt-1 space-y-1"}>
                  {h.evidence.slice(0, stage ? 5 : 1).map((e, j) => (
                    <li
                      key={j}
                      className={`flex gap-2 text-muted ${stage ? "text-[14px] leading-snug" : "line-clamp-2 text-[11px] leading-snug"}`}
                    >
                      <span className={look.text}>—</span>
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* the phrase to say at the counter */}
      <PhraseBox row={row} stage={stage} lookText={look.text} lookBorder={look.border} />
    </div>
  );
}

function PhraseBox({
  row,
  stage,
  lookText,
  lookBorder,
}: {
  row: GuardianRow;
  stage: boolean;
  lookText: string;
  lookBorder: string;
}) {
  const phrase = row.hazards.find((h) => h.phrase)?.phrase ?? "";
  if (!phrase) return null;
  return (
    <div
      className={`rounded-lg border border-dashed bg-black/35 ${lookBorder} ${
        stage ? "mt-6 px-6 py-5" : "mt-3 px-3 py-2.5"
      }`}
    >
      <div
        className={`mono font-bold tracking-[0.24em] uppercase ${lookText} ${stage ? "text-[11px]" : "text-[8.5px]"}`}
      >
        say this at the counter · 到店這麼問
      </div>
      <div
        className={`zh-hero mt-1.5 text-ink ${stage ? "text-[46px]" : "text-[21px]"}`}
      >
        {phrase}
      </div>
    </div>
  );
}
