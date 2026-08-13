import { describe, expect, it } from "vitest";
import type { ComparisonOutput, SimulationAssumptions, SimulationOutput } from "@railway/shared";
import { defaultAssumptions } from "@railway/sim-core";
import {
  buildComparisonNarrative,
  buildNarrative,
  buildScenarioNarrative
} from "./buildNarrative";

const baseKpis = {
  scenarioName: "AV Only",
  scenarioMode: "AV_ONLY" as const,
  totalReceived: 5600,
  totalEligible: 3920,
  totalIneligible: 1680,
  totalMovedToSft: 3500,
  endingNacBacklog: 420,
  endingSftInventory: 200,
  maxSftInventory: 680,
  sftCongestionAlert: false,
  totalDepartures: 14,
  totalUnitsDispatched: 3300,
  eastCoastDelivered: 1320,
  eastMalaysiaDelivered: 1980,
  averageCycleMinutes: 720,
  maxCycleMinutes: 900,
  mixedWagonPenaltyMinutes: 0,
  belowProfitabilityLoads: 0,
  overlengthCars: 0,
  daysToSftFull: null as number | null,
  dailyNacTransferCapacity: 768,
  maxTrainUnits: 243,
  minTrainUnits: 162,
  manpower: [
    {
      site: "SFT" as const,
      teamMembers: 4,
      totalHandlingMinutes: 100,
      totalHandlingHours: 1.7,
      carsHandled: 50,
      effectiveMinutesPerCar: 1
    },
    {
      site: "Paya Besar" as const,
      teamMembers: 3,
      totalHandlingMinutes: 220,
      totalHandlingHours: 3.7,
      carsHandled: 40,
      effectiveMinutesPerCar: 1
    },
    {
      site: "Kuantan Port" as const,
      teamMembers: 3,
      totalHandlingMinutes: 180,
      totalHandlingHours: 3,
      carsHandled: 45,
      effectiveMinutesPerCar: 1
    }
  ]
};

const makeResult = (overrides: Partial<SimulationOutput["kpis"]> = {}): SimulationOutput => ({
  assumptions: defaultAssumptions as SimulationAssumptions,
  scenario: { mode: "AV_ONLY", name: "AV Only" },
  openingNacUnits: 0,
  openingSftUnits: 0,
  days: [
    {
      day: 1,
      nacReceived: 400,
      eligibleReceived: 280,
      ineligibleReceived: 120,
      nacToSftMoved: 250,
      nacBacklogEnd: 30,
      sftOpening: 0,
      sftAfterTransfer: 40,
      sftClosing: 40,
      sftOccupancy: 0.05,
      sftCapacityBlocked: 0,
      departures: 1,
      unitsDispatched: 200,
      eastCoastDelivered: 80,
      eastMalaysiaDelivered: 120,
      handlingMinutesSft: 10,
      handlingMinutesPaya: 5,
      handlingMinutesKuantan: 6
    }
  ],
  loads: [],
  inventoryTimeline: [],
  kpis: { ...baseKpis, ...overrides }
});

describe("buildScenarioNarrative", () => {
  it("summarizes throughput with grouped numbers", () => {
    const items = buildScenarioNarrative(makeResult());
    const throughput = items.find((i) => i.id === "throughput");
    expect(throughput?.text).toContain("5,600");
    expect(throughput?.text).toContain("3,920");
    expect(throughput?.text).toContain("3,300");
  });

  it("flags SFT congestion and days-to-full", () => {
    const items = buildScenarioNarrative(
      makeResult({ sftCongestionAlert: true, daysToSftFull: 5, maxSftInventory: 700 })
    );
    const congestion = items.find((i) => i.id === "sft-congestion");
    expect(congestion?.severity).toBe("warn");
    expect(congestion?.text).toContain("day 5");
    expect(congestion?.text).toContain("700");
  });

  it("reports cleared NAC backlog as good", () => {
    const items = buildScenarioNarrative(makeResult({ endingNacBacklog: 0 }));
    expect(items.find((i) => i.id === "nac-cleared")?.severity).toBe("good");
  });

  it("warns on below-profit and mixed-wagon penalties", () => {
    const items = buildScenarioNarrative(
      makeResult({ belowProfitabilityLoads: 2, mixedWagonPenaltyMinutes: 45, overlengthCars: 18 })
    );
    expect(items.find((i) => i.id === "below-profit")?.severity).toBe("warn");
    expect(items.find((i) => i.id === "mixed-penalty")?.text).toContain("45");
    expect(items.find((i) => i.id === "overlength")?.text).toContain("18");
  });

  it("identifies manpower bottleneck site", () => {
    const items = buildScenarioNarrative(makeResult());
    expect(items.find((i) => i.id === "manpower")?.text).toContain("Paya Besar");
  });

  it("explains mid-day capacity blocks vs end-of-day inventory", () => {
    const result = makeResult({ sftCongestionAlert: true, daysToSftFull: 13, maxSftInventory: 700 });
    result.days = [
      {
        day: 13,
        nacReceived: 400,
        eligibleReceived: 280,
        ineligibleReceived: 120,
        nacToSftMoved: 256,
        nacBacklogEnd: 24,
        sftOpening: 444,
        sftAfterTransfer: 700,
        sftClosing: 457,
        sftOccupancy: 1,
        sftCapacityBlocked: 24,
        departures: 1,
        unitsDispatched: 243,
        eastCoastDelivered: 100,
        eastMalaysiaDelivered: 143,
        handlingMinutesSft: 10,
        handlingMinutesPaya: 5,
        handlingMinutesKuantan: 6
      }
    ];
    const items = buildScenarioNarrative(result);
    const blocked = items.find((i) => i.id === "blocked-days");
    expect(blocked?.text).toContain("before departures");
    expect(blocked?.text).toContain("700");
    expect(blocked?.text).toContain("end-of-day");
  });
  it("mentions opening stock when carry-in is non-zero", () => {
    const result = { ...makeResult(), openingNacUnits: 50, openingSftUnits: 120 };
    const items = buildScenarioNarrative(result);
    const opening = items.find((i) => i.id === "opening-stock");
    expect(opening?.text).toContain("50");
    expect(opening?.text).toContain("120");
    expect(items[0]?.id).toBe("opening-stock");
  });

  it("omits opening stock bullet when both openings are zero", () => {
    const items = buildScenarioNarrative(makeResult());
    expect(items.find((i) => i.id === "opening-stock")).toBeUndefined();
  });
});

describe("buildComparisonNarrative", () => {
  it("explains AV+NAV vs AV Only deltas", () => {
    const avOnly = makeResult({ totalEligible: 3000, totalUnitsDispatched: 2500, endingNacBacklog: 100, maxSftInventory: 500 });
    const avAndNav = makeResult({
      scenarioName: "AV + NAV",
      scenarioMode: "AV_AND_NAV",
      totalEligible: 4000,
      totalUnitsDispatched: 3200,
      endingNacBacklog: 50,
      maxSftInventory: 650,
      sftCongestionAlert: true
    });
    const comparison = {
      assumptions: defaultAssumptions,
      receipts: [],
      openingNacUnits: 0,
      openingSftUnits: 0,
      avOnly,
      avAndNav
    } as ComparisonOutput;

    const items = buildComparisonNarrative(comparison);
    expect(items.find((i) => i.id === "compare-eligible")?.text).toContain("1,000");
    expect(items.find((i) => i.id === "compare-dispatch")?.text).toContain("rose");
    expect(items.find((i) => i.id === "compare-congestion")?.severity).toBe("warn");
  });
});

describe("buildNarrative", () => {
  it("prepends comparison bullets when comparison is provided", () => {
    const result = makeResult();
    const comparison = {
      assumptions: defaultAssumptions,
      receipts: [],
      openingNacUnits: 0,
      openingSftUnits: 0,
      avOnly: result,
      avAndNav: makeResult({
        scenarioName: "AV + NAV",
        scenarioMode: "AV_AND_NAV",
        totalEligible: 4500,
        totalUnitsDispatched: 3600
      })
    } as ComparisonOutput;

    const withCompare = buildNarrative(result, comparison);
    const without = buildNarrative(result, null);
    expect(withCompare[0]?.id.startsWith("compare-")).toBe(true);
    expect(without[0]?.id).toBe("throughput");
    expect(withCompare.length).toBeGreaterThan(without.length);
  });
});
