import { describe, expect, it } from "vitest";
import { HELP, getHelp, helpKeys } from "../helpContent";

const requiredInputKeys = [
  "openingNacUnits",
  "openingSftUnits",
  "simulationDays",
  "importSchedule",
  "unitsFromNac",
  "applyAllVolume",
  "runMode",
  "scenarioMode",
  "eastCoastPercent",
  "eastMalaysiaPercent",
  "eastCoastAvPercent",
  "eastMalaysiaAvPercent",
  "nacToSftTact",
  "nacOperatingHours",
  "nacDriversLanes",
  "sftParkingCapacity",
  "carsPerWagon",
  "minWagonsProfit",
  "maxWagonsTrain",
  "allowMixedWagons",
  "trainsetsAvailable",
  "trainOperatingHours",
  "loadMode",
  "allocationStrategy",
  "manualEcWagonRatio",
  "sftToPayaHours",
  "payaToKuantanHours",
  "payaShunting",
  "kuantanShunting",
  "stationLength",
  "sftLoadingTact",
  "unloadTact",
  "overlengthExtra",
  "sftManpower",
  "payaManpower",
  "kuantanManpower"
];

const requiredOutputKeys = [
  "derivedTransfer",
  "kpiEligible",
  "kpiAvgCycle",
  "kpiMixedPenalty",
  "manpowerEff",
  "colDeps",
  "colBlockMin",
  "chartInventory",
  "chartHourlyInventory",
  "resultsNarrative",
  "chartManpower",
  "chartConsist",
  "chartTimeline",
  "selectedLoad"
];

describe("help registry", () => {
  it("contains required input and output keys", () => {
    for (const key of [...requiredInputKeys, ...requiredOutputKeys]) {
      expect(HELP[key], key).toBeTruthy();
      expect(HELP[key].meaning.length).toBeGreaterThan(10);
      expect(HELP[key].impact.length).toBeGreaterThan(10);
    }
  });

  it("returns null for unknown keys", () => {
    expect(getHelp("not-a-real-key")).toBeNull();
  });

  it("exports a non-empty key list", () => {
    expect(helpKeys.length).toBeGreaterThan(40);
  });

  it("documents Eff. min/car as tact divided by pax", () => {
    expect(HELP.manpowerEff.formula).toContain("tact");
    expect(HELP.manpowerEff.meaning.toLowerCase()).toContain("pax");
  });
});
