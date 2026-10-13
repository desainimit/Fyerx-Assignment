# Backend (NestJS API)

NestJS 11, strict TypeScript, PostgreSQL 16 and Sequelize. For setup, the API list and admin login, see the [root README](../README.md). The schema, constraints and indexes are in [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

## Commands

| Command                                               | Purpose                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `npm run dev`                                         | Development server with watch mode (http://localhost:3001) |
| `npm run db:migrate` / `db:migrate:status`            | Apply or list migrations                                   |
| `npm run db:seed`                                     | Admin account and 15 sample events (safe to re-run)        |
| `npm run make:migration -- <name>`                    | Generate an empty timestamped migration                    |
| `npm run build` / `npm run prod`                      | Compile, then run the compiled server                      |
| `npm run check-types` / `check-lint` / `check-format` | Static checks                                              |
| `npm test`                                            | Unit tests                                                 |
| `npm run test:e2e`                                    | HTTP tests (database stubbed)                              |
| `npm run test:db`                                     | Real PostgreSQL tests in an empty disposable database      |
| `npm run test:compiled`                               | Compiled startup check (run `build` first)                 |

Swagger UI is at http://localhost:3001/api/docs in development. Use **Authorize** with a token from `POST /auth/login`.

## Structure

```text
src/
  main.ts, app.module.ts
  modules/            one folder per feature: controller + service + module
    auth/             signup, login, me; JWT signing and verification
    events/           public browse/filters/detail; event-query.ts holds the shared filter logic
    admin/            admin-only event list, create, activate/deactivate
    favourites/ feed/ reminders/ card-design/ health/
  dtos/               request validation (class-validator) and response types
  models/             Sequelize models; all extend AuditModel
  migrations/         one migration per table
  database/           connection, migration CLI, seed script and sample data
  common/             global JWT guard, decorators, request context, filters, interceptors
  config/             env validation and app setup (prefix, versioning, CORS, Swagger)
  utils/password.ts   scrypt hashing
```

Routes are versioned under `/api/v1`. Services return `{ message, data, metaData? }`, and a global interceptor adds `status: true`. Errors come back as `{ status: false, message, error }`.

## Authentication

- A global guard requires `Authorization: Bearer <JWT>` on every route unless it is marked `@Public()`.
- `@Roles(UserRole.Admin)` on `AdminController` returns 403 for visitor tokens.
- `@CurrentUser('id')` supplies the verified user ID. Owner IDs are never read from the request body.
- Tokens are HS256, signed with `JWT_SECRET`, with a fixed issuer and audience. They expire after `JWT_TTL_SECONDS`, one hour by default.
- The frontend verifies the same tokens with the same secret.
- Passwords are hashed with scrypt (`src/utils/password.ts`). Login gives the same 401 for an unknown email and a wrong password.

## Configuration

`node ../scripts/setup-env.mjs` creates `.env` from `.env.example` with a random `JWT_SECRET`. Values:

| Variable                                                         | Default / rule                                                                                     |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `PORT`                                                           | `3001`                                                                                             |
| `CORS_ORIGINS`                                                   | `http://localhost:3000`                                                                            |
| `JWT_SECRET`                                                     | Required, at least 32 characters; must match `FE/.env.local`                                       |
| `JWT_TTL_SECONDS`                                                | `3600`                                                                                             |
| `DB_CONFIG_HOST` / `PORT` / `USERNAME` / `PASSWORD` / `DATABASE` | Match `docker-compose.yml`: `localhost`, `55432`, `postgres`, `postgres`, `community_events_board` |
| `DB_CONFIG_SSL`                                                  | `false`                                                                                            |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD`                                 | Used only by `db:seed`                                                                             |
| `SWAGGER`                                                        | On in development, off in test and production                                                      |

Startup validates configuration and fails fast if anything is missing. Tables are never synchronised automatically; schema changes go through migrations.

## Audit fields

Every table has `created_at`, `updated_at`, `created_by` and `updated_by`. Sequelize hooks fill them from the logged-in user stored in request context. Values sent by clients are ignored. Public writes, such as signup, and the seed script record a null actor.

The hooks only cover model writes. Raw SQL bypasses them, and `upsert` is blocked, so create-or-update writes use `bulkCreate` with `updateOnDuplicate`.

## Real database tests

These need an empty database whose name ends in `_test`. With the Docker Compose database:

```bash
docker exec community-events-postgres psql -U postgres -c "create database community_events_schema_test;"
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:55432/community_events_schema_test npm run test:db
```

In PowerShell, set the variable with `$env:TEST_DATABASE_URL = '...'` first. The suite refuses to run against the app database or any non-empty database, and it cleans up its own tables.
