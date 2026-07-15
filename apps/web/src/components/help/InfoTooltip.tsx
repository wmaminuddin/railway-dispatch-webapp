import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { getHelp, type HelpEntry, type HelpKey } from "./helpContent";

type Props = {
  helpKey?: HelpKey | string;
  entry?: HelpEntry;
  label?: string;
};

export function InfoTooltip({ helpKey, entry, label }: Props) {
  const help = entry ?? (helpKey ? getHelp(helpKey) : null);
  const tipId = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setPinned(false);
      }
    };
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (wrapRef.current && target && !wrapRef.current.contains(target)) {
        setOpen(false);
        setPinned(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [open]);

  if (!help) return null;

  const accessibleName = `About ${label ?? help.title}`;

  return (
    <span
      className={`info-tooltip${open ? " is-open" : ""}`}
      ref={wrapRef}
      onMouseEnter={() => {
        if (!pinned) setOpen(true);
      }}
      onMouseLeave={() => {
        if (!pinned) setOpen(false);
      }}
    >
      <button
        type="button"
        className="info-tooltip-trigger"
        aria-label={accessibleName}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          if (!pinned && !wrapRef.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setPinned((p) => !p);
          setOpen((o) => !o || !pinned);
        }}
      >
        <span aria-hidden="true">i</span>
      </button>
      {open && (
        <span className="info-tooltip-panel" id={tipId} role="tooltip">
          <strong className="info-tooltip-title">{help.title}</strong>
          <span className="info-tooltip-block">
            <em>Meaning</em>
            <span>{help.meaning}</span>
          </span>
          <span className="info-tooltip-block">
            <em>Impact</em>
            <span>{help.impact}</span>
          </span>
          {(help.unit || help.formula) && (
            <span className="info-tooltip-meta">
              {help.unit ? <span>Unit: {help.unit}</span> : null}
              {help.formula ? <span>Formula: {help.formula}</span> : null}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

type LabelProps = {
  text: string;
  helpKey?: HelpKey | string;
  as?: "span" | "th" | "h3" | "h2" | "div";
  className?: string;
  children?: ReactNode;
};

export function LabelWithHelp({ text, helpKey, as = "span", className, children }: LabelProps) {
  const Tag = as;
  return (
    <Tag className={className ? `label-with-help ${className}` : "label-with-help"}>
      <span className="label-with-help-text">{text}</span>
      {helpKey ? <InfoTooltip helpKey={helpKey} label={text} /> : null}
      {children}
    </Tag>
  );
}

export function KpiWithHelp({
  label,
  helpKey,
  value
}: {
  label: string;
  helpKey: HelpKey | string;
  value: ReactNode;
}) {
  return (
    <div className="kpi-with-help">
      <div className="kpi-with-help-label">
        <span>{label}</span>
        <InfoTooltip helpKey={helpKey} label={label} />
      </div>
      <div className="kpi-with-help-value">{value}</div>
    </div>
  );
}
