import { describe, expect, it } from "vitest";
import type { SimulationAssumptions, SimulationInput } from "@railway/shared";
import { createDailyLots, runComparison, runSimulation, validateInput } from "../src/engine";
import { defaultAssumptions, sampleReceipts } from "../src/scenarios";
import { parseCsvReceipts } from "../src/import-schedule";

const makeInput = (
  assumptionOverrides: Partial<SimulationAssumptions> = {},
  receipts = sampleReceipts(7, 300),
  mode: "AV_ONLY" | "AV_AND_NAV" = "AV_AND_NAV"
): SimulationInput => ({
  assumptions: {
    ...defaultAssumptions,
    ...assumptionOverrides,
    split: { ...defaultAssumptions.split, ...(assumptionOverrides.split ?? {}) },
    movement: { ...defaultAssumptions.movement, ...(assumptionOverrides.movement ?? {}) },
    wagons: { ...defaultAssumptions.wagons, ...(assumptionOverrides.wagons ?? {}) },
    trains: { ...defaultAssumptions.trains, ...(assumptionOverrides.trains ?? {}) },
    routes: { ...defaultAssumptions.routes, ...(assumptionOverrides.routes ?? {}) },
    teams: { ...defaultAssumptions.teams, ...(assumptionOverrides.teams ?? {}) }
  },
  scenario: {
    mode,
    name: mode === "AV_ONLY" ? "AV Only" : "AV + NAV"
  },
  receipts
});

describe("validation and import", () => {
  it("rejects invalid team size", () => {
    const input = makeInput({ teams: { ...defaultAssumptions.teams, sftLoadingTeam: 0 } });
    expect(validateInput(input).some((e) => e.includes("team"))).toBe(true);
  });

  it("parses csv receipts", () => {
    const csv = "day,unitsReceived\n1,100\n2,200\n";
    expect(parseCsvReceipts(csv)).toEqual([
      { day: 1, unitsReceived: 100 },
      { day: 2, unitsReceived: 200 }
    ]);
  });
});

describe("lot splitting and conservation", () => {
  it("conserves units between eligible and ineligible", () => {
    const receipts = [{ day: 1, unitsReceived: 100 }];
    const { eligible, ineligibleCount } = createDailyLots(receipts, defaultAssumptions, {
      mode: "AV_ONLY",
      name: "AV Only"
    });
    const eligibleUnits = eligible.reduce((s, l) => s + l.units, 0);
    expect(eligibleUnits + ineligibleCount).toBe(100);
  });

  it("AV-only excludes NAV", () => {
    const receipts = [{ day: 1, unitsReceived: 100 }];
    const avOnly = createDailyLots(receipts, defaultAssumptions, { mode: "AV_ONLY", name: "AV Only" });
    const both = createDailyLots(receipts, defaultAssumptions, { mode: "AV_AND_NAV", name: "AV + NAV" });
    const avUnits = avOnly.eligible.reduce((s, l) => s + l.units, 0);
    const bothUnits = both.eligible.reduce((s, l) => s + l.units, 0);
    expect(bothUnits).toBeGreaterThan(avUnits);
    expect(avOnly.eligible.every((l) => l.allocation === "AV")).toBe(true);
  });
});

describe("operations engine", () => {
  it("respects SFT capacity hard stop", () => {
    const output = runSimulation(
      makeInput({
        movement: {
          ...defaultAssumptions.movement,
          sftParkingCapacity: 40,
          nacDriversOrLanes: 10,
          nacToSftTactMinutes: 1,
          nacOperatingHoursPerDay: 24
        },
        wagons: {
          ...defaultAssumptions.wagons,
          maxWagonsPerTrain: 1,
          minWagonsForProfitability: 1,
          carsPerWagon: 1
        },
        trains: {
          ...defaultAssumptions.trains,
          trainsetsAvailable: 1,
          trainOperatingHoursPerDay: 1
        }
      })
    );
    expect(output.days.every((d) => d.sftClosing <= 40)).toBe(true);
  });

  it("dispatches at least one load when inventory exists", () => {
    const output = runSimulation(makeInput());
    expect(output.kpis.totalDepartures).toBeGreaterThan(0);
    expect(output.loads.length).toBe(output.kpis.totalDepartures);
  });

  it("forms destination-pure wagons by default and groups EC before EM", () => {
    const output = runSimulation(makeInput());
    expect(output.loads.some((l) => l.hasMixedWagons)).toBe(false);
    for (const load of output.loads) {
      const purities = load.wagons.map((w) => w.purity);
      const firstEm = purities.findIndex((p) => p === "EM");
      const lastEc = purities.lastIndexOf("EC");
      if (firstEm >= 0 && lastEc >= 0) expect(lastEc).toBeLessThan(firstEm);
    }
  });

  it("applies linear manpower scaling to SFT loading", () => {
    const smallTeam = runSimulation(makeInput({ teams: { ...defaultAssumptions.teams, sftLoadingTeam: 1 } }));
    const bigTeam = runSimulation(makeInput({ teams: { ...defaultAssumptions.teams, sftLoadingTeam: 4 } }));
    const smallLoading = smallTeam.loads[0].events.find((e) => e.type === "SFT_LOADING")!;
    const bigLoading = bigTeam.loads[0].events.find((e) => e.type === "SFT_LOADING")!;
    expect(bigLoading.endMinute - bigLoading.startMinute).toBeLessThan(
      smallLoading.endMinute - smallLoading.startMinute
    );
  });

  it("models parallel EC unload and EM onward travel for pure consists", () => {
    const output = runSimulation(makeInput());
    const mixedLoad = output.loads.find((l) => l.eastCoastUnits > 0 && l.eastMalaysiaUnits > 0);
    expect(mixedLoad).toBeTruthy();
    const events = mixedLoad!.events.map((e) => e.type);
    expect(events).toContain("UNLOAD_EC_PAYA_PARALLEL");
    expect(events).toContain("TRAVEL_PAYA_KUANTAN");
    expect(events).toContain("PICKUP_EC_WAGONS");
    const unload = mixedLoad!.events.find((e) => e.type === "UNLOAD_EC_PAYA_PARALLEL")!;
    const travel = mixedLoad!.events.find((e) => e.type === "TRAVEL_PAYA_KUANTAN")!;
    expect(travel.startMinute).toBeLessThanOrEqual(unload.endMinute);
  });

  it("charges mixed-wagon blocking time when mixing is enabled", () => {
    const input = makeInput(
      {
        simulationDays: 3,
        split: {
          eastCoastPercent: 50,
          eastMalaysiaPercent: 50,
          eastCoastAvPercent: 100,
          eastMalaysiaAvPercent: 100
        },
        wagons: {
          ...defaultAssumptions.wagons,
          allowMixedDestinationWagons: true,
          carsPerWagon: 5,
          maxWagonsPerTrain: 10,
          minWagonsForProfitability: 1
        },
        movement: {
          ...defaultAssumptions.movement,
          nacDriversOrLanes: 20,
          nacToSftTactMinutes: 1
        }
      },
      [
        { day: 1, unitsReceived: 4 },
        { day: 2, unitsReceived: 0 },
        { day: 3, unitsReceived: 0 }
      ]
    );
    const out = runSimulation(input);
    const load = out.loads.find((l) => l.hasMixedWagons);
    expect(load).toBeTruthy();
    expect(load!.mixedWagonBlockingMinutes).toBeGreaterThan(0);
    expect(load!.events.some((e) => e.type === "MIXED_WAGON_BLOCK")).toBe(true);
  });

  it("counts overlength cars beyond station length", () => {
    const output = runSimulation(
      makeInput({
        wagons: {
          ...defaultAssumptions.wagons,
          wagonLengthMeters: 26,
          maxWagonsPerTrain: 27,
          minWagonsForProfitability: 1,
          carsPerWagon: 1
        },
        routes: {
          ...defaultAssumptions.routes,
          stationLengthMeters: 50,
          overlengthUnloadExtraMinutes: 10,
          normalUnloadTactMinutes: 2
        },
        movement: {
          ...defaultAssumptions.movement,
          nacDriversOrLanes: 50,
          nacToSftTactMinutes: 1
        },
        teams: { sftLoadingTeam: 10, payaBesarTeam: 1, kuantanPortTeam: 1 }
      })
    );
    expect(output.kpis.overlengthCars).toBeGreaterThan(0);
  });

  it("comparison increases eligible volume for AV+NAV", () => {
    const { avOnly, avAndNav } = runComparison(defaultAssumptions, sampleReceipts(7, 300));
    expect(avAndNav.kpis.totalEligible).toBeGreaterThanOrEqual(avOnly.kpis.totalEligible);
  });

  it("keeps eligible + ineligible equal to total received", () => {
    const output = runSimulation(makeInput());
    expect(output.kpis.totalEligible + output.kpis.totalIneligible).toBe(output.kpis.totalReceived);
  });
});
