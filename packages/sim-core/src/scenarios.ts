import type { DailyReceipt, ScenarioConfig, SimulationAssumptions } from "@railway/shared";

export const defaultAssumptions: SimulationAssumptions = {
  simulationDays: 14,
  split: {
    eastCoastPercent: 40,
    eastMalaysiaPercent: 60,
    eastCoastAvPercent: 70,
    eastMalaysiaAvPercent: 70
  },
  movement: {
    nacToSftTactMinutes: 5,
    nacOperatingHoursPerDay: 16,
    nacDriversOrLanes: 4,
    sftParkingCapacity: 700
  },
  wagons: {
    carsPerWagon: 9,
    wagonLengthMeters: 26,
    minWagonsForProfitability: 18,
    maxWagonsPerTrain: 27,
    allowMixedDestinationWagons: false
  },
  trains: {
    trainsetsAvailable: 1,
    trainOperatingHoursPerDay: 24,
    loadMode: "MIXED",
    allocationStrategy: "FIFO",
    manualEcWagonRatio: 0.5,
    singleDestinationPreference: "East Coast"
  },
  routes: {
    sftToPayaBesarHours: 4,
    payaBesarToKuantanHours: 1.5,
    payaBesarShuntingMinutes: 30,
    kuantanShuntingMinutes: 30,
    stationLengthMeters: 500,
    normalUnloadTactMinutes: 3,
    overlengthUnloadExtraMinutes: 2,
    sftLoadingTactMinutes: 4
  },
  teams: {
    sftLoadingTeam: 4,
    payaBesarTeam: 3,
    kuantanPortTeam: 3
  }
};

export const defaultScenarios: ScenarioConfig[] = [
  { mode: "AV_ONLY", name: "AV Only" },
  { mode: "AV_AND_NAV", name: "AV + NAV" }
];

export const sampleReceipts = (days = 14, unitsPerDay = 400): DailyReceipt[] =>
  Array.from({ length: days }, (_, i) => ({ day: i + 1, unitsReceived: unitsPerDay }));

export const dailyNacTransferCapacity = (a: SimulationAssumptions): number => {
  const minutes = a.movement.nacOperatingHoursPerDay * 60;
  if (a.movement.nacToSftTactMinutes <= 0) return 0;
  return Math.floor((minutes * a.movement.nacDriversOrLanes) / a.movement.nacToSftTactMinutes);
};

export const maxTrainUnits = (a: SimulationAssumptions): number =>
  a.wagons.maxWagonsPerTrain * a.wagons.carsPerWagon;

export const minTrainUnits = (a: SimulationAssumptions): number =>
  a.wagons.minWagonsForProfitability * a.wagons.carsPerWagon;
