import { loadPlayer } from './player.js';

console.log("Step 4 - add progress bar line");

let currentPlayer;
let currentView = "overview";

function renderView() {
  const container = document.getElementById("game-container");
  if (!container) return;

  const health = 42; // dummy value

  container.innerHTML = `
    <h2>Step 4</h2>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${health}%"></div>
    </div>
    <p>Health: ${health}%</p>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  currentPlayer = loadPlayer();
  renderView();
  console.log("Step 4 loaded");
});