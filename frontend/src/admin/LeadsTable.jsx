import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { LEAD_STATUS, ago, fullDate, pkr, priceShort } from "../format.js";
import { Stamp } from "../ui/bits.jsx";

const STATUS_TONE = { new: "neutral", qualified: "go", visit_booked: "warn" };
const FILTERS = [
  { id: "", label: "All" },
  { id: "new", label: "New" },
  { id: "qualified", label: "Qualified" },
  { id: "visit_booked", label: "Visit booked" },
];
const COLUMNS = [
  { id: "user_id", label: "Customer" },
  { id: "kind", label: "Wants" },
  { id: "budget", label: "Budget", num: true },
  { id: "city", label: "City" },
  { id: "timeline", label: "Timeline", cls: "col-optional" },
  { id: "status", label: "Status" },
  { id: "last_message", label: "Last message", nosort: true },
  { id: "updated_at", label: "Last active" },
];

export default function LeadsTable({ leads, visits, selected, onOpen }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState({ by: "updated_at", dir: "desc" });

  const awaitingUsers = useMemo(() => new Set(visits.filter((v) => v.status === "booked").map((v) => v.user_id)), [visits]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = leads.filter((l) =>
      (!status || l.status === status) &&
      (!needle || [l.user_id, l.city, l.kind, l.timeline, l.last_message].some((f) => String(f || "").toLowerCase().includes(needle))),
    );
    const { by, dir } = sort;
    const sign = dir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      const x = a[by], y = b[by];
      if (x == null && y == null) return 0;
      if (x == null) return 1; // blanks last either way
      if (y == null) return -1;
      return (typeof x === "number" ? x - y : String(x).localeCompare(String(y))) * sign;
    });
  }, [leads, q, status, sort]);

  const toggleSort = (by) =>
    setSort((s) => (s.by === by ? { by, dir: s.dir === "asc" ? "desc" : "asc" } : { by, dir: by === "updated_at" || by === "budget" ? "desc" : "asc" }));

  return (
    <>
      <div className="table-tools">
        <label className="search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search leads</span>
          <input type="search" placeholder="Search customer, city, message…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="segmented" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={status === f.id} onClick={() => setStatus(f.id)}>{f.label}</button>
          ))}
        </div>
        <span className="table-range" aria-live="polite">
          {rows.length === leads.length ? `${leads.length} leads` : `${rows.length} of ${leads.length} leads`}
        </span>
      </div>

      {leads.length === 0 ? (
        <div className="table-empty">
          <p><strong>No leads yet.</strong> They appear here as soon as a customer sends a first message in the customer chat.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="table-empty">
          <p>No leads match.</p>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { setQ(""); setStatus(""); }}>Clear search and filter</button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.id} scope="col" className={[c.num && "num", c.cls && sort.by !== c.id && c.cls].filter(Boolean).join(" ") || undefined}
                      aria-sort={sort.by === c.id ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
                    {c.nosort ? c.label : (
                      <button type="button" className="th-sort" onClick={() => toggleSort(c.id)}>
                        {c.label}
                        {sort.by === c.id && (sort.dir === "asc" ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />)}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.user_id} className={selected === l.user_id ? "is-selected" : undefined} onClick={() => onOpen(l.user_id)}>
                  <th scope="row">
                    <button type="button" className="row-open" onClick={(e) => { e.stopPropagation(); onOpen(l.user_id); }}>
                      {l.user_id}
                    </button>
                    {awaitingUsers.has(l.user_id) && <span className="act-dot" title="Has a visit waiting for confirmation"><span className="sr-only">Visit waiting for confirmation</span></span>}
                  </th>
                  <td>{l.kind === "house" ? "Property" : l.kind === "car" ? "Car" : <span className="muted">—</span>}</td>
                  <td className="num" title={l.budget ? pkr(l.budget) : undefined}>{l.budget ? priceShort(l.budget) : <span className="muted">—</span>}</td>
                  <td>{l.city || <span className="muted">—</span>}</td>
                  <td className={sort.by !== "timeline" ? "col-optional" : undefined}>{l.timeline || <span className="muted">—</span>}</td>
                  <td><Stamp tone={STATUS_TONE[l.status]}>{LEAD_STATUS[l.status] || l.status}</Stamp></td>
                  <td className="clip" title={l.last_message}>{l.last_message}</td>
                  <td title={fullDate(l.updated_at)}>{ago(l.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
