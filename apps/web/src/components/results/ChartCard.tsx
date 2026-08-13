import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import { InfoTooltip } from "../help";
import type { HelpKey } from "../help";

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  helpKey?: HelpKey | string;
  helpLabel?: string;
  wide?: boolean;
  children: ReactNode;
};

export function ChartCard({
  title,
  subtitle,
  helpKey,
  helpLabel,
  wide = false,
  children
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [placeholderHeight, setPlaceholderHeight] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setExpanded(false), []);
  const toggle = useCallback(() => {
    if (!expanded && cardRef.current) {
      setPlaceholderHeight(cardRef.current.getBoundingClientRect().height);
    }
    setExpanded((v) => !v);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [expanded, close]);

  const cardClass = [
    "chart-card",
    wide ? "chart-card-wide" : "",
    expanded ? "chart-card-expanded" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {expanded && (
        <>
          <div className="chart-expand-backdrop" onClick={close} aria-hidden="true" />
          <div
            className="chart-card-placeholder"
            style={{ height: placeholderHeight || undefined }}
            aria-hidden="true"
          />
        </>
      )}
      <div
        ref={cardRef}
        className={cardClass}
        role={expanded ? "dialog" : undefined}
        aria-modal={expanded || undefined}
      >
        <div className="chart-card-header">
          <h3 className="chart-title-row">
            <span>{title}</span>
            {helpKey ? <InfoTooltip helpKey={helpKey} label={helpLabel ?? String(title)} /> : null}
          </h3>
          <button
            type="button"
            className="chart-expand-btn"
            onClick={toggle}
            aria-expanded={expanded}
            aria-label={expanded ? "Close expanded chart" : "Expand chart"}
          >
            {expanded ? "Close" : "Expand"}
          </button>
        </div>
        {subtitle != null && <p className="chart-subtitle">{subtitle}</p>}
        <div key={expanded ? "expanded" : "inline"} className="chart-card-body">
          {children}
        </div>
      </div>
    </>
  );
}
