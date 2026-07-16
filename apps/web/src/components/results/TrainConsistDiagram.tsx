import type { TrainLoadLog } from "@railway/shared";
import { InfoTooltip } from "../help";
import { formatNumber } from "../../utils/formatNumber";
import { classifyWagons } from "./utils/chartData";

type Props = {
  load: TrainLoadLog | null | undefined;
  stationLengthMeters: number;
};

export function TrainConsistDiagram({ load, stationLengthMeters }: Props) {
  if (!load || !load.wagons.length) {
    return <div className="chart-empty">Select a load to view the wagon consist.</div>;
  }

  const wagons = classifyWagons(load.wagons, stationLengthMeters);
  const maxMeter = Math.max(load.consistLengthMeters, stationLengthMeters, 1);
  const width = 760;
  const height = 140;
  const padX = 24;
  const trackY = 58;
  const usable = width - padX * 2;
  const scale = usable / maxMeter;
  const stationX = padX + stationLengthMeters * scale;

  return (
    <div className="chart-card">
      <h3 className="chart-title-row">
        <span>
          Train Consist — {load.id} ({formatNumber(load.consistLengthMeters)} m)
        </span>
        <InfoTooltip helpKey="chartConsist" label="Train Consist diagram" />
      </h3>
      <p className="chart-subtitle">
        EC / EM / mixed wagons with station-length marker at {formatNumber(stationLengthMeters)} m
      </p>
      <div className="consist-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} className="consist-svg" role="img" aria-label="Train consist diagram">
          <line x1={padX} y1={trackY + 28} x2={padX + usable} y2={trackY + 28} stroke="#cbd5e1" strokeWidth={4} />
          <line
            x1={stationX}
            y1={18}
            x2={stationX}
            y2={height - 12}
            stroke="#c0392b"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
          <text x={stationX + 6} y={16} fill="#c0392b" fontSize="11">
            Station {formatNumber(stationLengthMeters)} m
          </text>

          {wagons.map((w) => {
            const x = padX + w.startMeter * scale;
            const wWidth = Math.max(14, (w.endMeter - w.startMeter) * scale - 2);
            return (
              <g key={w.wagonIndex}>
                <rect
                  x={x}
                  y={trackY}
                  width={wWidth}
                  height={36}
                  rx={5}
                  fill={w.fill}
                  stroke={w.overlength ? "#7f1d1d" : "#0f172a"}
                  strokeWidth={w.overlength ? 2.5 : 1}
                  opacity={0.92}
                />
                <text x={x + wWidth / 2} y={trackY + 15} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">
                  W{w.wagonIndex}
                </text>
                <text x={x + wWidth / 2} y={trackY + 28} textAnchor="middle" fill="#f8fafc" fontSize="9">
                  {formatNumber(w.cars)}
                </text>
                {w.overlength && (
                  <text x={x + wWidth / 2} y={trackY - 6} textAnchor="middle" fill="#7f1d1d" fontSize="9">
                    over
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="legend-row">
        <span className="legend-swatch ec">EC</span>
        <span className="legend-swatch em">EM</span>
        <span className="legend-swatch mixed">Mixed</span>
        <span className="legend-swatch overlength">Overlength border</span>
      </div>
      <div className="chart-note">
        {formatNumber(load.eastCoastUnits)} EC · {formatNumber(load.eastMalaysiaUnits)} EM ·{" "}
        {formatNumber(load.overlengthCars)} overlength cars
        {load.hasMixedWagons ? " · mixed wagons present" : ""}
      </div>
    </div>
  );
}
