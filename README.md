# Community Events Board

Backend foundation and database schema for the assignment. The frontend directory is untouched.

The backend uses NestJS 11, TypeScript, PostgreSQL, and Sequelize. Features live under `BE/src/modules/<feature>`, each with its controller, service, and module. Nest handles URI versioning through controller metadata.

See [backend setup and API documentation](BE/README.md) for installation, configuration, commands, and verification.

## Current status

Implemented: backend tooling, validated configuration, PostgreSQL connection setup, native URI versioning, validation, JSON response/error handling, Swagger, health, migration tooling, feature scaffolds, default JWT protection, public/current-user/role decorators, request logging/context, automatic Sequelize audit fields, six typed models, six per-table migrations, and the five required categories. See [database schema](BE/DATABASE_SCHEMA.md).

Pending: admin/user signup and login, password hashing, Next.js admin-page protection, event creation/status/filtering/pagination APIs, favourites/feed APIs, reminder/card design APIs and UI, 15 sample events, Next.js frontend, GitHub publication, and screen recording. There are no admin login credentials yet. Live PostgreSQL migration/constraint checks require a supplied disposable `TEST_DATABASE_URL` and remain unverified.

## Database structure and design

Six tables store users, categories, events, favourite categories, reminders, and per-user event card designs.
Stable category codes and foreign keys keep relationships explicit; composite keys prevent duplicate preferences.
Prices use integer paise, event times use TIMESTAMPTZ, and inactive events remain stored.
All tables share audit fields; [the schema document](BE/DATABASE_SCHEMA.md) includes the ER diagram and constraints.

## Filter query and indexes

The documented query combines active/upcoming, category, case-insensitive city, and escaped substring conditions with AND.
Pagination orders by start time and ID; count queries use the same conditions. Business endpoints remain pending.
Migrations add date/order, category/date, and lower(city)/date indexes rather than every filter combination.
GIN trigram indexes on title and description are deferred until measured search workloads justify them.

## Password storage and admin protection

The global server guard verifies signed, expiring JWTs by default; only explicitly public routes bypass it.
The admin scaffold requires the admin role, but exposes no business endpoints or login yet.
The users table stores only a nonblank hash field, excluded from default reads; salted password hashing still needs implementation.
Next.js admin-page protection also remains pending because frontend work has not started.

## AI assistance

OpenAI Codex was used to inspect the reference backend, refine the setup/schema plans, generate the scaffold/configuration, implement shared JWT/context/audit infrastructure and database models/migrations, write tests and documentation, and run checks. The submission owner must review and be able to explain the resulting code.
