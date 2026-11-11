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
| GET | `/api/photos` | | `200 [photo]`, newest first, with uploader email and comment count |

## Decisions and trade-offs

- Rules live in the database (`check`, `unique`, foreign keys) as well as in the API (zod): zod gives clear 400 messages, and the database still holds if a script or a future endpoint skips zod. Trade-off: each rule is written twice.
- Rewrote `001_init.sql` instead of adding a migration that drops the demo tables: nothing was deployed, so there was no history to keep. Trade-off: an existing local database needs `npm run db:reset`.
- Sessions store only the SHA-256 of the cookie token: someone who reads the database cannot reuse a live session.
- 0,0 counts as "no position": devices write it when they had no GPS fix. Trade-off: a real photo taken at exactly 0,0 (Gulf of Guinea) cannot be stored.
- Duplicate files are rejected by a unique SHA-256 of their bytes (409). Trade-off: only byte-identical copies are caught, not a resized or re-saved photo.
- `photos.user_id` has no `on delete cascade`: deleting a user must not silently delete the team's photos. Trade-off: before deleting such a user, someone decides what happens to their photos. Comments, on the other hand, are deleted with their photo.
- The comment count is computed in the query (a subquery per photo, served by the `(photo_id, created_at)` index) instead of stored: it can never be out of date. Trade-off: a little more work per request.
- `GET /api/photos` returns every photo at once: fine for hundreds. For 10k and more, the map would ask only for id and position, by map area (see `docs/STRATEGY.md`).
- One `selectedId` in `PhotoApp` is shared by the list, the map and the side panel: one source of truth, so they cannot disagree about which photo is selected.
- Colours are CSS variables in `app/globals.css`, each written once as `light-dark(light, dark)`. They follow the operating system unless the theme select in the header forces light or dark. The choice is saved in `localStorage` and applied by a small script in `<head>` before the first paint, so the page never flashes the wrong theme. Trade-off: the choice is remembered per browser, not per account.

## What I'd do next

1. <The most valuable missing thing>
2. <...>
3. <...>

## How I worked

- Time spent: <about 4 hours>.
- AI tools: I used <Claude Code / Cursor> for <scaffolding, boilerplate, test cases>. I reviewed and ran everything, and I made the design decisions above myself.
- Starting point: <"Started from an empty create-next-app" or "Started from my own small starter (Docker Compose + migration runner + map component) that I prepared to save setup time; everything domain-specific was written during the assessment.">
