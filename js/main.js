import { loadPlayer, updatePlayer, savePlayer } from './player.js';
import { zones } from '../data/zones.js';

console.log("Step 9 - add unlock requirements + locked zone feedback");

let currentPlayer;
let currentView = "overview";

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

    let detailHtml = '<h2>' + zone.name + '</h2>';
    detailHtml += '<p>' + zone.description + '</p>';
    detailHtml += '<p>Coins: <span id="coins-display">' + currentPlayer.coins + '</span></p>';
    detailHtml += '<div class="progress-bar">';
    detailHtml += '<div class="progress-fill" style="width: ' + health + '%"></div>';
    detailHtml += '</div>';
    detailHtml += '<p>Health: ' + health + '%</p>';
    detailHtml += '<button id="test-progress">Restore +10% (test tap)</button>';
    detailHtml += '<button id="back-to-overview">Back to Overview</button>';

    container.innerHTML = detailHtml;

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

    if (target.id === "test-progress") {
      const zoneId = currentView.split(":")[1];
      let health = currentPlayer.zones[zoneId] || 0;
      health = Math.min(100, health + 10);

      const changes = {
        zones: { ...currentPlayer.zones, [zoneId]: health },
        coins: currentPlayer.coins + 5
      };

      updatePlayer(changes);
      renderView();
    }

    if (target.id === "back-to-overview") {
      currentView = "overview";
      renderView();
    }
  });

  renderView();
  console.log("Step 9 loaded");
});