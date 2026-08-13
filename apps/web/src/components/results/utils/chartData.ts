import type {
  ComparisonOutput,
  DailySnapshot,
  InventorySample,
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
  block: "#ea580c",
  payaBesar: "#2563eb",
  kuantanPort: "#d97706"
};

export type InventoryPoint = {
  day: number;
  nacBacklog: number;
  sftInventory: number;
  sftAfterTransfer: number;
  sftCapacity: number;
};

export type HourlySiteInventoryPoint = {
  hour: number;
  day: number;
  hourOfDay: number;
  nac: number;
  sft: number;
  payaBesar: number;
  kuantanPort: number;
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
    sftAfterTransfer: d.sftAfterTransfer,
    sftCapacity
  }));

/**
 * Bin minute-level step samples into hourly points using the max of each series
 * within the hour (including the value held entering the hour).
 */
export const toHourlySiteInventory = (
  timeline: InventorySample[],
  trainOperatingHoursPerDay: number,
  sftCapacity = 0
): HourlySiteInventoryPoint[] => {
  if (!timeline.length) return [];

  const sorted = [...timeline].sort((a, b) => a.minute - b.minute);
  const maxMinute = Math.max(...sorted.map((s) => s.minute));
  const lastHour = Math.max(0, Math.floor(maxMinute / 60));
  const hoursPerDay = Math.max(1, trainOperatingHoursPerDay);

  let idx = 0;
  let current: InventorySample = sorted[0];
  while (idx + 1 < sorted.length && sorted[idx + 1].minute <= 0) {
    idx += 1;
    current = sorted[idx];
  }

  const points: HourlySiteInventoryPoint[] = [];

  for (let hour = 0; hour <= lastHour; hour += 1) {
    const windowStart = hour * 60;
    const windowEnd = (hour + 1) * 60;

    while (idx + 1 < sorted.length && sorted[idx + 1].minute <= windowStart) {
      idx += 1;
      current = sorted[idx];
    }

    let maxNac = current.nac;
    let maxSft = current.sft;
    let maxPaya = current.payaBesar;
    let maxKuantan = current.kuantanPort;

    let scan = idx;
    while (scan + 1 < sorted.length && sorted[scan + 1].minute < windowEnd) {
      scan += 1;
      const s = sorted[scan];
      maxNac = Math.max(maxNac, s.nac);
      maxSft = Math.max(maxSft, s.sft);
      maxPaya = Math.max(maxPaya, s.payaBesar);
      maxKuantan = Math.max(maxKuantan, s.kuantanPort);
      current = s;
      idx = scan;
    }

    points.push({
      hour,
      day: Math.floor(hour / hoursPerDay) + 1,
      hourOfDay: hour % hoursPerDay,
      nac: maxNac,
      sft: maxSft,
      payaBesar: maxPaya,
      kuantanPort: maxKuantan,
      sftCapacity
    });
  }

  return points;
};

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
