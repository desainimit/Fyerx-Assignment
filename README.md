# Community Events Board

Initial backend foundation for the assignment. The frontend directory is untouched.

The backend uses NestJS 11, TypeScript, PostgreSQL, and Sequelize. Features live under `BE/src/modules/<feature>`, each with its controller, service, and module. Nest handles URI versioning through controller metadata.

See [backend setup and API documentation](BE/README.md) for installation, configuration, commands, and verification.

## Current status

Implemented: backend tooling, validated configuration, PostgreSQL connection setup, native URI versioning, validation, JSON response/error handling, Swagger, health, migration tooling, and feature scaffolds.

Pending: admin/user authentication and server protection, event creation/status/filtering/pagination, favourites/feed, persisted reminders, card design, application tables, 15 sample events, Next.js frontend, GitHub publication, and screen recording. There are no admin login credentials yet.

## Database structure and design

No application tables are implemented in this foundation phase.
The planned entities are users, events, favourite categories, reminders, and per-user event card designs.
Relations will keep user preferences separate from events and prevent duplicate user/event reminders.
The final schema and its constraints will be documented when those features are implemented.

## Filter query and indexes

The event filter query is not implemented yet.
It will combine active/upcoming conditions with category, city, and text filters using AND, then paginate with a stable date/id order.
An index supporting active/category/city/date queries and a PostgreSQL text-search index will be evaluated against the final query.
The final README will describe the actual query and indexes rather than claim this groundwork already exists.

## Password storage and admin protection

Authentication and admin protection are not implemented, and no admin endpoints are exposed.
The later auth phase must hash passwords and verify signed, expiring JWTs on the server.
Admin APIs will require role checks, and Next.js admin pages will enforce access on the server.
These are pending implementation choices, not security features supplied by the current scaffold.

## AI assistance

OpenAI Codex was used to inspect the reference backend, refine the initial setup plan, generate the scaffold/configuration, implement infrastructure, write tests and documentation, and run checks. The submission owner must review and be able to explain the resulting code.
