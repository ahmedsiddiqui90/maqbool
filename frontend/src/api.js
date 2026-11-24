// Thin client for the FastAPI backend. Shapes follow docs/contracts.md.
export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

const TIMEOUT_MS = 90_000; // free hosting can take ~a minute to wake up

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body, token, signal } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  if (signal) signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  let res;
  try {
    res = await fetch(API_URL + path, {
      method,
      signal: ctrl.signal,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { "X-Admin-Token": token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new ApiError(
      e.name === "AbortError"
        ? "The server took too long to answer. Please try again."
        : "Can't reach the server. Check your connection and try again.",
      0,
    );
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 401) throw new ApiError("That staff token was not accepted.", 401);
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).detail; } catch { /* not JSON */ }
    throw new ApiError(typeof detail === "string" && detail ? detail : `The server returned an error (${res.status}).`, res.status);
  }
  return res.json();
}

export const api = {
  chat: (user_id, thread_id, message) => request("/chat", { method: "POST", body: { user_id, thread_id, message } }),
  listings: () => request("/listings"),
  admin: {
    stats: (t) => request("/admin/stats", { token: t }),
    leads: (t) => request("/admin/leads", { token: t }),
    visits: (t) => request("/admin/visits", { token: t }),
    setVisitStatus: (t, id, status) => request(`/admin/visits/${id}/status`, { method: "POST", token: t, body: { status } }),
    threads: (t, user) => request(`/admin/threads/${encodeURIComponent(user)}`, { token: t }),
    memory: (t, user) => request(`/admin/memory/${encodeURIComponent(user)}`, { token: t }),
    deleteMemory: (t, user, key) => request(`/admin/memory/${encodeURIComponent(user)}/${encodeURIComponent(key)}`, { method: "DELETE", token: t }),
  },
};
