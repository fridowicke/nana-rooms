# nana-rooms — shelestvetrovki.com

Portfolio site of the artist shelestvetrovki ("Nana"): a macOS-desktop-style React + Vite app with 3D room scans.
Deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main` (about 3 minutes).
Requests come from Nana through a Telegram bot; Claude Code is invoked by that bot in print mode for code changes.

## How to work here

- One request = one small commit. Never bundle unrelated changes; never restyle things that were not asked for.
- Before committing run `npx vite build --logLevel error`. A failing build must not be pushed.
- Commit messages in English, imperative subject describing the visible change ("move NME to first press item").
- Push to `main` when the task says so. Do not touch `.github/workflows/` unless the task is explicitly about CI.
- Do not run `npm run dev`; there is no browser here. The bot verifies the deployed page afterwards.
- When a request is ambiguous, do the smallest safe interpretation and state the assumption in the final message.
- Final message: 2–4 lines, what changed and the commit hash. No process narration.

## Layout

- `src/App.jsx` — almost the entire UI (≈7000 lines). Search by folder id or component name, edit in place.
- `src/hiddenObjects.jsx` — hidden-object game and hotspot editor for the 3D rooms (see below).
- `src/MobilePhoneShell.jsx` — mobile layout shell.
- `target/diary photos/`, `target/exhibitions/<Folder>/`, `target/gifs/`, `target/cursor/` — images bundled via `import.meta.glob`; adding a file is enough, labels come from filenames.
- `public/assets/` — static files (gifs, music, cursors, folder icons). `public/rooms/*.glb` — the ten room scans.
- `public/tumblr-feed.json` — diary content, refreshed hourly by `.github/workflows/fetch-tumblr.yml`. Do not edit by hand.
- `public/hotspots/room-N.json` — published hidden-object data per room (N = 1..10), supplied verbatim by Nana.
- `public/local-group-mirror.html` — static replica of localgr0up.com shown in the LOCAL GROUP folder (Readymag blocks iframes).

## Content model (all in App.jsx)

- `FOLDER_DEFINITIONS` / `FOLDER_MAP` — desktop folders (id, label, title, sections, optional `icon`).
  `folderArcLayout` (desktop and mobile variants) decides which folders are shown and where.
- `EXHIBITIONS` and `CURATION_PROJECTS` — project entries; `imageFolder` names a directory under `target/exhibitions/`.
  Both render through one shared component; changing shared layout changes both lists. Keep large centred images.
- `DEFAULT_ABOUT_HTML` — bio text. `SONGS`, `ROOM_FILES` — music and room lists.
- Press items: year groups with `{ title, url }`; articles open in a Mac-style iframe window with a fallback link.
- Routing is hash based: `#room-3`, `#folder-<id>`, `#folder-<id>/<projectId>`. Query params must come before `#`.

## Known pitfalls

- Folder names with an apostrophe use U+2019 (’), not ASCII '. Match the directory name exactly.
- Global typography: Helvetica Neue stack, weight 300/400, no italics. Nana reverts anything heavier.
- Exhibition/curation title line: "VENUE — TITLE, YEAR" on one line, no ellipsis truncation.
- The exhibitions overview layout has been broken once by a "global fix"; screenshots before/after are expected
  from the bot, so keep such changes minimal and reversible.
- Two cursor images request `assets/assets/cursors/...` (double prefix) and 404; fix only if asked.

## Hidden-object game (src/hiddenObjects.jsx)

Each room scan is a single mesh with ~200k triangles, so objects cannot be picked by mesh name. A hotspot is a
set of triangle ids selected by lassos drawn in the in-browser editor (`?edit=1#room-N`), picked through a GPU
id buffer so only visible surfaces are selected. Stored data = the lasso strokes (camera pose + polygon), replayed
on load; the published file per room is `public/hotspots/room-N.json`. Do not reintroduce mesh-name or radius
matching. Visitors never see the editor.
