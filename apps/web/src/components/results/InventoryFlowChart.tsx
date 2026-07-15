import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { DailySnapshot } from "@railway/shared";
import { InfoTooltip } from "../help";
import { CHART_COLORS, toInventoryPoints } from "./utils/chartData";

type Props = {
  days: DailySnapshot[];
  sftCapacity: number;
  selectedDay?: number | null;
  onSelectDay?: (day: number) => void;
};

export function InventoryFlowChart({ days, sftCapacity, selectedDay, onSelectDay }: Props) {
  const data = toInventoryPoints(days, sftCapacity);
  if (!data.length) return <div className="chart-empty">No inventory data yet.</div>;

  return (
    <div className="chart-card">
      <h3 className="chart-title-row">
        <span>Inventory Flow</span>
        <InfoTooltip helpKey="chartInventory" label="Inventory Flow chart" />
      </h3>
      <p className="chart-subtitle">NAC backlog vs SFT occupancy against parking capacity</p>
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            data={data}
            onClick={(state) => {
              const day = Number((state as { activeLabel?: string | number })?.activeLabel);
              if (!Number.isNaN(day) && onSelectDay) onSelectDay(day);
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="day" label={{ value: "Day", position: "insideBottom", offset: -2 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <ReferenceLine y={sftCapacity} stroke={CHART_COLORS.capacity} strokeDasharray="4 4" label="SFT capacity" />
            {selectedDay != null && (
              <ReferenceLine x={selectedDay} stroke="#94a3b8" strokeDasharray="2 2" />
            )}
            <Line type="monotone" dataKey="nacBacklog" name="NAC backlog" stroke={CHART_COLORS.nac} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="sftInventory" name="SFT inventory" stroke={CHART_COLORS.sft} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
