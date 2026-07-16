import type { ComparisonOutput, SimulationOutput } from "@railway/shared";
import { InfoTooltip } from "../help";
import { formatNumber } from "../../utils/formatNumber";
import { InventoryFlowChart } from "./InventoryFlowChart";
import { DeliveryChart } from "./DeliveryChart";
import { ManpowerChart } from "./ManpowerChart";
import { ScenarioComparisonChart } from "./ScenarioComparisonChart";
import { TrainConsistDiagram } from "./TrainConsistDiagram";
import { CycleTimeline } from "./CycleTimeline";

type Props = {
  result: SimulationOutput;
  comparison?: ComparisonOutput | null;
  selectedLoadId: string | null;
  selectedDay: number | null;
  onSelectLoad: (id: string) => void;
  onSelectDay: (day: number) => void;
  onSelectScenario?: (mode: "AV_ONLY" | "AV_AND_NAV") => void;
};

export function ResultsDashboard({
  result,
  comparison,
  selectedLoadId,
  selectedDay,
  onSelectLoad,
  onSelectDay,
  onSelectScenario
}: Props) {
  const selectedLoad = result.loads.find((l) => l.id === selectedLoadId) ?? result.loads[0] ?? null;
  const stationLength = result.assumptions.routes.stationLengthMeters;
  const sftCapacity = result.assumptions.movement.sftParkingCapacity;

  return (
    <section className="panel dashboard-panel">
      <div className="dashboard-header">
        <div>
          <h2>Visual Operations Dashboard — {result.kpis.scenarioName}</h2>
          <p className="chart-subtitle">
            Interactive charts linked to selected day/load. Tables below remain available for audit.
          </p>
        </div>
        {result.loads.length > 0 && (
          <label className="field load-select">
            <span className="field-label-row">
              <span>Selected load</span>
              <InfoTooltip helpKey="selectedLoad" label="Selected load" />
            </span>
            <select value={selectedLoad?.id ?? ""} onChange={(e) => onSelectLoad(e.target.value)}>
              {result.loads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id} · Day {l.day} · {formatNumber(l.wagonCount)} wagons · {formatNumber(l.totalUnits)} cars
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {comparison && onSelectScenario && (
        <ScenarioComparisonChart comparison={comparison} onSelectScenario={onSelectScenario} />
      )}

      <div className="dashboard-grid">
        <InventoryFlowChart
          days={result.days}
          sftCapacity={sftCapacity}
          selectedDay={selectedDay}
          onSelectDay={onSelectDay}
        />
        <DeliveryChart days={result.days} selectedDay={selectedDay} onSelectDay={onSelectDay} />
        <ManpowerChart manpower={result.kpis.manpower} />
      </div>

      <div className="dashboard-grid">
        <TrainConsistDiagram load={selectedLoad} stationLengthMeters={stationLength} />
        <CycleTimeline load={selectedLoad} />
      </div>
    </section>
  );
}
