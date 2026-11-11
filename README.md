# Photo map

An internal tool that lets a team upload geotagged photos, see them on a map and comment on them.

How I would build it for production (technology choices, architecture, data flow, deployment, storage trade-offs, 10k photos, time estimate): [docs/STRATEGY.md](docs/STRATEGY.md).

![screenshot](docs/screenshot.png)

## Run it

Requirements: Node 20+ (tested on 24), Docker Desktop running.

```bash
npm install        # also copies the MapLibre worker into public/
npm run setup      # starts PostgreSQL (port 15432), runs migrations, loads demo data
npm run dev        # http://localhost:3000
```

Tests (need the database from `npm run setup`):

```bash
npm test
```

Reset the database: `npm run db:reset`. Optional: copy `.env.example` to `.env` to point at another database.

## What it does

- <Feature 1, from the operator's point of view>
- <Feature 2>
- <Feature 3>

## How it's built

| Layer | Choice | Why |
|---|---|---|
| UI | Next.js (App Router), React, TypeScript, Tailwind | One project for UI and API, types shared end to end |
| API | Next.js route handlers under `app/api`, validated with zod | REST, thin handlers, all SQL in `lib/*-repo.ts` |
| Database | PostgreSQL 17 in Docker, plain SQL migrations in `db/migrations` | Constraints in the database (`check`, `unique`, foreign keys), no ORM to hide the SQL |
| Map | MapLibre GL + OpenStreetMap tiles, GeoJSON | Open source, no API key |
| Tests | Vitest: pure functions + route handlers called directly | Fast, no server needed |

### Data model

<Paste the main tables, or a short list. Say what is derived instead of stored and why.>

### API

| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/api/...` | `?filter=` | `200 [...]`, `400` on a bad filter |
| PATCH | `/api/.../:id` | `{ ... }` | `200 {...}`, `400`, `404` |

## Decisions and trade-offs

- <Decision>: <why>, <what I gave up>.
- <Example: GeoJSON is built in TypeScript from lat/lng columns rather than with PostGIS: enough for a few thousand points; PostGIS is the next step for spatial queries such as "pylons within 50 m of this route".>
- <Example: no authentication: out of scope for the time box; every write would need a user and an audit trail in a real tool.>

## What I'd do next

1. <The most valuable missing thing>
2. <...>
3. <...>

## How I worked

- Time spent: <about 4 hours>.
- AI tools: I used <Claude Code / Cursor> for <scaffolding, boilerplate, test cases>. I reviewed and ran everything, and I made the design decisions above myself.
- Starting point: <"Started from an empty create-next-app" or "Started from my own small starter (Docker Compose + migration runner + map component) that I prepared to save setup time; everything domain-specific was written during the assessment.">
