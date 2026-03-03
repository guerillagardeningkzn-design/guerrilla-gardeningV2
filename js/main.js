// js/main.js
import { loadPlayer, savePlayer, updatePlayer, resetPlayer } from './player.js';
import { zones } from '../data/zones.js';

console.log("Guerrilla Gardening starting... 🌱");

let currentPlayer;
let currentView = "overview";  // "overview" or "zone:<id>"

document.addEventListener("DOMContentLoaded", () => {
  console.log("Page loaded!");
  currentPlayer = loadPlayer();
  renderView();  // initial render

  // Global click handler (event delegation)
  document.addEventListener("click", (e) => {
    const target = e.target;

    // Zone card click → enter zone
    if (target.classList.contains("zone-card")) {
      const zoneId = target.dataset.zoneId;
      enterZone(zoneId);
    }

    // Test: increase health in current zone
    if (target.id === "test-progress") {
      progressCurrentZone(10);  // +10% for testing
    }

    // Back to overview
    if (target.id === "back-to-overview") {
      currentView = "overview";
      renderView();
    }
  });
});

// ─── Render current view ────────────────────────────
function renderView() {
  const container = document.getElementById("game-container");
  if (!container) return;

  container.innerHTML = ""; // clear

  if (currentView === "overview") {
    container.innerHTML = `
      <h2>Island Overview</h2>
      <p>Coins: <span id="coins-display">${currentPlayer.coins}</span> | 
         Energy: ${currentPlayer.energy}/${currentPlayer.maxEnergy}</p>
      <div id="zones-grid"></div>
      <button id="reset-game">Reset game</button>
    `;

    const grid = document.getElementById("zones-grid");
    zones.forEach(zone => {
      const isUnlocked = isZoneUnlocked(zone);
      const health = currentPlayer.zones[zone.id] || 0;

      const card = document.createElement("div");
      card.className = "zone-card";
      card.dataset.zoneId = zone.id;
      card.style.backgroundColor = isUnlocked ? zone.bgColor : "#eeeeee";
      card.style.opacity = isUnlocked ? "1" : "0.6";
      card.innerHTML = `
        <h3>${zone.name}</h3>
        <p>${zone.description}</p>
        <div class="progress-bar">
          <div class="progress-fill" style='width: ${health}%'></div>
        </div>
        <p>Health: ${health}%</p>
        ${!isUnlocked ? '<small>(Locked)</small>' : ''}
      `;
      grid.appendChild(card);
    });

    // Reset button
    document.getElementById("reset-game")?.addEventListener("click", () => {
      if (confirm("Really reset all progress? This cannot be undone.")) {
        resetPlayer();
        location.reload();
      }
    });

  } else if (currentView.startsWith("zone:")) {
    const zoneId = currentView.split(":")[1];
    const zone = zones.find(z => z.id === zoneId);

    if (!zone || !isZoneUnlocked(zone)) {
      currentView = "overview";
      renderView();
      return;
    }

    const health = currentPlayer.zones[zoneId] || 0;

    container.innerHTML = `
      <h2>${zone.name}</h2>
      <p>${zone.description}</p>
      <div class="progress-bar">
        <div class="progress-fill" style='width: ${health}%'></div>
      </div>
      <p>Health: ${health}%</p>
      <button id="test-progress">Restore +10% (test tap)</button>
      <button id="back-to-overview">Back to Overview</button>
    `;
  }

  // Update coins display if exists (in overview)
  document.getElementById("coins-display")?.textContent = currentPlayer.coins;
}

// ─── Check if zone is unlocked ──────────────────────
function isZoneUnlocked(zone) {
  if (!zone.unlockRequirement) return true;
  const req = zone.unlockRequirement;
  const reqHealth = currentPlayer.zones[req.zone] || 0;
  return reqHealth >= req.health;
}

// ─── Enter a zone ───────────────────────────────────
function enterZone(zoneId) {
  const zone = zones.find(z => z.id === zoneId);
  if (!zone || !isZoneUnlocked(zone)) {
    alert("This zone is locked! Restore previous zones first.");
    return;
  }
  currentView = `zone:${zoneId}`;
  renderView();
}

// ─── Progress current zone (test / later real actions) ───
function progressCurrentZone(amount) {
  if (!currentView.startsWith("zone:")) return;

  const zoneId = currentView.split(":")[1];
  let health = currentPlayer.zones[zoneId] || 0;
  health = Math.min(100, health + amount);

  updatePlayer({
    zones: { ...currentPlayer.zones, [zoneId]: health }
  });

  if (health >= 100) {
    alert(`${zones.find(z => z.id === zoneId).name} fully restored! 🌿`);
  }

  renderView();  // refresh UI
}