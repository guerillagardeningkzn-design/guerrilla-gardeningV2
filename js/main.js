import { loadPlayer, updatePlayer, savePlayer } from './player.js';
import { zones } from '../data/zones.js';

let plantingMode = false;
let selectedSeed = null;
let placementPreview = null;

console.log("Guerrilla Gardening - overworld map with golden UI");

// ─── Zone Configuration ─────────────────────────────────────────────────────────
let zonesConfig = null;

async function loadZonesConfig() {
  try {
    const response = await fetch('data/zones-config.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} – zones-config.json missing?`);
    }
    zonesConfig = await response.json();
    console.log("Zones config loaded:", zonesConfig);
    console.log(`Found ${zonesConfig.zones?.length || 0} zones:`,
      zonesConfig.zones?.map(z => z.name).join(", ") || "none");
  } catch (err) {
    console.error("Critical: could not load zones-config.json", err);
    zonesConfig = {
      hub: { id: "island", name: "Overworld Island" },
      zones: [
        { id: "beach", name: "Sunny Beach", mutationMultiplier: 1.0 },
        { id: "forest", name: "Misty Forest", mutationMultiplier: 1.6 },
        { id: "mountain", name: "Rocky Mountain", mutationMultiplier: 1.2 }
      ]
    };
  }
}

function getCurrentZoneData() {
  if (currentView === "island") {
    return zonesConfig?.hub || { id: "island", name: "Overworld Island" };
  }
  if (currentView.startsWith("zone:")) {
    const zoneId = currentView.split(":")[1];
    return zonesConfig?.zones?.find(z => z.id === zoneId)
      || { id: zoneId, name: zoneId, mutationMultiplier: 1.0 };
  }
  return null;
}

// ─── Growth system ──────────────────────────────────────────────────────────────
let growthInterval = null;

function advancePlantGrowth(zoneId, isRealtime = false) {
  const now = Date.now();
  const zonePlants = currentPlayer.planted?.[zoneId] || [];
  zonePlants.forEach(plant => {
    const elapsedMs = now - (plant.lastChecked || plant.plantedAt || now);
    if (elapsedMs <= 0) return;
    const deltaProgress = elapsedMs / plant.maturationMs;
    plant.progress = Math.min(1, (plant.progress || 0) + deltaProgress);
    if (plant.progress >= 1) {
      console.log(`Plant ${plant.entityId} (${plant.rarity}) in ${zoneId} is now mature!`);
    }
    plant.lastChecked = now;
  });
  if (!isRealtime) {
    savePlayer(currentPlayer);
  }
}

function startGrowthAnimation(zoneId) {
  if (growthInterval) clearInterval(growthInterval);
  growthInterval = setInterval(() => {
    if (currentView !== `zone:${zoneId}` || document.hidden) return;
    advancePlantGrowth(zoneId, true);
    const list = document.getElementById("entities-list");
    if (!list) return;
    document.querySelectorAll('.planted-item').forEach(el => el.remove());
    const plantedInZone = currentPlayer.planted?.[zoneId] || [];
    plantedInZone.forEach(plant => {
      const uniqueId = `planted-${zoneId}-${plant.id}`;
      const el = document.createElement("div");
      el.id = uniqueId;
      el.className = "native-item planted-item";
      if (plant.progress >= 1) {
        el.style.cursor = "pointer";
        el.style.borderColor = "#FFD700";
        el.style.boxShadow = "0 0 15px #FFD700";
        el.title = "Tap to harvest!";
      }
      let stageEmoji = "🌱";
      let stageName = "Seed";
      let stageColor = "#81C784";
      if (plant.progress >= 0.25) { stageEmoji = "🌿"; stageName = "Sprout"; }
      if (plant.progress >= 0.60) { stageEmoji = "🌴"; stageName = "Young"; }
      if (plant.progress >= 1.00) { stageEmoji = "🌴✨"; stageName = "Mature"; stageColor = "#FFD700"; }
      el.innerHTML = `
        <div class="stage-emoji" style="margin-bottom:8px;">
          ${stageEmoji}
        </div>
        <div class="entity-name" style="font-weight:600;">
          ${plant.rarity} ${plant.entityId.replace(/-/g, ' ')}
        </div>
        <div class="planted-progress">
          <div class="planted-progress-fill" style="width: ${(plant.progress * 100)}%;"></div>
        </div>
        <div class="progress-text" style="color: ${stageColor}; margin-top:8px;">
          ${plant.progress >= 1 ? 'Ready to Harvest!' : stageName}
        </div>
      `;
      el.style.position = "absolute";
      el.style.left = plant.left || `${Math.random() * 80 + 10}%`;
      el.style.top = plant.top || `${Math.random() * 60 + 20}%`;
      el.style.zIndex = "6";
      list.appendChild(el);
    });
    console.log(`[LIVE RENDER] Updated ${plantedInZone.length} plants in ${zoneId}`);
  }, 2000);
}

function stopGrowthAnimation() {
  if (growthInterval) {
    clearInterval(growthInterval);
    growthInterval = null;
  }
}

// ─── Planting helpers ───────────────────────────────────────────────────────────
function exitPlantingMode() {
  plantingMode = false;
  selectedSeed = null;
  document.body.style.cursor = "default";
  if (placementPreview) {
    placementPreview.remove();
    placementPreview = null;
  }
}

// ─── Editor-ready growth parameters ─────────────────────────────────────────────
async function getPlantGrowthParams(entityId, rarity) {
  const entityDef = await loadEntityDefinition(entityId, "natives");
  if (entityDef?.growth?.baseMaturationSeconds) {
    let ms = entityDef.growth.baseMaturationSeconds * 1000;
    const mod = entityDef.growth.rarityModifiers?.[rarity] || 1.0;
    ms *= mod;
    console.log(`Using JSON growth: ${entityId} (${rarity}) → ${ms/1000}s`);
    return ms;
  }
  console.log(`Fallback growth: ${entityId} (${rarity})`);
  let maturationMs = 60 * 1000;
  if (rarity === "uncommon") maturationMs *= 0.8;
  if (rarity === "rare") maturationMs *= 0.6;
  if (rarity === "heirloom") maturationMs *= 0.45;
  if (rarity === "legendary") maturationMs *= 0.3;
  return maturationMs;
}

// ─── Centralized entity loading ─────────────────────────────────────────────────
const entityCache = new Map();

async function loadEntityDefinition(entityId, category) {
  if (entityCache.has(entityId)) return entityCache.get(entityId);
  const path = `data/entities/${category || "invasives"}/${entityId}.json`;
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Entity ${entityId} not found in ${category}`);
    const data = await response.json();
    entityCache.set(entityId, data);
    return data;
  } catch (err) {
    console.error("Failed to load entity:", entityId, err);
    return null;
  }
}

// ─── Rarity-based seed mutation ─────────────────────────────────────────────────
function generateChildRarity(parentRarity, currentZoneId, usedBoostItems = []) {
  const rarityLevels = ["common", "uncommon", "rare", "heirloom", "legendary"];
  const baseUpgradeChance = 0.90;
  const zoneData = zonesConfig?.zones?.find(z => z.id === currentZoneId);
  const mutationMultiplier = zoneData?.mutationMultiplier || 1.0;
  let itemBoost = 0;
  if (usedBoostItems.includes("fertilizer")) itemBoost += 0.12;
  const upgradeChance = Math.min(0.99, baseUpgradeChance * mutationMultiplier + itemBoost);
  let currentIndex = rarityLevels.indexOf(parentRarity);
  if (currentIndex === -1) currentIndex = 0;
  let newIndex = currentIndex;
  if (Math.random() < upgradeChance) {
    newIndex = Math.min(currentIndex + 1, rarityLevels.length - 1);
  }
  const newRarity = rarityLevels[newIndex];
  console.log(
    `%c[SEED] ${parentRarity} → ${newRarity} (zone: ${currentZoneId}, mult: ×${mutationMultiplier})`,
    "color: #4CAF50; font-weight: bold"
  );
  showMessage(
    "New Seed!",
    `A ${newRarity} seed was created!`,
    2200
  );
  return newRarity;
}

// ─── Global state ────────────────────────────────────────────────────────────────
var currentPlayer;
var currentView = "island";

// ─── Data ────────────────────────────────────────────────────────────────────────
var invasivesByZone = { /* unchanged */ };
var nativesByZone = { /* unchanged */ };
var zoneMarkers = { /* unchanged */ };

// ─── Helpers ─────────────────────────────────────────────────────────────────────
// ... (isZoneUnlocked, updateCoinsDisplay, updateHealthDisplay unchanged)

// ─── Modals ──────────────────────────────────────────────────────────────────────
// ... (showClearModal, showMessage, showRewardPopup unchanged)

// ─── Toolbox & Inventory UIs ─────────────────────────────────────────────────────
// ... (showToolboxGallery, showInventoryGallery unchanged)

function showSeedPacks() {
  let seedSummary = [];
  let totalSeeds = 0;
  const seedsData = currentPlayer.inventory.seeds || {};

  Object.keys(seedsData).forEach(parentId => {
    const rarities = seedsData[parentId];
    if (typeof rarities === 'object' && rarities !== null) {
      Object.keys(rarities).forEach(rarity => {
        const count = Number(rarities[rarity]) || 0;
        if (count > 0) {
          totalSeeds += count;
          const displayName = parentId.replace(/-/g, ' ')
            .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          seedSummary.push({
            type: parentId,
            rarity,
            count,
            display: `${displayName} (${rarity}) ×${count}`
          });
        }
      });
    }
  });

  let html = '<h3>Seed Packs</h3>';
  if (totalSeeds === 0) {
    html += '<p style="color: #ff9800;">No seeds harvested yet. Keep collecting from natives!</p>';
  } else {
    html += '<p style="margin-bottom:16px;">Select a seed to plant:</p>';
    html += seedSummary.map(seed => `
      <div class="gallery-item seed-option"
           data-type="${seed.type}"
           data-rarity="${seed.rarity}"
           style="cursor:pointer; padding:12px; margin:6px 0; background:rgba(76,175,80,0.15); border-radius:8px;">
        ${seed.display}
      </div>
    `).join('');
    html += `<p style="margin-top:16px;font-weight:bold;">Total seeds: ${totalSeeds}</p>`;
  }

  html += `
    <div style="margin-top:24px; text-align:center;">
      <p style="font-size:0.9rem; color:#81C784;">
        Select seed → close modal → tap anywhere in zone to plant
      </p>
    </div>
  `;

  showMessage("Seed Packs", html, 0);

  setTimeout(() => {
    document.querySelectorAll('.seed-option').forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent bubbling to document click listener

        const type = option.dataset.type;
        const rarity = option.dataset.rarity;

        plantingMode = true;
        selectedSeed = { type, rarity };

        showMessage("Planting Mode", "Tap anywhere on the zone to place your seed!", 3000);

        document.querySelectorAll('div[style*="position: fixed; inset: 0"]').forEach(m => m.remove());

        document.body.style.cursor = "crosshair";

        if (placementPreview) placementPreview.remove();
        placementPreview = document.createElement("div");
        placementPreview.className = "native-item planted-item";
        placementPreview.style.opacity = "0.5";
        placementPreview.style.pointerEvents = "none";
        placementPreview.style.position = "absolute";
        placementPreview.style.zIndex = "1000";
        placementPreview.innerHTML = `
          <div class="stage-emoji" style="margin-bottom:8px;">🌱</div>
          <div class="entity-name" style="font-weight:600;">${rarity} ${type.replace(/-/g, ' ')}</div>
        `;
        document.body.appendChild(placementPreview);

        console.log(`Entered planting mode for ${rarity} ${type}`);
      });
    });
  }, 150);
}

// ─── Render ──────────────────────────────────────────────────────────────────────
async function renderView() {
  // ... (unchanged - your current renderView is fine)
}

// ─── Game start & event listeners ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async function() {
  currentPlayer = loadPlayer();
  await loadZonesConfig();

  // Fullscreen button
  const fullscreenBtn = document.getElementById("fullscreen-btn");
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
        fullscreenBtn.style.display = "none";
      } catch (err) {
        console.error("Fullscreen failed:", err);
      }
    });
  }

  // Visibility & focus handlers
  document.addEventListener("visibilitychange", () => {
    if (currentView.startsWith("zone:")) {
      const zoneId = currentView.split(":")[1];
      if (document.hidden) {
        stopGrowthAnimation();
      } else {
        advancePlantGrowth(zoneId);
        startGrowthAnimation(zoneId);
      }
    }
  });

  window.addEventListener("focus", () => {
    if (currentView.startsWith("zone:")) {
      const zoneId = currentView.split(":")[1];
      advancePlantGrowth(zoneId);
      startGrowthAnimation(zoneId);
    }
  });

  // Main game interaction handler
  document.addEventListener("click", async function(e) {
    const t = e.target;

    // ── NEW: Prevent planting logic when clicking UI elements ──
    if (e.target.closest('.gallery-item, button, .hud-right-stack, #back-to-map, .close-msg-btn, [role="dialog"]')) {
      return; // Let modal/UI clicks pass through
    }

    if (!plantingMode) {
      // Normal game clicks (markers, entities, back button, etc.)
      const marker = t.closest(".map-marker, [data-zone-id]");
      if (marker) {
        e.preventDefault();
        const zoneId = marker.dataset.zoneId;
        const zone = zones.find(z => z.id === zoneId);
        if (zone && isZoneUnlocked(zone)) {
          savePlayer(currentPlayer);
          currentView = `zone:${zoneId}`;
          renderView();
        } else {
          showMessage("Zone Locked", "Complete previous area first!", 5000);
        }
        return;
      }

      const entityEl = t.closest(".invasive-item, .native-item, .planted-item");
      if (entityEl) {
        // ... (your existing entity/harvest logic unchanged)
      }

      if (t.id === "back-to-map") {
        stopGrowthAnimation();
        savePlayer(currentPlayer);
        currentView = "island";
        renderView();
        return;
      }

      if (t.closest(".hud-toolbox")) {
        showToolboxGallery();
        return;
      }
      if (t.closest(".hud-inventory")) {
        showInventoryGallery();
        return;
      }

      return;
    }

    // ── Planting mode active: place on canvas ──
    if (!currentView.startsWith("zone:")) {
      showMessage("Wrong Area", "You must be in a zone to plant.", 3000);
      exitPlantingMode();
      return;
    }

    const zoneId = currentView.split(":")[1];
    const list = document.getElementById("entities-list");
    if (!list) return;

    const rect = list.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      return; // Clicked outside entities area — ignore
    }

    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

    const left = Math.max(5, Math.min(95, xPercent)) + "%";
    const top  = Math.max(10, Math.min(90, yPercent)) + "%";

    const { type, rarity } = selectedSeed;

    if (!currentPlayer.inventory.seeds?.[type]?.[rarity]) {
      showMessage("Error", "Seed no longer available.", 3000);
      exitPlantingMode();
      return;
    }

    currentPlayer.inventory.seeds[type][rarity] -= 1;
    if (currentPlayer.inventory.seeds[type][rarity] <= 0) {
      delete currentPlayer.inventory.seeds[type][rarity];
      if (Object.keys(currentPlayer.inventory.seeds[type]).length === 0) {
        delete currentPlayer.inventory.seeds[type];
      }
    }

    const maturationMs = await getPlantGrowthParams(type, rarity);

    const plant = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      entityId: type,
      rarity,
      plantedAt: Date.now(),
      lastChecked: Date.now(),
      progress: 0,
      maturationMs,
      left,
      top
    };

    if (!currentPlayer.planted[zoneId]) currentPlayer.planted[zoneId] = [];
    currentPlayer.planted[zoneId].push(plant);

    savePlayer(currentPlayer);

    showMessage("Planted!", `Placed ${rarity} ${type.replace(/-/g, ' ')}`, 2500);

    exitPlantingMode();
    renderView();
  });

  // Touch support for planting
  document.addEventListener("touchend", function(e) {
    if (!plantingMode || e.touches.length > 0) return;
    const touch = e.changedTouches[0];
    const simulatedEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      preventDefault: () => {}
    };
    document.dispatchEvent(new MouseEvent("click", simulatedEvent));
  }, { passive: false });

  // Cancel planting with Escape key
  document.addEventListener('keydown', (e) => {
    if (plantingMode && e.key === 'Escape') {
      exitPlantingMode();
      showMessage("Cancelled", "Planting cancelled", 2000);
    }
  });

  // Mouse/touch preview movement
  document.addEventListener("mousemove", (e) => {
    if (!plantingMode || !placementPreview) return;
    const list = document.getElementById("entities-list");
    if (!list) return;
    const rect = list.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    placementPreview.style.left = `${x}px`;
    placementPreview.style.top  = `${y}px`;
    placementPreview.style.transform = "translate(-50%, -50%)";
  });

  document.addEventListener("touchmove", (e) => {
    if (e.touches.length !== 1 || !plantingMode || !placementPreview) return;
    const touch = e.touches[0];
    const list = document.getElementById("entities-list");
    if (!list) return;
    const rect = list.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    placementPreview.style.left = `${x}px`;
    placementPreview.style.top  = `${y}px`;
    placementPreview.style.transform = "translate(-50%, -50%)";
  }, { passive: true });

  renderView();
  console.log("Game loaded – island map with markers");
});