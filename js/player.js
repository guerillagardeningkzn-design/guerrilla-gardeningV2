// js/player.js
// ────────────────────────────────────────────────
// Player state & localStorage persistence
// ────────────────────────────────────────────────

const SAVE_KEY = "guerrillaGardeningSave-v1";  // change version number to force reset during dev

// Default / initial player state
let player = {
  coins: 50,                    // starting currency
  energy: 100,                  // optional soft limit (can refill over time or via ads)
  maxEnergy: 100,
  inventory: {
    seeds: 15,                  // basic native seeds
    wateringCanLevel: 1,        // 1–5
    shovelLevel: 1              // 1–5
  },
  zones: {                        // progress per zone (0–100%)
    // Example zones — add more as you create them
    "beach": 0,
    "forest": 0,
    "mountain": 0
  },
  lastPlayed: null,
  sessionActions: 0               // optional: track actions this session
};

// ─── Load from localStorage ────────────────────────
export function loadPlayer() {
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Merge saved data with defaults (in case new fields were added)
      player = { ...player, ...parsed };
      console.log("Player data loaded from localStorage");
    } catch (err) {
      console.warn("Corrupted save data — starting fresh", err);
      savePlayer(); // overwrite with defaults
    }
  } else {
    console.log("No saved data found — using defaults");
    savePlayer();
  }
  return player;
}

// ─── Save to localStorage ──────────────────────────
export function savePlayer() {
  player.lastPlayed = new Date().toISOString();
  localStorage.setItem(SAVE_KEY, JSON.stringify(player));
  console.log("Player data saved");
}

// ─── Utility: update and save (use this after changes) ───
export function updatePlayer(changes) {
  Object.assign(player, changes);
  savePlayer();
  // Optional: trigger UI refresh if needed
  // updateUI(); // you'll add this later
}

// ─── Reset everything (for testing / new game) ─────
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
  console.log("Player data reset to defaults");
}

// For debugging in console
window.debugPlayer = () => {
  console.table(player);
  return player;
};