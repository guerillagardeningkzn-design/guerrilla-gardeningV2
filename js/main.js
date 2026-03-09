import { loadPlayer, updatePlayer, savePlayer } from './player.js';
import { zones } from '../data/zones.js';

console.log("Guerrilla Gardening - overworld map with markers + golden UI");

// ───────────────────────────────────────────────────────────
// Centralized entity loader
// ───────────────────────────────────────────────────────────

const entityCache = new Map();

async function loadEntityDefinition(entityId, category = "invasives") {
  if (entityCache.has(entityId)) return entityCache.get(entityId);

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

// ─── Zone data ───────────────────────────────────────────────────────────────────
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
  return (currentPlayer.zones[req.zone] || 0) >= req.health;
}

function updateCoinsDisplay() {
  const el = document.getElementById("coins-display");
  if (el) {
    el.textContent = currentPlayer.coins;
    el.closest(".hud-coins")?.classList.add("pulse");
    setTimeout(() => el.closest(".hud-coins")?.classList.remove("pulse"), 800);
  }
}

function updateHealthDisplay(health) {
  document.querySelector(".progress-fill")?.style.setProperty("width", health + "%");
  document.querySelector(".health-text")?.replaceChildren(`Health: ${health}%`);
}

// ─── Modals ──────────────────────────────────────────────────────────────────────
function showClearModal(message) {
  const modal = document.createElement("div");
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:9999;opacity:0;transition:opacity 0.4s";
  modal.innerHTML = `
    <div style="background:rgba(30,50,30,0.95);border:3px solid #4CAF50;border-radius:16px;padding:32px 48px;max-width:80%;text-align:center;color:white;box-shadow:0 10px 30px rgba(0,0,0,0.7);transform:scale(0.9);transition:transform 0.4s">
      <h2 style="margin-bottom:16px;font-size:1.8rem">Area Cleared!</h2>
      <p style="font-size:1.2rem;margin-bottom:24px">${message}</p>
      <button id="modal-ok" style="padding:12px 32px;background:#4CAF50;color:white;border:none;border-radius:12px;font-size:1.2rem;font-weight:bold;cursor:pointer;box-shadow:0 4px 10px rgba(0,0,0,0.4)">OK</button>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => { modal.style.opacity = "1"; modal.firstElementChild.style.transform = "scale(1)"; }, 50);

  modal.querySelector("#modal-ok").onclick = () => modal.remove();
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
}

function showMessage(title = "Notice", message, durationMs = 0) {
  const modal = document.createElement("div");
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:9998;opacity:0;transition:opacity 0.4s";

  modal.innerHTML = `
    <div style="background:rgba(30,50,30,0.95);border:2px solid #4CAF50;border-radius:16px;padding:24px 32px;max-width:85%;width:320px;text-align:center;color:#e8f5e9;box-shadow:0 8px 24px rgba(0,0,0,0.6);transform:scale(0.92);transition:transform 0.3s">
      ${title ? `<h3 style="margin:0 0 12px;font-size:1.4rem;color:#81C784">${title}</h3>` : ''}
      <p style="margin:0 0 20px;font-size:1.1rem;line-height:1.4">${message}</p>
      <button class="close-btn" style="padding:10px 28px;background:#4CAF50;color:white;border:none;border-radius:12px;font-size:1rem;font-weight:600;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,0.4)">Close</button>
    </div>
  `;

  document.body.appendChild(modal);
  requestAnimationFrame(() => { modal.style.opacity = "1"; modal.firstElementChild.style.transform = "scale(1)"; });

  const close = () => {
    modal.style.opacity = "0";
    modal.firstElementChild.style.transform = "scale(0.92)";
    setTimeout(() => modal.remove(), 400);
  };

  modal.querySelector(".close-btn").onclick = close;
  modal.onclick = e => { if (e.target === modal) close(); };

  if (durationMs > 0) setTimeout(close, durationMs);
}

// ─── Reward popup ────────────────────────────────────────────────────────────────
function showRewardPopup(targetElement, coinsDelta = 0, healthDelta = 0, bonusText = "", duration = 1400) {
  if (!targetElement) return;

  const safeCoins  = Number(coinsDelta)  || 0;
  const safeHealth = Number(healthDelta) || 0;

  console.log("Reward popup → coins:", safeCoins, "health:", safeHealth, "bonus:", bonusText);

  const popup = document.createElement("div");

  let parts = [];
  if (safeCoins)  parts.push(`<span style="color:${safeCoins>0?'#FFD700':'#ff5252'}">${safeCoins>0?'+':'-'}${Math.abs(safeCoins)} 🪙</span>`);
  if (safeHealth) parts.push(`<span style="color:${safeHealth>0?'#4CAF50':'#ff5252'}">${safeHealth>0?'+':'-'}${Math.abs(safeHealth)}% 🌿</span>`);
  if (bonusText)  parts.push(`<span style="color:#8D6E63">${bonusText}</span>`);

  popup.innerHTML = parts.join("   ") || "No reward";

  popup.style.cssText = `
    position:fixed !important; left:50% !important; top:30% !important; transform:translate(-50%,-50%) !important;
    background:#ff1744 !important; color:white !important; font-size:3rem !important; font-weight:bold !important;
    padding:40px 60px !important; border:6px solid yellow !important; border-radius:20px !important; z-index:99999 !important;
    box-shadow:0 0 40px rgba(255,0,0,0.8) !important; opacity:0; pointer-events:none; transition:all 1.5s ease;
  `;

  document.body.appendChild(popup);
  console.log("Popup appended →", popup.innerHTML);

  requestAnimationFrame(() => popup.style.opacity = "1");

  setTimeout(() => {
    popup.style.opacity = "0";
    setTimeout(() => popup.remove(), 500);
  }, duration);
}

// ─── Gallery modals ──────────────────────────────────────────────────────────────
function showToolboxGallery() {
  const tools = [];
  if (currentPlayer.inventory.spade)    tools.push("Spade – Dig tough invasives");
  if (currentPlayer.inventory.scissors) tools.push("Scissors – Cut vines");

  const level    = currentPlayer.inventory.toolboxLevel || 1;
  const capacity = level * 5;

  let html = `<h3>Toolbox (Lv ${level} – ${capacity} slots)</h3>`;
  html += tools.length ? tools.map(t => `<div class="gallery-item">${t}</div>`).join('') : '<p style="color:#ff9800">No tools yet</p>';
  html += '<p>Upgrade to carry more!</p>';

  showMessage("Toolbox", html, 0);
}

function showInventoryGallery() {
  const items = [
    `Seeds: ${currentPlayer.inventory.seeds || 0}`,
    `Soil Clumps: ${currentPlayer.inventory.soilClumps || 0}`,
    `Fertilizer: ${currentPlayer.inventory.fertilizer || 0}`,
    `Clay Balls: ${currentPlayer.inventory.clayBalls || 0}`
  ];

  let html = '<h3>Inventory</h3>';
  html += items.map(i => `<div class="gallery-item">${i}</div>`).join('');
  if (items.every(i => i.includes('0'))) html += '<p style="color:#ff9800">Empty — keep clearing!</p>';

  showMessage("Inventory", html, 0);
}

// ─── Render ──────────────────────────────────────────────────────────────────────
async function renderView() {
  const container = document.getElementById("game-container");
  if (!container) return;
  container.innerHTML = "";

  if (currentView === "island") {
    container.innerHTML = `
      <img src="assets/backgrounds/island-full.jpg" class="island-bg-img" alt="Island">
      <div id="map-markers"></div>
    `;

    const markers = document.getElementById("map-markers");

    zoneMarkers.forEach(m => {
      const zone = zones.find(z => z.id === m.id);
      const unlocked = isZoneUnlocked(zone);

      const el = document.createElement("div");
      el.className = "map-marker" + (unlocked ? "" : " locked");
      el.style.left = m.left + "%";
      el.style.top  = m.top  + "%";
      el.dataset.zoneId = m.id;
      el.innerHTML = `<span class="marker-label">${m.name}</span>`;

      if (!unlocked) el.style.opacity = "0.5";

      markers.appendChild(el);
    });

    updateCoinsDisplay();
  } else if (currentView.startsWith("zone:")) {
    const zoneId = currentView.split(":")[1];
    const zone = zones.find(z => z.id === zoneId);
    if (!zone || !isZoneUnlocked(zone)) {
      currentView = "island";
      return renderView();
    }

    const health = currentPlayer.zones[zoneId] || 0;

    let bg = "assets/backgrounds/global/sky-overcast.jpg";
    if (zoneId === "beach")    bg = "assets/backgrounds/beach/main-day.jpg";
    if (zoneId === "forest")   bg = "assets/backgrounds/forest/main-misty.jpg";
    if (zoneId === "mountain") bg = "assets/backgrounds/mountain/main-rocky.jpg";

    container.innerHTML = `
      <img src="${bg}" class="zone-bg-img" alt="${zone.name}">
      <div class="zone-content">
        <h2>${zone.name}</h2>
        <p>${zone.description}</p>
        <div class="progress-bar"><div class="progress-fill" style="width:${health}%"></div></div>
        <p class="health-text">Health: ${health}%</p>
        <h3>Tap entities:</h3>
        <div id="entities-list"></div>
        <button id="back-to-map">Back</button>
      </div>
    `;

    const list = document.getElementById("entities-list");

    // ── Invasives ────────────────────────────────────────────────────────────────
    const enrichedInvasives = await Promise.all(
      (invasivesByZone[zoneId] || []).map(async inv => {
        if (inv.isExternal) {
          const def = await loadEntityDefinition(inv.id, "invasives");
          return def ? { ...inv, ...def, isExternal: true, type: "invasive" } : inv;
        }
        return { ...inv, type: "invasive" };
      })
    );

    // ── Natives ──────────────────────────────────────────────────────────────────
    const enrichedNatives = await Promise.all(
      (nativesByZone[zoneId] || []).map(async nat => {
        if (nat.isExternal) {
          const def = await loadEntityDefinition(nat.id, "natives");
          return def ? { ...nat, ...def, isExternal: true, type: "native" } : nat;
        }
        return { ...nat, type: "native" };
      })
    );

    const allEntities = [...enrichedInvasives, ...enrichedNatives];

    list.innerHTML = "";
    allEntities.forEach(entity => {
      const el = document.createElement("div");
      el.className = entity.type === "native" ? "native-item" : "invasive-item";
      el.dataset.entityId = entity.id;
      el.dataset.type = entity.type;

      let imgSrc = entity.icon || "";
      if (!imgSrc) {
        const n = (entity.name || entity.id || "").toLowerCase();
        if (n.includes("palm") || n.includes("baby-palm")) imgSrc = "assets/entities/natives/palm/baby-palm.png";
        else if (n.includes("seaweed")) imgSrc = "assets/entities/invasives/seaweed/seaweed-01.png";
        else if (n.includes("crabgrass") || n.includes("alien")) imgSrc = "assets/entities/invasives/crabgrass/crabgrass-01.png";
        else if (n.includes("vine")) imgSrc = "assets/entities/invasives/vine/vine-choking-01.png";
        else if (n.includes("thistle")) imgSrc = "assets/entities/invasives/thistle/thistle-thorny-01.png";
        else if (n.includes("weed")) imgSrc = "assets/entities/invasives/weed-foreign/weed-foreign-01.png";
        else imgSrc = "assets/entities/default.png";
      }

      el.innerHTML = `
        <img src="${imgSrc}" class="entity-image" alt="${entity.name || entity.id}">
        <div class="entity-name">${entity.name || entity.id}</div>
      `;

      if (entity.tooltip) el.title = entity.tooltip;

      list.appendChild(el);
    });

    updateCoinsDisplay();
    updateHealthDisplay(health);
  }
}

// ─── Unified tap handler ────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  currentPlayer = loadPlayer();

  document.addEventListener("click", async e => {
    const t = e.target;
    console.log("Click:", t.tagName, t.className, t.dataset);

    // Zone marker
    if (t.closest(".map-marker, [data-zone-id]")) {
      const zoneId = t.closest("[data-zone-id]").dataset.zoneId;
      const zone = zones.find(z => z.id === zoneId);
      if (zone && isZoneUnlocked(zone)) {
        currentView = "zone:" + zoneId;
        renderView();
      } else {
        showMessage("Locked", "Clear previous area first", 5000);
      }
      return;
    }

    // ── Entity tap (invasive or native) ────────────────────────────────────────────
const entityEl = target.closest(".invasive-item, .native-item");
if (entityEl) {
  console.log("Entity container clicked:", entityEl.className);
  console.log("Entity element found:", entityEl);
console.log("entityId from dataset:", entityEl.dataset.entityId);
console.log("entityType from dataset:", entityEl.dataset.type);

  const zoneId = currentView.split(":")[1];
  const entityId = entityEl.dataset.entityId;
  const entityType = entityEl.dataset.type || "invasive";

  console.log("→ entityId:", entityId, "type:", entityType);

  if (!entityId) {
    console.warn("No entityId on element — skipping");
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
      console.warn(`Failed to load full def for ${entityId}`);
    }
  }

  console.log(`Processing ${entityType}: ${entity.name || entityId}`);

  // Native protection
  if (entityType === "native") {
    showMessage("Protected Plant", "Native species — protect it, don't remove!", 3000);
    return;
  }

  // Invasive removal (rest of your logic here, unchanged)
  if (entity.mutable?.onDestroy?.condition === "playerHasItem:spade") {
    const hasSpade = currentPlayer.inventory?.spade === true;
    if (!hasSpade) {
      if (entity.mutable?.onInteract?.dialogTree && Array.isArray(entity.mutable.onInteract.dialogTree)) {
        showDialogTree(entity, entity.mutable.onInteract.dialogTree, 0);
      } else {
        showMessage("Tool Required", entity.mutable.onDestroy.failMessage || "Need spade!", 4000);
      }
      return;
    }
  }

  // Reward & removal (your original code here)
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
    console.log("Health delta from entity:", entity.health);

    updateCoinsDisplay();
    updateHealthDisplay(changes.zones[zoneId]);

    const progressFill = document.querySelector(".progress-fill");
    if (progressFill) progressFill.style.width = changes.zones[zoneId] + "%";

    if (document.querySelectorAll(".invasive-item, .native-item").length === 0) {
      showClearModal(zone.name + " cleared! 🌿");
    }
  }, 600);
}
    // Back button
    if (t.id === "back-to-map") {
      currentView = "island";
      renderView();
    }

    // Galleries
    if (t.closest(".hud-toolbox")) return showToolboxGallery();
    if (t.closest(".hud-inventory")) return showInventoryGallery();
  });

  renderView();
  console.log("Game loaded – island map with markers");
});

// ─── Fullscreen & orientation ────────────────────────────────────────────────────
async function enterFullscreen() {
  const el = document.documentElement;
  try {
    await (el.requestFullscreen?.() || el.webkitRequestFullscreen?.() || el.msRequestFullscreen?.());
    document.getElementById("fullscreen-btn")?.style.setProperty("display", "none");
    screen.orientation?.lock("landscape").catch(() => {});
  } catch (e) {
    console.error("Fullscreen failed", e);
  }
}

function checkOrientation() {
  const w = document.getElementById("portrait-warning");
  if (window.innerHeight > window.innerWidth) {
    document.body.classList.add("portrait-warning-visible");
    w.style.display = "flex";
  } else {
    document.body.classList.remove("portrait-warning-visible");
    w.style.display = "none";
  }
}

window.addEventListener("resize", checkOrientation);
window.addEventListener("orientationchange", checkOrientation);
document.addEventListener("DOMContentLoaded", () => {
  checkOrientation();
  document.getElementById("fullscreen-btn")?.addEventListener("click", enterFullscreen);
});