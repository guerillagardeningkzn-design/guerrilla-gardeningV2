// js/main.js - minimal test version
import { loadPlayer } from './player.js';

console.log("Minimal test starting...");

let player;

document.addEventListener("DOMContentLoaded", () => {
  player = loadPlayer();
  const container = document.getElementById("game-container");
  if (container) {
    container.innerHTML = `
      <h2>Test Page</h2>
      <p>Coins: <span id="coins-display">${player.coins}</span></p>
      <p>This is a minimal test - no errors should appear</p>
    `;
    document.getElementById("coins-display").textContent = player.coins;
  }
});