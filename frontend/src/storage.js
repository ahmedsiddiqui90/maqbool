// Browser storage that never throws (private windows and blocked storage just fall back to memory).
const mem = new Map();

function store(kind) {
  try {
    const s = window[kind];
    const probe = "__maqbool";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

function make(kind) {
  const s = store(kind);
  return {
    get(key, fallback) {
      try {
        const raw = s ? s.getItem(key) : mem.get(kind + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      const raw = JSON.stringify(value);
      try {
        s ? s.setItem(key, raw) : mem.set(kind + key, raw);
      } catch {
        mem.set(kind + key, raw);
      }
    },
    remove(key) {
      try { s ? s.removeItem(key) : mem.delete(kind + key); } catch { /* ignore */ }
    },
  };
}

export const local = make("localStorage");
export const session = make("sessionStorage");
