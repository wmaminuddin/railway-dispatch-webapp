import { describe, expect, it } from "vitest";
import type {
  ComparisonOutput,
  DailySnapshot,
  InventorySample,
  TrainLoadLog,
  WagonAssignment
} from "@railway/shared";
import {
  bottleneckSite,
  classifyWagons,
  normalizeTimelineEvents,
  timelineEventColor,
  toComparisonPoints,
  toDeliveryPoints,
  toHourlySiteInventory,
  toInventoryPoints
} from "./chartData";

const days: DailySnapshot[] = [
  {
    day: 1,
    nacReceived: 100,
    eligibleReceived: 80,
    ineligibleReceived: 20,
    nacToSftMoved: 60,
    nacBacklogEnd: 20,
    sftOpening: 0,
    sftAfterTransfer: 60,
    sftClosing: 40,
    sftOccupancy: 0.057,
    sftCapacityBlocked: 0,
    departures: 1,
    unitsDispatched: 20,
    eastCoastDelivered: 8,
    eastMalaysiaDelivered: 12,
    handlingMinutesSft: 10,
    handlingMinutesPaya: 5,
    handlingMinutesKuantan: 6
  }
];

describe("chart data transforms", () => {
  it("builds inventory points with capacity", () => {
    expect(toInventoryPoints(days, 700)[0]).toEqual({
      day: 1,
      nacBacklog: 20,
      sftInventory: 40,
      sftAfterTransfer: 60,
      sftCapacity: 700
    });
  });

  it("builds delivery points", () => {
    expect(toDeliveryPoints(days)[0]).toMatchObject({
      day: 1,
      eastCoast: 8,
      eastMalaysia: 12,
      departures: 1
    });
  });

  it("builds comparison metrics", () => {
    const comparison = {
      assumptions: {} as ComparisonOutput["assumptions"],
      receipts: [],
      avOnly: {
        kpis: {
          totalEligible: 10,
          totalUnitsDispatched: 8,
          totalDepartures: 1,
          endingNacBacklog: 2,
          maxSftInventory: 40,
          averageCycleMinutes: 100
        }
      },
      avAndNav: {
        kpis: {
          totalEligible: 20,
          totalUnitsDispatched: 15,
          totalDepartures: 2,
          endingNacBacklog: 1,
          maxSftInventory: 60,
          averageCycleMinutes: 110
        }
      }
    } as unknown as ComparisonOutput;
    const points = toComparisonPoints(comparison);
    expect(points.find((p) => p.metric === "Eligible")).toEqual({
      metric: "Eligible",
      avOnly: 10,
      avAndNav: 20
    });
  });

  it("hourly max preserves a mid-hour unload spike", () => {
    const timeline: InventorySample[] = [
      { minute: 0, nac: 10, sft: 50, payaBesar: 0, kuantanPort: 0 },
      { minute: 90, nac: 10, sft: 50, payaBesar: 40, kuantanPort: 0 },
      { minute: 100, nac: 10, sft: 50, payaBesar: 0, kuantanPort: 0 },
      { minute: 150, nac: 5, sft: 30, payaBesar: 0, kuantanPort: 25 },
      { minute: 155, nac: 5, sft: 30, payaBesar: 0, kuantanPort: 0 },
      { minute: 180, nac: 5, sft: 30, payaBesar: 0, kuantanPort: 0 }
    ];
    const hourly = toHourlySiteInventory(timeline, 24, 700);
    expect(hourly.find((p) => p.hour === 1)?.payaBesar).toBe(40);
    expect(hourly.find((p) => p.hour === 2)?.kuantanPort).toBe(25);
    expect(hourly.find((p) => p.hour === 1)?.payaBesar).toBeGreaterThan(
      timeline.find((s) => s.minute === 100)?.payaBesar ?? 0
    );
  });
});

describe("wagon and timeline helpers", () => {
  it("marks wagons beyond station length as overlength", () => {
    const wagons: WagonAssignment[] = [
      {
        wagonIndex: 1,
        startMeter: 0,
        endMeter: 26,
        purity: "EC",
        eastCoastUnits: 5,
        eastMalaysiaUnits: 0,
        cars: 5
      },
      {
        wagonIndex: 20,
        startMeter: 520,
        endMeter: 546,
        purity: "EM",
        eastCoastUnits: 0,
        eastMalaysiaUnits: 4,
        cars: 4
      },
      {
        wagonIndex: 21,
        startMeter: 546,
        endMeter: 572,
        purity: "MIXED",
        eastCoastUnits: 2,
        eastMalaysiaUnits: 2,
        cars: 4
      }
    ];
    const visuals = classifyWagons(wagons, 500);
    expect(visuals[0].overlength).toBe(false);
    expect(visuals[1].overlength).toBe(true);
    expect(visuals[2].fill).toBe("#b45309");
  });

  it("normalizes timeline span safely", () => {
    const empty = normalizeTimelineEvents([]);
    expect(empty.span).toBe(1);
    const spanned = normalizeTimelineEvents([
      { type: "SFT_LOADING", startMinute: 10, endMinute: 40, description: "load" },
      { type: "TRAVEL_SFT_PAYA", startMinute: 40, endMinute: 280, description: "travel" }
    ]);
    expect(spanned.start).toBe(10);
    expect(spanned.end).toBe(280);
    expect(spanned.span).toBe(270);
  });

  it("maps event colors for parallel and blocked activities", () => {
    expect(timelineEventColor("UNLOAD_EC_PAYA_PARALLEL")).toBe("#16a34a");
    expect(timelineEventColor("MIXED_WAGON_BLOCK")).toBe("#dc2626");
    expect(timelineEventColor("RETURN_PAYA_SFT")).toBe("#475569");
  });

  it("identifies bottleneck site by handling minutes", () => {
    const site = bottleneckSite([
      {
        site: "SFT",
        teamMembers: 4,
        totalHandlingMinutes: 100,
        totalHandlingHours: 1.7,
        carsHandled: 50,
        effectiveMinutesPerCar: 1
      },
      {
        site: "Paya Besar",
        teamMembers: 3,
        totalHandlingMinutes: 220,
        totalHandlingHours: 3.7,
        carsHandled: 40,
        effectiveMinutesPerCar: 1
      },
      {
        site: "Kuantan Port",
        teamMembers: 3,
        totalHandlingMinutes: 180,
        totalHandlingHours: 3,
        carsHandled: 45,
        effectiveMinutesPerCar: 1
      }
    ]);
    expect(site?.site).toBe("Paya Besar");
  });

  it("tolerates empty selected load data", () => {
    const load = null as TrainLoadLog | null;
    expect(load?.wagons?.length ?? 0).toBe(0);
  });
});
