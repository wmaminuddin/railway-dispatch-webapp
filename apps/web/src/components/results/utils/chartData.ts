import type {
  ComparisonOutput,
  DailySnapshot,
  LoadEvent,
  SiteManpowerKpi,
  SimulationOutput,
  TrainLoadLog,
  WagonAssignment
} from "@railway/shared";

export const CHART_COLORS = {
  nac: "#5b6b7c",
  sft: "#0b6e4f",
  capacity: "#c0392b",
  ec: "#2563eb",
  em: "#d97706",
  mixed: "#b45309",
  departures: "#7c3aed",
  loading: "#0f766e",
  travel: "#0284c7",
  shunt: "#64748b",
  unload: "#16a34a",
  wait: "#dc2626",
  returnTrip: "#475569",
  block: "#ea580c"
};

export type InventoryPoint = {
  day: number;
  nacBacklog: number;
  sftInventory: number;
  sftCapacity: number;
};

export type DeliveryPoint = {
  day: number;
  eastCoast: number;
  eastMalaysia: number;
  departures: number;
};

export type ComparisonPoint = {
  metric: string;
  avOnly: number;
  avAndNav: number;
};

export type WagonVisual = WagonAssignment & {
  overlength: boolean;
  fill: string;
};

export const toInventoryPoints = (days: DailySnapshot[], sftCapacity: number): InventoryPoint[] =>
  days.map((d) => ({
    day: d.day,
    nacBacklog: d.nacBacklogEnd,
    sftInventory: d.sftClosing,
    sftCapacity
  }));

export const toDeliveryPoints = (days: DailySnapshot[]): DeliveryPoint[] =>
  days.map((d) => ({
    day: d.day,
    eastCoast: d.eastCoastDelivered,
    eastMalaysia: d.eastMalaysiaDelivered,
    departures: d.departures
  }));

export const toComparisonPoints = (comparison: ComparisonOutput): ComparisonPoint[] => [
  {
    metric: "Eligible",
    avOnly: comparison.avOnly.kpis.totalEligible,
    avAndNav: comparison.avAndNav.kpis.totalEligible
  },
  {
    metric: "Dispatched",
    avOnly: comparison.avOnly.kpis.totalUnitsDispatched,
    avAndNav: comparison.avAndNav.kpis.totalUnitsDispatched
  },
  {
    metric: "Departures",
    avOnly: comparison.avOnly.kpis.totalDepartures,
    avAndNav: comparison.avAndNav.kpis.totalDepartures
  },
  {
    metric: "NAC backlog",
    avOnly: comparison.avOnly.kpis.endingNacBacklog,
    avAndNav: comparison.avAndNav.kpis.endingNacBacklog
  },
  {
    metric: "Peak SFT",
    avOnly: comparison.avOnly.kpis.maxSftInventory,
    avAndNav: comparison.avAndNav.kpis.maxSftInventory
  },
  {
    metric: "Avg cycle (min)",
    avOnly: comparison.avOnly.kpis.averageCycleMinutes,
    avAndNav: comparison.avAndNav.kpis.averageCycleMinutes
  }
];

export const classifyWagons = (
  wagons: WagonAssignment[],
  stationLengthMeters: number
): WagonVisual[] =>
  wagons.map((w) => {
    const overlength = w.startMeter >= stationLengthMeters;
    let fill = CHART_COLORS.ec;
    if (w.purity === "EM") fill = CHART_COLORS.em;
    if (w.purity === "MIXED") fill = CHART_COLORS.mixed;
    if (w.purity === "EMPTY") fill = "#94a3b8";
    return { ...w, overlength, fill };
  });

export const timelineEventColor = (type: string): string => {
  if (type.includes("LOADING")) return CHART_COLORS.loading;
  if (type.includes("TRAVEL") || type.includes("RETURN")) {
    return type.includes("RETURN") ? CHART_COLORS.returnTrip : CHART_COLORS.travel;
  }
  if (type.includes("SHUNT")) return CHART_COLORS.shunt;
  if (type.includes("UNLOAD")) return CHART_COLORS.unload;
  if (type.includes("WAIT") || type.includes("BLOCK")) return CHART_COLORS.wait;
  if (type.includes("PICKUP")) return CHART_COLORS.shunt;
  return "#64748b";
};

export const normalizeTimelineEvents = (events: LoadEvent[]) => {
  if (!events.length) return { events: [] as LoadEvent[], start: 0, end: 1, span: 1 };
  const start = Math.min(...events.map((e) => e.startMinute));
  const end = Math.max(...events.map((e) => e.endMinute), start + 1);
  return { events, start, end, span: Math.max(1, end - start) };
};

export const bottleneckSite = (manpower: SiteManpowerKpi[]): SiteManpowerKpi | null => {
  if (!manpower.length) return null;
  return [...manpower].sort((a, b) => b.totalHandlingMinutes - a.totalHandlingMinutes)[0];
};

export const hasLoads = (result: SimulationOutput | null | undefined) =>
  Boolean(result?.loads?.length);

export type { TrainLoadLog };
