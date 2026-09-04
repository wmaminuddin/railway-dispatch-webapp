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
import { formatChartNumber, formatNumber } from "../../utils/formatNumber";
import { ChartCard } from "./ChartCard";
import { CHART_COLORS, CHART_MARGIN, toInventoryPoints, xAxisTitle, yAxisTitle } from "./utils/chartData";

type Props = {
  days: DailySnapshot[];
  sftCapacity: number;
  selectedDay?: number | null;
  onSelectDay?: (day: number) => void;
};

/** Diamond markers so NAC backlog reads differently from the SFT circle series. */
const NacBacklogDot = ({
  cx,
  cy,
  stroke
}: {
  cx?: number;
  cy?: number;
  stroke?: string;
}) => {
  if (cx == null || cy == null) return null;
  const size = 4;
  return (
    <polygon
      points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`}
      fill={stroke ?? CHART_COLORS.nac}
      stroke={stroke ?? CHART_COLORS.nac}
    />
  );
};

export function InventoryFlowChart({ days, sftCapacity, selectedDay, onSelectDay }: Props) {
  const data = toInventoryPoints(days, sftCapacity);
  if (!data.length) return <div className="chart-empty">No inventory data yet.</div>;

  return (
    <ChartCard
      title="Inventory Flow"
      subtitle="NAC backlog, SFT peak after transfer, and end-of-day SFT vs parking capacity"
      helpKey="chartInventory"
      helpLabel="Inventory Flow chart"
    >
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={CHART_MARGIN}
            onClick={(state) => {
              const day = Number((state as { activeLabel?: string | number })?.activeLabel);
              if (!Number.isNaN(day) && onSelectDay) onSelectDay(day);
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="day" label={xAxisTitle("Day")} />
            <YAxis tickFormatter={formatChartNumber} label={yAxisTitle("Cars")} />
            <Tooltip formatter={(value) => formatChartNumber(value)} />
            <Legend />
            <ReferenceLine
              y={sftCapacity}
              stroke={CHART_COLORS.capacity}
              strokeDasharray="4 4"
              label={`SFT capacity ${formatNumber(sftCapacity)}`}
            />
            {selectedDay != null && (
              <ReferenceLine x={selectedDay} stroke="#94a3b8" strokeDasharray="2 2" />
            )}
            <Line
              type="monotone"
              dataKey="nacBacklog"
              name="NAC backlog"
              stroke={CHART_COLORS.nac}
              strokeWidth={2}
              legendType="diamond"
              dot={<NacBacklogDot />}
              activeDot={<NacBacklogDot />}
            />
            <Line
              type="monotone"
              dataKey="sftAfterTransfer"
              name="SFT after transfer"
              stroke={CHART_COLORS.sft}
              strokeWidth={2}
              legendType="circle"
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="sftInventory"
              name="SFT end of day"
              stroke={CHART_COLORS.sft}
              strokeWidth={2}
              strokeDasharray="5 4"
              legendType="plainline"
              dot={{ r: 2 }}
              opacity={0.75}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
