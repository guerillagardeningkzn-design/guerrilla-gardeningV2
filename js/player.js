// player.js
const SAVE_KEY = "guerrillaGardeningSave-v1";

// Single source of truth for default player state
const DEFAULT_PLAYER = {
  coins: 50,
  energy: 100,
  maxEnergy: 100,
  inventory: {
    seeds: {},                  // object of arrays for per-seed DNA instances
    soilClumps: 0,
    fertilizer: 0,
    clayBalls: 0,
    wateringCanLevel: 1,
    shovelLevel: 1,
    spade: true,                // owned by default
    sickle: true,               // owned by default (for palm harvest)
    scissors: true,             // example
    toolboxLevel: 1             // 1 = basic, etc.
  },
  zones: {
    beach: 0,
    forest: 0,
    mountain: 0
  },
  lastPlayed: null,
  sessionActions: 0
};

let player = { ...DEFAULT_PLAYER }; // global reference

export function loadPlayer() {
  const saved = localStorage.getItem(SAVE_KEY);

  if (saved) {
    try {
      const parsed = JSON.parse(saved);

      // Deep-safe merge: start with full defaults, override with saved values
      player = {
        ...DEFAULT_PLAYER,
        ...parsed,
        inventory: {
          ...DEFAULT_PLAYER.inventory,   // full defaults first
          ...parsed.inventory            // saved overrides
        },
        zones: {
          ...DEFAULT_PLAYER.zones,       // defaults (0)
          ...parsed.zones                // saved progress overrides
        }
      };

      console.log("Loaded zones from save:", player.zones);

      // Safety fixes for inventory (protect against old/corrupted saves)
      const inv = player.inventory;

      // Force seeds to be object
      if (!inv.seeds || typeof inv.seeds !== 'object' || Array.isArray(inv.seeds)) {
        console.warn("Invalid seeds data — resetting to empty object");
        inv.seeds = {};
      }

      // Restore missing/ invalid tool booleans and numbers
      if (typeof inv.spade !== 'boolean') inv.spade = DEFAULT_PLAYER.inventory.spade;
      if (typeof inv.sickle !== 'boolean') inv.sickle = DEFAULT_PLAYER.inventory.sickle;
      if (typeof inv.scissors !== 'boolean') inv.scissors = DEFAULT_PLAYER.inventory.scissors;
      if (typeof inv.wateringCanLevel !== 'number') inv.wateringCanLevel = DEFAULT_PLAYER.inventory.wateringCanLevel;
      if (typeof inv.shovelLevel !== 'number') inv.shovelLevel = DEFAULT_PLAYER.inventory.shovelLevel;
      if (typeof inv.toolboxLevel !== 'number') inv.toolboxLevel = DEFAULT_PLAYER.inventory.toolboxLevel;

      console.log("Player data loaded successfully");
    } catch (err) {
      console.warn("Corrupted save data — starting fresh", err);
      player = { ...DEFAULT_PLAYER };
      savePlayer(); // overwrite bad save
    }
  } else {
    console.log("No save found — using defaults");
    player = { ...DEFAULT_PLAYER };
    savePlayer();
  }

  return player;
}

export function savePlayer() {
  player.lastPlayed = new Date().toISOString();
  console.log("Saving zones:", player.zones);
  localStorage.setItem(SAVE_KEY, JSON.stringify(player));
  console.log("Player data saved");
}

export function updatePlayer(changes) {
  // Deep merge zones (critical for progress persistence)
  if (changes.zones && typeof changes.zones === 'object') {
    player.zones = {
      ...player.zones,
      ...changes.zones
    };
    console.log("Zones updated in memory:", player.zones);
  }

  // Deep merge inventory
  if (changes.inventory && typeof changes.inventory === 'object') {
    player.inventory = {
      ...player.inventory,
      ...changes.inventory
    };
  }

  // Shallow assign everything else
  Object.assign(player, changes);

  savePlayer();
}

export function resetPlayer() {
  localStorage.removeItem(SAVE_KEY);
  player = { ...DEFAULT_PLAYER };
  savePlayer();
  console.log("Player reset to defaults");
}

// Debug helper
window.debugPlayer = () => {
  console.table(player);
  return player;
};