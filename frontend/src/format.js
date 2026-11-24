// Money arrives as integer PKR. Buyers think in lakh (1e5) and crore (1e7).
const trim = (n) => String(Number(n.toFixed(2)));

export function priceShort(pkr) {
  if (pkr == null) return "—";
  if (pkr >= 10_000_000) return `${trim(pkr / 10_000_000)} crore`;
  if (pkr >= 100_000) return `${trim(pkr / 100_000)} lakh`;
  return `PKR ${pkr.toLocaleString("en-PK")}`;
}

export function pkr(n) {
  if (n == null) return "—";
  return `PKR ${Number(n).toLocaleString("en-PK")}`;
}

export function percent(x) {
  return `${Math.round((x || 0) * 100)}%`;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
export function ago(iso) {
  if (!iso) return "";
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  const a = Math.abs(s);
  if (a < 60) return "just now";
  if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (a < 86400 * 30) return rtf.format(Math.round(s / 86400), "day");
  return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

export function fullDate(iso) {
  return iso ? new Date(iso).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" }) : "";
}

export const TOOL_LABELS = {
  search_listings: "Searched listings",
  calculate_financing: "Calculated installment",
  search_policies: "Checked dealer policy",
  book_visit: "Prepared booking",
};

// Live transcript wording: what is happening now, and what it was once finished.
export const TOOL_ACTIVE = {
  search_listings: "Searching listings",
  calculate_financing: "Calculating installment",
  search_policies: "Checking dealer policy",
  book_visit: "Preparing booking",
};

/** One short, human line describing a tool call's arguments. */
export function toolDetail(name, args = {}) {
  const a = args || {};
  if (name === "search_listings") {
    const kind = a.kind === "car" ? "cars" : a.kind === "house" ? "property" : "cars and property";
    const max = a.max_price && a.max_price < 1e9 ? ` under ${priceShort(a.max_price)}` : "";
    return `${kind}${max}${a.city ? ` in ${a.city}` : ""}`;
  }
  if (name === "calculate_financing") {
    const bits = [a.price && priceShort(a.price), a.down_payment_pct != null && `${a.down_payment_pct}% down`, a.years && `${a.years} years`];
    return bits.filter(Boolean).join(", ");
  }
  if (name === "search_policies") return a.query ? `“${a.query}”` : "";
  if (name === "book_visit") return [a.listing_id, a.when].filter(Boolean).join(" · ");
  return "";
}

export const LEAD_STATUS = {
  new: "New",
  qualified: "Qualified",
  visit_booked: "Visit booked",
};

export const VISIT_STATUS = {
  booked: "Awaiting staff",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};
