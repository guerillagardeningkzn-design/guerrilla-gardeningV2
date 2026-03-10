import { loadPlayer, updatePlayer, savePlayer } from './player.js';
import { zones } from '../data/zones.js';

console.log("Guerrilla Gardening - overworld map with golden UI");

// ───────────────────────────────────────────────────────────
// Centralized way to load external entity definitions
// ───────────────────────────────────────────────────────────

const entityCache = new Map();

async function loadEntityDefinition(entityId, category) {
  if (entityCache.has(entityId)) {
    return entityCache.get(entityId);
  }

  var path = 'data/entities/' + (category || "invasives") + '/' + entityId + '.json';

  try {
    var response = await fetch(path);
    if (!response.ok) throw new Error('Entity ' + entityId + ' not found in ' + category);
    var data = await response.json();
    entityCache.set(entityId, data);
    return data;
  } catch (err) {
    console.error("Failed to load entity: " + entityId + " from " + path, err);
    return null;
  }
}

function generateSeedDNA(parentEntity) {
  // Start with parent's defaults (or fallback to sane values)
  var defaults = parentEntity.dnaDefaults || {
    rarity: "common",
    growthRate: 1.0,
    waterNeed: "medium",
    lightNeed: "high",
    nutrientNeed: "low",
    climateZones: ["beach"],
    healthBonus: 1.0
  };

  // Roll rarity (simple percentages — adjust as you like)
  var roll = Math.random();
  var rarity = "common";
  if (roll < 0.01) rarity = "legendary";
  else if (roll < 0.05) rarity = "heirloom";
  else if (roll < 0.20) rarity = "rare";

  // Create DNA object
  var dna = {
    rarity: rarity,
    growthRate: defaults.growthRate,
    waterNeed: defaults.waterNeed,
    lightNeed: defaults.lightNeed,
    nutrientNeed: defaults.nutrientNeed,
    climateZones: defaults.climateZones.slice(), // copy array
    healthBonus: defaults.healthBonus
  };

  // Apply rarity modifiers
  if (rarity === "rare") {
    dna.growthRate *= 1.3;
    dna.waterNeed = "low";
  } else if (rarity === "heirloom") {
    dna.healthBonus *= 1.5;
  } else if (rarity === "legendary") {
    dna.growthRate *= 2.0;
    dna.nutrientNeed = "low";
    dna.climateZones.push("forest"); // example expansion
  }

  // Optional: small random variation
  dna.growthRate += (Math.random() * 0.2 - 0.1); // ±10%

  console.log("Generated seed DNA for " + parentEntity.id + ":", dna);

  return dna;
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
  beach: [
    { id: "baby-palm", isExternal: true }
  ],
  forest: [],
  mountain: []
};

var zoneMarkers = [
  { id: "beach", name: "Sunny Beach", left: 20, top: 75 },
  { id: "forest", name: "Misty Forest", left: 55, top: 40 },
  { id: "mountain", name: "Rocky Mountain", left: 85, top: 25 }
];

// ─── Helpers ─────────────────────────────────────────────────────────────────────
function isZoneUnlocked(zone) {
  if (!zone.unlockRequirement) return true;
  var req = zone.unlockRequirement;
  var reqHealth = currentPlayer.zones[req.zone] || 0;
  return reqHealth >= req.health;
}

function updateCoinsDisplay() {
  var coinsEl = document.getElementById("coins-display");
  if (coinsEl) {
    coinsEl.textContent = currentPlayer.coins;
    var coinContainer = coinsEl.closest(".hud-coins");
    if (coinContainer) {
      coinContainer.classList.add("pulse");
      setTimeout(function() { coinContainer.classList.remove("pulse"); }, 800);
    }
  }
}

function updateHealthDisplay(health) {
  var fill = document.querySelector(".progress-fill");
  var text = document.querySelector(".health-text");
  if (fill) fill.style.width = health + "%";
  if (text) text.textContent = "Health: " + health + "%";
}

// ─── Modals ──────────────────────────────────────────────────────────────────────
function showClearModal(message) {
  var modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.background = "rgba(0, 0, 0, 0.75)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "9999";
  modal.style.opacity = "0";
  modal.style.transition = "opacity 0.4s ease";

  var inner = document.createElement("div");
  inner.style.background = "rgba(30, 50, 30, 0.95)";
  inner.style.border = "3px solid #4CAF50";
  inner.style.borderRadius = "16px";
  inner.style.padding = "32px 48px";
  inner.style.maxWidth = "80%";
  inner.style.textAlign = "center";
  inner.style.color = "white";
  inner.style.boxShadow = "0 10px 30px rgba(0,0,0,0.7)";
  inner.style.transform = "scale(0.9)";
  inner.style.transition = "transform 0.4s ease";

  inner.innerHTML = 
    '<h2 style="margin-bottom:16px;font-size:1.8rem;">Area Cleared!</h2>' +
    '<p style="font-size:1.2rem;margin-bottom:24px;">' + message + '</p>' +
    '<button id="modal-ok-btn" style="padding:12px 32px;background:#4CAF50;color:white;border:none;border-radius:12px;font-size:1.2rem;font-weight:bold;cursor:pointer;box-shadow:0 4px 10px rgba(0,0,0,0.4);">OK</button>';

  modal.appendChild(inner);
  document.body.appendChild(modal);

  setTimeout(function() {
    modal.style.opacity = "1";
    inner.style.transform = "scale(1)";
  }, 50);

  inner.querySelector("#modal-ok-btn").addEventListener("click", function() {
    modal.style.opacity = "0";
    inner.style.transform = "scale(0.9)";
    setTimeout(function() { modal.remove(); }, 400);
  });

  modal.addEventListener("click", function(e) {
    if (e.target === modal) {
      modal.style.opacity = "0";
      inner.style.transform = "scale(0.9)";
      setTimeout(function() { modal.remove(); }, 400);
    }
  });
}

function showMessage(title, message, durationMs) {
  var modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.background = "rgba(0, 0, 0, 0.65)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "9998";
  modal.style.opacity = "0";
  modal.style.transition = "opacity 0.4s ease";

  var innerHTML = '<div style="background: rgba(30, 50, 30, 0.95);border:2px solid #4CAF50;border-radius:16px;padding:24px 32px;max-width:85%;width:320px;text-align:center;color:#e8f5e9;box-shadow:0 8px 24px rgba(0,0,0,0.6);transform:scale(0.92);transition:transform 0.3s ease;">';

  if (title) {
    innerHTML += '<h3 style="margin:0 0 12px;font-size:1.4rem;color:#81C784;">' + title + '</h3>';
  }

  innerHTML += '<p style="margin:0 0 20px;font-size:1.1rem;line-height:1.4;">' + message + '</p>';
  innerHTML += '<button class="close-msg-btn" style="padding:10px 28px;background:#4CAF50;color:white;border:none;border-radius:12px;font-size:1rem;font-weight:600;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,0.4);">Close</button>';
  innerHTML += '</div>';

  modal.innerHTML = innerHTML;
  document.body.appendChild(modal);

  requestAnimationFrame(function() {
    modal.style.opacity = "1";
    modal.querySelector("div").style.transform = "scale(1)";
  });

  var close = function() {
    modal.style.opacity = "0";
    modal.querySelector("div").style.transform = "scale(0.92)";
    setTimeout(function() { modal.remove(); }, 400);
  };

  modal.querySelector(".close-msg-btn").addEventListener("click", close);
  modal.addEventListener("click", function(e) {
    if (e.target === modal) close();
  });

  if (durationMs > 0) setTimeout(close, durationMs);
}

// ─── Reward popup ────────────────────────────────────────────────────────────────
function showRewardPopup(targetElement, coinsDelta, healthDelta, bonusText, duration) {
  if (!targetElement) return;

  var safeCoins = Number(coinsDelta) || 0;
  var safeHealth = Number(healthDelta) || 0;

  console.log("Reward popup → coins:", safeCoins, "health:", safeHealth, "bonus:", bonusText);

  var popup = document.createElement("div");

  var parts = [];
  if (safeCoins !== 0) {
    var sign = safeCoins > 0 ? "+" : "";
    var color = safeCoins > 0 ? '#FFD700' : '#ff5252';
    parts.push('<span style="color: ' + color + ';">' + sign + Math.abs(safeCoins) + ' 🪙</span>');
  }
  if (safeHealth !== 0) {
    var sign = safeHealth > 0 ? "+" : "";
    var color = safeHealth > 0 ? '#4CAF50' : '#ff5252';
    parts.push('<span style="color: ' + color + ';">' + sign + Math.abs(safeHealth) + '% 🌿</span>');
  }
  if (bonusText) {
    parts.push('<span style="color: #8D6E63;">' + bonusText + '</span>');
  }

  popup.innerHTML = parts.length > 0 ? parts.join("   ") : "[No reward]";

  popup.style.cssText = 
    'position: fixed !important;' +
    'left: 50% !important;' +
    'top: 30% !important;' +
    'transform: translate(-50%, -50%) !important;' +
    'background: #ff1744 !important;' +
    'color: white !important;' +
    'font-size: 3rem !important;' +
    'font-weight: bold !important;' +
    'padding: 40px 60px !important;' +
    'border: 6px solid yellow !important;' +
    'border-radius: 20px !important;' +
    'z-index: 99999 !important;' +
    'box-shadow: 0 0 40px rgba(255,0,0,0.8) !important;' +
    'opacity: 0;' +
    'pointer-events: none;' +
    'transition: all 1.5s ease;';

  document.body.appendChild(popup);
  console.log("Popup appended – innerHTML:", popup.innerHTML);

  requestAnimationFrame(function() {
    void popup.offsetWidth;
    popup.style.opacity = "1";
  });

  setTimeout(function() {
    popup.style.opacity = "0";
    setTimeout(function() { popup.remove(); }, 500);
  }, duration || 1400);
}

// ─── Toolbox gallery ─────────────────────────────────────────────────────────────
function showToolboxGallery() {
  var tools = [];
  if (currentPlayer.inventory.spade)    tools.push("Spade – Dig tough invasives");
  if (currentPlayer.inventory.sickle)   tools.push("Sickle – Harvest delicate natives");
  if (currentPlayer.inventory.scissors) tools.push("Scissors – Cut vines");

  var level = currentPlayer.inventory.toolboxLevel || 1;
  var capacity = level * 5;

  var html = '<h3>Toolbox (Level ' + level + ' – Capacity: ' + capacity + ')</h3>';

  if (tools.length === 0) {
    html += '<p style="color: #ff9800;">No tools yet. Find or craft some!</p>';
  } else {
    html += tools.map(function(tool) { return '<div class="gallery-item">' + tool + '</div>'; }).join('');
  }

  html += '<p>Upgrade your toolbox to carry more tools!</p>';

  showMessage("Toolbox", html, 0);
}

// ─── Inventory & Seed Packs ─────────────────────────────────────────────────────
function showInventoryGallery() {
  var items = [
    'Soil Clumps: ' + (currentPlayer.inventory.soilClumps || 0),
    'Fertilizer: ' + (currentPlayer.inventory.fertilizer || 0),
    'Clay Balls: ' + (currentPlayer.inventory.clayBalls || 0)
  ];

  var html = '<h3>Inventory</h3>';
  html += items.map(function(item) { return '<div class="gallery-item">' + item + '</div>'; }).join('');

  if (items.every(function(i) { return i.includes('0'); })) {
    html += '<p style="color: #ff9800;">Your inventory is empty. Keep harvesting!</p>';
  }

  html += 
    '<div style="margin-top:20px;text-align:center;">' +
      '<button id="open-seed-packs" style="padding:12px 28px;background:#4CAF50;color:white;border:none;border-radius:12px;font-size:1rem;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,0.4);">Open Seed Packs</button>' +
      '<p style="font-size:0.9rem;color:#81C784;margin-top:8px;">View your harvested seed varieties here</p>' +
    '</div>';

  showMessage("Inventory", html, 0);

  setTimeout(function() {
    var btn = document.getElementById("open-seed-packs");
    if (btn) {
      btn.addEventListener("click", function() {
        showSeedPacks();
      });
    }
  }, 100);
}

function showSeedPacks() {
  console.log("Opening Seed Packs — current seeds:", currentPlayer.inventory.seeds);

  var seedSummary = [];
  var totalSeeds = 0;

  var seedsData = currentPlayer.inventory.seeds || {};

  Object.keys(seedsData).forEach(function(parentId) {
    var seedArray = seedsData[parentId];
    if (Array.isArray(seedArray) ) {
      var count = seedArray.length;
      if (count > 0) {
        totalSeeds += count;
        var displayName = parentId
          .replace(/-/g, ' ')
          .split(' ')
          .map(function(word) { return word.charAt(0).toUpperCase() + word.slice(1); })
          .join(' ');
        seedSummary.push(displayName + ' Seeds: ' + count);
      }
    }
  });

  var html = '<h3>Seed Packs</h3>';

  if (totalSeeds === 0) {
    html += '<p style="color: #ff9800;">No seeds harvested yet. Keep collecting from natives!</p>';
  } else {
    html += '<p style="margin-bottom:16px;">Your collected seed varieties:</p>';
    html += seedSummary.map(function(line) { return '<div class="gallery-item">' + line + '</div>'; }).join('');
    html += '<p style="margin-top:16px;font-weight:bold;">Total seeds: ' + totalSeeds + '</p>';
  }

  html += '<p style="font-size:0.9rem;color:#81C784;margin-top:20px;">(Rarity & DNA details coming soon — tap to plant in future updates)</p>';

  showMessage("Seed Packs", html, 0);
}

// ─── Render ──────────────────────────────────────────────────────────────────────
async function renderView() {
  var container = document.getElementById("game-container");
  if (!container) return;
  container.innerHTML = "";

  if (currentView === "island") {
    container.innerHTML = 
      '<img src="assets/backgrounds/island-full.jpg" class="island-bg-img" alt="Island Map">' +
      '<div id="map-markers"></div>';

    var markersContainer = document.getElementById("map-markers");

    zoneMarkers.forEach(function(marker) {
      var zone = zones.find(function(z) { return z.id === marker.id; });
      var unlocked = isZoneUnlocked(zone);

      var markerEl = document.createElement("div");
      markerEl.className = "map-marker" + (unlocked ? "" : " locked");
      markerEl.style.left = marker.left + '%';
      markerEl.style.top = marker.top + '%';
      markerEl.dataset.zoneId = marker.id;
      markerEl.innerHTML = '<span class="marker-label">' + marker.name + '</span>';

      if (!unlocked) markerEl.style.opacity = 0.5;

      markersContainer.appendChild(markerEl);
    });

    updateCoinsDisplay();
  } else if (currentView.indexOf("zone:") === 0) {
    var zoneId = currentView.split(":")[1];
    var zone = zones.find(function(z) { return z.id === zoneId; });

    // ← DIAGNOSTIC LOG INSERTED HERE (shows health on every zone entry)
    console.log("Entering zone " + zoneId + " — current health: " + (currentPlayer.zones[zoneId] || 0));

    if (!zone || !isZoneUnlocked(zone)) {
      currentView = "island";
      renderView();
      return;
    }

    var health = currentPlayer.zones[zoneId] || 0;

    var bgPath = "assets/backgrounds/global/sky-overcast.jpg";
    if (zoneId === "beach") bgPath = "assets/backgrounds/beach/main-day.jpg";
    else if (zoneId === "forest") bgPath = "assets/backgrounds/forest/main-misty.jpg";
    else if (zoneId === "mountain") bgPath = "assets/backgrounds/mountain/main-rocky.jpg";

    container.innerHTML = 
      '<img src="' + bgPath + '" class="zone-bg-img" alt="' + zone.name + ' background">' +
      '<div class="zone-content">' +
        '<h2>' + zone.name + '</h2>' +
        '<p>' + zone.description + '</p>' +
        '<div class="progress-bar"><div class="progress-fill" style="width: ' + health + '%"></div></div>' +
        '<p class="health-text">Health: ' + health + '%</p>' +
        '<h3>Tap to interact:</h3>' +
        '<div id="entities-list"></div>' +
        '<button id="back-to-map">Back to Map</button>' +
      '</div>';

    var list = document.getElementById("entities-list");

    // ── Load invasives ──────────────────────────────────────────────────────────────
    var baseInvasives = invasivesByZone[zoneId] || [];
    var enrichedInvasives = await Promise.all(
      baseInvasives.map(async function(inv) {
        if (inv.isExternal) {
          var fullDef = await loadEntityDefinition(inv.id, "invasives");
          if (fullDef) {
            return { ...inv, ...fullDef, isExternal: true, type: "invasive" };
          }
          return { ...inv, type: "invasive" };
        }
        return { ...inv, type: "invasive" };
      })
    );

    // ── Load natives ────────────────────────────────────────────────────────────────
    var baseNatives = nativesByZone[zoneId] || [];
    var enrichedNatives = await Promise.all(
      baseNatives.map(async function(nat) {
        if (nat.isExternal) {
          var fullDef = await loadEntityDefinition(nat.id, "natives");
          if (fullDef) {
            return { ...nat, ...fullDef, isExternal: true, type: "native" };
          }
          return { ...nat, type: "native" };
        }
        return { ...nat, type: "native" };
      })
    );

    // ── Combine & render ────────────────────────────────────────────────────────────
    var allEntities = enrichedInvasives.concat(enrichedNatives);

    list.innerHTML = "";
    allEntities.forEach(function(entity) {
      var el = document.createElement("div");
      el.className = entity.type === "native" ? "native-item" : "invasive-item";
      el.dataset.entityId = entity.id;
      el.dataset.type = entity.type;

      var imagePath = entity.icon || "";
      if (!imagePath) {
        var nameLower = (entity.name || entity.id || "").toLowerCase();
        if (nameLower.indexOf("palm") !== -1 || nameLower.indexOf("baby-palm") !== -1) {
          imagePath = "assets/entities/natives/palm/palm-baby.png";
        } else if (nameLower.indexOf("seaweed") !== -1) {
          imagePath = "assets/entities/invasives/seaweed/seaweed-01.png";
        } else if (nameLower.indexOf("crabgrass") !== -1 || nameLower.indexOf("alien") !== -1) {
          imagePath = "assets/entities/invasives/crabgrass/crabgrass-01.png";
        } else if (nameLower.indexOf("vine") !== -1) {
          imagePath = "assets/entities/invasives/vine/vine-choking-01.png";
        } else if (nameLower.indexOf("thistle") !== -1) {
          imagePath = "assets/entities/invasives/thistle/thistle-thorny-01.png";
        } else if (nameLower.indexOf("weed") !== -1) {
          imagePath = "assets/entities/invasives/weed-foreign/weed-foreign-01.png";
        } else {
          imagePath = "assets/entities/default.png";
        }
      }

      el.innerHTML = 
        '<img src="' + imagePath + '" class="entity-image" alt="' + (entity.name || entity.id) + '">' +
        '<div class="entity-name">' + (entity.name || entity.id) + '</div>';

      if (entity.tooltip) el.title = entity.tooltip;

      list.appendChild(el);
    });

    updateCoinsDisplay();
    updateHealthDisplay(health);
  }
}

// ─── Game start & click handler ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function() {
  currentPlayer = loadPlayer();

  document.addEventListener("click", async function(e) {
    var t = e.target;
    console.log("Click detected on:", t.tagName, t.className, t.dataset);

    // PRE-CLICK: Log ALL zones health right when the click arrives
    console.log("[PRE-CLICK] All zones health:", JSON.stringify(currentPlayer.zones));

    // Zone marker (entering a zone)
    var marker = t.closest(".map-marker, [data-zone-id]");
    if (marker) {
      e.preventDefault(); // Prevent any default navigation/reload

      var zoneId = marker.dataset.zoneId;
      var zone = zones.find(function(z) { return z.id === zoneId; });

      if (zone && isZoneUnlocked(zone)) {
        console.log("Switching to zone: " + zoneId + " — health before switch: " + (currentPlayer.zones[zoneId] || 0));
        savePlayer(currentPlayer);
        currentView = "zone:" + zoneId;
        renderView();

        // POST-SWITCH: Log full state after view change
        console.log("[POST-SWITCH] All zones health after entering " + zoneId + ":", JSON.stringify(currentPlayer.zones));
      } else {
        showMessage("Zone Locked", "Complete previous area first!", 5000);
      }
      return;
    }

    // Entity tap (invasive or native)
    var entityEl = t.closest(".invasive-item, .native-item");
    if (entityEl) {
      console.log("Entity container clicked:", entityEl.className, entityEl.dataset);

      var zoneId = currentView.split(":")[1];
      var entityId = entityEl.dataset.entityId;
      var entityType = entityEl.dataset.type || "invasive";

      console.log("→ entityId:", entityId, "type:", entityType);

      if (!entityId) {
        console.warn("No entityId on element — skipping tap");
        return;
      }

      var baseEntity;
      if (entityType === "native") {
        baseEntity = nativesByZone[zoneId] ? nativesByZone[zoneId].find(function(i) { return i.id === entityId; }) : null;
      } else {
        baseEntity = invasivesByZone[zoneId] ? invasivesByZone[zoneId].find(function(i) { return i.id === entityId; }) : null;
      }

      if (!baseEntity) {
        console.warn("No base entity found for id " + entityId + " in " + entityType + "s");
        return;
      }

      var entity = Object.assign({}, baseEntity, { type: entityType });

      if (baseEntity.isExternal) {
        var category = entityType === "native" ? "natives" : "invasives";
        var fullDef = await loadEntityDefinition(entityId, category);
        if (fullDef) {
          entity = Object.assign(entity, fullDef, { isExternal: true });
          entity.coins  = Number(fullDef.coins)  || baseEntity.coins  || (entityType === "native" ? 2 : 5);
          entity.health = Number(fullDef.health) || baseEntity.health || (entityType === "native" ? 3 : 8);
        } else {
          console.warn("Failed to load full definition for " + entityId);
        }
      }

      console.log("Processing " + entityType + ": " + (entity.name || entity.id));

      // Tool condition check
      var condition = entity.mutable ? entity.mutable.onDestroy ? entity.mutable.onDestroy.condition : null : null;
      if (condition) {
        var hasTool = false;
        var toolName = "";

        if (condition === "playerHasItem:spade") {
          hasTool = currentPlayer.inventory.spade === true;
          toolName = "spade";
        } else if (condition === "playerHasItem:sickle") {
          hasTool = currentPlayer.inventory.sickle === true;
          toolName = "sickle";
        }

        if (!hasTool) {
          showMessage("Tool Required", entity.mutable.onDestroy.failMessage || "You need a " + toolName + "!", 4000);
          return;
        }
      }

      // Action: harvest native or remove invasive
      if (entityType === "native") {
        var newDna = generateSeedDNA(entity);

        if (!currentPlayer.inventory.seeds[entity.id]) {
          currentPlayer.inventory.seeds[entity.id] = [];
        }

        currentPlayer.inventory.seeds[entity.id].push({
          parentId: entity.id,
          dna: newDna
        });

        savePlayer(currentPlayer);

        showRewardPopup(entityEl, 0, 0, "+1 " + newDna.rarity + " " + entity.name + " Seed 🌱", 1600);

        entityEl.style.transition = "opacity 0.6s ease, transform 0.6s ease";
        entityEl.style.opacity = "0";
        entityEl.style.transform = "scale(0.4) rotate(5deg)";

        setTimeout(function() {
          entityEl.remove();
        }, 600);

        console.log("[POST-ACTION] All zones health after native harvest:", JSON.stringify(currentPlayer.zones));

        return;
      }

      // Invasive removal 
      var changes = {
        coins: currentPlayer.coins + (entity.coins || 5),
        zones: { ...currentPlayer.zones } // ← START with FULL copy of existing zones
      };
      changes.zones[zoneId] = Math.min(100, (currentPlayer.zones[zoneId] || 0) + (entity.health || 8));

      updatePlayer(currentPlayer, changes);

      var bonusText = "";
      if (entity.mutable && entity.mutable.onDestroy && entity.mutable.onDestroy.drop && Array.isArray(entity.mutable.onDestroy.drop)) {
        var bonusParts = [];
        entity.mutable.onDestroy.drop.forEach(function(dropRule) {
          var dropEntity = dropRule.entity;
          var count = Number(dropRule.count) || 1;
          var chance = Number(dropRule.chance) || 1;
          if (Math.random() < chance) {
            if (dropEntity === "soil-clump") {
              currentPlayer.inventory.soilClumps = (currentPlayer.inventory.soilClumps || 0) + count;
              bonusParts.push("+" + count + " Soil Clump 🌱");
              console.log("Gained " + count + " soil clump(s)");
            }
          }
        });
        if (bonusParts.length > 0) bonusText = bonusParts.join("   ");
        savePlayer(currentPlayer);
      }

      entityEl.style.transition = "opacity 0.6s ease, transform 0.6s ease";
      entityEl.style.opacity = "0";
      entityEl.style.transform = "scale(0.4) rotate(5deg)";

      setTimeout(function() {
        entityEl.remove();

        showRewardPopup(entityEl, entity.coins || 5, entity.health || 8, bonusText, 1600);

        updateCoinsDisplay();
        updateHealthDisplay(changes.zones[zoneId]);

        var progressFill = document.querySelector(".progress-fill");
        if (progressFill) progressFill.style.width = changes.zones[zoneId] + "%";

        var remaining = document.querySelectorAll(".invasive-item, .native-item");
        if (remaining.length === 0) {
          var currentZoneId = currentView.split(":")[1];
          var zone = zones.find(function(z) { return z.id === currentZoneId; });
          var zoneName = zone ? zone.name : "Area";
          showClearModal(zoneName + " cleared! 🌿");
        }

        // [POST-ACTION] All zones health after invasive removal
        console.log("[POST-ACTION] All zones health after invasive removal:", JSON.stringify(currentPlayer.zones));
      }, 600);
  }

  // Back to map
  if (t.id === "back-to-map") {
    console.log("Switching back to island — zones before switch:", JSON.stringify(currentPlayer.zones));
    savePlayer(currentPlayer);
    currentView = "island";
    renderView();
    console.log("[POST-SWITCH] All zones health after back to island:", JSON.stringify(currentPlayer.zones));
  }

  // Toolbox & Inventory
  if (t.closest(".hud-toolbox")) {
    showToolboxGallery();
    console.log("[POST-TOOLBOX] All zones health:", JSON.stringify(currentPlayer.zones));
    return;
  }

  if (t.closest(".hud-inventory")) {
    showInventoryGallery();
    console.log("[POST-INVENTORY] All zones health:", JSON.stringify(currentPlayer.zones));
    return;
  }
});