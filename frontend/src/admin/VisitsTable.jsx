import { useState } from "react";
import { Check } from "lucide-react";
import { VISIT_STATUS, ago, fullDate } from "../format.js";
import { ConfirmButton, PersonButton, Stamp } from "../ui/bits.jsx";

const TONE = { booked: "stop", confirmed: "go", cancelled: "muted" };

export default function VisitsTable({ visits, onSetStatus, onOpenLead, compact = false }) {
  const awaiting = visits.filter((v) => v.status === "booked").length;
  const [filter, setFilter] = useState(awaiting && !compact ? "booked" : "");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [landed, setLanded] = useState(null); // visit whose stamp just changed

  const rows = [...visits]
    // a visit just confirmed/cancelled stays in view (with its new stamp) until the filter changes
    .filter((v) => !filter || v.status === filter || v.id === landed)
    // waiting-for-staff first, then newest first
    .sort((a, b) => (b.status === "booked") - (a.status === "booked") || String(b.created_at).localeCompare(String(a.created_at)));

  async function act(v, status) {
    setBusy(v.id); setError("");
    try { await onSetStatus(v.id, status); setLanded(v.id); }
    catch (e) { setError(`Couldn't update visit #${v.id}: ${e.message}`); }
    finally { setBusy(null); }
  }

  const actions = (v) => (
    <>
      {v.status === "booked" && (
        <button type="button" className="btn btn-go btn-sm" disabled={busy === v.id} onClick={() => act(v, "confirmed")}>
          <Check size={16} aria-hidden="true" /> Confirm
        </button>
      )}
      {v.status !== "cancelled" && (
        <ConfirmButton disabled={busy === v.id} onConfirm={() => act(v, "cancelled")} confirmLabel="Click again to cancel"
                       aria-label={`Cancel visit ${v.id}`}>
          Cancel
        </ConfirmButton>
      )}
    </>
  );

  if (compact) {
    return (
      <>
        {error && <p className="field-error" role="alert">{error}</p>}
        <ul className="visit-list">
          {rows.map((v) => (
            <li key={v.id} className={v.status === "cancelled" ? "is-void" : undefined}>
              <div className="visit-line"><span className="cell-strong">{v.listing_title}</span> <span className="muted">{v.listing_id}</span></div>
              <div className="visit-line visit-meta">
                <span>{v.when}</span>
                <Stamp key={v.status} tone={TONE[v.status]} className={landed === v.id ? "stamp-land" : ""}>{VISIT_STATUS[v.status] || v.status}</Stamp>
                <span className="visit-actions">{actions(v)}</span>
              </div>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <>
      {!compact && (
        <div className="table-tools">
          <div className="segmented" role="group" aria-label="Filter visits">
            <button type="button" aria-pressed={filter === "booked"} onClick={() => { setFilter("booked"); setLanded(null); }}>To confirm <span className="count">{awaiting}</span></button>
            <button type="button" aria-pressed={filter === ""} onClick={() => { setFilter(""); setLanded(null); }}>All <span className="count">{visits.length}</span></button>
          </div>
          <span className="table-hint">Customers have already said yes in chat. Confirm once the slot is arranged.</span>
        </div>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}

      {rows.length === 0 ? (
        <div className="table-empty">
          {filter === "booked"
            ? <><p><strong>All caught up.</strong> No visits are waiting for confirmation.</p><button type="button" className="btn btn-outline btn-sm" onClick={() => setFilter("")}>Show all visits</button></>
            : <p>No visits booked yet.</p>}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {!compact && <th scope="col">#</th>}
                <th scope="col">Listing</th>
                {!compact && <th scope="col">Customer</th>}
                <th scope="col">When</th>
                <th scope="col">Status</th>
                {!compact && <th scope="col">Booked</th>}
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id} className={v.status === "cancelled" ? "is-void" : undefined}>
                  {!compact && <td className="num">{v.id}</td>}
                  <th scope="row"><span className="cell-strong">{v.listing_title}</span> <span className="muted">{v.listing_id}</span></th>
                  {!compact && (
                    <td><PersonButton id={v.user_id} onClick={() => onOpenLead(v.user_id)} /></td>
                  )}
                  <td>{v.when}</td>
                  <td><Stamp key={v.status} tone={TONE[v.status]} className={landed === v.id ? "stamp-land" : ""}>{VISIT_STATUS[v.status] || v.status}</Stamp></td>
                  {!compact && <td title={fullDate(v.created_at)}>{ago(v.created_at)}</td>}
                  <td className="actions">{actions(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
