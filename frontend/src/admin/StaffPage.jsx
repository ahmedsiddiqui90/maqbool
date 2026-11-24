import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { KeyRound, LogOut, RefreshCw } from "lucide-react";
import { api } from "../api.js";
import { ago, percent } from "../format.js";
import { session } from "../storage.js";
import { ErrorNote, ShellSlot, Spinner } from "../ui/bits.jsx";
import LeadsTable from "./LeadsTable.jsx";
import VisitsTable from "./VisitsTable.jsx";
import LeadPanel from "./LeadPanel.jsx";

const TOKEN_KEY = "maqbool.adminToken";

export default function StaffPage() {
  const [token, setToken] = useState(() => session.get(TOKEN_KEY, ""));
  const signOut = () => { session.remove(TOKEN_KEY); setToken(""); };

  if (!token) return <TokenGate onToken={(t) => { session.set(TOKEN_KEY, t); setToken(t); }} />;
  return <Dashboard token={token} onUnauthorized={signOut} onSignOut={signOut} />;
}

function TokenGate({ onToken }) {
  const [value, setValue] = useState("");
  const [state, setState] = useState({ busy: false, error: "" });

  async function submit(e) {
    e.preventDefault();
    const t = value.trim();
    if (!t) { setState({ busy: false, error: "Enter the staff token to continue." }); return; }
    setState({ busy: true, error: "" });
    try {
      await api.admin.stats(t);
      onToken(t);
    } catch (err) {
      setState({ busy: false, error: err.status === 401 ? "That token was not accepted. Check it with your manager and try again." : err.message });
    }
  }

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={submit} noValidate>
        <KeyRound size={28} aria-hidden="true" className="gate-icon" />
        <h1>Staff dashboard</h1>
        <p>Leads, booked visits, conversations and customer memory. Enter the staff token to open it.</p>
        <label htmlFor="token">Staff token</label>
        <input
          id="token"
          type="password"
          autoComplete="current-password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={!!state.error}
          aria-describedby={state.error ? "token-error" : undefined}
          autoFocus
        />
        {state.error && <p id="token-error" className="field-error" role="alert">{state.error}</p>}
        <button type="submit" className="btn btn-go btn-block" disabled={state.busy}>
          {state.busy ? "Checking…" : "Open dashboard"}
        </button>
        <p className="gate-foot">The token stays in this browser tab only and is cleared when you close it.</p>
      </form>
    </div>
  );
}

function Dashboard({ token, onUnauthorized, onSignOut }) {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "visits" ? "visits" : "leads";
  const lead = params.get("lead");
  const [data, setData] = useState({ status: "loading", stats: null, leads: [], visits: [], at: null });
  const [, tick] = useState(0);

  const setParam = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: false });
  };

  const load = useCallback(async () => {
    setData((d) => ({ ...d, status: d.at ? "refreshing" : "loading" }));
    try {
      const [stats, leads, visits] = await Promise.all([api.admin.stats(token), api.admin.leads(token), api.admin.visits(token)]);
      setData({ status: "ready", stats, leads, visits, at: new Date().toISOString() });
    } catch (e) {
      if (e.status === 401) { onUnauthorized(); return; }
      setData((d) => ({ ...d, status: "error", error: e.message }));
    }
  }, [token, onUnauthorized]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 30_000);
    const c = setInterval(() => tick((n) => n + 1), 15_000); // keep "updated x ago" fresh
    return () => { clearInterval(t); clearInterval(c); };
  }, [load]);

  const setVisit = useCallback(async (id, status) => {
    const updated = await api.admin.setVisitStatus(token, id, status);
    setData((d) => ({ ...d, visits: d.visits.map((v) => (v.id === id ? { ...v, ...updated } : v)) }));
    load();
  }, [token, load]);

  const awaiting = useMemo(() => data.visits.filter((v) => v.status === "booked").length, [data.visits]);
  const s = data.stats;

  if (data.status === "loading") return <div className="staff-state"><Spinner label="Loading dashboard" /></div>;

  return (
    <div className={`staff${lead ? " has-panel" : ""}`}>
      <ShellSlot>
        <button type="button" className="btn btn-shell" onClick={onSignOut}>
          <LogOut size={16} aria-hidden="true" /> Sign out
        </button>
      </ShellSlot>

      <div className="staff-main">
        <div className="staff-bar">
          {s && (
            <dl className="tally" aria-label="Summary">
              <div><dt>Leads</dt><dd>{s.leads}</dd></div>
              <div><dt>Qualified</dt><dd>{s.qualified}</dd></div>
              <div><dt>Visits booked</dt><dd>{s.visits_booked}</dd></div>
              <div><dt>Conversion</dt><dd>{percent(s.conversion_rate)}</dd></div>
            </dl>
          )}
          <div className="staff-refresh">
            <span aria-live="polite">{data.status === "refreshing" ? "Refreshing…" : data.at ? `Updated ${ago(data.at)}` : ""}</span>
            <button type="button" className="btn btn-outline btn-sm" onClick={load} disabled={data.status === "refreshing"}>
              <RefreshCw size={16} aria-hidden="true" /> Refresh
            </button>
          </div>
        </div>

        {data.status === "error" && <ErrorNote onRetry={load}>Couldn't refresh the dashboard. {data.error}</ErrorNote>}

        <div className="tabs" role="tablist" aria-label="Dashboard sections">
          <button role="tab" id="tab-leads" aria-controls="panel-leads" aria-selected={tab === "leads"} onClick={() => setParam({ tab: null })}>
            Leads <span className="count">{data.leads.length}</span>
          </button>
          <button role="tab" id="tab-visits" aria-controls="panel-visits" aria-selected={tab === "visits"} onClick={() => setParam({ tab: "visits" })}>
            Visits
            {awaiting > 0 ? <span className="count count-act" title="Waiting for staff to confirm">{awaiting} to confirm</span> : <span className="count">{data.visits.length}</span>}
          </button>
        </div>

        {tab === "leads" ? (
          <div role="tabpanel" id="panel-leads" aria-labelledby="tab-leads">
            <LeadsTable leads={data.leads} visits={data.visits} selected={lead} onOpen={(u) => setParam({ lead: u })} />
          </div>
        ) : (
          <div role="tabpanel" id="panel-visits" aria-labelledby="tab-visits">
            <VisitsTable visits={data.visits} onSetStatus={setVisit} onOpenLead={(u) => setParam({ lead: u })} />
          </div>
        )}
      </div>

      {lead && (
        <LeadPanel
          key={lead}
          token={token}
          userId={lead}
          lead={data.leads.find((l) => l.user_id === lead)}
          visits={data.visits.filter((v) => v.user_id === lead)}
          onSetStatus={setVisit}
          onClose={() => setParam({ lead: null })}
          onUnauthorized={onUnauthorized}
        />
      )}
    </div>
  );
}
