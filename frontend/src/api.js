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

// /chat/stream is optional (docs/contracts.md): if the backend doesn't have it, remember that
// and use /chat for the rest of the session.
let streamSupported = true;

/**
 * Send a chat turn and report live progress via onEvent({type: "thinking" | "tool" | "tool_done", ...}).
 * Resolves with the /chat-shaped result either way. `streamed` tells the caller whether progress was real.
 */
async function chatWithProgress(user_id, thread_id, message, onEvent = () => {}) {
  const body = { user_id, thread_id, message };
  if (streamSupported) {
    let res;
    try {
      res = await fetch(API_URL + "/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify(body),
      });
    } catch {
      res = null; // network trouble: let /chat produce the proper error message
    }
    if (res && (res.status === 404 || res.status === 405)) streamSupported = false;
    if (res && res.ok && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let sawEvent = false;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let cut;
          while ((cut = buf.indexOf("\n\n")) >= 0) {
            const chunk = buf.slice(0, cut);
            buf = buf.slice(cut + 2);
            const line = chunk.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            let event;
            try { event = JSON.parse(line.slice(6)); } catch { continue; }
            sawEvent = true;
            if (event.type === "done") return { ...event.result, streamed: true };
            onEvent(event);
          }
        }
      } catch {
        /* stream dropped */
      }
      // The stream ended without a result. If the turn already ran, re-sending it would book or
      // write twice, so only fall back when nothing arrived at all.
      if (sawEvent) throw new ApiError("The connection dropped before the reply arrived. Please check the chat and try again.", 0);
    }
  }
  const result = await request("/chat", { method: "POST", body });
  return { ...result, streamed: false };
}

export const api = {
  chat: (user_id, thread_id, message) => request("/chat", { method: "POST", body: { user_id, thread_id, message } }),
  chatWithProgress,
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
