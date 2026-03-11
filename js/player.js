// player.js
const SAVE_KEY = "guerrillaGardeningSave-v1";

const DEFAULT_PLAYER = {
  coins: 50,
  energy: 100,
  maxEnergy: 100,
  inventory: {
    seeds: {},
    soilClumps: 0,
    fertilizer: 0,
    clayBalls: 0,
    wateringCanLevel: 1,
    shovelLevel: 1,
    spade: true,
    sickle: true,
    scissors: true,
    toolboxLevel: 1
  },
  zoneHealth: {
    beach: 0,
    forest: 0,
    mountain: 0
  },
  planted: {},          // ← add this line + comma on previous line if missing
  lastPlayed: null,
  sessionActions: 0
};
  
  // in DEFAULT_PLAYER
planted: {},  // e.g. { "beach": [ {...}, {...} ], "forest": [...], ... }

// example plant object
{
  id: "unique-plant-id",           // or just incremental counter
  entityId: "baby-palm",
  rarity: "uncommon",
  plantedAt: 1741704000000,        // ms timestamp
  lastChecked: 1741707600000,      // ms
  progress: 0.42,                  // 0–1 overall (or per-stage if multi-stage)
  currentStage: 1,                 // optional if using discrete stages
  maturationMs: 43200000           // 12 hours in ms, adjusted by rarity/zone
}
  
};

export function loadPlayer() {
  const saved = localStorage.getItem(SAVE_KEY);
  let loadedPlayer = { ...DEFAULT_PLAYER };

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      loadedPlayer = {
        ...DEFAULT_PLAYER,
        ...parsed,
        inventory: {
          ...DEFAULT_PLAYER.inventory,
          ...parsed.inventory
        },
        zones: {
          ...parsed.zones,
          ...DEFAULT_PLAYER.zones
        }
      };
	  // After the inventory deep merge block
		if (!loadedPlayer.planted || typeof loadedPlayer.planted !== 'object') {
			loadedPlayer.planted = {};
		}

      console.log("Loaded zones from save:", loadedPlayer.zones);

      const inv = loadedPlayer.inventory;
      if (!inv.seeds || typeof inv.seeds !== 'object') {
        console.warn("Invalid seeds — resetting");
        inv.seeds = {};
      }

      if (typeof inv.spade !== 'boolean') inv.spade = DEFAULT_PLAYER.inventory.spade;
      if (typeof inv.sickle !== 'boolean') inv.sickle = DEFAULT_PLAYER.inventory.sickle;
      if (typeof inv.scissors !== 'boolean') inv.scissors = DEFAULT_PLAYER.inventory.scissors;
      if (typeof inv.wateringCanLevel !== 'number') inv.wateringCanLevel = DEFAULT_PLAYER.inventory.wateringCanLevel;
      if (typeof inv.shovelLevel !== 'number') inv.shovelLevel = DEFAULT_PLAYER.inventory.shovelLevel;
      if (typeof inv.toolboxLevel !== 'number') inv.toolboxLevel = DEFAULT_PLAYER.inventory.toolboxLevel;

      console.log("Player data loaded successfully");
    } catch (err) {
      console.warn("Corrupted save — starting fresh", err);
      savePlayer(loadedPlayer);
    }
  } else {
    console.log("No save found — using defaults");
    savePlayer(loadedPlayer);
  }

  return loadedPlayer;
}

export function savePlayer(currentPlayer) {
  if (!currentPlayer) {
    console.error("savePlayer: currentPlayer is undefined");
    return;
  }
  currentPlayer.lastPlayed = new Date().toISOString();
  console.log("Saving zones:", currentPlayer.zones);
  localStorage.setItem(SAVE_KEY, JSON.stringify(currentPlayer));
  console.log("Player data saved");
}

export function updatePlayer(currentPlayer, changes) {
  if (!currentPlayer) return;

  // Deep merge zoneHealth FIRST (if present in changes)
  if (changes.zoneHealth && typeof changes.zoneHealth === 'object') {
    currentPlayer.zoneHealth = {
      ...currentPlayer.zoneHealth,
      ...changes.zoneHealth
    };
    console.log("[UPDATE] zoneHealth after merge:", JSON.stringify(currentPlayer.zoneHealth));
  }

  // Deep merge inventory (if any)
  if (changes.inventory && typeof changes.inventory === 'object') {
    currentPlayer.inventory = {
      ...currentPlayer.inventory,
      ...changes.inventory
    };
  }

  // Shallow assign everything else LAST
  Object.assign(currentPlayer, changes);

  savePlayer(currentPlayer);
}

export function resetPlayer() {
  localStorage.removeItem(SAVE_KEY);
  const newPlayer = { ...DEFAULT_PLAYER };
  savePlayer(newPlayer);
  console.log("Player reset to defaults");
  return newPlayer;
}

window.debugPlayer = () => {
  console.table(currentPlayer);
  return currentPlayer;
};