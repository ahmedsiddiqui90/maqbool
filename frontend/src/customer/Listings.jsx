import { useMemo, useState } from "react";
import { Car, House } from "lucide-react";
import { ErrorNote, PriceBoard, Spinner } from "../ui/bits.jsx";

const KINDS = [
  { id: "all", label: "All" },
  { id: "car", label: "Cars" },
  { id: "house", label: "Property" },
];

export default function Listings({ state, onRetry, onAsk }) {
  const [kind, setKind] = useState("all");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState("price-asc");

  const cities = useMemo(() => [...new Set(state.items.map((l) => l.city))].sort(), [state.items]);
  const counts = useMemo(() => ({
    all: state.items.length,
    car: state.items.filter((l) => l.kind === "car").length,
    house: state.items.filter((l) => l.kind === "house").length,
  }), [state.items]);

  const shown = state.items
    .filter((l) => (kind === "all" || l.kind === kind) && (!city || l.city === city))
    .sort((a, b) => (sort === "price-asc" ? a.price - b.price : b.price - a.price));

  return (
    <section className="lot" aria-labelledby="lot-title">
      <div className="lot-head">
        <h1 id="lot-title">On the lot</h1>
        <div className="lot-filters">
          <div className="segmented" role="group" aria-label="Type">
            {KINDS.map((k) => (
              <button key={k.id} type="button" aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
                {k.label} <span className="count">{counts[k.id]}</span>
              </button>
            ))}
          </div>
          <label className="field-inline">
            <span>City</span>
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All cities</option>
              {cities.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="field-inline">
            <span>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </label>
        </div>
      </div>

      {state.status === "loading" && state.items.length === 0 && <div className="lot-state"><Spinner label="Loading listings" /></div>}
      {state.status === "error" && (
        <div className="lot-state"><ErrorNote onRetry={onRetry}>Couldn't load listings. {state.error}</ErrorNote></div>
      )}
      {state.status === "ready" && shown.length === 0 && (
        <div className="lot-state empty">
          <p>Nothing matches these filters.</p>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { setKind("all"); setCity(""); }}>Clear filters</button>
        </div>
      )}

      {shown.length > 0 && (
        <ul className="lot-grid">
          {shown.map((l) => {
            const Icon = l.kind === "car" ? Car : House;
            const visit = l.kind === "car" ? "test drive" : "site visit";
            return (
              <li key={l.id} className="listing">
                <h2 className="listing-title">
                  <Icon size={18} aria-hidden="true" />
                  <span>{l.title}</span>
                  <span className="listing-id">{l.id}</span>
                </h2>
                <p className="listing-details">{l.kind === "car" ? "Car" : "Property"} · {l.city} · {l.details}</p>
                <PriceBoard price={l.price} />
                <div className="listing-actions">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => onAsk(`Tell me more about ${l.title} (${l.id}).`)}>
                    Ask about this
                  </button>
                  <button type="button" className="btn btn-link btn-sm" onClick={() => onAsk(`Book a ${visit} for ${l.id} on `)}>
                    Book a {visit}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
