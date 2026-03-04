import { loadPlayer, updatePlayer, savePlayer } from './player.js';
import { zones } from '../data/zones.js';

console.log("Step 10 - add tappable invasives");

let currentPlayer;
let currentView = "overview";

// Dummy invasives per zone (later from JSON)
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

function isZoneUnlocked(zone) {
  if (!zone.unlockRequirement) return true;
  const req = zone.unlockRequirement;
  const reqHealth = currentPlayer.zones[req.zone] || 0;
  return reqHealth >= req.health;
}

function renderView() {
  const container = document.getElementById("game-container");
  if (!container) return;
  container.innerHTML = "";

  if (currentView === "overview") {
    let html = '<h2>Island Overview</h2>';
    html += '<p>Coins: <span id="coins-display">' + currentPlayer.coins + '</span></p>';
    html += '<div id="zones-grid"></div>';
    container.innerHTML = html;

    const grid = document.getElementById("zones-grid");

    zones.forEach(zone => {
      const health = currentPlayer.zones[zone.id] || 0;
      const unlocked = isZoneUnlocked(zone);

      const card = document.createElement("div");
      card.className = "zone-card";
      card.dataset.zoneId = zone.id;

      if (unlocked) {
        card.style.backgroundColor = zone.bgColor || "#e0f7fa";
        card.style.cursor = "pointer";
        card.style.opacity = "1";
      } else {
        card.style.backgroundColor = "#cccccc";
        card.style.cursor = "not-allowed";
        card.style.opacity = "0.6";
      }

      let cardHtml = '<h3>' + zone.name + '</h3>';
      cardHtml += '<p>' + zone.description + '</p>';
      cardHtml += '<div class="progress-bar">';
      cardHtml += '<div class="progress-fill" style="width: ' + health + '%"></div>';
      cardHtml += '</div>';
      cardHtml += '<p>Health: ' + health + '%</p>';

      if (!unlocked) {
        const req = zone.unlockRequirement;
        const reqZone = zones.find(z => z.id === req.zone);
        cardHtml += '<small>(Locked – need ' + req.health + '% in ' + reqZone.name + ')</small>';
      }

      card.innerHTML = cardHtml;
      grid.appendChild(card);
    });

    updateCoinsDisplay();

  } else if (currentView.startsWith("zone:")) {
    const zoneId = currentView.split(":")[1];
    const zone = zones.find(z => z.id === zoneId);

    if (!zone || !isZoneUnlocked(zone)) {
      currentView = "overview";
      renderView();
      return;
    }

    const health = currentPlayer.zones[zoneId] || 0;
    const invasives = invasivesByZone[zoneId] || [];

    let detailHtml = '<h2>' + zone.name + '</h2>';
    detailHtml += '<p>' + zone.description + '</p>';
    detailHtml += '<p>Coins: <span id="coins-display">' + currentPlayer.coins + '</span></p>';
    detailHtml += '<div class="progress-bar">';
    detailHtml += '<div class="progress-fill" style="width: ' + health + '%"></div>';
    detailHtml += '</div>';
    detailHtml += '<p>Health: ' + health + '%</p>';
    detailHtml += '<h3>Tap to remove invasives:</h3>';
    detailHtml += '<div id="invasives-list"></div>';
    detailHtml += '<button id="back-to-overview">Back to Overview</button>';

    container.innerHTML = detailHtml;

    const list = document.getElementById("invasives-list");

    invasives.forEach(inv => {
  const invEl = document.createElement("div");
  invEl.className = "invasive-item";
  invEl.dataset.invId = inv.id;
  invEl.style.cursor = "pointer";
  invEl.style.padding = "8px";
  invEl.style.margin = "6px";
  invEl.style.background = "#fff3cd";
  invEl.style.borderRadius = "8px";
  invEl.style.textAlign = "center"; // center image

  // Image only – no text
  let imagePath = "";
  if (inv.name.toLowerCase().includes("seaweed")) {
  imagePath = "assets/entities/invasives/seaweed/seaweed-01.png";
} else if (inv.name.toLowerCase().includes("crabgrass")) {
  imagePath = "assets/entities/invasives/crabgrass/crabgrass-01.png";
} else if (inv.name.toLowerCase().includes("vine")) {
  imagePath = "assets/entities/invasives/vine/vine-choking-01.png";
} else if (inv.name.toLowerCase().includes("thistle")) {
  imagePath = "assets/entities/invasives/thistle/thistle-thorny-01.png";
} else if (inv.name.toLowerCase().includes("weed")) {
  imagePath = "assets/entities/invasives/weed-foreign/weed-foreign-01.png";
} else {
  imagePath = "assets/ui-icons/leaf-health.png"; // fallback
}

  invEl.innerHTML = `
    <img src="${imagePath}" 
         class="invasive-image" 
         alt="${inv.name}">
  `;

  list.appendChild(invEl);
});

    updateCoinsDisplay();
  }
}

function updateCoinsDisplay() {
  const coinsEl = document.getElementById("coins-display");
  if (coinsEl) {
    coinsEl.textContent = currentPlayer.coins;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  currentPlayer = loadPlayer();

  document.addEventListener("click", (e) => {
    const target = e.target;

    // Zone card click
    const card = target.closest(".zone-card");
    if (card) {
      const zoneId = card.dataset.zoneId;
      const zone = zones.find(z => z.id === zoneId);
      if (isZoneUnlocked(zone)) {
        currentView = "zone:" + zoneId;
        renderView();
      } else {
        alert("This zone is locked! Restore the previous zone first.");
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
        // Give reward
        const changes = {
          coins: currentPlayer.coins + inv.coins,
          zones: {
            ...currentPlayer.zones,
            [zoneId]: Math.min(100, (currentPlayer.zones[zoneId] || 0) + inv.health)
          }
        };

        updatePlayer(changes);

        // Visually remove immediately
        invEl.remove();

        // Update UI elements
        updateCoinsDisplay();
        const progressFill = document.querySelector(".progress-fill");
        const healthDisplay = document.querySelector(".progress-bar + p"); // <p>Health: ...%</p>
        if (progressFill && healthDisplay) {
          const newHealth = changes.zones[zoneId];
          progressFill.style.width = newHealth + "%";
          healthDisplay.textContent = "Health: " + newHealth + "%";
        }

        // Check if all gone → alert with zone name
        if (document.querySelectorAll(".invasive-item").length === 0) {
          const currentZone = zones.find(z => z.id === zoneId);
          if (currentZone) {
            alert(currentZone.name + " cleared of invasives! 🌿");
          } else {
            alert("Area cleared of invasives! 🌿");
          }
        }
      }
      return;
    }

    // Back button
    if (target.id === "back-to-overview") {
      currentView = "overview";
      renderView();
    }
  });

  renderView();
  console.log("Step 10 loaded");
});