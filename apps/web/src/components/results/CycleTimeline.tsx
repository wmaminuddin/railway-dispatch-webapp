import type { TrainLoadLog } from "@railway/shared";
import { formatNumber } from "../../utils/formatNumber";
import { ChartCard } from "./ChartCard";
import { normalizeTimelineEvents, timelineEventColor } from "./utils/chartData";

type Props = {
  load: TrainLoadLog | null | undefined;
};

export function CycleTimeline({ load }: Props) {
  if (!load || !load.events.length) {
    return <div className="chart-empty">Select a load to view the cycle timeline.</div>;
  }

  const { events, start, span } = normalizeTimelineEvents(load.events);
  const width = 760;
  const rowH = 28;
  const top = 28;
  const left = 170;
  const rightPad = 24;
  const usable = width - left - rightPad;
  const height = top + events.length * rowH + 24;

  return (
    <ChartCard
      title={`Cycle Timeline — ${load.id}`}
      subtitle={
        <>
          Total cycle {formatNumber(load.cycleMinutes)} min · mixed-wagon block{" "}
          {formatNumber(load.mixedWagonBlockingMinutes)} min
        </>
      }
      helpKey="chartTimeline"
      helpLabel="Cycle Timeline"
    >
      <div className="timeline-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} className="timeline-svg" role="img" aria-label="Train cycle timeline">
          {events.map((e, idx) => {
            const y = top + idx * rowH;
            const x = left + ((e.startMinute - start) / span) * usable;
            const w = Math.max(3, ((e.endMinute - e.startMinute) / span) * usable);
            const color = timelineEventColor(e.type);
            const duration = Math.round((e.endMinute - e.startMinute) * 10) / 10;
            return (
              <g key={`${e.type}-${idx}`}>
                <text x={8} y={y + 16} fontSize="10" fill="#334155">
                  {e.type.replace(/_/g, " ")}
                </text>
                <rect x={x} y={y + 4} width={w} height={18} rx={4} fill={color} opacity={0.9}>
                  <title>
                    {e.description} ({formatNumber(duration)} min)
                  </title>
                </rect>
                {w > 40 && (
                  <text x={x + 6} y={y + 16} fontSize="9" fill="#fff">
                    {formatNumber(duration)}m
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="legend-row">
        <span className="legend-swatch loading">Loading</span>
        <span className="legend-swatch travel">Travel</span>
        <span className="legend-swatch shunt">Shunt/Pickup</span>
        <span className="legend-swatch unload">Unload</span>
        <span className="legend-swatch wait">Wait/Block</span>
        <span className="legend-swatch return">Return</span>
      </div>
      {load.notes.length > 0 && (
        <ul className="note-list">
          {load.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
