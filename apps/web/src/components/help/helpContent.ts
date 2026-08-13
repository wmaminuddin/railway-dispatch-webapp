export type HelpEntry = {
  title: string;
  meaning: string;
  impact: string;
  unit?: string;
  formula?: string;
};

export const HELP: Record<string, HelpEntry> = {
  // Inputs – opening stock
  openingNacUnits: {
    title: "NAC opening",
    meaning:
      "Eligible cars already waiting at NAC at the start of day 1 (carry-in backlog). Not treated as a new receipt.",
    impact:
      "Increases starting NAC backlog and day-1 transfer demand. Mix follows Scenario & Split; non-rail and scenario eligibility filters are not re-applied.",
    unit: "cars"
  },
  openingSftUnits: {
    title: "SFT opening",
    meaning: "Cars already parked at SFT at the start of day 1. May exceed parking capacity.",
    impact:
      "Raises day-1 SFT opening inventory and can block NAC→SFT transfers until departures free space. Mix follows Scenario & Split.",
    unit: "cars"
  },

  // Inputs – schedule / scenario
  simulationDays: {
    title: "Simulation days",
    meaning: "Number of days in the planning horizon. Day 1, Day 2, … define the receipt schedule length.",
    impact: "Longer horizons accumulate backlog, SFT occupancy, and train cycles over more days.",
    unit: "days"
  },
  importSchedule: {
    title: "Import CSV / Excel",
    meaning: "Load a day-by-day NAC receipt schedule from a file. Expected columns include day and unitsReceived.",
    impact: "Replaces manual table values and sets the daily inflow that feeds EC/EM splits and queues."
  },
  unitsFromNac: {
    title: "Units from NAC",
    meaning: "Cars received from the factory (NAC) on that day before destination and AV/NAV splits.",
    impact: "Higher receipts increase eligible rail volume, NAC backlog pressure, and SFT fill rates.",
    unit: "cars/day"
  },
  applyAllVolume: {
    title: "Apply daily volume to all days",
    meaning: "Sets the same Units from NAC value on every day in the current simulation horizon.",
    impact: "Quickly builds a flat receipt schedule before you tweak individual days or import a file.",
    unit: "cars/day"
  },
  runMode: {
    title: "Run mode",
    meaning: "Single scenario runs one delivery policy. Compare mode runs AV Only and AV+NAV side by side.",
    impact: "Compare mode highlights how including NAV vehicles changes backlog, dispatch volume, and congestion."
  },
  scenarioMode: {
    title: "Scenario",
    meaning: "AV Only dispatches Allocated Vehicles only. AV + NAV also includes Non-Allocated Vehicles for rail.",
    impact: "AV + NAV usually increases eligible volume and can fill SFT and trains faster."
  },
  eastCoastPercent: {
    title: "East Coast % of NAC",
    meaning: "Share of NAC receipts bound for East Coast (unload at Paya Besar).",
    impact: "Raises EC queue volume, EC wagon demand, and Paya Besar unloading workload.",
    unit: "%",
    formula: "EC rail units ≈ NAC units × (EC% + EM%) × (EC% / (EC% + EM%))"
  },
  eastMalaysiaPercent: {
    title: "East Malaysia % of NAC",
    meaning: "Share of NAC receipts bound for East Malaysia (unload at Kuantan Port).",
    impact: "Raises EM queue volume, EM wagon demand, and Kuantan unloading / longer cycle legs.",
    unit: "%"
  },
  eastCoastAvPercent: {
    title: "East Coast AV %",
    meaning: "Of East Coast rail-bound cars, share that are Allocated Vehicles (AV). Remainder is NAV.",
    impact: "In AV Only, higher AV% increases eligible EC cars. NAV becomes eligible only in AV+NAV.",
    unit: "%"
  },
  eastMalaysiaAvPercent: {
    title: "East Malaysia AV %",
    meaning: "Of East Malaysia rail-bound cars, share that are Allocated Vehicles (AV). Remainder is NAV.",
    impact: "In AV Only, higher AV% increases eligible EM cars. NAV becomes eligible only in AV+NAV.",
    unit: "%"
  },

  // Inputs – NAC to SFT
  nacToSftTact: {
    title: "Tact minutes / car (NAC→SFT)",
    meaning: "Minutes required to drive one eligible car from NAC to SFT using one driver/lane.",
    impact: "Lower tact raises daily transfer capacity and reduces NAC backlog growth.",
    unit: "minutes/car",
    formula: "Daily capacity = operating minutes × drivers ÷ tact"
  },
  nacOperatingHours: {
    title: "Operating hours / day (NAC→SFT)",
    meaning: "Hours each day available to move cars from NAC to SFT.",
    impact: "More hours increase daily transfer capacity and can clear backlog faster.",
    unit: "hours/day"
  },
  nacDriversLanes: {
    title: "Drivers / lanes",
    meaning: "Number of parallel drivers or movement lanes moving cars NAC→SFT.",
    impact: "Scales daily transfer capacity linearly under the model assumptions.",
    unit: "pax / lanes"
  },
  sftParkingCapacity: {
    title: "SFT parking capacity",
    meaning: "Maximum cars that can wait at Serendah Freight Terminal.",
    impact: "When full, additional NAC→SFT moves are blocked and cars remain in NAC backlog.",
    unit: "cars"
  },

  // Inputs – wagons / trains
  carsPerWagon: {
    title: "Cars / wagon",
    meaning: "How many cars fit in one wagon (typically 8–10).",
    impact: "Higher capacity needs fewer wagons for the same load and shortens consist length.",
    unit: "cars/wagon"
  },
  minWagonsProfit: {
    title: "Min wagons (profitability)",
    meaning: "Preferred minimum wagons for a profitable train. Mandatory first daily load may still go under this.",
    impact: "Optional/second loads require enough cars for this minimum. Under-min loads are flagged.",
    unit: "wagons"
  },
  maxWagonsTrain: {
    title: "Max wagons / train",
    meaning: "Hard upper limit on wagons (and therefore cars) on one train departures.",
    impact: "Caps train size, consist length, and daily rail throughput per trainset.",
    unit: "wagons"
  },
  allowMixedWagons: {
    title: "Allow mixed-destination wagons",
    meaning: "If Yes, an undersized EC residue and EM residue may share one wagon. Prefer No.",
    impact: "Mixed wagons block EM onward movement while EC cars unload at Paya Besar, adding cycle time."
  },
  trainsetsAvailable: {
    title: "Trainsets available",
    meaning: "How many independent train consists can operate.",
    impact: "More trainsets enable overlapping cycles and more departures while others are still in transit.",
    unit: "trainsets"
  },
  trainOperatingHours: {
    title: "Train operating hours / day",
    meaning: "Daily time window used to decide whether a departure (especially second loads) can finish.",
    impact: "Shorter windows limit same-day reuse of a trainset after a full round trip.",
    unit: "hours/day"
  },
  loadMode: {
    title: "Load mode",
    meaning: "Mixed destinations can share a train (pure wagons preferred). Single destination trains only one destination.",
    impact: "Single-destination loads can leave the other destination queued at SFT longer."
  },
  allocationStrategy: {
    title: "Allocation strategy",
    meaning: "FIFO takes earliest eligible cars first. Manual EC wagon ratio reserves whole wagons by destination share.",
    impact: "Changes EC/EM wagon mix, delivery balance, and which inventory leaves SFT first."
  },
  manualEcWagonRatio: {
    title: "EC wagon ratio",
    meaning: "Fraction of max wagons targeted for East Coast when manual allocation is used (EM gets the rest).",
    impact: "Higher ratio prioritizes EC wagons; insufficient EC inventory may underfill that side.",
    unit: "0–1 share"
  },

  // Inputs – route / tact / manpower
  sftToPayaHours: {
    title: "SFT → Paya Besar hours",
    meaning: "Rail travel time from SFT to Paya Besar Hub (excludes shunting).",
    impact: "Increases every outbound cycle and the matching return leg from Paya to SFT.",
    unit: "hours"
  },
  payaToKuantanHours: {
    title: "Paya Besar → Kuantan hours",
    meaning: "Rail travel time from Paya Besar to Kuantan Port (excludes shunting).",
    impact: "Extends EM/mixed load cycles and return travel via Paya Besar.",
    unit: "hours"
  },
  payaShunting: {
    title: "Paya Besar shunting minutes",
    meaning: "Fixed shunting time at Paya Besar for wagon detach/positioning before unload.",
    impact: "Adds to stop dwell and delays both EC unload start and EM onward departure.",
    unit: "minutes"
  },
  kuantanShunting: {
    title: "Kuantan shunting minutes",
    meaning: "Fixed shunting time at Kuantan Port before EM unloading.",
    impact: "Adds dwell at Kuantan and lengthens EM trainset turnover.",
    unit: "minutes"
  },
  stationLength: {
    title: "Station length",
    meaning: "Usable platform/station length for unloading (default ~500 m).",
    impact: "Wagons starting beyond this length are overlength and incur extra unload tact.",
    unit: "meters"
  },
  sftLoadingTact: {
    title: "SFT loading tact min/car",
    meaning: "Base minutes to load one car onto a wagon at SFT with one worker.",
    impact: "Loading duration = cars × tact ÷ SFT manpower. Affects departure readiness.",
    unit: "minutes/car"
  },
  unloadTact: {
    title: "Unload tact min/car",
    meaning: "Base minutes to unload one car at destination when the wagon is within station length.",
    impact: "Combined with manpower and overlength extra, sets destination dwell and cycle time.",
    unit: "minutes/car"
  },
  overlengthExtra: {
    title: "Overlength extra min/car",
    meaning: "Additional unload minutes for cars in wagons that start beyond station length (shunting/reposition).",
    impact: "Longer consists face higher unload time and longer trainset turns.",
    unit: "minutes/car"
  },
  sftManpower: {
    title: "SFT loading manpower (pax)",
    meaning: "People available for SFT loading. Work is modeled as linear parallel capacity.",
    impact: "More pax reduce SFT loading duration and can shorten cycle times.",
    unit: "pax",
    formula: "Duration = cars × loading tact ÷ pax"
  },
  payaManpower: {
    title: "Paya Besar unloading manpower (pax)",
    meaning: "People available for EC unloading at Paya Besar.",
    impact: "More pax reduce Paya unload time, pickup wait risk, and mixed-wagon blocking duration.",
    unit: "pax"
  },
  kuantanManpower: {
    title: "Kuantan Port unloading manpower (pax)",
    meaning: "People available for EM unloading at Kuantan Port.",
    impact: "More pax reduce Kuantan dwell and improve trainset return readiness.",
    unit: "pax"
  },

  // Derived
  derivedTransfer: {
    title: "NAC→SFT capacity",
    meaning: "Theoretical cars that can move NAC→SFT in one day with current tact, hours, and drivers.",
    impact: "If capacity < eligible receipts + backlog, NAC inventory grows.",
    unit: "cars/day"
  },
  derivedMinLoad: {
    title: "Min profitable load",
    meaning: "Cars needed to fill the minimum profitable wagon count.",
    impact: "Optional loads wait until inventory reaches this threshold (first load may be smaller).",
    unit: "cars"
  },
  derivedMaxLoad: {
    title: "Max train load",
    meaning: "Cars that fit on max wagons × cars per wagon.",
    impact: "Caps units dispatched per departure.",
    unit: "cars"
  },
  derivedConsist: {
    title: "Max consist length",
    meaning: "Max wagons × wagon length (26 m). Excludes locomotive.",
    impact: "Compared with station length to predict overlength unloading.",
    unit: "meters"
  },
  derivedSftRate: {
    title: "SFT loading rate",
    meaning: "Approximate cars loaded per hour with current tact and SFT manpower.",
    impact: "Higher rate shortens loading phase before departure.",
    unit: "cars/hour"
  },

  // KPIs
  kpiReceived: {
    title: "Received",
    meaning: "Total cars entering NAC over the horizon.",
    impact: "Base volume for all downstream splits and queues.",
    unit: "cars"
  },
  kpiEligible: {
    title: "Eligible",
    meaning: "Cars that pass destination + AV/NAV filters for the selected scenario.",
    impact: "Only eligible cars enter NAC queue, SFT, and trains.",
    unit: "cars"
  },
  kpiMovedSft: {
    title: "Moved to SFT",
    meaning: "Eligible cars successfully transferred NAC→SFT during the run.",
    impact: "Gap vs eligible shows backlog pressure or transfer capacity limits.",
    unit: "cars"
  },
  kpiDispatched: {
    title: "Dispatched",
    meaning: "Cars placed on departing trains (and treated as delivered in this model after unload).",
    impact: "Primary rail throughput KPI.",
    unit: "cars"
  },
  kpiDepartures: {
    title: "Departures",
    meaning: "Number of train loads departed during the simulation.",
    impact: "Reflects trainset availability, inventory, and operating window.",
    unit: "trains"
  },
  kpiEcDelivered: {
    title: "EC delivered",
    meaning: "East Coast cars unloaded at Paya Besar.",
    impact: "Tracks EC throughput and Paya workload.",
    unit: "cars"
  },
  kpiEmDelivered: {
    title: "EM delivered",
    meaning: "East Malaysia cars unloaded at Kuantan Port.",
    impact: "Tracks EM throughput and longer-route workload.",
    unit: "cars"
  },
  kpiMaxSft: {
    title: "Max SFT",
    meaning: "Peak SFT inventory during the run, including stock right after NAC→SFT transfer before departures.",
    impact: "Compared to parking capacity for congestion risk. Can be higher than end-of-day SFT.",
    unit: "cars"
  },
  kpiSftCongestion: {
    title: "SFT congestion",
    meaning: "YES if peak SFT inventory reaches/exceeds parking capacity.",
    impact: "Signals need for more rail capacity, fewer receipts, or higher NAC→SFT control."
  },
  kpiDaysSftFull: {
    title: "Days to SFT full",
    meaning: "First day SFT closing inventory hits capacity (if ever).",
    impact: "Early fullness means inflow exceeds rail outflow.",
    unit: "day number"
  },
  kpiAvgCycle: {
    title: "Avg cycle",
    meaning: "Average trainset round-trip minutes from start of loading to return to SFT.",
    impact: "Longer cycles reduce same-day reuse and second-load feasibility.",
    unit: "minutes"
  },
  kpiMaxCycle: {
    title: "Max cycle",
    meaning: "Longest observed trainset round-trip in the run.",
    impact: "Highlights worst-case dwell from travel, blocked unload, or staffing.",
    unit: "minutes"
  },
  kpiBelowProfit: {
    title: "Below-profit loads",
    meaning: "Departures under the minimum profitable wagon count (often the mandatory first load).",
    impact: "Shows how often commercial minimum could not be met.",
    unit: "loads"
  },
  kpiOverlengthCars: {
    title: "Overlength cars",
    meaning: "Cars in wagons whose start position is beyond station length.",
    impact: "Each such car pays base unload tact + overlength extra.",
    unit: "cars"
  },
  kpiMixedPenalty: {
    title: "Mixed-wagon penalty",
    meaning: "Extra blocking minutes while EC cars unload from mixed wagons before EM can continue.",
    impact: "Directly lengthens cycles; prefers destination-pure wagons.",
    unit: "minutes"
  },
  kpiEndingNac: {
    title: "Ending NAC backlog",
    meaning: "Eligible cars still waiting at NAC at horizon end.",
    impact: "Residual demand not yet moved to SFT.",
    unit: "cars"
  },
  kpiEndingSft: {
    title: "Ending SFT",
    meaning: "Cars still waiting at SFT at horizon end.",
    impact: "Inventory not yet formed into departing trains.",
    unit: "cars"
  },
  manpowerTeam: {
    title: "Team (pax)",
    meaning: "Configured people at that site.",
    impact: "Used to linearly shorten loading/unload durations.",
    unit: "pax"
  },
  manpowerHours: {
    title: "Handling hours",
    meaning: "Total site labor time summed across the simulation.",
    impact: "Highest hours often indicate the manpower bottleneck.",
    unit: "hours"
  },
  manpowerCars: {
    title: "Cars handled",
    meaning: "Cars processed by that site (SFT loads all; Paya EC; Kuantan EM).",
    impact: "Explains whether high hours are due to volume or slow rate.",
    unit: "cars"
  },
  manpowerEff: {
    title: "Eff. min/car",
    meaning: "Base tact ÷ site pax. Defaults can equal 1 by coincidence (e.g. 4÷4).",
    impact: "Changes when you change tact or manpower; lower means faster base handling.",
    unit: "minutes/car",
    formula: "tact ÷ pax"
  },

  // Tables
  colDay: {
    title: "Day",
    meaning: "Simulation day number.",
    impact: "Aligns receipts, inventories, and departures on the timeline."
  },
  colNacIn: {
    title: "NAC in",
    meaning: "Cars received from NAC that day.",
    impact: "Daily inflow before splits.",
    unit: "cars"
  },
  colEligible: {
    title: "Eligible",
    meaning: "Cars becoming rail-eligible that day under the scenario filter.",
    impact: "Feeds NAC queue.",
    unit: "cars"
  },
  colToSft: {
    title: "To SFT",
    meaning: "Cars moved NAC→SFT that day.",
    impact: "Limited by transfer capacity and free SFT parking.",
    unit: "cars"
  },
  colNacBacklog: {
    title: "NAC backlog",
    meaning: "Eligible cars still at NAC at day end.",
    impact: "Rising backlog means transfer or SFT space is constraining flow.",
    unit: "cars"
  },
  colSftEnd: {
    title: "SFT end",
    meaning: "SFT inventory after the day's transfers and departures.",
    impact: "Tracks yard occupancy trend at day close.",
    unit: "cars"
  },
  colSftPeak: {
    title: "SFT peak",
    meaning: "SFT inventory after NAC→SFT transfers and before train departures that day.",
    impact: "This is when parking capacity blocks further transfers. End-of-day SFT can be lower.",
    unit: "cars"
  },
  colSftPct: {
    title: "SFT %",
    meaning: "Peak SFT that day (after transfer) ÷ parking capacity.",
    impact: "Near 100% signals congestion / blocked NAC→SFT transfers.",
    unit: "%"
  },
  colDeps: {
    title: "Deps",
    meaning: "Train departures on that day.",
    impact: "Shows whether inventory converted to rail moves.",
    unit: "trains"
  },
  colDispatch: {
    title: "Dispatch",
    meaning: "Cars dispatched on trains that day.",
    impact: "Daily rail output.",
    unit: "cars"
  },
  colEc: {
    title: "EC",
    meaning: "East Coast cars delivered that day (or in a load).",
    impact: "Paya Besar unload volume.",
    unit: "cars"
  },
  colEm: {
    title: "EM",
    meaning: "East Malaysia cars delivered that day (or in a load).",
    impact: "Kuantan unload volume.",
    unit: "cars"
  },
  colLoad: {
    title: "Load",
    meaning: "Train load identifier (e.g. L1).",
    impact: "Select a load to inspect wagons and cycle events."
  },
  colTrainset: {
    title: "Trainset",
    meaning: "Which available trainset performed this load.",
    impact: "A trainset stays busy until its full return cycle ends."
  },
  colWagons: {
    title: "Wagons",
    meaning: "Number of wagons on this consist.",
    impact: "Determines consist length and capacity used."
  },
  colUnits: {
    title: "Units",
    meaning: "Total cars on the load.",
    impact: "Train utilization for this departure."
  },
  colEcEm: {
    title: "EC/EM",
    meaning: "Split of cars by destination on the load.",
    impact: "Drives pure vs mixed wagon patterns and stop sequence."
  },
  colCycleMin: {
    title: "Cycle min",
    meaning: "Round-trip minutes for this load.",
    impact: "Controls when that trainset can accept another load."
  },
  colMixed: {
    title: "Mixed?",
    meaning: "Whether any wagon carries both EC and EM cars.",
    impact: "YES adds Paya blocking time before EM continues."
  },
  colBlockMin: {
    title: "Block min",
    meaning: "Extra minutes the onward consist waits for mixed-wagon EC unloading at Paya.",
    impact: "Direct cycle penalty for mixed wagons."
  },
  colBelowMin: {
    title: "Below min?",
    meaning: "Whether wagon count is under the profitable minimum.",
    impact: "Flags commercial underfills (often mandatory first loads)."
  },
  colPurity: {
    title: "Purity",
    meaning: "Wagon destination contents: EC, EM, MIXED, or EMPTY.",
    impact: "Pure EC wagons can detach/unload while EM continues; MIXED cannot."
  },
  colMeters: {
    title: "Meters",
    meaning: "Wagon position range along the consist from the leading end.",
    impact: "Positions starting at/after station length are overlength."
  },
  colEvent: {
    title: "Event",
    meaning: "Named cycle step (loading, travel, shunt, unload, wait, pickup, return).",
    impact: "Reconstructs how cycle time is spent."
  },
  colStart: {
    title: "Start",
    meaning: "Absolute simulation minute when the event begins.",
    impact: "Used to measure durations and overlaps."
  },
  colEnd: {
    title: "End",
    meaning: "Absolute simulation minute when the event finishes.",
    impact: "Duration = End − Start."
  },
  colDescription: {
    title: "Description",
    meaning: "Human-readable explanation of the event.",
    impact: "Clarifies counts, destinations, and waits."
  },

  // Charts / visuals
  chartInventory: {
    title: "Inventory Flow chart",
    meaning:
      "Daily NAC backlog, SFT stock after NAC→SFT transfer (before departures), and end-of-day SFT after trains leave, with a parking capacity reference line.",
    impact:
      "Capacity blocks happen at transfer time. End-of-day SFT can look lower after departures even when the yard hit capacity mid-day."
  },
  chartHourlyInventory: {
    title: "Hourly Site Inventory chart",
    meaning:
      "Full-horizon hourly max of NAC and SFT stock, plus cars on site at Paya Besar and Kuantan Port during shunt/unload/wait windows. NAC→SFT transfer is a day-start step, not paced by hour.",
    impact:
      "Shows when destination handling overlaps and how yard stock moves within operating hours—not just end-of-day totals."
  },
  resultsNarrative: {
    title: "Results Narrative",
    meaning:
      "Rule-based summary of this simulation run: throughput funnel, yard/backlog constraints, train economics, and manpower bottlenecks.",
    impact:
      "Helps interpret why KPIs look the way they do and which assumptions to adjust next — without an AI service."
  },
  chartDelivery: {
    title: "Daily Deliveries chart",
    meaning: "Stacked EC/EM delivered cars plus departures overlay.",
    impact: "Shows destination throughput and how often trains left."
  },
  chartCompare: {
    title: "AV Only vs AV + NAV chart",
    meaning: "Side-by-side KPI comparison for both delivery policies.",
    impact: "Use Inspect buttons to switch the detailed dashboard scenario."
  },
  chartManpower: {
    title: "Manpower Planning chart",
    meaning: "Handling hours, cars handled, and effective minutes/car by site.",
    impact: "Bottleneck = highest handling hours; staffing changes affect Eff. min/car and cycle."
  },
  chartConsist: {
    title: "Train Consist diagram",
    meaning: "Wagon-by-wagon map colored by EC/EM/mixed, with station-length marker and overlength flags.",
    impact: "Visualizes detachable EC groups, mixed risks, and overlength unload exposure."
  },
  chartTimeline: {
    title: "Cycle Timeline",
    meaning: "Gantt of load events. Parallel Paya unload can overlap EM travel; mixed unload blocks onward move.",
    impact: "Explains average/max cycle and waiting for EC wagon pickup."
  },
  selectedLoad: {
    title: "Selected load",
    meaning: "Which train load drives the consist diagram and cycle timeline.",
    impact: "Changing selection updates wagon and event visuals without re-running."
  }
};

export type HelpKey = keyof typeof HELP;

export const getHelp = (key: string): HelpEntry | null => HELP[key] ?? null;

export const helpKeys = Object.keys(HELP);
