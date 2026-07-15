import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { DailySnapshot } from "@railway/shared";
import { InfoTooltip } from "../help";
import { CHART_COLORS, toDeliveryPoints } from "./utils/chartData";

type Props = {
  days: DailySnapshot[];
  selectedDay?: number | null;
  onSelectDay?: (day: number) => void;
};

export function DeliveryChart({ days, selectedDay, onSelectDay }: Props) {
  const data = toDeliveryPoints(days);
  if (!data.length) return <div className="chart-empty">No delivery data yet.</div>;

  return (
    <div className="chart-card">
      <h3 className="chart-title-row">
        <span>Daily Deliveries</span>
        <InfoTooltip helpKey="chartDelivery" label="Daily Deliveries chart" />
      </h3>
      <p className="chart-subtitle">East Coast and East Malaysia units with train departures</p>
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart
            data={data}
            onClick={(state) => {
              const day = Number((state as { activeLabel?: string | number })?.activeLabel);
              if (!Number.isNaN(day) && onSelectDay) onSelectDay(day);
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="day" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="eastCoast"
              name="EC delivered"
              stackId="del"
              fill={CHART_COLORS.ec}
              opacity={selectedDay == null ? 1 : 0.85}
            />
            <Bar
              yAxisId="left"
              dataKey="eastMalaysia"
              name="EM delivered"
              stackId="del"
              fill={CHART_COLORS.em}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="departures"
              name="Departures"
              stroke={CHART_COLORS.departures}
              strokeWidth={2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {selectedDay != null && <div className="chart-note">Focused day: {selectedDay}</div>}
    </div>
  );
}
