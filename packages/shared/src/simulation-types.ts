export type Destination = "East Coast" | "East Malaysia";
export type Allocation = "AV" | "NAV";
export type ScenarioMode = "AV_ONLY" | "AV_AND_NAV";
export type LoadMode = "SINGLE_DESTINATION" | "MIXED";
export type AllocationStrategy = "FIFO" | "MANUAL_WAGON_RATIO";
export type RunMode = "SINGLE" | "COMPARE";
export type WagonPurity = "EC" | "EM" | "MIXED" | "EMPTY";

export type DailyReceipt = {
  day: number;
  unitsReceived: number;
};

export type SiteTeams = {
  sftLoadingTeam: number;
  payaBesarTeam: number;
  kuantanPortTeam: number;
};

export type SplitAssumptions = {
  eastCoastPercent: number;
  eastMalaysiaPercent: number;
  eastCoastAvPercent: number;
  eastMalaysiaAvPercent: number;
};

export type MovementAssumptions = {
  nacToSftTactMinutes: number;
  nacOperatingHoursPerDay: number;
  nacDriversOrLanes: number;
  sftParkingCapacity: number;
};

export type WagonAssumptions = {
  carsPerWagon: number;
  wagonLengthMeters: number;
  minWagonsForProfitability: number;
  maxWagonsPerTrain: number;
  allowMixedDestinationWagons: boolean;
};

export type TrainAssumptions = {
  trainsetsAvailable: number;
  trainOperatingHoursPerDay: number;
  loadMode: LoadMode;
  allocationStrategy: AllocationStrategy;
  /** Whole-wagon EC share when MANUAL_WAGON_RATIO; EM is remainder. */
  manualEcWagonRatio: number;
  singleDestinationPreference: Destination;
};

export type RouteAssumptions = {
  sftToPayaBesarHours: number;
  payaBesarToKuantanHours: number;
  payaBesarShuntingMinutes: number;
  kuantanShuntingMinutes: number;
  stationLengthMeters: number;
  normalUnloadTactMinutes: number;
  overlengthUnloadExtraMinutes: number;
  sftLoadingTactMinutes: number;
};

export type SimulationAssumptions = {
  simulationDays: number;
  split: SplitAssumptions;
  movement: MovementAssumptions;
  wagons: WagonAssumptions;
  trains: TrainAssumptions;
  routes: RouteAssumptions;
  teams: SiteTeams;
};

export type ScenarioConfig = {
  mode: ScenarioMode;
  name: string;
};

export type SimulationInput = {
  assumptions: SimulationAssumptions;
  scenario: ScenarioConfig;
  receipts: DailyReceipt[];
  /** Already-eligible cars waiting at NAC at day 0 (default 0). */
  openingNacUnits?: number;
  /** Cars already parked at SFT at day 0 (default 0). May exceed parking capacity. */
  openingSftUnits?: number;
};

export type VehicleLot = {
  id: string;
  dayReceived: number;
  sequence: number;
  destination: Destination;
  allocation: Allocation;
  units: number;
};

export type WagonAssignment = {
  wagonIndex: number;
  startMeter: number;
  endMeter: number;
  purity: WagonPurity;
  eastCoastUnits: number;
  eastMalaysiaUnits: number;
  cars: number;
};

export type LoadEvent = {
  type: string;
  startMinute: number;
  endMinute: number;
  description: string;
};

export type TrainLoadLog = {
  id: string;
  day: number;
  trainsetId: number;
  departureMinute: number;
  returnMinute: number;
  cycleMinutes: number;
  wagonCount: number;
  consistLengthMeters: number;
  eastCoastUnits: number;
  eastMalaysiaUnits: number;
  totalUnits: number;
  belowProfitableMinimum: boolean;
  hasMixedWagons: boolean;
  mixedWagonBlockingMinutes: number;
  overlengthCars: number;
  wagons: WagonAssignment[];
  events: LoadEvent[];
  notes: string[];
};

export type DailySnapshot = {
  day: number;
  nacReceived: number;
  eligibleReceived: number;
  ineligibleReceived: number;
  nacToSftMoved: number;
  nacBacklogEnd: number;
  sftOpening: number;
  /** SFT stock after NAC→SFT transfers, before train departures. */
  sftAfterTransfer: number;
  sftClosing: number;
  sftOccupancy: number;
  sftCapacityBlocked: number;
  departures: number;
  unitsDispatched: number;
  eastCoastDelivered: number;
  eastMalaysiaDelivered: number;
  handlingMinutesSft: number;
  handlingMinutesPaya: number;
  handlingMinutesKuantan: number;
};

export type SiteManpowerKpi = {
  site: "SFT" | "Paya Besar" | "Kuantan Port";
  teamMembers: number;
  totalHandlingMinutes: number;
  totalHandlingHours: number;
  carsHandled: number;
  effectiveMinutesPerCar: number;
};

export type SimulationKpis = {
  scenarioName: string;
  scenarioMode: ScenarioMode;
  totalReceived: number;
  totalEligible: number;
  totalIneligible: number;
  totalMovedToSft: number;
  endingNacBacklog: number;
  endingSftInventory: number;
  maxSftInventory: number;
  sftCongestionAlert: boolean;
  totalDepartures: number;
  totalUnitsDispatched: number;
  eastCoastDelivered: number;
  eastMalaysiaDelivered: number;
  averageCycleMinutes: number;
  maxCycleMinutes: number;
  mixedWagonPenaltyMinutes: number;
  belowProfitabilityLoads: number;
  overlengthCars: number;
  daysToSftFull: number | null;
  dailyNacTransferCapacity: number;
  maxTrainUnits: number;
  minTrainUnits: number;
  manpower: SiteManpowerKpi[];
};

/** Step sample of site stock / on-site cars at an absolute simulation minute. */
export type InventorySample = {
  minute: number;
  nac: number;
  sft: number;
  /** Cars on site during Paya Besar shunt / unload / wait windows. */
  payaBesar: number;
  /** Cars on site during Kuantan Port shunt / unload windows. */
  kuantanPort: number;
};

export type SimulationOutput = {
  assumptions: SimulationAssumptions;
  scenario: ScenarioConfig;
  days: DailySnapshot[];
  loads: TrainLoadLog[];
  /** Minute-level step timeline for hourly site inventory charts. */
  inventoryTimeline: InventorySample[];
  kpis: SimulationKpis;
  /** Normalized day-0 NAC opening used for this run. */
  openingNacUnits: number;
  /** Normalized day-0 SFT opening used for this run. */
  openingSftUnits: number;
};

export type ComparisonOutput = {
  assumptions: SimulationAssumptions;
  receipts: DailyReceipt[];
  openingNacUnits: number;
  openingSftUnits: number;
  avOnly: SimulationOutput;
  avAndNav: SimulationOutput;
};

export type DefaultsResponse = {
  assumptions: SimulationAssumptions;
  sampleReceipts: DailyReceipt[];
  scenarios: ScenarioConfig[];
};
