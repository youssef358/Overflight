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

Optional AI descriptions: copy `.env.example` to `.env` and set `AWS_BEARER_TOKEN_BEDROCK` to an Amazon Bedrock API key (and `BEDROCK_MODEL_ID` to a vision model the key can use), then restart `npm run dev`. Without a key the feature is off and uploads work the same.

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
| GET | `/api/auth/me` | | `200 { id, email }`, `401` not logged in |
| GET | `/api/photos` | | `200 [photo]`, newest first, with uploader email and comment count |
| GET | `/api/photos/:id/file` | | `200` JPEG bytes, `400` bad id, `404` unknown photo or missing file |
| POST | `/api/auth/signup` | `{ email, password }` | `201 { id, email }` + session cookie, `400` bad email or password not 8 to 200 characters, `409` email taken |
| POST | `/api/auth/login` | `{ email, password }` | `200 { id, email }` + session cookie, `400`, `401` same answer for a wrong password and an unknown email |
| POST | `/api/auth/logout` | | `204`, session deleted, cookie cleared |
| DELETE | `/api/photos/:id` | | `204` (photo, its comments and its file deleted), `400` bad id, `403` not the uploader, `404` unknown photo |
| GET | `/api/photos/:id/comments` | | `200 [comment]` oldest first, `400` bad id, `404` unknown photo |
| POST | `/api/photos/:id/comments` | `{ body }` | `201 comment` (author from the session), `400` empty or over 1000 characters, `404` unknown photo |
| POST | `/api/photos` | multipart: `file`, `lat`, `lng`, `locationSource` | `201 photo`, `400` missing file or bad fields, `409` same file already uploaded, `413` over 15 MB, `415` not a JPEG |

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
- Map markers are one GPU circle layer (grey), and the selected photo is drawn again by a second layer filtered on its id (bigger, blue). Clicking a marker or a list row selects; selecting flies the map to the photo. Trade-off: photos a few metres apart (DSC00751 and DSC00752 are 4 m apart) overlap until you zoom far in; the list reaches both, clustering would group them.
- Marker colours are fixed hex values, not theme variables: the OpenStreetMap tiles are light in both themes.
- Map tiles come from the public OpenStreetMap servers: no key, no account. Their usage policy does not allow heavy traffic, so production would use vector tiles from a provider or self-hosted (see `docs/STRATEGY.md`).
- Photo files live in `uploads/` (outside `public/`) and are served by a route, so access can require a login. All file access goes through `lib/storage.ts`, which is the one file to rewrite for S3. The browser may cache a file for a year (`private, immutable`): a photo's bytes never change. Trade-off: the route reads the whole file into memory; streaming it would matter for many large downloads at once.
- Selecting a photo replaces the list with a side panel (image, uploader, date, position and its source), like a maps app; "All photos" goes back. The panel shows the 5 MB original for now: previews come with the AI step, which needs a smaller image anyway.
- The core rule is one pure function, `resolveLocation` in `lib/location.ts`, written test-first: a position placed by hand wins over the photo's GPS; GPS that is missing, out of range, not a number or 0,0 counts as no GPS; with neither, the upload is refused. The browser runs it to pre-fill the form, the server re-checks the same `isValidPosition`, and the database checks it a third time. Trade-off: the position is user input, so the server cannot prove a position marked `exif` really came from the camera.
- Upload form fields arrive as strings, or null when missing. Each coordinate must be a non-empty string before it becomes a number, because `Number(null)` and `Number("")` are 0: a missing latitude would otherwise become a real one.
- A new photo is inserted and read back (with the uploader's email) in one SQL statement (`with ... insert ... returning`), so the API answers with the same shape as the list.
- Upload checks, cheapest first: a declared body over the limit is refused before it is read (413), then the file must be present (400), at most 15 MB (413), the fields valid (400), and the bytes must start like a JPEG (`FF D8 FF`, 415). The file name and the type the browser claims are never trusted. Then the file is written, then the row inserted; if the insert fails (for example a duplicate, 409), the file is deleted, so no orphan file stays on disk.
- The upload form reads the photo's GPS in the browser with `exifr` (only the start of the file) and runs the same `resolveLocation` rule as the server, so it always shows the position that will be sent. Typing a coordinate makes the position "manual" and it stays so when another file is chosen; "Use the photo's GPS" switches back. Upload stays disabled until the position is valid. After a 201, the returned photo is added to the list and selected, without reloading the list. Trade-off: the position can only be typed, not yet placed by clicking the map.
- While uploading, the form shows a preview of the chosen file (a local `blob:` URL, nothing sent yet) and the map shows a hollow pin where the photo would land, moving as the position changes. The map pans only when the pin is out of view, so typing does not shake it.
- The selected photo also gets a small card on the map (image and name), like a maps app. It uses the same image URL as the side panel, so the browser downloads it once, and the name is set as text, never HTML. MapLibre draws popups white, so `app/globals.css` gives this one the theme colours.
- AI description (optional): on upload, the browser also sends a 1024 px JPEG copy (Bedrock refuses images over about 3.75 MB; the originals are 4 to 5 MB) and the server asks a Bedrock vision model, through the Converse API with plain `fetch`, for a one or two sentence description, stored in `photos.description` and shown as "Description (AI)". Off without `AWS_BEARER_TOKEN_BEDROCK`. A failed or slow call (20 s cap) never blocks the upload, it only leaves the description empty. Trade-off: the upload waits for the model; in production a queue and a worker would do it after the upload answers (see `docs/STRATEGY.md`).
- Only the uploader can delete a photo. The ownership check is part of the delete itself (`delete ... where id = $1 and user_id = $2`), so there is no gap between checking and deleting; when nothing was deleted, one more query tells 403 (someone else's) from 404. Comments go with the photo (cascade). The row is deleted before the file, the reverse of the upload, so the map never shows a photo whose image is gone. Trade-off: no admin role and no undo.
- Passwords are hashed with scrypt from `node:crypto` (no package), with a random salt per password, and compared with `timingSafeEqual`. A session is a random 32-byte token in the cookie; the database keeps only its SHA-256 and an expiry 7 days later. Trade-offs: no rate limit on login, no email verification, and expired session rows are never cleaned up (a scheduled `delete ... where expires_at < now()` would do it).
- The session cookie is `httpOnly` (page scripts cannot read it), `SameSite=Lax` (not sent with POSTs from other sites) and `Secure` in production. Signup logs the new account in. Login gives the same answer for a wrong password and an unknown email. Logout deletes the session row, so a copied cookie stops working too. Trade-off: signup's 409 still reveals that an email has an account; invitation-only signup would close that.
- Every photo route checks the session itself (`getSessionUser`) and answers 401 first, before reading the body; the upload's owner comes from the session, never from the request. There is no `proxy.ts`: in Next 16 it would buffer request bodies and cut them at 10 MB, which would corrupt large uploads without an error. All API routes except signup and login answer 401 without a session.
- The page is the same static shell for everyone and holds no data. `AuthGate` asks `GET /api/auth/me` on load and shows the login form (one form, "Log in" or "Create account") or the app. I chose this over a server-side redirect: with `cacheComponents` on, reading cookies in a page needs a `<Suspense>` boundary and a redirect inside a streamed page. Trade-off: a short "Loading…" before the form or the app, and a session that expires while the app is open shows an error instead of the login form.
- Comments: the author always comes from the session. The body is trimmed and must be 1 to 1000 characters (zod for the 400 message, the database check as the last guard). Posting on a photo that does not exist is refused by the foreign key (Postgres 23503) and answered 404, with no "check, then insert"; reading checks the photo first, so "no comments yet" (`[]`) and "no such photo" (404) differ.
- In the side panel, the thread loads per photo and a new comment is added from the POST answer; the list's "N comments" is incremented locally instead of reloading every photo. Comments are rendered as text, so `<script>` in a comment shows as text and never runs. The panel is keyed by photo id, so switching photos never shows the previous photo's thread.
- On phones the side panel sits under the map, so opening a photo or the upload form scrolls it into view. Escape closes the form or the panel, except while typing in a field, so a half-written comment is not lost.
- Shared class names for buttons, inputs and cards live in `lib/ui.ts` (plain strings, no component library), so every form looks the same and uses the theme colours. Trade-off: no design system, which would be the next step for a bigger app.

## What I'd do next

1. <The most valuable missing thing>
2. <...>
3. <...>

## How I worked

- Time spent: <about 4 hours>.
- AI tools: I used <Claude Code / Cursor> for <scaffolding, boilerplate, test cases>. I reviewed and ran everything, and I made the design decisions above myself.
- Starting point: <"Started from an empty create-next-app" or "Started from my own small starter (Docker Compose + migration runner + map component) that I prepared to save setup time; everything domain-specific was written during the assessment.">
