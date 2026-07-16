import { useMemo, useState, type ReactNode } from "react";
import type {
  ComparisonOutput,
  DailyReceipt,
  ScenarioMode,
  SimulationAssumptions,
  SimulationInput,
  SimulationOutput
} from "@railway/shared";
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
import * as XLSX from "xlsx";
import { ResultsDashboard } from "./components/results";
import { InfoTooltip, KpiWithHelp, LabelWithHelp, type HelpKey } from "./components/help";
import { formatFixed, formatNumber } from "./utils/formatNumber";

type DefaultsResponse = {
  assumptions: SimulationAssumptions;
  sampleReceipts: DailyReceipt[];
  derived: {
    dailyNacTransferCapacity: number;
    maxTrainUnits: number;
    minTrainUnits: number;
    maxConsistLengthMeters: number;
  };
};

const defaults: DefaultsResponse = {
  assumptions: defaultAssumptions,
  sampleReceipts: sampleReceipts(defaultAssumptions.simulationDays, 400),
  derived: {
    dailyNacTransferCapacity: dailyNacTransferCapacity(defaultAssumptions),
    maxTrainUnits: maxTrainUnits(defaultAssumptions),
    minTrainUnits: minTrainUnits(defaultAssumptions),
    maxConsistLengthMeters:
      defaultAssumptions.wagons.maxWagonsPerTrain * defaultAssumptions.wagons.wagonLengthMeters
  }
};

type FieldProps = {
  label: string;
  helpKey?: HelpKey | string;
  children: ReactNode;
};

const Field = ({ label, helpKey, children }: FieldProps) => (
  <label className="field">
    <span className="field-label-row">
      <span>{label}</span>
      {helpKey ? <InfoTooltip helpKey={helpKey} label={label} /> : null}
    </span>
    {children}
  </label>
);

const num = (v: string) => Number(v);

export function App() {
  const [assumptions, setAssumptions] = useState<SimulationAssumptions>(() => structuredClone(defaults.assumptions));
  const [receipts, setReceipts] = useState<DailyReceipt[]>(() => structuredClone(defaults.sampleReceipts));
  const [scenarioMode, setScenarioMode] = useState<ScenarioMode>("AV_ONLY");
  const [runMode, setRunMode] = useState<"SINGLE" | "COMPARE">("SINGLE");
  const [result, setResult] = useState<SimulationOutput | null>(null);
  const [comparison, setComparison] = useState<ComparisonOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [selectedLoadId, setSelectedLoadId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const derived = useMemo(() => {
    const transfer = Math.floor(
      (assumptions.movement.nacOperatingHoursPerDay * 60 * assumptions.movement.nacDriversOrLanes) /
        Math.max(1, assumptions.movement.nacToSftTactMinutes)
    );
    return {
      dailyNacTransferCapacity: transfer,
      maxTrainUnits: assumptions.wagons.maxWagonsPerTrain * assumptions.wagons.carsPerWagon,
      minTrainUnits: assumptions.wagons.minWagonsForProfitability * assumptions.wagons.carsPerWagon,
      maxConsistLengthMeters: assumptions.wagons.maxWagonsPerTrain * assumptions.wagons.wagonLengthMeters,
      sftCarsPerHour:
        assumptions.teams.sftLoadingTeam > 0
          ? (60 * assumptions.teams.sftLoadingTeam) / assumptions.routes.sftLoadingTactMinutes
          : 0
    };
  }, [assumptions]);

  const activeResult = result ?? comparison?.avOnly ?? null;
  const selectedLoad = activeResult?.loads.find((l) => l.id === selectedLoadId) ?? activeResult?.loads[0];

  const patch = <K extends keyof SimulationAssumptions>(key: K, value: SimulationAssumptions[K]) =>
    setAssumptions((prev) => ({ ...prev, [key]: value }));

  const updateReceipt = (index: number, unitsReceived: number) => {
    setReceipts((prev) => prev.map((r, i) => (i === index ? { ...r, unitsReceived } : r)));
  };

  const syncReceiptDays = (days: number) => {
    setReceipts((prev) => {
      const next: DailyReceipt[] = [];
      for (let d = 1; d <= days; d += 1) {
        next.push({ day: d, unitsReceived: prev.find((p) => p.day === d)?.unitsReceived ?? 400 });
      }
      return next;
    });
    patch("simulationDays", days);
  };

  const onImportFile = async (file: File) => {
    setError(null);
    try {
      let importedReceipts: DailyReceipt[];
      if (file.name.toLowerCase().endsWith(".csv")) {
        importedReceipts = parseCsvReceipts(await file.text());
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        importedReceipts = parseReceiptRows(rows);
      }
      if (!importedReceipts.length) {
        throw new Error(
          `No valid day/units rows found in ${file.name}. Expected columns like day, unitsReceived.`
        );
      }
      setReceipts(importedReceipts);
      patch("simulationDays", Math.max(...importedReceipts.map((r) => r.day)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    }
  };

  const onRun = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    setComparison(null);
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (runMode === "COMPARE") {
        const probe: SimulationInput = { assumptions, receipts, scenario: defaultScenarios[0] };
        const errors = validateInput(probe);
        if (errors.length) throw new Error(errors.join(" "));
        const outputs = runComparison(assumptions, receipts);
        const data: ComparisonOutput = { assumptions, receipts, ...outputs };
        setComparison(data);
        setResult(data.avOnly);
        setSelectedLoadId(data.avOnly.loads[0]?.id ?? null);
        setSelectedDay(data.avOnly.days[0]?.day ?? null);
      } else {
        const scenario = defaultScenarios.find((item) => item.mode === scenarioMode) ?? defaultScenarios[0];
        const data = runSimulation({ assumptions, receipts, scenario });
        setResult(data);
        setSelectedLoadId(data.loads[0]?.id ?? null);
        setSelectedDay(data.days[0]?.day ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="shell">
      <header className="hero">
        <div>
          <h1>Rail Delivery Operations Simulator</h1>
          <p>NAC → SFT → Paya Besar / Kuantan Port with FIFO queues, wagon formation, and manpower-scaled cycle times.</p>
        </div>
        <button className="primary" onClick={onRun} disabled={running}>
          {running ? "Running..." : runMode === "COMPARE" ? "Compare AV vs AV+NAV" : "Run simulation"}
        </button>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="grid-2">
        <section className="panel">
          <h2>Receipt Schedule</h2>
          <Field label="Simulation days" helpKey="simulationDays">
            <input
              type="number"
              min={1}
              value={assumptions.simulationDays}
              onChange={(e) => syncReceiptDays(num(e.target.value))}
            />
          </Field>
          <Field label="Import CSV / Excel" helpKey="importSchedule">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => e.target.files?.[0] && onImportFile(e.target.files[0])}
            />
          </Field>
          <div className="table-wrap compact">
            <table>
              <thead>
                <tr>
                  <LabelWithHelp text="Day" helpKey="colDay" as="th" />
                  <LabelWithHelp text="Units from NAC" helpKey="unitsFromNac" as="th" />
                </tr>
              </thead>
              <tbody>
                {receipts.map((r, i) => (
                  <tr key={r.day}>
                    <td>{r.day}</td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        value={r.unitsReceived}
                        onChange={(e) => updateReceipt(i, num(e.target.value))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <h2>Scenario & Split</h2>
          <Field label="Run mode" helpKey="runMode">
            <select value={runMode} onChange={(e) => setRunMode(e.target.value as "SINGLE" | "COMPARE")}>
              <option value="SINGLE">Single scenario</option>
              <option value="COMPARE">Compare AV only vs AV+NAV</option>
            </select>
          </Field>
          {runMode === "SINGLE" && (
            <Field label="Scenario" helpKey="scenarioMode">
              <select value={scenarioMode} onChange={(e) => setScenarioMode(e.target.value as ScenarioMode)}>
                <option value="AV_ONLY">AV Only</option>
                <option value="AV_AND_NAV">AV + NAV</option>
              </select>
            </Field>
          )}
          <div className="grid-2 tight">
            <Field label="East Coast % of NAC" helpKey="eastCoastPercent">
              <input
                type="number"
                value={assumptions.split.eastCoastPercent}
                onChange={(e) => patch("split", { ...assumptions.split, eastCoastPercent: num(e.target.value) })}
              />
            </Field>
            <Field label="East Malaysia % of NAC" helpKey="eastMalaysiaPercent">
              <input
                type="number"
                value={assumptions.split.eastMalaysiaPercent}
                onChange={(e) => patch("split", { ...assumptions.split, eastMalaysiaPercent: num(e.target.value) })}
              />
            </Field>
            <Field label="East Coast AV %" helpKey="eastCoastAvPercent">
              <input
                type="number"
                value={assumptions.split.eastCoastAvPercent}
                onChange={(e) => patch("split", { ...assumptions.split, eastCoastAvPercent: num(e.target.value) })}
              />
            </Field>
            <Field label="East Malaysia AV %" helpKey="eastMalaysiaAvPercent">
              <input
                type="number"
                value={assumptions.split.eastMalaysiaAvPercent}
                onChange={(e) => patch("split", { ...assumptions.split, eastMalaysiaAvPercent: num(e.target.value) })}
              />
            </Field>
          </div>
        </section>
      </div>

      <div className="grid-3">
        <section className="panel">
          <h2>NAC → SFT</h2>
          <Field label="Tact minutes / car" helpKey="nacToSftTact">
            <input
              type="number"
              value={assumptions.movement.nacToSftTactMinutes}
              onChange={(e) =>
                patch("movement", { ...assumptions.movement, nacToSftTactMinutes: num(e.target.value) })
              }
            />
          </Field>
          <Field label="Operating hours / day" helpKey="nacOperatingHours">
            <input
              type="number"
              value={assumptions.movement.nacOperatingHoursPerDay}
              onChange={(e) =>
                patch("movement", { ...assumptions.movement, nacOperatingHoursPerDay: num(e.target.value) })
              }
            />
          </Field>
          <Field label="Drivers / lanes" helpKey="nacDriversLanes">
            <input
              type="number"
              value={assumptions.movement.nacDriversOrLanes}
              onChange={(e) =>
                patch("movement", { ...assumptions.movement, nacDriversOrLanes: num(e.target.value) })
              }
            />
          </Field>
          <Field label="SFT parking capacity" helpKey="sftParkingCapacity">
            <input
              type="number"
              value={assumptions.movement.sftParkingCapacity}
              onChange={(e) =>
                patch("movement", { ...assumptions.movement, sftParkingCapacity: num(e.target.value) })
              }
            />
          </Field>
        </section>

        <section className="panel">
          <h2>Wagons & Trains</h2>
          <Field label="Cars / wagon" helpKey="carsPerWagon">
            <input
              type="number"
              value={assumptions.wagons.carsPerWagon}
              onChange={(e) => patch("wagons", { ...assumptions.wagons, carsPerWagon: num(e.target.value) })}
            />
          </Field>
          <Field label="Min wagons (profitability)" helpKey="minWagonsProfit">
            <input
              type="number"
              value={assumptions.wagons.minWagonsForProfitability}
              onChange={(e) =>
                patch("wagons", { ...assumptions.wagons, minWagonsForProfitability: num(e.target.value) })
              }
            />
          </Field>
          <Field label="Max wagons / train" helpKey="maxWagonsTrain">
            <input
              type="number"
              value={assumptions.wagons.maxWagonsPerTrain}
              onChange={(e) => patch("wagons", { ...assumptions.wagons, maxWagonsPerTrain: num(e.target.value) })}
            />
          </Field>
          <Field label="Allow mixed-destination wagons" helpKey="allowMixedWagons">
            <select
              value={assumptions.wagons.allowMixedDestinationWagons ? "YES" : "NO"}
              onChange={(e) =>
                patch("wagons", {
                  ...assumptions.wagons,
                  allowMixedDestinationWagons: e.target.value === "YES"
                })
              }
            >
              <option value="NO">No (preferred)</option>
              <option value="YES">Yes (adds blocking time)</option>
            </select>
          </Field>
          <Field label="Trainsets available" helpKey="trainsetsAvailable">
            <input
              type="number"
              value={assumptions.trains.trainsetsAvailable}
              onChange={(e) => patch("trains", { ...assumptions.trains, trainsetsAvailable: num(e.target.value) })}
            />
          </Field>
          <Field label="Train operating hours / day" helpKey="trainOperatingHours">
            <input
              type="number"
              value={assumptions.trains.trainOperatingHoursPerDay}
              onChange={(e) =>
                patch("trains", { ...assumptions.trains, trainOperatingHoursPerDay: num(e.target.value) })
              }
            />
          </Field>
          <Field label="Load mode" helpKey="loadMode">
            <select
              value={assumptions.trains.loadMode}
              onChange={(e) =>
                patch("trains", {
                  ...assumptions.trains,
                  loadMode: e.target.value as SimulationAssumptions["trains"]["loadMode"]
                })
              }
            >
              <option value="MIXED">Mixed destinations</option>
              <option value="SINGLE_DESTINATION">Single destination</option>
            </select>
          </Field>
          <Field label="Allocation strategy" helpKey="allocationStrategy">
            <select
              value={assumptions.trains.allocationStrategy}
              onChange={(e) =>
                patch("trains", {
                  ...assumptions.trains,
                  allocationStrategy: e.target.value as SimulationAssumptions["trains"]["allocationStrategy"]
                })
              }
            >
              <option value="FIFO">FIFO</option>
              <option value="MANUAL_WAGON_RATIO">Manual EC wagon ratio</option>
            </select>
          </Field>
          {assumptions.trains.allocationStrategy === "MANUAL_WAGON_RATIO" && (
            <Field label="EC wagon ratio (0-1)" helpKey="manualEcWagonRatio">
              <input
                type="number"
                step={0.05}
                min={0}
                max={1}
                value={assumptions.trains.manualEcWagonRatio}
                onChange={(e) =>
                  patch("trains", { ...assumptions.trains, manualEcWagonRatio: num(e.target.value) })
                }
              />
            </Field>
          )}
        </section>

        <section className="panel">
          <h2>Route, Tact & Manpower</h2>
          <Field label="SFT → Paya Besar hours" helpKey="sftToPayaHours">
            <input
              type="number"
              step={0.1}
              value={assumptions.routes.sftToPayaBesarHours}
              onChange={(e) => patch("routes", { ...assumptions.routes, sftToPayaBesarHours: num(e.target.value) })}
            />
          </Field>
          <Field label="Paya Besar → Kuantan hours" helpKey="payaToKuantanHours">
            <input
              type="number"
              step={0.1}
              value={assumptions.routes.payaBesarToKuantanHours}
              onChange={(e) =>
                patch("routes", { ...assumptions.routes, payaBesarToKuantanHours: num(e.target.value) })
              }
            />
          </Field>
          <Field label="Paya Besar shunting minutes" helpKey="payaShunting">
            <input
              type="number"
              value={assumptions.routes.payaBesarShuntingMinutes}
              onChange={(e) =>
                patch("routes", { ...assumptions.routes, payaBesarShuntingMinutes: num(e.target.value) })
              }
            />
          </Field>
          <Field label="Kuantan shunting minutes" helpKey="kuantanShunting">
            <input
              type="number"
              value={assumptions.routes.kuantanShuntingMinutes}
              onChange={(e) =>
                patch("routes", { ...assumptions.routes, kuantanShuntingMinutes: num(e.target.value) })
              }
            />
          </Field>
          <Field label="Station length (m)" helpKey="stationLength">
            <input
              type="number"
              value={assumptions.routes.stationLengthMeters}
              onChange={(e) => patch("routes", { ...assumptions.routes, stationLengthMeters: num(e.target.value) })}
            />
          </Field>
          <Field label="SFT loading tact min/car" helpKey="sftLoadingTact">
            <input
              type="number"
              value={assumptions.routes.sftLoadingTactMinutes}
              onChange={(e) => patch("routes", { ...assumptions.routes, sftLoadingTactMinutes: num(e.target.value) })}
            />
          </Field>
          <Field label="Unload tact min/car" helpKey="unloadTact">
            <input
              type="number"
              value={assumptions.routes.normalUnloadTactMinutes}
              onChange={(e) =>
                patch("routes", { ...assumptions.routes, normalUnloadTactMinutes: num(e.target.value) })
              }
            />
          </Field>
          <Field label="Overlength extra min/car" helpKey="overlengthExtra">
            <input
              type="number"
              value={assumptions.routes.overlengthUnloadExtraMinutes}
              onChange={(e) =>
                patch("routes", { ...assumptions.routes, overlengthUnloadExtraMinutes: num(e.target.value) })
              }
            />
          </Field>
          <Field label="SFT loading manpower (pax)" helpKey="sftManpower">
            <input
              type="number"
              value={assumptions.teams.sftLoadingTeam}
              onChange={(e) => patch("teams", { ...assumptions.teams, sftLoadingTeam: num(e.target.value) })}
            />
          </Field>
          <Field label="Paya Besar unloading manpower (pax)" helpKey="payaManpower">
            <input
              type="number"
              value={assumptions.teams.payaBesarTeam}
              onChange={(e) => patch("teams", { ...assumptions.teams, payaBesarTeam: num(e.target.value) })}
            />
          </Field>
          <Field label="Kuantan Port unloading manpower (pax)" helpKey="kuantanManpower">
            <input
              type="number"
              value={assumptions.teams.kuantanPortTeam}
              onChange={(e) => patch("teams", { ...assumptions.teams, kuantanPortTeam: num(e.target.value) })}
            />
          </Field>
        </section>
      </div>

      {derived && (
        <section className="panel derived">
          <h2>Derived Capacities</h2>
          <div className="kpis">
            <KpiWithHelp
              label="NAC→SFT capacity"
              helpKey="derivedTransfer"
              value={`${formatNumber(derived.dailyNacTransferCapacity)} cars/day`}
            />
            <KpiWithHelp
              label="Min profitable load"
              helpKey="derivedMinLoad"
              value={`${formatNumber(derived.minTrainUnits)} cars`}
            />
            <KpiWithHelp
              label="Max train load"
              helpKey="derivedMaxLoad"
              value={`${formatNumber(derived.maxTrainUnits)} cars`}
            />
            <KpiWithHelp
              label="Max consist length"
              helpKey="derivedConsist"
              value={`${formatNumber(derived.maxConsistLengthMeters)} m`}
            />
            <KpiWithHelp
              label="SFT loading rate"
              helpKey="derivedSftRate"
              value={`${formatFixed(derived.sftCarsPerHour, 1)} cars/hour`}
            />
            {defaults && (
              <KpiWithHelp
                label="Default transfer check"
                helpKey="derivedTransfer"
                value={`${formatNumber(defaults.derived.dailyNacTransferCapacity)} cars/day`}
              />
            )}
          </div>
        </section>
      )}

      {comparison && (
        <section className="panel">
          <h2>Scenario Comparison</h2>
          <div className="compare-grid">
            {[comparison.avOnly, comparison.avAndNav].map((out) => (
              <div key={out.scenario.mode} className="compare-card">
                <h3>{out.kpis.scenarioName}</h3>
                <KpiWithHelp
                  label="Dispatched"
                  helpKey="kpiDispatched"
                  value={formatNumber(out.kpis.totalUnitsDispatched)}
                />
                <KpiWithHelp
                  label="Departures"
                  helpKey="kpiDepartures"
                  value={formatNumber(out.kpis.totalDepartures)}
                />
                <KpiWithHelp
                  label="Ending SFT"
                  helpKey="kpiEndingSft"
                  value={formatNumber(out.kpis.endingSftInventory)}
                />
                <KpiWithHelp
                  label="Ending NAC backlog"
                  helpKey="kpiEndingNac"
                  value={formatNumber(out.kpis.endingNacBacklog)}
                />
                <KpiWithHelp
                  label="Avg cycle"
                  helpKey="kpiAvgCycle"
                  value={`${formatNumber(out.kpis.averageCycleMinutes)} min`}
                />
                <KpiWithHelp
                  label="Mixed-wagon penalty"
                  helpKey="kpiMixedPenalty"
                  value={`${formatNumber(out.kpis.mixedWagonPenaltyMinutes)} min`}
                />
                <button
                  onClick={() => {
                    setResult(out);
                    setSelectedLoadId(out.loads[0]?.id ?? null);
                    setSelectedDay(out.days[0]?.day ?? null);
                  }}
                >
                  Inspect loads
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeResult && (
        <>
          <ResultsDashboard
            result={activeResult}
            comparison={comparison}
            selectedLoadId={selectedLoadId}
            selectedDay={selectedDay}
            onSelectLoad={(id) => {
              setSelectedLoadId(id);
              const load = activeResult.loads.find((l) => l.id === id);
              if (load) setSelectedDay(load.day);
            }}
            onSelectDay={(day) => {
              setSelectedDay(day);
              const firstLoad = activeResult.loads.find((l) => l.day === day);
              if (firstLoad) setSelectedLoadId(firstLoad.id);
            }}
            onSelectScenario={(mode) => {
              if (!comparison) return;
              const next = mode === "AV_ONLY" ? comparison.avOnly : comparison.avAndNav;
              setResult(next);
              setSelectedLoadId(next.loads[0]?.id ?? null);
              setSelectedDay(next.days[0]?.day ?? null);
            }}
          />

          <section className="panel">
            <h2>KPIs — {activeResult.kpis.scenarioName}</h2>
            <div className="kpis">
              <KpiWithHelp
                label="Received"
                helpKey="kpiReceived"
                value={formatNumber(activeResult.kpis.totalReceived)}
              />
              <KpiWithHelp
                label="Eligible"
                helpKey="kpiEligible"
                value={formatNumber(activeResult.kpis.totalEligible)}
              />
              <KpiWithHelp
                label="Moved to SFT"
                helpKey="kpiMovedSft"
                value={formatNumber(activeResult.kpis.totalMovedToSft)}
              />
              <KpiWithHelp
                label="Dispatched"
                helpKey="kpiDispatched"
                value={formatNumber(activeResult.kpis.totalUnitsDispatched)}
              />
              <KpiWithHelp
                label="Departures"
                helpKey="kpiDepartures"
                value={formatNumber(activeResult.kpis.totalDepartures)}
              />
              <KpiWithHelp
                label="EC delivered"
                helpKey="kpiEcDelivered"
                value={formatNumber(activeResult.kpis.eastCoastDelivered)}
              />
              <KpiWithHelp
                label="EM delivered"
                helpKey="kpiEmDelivered"
                value={formatNumber(activeResult.kpis.eastMalaysiaDelivered)}
              />
              <KpiWithHelp
                label="Max SFT"
                helpKey="kpiMaxSft"
                value={formatNumber(activeResult.kpis.maxSftInventory)}
              />
              <KpiWithHelp
                label="SFT congestion"
                helpKey="kpiSftCongestion"
                value={activeResult.kpis.sftCongestionAlert ? "YES" : "NO"}
              />
              <KpiWithHelp
                label="Days to SFT full"
                helpKey="kpiDaysSftFull"
                value={
                  activeResult.kpis.daysToSftFull == null
                    ? "—"
                    : formatNumber(activeResult.kpis.daysToSftFull)
                }
              />
              <KpiWithHelp
                label="Avg cycle"
                helpKey="kpiAvgCycle"
                value={`${formatNumber(activeResult.kpis.averageCycleMinutes)} min`}
              />
              <KpiWithHelp
                label="Max cycle"
                helpKey="kpiMaxCycle"
                value={`${formatNumber(activeResult.kpis.maxCycleMinutes)} min`}
              />
              <KpiWithHelp
                label="Below-profit loads"
                helpKey="kpiBelowProfit"
                value={formatNumber(activeResult.kpis.belowProfitabilityLoads)}
              />
              <KpiWithHelp
                label="Overlength cars"
                helpKey="kpiOverlengthCars"
                value={formatNumber(activeResult.kpis.overlengthCars)}
              />
              <KpiWithHelp
                label="Mixed-wagon penalty"
                helpKey="kpiMixedPenalty"
                value={`${formatNumber(activeResult.kpis.mixedWagonPenaltyMinutes)} min`}
              />
            </div>
          </section>

          <section className="panel">
            <h2>Manpower Planning</h2>
            <div className="kpis">
              {activeResult.kpis.manpower.map((m) => (
                <div key={m.site} className="kpi-with-help">
                  <strong>{m.site}</strong>
                  <KpiWithHelp
                    label="Team"
                    helpKey="manpowerTeam"
                    value={`${formatNumber(m.teamMembers)} pax`}
                  />
                  <KpiWithHelp
                    label="Handling"
                    helpKey="manpowerHours"
                    value={`${formatNumber(m.totalHandlingHours)} h`}
                  />
                  <KpiWithHelp
                    label="Cars"
                    helpKey="manpowerCars"
                    value={formatNumber(m.carsHandled)}
                  />
                  <KpiWithHelp
                    label="Eff. min/car"
                    helpKey="manpowerEff"
                    value={formatNumber(m.effectiveMinutesPerCar)}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>Daily Snapshot</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <LabelWithHelp text="Day" helpKey="colDay" as="th" />
                    <LabelWithHelp text="NAC in" helpKey="colNacIn" as="th" />
                    <LabelWithHelp text="Eligible" helpKey="colEligible" as="th" />
                    <LabelWithHelp text="To SFT" helpKey="colToSft" as="th" />
                    <LabelWithHelp text="NAC backlog" helpKey="colNacBacklog" as="th" />
                    <LabelWithHelp text="SFT end" helpKey="colSftEnd" as="th" />
                    <LabelWithHelp text="SFT %" helpKey="colSftPct" as="th" />
                    <LabelWithHelp text="Deps" helpKey="colDeps" as="th" />
                    <LabelWithHelp text="Dispatch" helpKey="colDispatch" as="th" />
                    <LabelWithHelp text="EC" helpKey="colEc" as="th" />
                    <LabelWithHelp text="EM" helpKey="colEm" as="th" />
                  </tr>
                </thead>
                <tbody>
                  {activeResult.days.map((d) => (
                    <tr key={d.day}>
                      <td>{d.day}</td>
                      <td>{formatNumber(d.nacReceived)}</td>
                      <td>{formatNumber(d.eligibleReceived)}</td>
                      <td>{formatNumber(d.nacToSftMoved)}</td>
                      <td>{formatNumber(d.nacBacklogEnd)}</td>
                      <td>{formatNumber(d.sftClosing)}</td>
                      <td>{formatFixed(d.sftOccupancy * 100, 1)}%</td>
                      <td>{formatNumber(d.departures)}</td>
                      <td>{formatNumber(d.unitsDispatched)}</td>
                      <td>{formatNumber(d.eastCoastDelivered)}</td>
                      <td>{formatNumber(d.eastMalaysiaDelivered)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <h2>Train / Load Log</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <LabelWithHelp text="Load" helpKey="colLoad" as="th" />
                    <LabelWithHelp text="Day" helpKey="colDay" as="th" />
                    <LabelWithHelp text="Trainset" helpKey="colTrainset" as="th" />
                    <LabelWithHelp text="Wagons" helpKey="colWagons" as="th" />
                    <LabelWithHelp text="Units" helpKey="colUnits" as="th" />
                    <LabelWithHelp text="EC/EM" helpKey="colEcEm" as="th" />
                    <LabelWithHelp text="Cycle min" helpKey="colCycleMin" as="th" />
                    <LabelWithHelp text="Mixed?" helpKey="colMixed" as="th" />
                    <LabelWithHelp text="Block min" helpKey="colBlockMin" as="th" />
                    <LabelWithHelp text="Below min?" helpKey="colBelowMin" as="th" />
                  </tr>
                </thead>
                <tbody>
                  {activeResult.loads.map((l) => (
                    <tr
                      key={l.id}
                      className={selectedLoad?.id === l.id ? "selected" : ""}
                      onClick={() => {
                        setSelectedLoadId(l.id);
                        setSelectedDay(l.day);
                      }}
                    >
                      <td>{l.id}</td>
                      <td>{l.day}</td>
                      <td>{l.trainsetId}</td>
                      <td>{formatNumber(l.wagonCount)}</td>
                      <td>{formatNumber(l.totalUnits)}</td>
                      <td>
                        {formatNumber(l.eastCoastUnits)}/{formatNumber(l.eastMalaysiaUnits)}
                      </td>
                      <td>{formatNumber(l.cycleMinutes)}</td>
                      <td>{l.hasMixedWagons ? "YES" : "NO"}</td>
                      <td>{formatNumber(l.mixedWagonBlockingMinutes)}</td>
                      <td>{l.belowProfitableMinimum ? "YES" : "NO"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedLoad && (
              <div className="load-detail">
                <h3>
                  {selectedLoad.id} detail — consist {formatNumber(selectedLoad.consistLengthMeters)} m
                </h3>
                {selectedLoad.notes.length > 0 && (
                  <ul>
                    {selectedLoad.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                )}
                <div className="grid-2">
                  <div className="table-wrap compact">
                    <table>
                      <thead>
                        <tr>
                          <th>Wagon</th>
                          <LabelWithHelp text="Purity" helpKey="colPurity" as="th" />
                          <LabelWithHelp text="EC" helpKey="colEc" as="th" />
                          <LabelWithHelp text="EM" helpKey="colEm" as="th" />
                          <LabelWithHelp text="Meters" helpKey="colMeters" as="th" />
                        </tr>
                      </thead>
                      <tbody>
                        {selectedLoad.wagons.map((w) => (
                          <tr key={w.wagonIndex}>
                            <td>{w.wagonIndex}</td>
                            <td>{w.purity}</td>
                            <td>{formatNumber(w.eastCoastUnits)}</td>
                            <td>{formatNumber(w.eastMalaysiaUnits)}</td>
                            <td>
                              {formatNumber(w.startMeter)}-{formatNumber(w.endMeter)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="table-wrap compact">
                    <table>
                      <thead>
                        <tr>
                          <LabelWithHelp text="Event" helpKey="colEvent" as="th" />
                          <LabelWithHelp text="Start" helpKey="colStart" as="th" />
                          <LabelWithHelp text="End" helpKey="colEnd" as="th" />
                          <LabelWithHelp text="Description" helpKey="colDescription" as="th" />
                        </tr>
                      </thead>
                      <tbody>
                        {selectedLoad.events.map((e, idx) => (
                          <tr key={`${e.type}-${idx}`}>
                            <td>{e.type}</td>
                            <td>{formatNumber(e.startMinute)}</td>
                            <td>{formatNumber(e.endMinute)}</td>
                            <td>{e.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
