# Backend foundation

NestJS 11 with strict TypeScript, PostgreSQL, and Sequelize. This phase implements infrastructure and health only; the feature controllers have no handlers.

## Quick setup

Requirements: Node.js 22+, npm 11+, and an existing PostgreSQL database. No Docker or database provisioning is included. Once database access is available, setup should take under five minutes on a typical connection.

From the project root, in PowerShell:

```powershell
cd BE
npm ci
Copy-Item .env.example .env
```

Edit `.env` with your PostgreSQL host, username, password, database, port, and SSL requirement. The database must already exist. For a hosted database, set `DB_CONFIG_SSL=true` when TLS is required; server certificates are verified.

Then start the backend:

```powershell
npm run dev
```

API: http://localhost:3001/api/v1/health

Swagger (development): http://localhost:3001/api/docs

Startup validates configuration and attempts a bounded database connection before listening. With missing credentials or an unavailable database, startup fails instead of pretending the backend is ready. Application tables are never synchronized automatically.

## Configuration

Environment selection uses standard `NODE_ENV` values: `development`, `test`, or `production`. Configuration loads `.env.<NODE_ENV>` before `.env`; existing process variables take precedence. Environment files are ignored by Git.

| Variable             | Default / requirement                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `NODE_ENV`           | `development`                                                                              |
| `PORT`               | `3001`, integer from 1–65535                                                               |
| `CORS_ORIGINS`       | `http://localhost:3000`; comma-separated HTTP(S) origins without paths or trailing slashes |
| `DB_CONFIG_HOST`     | Required                                                                                   |
| `DB_CONFIG_PORT`     | `5432`                                                                                     |
| `DB_CONFIG_USERNAME` | Required                                                                                   |
| `DB_CONFIG_PASSWORD` | Required                                                                                   |
| `DB_CONFIG_DATABASE` | Required; database must exist                                                              |
| `DB_CONFIG_SSL`      | `false`; accepts only `true` or `false`                                                    |
| `SWAGGER`            | `true` in development, `false` in test/production; optional explicit override              |

## Structure and native Nest conventions

```text
src/
  main.ts
  modules/
    app.module.ts
    modules.module.ts
    database/            database connection and migration context modules
    health/              health.controller.ts / health.service.ts / health.module.ts
    auth/                same controller/service/module pattern
    admin/
    events/
    favourites/
    feed/
    reminders/
    card-design/
  config/                environment validation and application setup
  database/sequelize/    connection options; database/migrate.ts is the CLI entry
  models/                reserved Sequelize models
  migrations/            timestamped application migrations, currently empty
  libs/                  migration service
  dtos/                  shared response types
  validators/            reserved request validation classes
  constants/             shared constants
  types/                 reserved custom types
  utils/                 reserved utilities
  common/                filters, interceptors, and reserved extension points
scripts/                 migration generator
test/                    HTTP tests and compiled-startup verification
```

Registration follows `AppModule → ModulesModule → DatabaseModule + feature modules`. All application Nest module definitions live under `src/modules`.

Controllers declare routes with `@Controller({ path: 'events', version: '1' })`; bootstrap uses `setGlobalPrefix('api')` and `VersioningType.URI`. There is no version folder or manually embedded version prefix.

Configuration uses `ConfigModule`/`ConfigService`; request validation uses native `ValidationPipe` with class-validator. Global response/error handling uses `APP_INTERCEPTOR` and `APP_FILTER`, native HTTP exceptions, and Nest's logger. Sequelize's native application shutdown hook closes connections.

Path aliases are handled by `nest build`. Production runs compiled JavaScript without `ts-node` or `tsc-alias`.

## API

| Method | Path             | Behavior                                                                                     |
| ------ | ---------------- | -------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/health` | Checks PostgreSQL connectivity; 200 when available, 503 after a runtime connectivity failure |
| GET    | `/api/docs`      | Swagger UI when enabled                                                                      |
| GET    | `/api/docs-json` | OpenAPI document when enabled                                                                |

Health success:

```json
{
  "status": true,
  "message": "Service is healthy",
  "data": { "service": "community-events-board", "database": "up" }
}
```

Errors use `{ "status": false, "message": "...", "error": "..." }` with the appropriate HTTP status. Unexpected errors return a generic message. Future services will return `ApiResult<T>`; the interceptor adds `status` once. Optional pagination metadata uses `total`, `page`, `limit`, and `totalPages`.

Unsupported versions, unversioned health URLs, and unfinished feature routes return 404. Admin login is not implemented, and no admin credentials or guard bypasses are supplied.

## Commands

| Command                               | Purpose                                       |
| ------------------------------------- | --------------------------------------------- |
| `npm run dev` / `npm run local`       | Development watch mode                        |
| `npm run debug`                       | Development debugger and watch mode           |
| `npm run build`                       | Compile with Nest CLI                         |
| `npm run prod`                        | Start compiled production backend             |
| `npm run check-types`                 | Type-check source, scripts, and tests         |
| `npm run check-lint`                  | Check ESLint without rewriting files          |
| `npm run check-format`                | Check formatting without rewriting files      |
| `npm run lint:fix` / `npm run format` | Apply lint or formatting fixes                |
| `npm test`                            | Unit tests                                    |
| `npm run test:e2e`                    | HTTP infrastructure tests                     |
| `npm run test:compiled`               | Verify compiled HTTP startup; run build first |

## Migrations

Schema synchronization and startup migrations are disabled. Migration commands reuse validated configuration and the Nest database module without starting an HTTP listener.

```powershell
npm run make:migration -- create-users
npm run db:migrate:status
npm run db:migrate
```

The generator creates a timestamped TypeScript file under `src/migrations`. Implement its `up` and `down` exports before running it; the generated functions are empty transaction templates. Pass the provided transaction to every schema operation.

After building, production uses compiled JavaScript migrations:

```powershell
npm run build
npm run db:migrate:status:prod
npm run db:migrate:prod
npm run prod
```

Umzug tracks executed migrations in `SequelizeMeta`. Commands with no pending migrations succeed without creating application tables. Normal backend startup does not create this metadata table.

## Verification and remaining work

Unit tests cover configuration parsing, fail-fast validation without credential leakage, TLS verification, safe migration generation, and migration discovery/execution using in-memory tracking.

HTTP tests use a database stub to cover native versioning, health failures/recovery, request validation, safe JSON errors, CORS, and optional Swagger. Test-only validation/error routes are never registered in production.

The compiled-startup check starts built application modules with a database stub, checks HTTP routing and disabled Swagger, and checks that the actual compiled entry exits on invalid configuration. It loads no TypeScript runtime loader.

Live PostgreSQL connectivity and migration metadata persistence require your database credentials and are not proven by the stubbed tests. Once configured, run the health request and migration commands above.

Authentication, event APIs/tables, filters, pagination, favourites/feed, reminders, card designs, seed events, and the Next.js frontend remain pending. The root README records planned assignment answers and AI assistance.
