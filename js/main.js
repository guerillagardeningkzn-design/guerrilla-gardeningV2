import { loadPlayer, updatePlayer, savePlayer } from './player.js';
import { zones } from '../data/zones.js';

console.log("Guerrilla Gardening - overworld map with markers + golden UI");

// ───────────────────────────────────────────────────────────
// Centralized way to load external entity definitions
// ───────────────────────────────────────────────────────────

const entityCache = new Map();

async function loadEntityDefinition(entityId, category = "invasives") {
  if (entityCache.has(entityId)) {
    return entityCache.get(entityId);
  }

  const path = `data/entities/${category}/${entityId}.json`;

  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Entity ${entityId} not found in ${category}`);
    const data = await response.json();
    entityCache.set(entityId, data);
    return data;
  } catch (err) {
    console.error("Failed to load entity:", entityId, "from", path, err);
    return null;
  }
}

// ─── Global state ────────────────────────────────────────────────────────────────
let currentPlayer;
let currentView = "island";

// ─── Data ────────────────────────────────────────────────────────────────────────
const invasivesByZone = {
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

const nativesByZone = {
  beach: [
    { id: "baby-palm", isExternal: true }
  ],
  forest: [],
  mountain: []
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
}

function updateHealthDisplay(health) {
  const fill = document.querySelector(".progress-fill");
  const text = document.querySelector(".health-text");
  if (fill) fill.style.width = health + "%";
  if (text) text.textContent = "Health: " + health + "%";
}

// ─── Modals ──────────────────────────────────────────────────────────────────────
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

  setTimeout(() => {
    modal.style.opacity = "1";
    modal.querySelector("div").style.transform = "scale(1)";
  }, 50);

  modal.querySelector("#modal-ok-btn").addEventListener("click", () => {
    modal.style.opacity = "0";
    modal.querySelector("div").style.transform = "scale(0.9)";
    setTimeout(() => modal.remove(), 400);
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.opacity = "0";
      modal.querySelector("div").style.transform = "scale(0.9)";
      setTimeout(() => modal.remove(), 400);
    }
  });
}

function showMessage(title = "Notice", message, durationMs = 0) {
  const modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.background = "rgba(0, 0, 0, 0.65)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "9998";
  modal.style.opacity = "0";
  modal.style.transition = "opacity 0.4s ease";

  modal.innerHTML = `
    <div style="
      background: rgba(30, 50, 30, 0.95);
      border: 2px solid #4CAF50;
      border-radius: 16px;
      padding: 24px 32px;
      max-width: 85%;
      width: 320px;
      text-align: center;
      color: #e8f5e9;
      box-shadow: 0 8px 24px rgba(0,0,0,0.6);
      transform: scale(0.92);
      transition: transform 0.3s ease;
    ">
      ${title ? `<h3 style="margin: 0 0 12px; font-size: 1.4rem; color: #81C784;">${title}</h3>` : ''}
      <p style="margin: 0 0 20px; font-size: 1.1rem; line-height: 1.4;">${message}</p>
      <button class="close-msg-btn" style="
        padding: 10px 28px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 3px 10px rgba(0,0,0,0.4);
      ">Close</button>
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

  modal.querySelector(".close-msg-btn").addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  if (durationMs > 0) setTimeout(close, durationMs);
}

// ─── Interactive dialog modal (missing function restored) ───────────────────────
function showDialogTree(entity, dialogTree, currentIndex = 0) {
  if (!dialogTree || !Array.isArray(dialogTree) || currentIndex >= dialogTree.length) {
    return;
  }

  const node = dialogTree[currentIndex];
  const modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.background = "rgba(0,0,0,0.75)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "9999";
  modal.style.opacity = "0";
  modal.style.transition = "opacity 0.4s ease";

  let html = `
    <div style="
      background: rgba(30,50,30,0.95);
      border: 2px solid #4CAF50;
      border-radius: 16px;
      padding: 24px 32px;
      max-width: 90%;
      width: 400px;
      text-align: center;
      color: #e8f5e9;
      box-shadow: 0 8px 24px rgba(0,0,0,0.6);
      transform: scale(0.92);
      transition: transform 0.3s ease;
    ">
      <p style="font-size: 1.15rem; margin-bottom: 20px; line-height: 1.4;">${node.message}</p>
  `;

  if (node.choices && Array.isArray(node.choices)) {
    html += '<div style="display: flex; flex-direction: column; gap: 12px;">';
    node.choices.forEach(choice => {
      html += `
        <button class="dialog-choice" data-next="${choice.next}" style="
          padding: 12px 24px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        ">${choice.text}</button>
      `;
    });
    html += '</div>';
  } else {
    html += `
      <button class="dialog-close" style="
        padding: 12px 32px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        cursor: pointer;
      ">OK</button>
    `;
  }

  html += '</div>';
  modal.innerHTML = html;
  document.body.appendChild(modal);

  requestAnimationFrame(() => {
    modal.style.opacity = "1";
    modal.querySelector("div").style.transform = "scale(1)";
  });

  modal.querySelectorAll(".dialog-choice").forEach(btn => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      const nextIndex = parseInt(btn.dataset.next);
      modal.remove();
      showDialogTree(entity, dialogTree, nextIndex);
    });
  });

  modal.querySelector(".dialog-close")?.addEventListener("click", (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
    modal.remove();
  });

  modal.addEventListener("click", (ev) => {
    if (ev.target === modal) modal.remove();
  });
}

// ─── Reward popup ────────────────────────────────────────────────────────────────
function showRewardPopup(targetElement, coinsDelta = 0, healthDelta = 0, bonusText = "", duration = 1400) {
  if (!targetElement) return;

  const safeCoins  = Number(coinsDelta)  || 0;
  const safeHealth = Number(healthDelta) || 0;

  console.log("Reward popup → coins:", safeCoins, "health:", safeHealth, "bonus:", bonusText);

  const popup = document.createElement("div");

  let parts = [];
  if (safeCoins !== 0) {
    const sign = safeCoins > 0 ? "+" : "";
    parts.push(`<span style="color: ${safeCoins > 0 ? '#FFD700' : '#ff5252'};">${sign}${Math.abs(safeCoins)} 🪙</span>`);
  }
  if (safeHealth !== 0) {
    const sign = safeHealth > 0 ? "+" : "";
    parts.push(`<span style="color: ${safeHealth > 0 ? '#4CAF50' : '#ff5252'};">${sign}${Math.abs(safeHealth)}% 🌿</span>`);
  }
  if (bonusText) {
    parts.push(`<span style="color: #8D6E63;">${bonusText}</span>`);
  }

  popup.innerHTML = parts.join("   ") || "[No reward]";

  popup.style.cssText = `
    position: fixed !important;
    left: 50% !important;
    top: 30% !important;
    transform: translate(-50%, -50%) !important;
    background: #ff1744 !important;
    color: white !important;
    font-size: 3rem !important;
    font-weight: bold !important;
    padding: 40px 60px !important;
    border: 6px solid yellow !important;
    border-radius: 20px !important;
    z-index: 99999 !important;
    box-shadow: 0 0 40px rgba(255,0,0,0.8) !important;
    opacity: 0;
    pointer-events: none;
    transition: all 1.5s ease;
  `;

  document.body.appendChild(popup);
  console.log("Popup appended – innerHTML:", popup.innerHTML);

  requestAnimationFrame(() => {
    void popup.offsetWidth;
    popup.style.opacity = "1";
  });

  setTimeout(() => {
    popup.style.opacity = "0";
    setTimeout(() => popup.remove(), 500);
  }, duration);
}

// ─── Toolbox & Inventory galleries ──────────────────────────────────────────────
function showToolboxGallery() {
  const tools = [];
  if (currentPlayer.inventory.spade)    tools.push("Spade – Dig tough invasives");
  if (currentPlayer.inventory.sickle)   tools.push("Sickle – Harvest delicate natives");
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

  // Trigger for Seed Packs (opens placeholder for now)
  html += `
    <div style="margin-top: 20px; text-align: center;">
      <button id="open-seed-packs" style="
        padding: 12px 28px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        cursor: pointer;
        box-shadow: 0 3px 10px rgba(0,0,0,0.4);
      ">Open Seed Packs</button>
      <p style="font-size: 0.9rem; color: #81C784; margin-top: 8px;">
        View your harvested seed varieties here
      </p>
    </div>
  `;

  const modalContent = document.createElement("div");
  modalContent.innerHTML = html;

  showMessage("Inventory", modalContent.innerHTML, 0);

  // Add click listener for seed packs button (runs after modal appears)
  setTimeout(() => {
    document.getElementById("open-seed-packs")?.addEventListener("click", () => {
      showSeedPacksPlaceholder();
    });
  }, 100); // small delay so modal is in DOM
}
function showSeedPacksPlaceholder() {
  // Calculate total seeds per type for display
  let seedSummary = [];
  let totalSeeds = 0;

  if (currentPlayer.inventory.seeds && typeof currentPlayer.inventory.seeds === 'object') {
    Object.keys(currentPlayer.inventory.seeds).forEach(parentId => {
      const seedsArray = currentPlayer.inventory.seeds[parentId];
      if (Array.isArray(seedsArray)) {
        const count = seedsArray.length;
        totalSeeds += count;
        seedSummary.push(`${parentId.replace(/-/g, ' ')} Seeds: ${count}`);
      }
    });
  }

  let html = '<h3>Seed Packs</h3>';

  if (totalSeeds === 0) {
    html += '<p style="color: #ff9800;">No seeds harvested yet. Keep collecting from natives!</p>';
  } else {
    html += '<p style="margin-bottom: 16px;">Your collected seed varieties:</p>';
    html += seedSummary.map(line => `<div class="gallery-item">${line}</div>`).join('');
    html += `<p style="margin-top: 16px; font-weight: bold;">Total seeds: ${totalSeeds}</p>`;
  }

  html += '<p style="font-size: 0.9rem; color: #81C784; margin-top: 20px;">(Rarity & DNA details coming soon — tap to plant in future updates)</p>';

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
      const zone = zones.find(z => z.id === marker.id);
      const unlocked = isZoneUnlocked(zone);

      const markerEl = document.createElement("div");
      markerEl.className = "map-marker" + (unlocked ? "" : " locked");
      markerEl.style.left = marker.left + '%';
      markerEl.style.top = marker.top + '%';
      markerEl.dataset.zoneId = marker.id;
      markerEl.innerHTML = `<span class="marker-label">${marker.name}</span>`;

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

    const health = currentPlayer.zones[zoneId] || 0;

    let bgPath = "assets/backgrounds/global/sky-overcast.jpg";
    if (zoneId === "beach") bgPath = "assets/backgrounds/beach/main-day.jpg";
    else if (zoneId === "forest") bgPath = "assets/backgrounds/forest/main-misty.jpg";
    else if (zoneId === "mountain") bgPath = "assets/backgrounds/mountain/main-rocky.jpg";

    container.innerHTML = `
      <img src="${bgPath}" class="zone-bg-img" alt="${zone.name} background">
      <div class="zone-content">
        <h2>${zone.name}</h2>
        <p>${zone.description}</p>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${health}%"></div>
        </div>
        <p class="health-text">Health: ${health}%</p>
        <h3>Tap to interact:</h3>
        <div id="entities-list"></div>
        <button id="back-to-map">Back to Map</button>
      </div>
    `;

    const list = document.getElementById("entities-list");

    // ── Load invasives ──────────────────────────────────────────────────────────────
    let baseInvasives = invasivesByZone[zoneId] || [];
    const enrichedInvasives = await Promise.all(
      baseInvasives.map(async (inv) => {
        if (inv.isExternal) {
          const fullDef = await loadEntityDefinition(inv.id, "invasives");
          if (fullDef) {
            return { ...inv, ...fullDef, isExternal: true, type: "invasive" };
          }
          return { ...inv, type: "invasive" };
        }
        return { ...inv, type: "invasive" };
      })
    );

    // ── Load natives ────────────────────────────────────────────────────────────────
    let baseNatives = nativesByZone[zoneId] || [];
    const enrichedNatives = await Promise.all(
      baseNatives.map(async (nat) => {
        if (nat.isExternal) {
          const fullDef = await loadEntityDefinition(nat.id, "natives");
          if (fullDef) {
            return { ...nat, ...fullDef, isExternal: true, type: "native" };
          }
          return { ...nat, type: "native" };
        }
        return { ...nat, type: "native" };
      })
    );

    // ── Combine & render ────────────────────────────────────────────────────────────
    const allEntities = [...enrichedInvasives, ...enrichedNatives];

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

// ─── Game start & click handler ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  currentPlayer = loadPlayer();

  document.addEventListener("click", async (e) => {
    const t = e.target;
    console.log("Click detected on:", t.tagName, t.className, t.dataset);

    // Zone marker
    const marker = t.closest(".map-marker, [data-zone-id]");
    if (marker) {
      const zoneId = marker.dataset.zoneId;
      const zone = zones.find(z => z.id === zoneId);
      if (zone && isZoneUnlocked(zone)) {
        currentView = "zone:" + zoneId;
        renderView();
      } else {
        showMessage("Zone Locked", "Complete previous area first!", 5000);
      }
      return;
    }

    // Entity tap (invasive or native)
const entityEl = t.closest(".invasive-item, .native-item");
if (entityEl) {
  console.log("Entity container clicked:", entityEl.className, entityEl.dataset);

  const zoneId = currentView.split(":")[1];
  const entityId = entityEl.dataset.entityId;
  const entityType = entityEl.dataset.type || "invasive";

  console.log("→ entityId:", entityId, "type:", entityType);

  if (!entityId) {
    console.warn("No entityId on element — skipping tap");
    return;
  }

  let baseEntity;
  if (entityType === "native") {
    baseEntity = nativesByZone[zoneId]?.find(i => i.id === entityId);
  } else {
    baseEntity = invasivesByZone[zoneId]?.find(i => i.id === entityId);
  }

  if (!baseEntity) {
    console.warn(`No base entity found for id ${entityId} in ${entityType}s`);
    return;
  }

  let entity = { ...baseEntity, type: entityType };

  if (baseEntity.isExternal) {
    const category = entityType === "native" ? "natives" : "invasives";
    const fullDef = await loadEntityDefinition(entityId, category);
    if (fullDef) {
      entity = { ...entity, ...fullDef, isExternal: true };
      entity.coins  = Number(fullDef.coins)  ?? baseEntity.coins  ?? (entityType === "native" ? 2 : 5);
      entity.health = Number(fullDef.health) ?? baseEntity.health ?? (entityType === "native" ? 3 : 8);
    } else {
      console.warn(`Failed to load full definition for ${entityId}`);
    }
  }

  console.log(`Processing ${entityType}: ${entity.name || entityId}`);

  // ── Tool condition check (works for both invasives & natives) ───────────────────
const condition = entity.mutable?.onDestroy?.condition;
if (condition) {
  let hasTool = false;
  let toolName = "";

  if (condition === "playerHasItem:spade") {
    hasTool = currentPlayer.inventory?.spade === true;
    toolName = "spade";
  } else if (condition === "playerHasItem:sickle") {
    hasTool = currentPlayer.inventory?.sickle === true;
    toolName = "sickle";
  }

  if (!hasTool) {
    // When tool missing: show fail message instead of dialog tree
    showMessage("Tool Required", entity.mutable.onDestroy.failMessage || `You need a ${toolName} to handle this properly!`, 4000);
    return;
  }
}

// ── Action: removal (invasive) or harvest (native) ──────────────────────────────
if (entityType === "native") {
  // Harvest seed from palm (only reaches here if sickle present)
  currentPlayer.inventory.seeds = (currentPlayer.inventory.seeds || 0) + 1;
  savePlayer();

  showMessage("Harvest Success", "You carefully collected 1 seed from the young palm!", 4000);

  // Visual removal (later: replace with mature palm)
  entityEl.style.transition = "opacity 0.6s ease, transform 0.6s ease";
  entityEl.style.opacity = "0";
  entityEl.style.transform = "scale(0.4) rotate(5deg)";

  setTimeout(() => {
    entityEl.remove();
    showRewardPopup(entityEl, 0, 0, "+1 Seed 🌱", 1600);
  }, 600);

  return;
}

// ── Invasive removal (unchanged) ────────────────────────────────────────────────
const changes = {
  coins: currentPlayer.coins + (entity.coins || 5),
  zones: {
    ...currentPlayer.zones,
    [zoneId]: Math.min(100, (currentPlayer.zones[zoneId] || 0) + (entity.health || 8))
  }
};
updatePlayer(changes);

  let bonusText = "";
  if (entity.mutable?.onDestroy?.drop && Array.isArray(entity.mutable.onDestroy.drop)) {
    const bonusParts = [];
    entity.mutable.onDestroy.drop.forEach(dropRule => {
      const dropEntity = dropRule.entity;
      const count = Number(dropRule.count) || 1;
      const chance = Number(dropRule.chance) || 1;
      if (Math.random() < chance) {
        if (dropEntity === "soil-clump") {
          currentPlayer.inventory.soilClumps = (currentPlayer.inventory.soilClumps || 0) + count;
          bonusParts.push(`+${count} Soil Clump 🌱`);
          console.log(`Gained ${count} soil clump(s)`);
        }
      }
    });
    if (bonusParts.length > 0) bonusText = bonusParts.join("   ");
    savePlayer();
  }

  entityEl.style.transition = "opacity 0.6s ease, transform 0.6s ease";
  entityEl.style.opacity = "0";
  entityEl.style.transform = "scale(0.4) rotate(5deg)";

  setTimeout(() => {
    entityEl.remove();

    showRewardPopup(entityEl, entity.coins || 5, entity.health || 8, bonusText, 1600);

    updateCoinsDisplay();
    updateHealthDisplay(changes.zones[zoneId]);

    const progressFill = document.querySelector(".progress-fill");
    if (progressFill) progressFill.style.width = changes.zones[zoneId] + "%";

    if (document.querySelectorAll(".invasive-item, .native-item").length === 0) {
      showClearModal(zone.name + " cleared! 🌿");
    }
  }, 600);
}

    // Back to map
    if (t.id === "back-to-map") {
      currentView = "island";
      renderView();
    }

    // Toolbox click – open gallery
    if (t.closest(".hud-toolbox")) {
      showToolboxGallery();
      return;
    }

    // Inventory click – open gallery
    if (t.closest(".hud-inventory")) {
      showInventoryGallery();
      return;
    }
  });

  renderView();
  console.log("Game loaded – island map with markers");
});

// ─── Fullscreen & orientation ────────────────────────────────────────────────────
async function enterFullscreen() {
  const elem = document.documentElement;
  try {
    if (elem.requestFullscreen) await elem.requestFullscreen();
    else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen();
    else if (elem.msRequestFullscreen) await elem.msRequestFullscreen();
    console.log("Entered fullscreen");

    const btn = document.getElementById("fullscreen-btn");
    if (btn) btn.style.display = "none";

    if (screen.orientation?.lock) {
      await screen.orientation.lock("landscape").catch(() => {});
    }
  } catch (err) {
    console.error("Fullscreen failed:", err);
  }
}

function checkOrientation() {
  const warning = document.getElementById("portrait-warning");
  if (window.innerHeight > window.innerWidth) {
    document.body.classList.add("portrait-warning-visible");
    warning.style.display = "flex";
  } else {
    document.body.classList.remove("portrait-warning-visible");
    warning.style.display = "none";
  }
}

window.addEventListener("resize", checkOrientation);
window.addEventListener("orientationchange", checkOrientation);

document.addEventListener("DOMContentLoaded", () => {
  checkOrientation();
  const btn = document.getElementById("fullscreen-btn");
  if (btn) btn.addEventListener("click", enterFullscreen);
});