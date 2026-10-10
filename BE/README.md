# Backend foundation

NestJS 11 with strict TypeScript, PostgreSQL, and Sequelize. The foundation includes shared authentication/audit infrastructure, health, six typed application models, and six per-table migrations. Feature controllers have no business handlers or login endpoints. See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for the ER diagram, constraints, indexes, query contract, and migration order.

## Quick setup

Requirements: Node.js 22+, npm 11+, and an existing PostgreSQL database. No Docker or database provisioning is included. Once database access is available, setup should take under five minutes on a typical connection.

From the project root, in PowerShell:

```powershell
cd BE
npm ci
Copy-Item .env.example .env
```

Edit `.env` with your PostgreSQL host, username, password, database, port, and SSL requirement. The database must already exist. For a hosted database, set `DB_CONFIG_SSL=true` when TLS is required; server certificates are verified.

Generate a signing secret and paste the result into `JWT_SECRET` in `.env`:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

There is no default signing secret. Use a separate secret in each environment; never commit it.

Then start the backend:

```powershell
npm run db:migrate
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
| `JWT_SECRET`         | Required random signing secret, at least 32 characters                                     |
| `JWT_TTL_SECONDS`    | `3600`; integer from 1–86400                                                               |

## Structure and native Nest conventions

```text
src/
  main.ts
  app.module.ts          root application registration
  modules/
    modules.module.ts
    health/              health.controller.ts / health.service.ts / health.module.ts
    auth/                same controller/service/module pattern
    admin/
    events/
    favourites/
    feed/
    reminders/
    card-design/
  config/                environment validation and application setup
  database/              connection/migration modules, CLI, and sequelize/ options + audit hooks
  models/                AuditModel, six application models, explicit registry
  migrations/            six timestamped per-table migrations
  libs/                  migration service
  dtos/                  shared response types
  validators/            reserved request validation classes
  constants/             shared constants
  types/                 verified user and authenticated request types
  utils/                 reserved utilities
  common/                context, decorators, guards, middleware, filters, and interceptors
scripts/                 migration generator
test/                    HTTP tests and compiled-startup verification
```

Registration follows `AppModule → DatabaseModule + ModulesModule → feature modules`. This preserves the current layout with the root module in `src/` and database modules in `src/database/`; feature modules remain under `src/modules/`.

Controllers declare routes with `@Controller({ path: 'events', version: '1' })`; bootstrap uses `setGlobalPrefix('api')` and `VersioningType.URI`. There is no version folder or manually embedded version prefix.

Configuration uses `ConfigModule`/`ConfigService`; request validation uses native `ValidationPipe` with class-validator. Global response/error handling uses `APP_INTERCEPTOR` and `APP_FILTER`, native HTTP exceptions, and Nest's logger. Sequelize's native application shutdown hook closes connections.

Path aliases are handled by `nest build`. Production runs compiled JavaScript without `ts-node` or `tsc-alias`.

Use one alias per folder. Folders with `index.ts` use only the barrel alias: `@config`, `@database`, `@dtos`, `@validators`, `@constants`, `@models`, `@lib`, `@decorators`, `@filters`, and `@interceptors`. Export shared members through those indexes. Folders without an index retain wildcard aliases such as `@modules/auth/auth.service`, `@context/request-context`, `@guards/auth.guard`, `@middlewares/log.middleware`, and `@app-types/auth.types`; `@app` targets the root application module. Keep `./...` for sibling files, barrel exports, and internal imports that would otherwise import their own barrel.

Combine imports from the same module, using inline `type` when needed:

```ts
import { UserRole, type AuthUser } from '@app-types/auth.types';
import { CurrentUser, Public, Roles } from '@decorators';
```

ESLint rejects duplicate imports (including separate type/value imports) and parent-directory imports. Jest reads the same aliases from `tsconfig.json`; compiled startup checks that Nest resolves them without development loaders.

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

## Shared authentication

`AuthModule` registers a native `CanActivate` guard through `APP_GUARD`. Every controller handler requires `Authorization: Bearer <token>` unless explicitly marked `@Public()`. Health is public. Swagger is registered by Nest outside controller guards and remains accessible when enabled; it defaults to disabled in production.

`AuthService` uses `@nestjs/jwt` to sign and verify HS256 access tokens. Verification checks the signature, expiration, fixed issuer `community-events-board`, audience `community-events-board-api`, UUID `sub`, and `user`/`admin` role. Invalid or missing tokens produce 401; insufficient roles produce 403. Tokens in query parameters, cookies, or user-id headers are not accepted.

Use the decorators from `src/common/decorators`:

```ts
@Controller({ path: 'events', version: '1' })
export class EventsController {
  @Get()
  @Public()
  browse() {
    /* later: list active, upcoming events */
  }

  @Post()
  @Roles(UserRole.Admin)
  create(@CurrentUser() user: AuthUser) {
    /* later: create event */
  }
}
```

`@CurrentUser()` supplies the frozen, verified identity; `@CurrentUser('id')` supplies its ID. `@Roles(UserRole.Admin)` restricts access to admins and is already attached to the admin scaffold. Handler metadata overrides controller metadata. `@Public(false)` makes a handler protected inside a public controller.

Public routes skip authentication entirely, even if a token is supplied: their current user is undefined and audit actor is null. Do not mark a write that needs user attribution public. Authentication here is token verification only; password hashing/credential validation, signup/login, disabled-account checks, and token revocation are pending. Future login services can import `AuthModule` and call `AuthService.signAccessToken()` after checking credentials; there is no HTTP token-minting endpoint. Users now have a database model, but no account creation API or admin account is supplied.

## Request logging and context

`LogMiddleware` uses Nest's `Logger`, generates a server-side UUID in `X-Request-Id`, and opens a Node `AsyncLocalStorage` context before body parsing. This also captures malformed JSON, guard rejections, and missing routes. Each response logs once with method, path, HTTP status, duration, request ID, and verified user ID. It excludes query values, authorization headers, and request bodies.

The guard places the verified user in `RequestContextService`. Context survives awaited work and stays isolated between concurrent requests. It is separate from Sequelize transactions; continue passing transactions explicitly. Trusted background jobs can use `RequestContextService.run({ requestId, user }, callback)` for attribution. Jobs without context record null actor IDs.

## Automatic audit fields

All six application models extend `AuditModel` from `@models`. It supplies `createdAt`, `updatedAt`, `createdBy`, and `updatedBy`; actor IDs are nullable UUID foreign keys to users. Each table migration defines matching columns and database timestamp defaults explicitly. The base class is not registered as a table. Model loading and schema synchronization are disabled; the shared connection registers the six concrete models explicitly.

Permanent hooks in the shared Sequelize configuration stamp the actual create/update operation from request context. Native timestamps record when writes happen. Creation fields remain unchanged on updates; supplied audit values are overwritten or stripped. Instance create/update/save and bulk create/update are covered, including restricted `fields` and bulk conflict updates through `updateOnDuplicate`. Non-audited models and migration tracking are unaffected.

Audited models reject Sequelize v6 `upsert` with hooks enabled because it builds insert/update values before `beforeUpsert`. Use explicit create/update or `bulkCreate` with `updateOnDuplicate`; the latter excludes creation fields from conflict updates.

These are ORM hooks, not PostgreSQL triggers or an audit history table. Raw SQL, `QueryInterface` writes, and disabling hooks bypass automatic attribution. Keep application writes on the supported model paths. Database-wide enforcement would require database triggers and a separate design. See [Sequelize hook limitations](https://sequelize.org/docs/v6/other-topics/hooks/).

## Commands

| Command                               | Purpose                                           |
| ------------------------------------- | ------------------------------------------------- |
| `npm run dev` / `npm run local`       | Development watch mode                            |
| `npm run debug`                       | Development debugger and watch mode               |
| `npm run build`                       | Compile with Nest CLI                             |
| `npm run prod`                        | Start compiled production backend                 |
| `npm run check-types`                 | Type-check source, scripts, and tests             |
| `npm run check-lint`                  | Check ESLint without rewriting files              |
| `npm run check-format`                | Check formatting without rewriting files          |
| `npm run lint:fix` / `npm run format` | Apply lint or formatting fixes                    |
| `npm test`                            | Unit tests                                        |
| `npm run test:e2e`                    | HTTP infrastructure tests                         |
| `npm run test:db`                     | Real schema tests in an empty disposable database |
| `npm run test:compiled`               | Verify compiled HTTP startup; run build first     |

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

Umzug tracks executed migrations in `SequelizeMeta`. The six migrations create users, categories, events, favourites, reminders, and card designs in dependency order; categories include the five required rows. Every migration has transactional up/down operations with frozen definitions. Commands with no pending migrations make no application schema changes. Normal backend startup does not create tables or migration tracking. Changing deployed schema requires a new migration.

The user model normalizes emails and excludes `passwordHash` from default queries; `UserModel.scope('authentication')` includes it. This does not sanitize create results or replace safe API DTOs. No password hashing service exists yet.

## Real PostgreSQL verification

Create an **empty disposable** PostgreSQL database separately; its name must end in `_test` and differ from `DB_CONFIG_DATABASE`. Do not reuse the application's database. The suite loads `.env.test` then `.env`, checks the actual connection/schema, refuses existing tables in user schemas, and holds an advisory lock so another verification run cannot share its target.

```powershell
$env:TEST_DATABASE_URL = 'postgresql://tester:YOUR_PASSWORD@localhost:5432/community_events_schema_test'
npm run test:db
Remove-Item Env:TEST_DATABASE_URL
```

Percent-encode special characters in URL credentials. Use a dedicated test account with permission to create/drop tables in that disposable database. Configure hosted TLS through the URL as required by your provider; do not disable certificate verification.

The suite runs fresh migrations and category checks, verifies rerun status, constraints, foreign keys, composite keys, actual audit persistence, filters/pagination/feed isolation, reverse rollback, and reapplication. Cleanup removes its migrated tables and `SequelizeMeta` in dependency order without CASCADE drops. Interrupted runs can leave tables behind; inspect the disposable database and recreate it yourself rather than weakening the safety checks. Missing `TEST_DATABASE_URL` fails clearly instead of silently skipping the suite.

## Verification and remaining work

Unit tests cover configuration parsing, fail-fast validation without credential leakage, TLS verification, safe migration generation, migration discovery/execution using in-memory tracking, all six model associations/column mappings/validators/scopes, disposable-database refusal checks, and audit values reaching native Sequelize write calls (SQL execution stubbed).

HTTP tests use a database stub to cover native versioning, health failures/recovery, request validation, safe JSON errors, CORS, optional Swagger, JWT rejection, public/role metadata overrides, current-user injection, concurrent context isolation, and safe request logging. Test fixture routes are never registered in production.

The compiled-startup check initializes the built model registry, loads all six compiled migrations, starts built application modules with a database stub, checks HTTP routing and disabled Swagger, and checks that the actual compiled entry exits on invalid configuration. It loads no TypeScript runtime loader.

Live PostgreSQL verification is unverified until `npm run test:db` runs with supplied disposable database credentials. Type checking, model metadata checks, and stubbed HTTP tests do not prove SQL execution. Once application credentials are configured, run the health request and migration commands above.

Signup/login and password hashing, admin credentials, event APIs, filters, pagination, favourites/feed APIs, reminder/design APIs, the 15 seed events, and the Next.js frontend remain pending. The root README records assignment answers and AI assistance.
