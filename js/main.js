import { loadPlayer } from './player.js';

console.log("Step 3 - simple template literal");

let currentPlayer;
let currentView = "overview";

function renderView() {
  const container = document.getElementById("game-container");
  if (!container) return;
  container.innerHTML = `
    <h2>Step 3 – Overview</h2>
    <p>Coins: ${currentPlayer ? currentPlayer.coins : '—'}</p>
    <p>No progress bar yet</p>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  currentPlayer = loadPlayer();
  renderView();
  console.log("Step 3 loaded");
});