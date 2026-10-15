# Community Events Board

An admin posts local events (music nights, workshops, food fairs…). Visitors browse and filter them, sign up, pick favourite categories for a personal feed, set reminders, and design a card for each event.

- **Frontend:** Next.js 16 (App Router), Tailwind CSS 4, shadcn/ui, Motion: [`FE/`](FE/)
- **Backend:** NestJS 11 JSON API, PostgreSQL 16, Sequelize: [`BE/`](BE/)

The web pages only talk to the JSON API, so a mobile app can use the same endpoints with a Bearer token.

## Run it locally (about 5 minutes)

Requirements: **Node.js 22+** and **Docker Desktop**. Without Docker, use any PostgreSQL 14+ and edit the `DB_CONFIG_*` values in `BE/.env`.

```bash
# 1. Database (PostgreSQL 16 on host port 55432)
docker compose up -d

# 2. Env files: creates BE/.env and FE/.env.local with one shared random JWT secret
node scripts/setup-env.mjs

# 3. Backend: http://localhost:3001 (Swagger docs at /api/docs)
cd BE
npm ci
npm run db:migrate
npm run db:seed
npm run dev

# 4. Frontend, in a second terminal: http://localhost:3000
cd FE
npm ci
npm run dev
```

`npm run db:seed` creates the admin account and 15 sample events: 10 upcoming, 3 past and 2 inactive, across all five categories and four cities. Event dates are set relative to the moment you run the seed, so the upcoming events stay upcoming whenever you try it. Re-running the seed is safe.

### Admin login

| URL | Email | Password |
| --- | --- | --- |
| http://localhost:3000/admin/login | `admin@example.com` | `Admin@12345` |

These come from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `BE/.env`. Visitors create their own accounts at `/signup`.

## API

Base URL `http://localhost:3001/api/v1`. Every response is JSON in the form `{ status, message, data, metaData? }`. Protected routes need `Authorization: Bearer <token>`.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/signup` | Public | Create a visitor account, returns `{ token, user }` |
| POST | `/auth/login` | Public | Log in (visitor or admin), returns `{ token, user }` |
| GET | `/auth/me` | User | Current user and whether favourites are set |
| GET | `/events?category=&city=&q=&page=&limit=` | Public | Active upcoming events, nearest first, filters combined |
| GET | `/events/filters` | Public | Categories and cities for the filter controls |
| GET | `/events/:id` | Public | One active event |
| GET / PUT | `/favourites` | User | Read or replace favourite categories |
| GET | `/feed?page=&limit=` | User | Upcoming events from favourite categories |
| GET | `/reminders` | User | Ids of events with a reminder |
| PUT | `/reminders/:eventId` | User | `{ enabled }` turns a reminder on or off |
| GET / PUT | `/card-design/:eventId` | User | Read or save `{ theme, stickers }` |
| GET | `/admin/events?page=&limit=` | Admin | All events, including inactive and past |
| POST | `/admin/events` | Admin | Create an event |
| PATCH | `/admin/events/:id/status` | Admin | `{ isActive }`; events are never deleted |
| GET | `/health` | Public | API and database status |

The Next.js app adds `/api/auth/login`, `/api/auth/signup` and `/api/auth/logout`, which manage the session cookie. It also forwards `/api/*` to the routes above.

## Questions

### 1. Database structure, and why

```
users (id, email UNIQUE, password_hash, role)
categories (code PK, name)                     -- music, workshop, food, sports, kids
events (id, title, category_code FK, city, starts_at TIMESTAMPTZ,
        price_paise INTEGER, description, image_url, is_active)
user_favourite_categories (user_id, category_code)          PK (user_id, category_code)
event_reminders (user_id, event_id, enabled)                 PK (user_id, event_id)
event_card_designs (user_id, event_id, theme, stickers[])    PK (user_id, event_id)
```

Each user preference is one row keyed by `(user, category)` or `(user, event)`. The composite primary key blocks duplicates, and saving can be a single `INSERT … ON CONFLICT`, so quick repeated taps can't race.

Prices are stored as integer paise (₹1,50,000 = 15000000) to avoid float rounding. Times are stored as `TIMESTAMPTZ` and shown in India time.

Deactivating an event only flips `is_active`, so nothing is ever deleted. CHECK constraints and foreign keys hold the rules even if the application has a bug. The full diagram is in [`BE/DATABASE_SCHEMA.md`](BE/DATABASE_SCHEMA.md).

### 2. How the filter query works, and which index

Every condition is joined with AND: `is_active AND starts_at > now`, then each filter only if it was given:
- `category_code = ?`
- `lower(city) = lower(?)`
- `(title ILIKE ? OR description ILIKE ?)`

Search text is escaped, so `%` and `_` match literally. Results are ordered `starts_at, id`, and `LIMIT/OFFSET` returns the page. The same WHERE clause feeds the count used for pagination.

These indexes exist already, in the migration: `(is_active, starts_at, id)`, `(category_code, is_active, starts_at, id)` and `(lower(city), is_active, starts_at, id)`. They match the equality filters plus the sort, so the database can read rows already in date order.

The next index I would add is a `pg_trgm` GIN index on `title` and `description`, because `ILIKE '%night%'` can't use a normal B-tree. It isn't worth it at this data size, so I'd add it only once real search traffic shows it's needed.

### 3. Passwords and admin protection

**Passwords.** They are hashed with **scrypt**, built into Node, using a random 16-byte salt per password. The cost settings are stored inside the hash, and checks use a constant-time compare. Wrong passwords and unknown emails get the same 401 and take about the same time. Signup always creates role `user`, and extra fields such as `role` are rejected.

**Tokens.** After login, Next.js stores the JWT in an **httpOnly, SameSite=Lax** cookie, so page scripts can't read it.

**Admin protection** works on three server-side layers:
1. `FE/proxy.ts` checks the JWT's signature, expiry, issuer and role before `/admin` renders, and redirects otherwise.
2. The admin layout checks the role again.
3. The NestJS API guards every route by default, and `@Roles(Admin)` on the admin controller returns 401 or 403 even if someone calls the API directly.

## AI assistance

- **OpenAI Codex** was used for the backend foundation: scaffold, configuration, JWT guard, request context, audit fields, models, migrations and their tests.
- **Claude Code (Claude Opus 5.5)** was used to build the rest:
  - Docker setup, password hashing, seed data and the env setup script.
  - All feature endpoints: auth, events, admin, favourites, feed, reminders and card design.
  - The whole Next.js frontend.
  - Browser-based checks and this README.
