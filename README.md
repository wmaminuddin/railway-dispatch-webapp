# Railway Dispatch Webapp

Operations simulator for CBU rail delivery:

`NAC receipts → EC/EM + AV/NAV split → NAC backlog → SFT → wagon loading → Paya Besar / Kuantan Port → trainset return`

## Packages

- `apps/web` — standalone React simulator; runs calculations and imports schedules in the browser
- `apps/api` — optional Express adapter for integrations; not needed by the hosted app
- `packages/shared` — shared TypeScript contracts
- `packages/sim-core` — deterministic simulation engine and schedule parsers

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. The simulator does not require an API server.

## Test

```bash
npm test
```

## GitHub Pages

The complete simulator is hosted as a static browser app:

- Live site: https://wmaminuddin.github.io/railway-dispatch-webapp/

To publish the latest `main` branch:

```bash
npm run deploy:pages
```

Inputs and imported files stay in each user's browser. No data is uploaded or stored by a server.
