import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, Calculator, CalendarCheck, Car, Check, FileText, House, LoaderCircle, LocateFixed, Plus, Search, Sparkles } from "lucide-react";
import { api } from "../api.js";
import { TOOL_ACTIVE, TOOL_LABELS, ago, toolDetail } from "../format.js";
import ListingPlate from "../ui/ListingPlate.jsx";
import { PriceBoard, RichText, Stamp } from "../ui/bits.jsx";
import { useThreads } from "./useThreads.js";

const MAX_LEN = 2000;
const STARTERS = [
  { icon: Car, text: "I want a car under 60 lakh in Lahore" },
  { icon: House, text: "Show me 2-bed apartments in Islamabad under 2 crore" },
  { icon: Calculator, text: "If I put 20% down on a 60 lakh car over 5 years, what's my monthly installment?" },
  { icon: FileText, text: "What documents do I need to buy a car?" },
];
const TOOL_ICONS = { search_listings: Search, calculate_financing: Calculator, search_policies: FileText, book_visit: CalendarCheck };

const isConfirmPrompt = (reply, tools) =>
  /\(yes\/no\)\s*$/i.test(reply.trim()) || (tools.some((t) => t.name === "book_visit") && /confirm/i.test(reply));

const uid = () => Math.random().toString(36).slice(2, 10);

/** Listings a reply refers to, by id ("c-002") or by name ("2019 Honda Civic"). */
export function findMentions(text, listings, max = 4) {
  const t = String(text || "").toLowerCase();
  const found = [];
  for (const l of listings) {
    const name = l.title.split(",")[0].trim().toLowerCase();
    const at = Math.min(...[t.indexOf(l.id.toLowerCase()), name.length > 8 ? t.indexOf(name) : -1].map((i) => (i < 0 ? Infinity : i)));
    if (at !== Infinity) found.push([at, l.id]);
  }
  return found.sort((a, b) => a[0] - b[0]).map(([, id]) => id).slice(0, max);
}

/** Apply one /chat/stream progress event to the live transcript. */
function step(steps, ev) {
  const settle = (list) => list.map((s) => (s.kind === "thinking" ? { ...s, done: true } : s));
  if (ev.type === "thinking") {
    const last = steps[steps.length - 1];
    if (last && last.kind === "thinking" && !last.done) return steps;
    return [...settle(steps), { id: uid(), kind: "thinking", done: false }];
  }
  if (ev.type === "tool") return [...settle(steps), { id: uid(), kind: "tool", name: ev.name, args: ev.args, done: false }];
  if (ev.type === "tool_done") {
    const i = steps.map((s) => s.kind === "tool" && !s.done && (!ev.name || s.name === ev.name)).lastIndexOf(true);
    return i < 0 ? steps : steps.map((s, j) => (j === i ? { ...s, done: true } : s));
  }
  return steps;
}

export default function Chat({ user, listings, draftRef, onMentions, onShowListing }) {
  const { threads, active, setActiveId, update, start } = useThreads(user);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(null); // thread id awaiting a reply
  const [steps, setSteps] = useState([]); // live transcript for the pending turn
  const [streamed, setStreamed] = useState(false);
  const [slow, setSlow] = useState(false);
  const logRef = useRef(null);
  const inputRef = useRef(null);

  draftRef.current = (text) => {
    setDraft(text);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) { el.focus(); el.setSelectionRange(text.length, text.length); }
    });
  };

  const messages = active?.messages || [];
  const openConfirm = messages.some((m) => m.confirm === "open");
  const busy = pending === active?.id;

  useLayoutEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy, steps.length, active?.id]);

  useEffect(() => {
    if (!busy) { setSlow(false); return; }
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, [busy]);

  // Autosize the composer.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [draft]);

  async function send(textIn) {
    const text = (textIn ?? draft).trim().slice(0, MAX_LEN);
    if (!text || pending) return;
    const threadId = active.id;
    setDraft("");
    update(threadId, (t) => ({
      ...t,
      title: t.messages.length ? t.title : text.slice(0, 48),
      messages: [
        ...t.messages.map((m) => (m.confirm === "open" ? { ...m, confirm: "answered" } : m)),
        { id: uid(), role: "user", text },
      ],
    }));
    setPending(threadId);
    setSteps([]);
    setStreamed(false);
    try {
      const res = await api.chatWithProgress(user, threadId, text, (ev) => {
        setStreamed(true);
        setSteps((s) => step(s, ev));
      });
      const tools = Array.isArray(res.tool_calls) ? res.tool_calls : [];
      const reply = String(res.reply || "");
      const mentions = findMentions(reply, listings);
      update(threadId, (t) => ({
        ...t,
        messages: [...t.messages, { id: uid(), role: "bot", text: reply, tools, mentions, confirm: isConfirmPrompt(reply, tools) ? "open" : undefined }],
      }));
      if (mentions.length) onMentions?.(mentions);
    } catch (e) {
      update(threadId, (t) => ({ ...t, messages: [...t.messages, { id: uid(), role: "bot", error: true, text: e.message, retry: text }] }));
    } finally {
      setPending(null);
      setSteps([]);
      inputRef.current?.focus();
    }
  }

  function retry(msg) {
    update(active.id, (t) => ({
      ...t,
      // drop the failed reply and the message it answered; send() re-adds the message
      messages: t.messages.filter((m, i, all) => m.id !== msg.id && !(all[i + 1]?.id === msg.id)),
    }));
    send(msg.retry);
  }

  const byId = Object.fromEntries(listings.map((l) => [l.id, l]));
  const sorted = [...threads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <section className="chat" aria-label="Chat with Maqbool">
      <div className="chat-head">
        <label className="thread-pick">
          <span className="sr-only">Conversation</span>
          <select value={active?.id} onChange={(e) => setActiveId(e.target.value)} disabled={!!pending}>
            {sorted.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}{t.messages.length ? ` · ${ago(t.updatedAt)}` : ""}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-outline" onClick={() => { start(); setDraft(""); inputRef.current?.focus(); }} disabled={!!pending}>
          <Plus size={18} aria-hidden="true" /> New chat
        </button>
      </div>

      <div className="chat-log" ref={logRef} aria-live="polite" aria-relevant="additions" aria-busy={busy}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <h2>Salaam! What are you looking for?</h2>
            <p>Ask about cars or property on our lot, monthly installments, documents and policies, or book a test drive or site visit.</p>
            <ul className="starters">
              {STARTERS.map(({ icon: Icon, text }) => (
                <li key={text}>
                  <button type="button" onClick={() => send(text)} disabled={!!pending}>
                    <Icon size={18} aria-hidden="true" />
                    <span>{text}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="msg msg-me"><span className="sr-only">You: </span>{m.text}</div>
          ) : m.error ? (
            <div key={m.id} className="msg msg-bot msg-error" role="alert">
              <p>{m.text}</p>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => retry(m)} disabled={!!pending}>Send again</button>
            </div>
          ) : (
            <BotMessage key={m.id} m={m} byId={byId} listings={listings} onAnswer={send} onShowListing={onShowListing} disabled={!!pending} />
          ),
        )}

        {busy && <LiveTranscript steps={steps} streamed={streamed} slow={slow} />}
      </div>

      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <label htmlFor="composer-input" className="sr-only">Message</label>
        <textarea
          id="composer-input"
          ref={inputRef}
          rows={1}
          value={draft}
          maxLength={MAX_LEN}
          placeholder={openConfirm ? "Reply yes or no" : "Ask about a car, a house, installments…"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
          }}
          aria-describedby="composer-hint"
        />
        <button type="submit" className="send" disabled={!draft.trim() || !!pending} aria-label="Send message">
          <ArrowUp size={22} aria-hidden="true" />
        </button>
        <p id="composer-hint" className="composer-hint">
          Enter to send, Shift+Enter for a new line.
          {draft.length > MAX_LEN - 200 && <span> {MAX_LEN - draft.length} characters left.</span>}
        </p>
      </form>
    </section>
  );
}

/** What Maqbool is doing right now, step by step (real events from /chat/stream when available). */
function LiveTranscript({ steps, streamed, slow }) {
  const shown = steps.length ? steps : [{ id: "wait", kind: "thinking", done: false }];
  return (
    <div className="transcript-live" role="status" aria-label="Maqbool is working">
      <ol>
        {shown.map((s) => {
          const Icon = s.kind === "tool" ? TOOL_ICONS[s.name] || Search : Sparkles;
          const label = s.kind === "tool"
            ? (s.done ? TOOL_LABELS[s.name] : TOOL_ACTIVE[s.name]) || s.name
            : s.done ? "Thought it through" : "Thinking";
          const detail = s.kind === "tool" ? toolDetail(s.name, s.args) : "";
          return (
            <li key={s.id} className={s.done ? "is-done" : "is-active"}>
              <span className="step-mark" aria-hidden="true">
                {s.done ? <Check size={14} /> : <LoaderCircle size={14} className="spin" />}
              </span>
              <Icon size={14} aria-hidden="true" className="step-icon" />
              <span className="step-label">{label}{!s.done && "…"}</span>
              {detail && <span className="step-detail">{detail}</span>}
            </li>
          );
        })}
      </ol>
      {slow && !streamed && steps.length === 0 && (
        <p className="transcript-note">Waking up the server. The first reply can take up to a minute.</p>
      )}
    </div>
  );
}

function BotMessage({ m, byId, listings, onAnswer, onShowListing, disabled }) {
  // Older saved chats have no `mentions`; derive them the same way.
  const ids = (m.mentions || findMentions(m.text, listings)).filter((id) => byId[id]);
  return (
    <div className={`msg msg-bot${m.confirm ? " msg-confirm" : ""}`}>
      {m.confirm === "open" && <Stamp tone="stop">Awaiting your yes</Stamp>}
      <span className="sr-only">Maqbool: </span>
      <RichText text={m.text} />

      {ids.length > 0 && (
        <ul className="mentions" aria-label="Listings mentioned">
          {ids.map((id) => {
            const l = byId[id];
            return (
              <li key={id} className="mention">
                <ListingPlate listing={l} className="plate-thumb" />
                <div className="mention-body">
                  <span className="mention-title">{l.title}</span>
                  <span className="mention-meta">{l.id} · {l.city}</span>
                  <PriceBoard price={l.price} size="sm" />
                </div>
                <button type="button" className="btn btn-quiet btn-sm mention-show" onClick={() => onShowListing?.(id)}
                        aria-label={`Show ${l.title} on the lot`}>
                  <LocateFixed size={15} aria-hidden="true" /> Show
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {m.confirm === "open" && (
        <div className="confirm-actions">
          <button type="button" className="btn btn-go" onClick={() => onAnswer("yes")} disabled={disabled}>Yes, book it</button>
          <button type="button" className="btn btn-outline" onClick={() => onAnswer("no")} disabled={disabled}>No, don't book</button>
        </div>
      )}

      {m.tools?.length > 0 && (
        <ul className="tool-trail" aria-label="What Maqbool checked">
          {m.tools.map((t, i) => {
            const Icon = TOOL_ICONS[t.name] || Search;
            const detail = toolDetail(t.name, t.args);
            return (
              <li key={i}>
                <Icon size={14} aria-hidden="true" />
                <span>{TOOL_LABELS[t.name] || t.name}</span>
                {detail && <span className="trail-detail">{detail}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
