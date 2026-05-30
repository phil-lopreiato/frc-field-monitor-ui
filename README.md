# FIRST Field Monitor

FIRST Field Monitor is a React + Vite app for **FIRST Robotics Competition** field operations. It turns live field data into a fullscreen, glanceable monitor for FTAs and other field staff so they can quickly answer:

- Which team or station has a problem?
- What layer is failing: Driver Station, radio, roboRIO, or robot performance?
- Is this a blocking pre-match issue or an in-match degradation?
- Does someone need to act right now?

This repo also includes a small Node proxy for environments where the upstream field server does not allow direct browser access, plus built-in recording and replay tools for training and offline review.

## What It Does

- Renders all 6 stations in a live red-vs-blue alliance layout.
- Shows top-bar match context including `Match Number`, `Match Status`, `Schedule Status`, and a neutral `Cycle` cadence summary.
- Keeps the diagnostic chain explicit as `DS -> Radio -> RIO`.
- Surfaces blocking states such as `TEAM MISMATCH` and `MOVE TO ...`.
- Shows robot mode, battery, bandwidth, trip time, and packet loss at the same time.
- Supports mirrored layouts for viewing from the opposite side of the field.
- Records live hub traffic to JSON and replays it back through the same UI.
- Includes landing, config/replay, and showcase routes for product review and testing.

## Tech Stack

- React 18
- Vite
- React Router
- SignalR with MessagePack
- Tailwind CSS utility styling
- Vitest + Testing Library
- Node HTTP proxy via `http-proxy`

## App Routes

- `/` - primary live field monitor
- `/distance-first` - alias of the primary field monitor
- `/welcome` - marketing/product overview page
- `/config` - config, connection, recording, and replay controls
- `/showcase` - card-state showcase view

## Getting Started

### Install

```sh
npm install
```

### Configure Environment

Start from the example file:

```sh
cp .env.example .env
```

Environment variables:

| Variable | Purpose |
| --- | --- |
| `VITE_FIELD_MONITOR_BASE_URL` | Base URL used by the browser for REST and SignalR requests. |
| `FIELD_MONITOR_UPSTREAM_URL` | Upstream field server used by the internal Node proxy. |
| `PORT` | Port for the internal proxy server. Defaults to `3000`. |

## Running The App

### Direct Mode

Use this when the browser can talk directly to the field server.

```sh
VITE_FIELD_MONITOR_BASE_URL=http://10.0.100.5 npm run dev
```

You can also store that value in `.env` and then run:

```sh
npm run dev
```

### Proxy Mode

Use this when the upstream field server blocks browser requests, usually because of CORS.

1. Build the frontend so browser requests point at the local proxy.
2. Start the internal Node server and point it at the real field server.

Example:

```sh
VITE_FIELD_MONITOR_BASE_URL=http://localhost:3000 npm run build
FIELD_MONITOR_UPSTREAM_URL=http://10.0.100.5 PORT=3000 npm start
```

The proxy serves the built app from `dist` and forwards these live endpoints:

- `/api/v1.0/fieldMonitor/*`
- `/fieldMonitorHub`
- `/infrastructureHub`

If `VITE_FIELD_MONITOR_BASE_URL` is not set, the client falls back to same-origin URLs. That makes proxy mode work naturally when the app is served by the internal Node server.

Important operational note:

- `npm run dev` serves the latest source changes on the Vite dev server, typically `:5173`.
- `npm start` serves the built app from `dist` through the proxy, typically `:3000`.
- If you change the UI and want to see those updates in proxy mode, run `npm run build` again before restarting `npm start`.

### Docker

The repository includes a production Dockerfile that builds the Vite app and runs the bundled Node proxy server.

Build the image:

```sh
docker build -t first-field-monitor .
```

Run it in proxy mode:

```sh
docker run --rm -p 3000:3000 \
  -e FIELD_MONITOR_UPSTREAM_URL=http://10.0.100.5 \
  first-field-monitor
```

Optional runtime environment variables:

| Variable | Purpose |
| --- | --- |
| `FIELD_MONITOR_UPSTREAM_URL` | Upstream field server for proxied REST and SignalR traffic. |
| `PORT` | Container listen port. Defaults to `3000`. |
| `HOST` | Container bind host. Defaults to `0.0.0.0`. |

The image builds the frontend without a fixed `VITE_FIELD_MONITOR_BASE_URL`, so the browser uses same-origin requests and works naturally behind the internal proxy.

### Docker Compose

`docker-compose.yml` wraps the default proxy-mode port and upstream settings, using values from `.env` when present.

Start it with:

```sh
docker compose up --build
```

By default this publishes `localhost:3000` and forwards to `FIELD_MONITOR_UPSTREAM_URL=http://10.0.100.5`. Override either value in `.env` before starting compose if needed.

### Production Image

`Dockerfile.prod` and `docker-compose.prod.yml` use the published image `docker.io/phillopreiato/frc-field-monitor-v3beta` instead of rebuilding from local source.

Build the thin prod wrapper image:

```sh
docker build -f Dockerfile.prod -t first-field-monitor:prod .
```

Or run the published image directly with Compose:

```sh
docker compose -f docker-compose.prod.yml up -d
```

The prod compose file keeps the same defaults as the local compose setup:

- `3000:3000`
- `HOST=0.0.0.0`
- `PORT=3000`
- `FIELD_MONITOR_UPSTREAM_URL=http://10.0.100.5`

## Live And Replay Workflow

### Live Monitor

The main monitor is optimized for fullscreen field use in both `16:9` and `4:3`. It keeps team number and station location prominent while making exceptions stand out more than healthy rows.

### Top Bar

The field monitor top bar summarizes match-level context that helps the FTA scan the field state before looking down into individual stations.

It currently shows:

- `Match Number` for the currently active match
- `Match Status` from FMS match-state transitions
- `Schedule Status` from FMS ahead/behind text when available
- `Cycle` as a neutral cadence indicator

The `Cycle` indicator is intentionally descriptive rather than judgmental:

- Before enough data exists: `Waiting for next start`
- During a running cycle: `0:37 running`
- After at least one completed cycle: `8m last | 0:12 run`

Cycle timing is derived from the time between distinct `MatchAuto` starts. The completed cycle is shown in a compact minute-based form, while the running cycle includes seconds.

The top bar is also responsive:

- On wider layouts, `Schedule Status` and `Cycle` share the right side of the top row.
- On smaller layouts, they move into the second line of the same top bar.

### Mirror Layout

Add `?mirror=true` to the monitor or config routes to flip alliance panel order for the opposite side of the field. When mirrored, the red alliance card order is also reversed so stations still read `1, 2, 3` from behind the driver station wall.

### Recording

From `/config`, you can capture live SignalR traffic into a JSON recording file for later review.

### Replay

You can load a saved recording from `/config` or directly from the main monitor. Replay supports:

- Pause and resume
- Restart
- Playback speed control
- Return to live mode
- A replay clock in `M:SS.t` format
- Loading directly from the main monitor with `Alt+L`
- A fixed bottom replay overlay on the main monitor while replay is active
- Local replay load error handling with a dismiss action when a replay file cannot be opened

On the main monitor, `Alt+L` opens the replay file picker. While replay is active, the field monitor adds bottom padding so the replay controls do not cover the station grid.

## Scripts

```sh
npm run dev
npm run build
npm start
npm run preview
npm test
npm run test:watch
```

## Testing

Run the full automated suite with:

```sh
npm test
```

Run Vitest in watch mode with:

```sh
npm run test:watch
```

The test suite covers:

- Pure live-data helpers in `src/lib/fieldMonitorLive.js`
- Integration behavior for `useFieldMonitorLiveData`
- UI behavior for `src/pages/FieldMonitor.jsx`, `src/pages/config.tsx`, and other routes
- Route-level smoke coverage for `src/main.jsx`

Test strategy:

- `fetch` is mocked so tests do not require a live field server
- SignalR hubs are replaced with in-memory fakes from `src/test/fakeSignalR.js`
- Replay timing uses fake timers for deterministic playback
- Page tests mock `useFieldMonitorLiveData` when only UI wiring needs verification

## Project Structure

```text
src/
  components/
    TeamStatusCard.jsx
  lib/
    fieldMonitorLive.js
  pages/
    FieldMonitor.jsx
    LandingPage.jsx
    TeamCardShowcase.jsx
    config.tsx
  test/
    fakeSignalR.js
    setup.js
server/
  index.js
```

## Architecture Notes

- `src/lib/fieldMonitorLive.js` owns the live SignalR connections, data normalization, panel building, top-bar cycle cadence state, recording, and replay runtime.
- `src/pages/FieldMonitor.jsx` is the primary operational screen.
- `src/pages/config.tsx` exposes recorder and replay controls against the same underlying data model.
- `server/index.js` serves production builds and proxies live field traffic when direct browser access is unavailable.

## Repository Status

This repo is actively oriented around product iteration on the field monitor UI. The included spec documents, `SPEC_AND_CONTEXT.md` and `SPEC_AND_CONTEXT_HUMAN_READABLE.md`, capture the operational goals and screen behavior the interface is designed around.
