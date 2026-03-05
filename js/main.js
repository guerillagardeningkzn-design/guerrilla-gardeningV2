import { loadPlayer, updatePlayer, savePlayer } from './player.js';
import { zones } from '../data/zones.js';

console.log("Guerrilla Gardening - full features & assets tree");

let currentPlayer;
let currentView = "overview";

// Dummy invasives per zone (later from JSON/editor)
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
	  // ... invasives.forEach loop ...

  updateCoinsDisplay();

  // Reset zoom and center on zone enter
  scale = 1.3;              // ← you can change this number
  translateX = 0;
  translateY = 0;

  setTimeout(() => {
    const detail = document.querySelector('.zone-detail');
    if (detail) {
      const rect = detail.getBoundingClientRect();
      translateX = (viewport.clientWidth - rect.width * scale) / 2;
      translateY = (viewport.clientHeight - rect.height * scale) / 2;
      updateTransform();
    }
  }, 50);
}
	
	// Reset and center on zone enter
scale = 1.3; // starting zoom level – adjust 1.2–1.6 as preferred
translateX = 0;
translateY = 0;
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

  // Background
  let bgPath = "assets/backgrounds/global/sky-overcast.jpg";
  if (zoneId === "beach") bgPath = "assets/backgrounds/beach/main-day.jpg";
  else if (zoneId === "forest") bgPath = "assets/backgrounds/forest/main-misty.jpg";
  else if (zoneId === "mountain") bgPath = "assets/backgrounds/mountain/main-rocky.jpg";

  let detailHtml = `
    <div class="zone-detail" style="background-image: url('${bgPath}');">
      <h2>${zone.name}</h2>
      <p>${zone.description}</p>
      <p>Coins: <span id="coins-display">${currentPlayer.coins}</span></p>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${health}%"></div>
      </div>
      <p>Health: ${health}%</p>
      <h3>Tap to remove invasives:</h3>
      <div id="invasives-list"></div>
      <button id="back-to-overview">Back to Overview</button>
    </div>
  `;

  document.getElementById("game-container").innerHTML = detailHtml;

  const list = document.getElementById("invasives-list");

  invasives.forEach(inv => {
    const invEl = document.createElement("div");
    invEl.className = "invasive-item";
    invEl.dataset.invId = inv.id;
    // Position invasives (hardcoded for now, later from editor)
    let posX = 50; // % from left
    let posY = 50; // % from top
    if (inv.id.includes("seaweed")) { posX = 30; posY = 60; }
    if (inv.id.includes("vine")) { posX = 70; posY = 40; }
    // ... add more
    invEl.style.left = posX + '%';
    invEl.style.top = posY + '%';
    invEl.style.position = 'absolute';
    let imagePath = "assets/ui/icons/leaf-health.png";
    // your existing imagePath logic here...
    invEl.innerHTML = `
      <img src="${imagePath}" class="invasive-image" alt="${inv.name}">
    `;
    list.appendChild(invEl);
  });

  updateCoinsDisplay();

  // Reset zoom and center on zone enter
  scale = 1.3;
  translateX = 0;
  translateY = 0;

  setTimeout(() => {
    const detail = document.querySelector('.zone-detail');
    if (detail) {
      const rect = detail.getBoundingClientRect();
      translateX = (viewport.clientWidth - rect.width * scale) / 2;
      translateY = (viewport.clientHeight - rect.height * scale) / 2;
      updateTransform();
    }
  }, 50);
}

// ─── Basic zoom & pan ────────────────────────────────────────────────────────
let scale = 1;
let translateX = 0;
let translateY = 0;
const viewport = document.getElementById("map-viewport");
const container = document.getElementById("map-container");

function updateTransform() {
  container.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}
function getMinScale() {
  const viewportRect = viewport.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect(); // current scaled size

  // Get the natural size of the background (assuming it's set via CSS background-image)
  const bgImg = new Image();
  bgImg.src = container.querySelector('.zone-detail').style.backgroundImage.slice(5, -2); // extract url

  return new Promise(resolve => {
    bgImg.onload = () => {
      const naturalWidth = bgImg.naturalWidth;
      const naturalHeight = bgImg.naturalHeight;

      const scaleX = viewportRect.width / naturalWidth;
      const scaleY = viewportRect.height / naturalHeight;

      resolve(Math.max(scaleX, scaleY)); // use the larger one so it fills both directions
    };
  });
}

// Wheel zoom
viewport.addEventListener('wheel', async (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const oldScale = scale;

  scale = Math.max(await getMinScale(), Math.min(4, scale * delta));

  // Optional: zoom towards cursor position (more natural feel)
  const rect = viewport.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  translateX = mouseX - (mouseX - translateX) * (scale / oldScale);
  translateY = mouseY - (mouseY - translateY) * (scale / oldScale);

  updateTransform();
});

// Touch pinch zoom – add similar min scale check
viewport.addEventListener('touchmove', async (e) => {
  if (e.touches.length === 2) {
    e.preventDefault();
    const dist = Math.hypot(
      e.touches[0].pageX - e.touches[1].pageX,
      e.touches[0].pageY - e.touches[1].pageY
    );
    const delta = dist / startDist;
    const oldScale = scale;

    scale = Math.max(await getMinScale(), Math.min(4, scale * delta));
    updateTransform();
    startDist = dist;
  }
});

viewport.addEventListener('touchmove', (e) => {
  if (e.touches.length === 2) {
    e.preventDefault();
    const dist = Math.hypot(
      e.touches[0].pageX - e.touches[1].pageX,
      e.touches[0].pageY - e.touches[1].pageY
    );
    const delta = dist / startDist;
    scale = Math.max(0.5, Math.min(4, scale * delta));
    updateTransform();
    startDist = dist;
  }
});

// Drag pan (mouse)
let isDragging = false;
let startX, startY;

viewport.addEventListener('mousedown', (e) => {
  isDragging = true;
  startX = e.clientX - translateX;
  startY = e.clientY - translateY;
  viewport.style.cursor = 'grabbing';
});

viewport.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  translateX = e.clientX - startX;
  translateY = e.clientY - startY;
  updateTransform();
});

viewport.addEventListener('mouseup', () => {
  isDragging = false;
  viewport.style.cursor = 'default';
});

viewport.addEventListener('mouseleave', () => {
  isDragging = false;
});



window.addEventListener('resize', () => {
  // Re-center on resize
  scale = 1.0;
  translateX = 0;
  translateY = 0;
  updateTransform();
});

// Optional: reset zoom/pan on zone change (uncomment if wanted)
// document.addEventListener('click', (e) => {
//   if (e.target.id === 'back-to-overview') {
//     scale = 1;
//     translateX = 0;
//     translateY = 0;
//     updateTransform();
//   }
// });