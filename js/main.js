// Step 5 – safe version without nested quote + interpolation conflict
import { loadPlayer } from './player.js';

console.log("Step 5 - safe template version");

let currentPlayer;
let currentView = "overview";

function renderView() {
  const container = document.getElementById("game-container");
  if (!container) return;

  const health = 42; // dummy

  // Use concatenation or separate style variable
  const progressStyle = `width: ${health}%`;

  container.innerHTML = 
    '<h2>Step 5 – Island Overview</h2>' +
    '<p>Coins: <span id="coins-display">' + currentPlayer.coins + '</span></p>' +
    '<div class="progress-bar">' +
      '<div class="progress-fill" style="' + progressStyle + '"></div>' +
    '</div>' +
    '<p>Health: ' + health + '% (dummy)</p>';
}

document.addEventListener("DOMContentLoaded", () => {
  currentPlayer = loadPlayer();
  renderView();

  // Safe update (after insertion)
  const coinsEl = document.getElementById("coins-display");
  if (coinsEl) {
    coinsEl.textContent = currentPlayer.coins;
  }

  console.log("Step 5 loaded – safe version");
});