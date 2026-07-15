# Railway Dispatch Webapp

Operations simulator for CBU rail delivery:

`NAC receipts → EC/EM + AV/NAV split → NAC backlog → SFT → wagon loading → Paya Besar / Kuantan Port → trainset return`

## Packages

- `apps/web` — React UI for assumptions, schedule import, run/compare, KPIs, and load logs
- `apps/api` — Express API (`/defaults`, `/run`, `/compare`, `/import-schedule`)
- `packages/shared` — shared TypeScript contracts
- `packages/sim-core` — deterministic simulation engine and schedule parsers

## Run locally

```bash
npm install
npm run dev:api
npm run dev
```

- API: http://localhost:4000
- Web: http://localhost:5173 (or next free port)

## Test

```bash
npm test
```

## GitHub Pages

The frontend is published via GitHub Actions on push to `main`/`master`.

- Live site: `https://<your-github-username>.github.io/railway-dispatch-webapp/`

GitHub Pages hosts static files only. Run the API locally (`npm run dev:api`) for full simulation. To point the UI at a hosted API, set `VITE_API_BASE` when building the web app.
