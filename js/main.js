import { loadPlayer, updatePlayer, savePlayer } from './player.js';
import { zones } from '../data/zones.js';

console.log("Guerrilla Gardening - static full-screen version");

// ─── Global state ────────────────────────────────────────────────────────────────
let currentPlayer;
let currentView = "island";  // start with complete island view

// ─── Data ────────────────────────────────────────────────────────────────────────
const invasivesByZone = {
  beach: [
    { id: "seaweed1", name: "Invasive Seaweed", coins: 3, health: 5 },
    { id: "seaweed2", name: "More Seaweed", coins: 4, health: 6 },
    { id: "crabgrass", name: "Alien Crabgrass", coins: 5, health: 8 }
  ],
  forest: [
    { id: "vine1", name: "Choking Vine", coins: 6, health: 7 },
    { id: "weed2", name: "Foreign Weed", coins: 5, health: 5 }
  ],
  mountain: [
    { id: "thistle", name: "Thorny Thistle", coins: 7, health: 10 }
  ]
};

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
  }
}

function updateHealthDisplay(health) {
  const fill = document.querySelector(".progress-fill");
  const text = document.querySelector(".health-text");
  if (fill) fill.style.width = health + "%";
  if (text) text.textContent = "Health: " + health + "%";
}

// ─── Render ──────────────────────────────────────────────────────────────────────
function renderView() {
  const container = document.getElementById("game-container");
  if (!container) return;
  container.innerHTML = "";

  // ─── Complete Island view ─────────────────────────────────────────────────────
  if (currentView === "island") {
    container.innerHTML = `
      <img src="assets/backgrounds/island-full.jpg" class="zone-bg-img" alt="Complete Island">
      <div class="zone-content">
        <h2>Island Overview</h2>
        <p>Select a zone from the dropdown to explore.</p>
        <div id="invasives-list"></div>
      </div>
    `;

    updateCoinsDisplay();
  } 
  // ─── Zone detail view ─────────────────────────────────────────────────────────
  else if (currentView.startsWith("zone:")) {
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
      </div>
    `;

    container.innerHTML = detailHtml;

    const list = document.getElementById("invasives-list");

    invasives.forEach(inv => {
      const invEl = document.createElement("div");
      invEl.className = "invasive-item";
      invEl.dataset.invId = inv.id;

      let posX = 50;
      let posY = 50;
      if (inv.id.includes("seaweed")) { posX = 30; posY = 60; }
      if (inv.id.includes("vine")) { posX = 70; posY = 40; }

      invEl.style.left = posX + '%';
      invEl.style.top = posY + '%';
      invEl.style.position = 'absolute';

      let imagePath = "assets/ui/icons/leaf-health.png";
      const nameLower = inv.name.toLowerCase();

      if (nameLower.includes("seaweed")) {
        imagePath = "assets/entities/invasives/seaweed/seaweed-01.png";
      } else if (nameLower.includes("crabgrass")) {
        imagePath = "assets/entities/invasives/crabgrass/crabgrass-01.png";
      } else if (nameLower.includes("vine") || nameLower.includes("choking")) {
        imagePath = "assets/entities/invasives/vine/vine-choking-01.png";
      } else if (nameLower.includes("thistle") || nameLower.includes("thorny")) {
        imagePath = "assets/entities/invasives/thistle/thistle-thorny-01.png";
      } else if (nameLower.includes("weed") || nameLower.includes("foreign")) {
        imagePath = "assets/entities/invasives/weed-foreign/weed-foreign-01.png";
      }

      invEl.innerHTML = `
        <img src="${imagePath}" 
             class="invasive-image" 
             alt="${inv.name}">
      `;

      list.appendChild(invEl);
    });

    updateCoinsDisplay();
    updateHealthDisplay(health);
  }
}

// ─── UI dropdown for zone selection ─────────────────────────────────────────────
function populateZoneDropdown() {
  const select = document.getElementById("zone-select");
  if (!select) return;

  select.innerHTML = '<option value="island">Island Overview</option>';

  zones.forEach(zone => {
    const option = document.createElement("option");
    option.value = zone.id;
    option.textContent = zone.name;
    if (!isZoneUnlocked(zone)) {
      option.disabled = true;
      option.textContent += " (Locked)";
    }
    select.appendChild(option);
  });

  select.addEventListener("change", (e) => {
    const value = e.target.value;
    currentView = value === "island" ? "island" : "zone:" + value;
    renderView();
  });
}

// ─── Game start ──────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  currentPlayer = loadPlayer();

  // Populate dropdown once on load
  populateZoneDropdown();

  // Handle clicks
  document.addEventListener("click", (e) => {
    const target = e.target;

    const invEl = target.closest(".invasive-item");
    if (invEl) {
      const zoneId = currentView.split(":")[1];
      const invId = invEl.dataset.invId;
      const invasives = invasivesByZone[zoneId] || [];
      const inv = invasives.find(i => i.id === invId);

      if (inv) {
        const changes = {
          coins: currentPlayer.coins + inv.coins,
          zones: {
            ...currentPlayer.zones,
            [zoneId]: Math.min(100, (currentPlayer.zones[zoneId] || 0) + inv.health)
          }
        };
        updatePlayer(changes);

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
            alert(zone.name + " cleared of invasives! 🌿");
          }
        }, 600);
      }
      return;
    }

    if (target.id === "back-to-overview") {
      currentView = "island";
      renderView();
    }
  });

  renderView();
  console.log("Game loaded – static full-screen version");
});