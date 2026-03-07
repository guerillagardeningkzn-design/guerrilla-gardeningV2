// js/player.js
const SAVE_KEY = "guerrillaGardeningSave-v1";

let player = {
  coins: 50,
  energy: 100,
  maxEnergy: 100,
  inventory: {
    seeds: 15,
    wateringCanLevel: 1,
    shovelLevel: 1
	spade: true
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
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      player = { ...player, ...parsed };
      console.log("Player data loaded");
    } catch (err) {
      console.warn("Corrupted save — starting fresh", err);
      savePlayer();
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
    inventory: { seeds: 15, wateringCanLevel: 1, shovelLevel: 1 },
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