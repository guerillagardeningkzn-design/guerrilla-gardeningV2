import { loadPlayer } from './player.js';
import { zones } from '../data/zones.js';

console.log("Step 6 - add zones grid with concatenation");

let currentPlayer;
let currentView = "overview";

function renderView() {
  const container = document.getElementById("game-container");
  if (!container) return;

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
    card.style.backgroundColor = "#eeeeee"; // simple gray for now

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
}

document.addEventListener("DOMContentLoaded", () => {
  currentPlayer = loadPlayer();
  renderView();
  console.log("Step 6 loaded");
});