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

      // Deep-safe merge: preserve defaults, override with saved values
     player = {
  ...DEFAULT_PLAYER,
  ...parsed,
  inventory: {
    ...DEFAULT_PLAYER.inventory,
    ...parsed.inventory
  },
  zones: {
    ...DEFAULT_PLAYER.zones,   // defaults (0)
    ...parsed.zones            // saved values override
  }
};

      // Safety fixes for inventory (protect against old/corrupted saves)
      const inv = player.inventory;

      if (!inv.seeds || typeof inv.seeds !== 'object') {
        console.warn("Invalid or missing seeds — resetting to {}");
        inv.seeds = {};
      }

      // Ensure all expected tool/level keys exist (boolean or number)
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
  localStorage.setItem(SAVE_KEY, JSON.stringify(player));
  console.log("Player data saved");
}

export function updatePlayer(changes) {
  // Merge top-level changes
  Object.assign(player, changes);

  // Deep merge for zones (prevent overwrite)
  if (changes.zones) {
    player.zones = {
      ...player.zones,
      ...changes.zones
    };
  }

  // Deep merge for inventory if needed (optional, but good practice)
  if (changes.inventory) {
    player.inventory = {
      ...player.inventory,
      ...changes.inventory
    };
  }

  savePlayer();
}

export function resetPlayer() {
  localStorage.removeItem(SAVE_KEY);
  player = { ...DEFAULT_PLAYER };
  savePlayer();
  console.log("Player reset to defaults");
}

// Debug helper (unchanged)
window.debugPlayer = () => {
  console.table(player);
  return player;
};