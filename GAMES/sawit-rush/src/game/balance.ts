export type GameMode = "story" | "endless" | "daily";

export type UpgradeKey =
  | "workerSpeed"
  | "truckCapacity"
  | "truckSpeed"
  | "factorySpeed"
  | "storage"
  | "repairTeam";

export const MODE_LABELS: Record<GameMode, string> = {
  story: "Story Mode",
  endless: "Endless Rush",
  daily: "Daily Challenge"
};

export const UPGRADES: Record<
  UpgradeKey,
  { label: string; baseCost: number; max: number; description: string }
> = {
  workerSpeed: {
    label: "Tools",
    baseCost: 70,
    max: 6,
    description: "Harvest faster"
  },
  truckCapacity: {
    label: "Bigger Trucks",
    baseCost: 90,
    max: 5,
    description: "Carry more TBS"
  },
  truckSpeed: {
    label: "Road Crew",
    baseCost: 85,
    max: 6,
    description: "Move faster"
  },
  factorySpeed: {
    label: "Machines",
    baseCost: 95,
    max: 6,
    description: "Process faster"
  },
  storage: {
    label: "Warehouse",
    baseCost: 80,
    max: 5,
    description: "More buffer"
  },
  repairTeam: {
    label: "Repair Team",
    baseCost: 120,
    max: 4,
    description: "Shorter disasters"
  }
};

export const TREE_POSITIONS = [
  { x: 112, y: 160 },
  { x: 214, y: 116 },
  { x: 322, y: 174 },
  { x: 132, y: 294 },
  { x: 256, y: 286 },
  { x: 370, y: 332 }
];

export const CHAOS_EVENTS = [
  "Heavy rain slows trucks",
  "Broken bridge blocks route",
  "Truck tire explosion",
  "Worker strike slows harvest",
  "Machine overheating",
  "Wild monkeys steal fruit",
  "Flooded plantation roads",
  "Fuel shortage",
  "Factory power outage",
  "Road traffic jam",
  "Export demand spike"
] as const;

export type ChaosName = (typeof CHAOS_EVENTS)[number];
