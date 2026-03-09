import { loadPlayer, updatePlayer, savePlayer } from './player.js';
import { zones } from '../data/zones.js';

console.log("Guerrilla Gardening - overworld map with markers + golden UI");

// ───────────────────────────────────────────────────────────
// Centralized way to load external entity definitions
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
const invasivesByZone = {
  beach: [
    { id: "seaweed1", name: "Invasive Seaweed", coins: 3, health: 5 },
    { id: "seaweed2", name: "More Seaweed", coins: 4, health: 6 },
    {
      id: "alien-crabgrass",
      isExternal: true
    }
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

// ─── Floating reward popup – with bonus text support ────────────────────────────
function showRewardPopup(targetElement, coinsDelta = 0, healthDelta = 0, bonusText = "", duration = 1400) {
  if (!targetElement) return;

  const safeCoins  = Number(coinsDelta)  || 0;
  const safeHealth = Number(healthDelta) || 0;

  console.log("Inside popup – safeCoins:", safeCoins, "safeHealth:", safeHealth);

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

  // LOUD DEBUG STYLE (remove later)
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

// ─── Interactive dialog modal ────────────────────────────────────────────────────
function showDialogTree(inv, dialogTree, currentIndex = 0) {
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
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      const nextIndex = parseInt(btn.dataset.next);
      modal.remove();
      showDialogTree(inv, dialogTree, nextIndex);
    });
  });
  modal.querySelector(".dialog-close")?.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    modal.remove();
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
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
    const invasives = invasivesByZone[zoneId] || [];

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
        <h3>Tap to remove invasives:</h3>
        <div id="invasives-list"></div>
        <button id="back-to-map">Back to Map</button>
      </div>
    `;

    const list = document.getElementById("invasives-list");

    let baseInvasives = invasivesByZone[zoneId] || [];

    const enrichedInvasives = await Promise.all(
      baseInvasives.map(async (inv) => {
        if (inv.isExternal) {
          const fullDef = await loadEntityDefinition(inv.id);
          if (fullDef) {
            const merged = { ...inv, ...fullDef, isExternal: true };

            merged.coins  = Number(fullDef.coins)  ?? inv.coins  ?? 5;
            merged.health = Number(fullDef.health) ?? inv.health ?? 8;

            if (typeof fullDef.coins === 'string') {
              console.warn(`coins was string in JSON: "${fullDef.coins}" → converted to ${merged.coins}`);
            }
            if (typeof fullDef.health === 'string') {
              console.warn(`health was string in JSON: "${fullDef.health}" → converted to ${merged.health}`);
            }

            return merged;
          } else {
            console.warn(`Could not load full definition for ${inv.id} — using fallback`);
            return inv;
          }
        }
        return inv;
      })
    );

    list.innerHTML = "";

    enrichedInvasives.forEach((inv) => {
      const invEl = document.createElement("div");
      invEl.className = "invasive-item";
      invEl.dataset.invId = inv.id;

      let imagePath = inv.icon || "";
      if (!imagePath) {
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
          imagePath = "assets/entities/invasives/default.png";
        }
      }

      invEl.innerHTML = `
        <img src="${imagePath}" class="invasive-image" alt="${inv.name}">
        <div class="inv-name">${inv.name}</div>
      `;

      if (inv.tooltip) invEl.title = inv.tooltip;

      list.appendChild(invEl);
    });

    updateCoinsDisplay();
    updateHealthDisplay(health);
  }
}

// ─── Game start ──────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  currentPlayer = loadPlayer();

  document.addEventListener("click", async (e) => {
    const target = e.target;
    console.log("Click detected on:", target.tagName, target.className, target.dataset);

    // Island marker
    const marker = target.closest(".map-marker, [data-zone-id]");
    if (marker) {
      const zoneId = marker.dataset.zoneId;
      const zone = zones.find(z => z.id === zoneId);
      if (zone && isZoneUnlocked(zone)) {
        currentView = "zone:" + zoneId;
        renderView();
      } else {
        showMessage(
          "Zone Locked",
          "You need to clear more invasives in the previous zone first.\nComplete the current area to unlock this one!",
          5000
        );
      }
      return;
    }

    // Invasive tap
    const invEl = target.closest(".invasive-item");
    if (invEl) {
      const zoneId = currentView.split(":")[1];
      const invId = invEl.dataset.invId;

      const baseInv = invasivesByZone[zoneId]?.find(i => i.id === invId);
      if (!baseInv) return;

      let inv = baseInv;

      if (baseInv.isExternal) {
        const fullDef = await loadEntityDefinition(invId);
        if (fullDef) {
          inv = { ...baseInv, ...fullDef, isExternal: true };

          inv.coins = Number(fullDef.coins) ?? baseInv.coins ?? 5;
          inv.health = Number(fullDef.health) ?? baseInv.health ?? 8;

          if (typeof fullDef.coins === 'string') console.warn(`coins string → ${inv.coins}`);
          if (typeof fullDef.health === 'string') console.warn(`health string → ${inv.health}`);
        }
      }

      console.log("Raw inv.coins:", inv.coins, typeof inv.coins);
      console.log("Raw inv.health:", inv.health, typeof inv.health);

      if (inv.mutable?.onDestroy?.condition === "playerHasItem:spade") {
        const hasSpade = currentPlayer.inventory?.spade === true;
        if (!hasSpade) {
          if (inv.mutable?.onInteract?.dialogTree && Array.isArray(inv.mutable.onInteract.dialogTree)) {
            showDialogTree(inv, inv.mutable.onInteract.dialogTree, 0);
          } else {
            showMessage("Tool Required", inv.mutable.onDestroy.failMessage || "You need a spade!", 4000);
          }
          return;
        }
      }

      const changes = {
        coins: currentPlayer.coins + (inv.coins || 5),
        zones: {
          ...currentPlayer.zones,
          [zoneId]: Math.min(100, (currentPlayer.zones[zoneId] || 0) + (inv.health || 8))
        }
      };
      updatePlayer(changes);

      // ── Process drops & collect bonus text ───────────────────────────────────────
      let bonusText = "";
      if (inv.mutable?.onDestroy?.drop && Array.isArray(inv.mutable.onDestroy.drop)) {
        const bonusParts = [];
        inv.mutable.onDestroy.drop.forEach(dropRule => {
          const entity = dropRule.entity;
          const count = Number(dropRule.count) || 1;
          const chance = Number(dropRule.chance) || 1;
          if (Math.random() < chance) {
            if (entity === "soil-clump") {
              currentPlayer.inventory.soilClumps = (currentPlayer.inventory.soilClumps || 0) + count;
              bonusParts.push(`+${count} Soil Clump 🌱`);
              console.log(`Gained ${count} soil clump(s)`);
            }
            // Add other drop types here later
          }
        });
        if (bonusParts.length > 0) {
          bonusText = bonusParts.join("   ");
        }
        savePlayer();
      }

      // Visual feedback
      invEl.style.transition = "opacity 0.6s ease, transform 0.6s ease";
      invEl.style.opacity = "0";
      invEl.style.transform = "scale(0.4) rotate(5deg)";

      setTimeout(() => {
        invEl.remove();

        showRewardPopup(invEl, inv.coins || 5, inv.health || 8, bonusText, 1600);
        console.log("Health delta from invasive:", inv.health);

        updateCoinsDisplay();
        updateHealthDisplay(changes.zones[zoneId]);

        const progressFill = document.querySelector(".progress-fill");
        if (progressFill) {
          progressFill.style.width = changes.zones[zoneId] + "%";
        }

        if (document.querySelectorAll(".invasive-item").length === 0) {
          const zone = zones.find(z => z.id === zoneId);
          showClearModal(zone.name + " cleared of invasives! 🌿");
        }
      }, 600);
    }

    // Back to map
    if (target.id === "back-to-map") {
      currentView = "island";
      renderView();
    }

    // Toolbox click – open gallery
    if (target.closest(".hud-toolbox")) {
      showToolboxGallery();
      return;
    }

    // Inventory click – open gallery
    if (target.closest(".hud-inventory")) {
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