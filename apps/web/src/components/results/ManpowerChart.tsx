import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { SiteManpowerKpi } from "@railway/shared";
import { formatChartNumber, formatNumber } from "../../utils/formatNumber";
import { ChartCard } from "./ChartCard";
import { bottleneckSite, CHART_COLORS, CHART_MARGIN_DUAL_Y, xAxisTitle, yAxisTitle } from "./utils/chartData";

type Props = {
  manpower: SiteManpowerKpi[];
};

export function ManpowerChart({ manpower }: Props) {
  if (!manpower.length) return <div className="chart-empty">No manpower data yet.</div>;
  const bottleneck = bottleneckSite(manpower);

  return (
    <ChartCard
      title="Manpower Planning"
      subtitle={
        <>
          Handling hours by site
          {bottleneck
            ? ` · Bottleneck: ${bottleneck.site} (${formatNumber(bottleneck.totalHandlingHours)} h)`
            : ""}
        </>
      }
      helpKey="chartManpower"
      helpLabel="Manpower Planning chart"
    >
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={manpower} margin={CHART_MARGIN_DUAL_Y}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="site" label={xAxisTitle("Site")} />
            <YAxis
              yAxisId="left"
              tickFormatter={formatChartNumber}
              label={yAxisTitle("Handling hours")}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={formatChartNumber}
              label={yAxisTitle("Cars / Eff. min", "right")}
            />
            <Tooltip formatter={(value) => formatChartNumber(value)} />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="totalHandlingHours"
              name="Handling hours"
              fill={CHART_COLORS.loading}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="right"
              dataKey="carsHandled"
              name="Cars handled"
              fill={CHART_COLORS.travel}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="right"
              dataKey="effectiveMinutesPerCar"
              name="Eff. min/car"
              fill={CHART_COLORS.departures}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="legend-row">
        {manpower.map((m) => (
          <span key={m.site} className="legend-pill">
            {m.site}: {formatNumber(m.teamMembers)} pax
          </span>
        ))}
      </div>
    </ChartCard>
  );
}
