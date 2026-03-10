// js/player.js
const SAVE_KEY = "guerrillaGardeningSave-v1";

let player = {
  coins: 50,
  energy: 100,
  maxEnergy: 100,
    inventory: {
	seeds: {},
	wateringCanLevel: 1,
	shovelLevel: 1,
	spade: true,
	sickle: true,
	scissors: true,  // example tool – false = not owned
	toolboxLevel: 1,  // 1 = basic (🛠️), 2 = advanced (🛠️+), 3 = master (🛠️++)
	soilClumps: 0,    // from drops
	fertilizer: 0,    // example item
	clayBalls: 0      // for new patches
	},
  zones: {
    "beach": 0,
    "forest": 0,
    "mountain": 0
  },
  lastPlayed: null,
  sessionActions: 0
};

export function loadPlayer() {
  const saved = localStorage.getItem(SAVE_KEY);
  let player = {
    coins: 0,
    zones: {},
    inventory: {
      seeds: {},           // default new structure
      soilClumps: 0,
      fertilizer: 0,
      clayBalls: 0,
      // spade: false,
      // scissors: false,
      // sickle: false,
      // toolboxLevel: 1,
      // etc.
    }
  };

  if (saved) {
    try {
      const parsed = JSON.parse(saved);

      // Merge saved data over defaults (safe deep merge for objects)
      player = {
        ...player,
        ...parsed,
        inventory: {
          ...player.inventory,              // keep defaults
          ...parsed.inventory               // override with saved
        },
        zones: {
          ...player.zones,
          ...parsed.zones
        }
      };

      console.log("Player data loaded");

      // Safety fix: ensure seeds is always an object (handles old saves or corruption)
      if (!player.inventory.seeds || typeof player.inventory.seeds !== 'object') {
        console.warn("Invalid or missing seeds object — resetting to empty");
        player.inventory.seeds = {};
      }
    } catch (err) {
      console.warn("Corrupted save — starting fresh", err);
      savePlayer(); // overwrite bad save with defaults
    }
  } else {
    console.log("No save found — using defaults");
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
  Object.assign(player, changes);
  savePlayer();
}

export function resetPlayer() {
  localStorage.removeItem(SAVE_KEY);
  player = {
    coins: 50,
    energy: 100,
    maxEnergy: 100,
    inventory: { 
	seeds: {},
	wateringCanLevel: 1, 
	shovelLevel: 1,
	spade: true,
	scissors: false,
	toolboxLevel: 1,
	soilClumps: 0,
	fertilizer: 0,
	clayBalls: 0
	},
    zones: { "beach": 0, "forest": 0, "mountain": 0 },
    lastPlayed: null,
    sessionActions: 0
  };
  savePlayer();
  console.log("Player reset to defaults");
}

// Debug helper
window.debugPlayer = () => {
  console.table(player);
  return player;
};