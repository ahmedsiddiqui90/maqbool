import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Store, UserRound } from "lucide-react";
import { api } from "../api.js";
import { local } from "../storage.js";
import { ShellSlot } from "../ui/bits.jsx";
import Chat from "./Chat.jsx";
import Listings from "./Listings.jsx";

export const DEMO_USERS = [
  { id: "ali", name: "Ali" },
  { id: "sana", name: "Sana" },
  { id: "bilal", name: "Bilal" },
];

export default function CustomerPage() {
  const [user, setUser] = useState(() => {
    const saved = local.get("maqbool.user", "ali");
    return DEMO_USERS.some((u) => u.id === saved) ? saved : "ali";
  });
  const [pane, setPane] = useState("chat"); // phone layout only
  const [listings, setListings] = useState({ status: "loading", items: [] });
  const draftRef = useRef(null); // Chat registers a setter so listing cards can prefill the composer

  useEffect(() => local.set("maqbool.user", user), [user]);

  const loadListings = useCallback(() => {
    setListings((l) => ({ ...l, status: "loading" }));
    api.listings()
      .then((items) => setListings({ status: "ready", items }))
      .catch((e) => setListings({ status: "error", items: [], error: e.message }));
  }, []);
  useEffect(loadListings, [loadListings]);

  const prefill = (text) => {
    setPane("chat");
    draftRef.current?.(text);
  };

  return (
    <div className="customer" data-pane={pane}>
      <ShellSlot>
        <label className="user-switch">
          <UserRound size={18} aria-hidden="true" className="user-icon" />
          <span className="user-label">Chatting as</span>
          <select value={user} onChange={(e) => setUser(e.target.value)} aria-describedby="user-hint">
            {DEMO_USERS.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <span id="user-hint" className="sr-only">Demo customers. Each one has separate chats and memory.</span>
        </label>
      </ShellSlot>

      <div className="pane-switch" role="tablist" aria-label="Show">
        <button role="tab" aria-selected={pane === "chat"} onClick={() => setPane("chat")}>
          <MessageSquare size={18} aria-hidden="true" /> Chat
        </button>
        <button role="tab" aria-selected={pane === "listings"} onClick={() => setPane("listings")}>
          <Store size={18} aria-hidden="true" /> On the lot
          {listings.items.length > 0 && <span className="count">{listings.items.length}</span>}
        </button>
      </div>

      <Chat user={user} listings={listings.items} draftRef={draftRef} />
      <Listings state={listings} onRetry={loadListings} onAsk={prefill} />
    </div>
  );
}
