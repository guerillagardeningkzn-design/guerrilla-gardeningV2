import { loadPlayer, updatePlayer, savePlayer } from './player.js';
import { zones } from '../data/zones.js';

console.log("Guerrilla Gardening - full features & assets tree");

// ─── Global state ────────────────────────────────────────────────────────────────
let currentPlayer;
let currentView = "overview";

// ─── Zoom & Pan state (declared only once) ──────────────────────────────────────
let scale = 1;
let translateX = 0;
let translateY = 0;
const viewport = document.getElementById("map-viewport");
const container = document.getElementById("map-container");

// ─── Helper functions ───────────────────────────────────────────────────────────
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

// ─── Zoom & Pan helpers ─────────────────────────────────────────────────────────


function clampTranslate() {
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const cw = container.offsetWidth * scale;
  const ch = container.offsetHeight * scale;

  if (cw <= vw) {
    translateX = (vw - cw) / 2;
  } else {
    translateX = Math.max(vw - cw, Math.min(0, translateX));
  }

  if (ch <= vh) {
    translateY = (vh - ch) / 2;
  } else {
    translateY = Math.max(vh - ch, Math.min(0, translateY));
  }
}

function getMinScale() {
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const cw = container.offsetWidth;
  const ch = container.offsetHeight;
  return Math.max(vw / cw, vh / ch);
}

function resetView(startScale = 1.8) {
  scale = startScale;
  translateX = 0;
  translateY = 0;
  clampTranslate();
  updateTransform();
}

// ─── Core render function ───────────────────────────────────────────────────────
function renderView() {
  const container = document.getElementById("game-container");
  if (!container) return;
  container.innerHTML = "";

  // Reset zoom/pan on every view change
  resetView(currentView === "overview" ? 1.0 : 1.8);

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
          <p>Health: ${health}%</p>
          <h3>Tap to remove invasives:</h3>
          <div id="invasives-list"></div>
        </div>
      </div>
    `;

    document.getElementById("game-container").innerHTML = detailHtml;

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

    // Reset zoom and center on zone enter
    resetView(1.8);
  }
}

// ─── Zoom & Pan event listeners ─────────────────────────────────────────────────
function updateTransform() {
  container.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  clampTranslate();
}




// Wheel zoom
viewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const oldScale = scale;
  scale *= delta;
  scale = Math.max(getMinScale(), Math.min(4, scale));

  const rect = viewport.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  translateX = mx - (mx - translateX) * (scale / oldScale);
  translateY = my - (my - translateY) * (scale / oldScale);

  updateTransform();
});

// Touch handling – pinch zoom + single finger pan
let initialDist = 0;
let initialScale = 1;
let panStartX = 0;
let panStartY = 0;
let isPinching = false;

viewport.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2) {
    isPinching = true;
    initialDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    initialScale = scale;
  } else if (e.touches.length === 1) {
    panStartX = e.touches[0].clientX - translateX;
    panStartY = e.touches[0].clientY - translateY;
  }
});

viewport.addEventListener('touchmove', (e) => {
  e.preventDefault();

  if (isPinching && e.touches.length === 2) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    scale = initialScale * (dist / initialDist);
    scale = Math.max(getMinScale(), Math.min(4, scale));
    updateTransform();
  } else if (e.touches.length === 1) {
    translateX = e.touches[0].clientX - panStartX;
    translateY = e.touches[0].clientY - panStartY;
    updateTransform();
  }
});

viewport.addEventListener('touchend touchcancel', () => {
  isPinching = false;
});

// Mouse drag
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

viewport.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  isDragging = true;
  dragStartX = e.clientX - translateX;
  dragStartY = e.clientY - translateY;
  viewport.style.cursor = 'grabbing';
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  translateX = e.clientX - dragStartX;
  translateY = e.clientY - dragStartY;
  updateTransform();
});

document.addEventListener('mouseup', (e) => {
  if (!isDragging) return;
  isDragging = false;
  viewport.style.cursor = 'default';
});

// Reset on resize
window.addEventListener('resize', () => {
  clampTranslate();
  updateTransform();
});

// ─── Game start ────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  currentPlayer = loadPlayer();

  document.addEventListener("click", (e) => {
    const target = e.target;

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
          const progressFill = document.querySelector(".progress-fill");
          const healthDisplay = document.querySelector(".progress-bar + p");
          if (progressFill && healthDisplay) {
            const newHealth = changes.zones[zoneId];
            progressFill.style.width = newHealth + "%";
            healthDisplay.textContent = "Health: " + newHealth + "%";
          }
          if (document.querySelectorAll(".invasive-item").length === 0) {
            const currentZone = zones.find(z => z.id === zoneId);
            if (currentZone) {
              alert(currentZone.name + " cleared of invasives! 🌿");
            } else {
              alert("Area cleared of invasives! 🌿");
            }
          }
        }, 600);
      }
      return;
    }

    if (target.id === "back-to-overview") {
      currentView = "overview";
      renderView();
    }
  });

  renderView();
  console.log("Game loaded – backgrounds + animated invasives");
});