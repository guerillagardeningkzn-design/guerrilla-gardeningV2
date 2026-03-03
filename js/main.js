import { loadPlayer } from './player.js';

console.log("Step 5 - add full overview template");

let currentPlayer;
let currentView = "overview";

function renderView() {
  const container = document.getElementById("game-container");
  if (!container) return;

  const health = 42; // dummy

  container.innerHTML = `
    <h2>Step 5 – Island Overview</h2>
    <p>Coins: <span id="coins-display">${currentPlayer.coins}</span></p>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${health}%"></div>
    </div>
    <p>Health: ${health}% (dummy)</p>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  currentPlayer = loadPlayer();
  renderView();
  document.getElementById("coins-display")?.textContent = currentPlayer.coins;
  console.log("Step 5 loaded");
});