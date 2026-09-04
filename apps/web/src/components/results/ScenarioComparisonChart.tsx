import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ComparisonOutput } from "@railway/shared";
import { formatChartNumber } from "../../utils/formatNumber";
import { ChartCard } from "./ChartCard";
import { CHART_COLORS, CHART_MARGIN, toComparisonPoints, xAxisTitle, yAxisTitle } from "./utils/chartData";

type Props = {
  comparison: ComparisonOutput;
  onSelectScenario?: (mode: "AV_ONLY" | "AV_AND_NAV") => void;
};

export function ScenarioComparisonChart({ comparison, onSelectScenario }: Props) {
  const data = toComparisonPoints(comparison);

  return (
    <ChartCard
      title="AV Only vs AV + NAV"
      subtitle="Click a scenario button to inspect detailed results"
      helpKey="chartCompare"
      helpLabel="AV Only vs AV + NAV chart"
    >
      <div className="chart-actions">
        <button type="button" onClick={() => onSelectScenario?.("AV_ONLY")}>
          Inspect AV Only
        </button>
        <button type="button" onClick={() => onSelectScenario?.("AV_AND_NAV")}>
          Inspect AV + NAV
        </button>
      </div>
      <div className="chart-frame chart-frame-compare">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ ...CHART_MARGIN, bottom: 52 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="metric"
              interval={0}
              angle={-15}
              textAnchor="end"
              height={70}
              label={xAxisTitle("Metric")}
            />
            <YAxis tickFormatter={formatChartNumber} label={yAxisTitle("Value")} />
            <Tooltip formatter={(value) => formatChartNumber(value)} />
            <Legend />
            <Bar dataKey="avOnly" name="AV Only" fill={CHART_COLORS.nac} radius={[4, 4, 0, 0]} />
            <Bar dataKey="avAndNav" name="AV + NAV" fill={CHART_COLORS.sft} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
