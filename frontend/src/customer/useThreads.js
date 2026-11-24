import { useCallback, useEffect, useState } from "react";
import { local } from "../storage.js";

// The backend has no customer "list my chats" endpoint, so each browser keeps its own
// transcript per demo user. The server still holds the real memory per user_id/thread_id.
const key = (user) => `maqbool.threads.${user}`;
const newThread = () => ({ id: "t-" + Date.now(), title: "New chat", updatedAt: new Date().toISOString(), messages: [] });

function load(user) {
  const list = local.get(key(user), []);
  return Array.isArray(list) && list.length ? list : [newThread()];
}

export function useThreads(user) {
  const [threads, setThreads] = useState(() => load(user));
  const [activeId, setActiveId] = useState(() => local.get(key(user) + ".active", null));

  useEffect(() => {
    const list = load(user);
    setThreads(list);
    const saved = local.get(key(user) + ".active", null);
    setActiveId(list.some((t) => t.id === saved) ? saved : list[0].id);
  }, [user]);

  useEffect(() => { local.set(key(user), threads.slice(0, 30)); }, [user, threads]);
  useEffect(() => { if (activeId) local.set(key(user) + ".active", activeId); }, [user, activeId]);

  const active = threads.find((t) => t.id === activeId) || threads[0];

  const update = useCallback((id, fn) => {
    setThreads((list) => list.map((t) => (t.id === id ? { ...fn(t), updatedAt: new Date().toISOString() } : t)));
  }, []);

  const start = useCallback(() => {
    // Reuse an untouched empty chat instead of piling up blanks.
    const blank = threads.find((t) => t.messages.length === 0);
    if (blank) { setActiveId(blank.id); return blank.id; }
    const t = newThread();
    setThreads((list) => [t, ...list]);
    setActiveId(t.id);
    return t.id;
  }, [threads]);

  return { threads, active, setActiveId, update, start };
}
