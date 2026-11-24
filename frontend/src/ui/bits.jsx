import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, LoaderCircle, TriangleAlert } from "lucide-react";
import { pkr, priceShort } from "../format.js";

/** The windscreen price board: short local units big, exact PKR beneath. */
export function PriceBoard({ price, size = "md" }) {
  return (
    <span className={`price price-${size}`}>
      <span className="price-board">{priceShort(price)}</span>
      <span className="price-exact">{pkr(price)}</span>
    </span>
  );
}

/** A stamped state label. tone: neutral | go | warn | stop | muted */
export function Stamp({ tone = "neutral", className = "", children }) {
  return <span className={`stamp stamp-${tone} ${className}`.trim()}>{children}</span>;
}

export function Spinner({ label = "Loading" }) {
  return (
    <span className="spinner" role="status">
      <LoaderCircle aria-hidden="true" size={18} />
      <span>{label}</span>
    </span>
  );
}

export function ErrorNote({ children, onRetry }) {
  return (
    <div className="error-note" role="alert">
      <TriangleAlert aria-hidden="true" size={18} />
      <span>{children}</span>
      {onRetry && (
        <button type="button" className="btn btn-quiet btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/** Renders into the header's right-hand slot (user switcher, sign out). */
export function ShellSlot({ children }) {
  const [el, setEl] = useState(null);
  useEffect(() => setEl(document.getElementById("shell-slot")), []);
  return el ? createPortal(children, el) : null;
}

/**
 * A destructive action that asks once, in place, instead of a modal.
 * First click arms it; second click within 5s runs it; Escape or blur disarms.
 */
export function ConfirmButton({ onConfirm, children, confirmLabel, className = "btn btn-quiet btn-sm", disabled, ...rest }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  const disarm = () => { clearTimeout(timer.current); setArmed(false); };
  return (
    <button
      type="button"
      className={`${className}${armed ? " is-armed" : ""}`}
      disabled={disabled}
      onClick={() => {
        if (armed) { disarm(); onConfirm(); return; }
        setArmed(true);
        timer.current = setTimeout(() => setArmed(false), 5000);
      }}
      onBlur={disarm}
      onKeyDown={(e) => e.key === "Escape" && disarm()}
      aria-live="polite"
      {...rest}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}

/** Minimal, safe rendering of bot text: paragraphs, bullet/numbered lists, **bold**, [n] citations. */
export function RichText({ text }) {
  const blocks = [];
  let list = null;
  for (const raw of String(text || "").split(/\n/)) {
    const line = raw.trim();
    const item = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (item) {
      if (!list) { list = { ordered: /^\d/.test(line), items: [] }; blocks.push(list); }
      list.items.push(item[1]);
      continue;
    }
    list = null;
    if (line) blocks.push(line);
  }
  return blocks.map((b, i) =>
    typeof b === "string" ? (
      <p key={i}><Inline text={b} /></p>
    ) : b.ordered ? (
      <ol key={i}>{b.items.map((t, j) => <li key={j}><Inline text={t} /></li>)}</ol>
    ) : (
      <ul key={i}>{b.items.map((t, j) => <li key={j}><Inline text={t} /></li>)}</ul>
    ),
  );
}

function Inline({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[\d+\])/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
    // The API returns only tool args, not the cited passages, so the marker shows the number and nothing it can't back up.
    if (/^\[\d+\]$/.test(p)) return <span key={i} className="cite"><span className="sr-only">policy source </span>{p.slice(1, -1)}</span>;
    return p;
  });
}

/** Opens a customer's details. A real button (initial, name, chevron), not an underlined link. */
export function PersonButton({ id, onClick, selected = false, label = "Open details for" }) {
  return (
    <button type="button" className={`person-btn${selected ? " is-selected" : ""}`} onClick={onClick}
            aria-label={`${label} ${id}`} aria-pressed={selected || undefined}>
      <span className="person-initial" aria-hidden="true">{String(id).slice(0, 1).toUpperCase()}</span>
      <span className="person-name">{id}</span>
      <ChevronRight size={16} aria-hidden="true" className="person-chev" />
    </button>
  );
}
