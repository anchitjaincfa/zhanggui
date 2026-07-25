// The phone mouth. Vapi calls this for tool execution and call lifecycle.
//
// Two rules learned the hard way from the platform research:
//   • Vapi ignores non-200 responses entirely. A 500 here is indistinguishable
//     from silence, so nothing is allowed to throw — we always answer 200.
//   • The tool-call payload is documented three different ways. We normalise
//     all of them rather than betting on one.

import { NextResponse } from "next/server";
import {
  createCall, emit, findCallByVapiId, getCall, updateCall,
} from "@/lib/store";
import { doGuardian, doIdentify, doSecretMenu, doAdd, doFinalize, type RunContext } from "@/lib/engine";
import { MENU, RESTAURANT, bySku } from "@/data/restaurant";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface NormalTool { id: string; name: string; args: Record<string, unknown> }

/** Handles all three documented shapes of toolCallList. */
function normalizeToolCalls(msg: Record<string, unknown>): NormalTool[] {
  const raw =
    (msg.toolCallList as unknown[]) ??
    (msg.toolCalls as unknown[]) ??
    ((msg.functionCall ? [msg.functionCall] : []) as unknown[]);

  return (raw ?? []).map((t) => {
    const o = t as Record<string, unknown>;
    const fn = (o.function ?? {}) as Record<string, unknown>;
    const name = String(o.name ?? fn.name ?? "");
    let args: Record<string, unknown> = {};
    const candidate = o.arguments ?? o.parameters ?? fn.arguments ?? fn.parameters ?? {};
    if (typeof candidate === "string") {
      try { args = JSON.parse(candidate) as Record<string, unknown>; } catch { args = {}; }
    } else if (candidate && typeof candidate === "object") {
      args = candidate as Record<string, unknown>;
    }
    return { id: String(o.id ?? o.toolCallId ?? ""), name, args };
  }).filter((t) => t.name);
}

/** SIP callers may arrive without a normalised E.164 number — undocumented. */
function callerNumber(call: Record<string, unknown> | undefined): string | null {
  if (!call) return null;
  const customer = call.customer as Record<string, unknown> | undefined;
  const from = call.from as Record<string, unknown> | undefined;
  const n =
    (customer?.number as string) ??
    (from?.phoneNumber as string) ??
    (call.customerNumber as string) ??
    null;
  if (!n) return null;
  const digits = n.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
}

async function ensureCall(vapiCallId: string, phone: string | null): Promise<string> {
  const existing = await findCallByVapiId(vapiCallId);
  if (existing) return existing.id;
  return createCall({ vapiCallId, phone, channel: "phone" });
}

export async function POST(req: Request) {
  let payload: Record<string, unknown> = {};
  try { payload = (await req.json()) as Record<string, unknown>; } catch { /* fall through */ }

  const message = (payload.message ?? payload) as Record<string, unknown>;
  const type = String(message.type ?? "");
  const call = message.call as Record<string, unknown> | undefined;
  const vapiCallId = String(call?.id ?? message.callId ?? "unknown");
  const phone = callerNumber(call);

  try {
    switch (type) {
      // Personalise the greeting before the first word is spoken. Vapi gives
      // us 7.5s here, so identification is capped well under that.
      case "assistant-request": {
        const callId = await ensureCall(vapiCallId, phone);
        const ctx: RunContext = { callId, phone };
        const card = await Promise.race([
          doIdentify(ctx),
          new Promise<null>((r) => setTimeout(() => r(null), 2500)),
        ]);
        const name = card?.name ?? card?.nameZh ?? null;
        const zh = card?.language === "zh";
        const firstMessage = !name
          ? `${RESTAURANT.name}, this is the front desk. Pickup or delivery?`
          : zh
            ? `${card?.nameZh ?? name}！还是老样子吗？`
            : `${RESTAURANT.name} — hello ${name}. The usual, or something different tonight?`;

        return NextResponse.json({
          assistantId: process.env.VAPI_ASSISTANT_ID || undefined,
          assistantOverrides: {
            firstMessage,
            variableValues: {
              guestName: name ?? "",
              restrictions: (card?.restrictions ?? []).join(", "),
              restaurant: RESTAURANT.name,
            },
          },
        });
      }

      case "tool-calls":
      case "function-call": {
        const callId = await ensureCall(vapiCallId, phone);
        const ctx: RunContext = { callId, phone };
        const tools = normalizeToolCalls(message);
        const results = [];

        for (const t of tools) {
          let result = "";
          try {
            switch (t.name) {
              case "guest_identify":
              case "guest.identify": {
                const card = await doIdentify(ctx);
                result = card
                  ? `Known guest: ${card.name ?? card.nameZh}. Avoids: ${card.restrictions.join(", ") || "nothing recorded"}. ${card.notes.slice(0, 3).join(" ")}`
                  : "New caller — no history on this number.";
                break;
              }
              case "menu_lookup":
              case "menu.lookup": {
                const q = String(t.args.query ?? "").toLowerCase();
                const offMenu = Boolean(t.args.offMenu);
                if (offMenu || /special|good tonight|recommend|off menu/.test(q)) {
                  const picks = await doSecretMenu(ctx);
                  result = picks.length
                    ? picks.map((p) => `${p.nameEn} (${p.nameZh}) — say "${p.phrase}"`).join("; ")
                    : "Nothing off-menu available tonight.";
                } else {
                  const hits = MENU.filter(
                    (m) => m.available && (m.name_en.toLowerCase().includes(q) || m.name_zh.includes(q) || m.sku.includes(q))
                  ).slice(0, 6);
                  result = hits.length
                    ? hits.map((m) => `${m.sku}: ${m.name_en} (${m.name_zh}) $${(m.price_cents / 100).toFixed(2)}`).join("; ")
                    : "No match on the menu.";
                }
                break;
              }
              case "order_add_item":
              case "order.add_item": {
                const sku = String(t.args.sku ?? "");
                const item = bySku(sku);
                if (!item) { result = `No such item: ${sku}.`; break; }
                const v = await doGuardian(ctx, sku);
                if (v.verdict === "allow") {
                  await doAdd(ctx, sku, Number(t.args.qty ?? 1), (t.args.modifiers as string[]) ?? []);
                  result = `Added ${item.name_en}.`;
                } else {
                  result = `DO NOT ADD. ${v.say}`;
                }
                break;
              }
              case "order_finalize":
              case "order.finalize": {
                const mins = Number(t.args.pickup_minutes ?? t.args.pickupMinutes ?? 20);
                await doFinalize(ctx, mins);
                result = `Order sent to the kitchen. Ready in about ${mins} minutes.`;
                break;
              }
              case "staff_escalate":
              case "staff.escalate": {
                await emit(callId, "receipt", "staff.escalate", {
                  tool: "staff.escalate", args: t.args,
                  result: "handed to a human", surface: "Floor",
                });
                result = "A member of staff will pick up.";
                break;
              }
              default:
                result = `Unknown tool ${t.name}.`;
            }
          } catch (e) {
            result = `Tool failed softly: ${e instanceof Error ? e.message : String(e)}`;
          }
          results.push({ toolCallId: t.id, name: t.name, result });
        }
        return NextResponse.json({ results });
      }

      case "transcript": {
        const t = message as { role?: string; transcript?: string; transcriptType?: string };
        if (t.transcriptType && t.transcriptType !== "final") return NextResponse.json({ ok: true });
        const callId = await ensureCall(vapiCallId, phone);
        await emit(callId, "transcript", t.role === "user" ? "caller" : "desk", {
          role: t.role === "user" ? "user" : "assistant",
          text: t.transcript ?? "",
        });
        return NextResponse.json({ ok: true });
      }

      case "status-update": {
        const status = String(message.status ?? "");
        const callId = await ensureCall(vapiCallId, phone);
        if (status === "ended") {
          await updateCall(callId, { status: "ended", ended_at: new Date().toISOString() });
        } else if (status === "in-progress") {
          await updateCall(callId, { status: "active" });
        }
        await emit(callId, "status", status, { status });
        return NextResponse.json({ ok: true });
      }

      case "end-of-call-report": {
        const callId = await ensureCall(vapiCallId, phone);
        const artifact = (message.artifact ?? {}) as Record<string, unknown>;
        const msgs = (artifact.messagesOpenAIFormatted ?? artifact.messages ?? []) as { role?: string; content?: string }[];
        const transcript = msgs
          .filter((m) => m.content && (m.role === "user" || m.role === "assistant"))
          .map((m) => ({ role: String(m.role), content: String(m.content) }));
        const existing = await getCall(callId);
        await updateCall(callId, {
          status: "ended",
          ended_at: new Date().toISOString(),
          recording_url: (artifact.recordingUrl as string) ?? null,
          transcript,
        });
        // The call becomes memory. Detached — nothing waits on it.
        if (existing?.caller_phone && transcript.length) {
          const { closeCall } = await import("@/lib/engine");
          closeCall({ callId, phone: existing.caller_phone }, transcript, true);
        }
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ ok: true, ignored: type });
    }
  } catch (err) {
    // Never surface a non-200: Vapi would drop it and the caller hears nothing.
    return NextResponse.json({ ok: false, softError: err instanceof Error ? err.message : String(err) });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "zhanggui vapi webhook",
    restaurant: RESTAURANT.name,
    tools: ["guest.identify", "menu.lookup", "order.add_item", "order.finalize", "staff.escalate"],
  });
}
