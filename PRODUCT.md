# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + React single-page app in `frontend/`, two areas (customer chat, admin dashboard), built to static files and deployed to Vercel. Talks to the FastAPI backend (`app/api.py`, hosted on Render) over the JSON API in `docs/contracts.md`.

## Users

- **Customers (primary):** people in Pakistan shopping for a used car or a house/flat/plot from one dealer. They arrive wanting to know what fits their budget, what the installment would be, what documents or policies apply, and to book a test drive or site visit. Often on a phone, writing in English or Roman Urdu.
- **Dealer staff (admin):** sales staff at a desk (laptop, occasionally phone) who triage incoming leads, read conversations, confirm or cancel booked visits, and inspect or delete what the bot remembers about a customer.
- **Hackathon graders:** evaluate the agent through the same chat; demo users `ali`, `sana`, `bilal` exist for switching identities.

## Product Purpose

Maqbool is an AI lead closer: it answers new leads within a minute, qualifies budget, kind, city and timeline, recommends real listings, does exact financing maths, answers policy questions with citations, and books visits only after an explicit "yes". Success: a lead reaches a booked visit, and staff can see and act on every lead without reading raw logs.

## Positioning

The bot never invents listings, prices or maths (tools only), cites dealer policy or says "I don't know", and never books anything without the customer's explicit confirmation. Staff see exactly what the bot remembers per customer and can delete it.

## Operating Context

- Chat: `POST /chat {user_id, thread_id, message}` → `{reply, tool_calls, tokens}`. Booking is a two-turn flow: the reply asks "Confirm visit to … at …? (yes/no)", the next message in the same thread answers.
- New conversation = new `thread_id` (`"t-" + Date.now()`); same `user_id` keeps long-term memory across threads.
- Listings grid from public `GET /listings`.
- Admin endpoints need header `X-Admin-Token`; 401 otherwise. Stats, leads, visits (status booked → confirmed/cancelled), threads per user, memory per user (delete by key).
- Money is always integer PKR; the UI formats it (lakh/crore are familiar local units).

## Capabilities and Constraints

- No customer login; the user id is chosen in the UI (demo switcher).
- The `/chat` response shape is fixed by the grader; the frontend reads `reply` text and may display `tool_calls`.
- The backend can be slow on a cold start (free hosting, RAG model warm-up); the UI must tolerate multi-second waits.
- UI text in English. The bot may reply in Roman Urdu.

## Brand Commitments

Name: Maqbool. No existing logo, colors or fonts.

## Evidence on Hand

- Synthetic listings in `data/listings.json` (10 cars, 10 houses/plots across Pakistani cities). No real photos of listings exist; do not fabricate them.
- No testimonials, customer counts or press. Do not invent any.

## Product Principles

1. Trust over persuasion: show what the bot did (tools used, sources cited) rather than hype.
2. Every risky action is visibly confirmed by a human (customer yes/no; staff confirm/cancel).
3. Staff should reach any lead's conversation, visits and memory in two clicks.
4. Fast to the first useful answer: suggested starting prompts, no forms before chatting.

## Accessibility & Inclusion

Target WCAG 2.2 AA. Mobile-first for the customer chat; keyboard-operable admin.
