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
import type { InventorySample } from "@railway/shared";
import { formatChartNumber, formatNumber } from "../../utils/formatNumber";
import { ChartCard } from "./ChartCard";
import { CHART_COLORS, toHourlySiteInventory } from "./utils/chartData";

type Props = {
  timeline: InventorySample[];
  trainOperatingHoursPerDay: number;
  sftCapacity: number;
};

export function HourlySiteInventoryChart({
  timeline,
  trainOperatingHoursPerDay,
  sftCapacity
}: Props) {
  const data = toHourlySiteInventory(timeline, trainOperatingHoursPerDay, sftCapacity);
  if (!data.length) return <div className="chart-empty">No hourly inventory data yet.</div>;

  return (
    <ChartCard
      title="Hourly Site Inventory"
      subtitle="NAC and SFT stock vs cars on site at Paya Besar and Kuantan Port during handling (full horizon)"
      helpKey="chartHourlyInventory"
      helpLabel="Hourly Site Inventory chart"
      wide
    >
      <div className="chart-frame chart-frame-tall">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="hour"
              label={{ value: "Hour (sim)", position: "insideBottom", offset: -2 }}
            />
            <YAxis tickFormatter={formatChartNumber} />
            <Tooltip
              labelFormatter={(hour, payload) => {
                const row = payload?.[0]?.payload as
                  | { day?: number; hourOfDay?: number }
                  | undefined;
                if (row?.day != null && row.hourOfDay != null) {
                  return `Day ${row.day} · Hour ${row.hourOfDay} (sim hour ${hour})`;
                }
                return `Hour ${hour}`;
              }}
              formatter={(value) => formatChartNumber(value)}
            />
            <Legend />
            <ReferenceLine
              y={sftCapacity}
              stroke={CHART_COLORS.capacity}
              strokeDasharray="4 4"
              label={`SFT capacity ${formatNumber(sftCapacity)}`}
            />
            <Line
              type="stepAfter"
              dataKey="nac"
              name="NAC"
              stroke={CHART_COLORS.nac}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="stepAfter"
              dataKey="sft"
              name="SFT"
              stroke={CHART_COLORS.sft}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="stepAfter"
              dataKey="payaBesar"
              name="Paya Besar"
              stroke={CHART_COLORS.payaBesar}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="stepAfter"
              dataKey="kuantanPort"
              name="Kuantan Port"
              stroke={CHART_COLORS.kuantanPort}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
