import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ComparisonOutput } from "@railway/shared";
import { InfoTooltip } from "../help";
import { CHART_COLORS, toComparisonPoints } from "./utils/chartData";

type Props = {
  comparison: ComparisonOutput;
  onSelectScenario?: (mode: "AV_ONLY" | "AV_AND_NAV") => void;
};

export function ScenarioComparisonChart({ comparison, onSelectScenario }: Props) {
  const data = toComparisonPoints(comparison);

  return (
    <div className="chart-card">
      <h3 className="chart-title-row">
        <span>AV Only vs AV + NAV</span>
        <InfoTooltip helpKey="chartCompare" label="AV Only vs AV + NAV chart" />
      </h3>
      <p className="chart-subtitle">Click a scenario button to inspect detailed results</p>
      <div className="chart-actions">
        <button type="button" onClick={() => onSelectScenario?.("AV_ONLY")}>
          Inspect AV Only
        </button>
        <button type="button" onClick={() => onSelectScenario?.("AV_AND_NAV")}>
          Inspect AV + NAV
        </button>
      </div>
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="metric" interval={0} angle={-15} textAnchor="end" height={60} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="avOnly" name="AV Only" fill={CHART_COLORS.nac} radius={[4, 4, 0, 0]} />
            <Bar dataKey="avAndNav" name="AV + NAV" fill={CHART_COLORS.sft} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
