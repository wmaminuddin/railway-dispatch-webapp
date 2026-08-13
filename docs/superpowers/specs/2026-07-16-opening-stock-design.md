# Opening Stock Design

**Date:** 2026-07-16  
**Status:** Approved  
**Approach:** Seed NAC and SFT queues from simple totals (Approach 1)

## Problem

Every simulation run starts with empty NAC and SFT queues. Planners cannot model residual yard or NAC backlog from a prior period, so day-1 `sftOpening` is always 0 and congestion / transfer behavior on day 1 understates carry-in stock.

## Decisions

| Decision | Choice |
|----------|--------|
| Locations | Both NAC and SFT |
| Input shape | Simple totals only (`openingNacUnits`, `openingSftUnits`), default 0 |
| Mix | Existing Scenario & Split %s (EC/EM normalized; AV/NAV per destination) |
| NAC meaning | Already-eligible cars waiting to transfer (skip non-rail % and scenario eligibility filters) |
| Over-capacity SFT | Allowed; day-1 transfers blocked until departures free space |
| UI | New “Opening stock” panel near top of inputs |
| KPIs | No new KPI fields; existing day-1 snapshot / charts reflect seed |
| Out of scope (v1) | Separate opening splits, lot-level editor, CSV import, clamping SFT to capacity |

## Data model

Extend `SimulationInput`:

- `openingNacUnits?: number` — ≥ 0, default 0  
- `openingSftUnits?: number` — ≥ 0, default 0  

Echo normalized values on `SimulationOutput` (and `ComparisonOutput`) so narrative/help can reference them without inferring from mid-day snapshots.

## Engine behavior

1. After empty `nacQueue` / `sftQueue` init, normalize totals with `Math.max(0, Math.floor(...))`.
2. `createOpeningLots(total, assumptions, idPrefix)`:
   - Split destination by normalizing EC% + EM% over the full total (no non-rail remainder).
   - Split each destination by AV%; include both AV and NAV (no scenario filter).
   - Set `dayReceived: 0` so FIFO drains opening stock before day-1 receipts.
3. Push lots onto the respective queues; leave the day loop unchanged.
4. Day 1 `sftOpening` equals seeded SFT units. Over-capacity SFT uses existing free-parking transfer blocking.

## UI

- Panel **Opening stock** above NAC Receiving / Movement.
- Fields: NAC opening, SFT opening (default 0).
- Helper text: seeds day 1 before receipts; mix from Scenario & Split; SFT may start over capacity.
- Wire into `runSimulation` / `runComparison` and API `/run` + `/compare` bodies.

## Results / help

- Inventory chart and daily snapshot need no schema change for inventory series.
- Narrative: when either opening value &gt; 0, one info sentence noting carry-in stock.
- Help registry: entries for NAC and SFT opening fields.

## Tests

- Defaults 0 → existing golden parity unchanged.
- NAC-only, SFT-only, both seeding.
- Over-capacity SFT → day-1 transfers constrained/blocked.
- FIFO: `dayReceived: 0` lots consumed before day-1 lots.
- Help registry includes new keys; narrative includes opening item when non-zero.
