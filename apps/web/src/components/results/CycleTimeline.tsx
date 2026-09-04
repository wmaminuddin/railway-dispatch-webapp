import { useEffect, useState } from "react";
import type { TrainLoadLog } from "@railway/shared";
import { formatFixed, formatNumber } from "../../utils/formatNumber";
import { ChartCard } from "./ChartCard";
import {
  clockToMinutes,
  defaultProcessStartClock,
  minutesToClock,
  minutesToHours,
  normalizeTimelineEvents,
  timelineEventColor
} from "./utils/chartData";

type Props = {
  loads: TrainLoadLog[];
  selectedLoadId: string | null;
  onSelectLoad: (id: string) => void;
};

const formatHours = (minutes: number) => `${formatFixed(minutesToHours(minutes), 2)} h`;

export function CycleTimeline({ loads, selectedLoadId, onSelectLoad }: Props) {
  const load = loads.find((l) => l.id === selectedLoadId) ?? loads[0] ?? null;
  const [processStartTime, setProcessStartTime] = useState("08:00");

  useEffect(() => {
    if (!load?.events.length) return;
    setProcessStartTime(defaultProcessStartClock(load.events));
  }, [load]);

  if (!loads.length || !load || !load.events.length) {
    return <div className="chart-empty">Run a simulation with departures to view the cycle timeline.</div>;
  }

  const { events, start, span } = normalizeTimelineEvents(load.events);
  const baseClockMinutes = clockToMinutes(processStartTime);
  const width = 920;
  const rowH = 32;
  const top = 28;
  const left = 170;
  const rightPad = 168;
  const usable = width - left - rightPad;
  const height = top + events.length * rowH + 24;

  return (
    <ChartCard
      title="Cycle Timeline"
      subtitle={
        <>
          {load.id} · total cycle {formatHours(load.cycleMinutes)} · mixed-wagon block{" "}
          {formatHours(load.mixedWagonBlockingMinutes)}
        </>
      }
      helpKey="chartTimeline"
      helpLabel="Cycle Timeline"
    >
      <div className="timeline-controls">
        <label className="timeline-control">
          <span>Load</span>
          <select
            value={load.id}
            onChange={(e) => onSelectLoad(e.target.value)}
            aria-label="Select cycle timeline load"
          >
            {loads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id} · Day {l.day} · {formatNumber(l.wagonCount)} wagons
              </option>
            ))}
          </select>
        </label>
        <label className="timeline-control">
          <span>Process start</span>
          <input
            type="time"
            value={processStartTime}
            onChange={(e) => setProcessStartTime(e.target.value || "00:00")}
            aria-label="Process start time"
          />
        </label>
      </div>

      <div className="timeline-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} className="timeline-svg" role="img" aria-label="Train cycle timeline">
          {events.map((e, idx) => {
            const y = top + idx * rowH;
            const x = left + ((e.startMinute - start) / span) * usable;
            const w = Math.max(3, ((e.endMinute - e.startMinute) / span) * usable);
            const color = timelineEventColor(e.type);
            const durationMin = e.endMinute - e.startMinute;
            const durationLabel = formatHours(durationMin);
            const clockStart = minutesToClock(baseClockMinutes + (e.startMinute - start));
            const clockEnd = minutesToClock(baseClockMinutes + (e.endMinute - start));
            const intervalLabel = `${clockStart}–${clockEnd}`;
            return (
              <g key={`${e.type}-${idx}`}>
                <text x={8} y={y + 18} fontSize="10" fill="#334155">
                  {e.type.replace(/_/g, " ")}
                </text>
                <rect x={x} y={y + 6} width={w} height={18} rx={4} fill={color} opacity={0.9}>
                  <title>
                    {e.description} · {intervalLabel} · {durationLabel}
                  </title>
                </rect>
                {w > 56 && (
                  <text x={x + 6} y={y + 18} fontSize="9" fill="#fff">
                    {durationLabel}
                  </text>
                )}
                <text x={width - 8} y={y + 12} fontSize="9" fill="#64748b" textAnchor="end">
                  {intervalLabel}
                </text>
                <text x={width - 8} y={y + 24} fontSize="10" fill="#122033" textAnchor="end" fontWeight="600">
                  {durationLabel}
                </text>
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
