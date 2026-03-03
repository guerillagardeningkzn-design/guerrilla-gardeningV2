import { loadPlayer } from './player.js';

console.log("Step 2 - add renderView skeleton");

let currentPlayer;
let currentView = "overview";

function renderView() {
  const container = document.getElementById("game-container");
  if (!container) return;
  container.innerHTML = "<h2>Step 2 – Overview</h2><p>Placeholder</p>";
}

document.addEventListener("DOMContentLoaded", () => {
  currentPlayer = loadPlayer();
  renderView();
  console.log("Step 2 loaded");
});