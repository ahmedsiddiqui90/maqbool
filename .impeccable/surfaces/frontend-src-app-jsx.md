---
version: 1
slug: "frontend-src-app-jsx"
primary_target: "frontend/src/App.jsx"
related_targets: ["frontend/src"]
---

# Maqbool frontend (customer chat + staff dashboard)

Scope: `frontend/` Vite + React SPA. Mode: Operate (both areas).
Audience/job: buyers chat to find, finance and book a car or property (phone-first); dealer staff triage leads, confirm visits, read threads, manage memory (desktop).
Constraints: `/chat` shape fixed (docs/contracts.md); admin needs X-Admin-Token; cold-start waits of several seconds; money is integer PKR.
Memorable moment: every price is a yellow windscreen price board; the booking confirm is a vermilion-ringed yes/no card.

## Direction contract

THESIS: A working sales chat and staff dashboard painted in a Pakistani showroom signwriter's enamel. Refuses the blue-bubble SaaS widget and grey stat-card admin.

OWN-WORLD: Bottle-green shell (#0f3d2e) with a signal-yellow rule; warm white ground; Barlow Condensed caps for board-style headings, Barlow for body; yellow windscreen price boards with slight tilt; vermilion reserved for the one item needing action now; visit states as stamped labels; hairline-ruled dense admin tables.

STORY: Customer sees what's on the lot, asks in plain words, watches the bot use tools, confirms bookings with one tap. Staff see who is hot, what each lead wants, and act in two clicks.

FIRST VIEWPORT: Green header (brand board, Chat / Listings / Staff tabs, "Chatting as" user switcher). Left: chat column with new-chat button, log, suggestion chips, composer. Right: "On the lot" listing grid with All/Cars/Property tabs; each card carries a price board and "Ask about this". Phone: chat full-width, listings as its own tab.

FORM: Showroom Signboard, candidate 7 of 7; seed:e024c75ae5f746da. Raises: stamped visit states (ticket wallet); strict hairline density for admin (Japanese high-density); vermilion reserved for the active item (orienteering).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
