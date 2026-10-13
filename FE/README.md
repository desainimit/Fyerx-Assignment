# Frontend (Next.js)

Next.js 16 App Router, Tailwind CSS 4, shadcn/ui (Radix), Motion and lucide icons. For setup, see the [root README](../README.md).

```bash
npm run dev     # http://localhost:3000 (the backend must be running on :3001)
npm run build   # production build
npm run lint
```

## How it talks to the API

- The browser only calls this app's `/api/*` routes.
- `app/api/auth/{login,signup,logout}` call the backend and keep the returned JWT in an **httpOnly, SameSite=Lax** cookie (`ceb_session`). The token never reaches page JavaScript.
- `app/api/[...path]/route.ts` forwards every other `/api/*` request to `BACKEND_URL` and adds `Authorization: Bearer <token>` from the cookie.
- `proxy.ts` checks the JWT on the server (signature, expiry, issuer, audience and role) before `/admin`, `/feed` and `/favourites` render. The admin layout checks the role again.

## Where things are

```text
app/page.tsx                 events list (filters live in the URL)
app/events/[id]/             event page: Remind me + Design your card
app/feed, app/favourites     personal feed and category picker
app/login, app/signup        visitor auth
app/admin/login              admin login
app/admin/(dashboard)/       admin event list and "Add event" form
components/                  event card, header, states, pagination, card designer, remind button
lib/format.ts                ₹ prices (en-IN) and "Sat, 18 Oct, 6:30 PM" dates in India time
lib/use-api.ts               data loading with loading/error state and request cancelling
```

`.env.local` (created by `node ../scripts/setup-env.mjs`):

| Variable | Value |
| --- | --- |
| `BACKEND_URL` | `http://localhost:3001/api/v1` |
| `JWT_SECRET` | Same value as `BE/.env` |
