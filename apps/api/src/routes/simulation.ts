import { Router } from "express";
import type { DailyReceipt, SimulationAssumptions, SimulationInput } from "@railway/shared";
import {
  dailyNacTransferCapacity,
  defaultAssumptions,
  defaultScenarios,
  maxTrainUnits,
  minTrainUnits,
  parseCsvReceipts,
  parseReceiptRows,
  runComparison,
  runSimulation,
  sampleReceipts,
  validateInput
} from "@railway/sim-core";

const router = Router();

const asAssumptions = (body: Partial<SimulationAssumptions> | undefined): SimulationAssumptions => ({
  ...defaultAssumptions,
  ...(body ?? {}),
  split: { ...defaultAssumptions.split, ...(body?.split ?? {}) },
  movement: { ...defaultAssumptions.movement, ...(body?.movement ?? {}) },
  wagons: { ...defaultAssumptions.wagons, ...(body?.wagons ?? {}) },
  trains: { ...defaultAssumptions.trains, ...(body?.trains ?? {}) },
  routes: { ...defaultAssumptions.routes, ...(body?.routes ?? {}) },
  teams: { ...defaultAssumptions.teams, ...(body?.teams ?? {}) }
});

router.get("/defaults", (_req, res) => {
  const assumptions = defaultAssumptions;
  res.json({
    assumptions,
    sampleReceipts: sampleReceipts(assumptions.simulationDays, 400),
    scenarios: defaultScenarios,
    derived: {
      dailyNacTransferCapacity: dailyNacTransferCapacity(assumptions),
      maxTrainUnits: maxTrainUnits(assumptions),
      minTrainUnits: minTrainUnits(assumptions),
      maxConsistLengthMeters: assumptions.wagons.maxWagonsPerTrain * assumptions.wagons.wagonLengthMeters
    }
  });
});

router.post("/run", (req, res) => {
  try {
    const assumptions = asAssumptions(req.body.assumptions);
    const mode = req.body.scenarioMode === "AV_AND_NAV" ? "AV_AND_NAV" : "AV_ONLY";
    const scenario = defaultScenarios.find((s) => s.mode === mode) ?? defaultScenarios[0];
    const receipts = (req.body.receipts as DailyReceipt[]) ?? sampleReceipts(assumptions.simulationDays);
    const openingNacUnits = req.body.openingNacUnits as number | undefined;
    const openingSftUnits = req.body.openingSftUnits as number | undefined;
    const input: SimulationInput = { assumptions, scenario, receipts, openingNacUnits, openingSftUnits };
    const errors = validateInput(input);
    if (errors.length) return res.status(400).json({ errors });
    res.json(runSimulation(input));
  } catch (err) {
    res.status(400).json({ errors: [err instanceof Error ? err.message : "Simulation failed"] });
  }
});

router.post("/compare", (req, res) => {
  try {
    const assumptions = asAssumptions(req.body.assumptions);
    const receipts = (req.body.receipts as DailyReceipt[]) ?? sampleReceipts(assumptions.simulationDays);
    const openingNacUnits = req.body.openingNacUnits as number | undefined;
    const openingSftUnits = req.body.openingSftUnits as number | undefined;
    const probe: SimulationInput = {
      assumptions,
      receipts,
      scenario: defaultScenarios[0],
      openingNacUnits,
      openingSftUnits
    };
    const errors = validateInput(probe);
    if (errors.length) return res.status(400).json({ errors });
    const { avOnly, avAndNav } = runComparison(assumptions, receipts, { openingNacUnits, openingSftUnits });
    res.json({ assumptions, receipts, openingNacUnits: avOnly.openingNacUnits, openingSftUnits: avOnly.openingSftUnits, avOnly, avAndNav });
  } catch (err) {
    res.status(400).json({ errors: [err instanceof Error ? err.message : "Comparison failed"] });
  }
});

router.post("/import-schedule", (req, res) => {
  try {
    const { csvText, rows, filename } = req.body as {
      csvText?: string;
      rows?: Array<Record<string, unknown>>;
      filename?: string;
    };

    let receipts: DailyReceipt[] = [];
    if (csvText) {
      receipts = parseCsvReceipts(csvText);
    } else if (rows) {
      receipts = parseReceiptRows(rows);
    } else {
      return res.status(400).json({ errors: ["Provide csvText or rows for schedule import."] });
    }

    if (!receipts.length) {
      return res.status(400).json({
        errors: [
          `No valid day/units rows found${filename ? ` in ${filename}` : ""}. Expected columns like day, unitsReceived.`
        ]
      });
    }

    res.json({ receipts, count: receipts.length, filename: filename ?? null });
  } catch (err) {
    res.status(400).json({ errors: [err instanceof Error ? err.message : "Import failed"] });
  }
});

export default router;
