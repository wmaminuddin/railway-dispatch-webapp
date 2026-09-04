import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
import { getHelp, type HelpEntry, type HelpKey } from "./helpContent";

type Props = {
  helpKey?: HelpKey | string;
  entry?: HelpEntry;
  label?: string;
};

type PanelPlacement = {
  top: number;
  left: number;
  placement: "below" | "above";
  arrowLeft: number;
  maxHeight: number;
  maxWidth: number;
};

const VIEW_MARGIN = 8;
const GAP = 8;

function computePlacement(trigger: DOMRect, panelWidth: number, panelHeight: number): PanelPlacement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxWidth = Math.min(320, Math.max(160, vw - VIEW_MARGIN * 2));
  const maxHeight = Math.max(120, vh - VIEW_MARGIN * 2);
  const width = Math.min(panelWidth || maxWidth, maxWidth);
  const height = Math.min(panelHeight || 0, maxHeight);

  let placement: "below" | "above" = "below";
  let top = trigger.bottom + GAP;
  const fitsBelow = top + height <= vh - VIEW_MARGIN;
  const fitsAbove = trigger.top - GAP - height >= VIEW_MARGIN;

  if (!fitsBelow && fitsAbove) {
    placement = "above";
    top = trigger.top - GAP - height;
  } else if (!fitsBelow && !fitsAbove) {
    // Prefer the side with more room; panel will scroll internally.
    const spaceBelow = vh - trigger.bottom - VIEW_MARGIN;
    const spaceAbove = trigger.top - VIEW_MARGIN;
    if (spaceAbove > spaceBelow) {
      placement = "above";
      top = VIEW_MARGIN;
    } else {
      placement = "below";
      top = Math.min(trigger.bottom + GAP, vh - VIEW_MARGIN - Math.min(height, maxHeight));
    }
  }

  top = Math.min(Math.max(VIEW_MARGIN, top), Math.max(VIEW_MARGIN, vh - Math.min(height, maxHeight) - VIEW_MARGIN));

  let left = trigger.left + trigger.width / 2 - width / 2;
  left = Math.min(Math.max(VIEW_MARGIN, left), Math.max(VIEW_MARGIN, vw - width - VIEW_MARGIN));

  const arrowLeft = Math.min(Math.max(12, trigger.left + trigger.width / 2 - left), width - 12);

  return { top, left, placement, arrowLeft, maxHeight, maxWidth };
}

export function InfoTooltip({ helpKey, entry, label }: Props) {
  const help = entry ?? (helpKey ? getHelp(helpKey) : null);
  const tipId = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [placement, setPlacement] = useState<PanelPlacement | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    if (pinned) return;
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      setPinned(false);
    }, 120);
  };

  const openTip = () => {
    clearCloseTimer();
    setOpen(true);
  };

  useEffect(() => () => clearCloseTimer(), []);

  useEffect(() => {
    if (!open) return;

    const updatePlacement = () => {
      const trigger = wrapRef.current?.getBoundingClientRect();
      const panel = panelRef.current?.getBoundingClientRect();
      if (!trigger) return;
      setPlacement(computePlacement(trigger, panel?.width ?? 0, panel?.height ?? 0));
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setPinned(false);
      }
    };
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      const inWrap = Boolean(wrapRef.current?.contains(target));
      const inPanel = Boolean(panelRef.current?.contains(target));
      if (!inWrap && !inPanel) {
        setOpen(false);
        setPinned(false);
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPlacement(null);
      return;
    }
    const trigger = wrapRef.current?.getBoundingClientRect();
    if (!trigger) return;

    // First pass with estimated size, then refine after paint.
    setPlacement(computePlacement(trigger, 0, 0));
    const frame = window.requestAnimationFrame(() => {
      const panel = panelRef.current?.getBoundingClientRect();
      const nextTrigger = wrapRef.current?.getBoundingClientRect();
      if (!nextTrigger) return;
      setPlacement(computePlacement(nextTrigger, panel?.width ?? 0, panel?.height ?? 0));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, help?.title, help?.meaning, help?.impact]);

  if (!help) return null;

  const accessibleName = `About ${label ?? help.title}`;

  const panelStyle: CSSProperties | undefined = placement
    ? {
        top: placement.top,
        left: placement.left,
        maxWidth: placement.maxWidth,
        maxHeight: placement.maxHeight,
        // CSS var used by the caret
        ["--tooltip-arrow-left" as string]: `${placement.arrowLeft}px`
      }
    : { visibility: "hidden" as const };

  const panel = open
    ? createPortal(
        <span
          ref={panelRef}
          className={`info-tooltip-panel info-tooltip-panel--fixed${
            placement?.placement === "above" ? " is-above" : " is-below"
          }`}
          id={tipId}
          role="tooltip"
          style={panelStyle}
          onMouseEnter={openTip}
          onMouseLeave={scheduleClose}
        >
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
        </span>,
        document.body
      )
    : null;

  return (
    <span
      className={`info-tooltip${open ? " is-open" : ""}`}
      ref={wrapRef}
      onMouseEnter={openTip}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className="info-tooltip-trigger"
        aria-label={accessibleName}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onFocus={openTip}
        onBlur={(e) => {
          if (pinned) return;
          const next = e.relatedTarget as Node | null;
          if (wrapRef.current?.contains(next) || panelRef.current?.contains(next)) return;
          scheduleClose();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          clearCloseTimer();
          setPinned((p) => !p);
          setOpen((o) => !o || !pinned);
        }}
      >
        <span aria-hidden="true">i</span>
      </button>
      {panel}
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
      <span className="label-with-help-content">
        <span className="label-with-help-text">{text}</span>
        {helpKey ? <InfoTooltip helpKey={helpKey} label={text} /> : null}
        {children}
      </span>
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
