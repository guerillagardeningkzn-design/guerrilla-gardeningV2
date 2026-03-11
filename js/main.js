import { loadPlayer, updatePlayer, savePlayer } from './player.js';
import { zones } from '../data/zones.js';

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
      // TODO: change visual to "ready", allow harvest, etc.
    }

    plant.lastChecked = now;
  });

  if (!isRealtime) {
    savePlayer(currentPlayer); // can be debounced later
  }
}

function startGrowthAnimation(zoneId) {
  if (growthInterval) clearInterval(growthInterval);

  growthInterval = setInterval(() => {
    if (currentView !== `zone:${zoneId}` || document.hidden) return;
    advancePlantGrowth(zoneId, true);
    updateGrowthVisuals(zoneId);
  }, 30000); // 30 seconds — feel free to change to 10000 or 60000
}

function stopGrowthAnimation() {
  if (growthInterval) {
    clearInterval(growthInterval);
    growthInterval = null;
  }
}

function updateGrowthVisuals(zoneId) {
  console.log(`Growth visuals updated for zone ${zoneId}`);
  // TODO: update progress bars, stage images, etc. in the DOM
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
  const baseUpgradeChance = 0.90; // your current test value

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
var invasivesByZone = {
  beach: [
    { id: "seaweed1", name: "Invasive Seaweed", coins: 3, health: 5 },
    { id: "seaweed2", name: "More Seaweed", coins: 4, health: 6 },
    { id: "alien-crabgrass", isExternal: true }
  ],
  forest: [
    { id: "vine1", name: "Choking Vine", coins: 6, health: 7 },
    { id: "weed2", name: "Foreign Weed", coins: 5, health: 5 }
  ],
  mountain: [
    { id: "thistle", name: "Thorny Thistle", coins: 7, health: 10 }
  ]
};

var nativesByZone = {
  beach:    [{ id: "baby-palm", isExternal: true }],
  forest:   [{ id: "baby-palm", isExternal: true }],
  mountain: [{ id: "baby-palm", isExternal: true }]
};

var zoneMarkers = [
  { id: "beach",    name: "Sunny Beach",    left: 20, top: 75 },
  { id: "forest",   name: "Misty Forest",   left: 55, top: 40 },
  { id: "mountain", name: "Rocky Mountain", left: 85, top: 25 }
];

// ─── Helpers ─────────────────────────────────────────────────────────────────────
function isZoneUnlocked(zone) {
  if (!zone?.unlockRequirement) return true;
  const req = zone.unlockRequirement;
  const reqHealth = currentPlayer.zoneHealth[req.zone] || 0;
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
}

function updateHealthDisplay(health) {
  const fill = document.querySelector(".progress-fill");
  const text = document.querySelector(".health-text");
  if (fill) fill.style.width = `${health}%`;
  if (text) text.textContent = `Health: ${health}%`;
}

// ─── Modals ──────────────────────────────────────────────────────────────────────
function showClearModal(message) {
  const modal = document.createElement("div");
  modal.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex;
    align-items: center; justify-content: center; z-index: 9999; opacity: 0;
    transition: opacity 0.4s ease;
  `;
  const inner = document.createElement("div");
  inner.style.cssText = `
    background: rgba(30,50,30,0.95); border: 3px solid #4CAF50; border-radius: 16px;
    padding: 32px 48px; max-width: 80%; text-align: center; color: white;
    box-shadow: 0 10px 30px rgba(0,0,0,0.7); transform: scale(0.9);
    transition: transform 0.4s ease;
  `;
  inner.innerHTML = `
    <h2 style="margin-bottom:16px;font-size:1.8rem;">Area Cleared!</h2>
    <p style="font-size:1.2rem;margin-bottom:24px;">${message}</p>
    <button id="modal-ok-btn" style="padding:12px 32px;background:#4CAF50;color:white;border:none;border-radius:12px;font-size:1.2rem;font-weight:bold;cursor:pointer;box-shadow:0 4px 10px rgba(0,0,0,0.4);">OK</button>
  `;
  modal.appendChild(inner);
  document.body.appendChild(modal);

  setTimeout(() => {
    modal.style.opacity = "1";
    inner.style.transform = "scale(1)";
  }, 50);

  inner.querySelector("#modal-ok-btn").onclick = () => {
    modal.style.opacity = "0";
    inner.style.transform = "scale(0.9)";
    setTimeout(() => modal.remove(), 400);
  };

  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.style.opacity = "0";
      inner.style.transform = "scale(0.9)";
      setTimeout(() => modal.remove(), 400);
    }
  };
}

function showMessage(title, message, durationMs = 0) {
  const modal = document.createElement("div");
  modal.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.65); display: flex;
    align-items: center; justify-content: center; z-index: 9998; opacity: 0;
    transition: opacity 0.4s ease;
  `;
  modal.innerHTML = `
    <div style="background: rgba(30,50,30,0.95); border:2px solid #4CAF50; border-radius:16px;
         padding:24px 32px; max-width:85%; width:320px; text-align:center; color:#e8f5e9;
         box-shadow:0 8px 24px rgba(0,0,0,0.6); transform:scale(0.92); transition:transform 0.3s ease;">
      ${title ? `<h3 style="margin:0 0 12px;font-size:1.4rem;color:#81C784;">${title}</h3>` : ''}
      <p style="margin:0 0 20px;font-size:1.1rem;line-height:1.4;">${message}</p>
      <button class="close-msg-btn" style="padding:10px 28px;background:#4CAF50;color:white;border:none;border-radius:12px;font-size:1rem;font-weight:600;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,0.4);">Close</button>
    </div>
  `;
  document.body.appendChild(modal);

  requestAnimationFrame(() => {
    modal.style.opacity = "1";
    modal.querySelector("div").style.transform = "scale(1)";
  });

  const close = () => {
    modal.style.opacity = "0";
    modal.querySelector("div").style.transform = "scale(0.92)";
    setTimeout(() => modal.remove(), 400);
  };

  modal.querySelector(".close-msg-btn").onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  if (durationMs > 0) setTimeout(close, durationMs);
}

// ─── Reward popup ────────────────────────────────────────────────────────────────
function showRewardPopup(targetElement, coinsDelta, healthDelta, bonusText, duration = 1400) {
  if (!targetElement) return;
  const safeCoins = Number(coinsDelta) || 0;
  const safeHealth = Number(healthDelta) || 0;
  const parts = [];
  if (safeCoins !== 0) {
    const sign = safeCoins > 0 ? "+" : "";
    const color = safeCoins > 0 ? '#FFD700' : '#ff5252';
    parts.push(`<span style="color:${color};">${sign}${Math.abs(safeCoins)} 🪙</span>`);
  }
  if (safeHealth !== 0) {
    const sign = safeHealth > 0 ? "+" : "";
    const color = safeHealth > 0 ? '#4CAF50' : '#ff5252';
    parts.push(`<span style="color:${color};">${sign}${Math.abs(safeHealth)}% 🌿</span>`);
  }
  if (bonusText) parts.push(`<span style="color:#8D6E63;">${bonusText}</span>`);

  const popup = document.createElement("div");
  popup.innerHTML = parts.length > 0 ? parts.join("   ") : "[No reward]";
  popup.style.cssText = `
    position: fixed !important; left: 50% !important; top: 30% !important;
    transform: translate(-50%, -50%) !important; background: #ff1744 !important;
    color: white !important; font-size: 3rem !important; font-weight: bold !important;
    padding: 40px 60px !important; border: 6px solid yellow !important;
    border-radius: 20px !important; z-index: 99999 !important;
    box-shadow: 0 0 40px rgba(255,0,0,0.8) !important; opacity: 0;
    pointer-events: none; transition: all 1.5s ease;
  `;
  document.body.appendChild(popup);

  requestAnimationFrame(() => { popup.style.opacity = "1"; });
  setTimeout(() => {
    popup.style.opacity = "0";
    setTimeout(() => popup.remove(), 500);
  }, duration);
}

// ─── Toolbox & Inventory UIs ─────────────────────────────────────────────────────
function showToolboxGallery() {
  const tools = [];
  if (currentPlayer.inventory.spade) tools.push("Spade – Dig tough invasives");
  if (currentPlayer.inventory.sickle) tools.push("Sickle – Harvest delicate natives");
  if (currentPlayer.inventory.scissors) tools.push("Scissors – Cut vines");

  const level = currentPlayer.inventory.toolboxLevel || 1;
  const capacity = level * 5;
  let html = `<h3>Toolbox (Level ${level} – Capacity: ${capacity})</h3>`;
  if (tools.length === 0) {
    html += '<p style="color: #ff9800;">No tools yet. Find or craft some!</p>';
  } else {
    html += tools.map(tool => `<div class="gallery-item">${tool}</div>`).join('');
  }
  html += '<p>Upgrade your toolbox to carry more tools!</p>';
  showMessage("Toolbox", html, 0);
}

function showInventoryGallery() {
  const items = [
    `Soil Clumps: ${currentPlayer.inventory.soilClumps || 0}`,
    `Fertilizer: ${currentPlayer.inventory.fertilizer || 0}`,
    `Clay Balls: ${currentPlayer.inventory.clayBalls || 0}`
  ];
  let html = '<h3>Inventory</h3>';
  html += items.map(item => `<div class="gallery-item">${item}</div>`).join('');
  if (items.every(i => i.includes('0'))) {
    html += '<p style="color: #ff9800;">Your inventory is empty. Keep harvesting!</p>';
  }
  html += `
    <div style="margin-top:20px;text-align:center;">
      <button id="open-seed-packs" style="padding:12px 28px;background:#4CAF50;color:white;border:none;border-radius:12px;font-size:1rem;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,0.4);">Open Seed Packs</button>
      <p style="font-size:0.9rem;color:#81C784;margin-top:8px;">View your harvested seed varieties here</p>
    </div>
  `;
  showMessage("Inventory", html, 0);

  setTimeout(() => {
    const btn = document.getElementById("open-seed-packs");
    if (btn) btn.addEventListener("click", showSeedPacks);
  }, 100);
}

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
          seedSummary.push(`${displayName} (${rarity}): ${count}`);
        }
      });
    }
  });

  let html = '<h3>Seed Packs</h3>';
  if (totalSeeds === 0) {
    html += '<p style="color: #ff9800;">No seeds harvested yet. Keep collecting from natives!</p>';
  } else {
    html += '<p style="margin-bottom:16px;">Your collected seed varieties:</p>';
    html += seedSummary.map(line => `<div class="gallery-item">${line}</div>`).join('');
    html += `<p style="margin-top:16px;font-weight:bold;">Total seeds: ${totalSeeds}</p>`;
  }
  html += '<p style="font-size:0.9rem;color:#81C784;margin-top:20px;">(Rarity & DNA details coming soon — tap to plant in future updates)</p>';
  showMessage("Seed Packs", html, 0);
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
      const zoneData = zonesConfig?.zones?.find(z => z.id === marker.id) || marker;
      const displayName = zoneData.name || marker.name || marker.id;
      const zone = zones.find(z => z.id === marker.id);
      const unlocked = isZoneUnlocked(zone);
      const markerEl = document.createElement("div");
      markerEl.className = `map-marker${unlocked ? "" : " locked"}`;
      markerEl.style.left = `${marker.left}%`;
      markerEl.style.top  = `${marker.top}%`;
      markerEl.dataset.zoneId = marker.id;
      markerEl.innerHTML = `<span class="marker-label">${displayName}</span>`;
      if (!unlocked) markerEl.style.opacity = 0.5;
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

    // Growth catch-up when entering zone
    advancePlantGrowth(zoneId);

    // Start real-time growth animation
    startGrowthAnimation(zoneId);

    const health = currentPlayer.zoneHealth[zoneId] || 0;
    let bgPath = "assets/backgrounds/global/sky-overcast.jpg";
    if (zoneId === "beach") bgPath = "assets/backgrounds/beach/main-day.jpg";
    else if (zoneId === "forest") bgPath = "assets/backgrounds/forest/main-misty.jpg";
    else if (zoneId === "mountain") bgPath = "assets/backgrounds/mountain/main-rocky.jpg";

    container.innerHTML = `
      <img src="${bgPath}" class="zone-bg-img" alt="${zone.name} background">
      <div class="zone-content">
        <h2>${zone.name}</h2>
        <p>${zone.description || ""}</p>
        <div class="progress-bar"><div class="progress-fill" style="width: ${health}%"></div></div>
        <p class="health-text">Health: ${health}%</p>
        <h3>Tap to interact:</h3>
        <div id="entities-list"></div>
        <button id="back-to-map">Back to Map</button>
      </div>
    `;

    const list = document.getElementById("entities-list");
    const baseInvasives = invasivesByZone[zoneId] || [];
    const enrichedInvasives = await Promise.all(
      baseInvasives.map(async inv => {
        if (inv.isExternal) {
          const fullDef = await loadEntityDefinition(inv.id, "invasives");
          return fullDef ? { ...inv, ...fullDef, isExternal: true, type: "invasive" } : { ...inv, type: "invasive" };
        }
        return { ...inv, type: "invasive" };
      })
    );

    const baseNatives = nativesByZone[zoneId] || [];
    const enrichedNatives = await Promise.all(
      baseNatives.map(async nat => {
        if (nat.isExternal) {
          const fullDef = await loadEntityDefinition(nat.id, "natives");
          return fullDef ? { ...nat, ...fullDef, isExternal: true, type: "native" } : { ...nat, type: "native" };
        }
        return { ...nat, type: "native" };
      })
    );

    const allEntities = enrichedInvasives.concat(enrichedNatives);
    list.innerHTML = "";

    allEntities.forEach(entity => {
      const el = document.createElement("div");
      el.className = entity.type === "native" ? "native-item" : "invasive-item";
      el.dataset.entityId = entity.id;
      el.dataset.type = entity.type;

      let imagePath = entity.icon || "";
      if (!imagePath) {
        const nameLower = (entity.name || entity.id || "").toLowerCase();
        if (nameLower.includes("palm") || nameLower.includes("baby-palm")) {
          imagePath = "assets/entities/natives/palm/palm-baby.png";
        } else if (nameLower.includes("seaweed")) {
          imagePath = "assets/entities/invasives/seaweed/seaweed-01.png";
        } else if (nameLower.includes("crabgrass") || nameLower.includes("alien")) {
          imagePath = "assets/entities/invasives/crabgrass/crabgrass-01.png";
        } else if (nameLower.includes("vine")) {
          imagePath = "assets/entities/invasives/vine/vine-choking-01.png";
        } else if (nameLower.includes("thistle")) {
          imagePath = "assets/entities/invasives/thistle/thistle-thorny-01.png";
        } else if (nameLower.includes("weed")) {
          imagePath = "assets/entities/invasives/weed-foreign/weed-foreign-01.png";
        } else {
          imagePath = "assets/entities/default.png";
        }
      }

      el.innerHTML = `
        <img src="${imagePath}" class="entity-image" alt="${entity.name || entity.id}">
        <div class="entity-name">${entity.name || entity.id}</div>
      `;
      if (entity.tooltip) el.title = entity.tooltip;
      list.appendChild(el);
    });

    updateCoinsDisplay();
    updateHealthDisplay(health);
  }
}

// ─── Game start & event listeners ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async function() {
  currentPlayer = loadPlayer();

  // Load zone config
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

  // Tab visibility & focus handling for growth
  document.addEventListener("visibilitychange", () => {
    if (currentView.startsWith("zone:")) {
      const zoneId = currentView.split(":")[1];
      if (document.hidden) {
        stopGrowthAnimation();
      } else {
        advancePlantGrowth(zoneId);     // catch-up
        startGrowthAnimation(zoneId);   // resume smooth
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

  // Main click handler
  document.addEventListener("click", async function(e) {
    const t = e.target;

    // Zone marker click
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

    // Entity interaction
    const entityEl = t.closest(".invasive-item, .native-item");
    if (entityEl) {
      const zoneId = currentView.split(":")[1];
      const entityId = entityEl.dataset.entityId;
      const entityType = entityEl.dataset.type || "invasive";

      if (!entityId) return;

      let baseEntity;
      if (entityType === "native") {
        baseEntity = nativesByZone[zoneId]?.find(i => i.id === entityId);
      } else {
        baseEntity = invasivesByZone[zoneId]?.find(i => i.id === entityId);
      }

      if (!baseEntity) return;

      let entity = { ...baseEntity, type: entityType };

      if (baseEntity.isExternal) {
        const category = entityType === "native" ? "natives" : "invasives";
        const fullDef = await loadEntityDefinition(entityId, category);
        if (fullDef) {
          entity = { ...entity, ...fullDef, isExternal: true };
          entity.coins = Number(fullDef.coins) || baseEntity.coins || (entityType === "native" ? 2 : 5);
          entity.health = Number(fullDef.health) || baseEntity.health || (entityType === "native" ? 3 : 8);
        }
      }

      const condition = entity.mutable?.onDestroy?.condition;
      if (condition) {
        let hasTool = false;
        let toolName = "";
        if (condition === "playerHasItem:spade") {
          hasTool = !!currentPlayer.inventory.spade;
          toolName = "spade";
        } else if (condition === "playerHasItem:sickle") {
          hasTool = !!currentPlayer.inventory.sickle;
          toolName = "sickle";
        }
        if (!hasTool) {
          showMessage("Tool Required", entity.mutable.onDestroy.failMessage || `You need a ${toolName}!`, 4000);
          return;
        }
      }

      // Native harvest
      if (entityType === "native") {
        const parentRarity = entity.dna?.templateDefaults?.rarity || "common";
        const childRarity = generateChildRarity(parentRarity, zoneId, []);

        if (!currentPlayer.inventory.seeds[entity.id]) {
          currentPlayer.inventory.seeds[entity.id] = {};
        }
        currentPlayer.inventory.seeds[entity.id][childRarity] =
          (currentPlayer.inventory.seeds[entity.id][childRarity] || 0) + 1;

        savePlayer(currentPlayer);

        showRewardPopup(
          entityEl,
          0,
          0,
          `+1 ${childRarity} ${entity.name} Seed 🌱`,
          1600
        );

        entityEl.style.transition = "opacity 0.6s ease, transform 0.6s ease";
        entityEl.style.opacity = "0";
        entityEl.style.transform = "scale(0.4) rotate(5deg)";
        setTimeout(() => entityEl.remove(), 600);
        return;
      }

      // Invasive removal + drops
      const changes = {
        coins: currentPlayer.coins + (entity.coins || 5),
        zoneHealth: { ...currentPlayer.zoneHealth }
      };
      changes.zoneHealth[zoneId] = Math.min(100, (currentPlayer.zoneHealth[zoneId] || 0) + (entity.health || 8));
      updatePlayer(currentPlayer, changes);

      let bonusText = "";
      if (entity.mutable?.onDestroy?.drop?.length) {
        const bonusParts = [];
        for (const dropRule of entity.mutable.onDestroy.drop) {
          const dropEntity = dropRule.entity;
          const count = Number(dropRule.count) || 1;
          if (Math.random() >= (dropRule.chance ?? 1)) continue;

          if (dropEntity === "seed" || dropEntity === "seedling") {
            const parentRarity = entity.dna?.templateDefaults?.rarity || "common";
            const childRarity = generateChildRarity(parentRarity, zoneId, []);
            if (!currentPlayer.inventory.seeds[entity.id]) {
              currentPlayer.inventory.seeds[entity.id] = {};
            }
            currentPlayer.inventory.seeds[entity.id][childRarity] =
              (currentPlayer.inventory.seeds[entity.id][childRarity] || 0) + count;
            bonusParts.push(`+${count} ${childRarity} ${dropEntity}`);
          } else if (dropEntity === "soil-clump") {
            currentPlayer.inventory.soilClumps = (currentPlayer.inventory.soilClumps || 0) + count;
            bonusParts.push(`+${count} Soil Clump 🌱`);
          }
        }
        if (bonusParts.length > 0) bonusText = bonusParts.join("   ");
      }

      entityEl.style.transition = "opacity 0.6s ease, transform 0.6s ease";
      entityEl.style.opacity = "0";
      entityEl.style.transform = "scale(0.4) rotate(5deg)";

      setTimeout(() => {
        entityEl.remove();
        showRewardPopup(entityEl, entity.coins || 5, entity.health || 8, bonusText, 1600);
        updateCoinsDisplay();
        updateHealthDisplay(changes.zoneHealth[zoneId]);

        const progressFill = document.querySelector(".progress-fill");
        if (progressFill) progressFill.style.width = `${changes.zoneHealth[zoneId]}%`;

        const remaining = document.querySelectorAll(".invasive-item, .native-item");
        if (remaining.length === 0) {
          const zoneName = zones.find(z => z.id === zoneId)?.name || "Area";
          showClearModal(`${zoneName} cleared! 🌿`);
        }
      }, 600);

      savePlayer(currentPlayer);
      return;
    }

    // Back to map
    if (t.id === "back-to-map") {
      stopGrowthAnimation();
      savePlayer(currentPlayer);
      currentView = "island";
      renderView();
      return;
    }

    // Toolbox & Inventory
    if (t.closest(".hud-toolbox")) {
      showToolboxGallery();
      return;
    }
    if (t.closest(".hud-inventory")) {
      showInventoryGallery();
      return;
    }
  });

  renderView();
  console.log("Game loaded – island map with markers");
});