import type { ComparisonOutput, SimulationOutput } from "@railway/shared";
import { InfoTooltip } from "../help";
import { buildNarrative } from "./utils/buildNarrative";

type Props = {
  result: SimulationOutput;
  comparison?: ComparisonOutput | null;
};

export function ResultsNarrative({ result, comparison }: Props) {
  const items = buildNarrative(result, comparison);
  if (!items.length) return null;

  return (
    <section className="panel narrative-panel">
      <div className="narrative-header">
        <h2 className="chart-title-row">
          <span>Results Narrative — {result.kpis.scenarioName}</span>
          <InfoTooltip helpKey="resultsNarrative" label="Results Narrative" />
        </h2>
        <p className="chart-subtitle">
          Plain-language read of this run: what moved, what constrained throughput, and what to tweak next.
        </p>
      </div>
      <ul className="narrative-list">
        {items.map((item) => (
          <li key={item.id} className={`narrative-item narrative-${item.severity}`}>
            <span className="narrative-text">{item.text}</span>
            {item.relatedHelpKey ? (
              <InfoTooltip helpKey={item.relatedHelpKey} label="Related field" />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
