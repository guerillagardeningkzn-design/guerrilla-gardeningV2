import { loadPlayer, updatePlayer, savePlayer } from './player.js';
import { zones } from '../data/zones.js';

console.log("Guerrilla Gardening - overworld map with markers + golden UI");

// ───────────────────────────────────────────────────────────
// New: Centralized way to load external entity definitions
// ───────────────────────────────────────────────────────────

const entityCache = new Map();

async function loadEntityDefinition(entityId) {
  if (entityCache.has(entityId)) {
    return entityCache.get(entityId);
  }

  try {
    const response = await fetch(`data/entities/invasives/${entityId}.json`);
    if (!response.ok) throw new Error(`Entity ${entityId} not found`);
    const data = await response.json();
    entityCache.set(entityId, data);
    return data;
  } catch (err) {
    console.error("Failed to load entity:", entityId, err);
    return null;
  }
}

// ─── Global state ────────────────────────────────────────────────────────────────
let currentPlayer;
let currentView = "island";

// ─── Data ────────────────────────────────────────────────────────────────────────
// Old inline style still works
const invasivesByZone = {
  beach: [
    { id: "seaweed1", name: "Invasive Seaweed", coins: 3, health: 5 },
    { id: "seaweed2", name: "More Seaweed", coins: 4, health: 6 },

    // ── New: external JSON entity ───────────────────────────────────────────
    {
      id: "alien-crabgrass",
      name: "Alien Crabgrass",           // fallback display name
      coins: 5,                          // fallback reward
      health: 8,                         // fallback health contribution
      isExternal: true                   // flag → load full JSON definition
    }
    // { id: "crabgrass", name: "Alien Crabgrass", coins: 5, health: 8 }  ← old version you can remove or keep
  ],

  forest: [
    { id: "vine1", name: "Choking Vine", coins: 6, health: 7 },
    { id: "weed2", name: "Foreign Weed", coins: 5, health: 5 }
  ],

  mountain: [
    { id: "thistle", name: "Thorny Thistle", coins: 7, health: 10 }
  ]
};

const zoneMarkers = [
  { id: "beach", name: "Sunny Beach", left: 20, top: 75 },
  { id: "forest", name: "Misty Forest", left: 55, top: 40 },
  { id: "mountain", name: "Rocky Mountain", left: 85, top: 25 }
];

// ─── Helpers ─────────────────────────────────────────────────────────────────────
function isZoneUnlocked(zone) {
  if (!zone.unlockRequirement) return true;
  const req = zone.unlockRequirement;
  const reqHealth = currentPlayer.zones[req.zone] || 0;
  return reqHealth >= req.health;
}

function updateCoinsDisplay() {
  const coinsEl = document.getElementById("coins-display");
  if (coinsEl) {
    coinsEl.textContent = currentPlayer.coins;
    const coinContainer = coinsEl.closest(".hud-coins");
    if (coinContainer) {
      coinContainer.classList.add("pulse");
      setTimeout(() => coinContainer.classList.remove("pulse"), 800);
    }
  }

  // Placeholder for other badges (add logic when you implement them)
  // const gemsEl = document.getElementById("gems-display");
  // if (gemsEl) gemsEl.textContent = currentPlayer.gems ?? 0;
}

function updateHealthDisplay(health) {
  const fill = document.querySelector(".progress-fill");
  const text = document.querySelector(".health-text");
  if (fill) fill.style.width = health + "%";
  if (text) text.textContent = "Health: " + health + "%";
}

// ─── Custom modal for "area cleared" message ────────────────────────────────────
function showClearModal(message) {
  const modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.background = "rgba(0, 0, 0, 0.75)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "9999";
  modal.style.opacity = "0";
  modal.style.transition = "opacity 0.4s ease";

  modal.innerHTML = `
    <div style="
      background: rgba(30, 50, 30, 0.95);
      border: 3px solid #4CAF50;
      border-radius: 16px;
      padding: 32px 48px;
      max-width: 80%;
      text-align: center;
      color: white;
      box-shadow: 0 10px 30px rgba(0,0,0,0.7);
      transform: scale(0.9);
      transition: transform 0.4s ease;
    ">
      <h2 style="margin-bottom: 16px; font-size: 1.8rem;">Area Cleared!</h2>
      <p style="font-size: 1.2rem; margin-bottom: 24px;">${message}</p>
      <button id="modal-ok-btn" style="
        padding: 12px 32px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 1.2rem;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 4px 10px rgba(0,0,0,0.4);
      ">OK</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Fade in
  setTimeout(() => {
    modal.style.opacity = "1";
    modal.querySelector("div").style.transform = "scale(1)";
  }, 50);

  // Close on OK click
  modal.querySelector("#modal-ok-btn").addEventListener("click", () => {
    modal.style.opacity = "0";
    modal.querySelector("div").style.transform = "scale(0.9)";
    setTimeout(() => modal.remove(), 400);
  });

  // Close on outside click (optional)
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.opacity = "0";
      modal.querySelector("div").style.transform = "scale(0.9)";
      setTimeout(() => modal.remove(), 400);
    }
  });
}

// ─── Render ──────────────────────────────────────────────────────────────────────
async function renderView() {
  const container = document.getElementById("game-container");
  if (!container) return;
  container.innerHTML = "";

  if (currentView === "island") {
    container.innerHTML = `
      <img src="assets/backgrounds/island-full.jpg" class="island-bg-img" alt="Island Map">
      <div id="map-markers"></div>
    `;

    const markersContainer = document.getElementById("map-markers");

    zoneMarkers.forEach(marker => {
      const zone = zones.find(z => z.id === marker.id);
      const unlocked = isZoneUnlocked(zone);

      const markerEl = document.createElement("div");
      markerEl.className = "map-marker" + (unlocked ? "" : " locked");
      markerEl.style.left = marker.left + '%';
      markerEl.style.top = marker.top + '%';
      markerEl.dataset.zoneId = marker.id;
      markerEl.innerHTML = `<span class="marker-label">${marker.name}</span>`;

      if (!unlocked) {
        markerEl.style.opacity = 0.5;
        markerEl.style.pointerEvents = "none";
      }

      markersContainer.appendChild(markerEl);
    });

    updateCoinsDisplay();
  } else if (currentView.startsWith("zone:")) {
    const zoneId = currentView.split(":")[1];
    const zone = zones.find(z => z.id === zoneId);

    if (!zone || !isZoneUnlocked(zone)) {
      currentView = "island";
      renderView();
      return;
    }

    const health = currentPlayer.zones[zoneId] || 0;
    const invasives = invasivesByZone[zoneId] || [];

    let bgPath = "assets/backgrounds/global/sky-overcast.jpg";
    if (zoneId === "beach") bgPath = "assets/backgrounds/beach/main-day.jpg";
    else if (zoneId === "forest") bgPath = "assets/backgrounds/forest/main-misty.jpg";
    else if (zoneId === "mountain") bgPath = "assets/backgrounds/mountain/main-rocky.jpg";

    let detailHtml = `
      <div class="zone-detail">
        <img src="${bgPath}" class="zone-bg-img" alt="${zone.name} background">
        <div class="zone-content">
          <h2>${zone.name}</h2>
          <p>${zone.description}</p>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${health}%"></div>
          </div>
          <p class="health-text">Health: ${health}%</p>
          <h3>Tap to remove invasives:</h3>
          <div id="invasives-list"></div>
        </div>
        <button id="back-to-map">Back to Map</button>
      </div>
    `;

    container.innerHTML = detailHtml;

    const list = document.getElementById("invasives-list");

    // ── New: Load full JSON data for any external entities ────────────────────────────────
let baseInvasives = invasivesByZone[zoneId] || [];

// This is the important new part ↓↓↓
const enrichedInvasives = await Promise.all(
  baseInvasives.map(async (inv) => {
    if (inv.isExternal) {
      const fullDef = await loadEntityDefinition(inv.id);
      if (fullDef) {
        // Merge: base data first, then JSON data overrides it
        return { ...inv, ...fullDef, isExternal: true };
      } else {
        console.warn(`Could not load full definition for ${inv.id} — using fallback`);
        return inv;
      }
    }
    // Normal inline invasives stay as they are
    return inv;
  })
);

// Now use the enriched (complete) data to create DOM elements
const list = document.getElementById("invasive-list");
list.innerHTML = ""; // make sure it's empty before we add new items

enrichedInvasives.forEach((inv) => {
  const invEl = document.createElement("div");
  invEl.className = "invasive-item";
  invEl.dataset.invId = inv.id;

  // ── Choose image: prefer JSON icon, fall back to your old name-based logic ──
  let imagePath = inv.icon; // ← comes from JSON if it exists

  if (!imagePath) {
    // Your existing fallback logic (keep whatever you already have)
    const nameLower = inv.name.toLowerCase();
    if (nameLower.includes("seaweed")) {
      imagePath = "assets/entities/invasives/seaweed/seaweed-01.png";
    } else if (nameLower.includes("crabgrass") || nameLower.includes("alien")) {
      imagePath = "assets/entities/invasives/crabgrass/crabgrass-01.png";
    } else if (nameLower.includes("vine") || nameLower.includes("choking")) {
      imagePath = "assets/entities/invasives/vine/vine-choking-01.png";
    } else if (nameLower.includes("thistle") || nameLower.includes("thorny")) {
      imagePath = "assets/entities/invasives/thistle/thistle-thorny-01.png";
    } else if (nameLower.includes("weed") || nameLower.includes("foreign")) {
      imagePath = "assets/entities/invasives/weed-foreign/weed-foreign-01.png";
    } else {
      imagePath = "assets/entities/invasives/default.png"; // fallback
    }
  }

  // Create the element
  invEl.innerHTML = `
    <img src="${imagePath}" class="invasive-image" alt="${inv.name}">
    <div class="inv-name">${inv.name}</div>
  `;

  // Bonus: show tooltip if it exists in JSON
  if (inv.tooltip) {
    invEl.title = inv.tooltip;           // native browser tooltip on hover
    // or later you can make a nicer popup if you want
  }

  list.appendChild(invEl);
});
    updateCoinsDisplay();
    updateHealthDisplay(health);
  }
}

// ─── Game start ──────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  currentPlayer = loadPlayer();

  document.addEventListener("click", (e) => {
    const target = e.target;

    // Click on island marker
    const marker = target.closest(".map-marker");
    if (marker) {
      const zoneId = marker.dataset.zoneId;
      const zone = zones.find(z => z.id === zoneId);
      if (zone && isZoneUnlocked(zone)) {
        currentView = "zone:" + zoneId;
        renderView();
      } else {
        alert("This zone is locked! Complete the previous area first.");
      }
      return;
    }

    // Invasive tap
const invEl = target.closest(".invasive-item");
if (invEl) {
  const zoneId = currentView.split(":")[1];
  const invId = invEl.dataset.invId;

  // Find base definition
  const baseInv = invasivesByZone[zoneId]?.find(i => i.id === invId);
  if (!baseInv) return;

  let inv = baseInv;

  // Load full definition if external
  if (baseInv.isExternal) {
    const fullDef = await loadEntityDefinition(invId);
    if (fullDef) {
      inv = { ...baseInv, ...fullDef };
    }
  }

  // Condition check (expand later)
  if (inv.mutable?.onDestroy?.condition === "playerHasItem:spade") {
    // TODO: real inventory check
    const hasSpade = currentPlayer.inventory?.spade === true; // placeholder
    if (!hasSpade) {
      alert(inv.mutable.onDestroy.failMessage || "You need a spade to remove this!");
      return;
    }
  }

  // Apply reward
  const changes = {
    coins: currentPlayer.coins + (inv.coins || 5),
    zones: {
      ...currentPlayer.zones,
      [zoneId]: Math.min(100, (currentPlayer.zones[zoneId] || 0) + (inv.health || 8))
    }
  };

  updatePlayer(changes);

  // Visual feedback
  invEl.style.transition = "opacity 0.6s ease, transform 0.6s ease";
  invEl.style.opacity = "0";
  invEl.style.transform = "scale(0.4) rotate(5deg)";

  setTimeout(() => {
    invEl.remove();
    updateCoinsDisplay();
    updateHealthDisplay(changes.zones[zoneId]);

    const progressFill = document.querySelector(".progress-fill");
    if (progressFill) progressFill.style.width = changes.zones[zoneId] + "%";

    if (document.querySelectorAll(".invasive-item").length === 0) {
      const zone = zones.find(z => z.id === zoneId);
      showClearModal(zone.name + " cleared of invasives! 🌿");
    }
  }, 600);

  return;
}

    // Back to map button
    if (target.id === "back-to-map") {
      currentView = "island";
      renderView();
    }
  });

  renderView();
  console.log("Game loaded – island map with markers");
});

// ─── Fullscreen & landscape support ─────────────────────────────────────────────
async function enterFullscreen() {
  const elem = document.documentElement;

  try {
    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      await elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      await elem.msRequestFullscreen();
    }
    console.log("Entered fullscreen");

    // Hide fullscreen button on success
    const btn = document.getElementById("fullscreen-btn");
    if (btn) btn.style.display = "none";

    // Try to lock orientation (Android/Chrome only)
    if (screen.orientation && screen.orientation.lock) {
      try {
        await screen.orientation.lock("landscape");
        console.log("Locked to landscape");
      } catch (err) {
        console.warn("Orientation lock not supported:", err);
      }
    }
  } catch (err) {
    console.error("Fullscreen failed:", err);
  }
}

// Portrait warning
function checkOrientation() {
  const warning = document.getElementById("portrait-warning");
  if (window.innerHeight > window.innerWidth) {
    document.body.classList.add("portrait-warning-visible");
    if (warning) warning.style.display = "flex";
  } else {
    document.body.classList.remove("portrait-warning-visible");
    if (warning) warning.style.display = "none";
  }
}

window.addEventListener("resize", checkOrientation);
window.addEventListener("orientationchange", checkOrientation);

document.addEventListener("DOMContentLoaded", () => {
  checkOrientation();

  const btn = document.getElementById("fullscreen-btn");
  if (btn) {
    btn.addEventListener("click", enterFullscreen);
  }
});