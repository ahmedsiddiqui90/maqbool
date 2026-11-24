/**
 * Signwriter-style illustration for a listing. These are drawings of the body type, not photos
 * of the actual car or property: there are no real listing photos, so we never fake one.
 */
const INK = "#1a1a17";
const PAINT = {
  white: "#f7f5ee", silver: "#c9ccc8", grey: "#8e9390", gray: "#8e9390",
  black: "#2b2d2b", red: "#c62f25", blue: "#2f5d8a",
};

export function plateKind(l) {
  const t = `${l.title} ${l.details}`.toLowerCase();
  if (l.kind === "car") {
    if (/fortuner|sportage|tucson|4x4|suv|prado|land cruiser/.test(t)) return "suv";
    if (/alto|mehran|swift|cultus|wagon r|vitz/.test(t)) return "hatch";
    return "sedan";
  }
  if (/\bplot\b/.test(t)) return "plot";
  if (/apartment|flat|studio/.test(t)) return "apartment";
  return "house";
}

function carColour(details) {
  const m = String(details).toLowerCase().match(/white|silver|grey|gray|black|red|blue/);
  return PAINT[m ? m[0] : "white"];
}

const CARS = {
  // side profiles, facing left, sitting on y=66
  sedan: "M18 60 L22 50 Q24 47 30 46 L50 45 L62 36 Q66 33 74 33 L104 33 Q112 33 118 38 L128 45 L140 47 Q146 48 146 54 L146 60 Q146 62 144 62 L20 62 Q18 62 18 60Z",
  hatch: "M28 60 L31 50 Q33 47 38 46 L52 45 L64 35 Q68 32 76 32 L110 32 Q118 32 121 39 L126 50 L130 52 Q132 54 132 58 L132 61 Q132 62 130 62 L30 62 Q28 62 28 60Z",
  suv: "M16 60 L17 47 Q18 43 24 42 L42 41 L52 29 Q55 26 62 26 L120 26 Q128 26 132 32 L138 42 L144 44 Q148 46 148 52 L148 60 Q148 62 146 62 L18 62 Q16 62 16 60Z",
};
const WINDOWS = {
  sedan: "M54 45 L64 37 Q67 35 73 35 L86 35 L86 45Z M90 35 L103 35 Q110 35 115 39 L122 45 L90 45Z",
  hatch: "M56 45 L66 36 Q69 34 76 34 L90 34 L90 45Z M94 34 L109 34 Q115 34 117 39 L120 45 L94 45Z",
  suv: "M46 41 L54 31 Q57 28 63 28 L86 28 L86 41Z M90 28 L119 28 Q125 28 128 33 L133 41 L90 41Z",
};
const WHEELS = { sedan: [44, 122], hatch: [50, 114], suv: [42, 124] };

function Car({ kind, paint }) {
  const [w1, w2] = WHEELS[kind];
  return (
    <g>
      <ellipse cx="82" cy="67" rx="66" ry="3.2" fill={INK} opacity=".14" />
      <path d={CARS[kind]} fill={paint} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d={WINDOWS[kind]} fill="#cfe1dc" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d={`M${kind === "suv" ? 18 : 22} 54 H${kind === "hatch" ? 130 : 144}`} stroke={INK} strokeWidth="1" opacity=".35" />
      {[w1, w2].map((x) => (
        <g key={x}>
          <circle cx={x} cy="61" r="8.5" fill={INK} />
          <circle cx={x} cy="61" r="3.6" fill="#d9d6cc" />
        </g>
      ))}
      <rect x={kind === "hatch" ? 29 : 18} y="51" width="6" height="3" rx="1" fill="#f6c625" stroke={INK} strokeWidth="1" />
    </g>
  );
}

function House() {
  return (
    <g stroke={INK} strokeWidth="2" strokeLinejoin="round">
      <ellipse cx="80" cy="69" rx="62" ry="3" fill={INK} opacity=".14" stroke="none" />
      <rect x="38" y="34" width="84" height="34" fill="#f2ead8" />
      <path d="M32 36 L80 12 L128 36Z" fill="#c62f25" />
      <rect x="72" y="48" width="16" height="20" fill="#0f3d2e" />
      <rect x="46" y="42" width="16" height="12" fill="#cfe1dc" />
      <rect x="98" y="42" width="16" height="12" fill="#cfe1dc" />
      <path d="M54 42 V54 M106 42 V54" strokeWidth="1.2" />
      <rect x="106" y="16" width="8" height="12" fill="#f2ead8" />
    </g>
  );
}

function Apartment() {
  const rows = [22, 34, 46];
  return (
    <g stroke={INK} strokeWidth="2" strokeLinejoin="round">
      <ellipse cx="80" cy="69" rx="56" ry="3" fill={INK} opacity=".14" stroke="none" />
      <rect x="44" y="12" width="52" height="56" fill="#efe6d2" />
      <rect x="96" y="28" width="26" height="40" fill="#e1d6bf" />
      <rect x="44" y="10" width="52" height="4" fill="#0f3d2e" />
      {rows.map((y) => [50, 64, 78].map((x) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="10" height="8" fill="#cfe1dc" strokeWidth="1.4" />
      )))}
      {[36, 50].map((y) => <rect key={y} x="103" y={y} width="12" height="8" fill="#cfe1dc" strokeWidth="1.4" />)}
      <rect x="64" y="58" width="12" height="10" fill="#0f3d2e" />
    </g>
  );
}

function Plot() {
  return (
    <g stroke={INK} strokeLinejoin="round">
      <path d="M14 66 L52 42 L146 42 L120 66Z" fill="#d8c9a3" strokeWidth="2" />
      <path d="M14 66 L52 42 L146 42 L120 66Z" fill="none" strokeWidth="1.4" strokeDasharray="4 3" opacity=".6" />
      {[[18, 64], [52, 43], [143, 43], [118, 64]].map(([x, y]) => (
        <rect key={x} x={x - 2} y={y - 7} width="4" height="8" fill="#f6c625" strokeWidth="1.2" />
      ))}
      <path d="M88 52 V22" strokeWidth="2.4" />
      <rect x="64" y="12" width="48" height="16" rx="1.5" fill="#0f3d2e" strokeWidth="2" />
      <text x="88" y="24.2" textAnchor="middle" fontFamily="'Barlow Condensed', sans-serif" fontWeight="800"
            fontSize="11" letterSpacing=".8" fill="#f6c625" stroke="none">PLOT</text>
    </g>
  );
}

export default function ListingPlate({ listing, className = "" }) {
  const kind = plateKind(listing);
  const isCar = listing.kind === "car";
  return (
    <figure className={`plate plate-${isCar ? "car" : "home"} ${className}`}>
      <svg viewBox="0 0 160 80" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Illustration of a ${kind === "hatch" ? "hatchback" : kind}`}>
        <rect width="160" height="80" fill={isCar ? "#e8efe9" : "#efe9dc"} />
        <rect y="58" width="160" height="22" fill={isCar ? "#d5e2d9" : "#e3dac6"} />
        {isCar ? <Car kind={kind} paint={carColour(listing.details)} />
          : kind === "plot" ? <Plot /> : kind === "apartment" ? <Apartment /> : <House />}
      </svg>
    </figure>
  );
}
