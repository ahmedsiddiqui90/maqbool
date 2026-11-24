import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, Calculator, CalendarCheck, Car, FileText, House, Plus, Search } from "lucide-react";
import { api } from "../api.js";
import { TOOL_LABELS, ago } from "../format.js";
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

export default function Chat({ user, listings, draftRef }) {
  const { threads, active, setActiveId, update, start } = useThreads(user);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(null); // thread id awaiting a reply
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
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, busy, active?.id]);

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
    try {
      const res = await api.chat(user, threadId, text);
      const tools = Array.isArray(res.tool_calls) ? res.tool_calls : [];
      const reply = String(res.reply || "");
      update(threadId, (t) => ({
        ...t,
        messages: [...t.messages, { id: uid(), role: "bot", text: reply, tools, confirm: isConfirmPrompt(reply, tools) ? "open" : undefined }],
      }));
    } catch (e) {
      update(threadId, (t) => ({ ...t, messages: [...t.messages, { id: uid(), role: "bot", error: true, text: e.message, retry: text }] }));
    } finally {
      setPending(null);
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
            <BotMessage key={m.id} m={m} byId={byId} onAnswer={send} disabled={!!pending} />
          ),
        )}

        {busy && (
          <div className="msg msg-bot msg-typing" role="status">
            <span className="dots" aria-hidden="true"><i /><i /><i /></span>
            <span>{slow ? "Waking up the server. The first reply can take up to a minute." : "Maqbool is replying…"}</span>
          </div>
        )}
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

function BotMessage({ m, byId, onAnswer, disabled }) {
  const ids = [...new Set((m.text.match(/\b[ch]-\d{3}\b/g) || []))].filter((id) => byId[id]).slice(0, 4);
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
                <span className="mention-title">{l.title}</span>
                <span className="mention-meta">{l.id} · {l.city}</span>
                <PriceBoard price={l.price} size="sm" />
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
            return (
              <li key={i} title={JSON.stringify(t.args)}>
                <Icon size={14} aria-hidden="true" /> {TOOL_LABELS[t.name] || t.name}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
