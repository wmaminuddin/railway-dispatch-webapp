import type {
  Allocation,
  DailyReceipt,
  DailySnapshot,
  Destination,
  LoadEvent,
  ScenarioConfig,
  SimulationAssumptions,
  SimulationInput,
  SimulationKpis,
  SimulationOutput,
  SiteManpowerKpi,
  TrainLoadLog,
  VehicleLot,
  WagonAssignment,
  WagonPurity
} from "@railway/shared";
import { dailyNacTransferCapacity, maxTrainUnits, minTrainUnits } from "./scenarios";

type MutableLot = VehicleLot;

const minutes = (hours: number) => hours * 60;

const round1 = (n: number) => Math.round(n * 10) / 10;

const handlingMinutes = (cars: number, tactPerCar: number, team: number) => {
  if (cars <= 0) return 0;
  const workers = Math.max(1, team);
  return (cars * tactPerCar) / workers;
};

const splitInteger = (total: number, percent: number): [number, number] => {
  const first = Math.floor((total * percent) / 100);
  return [first, total - first];
};

const pushEvent = (events: LoadEvent[], type: string, start: number, end: number, description: string) => {
  events.push({ type, startMinute: round1(start), endMinute: round1(end), description });
};

const cloneLots = (lots: MutableLot[]): MutableLot[] =>
  lots.map((l) => ({ ...l }));

const takeUnits = (lots: MutableLot[], maxUnits: number, filter?: (l: MutableLot) => boolean): MutableLot[] => {
  const taken: MutableLot[] = [];
  let remaining = maxUnits;
  for (const lot of lots) {
    if (remaining <= 0) break;
    if (filter && !filter(lot)) continue;
    if (lot.units <= 0) continue;
    const use = Math.min(lot.units, remaining);
    taken.push({ ...lot, units: use });
    lot.units -= use;
    remaining -= use;
  }
  return taken.filter((l) => l.units > 0);
};

const countUnits = (lots: MutableLot[]) => lots.reduce((s, l) => s + l.units, 0);

const compactLots = (lots: MutableLot[]) => {
  for (let i = lots.length - 1; i >= 0; i -= 1) {
    if (lots[i].units <= 0) lots.splice(i, 1);
  }
};

const lotDestinationUnits = (lots: MutableLot[], destination: Destination) =>
  lots.filter((l) => l.destination === destination).reduce((s, l) => s + l.units, 0);

const isEligible = (allocation: Allocation, scenario: ScenarioConfig) =>
  scenario.mode === "AV_AND_NAV" || allocation === "AV";

export const createDailyLots = (
  receipts: DailyReceipt[],
  assumptions: SimulationAssumptions,
  scenario: ScenarioConfig
): { eligible: MutableLot[]; ineligibleCount: number; byDayEligible: Record<number, number>; byDayIneligible: Record<number, number> } => {
  const eligible: MutableLot[] = [];
  let ineligibleCount = 0;
  const byDayEligible: Record<number, number> = {};
  const byDayIneligible: Record<number, number> = {};
  let sequence = 0;

  for (const receipt of receipts) {
    const day = receipt.day;
    const total = Math.max(0, Math.floor(receipt.unitsReceived));
    byDayEligible[day] = 0;
    byDayIneligible[day] = 0;

    const ecPct = assumptions.split.eastCoastPercent;
    const emPct = assumptions.split.eastMalaysiaPercent;
    const railPct = Math.min(100, Math.max(0, ecPct) + Math.max(0, emPct));
    const railBound = Math.floor((total * railPct) / 100);
    const notRail = total - railBound;
    ineligibleCount += notRail;
    byDayIneligible[day] += notRail;

    let ec = 0;
    let em = 0;
    if (railBound > 0 && railPct > 0) {
      const ecShare = Math.max(0, ecPct) / railPct;
      ec = Math.floor(railBound * ecShare);
      em = railBound - ec;
    }

    const assign = (destination: Destination, units: number) => {
      if (units <= 0) return;
      const avPct =
        destination === "East Coast"
          ? assumptions.split.eastCoastAvPercent
          : assumptions.split.eastMalaysiaAvPercent;
      const [av, nav] = splitInteger(units, avPct);
      const parts: Array<{ allocation: Allocation; units: number }> = [
        { allocation: "AV", units: av },
        { allocation: "NAV", units: nav }
      ];
      for (const part of parts) {
        if (part.units <= 0) continue;
        if (isEligible(part.allocation, scenario)) {
          sequence += 1;
          eligible.push({
            id: `${day}-${destination}-${part.allocation}-${sequence}`,
            dayReceived: day,
            sequence,
            destination,
            allocation: part.allocation,
            units: part.units
          });
          byDayEligible[day] += part.units;
        } else {
          ineligibleCount += part.units;
          byDayIneligible[day] += part.units;
        }
      }
    };

    assign("East Coast", ec);
    assign("East Malaysia", em);
  }

  return { eligible, ineligibleCount, byDayEligible, byDayIneligible };
};

const wagonPurity = (ec: number, em: number): WagonPurity => {
  if (ec > 0 && em > 0) return "MIXED";
  if (ec > 0) return "EC";
  if (em > 0) return "EM";
  return "EMPTY";
};

const formWagonsFromCars = (
  cars: Array<{ destination: Destination }>,
  assumptions: SimulationAssumptions
): WagonAssignment[] => {
  const capacity = assumptions.wagons.carsPerWagon;
  const length = assumptions.wagons.wagonLengthMeters;
  const allowMixed = assumptions.wagons.allowMixedDestinationWagons;

  const ecCars = cars.filter((c) => c.destination === "East Coast");
  const emCars = cars.filter((c) => c.destination === "East Malaysia");

  const wagons: WagonAssignment[] = [];
  let wagonIndex = 1;

  const fillPure = (destCars: Array<{ destination: Destination }>, asEc: boolean) => {
    while (destCars.length > 0) {
      const take = destCars.splice(0, capacity);
      const ec = asEc ? take.length : 0;
      const em = asEc ? 0 : take.length;
      const start = (wagonIndex - 1) * length;
      wagons.push({
        wagonIndex,
        startMeter: start,
        endMeter: start + length,
        purity: wagonPurity(ec, em),
        eastCoastUnits: ec,
        eastMalaysiaUnits: em,
        cars: take.length
      });
      wagonIndex += 1;
    }
  };

  // Prefer destination-pure wagons; group EC first for Paya detachment.
  fillPure(ecCars, true);
  fillPure(emCars, false);

  // Mixing is undesirable. Only collapse undersized last EC+EM residues when explicitly enabled.
  if (allowMixed && wagons.length >= 2) {
    const last = wagons[wagons.length - 1];
    const prev = wagons[wagons.length - 2];
    if (
      prev.cars < capacity &&
      last.cars < capacity &&
      prev.cars + last.cars <= capacity &&
      ((prev.purity === "EC" && last.purity === "EM") || (prev.purity === "EM" && last.purity === "EC"))
    ) {
      const ec = prev.eastCoastUnits + last.eastCoastUnits;
      const em = prev.eastMalaysiaUnits + last.eastMalaysiaUnits;
      const start = prev.startMeter;
      wagons.splice(wagons.length - 2, 2, {
        wagonIndex: prev.wagonIndex,
        startMeter: start,
        endMeter: start + length,
        purity: wagonPurity(ec, em),
        eastCoastUnits: ec,
        eastMalaysiaUnits: em,
        cars: ec + em
      });
    }
  }

  return wagons;
};

const selectCarsForLoad = (
  sftLots: MutableLot[],
  assumptions: SimulationAssumptions,
  maxCars: number
): MutableLot[] => {
  if (maxCars <= 0) return [];
  const wagons = assumptions.wagons;
  const maxWagons = wagons.maxWagonsPerTrain;
  const capacity = wagons.carsPerWagon;
  const hardCap = Math.min(maxCars, maxWagons * capacity);

  if (assumptions.trains.loadMode === "SINGLE_DESTINATION") {
    const dest = assumptions.trains.singleDestinationPreference;
    return takeUnits(sftLots, hardCap, (l) => l.destination === dest);
  }

  if (assumptions.trains.allocationStrategy === "MANUAL_WAGON_RATIO") {
    const ratio = Math.min(1, Math.max(0, assumptions.trains.manualEcWagonRatio));
    let ecWagons = Math.floor(maxWagons * ratio);
    let emWagons = maxWagons - ecWagons;
    const ecAvail = lotDestinationUnits(sftLots, "East Coast");
    const emAvail = lotDestinationUnits(sftLots, "East Malaysia");
    // Shrink empty-side wagons and give leftover capacity to the other side.
    while (ecWagons > 0 && ecAvail < (ecWagons - 1) * capacity + 1) ecWagons -= 1;
    while (emWagons > 0 && emAvail < (emWagons - 1) * capacity + 1) emWagons -= 1;
    const leftover = maxWagons - ecWagons - emWagons;
    if (leftover > 0) {
      if (ecAvail > ecWagons * capacity) ecWagons += leftover;
      else emWagons += leftover;
    }
    const ecTaken = takeUnits(sftLots, ecWagons * capacity, (l) => l.destination === "East Coast");
    const emTaken = takeUnits(sftLots, emWagons * capacity, (l) => l.destination === "East Malaysia");
    return [...ecTaken, ...emTaken];
  }

  // FIFO mixed: take next cars in FIFO order up to hardCap.
  return takeUnits(sftLots, hardCap);
};

const lotsToCars = (lots: MutableLot[]): Array<{ destination: Destination }> => {
  const cars: Array<{ destination: Destination }> = [];
  for (const lot of lots) {
    for (let i = 0; i < lot.units; i += 1) cars.push({ destination: lot.destination });
  }
  return cars;
};

const unloadCarsMinutes = (
  wagons: WagonAssignment[],
  assumptions: SimulationAssumptions,
  team: number,
  which: "EC" | "EM"
) => {
  const normal = assumptions.routes.normalUnloadTactMinutes;
  const extra = assumptions.routes.overlengthUnloadExtraMinutes;
  const station = assumptions.routes.stationLengthMeters;
  let total = 0;
  let carCount = 0;
  let overlengthCars = 0;
  for (const w of wagons) {
    const units = which === "EC" ? w.eastCoastUnits : w.eastMalaysiaUnits;
    if (units <= 0) continue;
    const beyond = w.startMeter >= station;
    const tact = normal + (beyond ? extra : 0);
    total += handlingMinutes(units, tact, team);
    carCount += units;
    if (beyond) overlengthCars += units;
  }
  return { minutes: total, carCount, overlengthCars };
};

const simulateLoadCycle = (
  loadId: string,
  day: number,
  trainsetId: number,
  startMinute: number,
  selectedLots: MutableLot[],
  assumptions: SimulationAssumptions
): TrainLoadLog => {
  const events: LoadEvent[] = [];
  const notes: string[] = [];
  const cars = lotsToCars(selectedLots);
  let wagons = formWagonsFromCars(cars, assumptions);

  // Cap wagon count at max; formWagons already limited by selected cars.
  const wagonCount = wagons.length;
  const consistLength = wagonCount * assumptions.wagons.wagonLengthMeters;
  const ecUnits = wagons.reduce((s, w) => s + w.eastCoastUnits, 0);
  const emUnits = wagons.reduce((s, w) => s + w.eastMalaysiaUnits, 0);
  const totalUnits = ecUnits + emUnits;
  const belowProfitableMinimum = wagonCount < assumptions.wagons.minWagonsForProfitability;
  const hasMixedWagons = wagons.some((w) => w.purity === "MIXED");
  if (hasMixedWagons) notes.push("Mixed-destination wagons increase Paya Besar blocking time.");
  if (belowProfitableMinimum) notes.push("Load is below the profitable minimum wagon count.");

  const loadMinutes = handlingMinutes(
    totalUnits,
    assumptions.routes.sftLoadingTactMinutes,
    assumptions.teams.sftLoadingTeam
  );
  const loadingStart = startMinute;
  const loadingEnd = loadingStart + loadMinutes;
  pushEvent(events, "SFT_LOADING", loadingStart, loadingEnd, `Loaded ${totalUnits} cars with ${assumptions.teams.sftLoadingTeam} team members`);

  const departSft = loadingEnd;
  const arrivePaya = departSft + minutes(assumptions.routes.sftToPayaBesarHours);
  pushEvent(events, "TRAVEL_SFT_PAYA", departSft, arrivePaya, "Travel SFT to Paya Besar");

  const shuntPayaStart = arrivePaya;
  const shuntPayaEnd = shuntPayaStart + assumptions.routes.payaBesarShuntingMinutes;
  pushEvent(events, "SHUNT_PAYA", shuntPayaStart, shuntPayaEnd, "Shunting at Paya Besar");

  const pureEcWagons = wagons.filter((w) => w.purity === "EC");
  const mixedWagons = wagons.filter((w) => w.purity === "MIXED");
  const pureEmWagons = wagons.filter((w) => w.purity === "EM");

  const mixedEcUnload = unloadCarsMinutes(mixedWagons, assumptions, assumptions.teams.payaBesarTeam, "EC");
  const pureEcUnload = unloadCarsMinutes(pureEcWagons, assumptions, assumptions.teams.payaBesarTeam, "EC");
  // Mixed wagons also may unload? Only EC portion at Paya; EM remains on wagon.
  // Pure EC unload can run in parallel with onward EM movement after shunting,
  // but mixed EC unload blocks onward departure.

  const mixedBlocking = mixedEcUnload.minutes;
  const onwardStart = shuntPayaEnd + mixedBlocking;
  if (mixedBlocking > 0) {
    pushEvent(
      events,
      "MIXED_WAGON_BLOCK",
      shuntPayaEnd,
      onwardStart,
      `Mixed wagons block onward movement while unloading ${mixedEcUnload.carCount} EC cars`
    );
  }

  const pureEcUnloadStart = shuntPayaEnd;
  const pureEcUnloadEnd = pureEcUnloadStart + pureEcUnload.minutes;
  if (pureEcUnload.carCount > 0) {
    pushEvent(
      events,
      "UNLOAD_EC_PAYA_PARALLEL",
      pureEcUnloadStart,
      pureEcUnloadEnd,
      `Detach and unload ${pureEcUnload.carCount} EC cars at Paya Besar`
    );
  }

  let returnMinute = onwardStart;
  let emUnloadMinutes = 0;
  let emOverlength = 0;
  let kuantanHandling = 0;
  let arriveSft = onwardStart;

  if (emUnits > 0) {
    // EM wagons (pure + mixed remaining) continue to Kuantan
    const travelStart = onwardStart;
    const arriveKuantan = travelStart + minutes(assumptions.routes.payaBesarToKuantanHours);
    pushEvent(events, "TRAVEL_PAYA_KUANTAN", travelStart, arriveKuantan, "Travel Paya Besar to Kuantan Port");

    const shuntKStart = arriveKuantan;
    const shuntKEnd = shuntKStart + assumptions.routes.kuantanShuntingMinutes;
    pushEvent(events, "SHUNT_KUANTAN", shuntKStart, shuntKEnd, "Shunting at Kuantan Port");

    const emWagonsForUnload = [...pureEmWagons, ...mixedWagons];
    const emUnload = unloadCarsMinutes(emWagonsForUnload, assumptions, assumptions.teams.kuantanPortTeam, "EM");
    emUnloadMinutes = emUnload.minutes;
    emOverlength = emUnload.overlengthCars;
    kuantanHandling = emUnload.minutes;
    const unloadEnd = shuntKEnd + emUnload.minutes;
    pushEvent(events, "UNLOAD_EM_KUANTAN", shuntKEnd, unloadEnd, `Unload ${emUnload.carCount} EM cars at Kuantan Port`);

    const leaveKuantan = unloadEnd;
    const arrivePayaReturn = leaveKuantan + minutes(assumptions.routes.payaBesarToKuantanHours);
    pushEvent(events, "RETURN_KUANTAN_PAYA", leaveKuantan, arrivePayaReturn, "Return travel Kuantan to Paya Besar");

    const ecReady = Math.max(pureEcUnloadEnd, shuntPayaEnd + mixedEcUnload.minutes);
    const pickupStart = Math.max(arrivePayaReturn, ecReady);
    if (pickupStart > arrivePayaReturn) {
      pushEvent(events, "WAIT_EC_PICKUP", arrivePayaReturn, pickupStart, "Wait for EC wagon unloading before pickup");
    }
    pushEvent(events, "PICKUP_EC_WAGONS", pickupStart, pickupStart, "Pick up empty EC wagons at Paya Besar");

    arriveSft = pickupStart + minutes(assumptions.routes.sftToPayaBesarHours);
    pushEvent(events, "RETURN_PAYA_SFT", pickupStart, arriveSft, "Return travel Paya Besar to SFT");
    returnMinute = arriveSft;
  } else {
    // EC-only: unload all EC at Paya (pure + any mixed EC which is all), then return
    const allEcUnload = unloadCarsMinutes(wagons, assumptions, assumptions.teams.payaBesarTeam, "EC");
    const unloadStart = shuntPayaEnd;
    const unloadEnd = unloadStart + allEcUnload.minutes;
    // Replace parallel events with single path for EC-only
    events.splice(0, events.length);
    pushEvent(events, "SFT_LOADING", loadingStart, loadingEnd, `Loaded ${totalUnits} cars with ${assumptions.teams.sftLoadingTeam} team members`);
    pushEvent(events, "TRAVEL_SFT_PAYA", departSft, arrivePaya, "Travel SFT to Paya Besar");
    pushEvent(events, "SHUNT_PAYA", shuntPayaStart, shuntPayaEnd, "Shunting at Paya Besar");
    pushEvent(events, "UNLOAD_EC_PAYA", unloadStart, unloadEnd, `Unload ${allEcUnload.carCount} EC cars at Paya Besar`);
    arriveSft = unloadEnd + minutes(assumptions.routes.sftToPayaBesarHours);
    pushEvent(events, "RETURN_PAYA_SFT", unloadEnd, arriveSft, "Return travel Paya Besar to SFT");
    returnMinute = arriveSft;
  }

  const payaHandling =
    emUnits > 0 ? pureEcUnload.minutes + mixedEcUnload.minutes : unloadCarsMinutes(wagons, assumptions, assumptions.teams.payaBesarTeam, "EC").minutes;
  void payaHandling;

  const overlengthCars =
    (emUnits > 0
      ? pureEcUnload.overlengthCars + mixedEcUnload.overlengthCars + emOverlength
      : unloadCarsMinutes(wagons, assumptions, assumptions.teams.payaBesarTeam, "EC").overlengthCars);

  return {
    id: loadId,
    day,
    trainsetId,
    departureMinute: round1(departSft),
    returnMinute: round1(returnMinute),
    cycleMinutes: round1(returnMinute - loadingStart),
    wagonCount,
    consistLengthMeters: consistLength,
    eastCoastUnits: ecUnits,
    eastMalaysiaUnits: emUnits,
    totalUnits,
    belowProfitableMinimum,
    hasMixedWagons,
    mixedWagonBlockingMinutes: round1(mixedBlocking),
    overlengthCars,
    wagons,
    events,
    notes
  };
};

export const validateInput = (input: SimulationInput): string[] => {
  const errors: string[] = [];
  const a = input.assumptions;
  if (!input.receipts?.length) errors.push("At least one daily receipt is required.");
  if (a.simulationDays < 1) errors.push("simulationDays must be >= 1.");
  if (a.split.eastCoastPercent < 0 || a.split.eastMalaysiaPercent < 0) errors.push("Destination percentages cannot be negative.");
  if (a.movement.nacToSftTactMinutes <= 0) errors.push("NAC to SFT tact must be > 0.");
  if (a.movement.nacDriversOrLanes < 1) errors.push("At least one NAC driver/lane is required.");
  if (a.wagons.carsPerWagon < 1) errors.push("carsPerWagon must be >= 1.");
  if (a.wagons.minWagonsForProfitability < 1) errors.push("minWagonsForProfitability must be >= 1.");
  if (a.wagons.maxWagonsPerTrain < a.wagons.minWagonsForProfitability) {
    errors.push("maxWagonsPerTrain must be >= minWagonsForProfitability.");
  }
  if (a.trains.trainsetsAvailable < 1) errors.push("trainsetsAvailable must be >= 1.");
  if (a.teams.sftLoadingTeam < 1 || a.teams.payaBesarTeam < 1 || a.teams.kuantanPortTeam < 1) {
    errors.push("Each site team must have at least 1 member.");
  }
  for (const r of input.receipts) {
    if (r.day < 1 || r.unitsReceived < 0) errors.push(`Invalid receipt for day ${r.day}.`);
  }
  return errors;
};

export const runSimulation = (input: SimulationInput): SimulationOutput => {
  const errors = validateInput(input);
  if (errors.length) {
    throw new Error(errors.join(" "));
  }

  const assumptions = input.assumptions;
  const scenario = input.scenario;
  const horizon = assumptions.simulationDays;
  const receipts = [...input.receipts]
    .filter((r) => r.day >= 1 && r.day <= horizon)
    .sort((a, b) => a.day - b.day);

  const { eligible, ineligibleCount, byDayEligible, byDayIneligible } = createDailyLots(
    receipts,
    assumptions,
    scenario
  );

  const nacQueue: MutableLot[] = [];
  const sftQueue: MutableLot[] = [];
  const loads: TrainLoadLog[] = [];
  const days: DailySnapshot[] = [];

  const trainsetAvailable: number[] = Array.from({ length: assumptions.trains.trainsetsAvailable }, () => 0);
  const windowMinutes = minutes(assumptions.trains.trainOperatingHoursPerDay);
  const transferCap = dailyNacTransferCapacity(assumptions);

  let loadCounter = 0;
  let sftHandlingTotal = 0;
  let payaHandlingTotal = 0;
  let kuantanHandlingTotal = 0;
  let sftCarsHandled = 0;
  let payaCarsHandled = 0;
  let kuantanCarsHandled = 0;
  let daysToSftFull: number | null = null;
  let maxSft = 0;

  const receiptByDay = new Map(receipts.map((r) => [r.day, r.unitsReceived]));

  for (let day = 1; day <= horizon; day += 1) {
    // Release eligible lots for this day into NAC backlog (already created with dayReceived).
    for (const lot of eligible) {
      if (lot.dayReceived === day && lot.units > 0) {
        nacQueue.push({ ...lot });
        lot.units = 0;
      }
    }
    compactLots(eligible);

    const nacReceived = receiptByDay.get(day) ?? 0;
    const eligibleReceived = byDayEligible[day] ?? 0;
    const ineligibleReceived = byDayIneligible[day] ?? 0;

    const sftOpening = countUnits(sftQueue);
    let moved = 0;
    let capacityBlocked = 0;
    let transferLeft = transferCap;

    while (transferLeft > 0 && nacQueue.length > 0) {
      const freeSft = assumptions.movement.sftParkingCapacity - countUnits(sftQueue);
      if (freeSft <= 0) {
        capacityBlocked += Math.min(transferLeft, countUnits(nacQueue));
        break;
      }
      const take = takeUnits(nacQueue, Math.min(transferLeft, freeSft));
      const takenUnits = countUnits(take);
      if (takenUnits <= 0) break;
      for (const t of take) sftQueue.push(t);
      moved += takenUnits;
      transferLeft -= takenUnits;
    }
    compactLots(nacQueue);
    compactLots(sftQueue);

    let departures = 0;
    let unitsDispatched = 0;
    let ecDelivered = 0;
    let emDelivered = 0;
    let handlingSft = 0;
    let handlingPaya = 0;
    let handlingKuantan = 0;
    let mandatoryDone = false;

    // Attempt departures throughout the day window using available trainsets.
    let safety = 0;
    while (safety < 50) {
      safety += 1;
      const sftUnits = countUnits(sftQueue);
      if (sftUnits <= 0) break;

      let bestTs = -1;
      let bestAvail = Number.POSITIVE_INFINITY;
      for (let i = 0; i < trainsetAvailable.length; i += 1) {
        if (trainsetAvailable[i] < bestAvail) {
          bestAvail = trainsetAvailable[i];
          bestTs = i;
        }
      }
      if (bestTs < 0) break;

      const dayOffset = (day - 1) * windowMinutes;
      const earliest = Math.max(bestAvail, dayOffset);
      if (earliest >= dayOffset + windowMinutes) break;

      const isMandatory = !mandatoryDone;
      const minCars = isMandatory ? 1 : assumptions.wagons.minWagonsForProfitability * assumptions.wagons.carsPerWagon;
      if (!isMandatory && sftUnits < minCars) break;

      // Peek formation without mutating first: clone
      const peekQueue = cloneLots(sftQueue);
      const selected = selectCarsForLoad(peekQueue, assumptions, Math.min(sftUnits, maxTrainUnits(assumptions)));
      const selectedUnits = countUnits(selected);
      if (selectedUnits < (isMandatory ? 1 : minCars)) break;

      // Estimate cycle by temp simulation on selected
      const tempLots = selected;
      const tempLog = simulateLoadCycle(`tmp-${day}-${loadCounter}`, day, bestTs + 1, earliest, tempLots, assumptions);
      if (tempLog.returnMinute > dayOffset + windowMinutes && !isMandatory) {
        // optional load doesn't fit
        break;
      }
      if (tempLog.returnMinute > dayOffset + windowMinutes && isMandatory) {
        // still allow mandatory first load that overruns, but mark note
        tempLog.notes.push("Mandatory daily load exceeds the operating window.");
      }

      // Commit: actually take from sftQueue
      const committed = selectCarsForLoad(sftQueue, assumptions, selectedUnits);
      compactLots(sftQueue);
      loadCounter += 1;
      const log = simulateLoadCycle(`L${loadCounter}`, day, bestTs + 1, earliest, committed, assumptions);
      if (tempLog.notes.includes("Mandatory daily load exceeds the operating window.")) {
        log.notes.push("Mandatory daily load exceeds the operating window.");
      }
      loads.push(log);
      trainsetAvailable[bestTs] = log.returnMinute;

      departures += 1;
      unitsDispatched += log.totalUnits;
      ecDelivered += log.eastCoastUnits;
      emDelivered += log.eastMalaysiaUnits;
      handlingSft += handlingMinutes(log.totalUnits, assumptions.routes.sftLoadingTactMinutes, assumptions.teams.sftLoadingTeam);
      // approximate destination handling from unload events
      for (const e of log.events) {
        if (e.type.includes("UNLOAD_EC") || e.type === "MIXED_WAGON_BLOCK") handlingPaya += e.endMinute - e.startMinute;
        if (e.type.includes("UNLOAD_EM")) handlingKuantan += e.endMinute - e.startMinute;
      }
      sftCarsHandled += log.totalUnits;
      payaCarsHandled += log.eastCoastUnits;
      kuantanCarsHandled += log.eastMalaysiaUnits;
      mandatoryDone = true;

      if (!isMandatory) {
        // continue searching for more loads
      }
    }

    sftHandlingTotal += handlingSft;
    payaHandlingTotal += handlingPaya;
    kuantanHandlingTotal += handlingKuantan;

    const sftClosing = countUnits(sftQueue);
    maxSft = Math.max(maxSft, sftClosing, sftOpening);
    if (daysToSftFull === null && sftClosing >= assumptions.movement.sftParkingCapacity) {
      daysToSftFull = day;
    }

    days.push({
      day,
      nacReceived,
      eligibleReceived,
      ineligibleReceived,
      nacToSftMoved: moved,
      nacBacklogEnd: countUnits(nacQueue),
      sftOpening,
      sftClosing,
      sftOccupancy: assumptions.movement.sftParkingCapacity > 0 ? sftClosing / assumptions.movement.sftParkingCapacity : 0,
      sftCapacityBlocked: capacityBlocked,
      departures,
      unitsDispatched,
      eastCoastDelivered: ecDelivered,
      eastMalaysiaDelivered: emDelivered,
      handlingMinutesSft: round1(handlingSft),
      handlingMinutesPaya: round1(handlingPaya),
      handlingMinutesKuantan: round1(handlingKuantan)
    });
  }

  const totalReceived = receipts.reduce((s, r) => s + Math.max(0, Math.floor(r.unitsReceived)), 0);
  const totalEligible = days.reduce((s, d) => s + d.eligibleReceived, 0);
  const totalMoved = days.reduce((s, d) => s + d.nacToSftMoved, 0);
  const totalDepartures = loads.length;
  const totalDispatched = loads.reduce((s, l) => s + l.totalUnits, 0);
  const avgCycle = totalDepartures ? loads.reduce((s, l) => s + l.cycleMinutes, 0) / totalDepartures : 0;
  const maxCycle = totalDepartures ? Math.max(...loads.map((l) => l.cycleMinutes)) : 0;

  const manpower: SiteManpowerKpi[] = [
    {
      site: "SFT",
      teamMembers: assumptions.teams.sftLoadingTeam,
      totalHandlingMinutes: round1(sftHandlingTotal),
      totalHandlingHours: round1(sftHandlingTotal / 60),
      carsHandled: sftCarsHandled,
      effectiveMinutesPerCar: sftCarsHandled
        ? round1(assumptions.routes.sftLoadingTactMinutes / Math.max(1, assumptions.teams.sftLoadingTeam))
        : assumptions.routes.sftLoadingTactMinutes
    },
    {
      site: "Paya Besar",
      teamMembers: assumptions.teams.payaBesarTeam,
      totalHandlingMinutes: round1(payaHandlingTotal),
      totalHandlingHours: round1(payaHandlingTotal / 60),
      carsHandled: payaCarsHandled,
      effectiveMinutesPerCar: payaCarsHandled
        ? round1(assumptions.routes.normalUnloadTactMinutes / Math.max(1, assumptions.teams.payaBesarTeam))
        : assumptions.routes.normalUnloadTactMinutes
    },
    {
      site: "Kuantan Port",
      teamMembers: assumptions.teams.kuantanPortTeam,
      totalHandlingMinutes: round1(kuantanHandlingTotal),
      totalHandlingHours: round1(kuantanHandlingTotal / 60),
      carsHandled: kuantanCarsHandled,
      effectiveMinutesPerCar: kuantanCarsHandled
        ? round1(assumptions.routes.normalUnloadTactMinutes / Math.max(1, assumptions.teams.kuantanPortTeam))
        : assumptions.routes.normalUnloadTactMinutes
    }
  ];

  const kpis: SimulationKpis = {
    scenarioName: scenario.name,
    scenarioMode: scenario.mode,
    totalReceived,
    totalEligible,
    totalIneligible: ineligibleCount,
    totalMovedToSft: totalMoved,
    endingNacBacklog: countUnits(nacQueue),
    endingSftInventory: countUnits(sftQueue),
    maxSftInventory: maxSft,
    sftCongestionAlert: maxSft >= assumptions.movement.sftParkingCapacity,
    totalDepartures,
    totalUnitsDispatched: totalDispatched,
    eastCoastDelivered: loads.reduce((s, l) => s + l.eastCoastUnits, 0),
    eastMalaysiaDelivered: loads.reduce((s, l) => s + l.eastMalaysiaUnits, 0),
    averageCycleMinutes: round1(avgCycle),
    maxCycleMinutes: round1(maxCycle),
    mixedWagonPenaltyMinutes: round1(loads.reduce((s, l) => s + l.mixedWagonBlockingMinutes, 0)),
    belowProfitabilityLoads: loads.filter((l) => l.belowProfitableMinimum).length,
    overlengthCars: loads.reduce((s, l) => s + l.overlengthCars, 0),
    daysToSftFull,
    dailyNacTransferCapacity: transferCap,
    maxTrainUnits: maxTrainUnits(assumptions),
    minTrainUnits: minTrainUnits(assumptions),
    manpower
  };

  return { assumptions, scenario, days, loads, kpis };
};

export const runComparison = (
  assumptions: SimulationAssumptions,
  receipts: DailyReceipt[]
): { avOnly: SimulationOutput; avAndNav: SimulationOutput } => {
  const avOnly = runSimulation({
    assumptions,
    receipts,
    scenario: { mode: "AV_ONLY", name: "AV Only" }
  });
  const avAndNav = runSimulation({
    assumptions,
    receipts,
    scenario: { mode: "AV_AND_NAV", name: "AV + NAV" }
  });
  return { avOnly, avAndNav };
};
