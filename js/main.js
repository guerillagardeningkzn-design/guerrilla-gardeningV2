import { loadPlayer } from './player.js';

console.log("Step 1 - player import");

let currentPlayer;

document.addEventListener("DOMContentLoaded", () => {
  currentPlayer = loadPlayer();
  const container = document.getElementById("game-container");
  if (container) {
    container.innerHTML = `
      <h2>Step 1</h2>
      <p>Coins from player: ${currentPlayer.coins}</p>
    `;
  }
  console.log("Step 1 loaded");
});