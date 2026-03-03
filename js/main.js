import { loadPlayer } from './player.js';
import { zones } from '../data/zones.js';

console.log("Step 7 - make zones clickable + detail view");

let currentPlayer;
let currentView = "overview";  // "overview" or "zone:beach" etc.

function renderView() {
  const container = document.getElementById("game-container");
  if (!container) return;

  container.innerHTML = "";  // clear

  if (currentView === "overview") {
    let html = '<h2>Island Overview</h2>';
    html += '<p>Coins: <span id="coins-display">' + currentPlayer.coins + '</span></p>';
    html += '<div id="zones-grid"></div>';

    container.innerHTML = html;

    const grid = document.getElementById("zones-grid");

    zones.forEach(zone => {
      const health = currentPlayer.zones[zone.id] || 0;

      const card = document.createElement("div");
      card.className = "zone-card";
      card.dataset.zoneId = zone.id;
      card.style.backgroundColor = zone.bgColor || "#eeeeee";  // use zone color
      card.style.cursor = "pointer";  // visual hint it's clickable

      let cardHtml = '<h3>' + zone.name + '</h3>';
      cardHtml += '<p>' + zone.description + '</p>';
      cardHtml += '<div class="progress-bar">';
      cardHtml += '<div class="progress-fill" style="width: ' + health + '%"></div>';
      cardHtml += '</div>';
      cardHtml += '<p>Health: ' + health + '%</p>';

      card.innerHTML = cardHtml;
      grid.appendChild(card);
    });

    const coinsEl = document.getElementById("coins-display");
    if (coinsEl) coinsEl.textContent = currentPlayer.coins;

  } else if (currentView.startsWith("zone:")) {
    const zoneId = currentView.split(":")[1];
    const zone = zones.find(z => z.id === zoneId);

    if (!zone) {
      currentView = "overview";
      renderView();
      return;
    }

    const health = currentPlayer.zones[zoneId] || 0;

    let detailHtml = '<h2>' + zone.name + '</h2>';
    detailHtml += '<p>' + zone.description + '</p>';
    detailHtml += '<div class="progress-bar">';
    detailHtml += '<div class="progress-fill" style="width: ' + health + '%"></div>';
    detailHtml += '</div>';
    detailHtml += '<p>Health: ' + health + '%</p>';
    detailHtml += '<button id="test-progress">Restore +10% (test tap)</button>';
    detailHtml += '<button id="back-to-overview">Back to Overview</button>';

    container.innerHTML = detailHtml;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  currentPlayer = loadPlayer();

  // Global click handler for dynamic elements
  document.addEventListener("click", (e) => {
    const target = e.target;

    // Click on zone card → enter detail view
    if (target.closest(".zone-card")) {
      const card = target.closest(".zone-card");
      const zoneId = card.dataset.zoneId;
      currentView = "zone:" + zoneId;
      renderView();
    }

    // Test progress button
    if (target.id === "test-progress") {
      const zoneId = currentView.split(":")[1];
      let health = currentPlayer.zones[zoneId] || 0;
      health = Math.min(100, health + 10);
      currentPlayer.zones[zoneId] = health;
      // Simple save (we'll add proper updatePlayer later)
      localStorage.setItem("guerrillaGardeningSave-v1", JSON.stringify(currentPlayer));
      renderView();
    }

    // Back button
    if (target.id === "back-to-overview") {
      currentView = "overview";
      renderView();
    }
  });

  renderView();
  console.log("Step 7 loaded");
});