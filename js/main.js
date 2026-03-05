import { loadPlayer, updatePlayer, savePlayer } from './player.js';
import { zones } from '../data/zones.js';

console.log("Guerrilla Gardening - overworld map with markers");

// ─── Global state ────────────────────────────────────────────────────────────────
let currentPlayer;
let currentView = "island";  // start with island map

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

// ─── Marker positions on island map (adjust % for your image) ───────────────────
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
  if (coinsEl) coinsEl.textContent = currentPlayer.coins;
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
        <img src="${imagePath}" class="invasive-image" alt="${inv.name}">
      `;

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
            const zone = zones.find(z => z.id === zoneId);
            alert(zone.name + " cleared of invasives! 🌿");
          }
        }, 600);
      }
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