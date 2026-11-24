# Maqbool frontend

Vite + React single-page app with two areas, both talking to the FastAPI backend (`app/api.py`) using the shapes in [`docs/contracts.md`](../docs/contracts.md):

- **Customer chat** (`/`): chat with Maqbool as a demo customer (`ali`, `sana`, `bilal`), see what is on the lot, and confirm bookings with Yes/No buttons. Each customer's past chats are kept in this browser (localStorage); the server keeps the real memory.
- **Staff dashboard** (`/staff`): needs the `ADMIN_TOKEN` (kept in this tab only). Leads table (search, status filter, sortable columns), visits waiting for confirmation, and a lead panel with visits, "what Maqbool remembers" (delete a fact) and full conversations. The URL keeps the open tab and lead (`/staff?tab=visits`, `/staff?lead=ali`), so links and Back work.

## Run locally

```bash
cd frontend
npm install
cp .env.example .env        # point VITE_API_URL at the backend (default http://localhost:8000)
npm run dev                 # http://localhost:5173
```

The backend's CORS is `*` by default (`CORS_ORIGINS`), so the dev server can call it directly.

## Deploy (Vercel)

Import the repo, set **Root Directory** to `frontend`, framework preset Vite, and add the env var `VITE_API_URL=https://<your-render-service>.onrender.com`. `vercel.json` rewrites every path to `index.html` so `/staff` works on refresh. After deploying, set `CORS_ORIGINS` on the backend to the Vercel URL.
