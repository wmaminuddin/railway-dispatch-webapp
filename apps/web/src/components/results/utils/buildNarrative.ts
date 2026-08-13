import type { ComparisonOutput, SimulationOutput } from "@railway/shared";
import { formatNumber } from "../../../utils/formatNumber";
import { bottleneckSite } from "./chartData";

export type NarrativeSeverity = "info" | "warn" | "good";

export type NarrativeItem = {
  id: string;
  text: string;
  severity: NarrativeSeverity;
  /** Optional help registry key for related assumption/KPI */
  relatedHelpKey?: string;
};

const pct = (part: number, whole: number): string => {
  if (whole <= 0) return "0%";
  return `${Math.round((100 * part) / whole)}%`;
};

export const buildScenarioNarrative = (result: SimulationOutput): NarrativeItem[] => {
  const { kpis, days, openingNacUnits, openingSftUnits } = result;
  const items: NarrativeItem[] = [];

  if (openingNacUnits > 0 || openingSftUnits > 0) {
    const parts: string[] = [];
    if (openingNacUnits > 0) parts.push(`${formatNumber(openingNacUnits)} at NAC`);
    if (openingSftUnits > 0) parts.push(`${formatNumber(openingSftUnits)} at SFT`);
    items.push({
      id: "opening-stock",
      severity: "info",
      relatedHelpKey: openingSftUnits > 0 ? "openingSftUnits" : "openingNacUnits",
      text: `Run started with opening stock: ${parts.join(" and ")} (mix from Scenario & Split; drains ahead of new receipts).`
    });
  }

  items.push({
    id: "throughput",
    severity: "info",
    relatedHelpKey: "kpiDispatched",
    text: `Of ${formatNumber(kpis.totalReceived)} cars received, ${formatNumber(kpis.totalEligible)} were rail-eligible (${pct(kpis.totalEligible, kpis.totalReceived)}), ${formatNumber(kpis.totalMovedToSft)} moved to SFT, and ${formatNumber(kpis.totalUnitsDispatched)} were dispatched across ${formatNumber(kpis.totalDepartures)} departures.`
  });

  items.push({
    id: "destination-split",
    severity: "info",
    relatedHelpKey: "kpiEcDelivered",
    text: `Deliveries split ${formatNumber(kpis.eastCoastDelivered)} East Coast and ${formatNumber(kpis.eastMalaysiaDelivered)} East Malaysia.`
  });

  if (kpis.sftCongestionAlert) {
    const dayHint =
      kpis.daysToSftFull == null
        ? "during the horizon"
        : `by day ${formatNumber(kpis.daysToSftFull)}`;
    items.push({
      id: "sft-congestion",
      severity: "warn",
      relatedHelpKey: "kpiSftCongestion",
      text: `SFT parking hit capacity ${dayHint} (peak after transfer ${formatNumber(kpis.maxSftInventory)} cars). End-of-day inventory can be lower after trains depart.`
    });
  } else {
    items.push({
      id: "sft-headroom",
      severity: "good",
      relatedHelpKey: "kpiMaxSft",
      text: `SFT stayed within parking capacity (peak after transfer ${formatNumber(kpis.maxSftInventory)} of ${formatNumber(result.assumptions.movement.sftParkingCapacity)}).`
    });
  }

  if (kpis.endingNacBacklog > 0) {
    items.push({
      id: "nac-backlog",
      severity: kpis.endingNacBacklog >= kpis.dailyNacTransferCapacity ? "warn" : "info",
      relatedHelpKey: "derivedTransfer",
      text: `Simulation ended with ${formatNumber(kpis.endingNacBacklog)} cars still in the NAC backlog (daily transfer capacity ${formatNumber(kpis.dailyNacTransferCapacity)}). Raise transfer capacity or lower receipts to clear it faster.`
    });
  } else {
    items.push({
      id: "nac-cleared",
      severity: "good",
      relatedHelpKey: "kpiEndingNac",
      text: "NAC backlog cleared by the end of the horizon."
    });
  }

  if (kpis.belowProfitabilityLoads > 0) {
    items.push({
      id: "below-profit",
      severity: "warn",
      relatedHelpKey: "kpiBelowProfit",
      text: `${formatNumber(kpis.belowProfitabilityLoads)} train load(s) departed below the profitable wagon minimum (${formatNumber(kpis.minTrainUnits)} cars). Often the first daily departure is allowed under-min.`
    });
  }

  if (kpis.mixedWagonPenaltyMinutes > 0) {
    items.push({
      id: "mixed-penalty",
      severity: "warn",
      relatedHelpKey: "kpiMixedPenalty",
      text: `Mixed-destination wagons added ${formatNumber(kpis.mixedWagonPenaltyMinutes)} minutes of blocking time. Prefer destination-pure wagons or disable mixed wagons if cycle time matters.`
    });
  }

  if (kpis.overlengthCars > 0) {
    items.push({
      id: "overlength",
      severity: "warn",
      relatedHelpKey: "kpiOverlengthCars",
      text: `${formatNumber(kpis.overlengthCars)} cars sat beyond station length and incurred overlength unload delay. Reduce max wagons or station overlength penalty impact.`
    });
  }

  if (kpis.averageCycleMinutes > 0) {
    items.push({
      id: "cycle",
      severity: "info",
      relatedHelpKey: "kpiAvgCycle",
      text: `Average train cycle was ${formatNumber(kpis.averageCycleMinutes)} min (max ${formatNumber(kpis.maxCycleMinutes)} min). Longer cycles limit how many departures each trainset can complete.`
    });
  }

  const bottleneck = bottleneckSite(kpis.manpower);
  if (bottleneck) {
    items.push({
      id: "manpower",
      severity: "info",
      relatedHelpKey: "chartManpower",
      text: `Highest handling load was at ${bottleneck.site}: ${formatNumber(bottleneck.totalHandlingHours)} h for ${formatNumber(bottleneck.carsHandled)} cars (${formatNumber(bottleneck.effectiveMinutesPerCar)} eff. min/car with ${formatNumber(bottleneck.teamMembers)} pax).`
    });
  }

  const blockedDays = days.filter((d) => d.sftCapacityBlocked > 0);
  if (blockedDays.length > 0) {
    const peakAfterTransfer = Math.max(...blockedDays.map((d) => d.sftAfterTransfer));
    const minClosingOnBlocked = Math.min(...blockedDays.map((d) => d.sftClosing));
    const peakNote =
      peakAfterTransfer > minClosingOnBlocked
        ? ` Peak after transfer reached ${formatNumber(peakAfterTransfer)}; end-of-day SFT was lower after departures.`
        : "";
    items.push({
      id: "blocked-days",
      severity: "warn",
      relatedHelpKey: "sftParkingCapacity",
      text: `On ${formatNumber(blockedDays.length)} day(s), SFT reached parking capacity after NAC transfers and before departures, so some cars stayed in the NAC backlog.${peakNote} Consider more parking, faster loading, or more trainsets.`
    });
  }

  return items;
};

export const buildComparisonNarrative = (comparison: ComparisonOutput): NarrativeItem[] => {
  const a = comparison.avOnly.kpis;
  const b = comparison.avAndNav.kpis;
  const deltaDispatch = b.totalUnitsDispatched - a.totalUnitsDispatched;
  const deltaEligible = b.totalEligible - a.totalEligible;
  const deltaBacklog = b.endingNacBacklog - a.endingNacBacklog;
  const deltaPeakSft = b.maxSftInventory - a.maxSftInventory;

  return [
    {
      id: "compare-eligible",
      severity: "info",
      relatedHelpKey: "scenarioMode",
      text: `AV + NAV made ${formatNumber(deltaEligible)} more cars rail-eligible than AV Only (${formatNumber(b.totalEligible)} vs ${formatNumber(a.totalEligible)}).`
    },
    {
      id: "compare-dispatch",
      severity: deltaDispatch >= 0 ? "good" : "warn",
      relatedHelpKey: "kpiDispatched",
      text: `Dispatched volume ${deltaDispatch >= 0 ? "rose" : "fell"} by ${formatNumber(Math.abs(deltaDispatch))} cars under AV + NAV (${formatNumber(b.totalUnitsDispatched)} vs ${formatNumber(a.totalUnitsDispatched)}).`
    },
    {
      id: "compare-congestion",
      severity: b.sftCongestionAlert && !a.sftCongestionAlert ? "warn" : "info",
      relatedHelpKey: "kpiSftCongestion",
      text:
        b.sftCongestionAlert === a.sftCongestionAlert
          ? `Both scenarios ${a.sftCongestionAlert ? "hit" : "avoided"} SFT capacity alerts.`
          : b.sftCongestionAlert
            ? "AV + NAV triggered SFT congestion while AV Only did not — extra eligible volume fills the yard faster."
            : "AV Only hit SFT congestion while AV + NAV did not."
    },
    {
      id: "compare-backlog-sft",
      severity: "info",
      relatedHelpKey: "kpiEndingNac",
      text: `Ending NAC backlog changed by ${formatNumber(deltaBacklog)} (AV+NAV ${formatNumber(b.endingNacBacklog)} vs AV Only ${formatNumber(a.endingNacBacklog)}); peak SFT changed by ${formatNumber(deltaPeakSft)}.`
    }
  ];
};

export const buildNarrative = (
  result: SimulationOutput,
  comparison?: ComparisonOutput | null
): NarrativeItem[] => {
  const scenarioItems = buildScenarioNarrative(result);
  if (!comparison) return scenarioItems;
  return [...buildComparisonNarrative(comparison), ...scenarioItems];
};
