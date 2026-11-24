import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Trash2, X } from "lucide-react";
import { api } from "../api.js";
import { LEAD_STATUS, ago, fullDate, pkr, priceShort } from "../format.js";
import { ConfirmButton, ErrorNote, Spinner, Stamp } from "../ui/bits.jsx";
import VisitsTable from "./VisitsTable.jsx";

const SOURCE = { user_stated: "Customer said", tool_verified: "Verified by tool" };

export default function LeadPanel({ token, userId, lead, visits, onSetStatus, onClose, onUnauthorized }) {
  const [threads, setThreads] = useState({ status: "loading", items: [] });
  const [memory, setMemory] = useState({ status: "loading", items: [] });
  const [memError, setMemError] = useState("");
  const headRef = useRef(null);

  const load = useCallback(() => {
    const fail = (set) => (e) => { if (e.status === 401) onUnauthorized(); else set({ status: "error", items: [], error: e.message }); };
    api.admin.threads(token, userId).then((items) => setThreads({ status: "ready", items })).catch(fail(setThreads));
    api.admin.memory(token, userId).then((items) => setMemory({ status: "ready", items })).catch(fail(setMemory));
  }, [token, userId, onUnauthorized]);

  useEffect(() => { load(); headRef.current?.focus(); }, [load]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !e.defaultPrevented && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function forget(key) {
    setMemError("");
    try {
      await api.admin.deleteMemory(token, userId, key);
      setMemory((m) => ({ ...m, items: m.items.filter((i) => i.key !== key || i.valid_to) }));
      load();
    } catch (e) {
      setMemError(`Couldn't delete "${key}": ${e.message}`);
    }
  }

  const active = memory.items.filter((m) => !m.valid_to);
  const history = memory.items.filter((m) => m.valid_to);

  return (
    <aside className="panel" aria-labelledby="panel-title">
      <div className="panel-head">
        <div>
          <h2 id="panel-title" ref={headRef} tabIndex={-1}>{userId}</h2>
          {lead && <Stamp tone={{ new: "neutral", qualified: "go", visit_booked: "warn" }[lead.status]}>{LEAD_STATUS[lead.status]}</Stamp>}
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close lead details">
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="panel-body">
        {lead && (
          <dl className="facts">
            <div><dt>Budget</dt><dd>{lead.budget ? <>{priceShort(lead.budget)} <span className="dd-sub">{pkr(lead.budget)}</span></> : "Not stated"}</dd></div>
            <div><dt>Wants</dt><dd>{lead.kind === "house" ? "Property" : lead.kind === "car" ? "Car" : "Not stated"}</dd></div>
            <div><dt>City</dt><dd>{lead.city || "Not stated"}</dd></div>
            <div><dt>Timeline</dt><dd>{lead.timeline || "Not stated"}</dd></div>
          </dl>
        )}

        <section aria-labelledby="sec-visits">
          <h3 id="sec-visits">Visits</h3>
          {visits.length ? <VisitsTable compact visits={visits} onSetStatus={onSetStatus} /> : <p className="muted">No visits booked.</p>}
        </section>

        <section aria-labelledby="sec-memory">
          <h3 id="sec-memory">What Maqbool remembers</h3>
          <p className="sec-hint">Facts carried into this customer's future chats. Delete anything wrong or that they asked to forget.</p>
          {memError && <p className="field-error" role="alert">{memError}</p>}
          {memory.status === "loading" && <Spinner label="Loading memory" />}
          {memory.status === "error" && <ErrorNote onRetry={load}>Couldn't load memory. {memory.error}</ErrorNote>}
          {memory.status === "ready" && active.length === 0 && <p className="muted">Nothing remembered yet.</p>}
          {active.length > 0 && (
            <ul className="memory">
              {active.map((m) => (
                <li key={m.key}>
                  <div>
                    <span className="mem-text">{m.text}</span>
                    <span className="mem-meta">{SOURCE[m.source] || m.source} · since {m.valid_from}</span>
                  </div>
                  <ConfirmButton onConfirm={() => forget(m.key)} confirmLabel="Delete?" aria-label={`Delete memory: ${m.text}`}>
                    <Trash2 size={16} aria-hidden="true" /> Delete
                  </ConfirmButton>
                </li>
              ))}
            </ul>
          )}
          {history.length > 0 && (
            <details className="mem-history">
              <summary><ChevronRight size={16} aria-hidden="true" className="chev" />Earlier values ({history.length})</summary>
              <ul>{history.map((m, i) => <li key={i}><s>{m.text}</s> <span className="muted">until {m.valid_to}</span></li>)}</ul>
            </details>
          )}
        </section>

        <section aria-labelledby="sec-threads">
          <h3 id="sec-threads">Conversations</h3>
          {threads.status === "loading" && <Spinner label="Loading conversations" />}
          {threads.status === "error" && <ErrorNote onRetry={load}>Couldn't load conversations. {threads.error}</ErrorNote>}
          {threads.status === "ready" && threads.items.length === 0 && <p className="muted">No conversations yet.</p>}
          {threads.items.map((t, i) => (
            <details key={t.thread_id} className="thread" open={i === 0}>
              <summary>
                <ChevronRight size={16} aria-hidden="true" className="chev" />
                <span>{t.messages.find((m) => m.role === "user")?.content.slice(0, 60) || t.thread_id}</span>
                <span className="muted" title={fullDate(t.updated_at)}>{t.messages.length} messages · {ago(t.updated_at)}</span>
              </summary>
              <ol className="transcript">
                {t.messages.map((m, j) => (
                  <li key={j} className={m.role === "user" ? "t-user" : "t-ai"}>
                    <span className="t-who">{m.role === "user" ? userId : "Maqbool"}</span>
                    <p>{m.content}</p>
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </section>
      </div>
    </aside>
  );
}
