// js/main.js
import { loadPlayer, savePlayer, updatePlayer, resetPlayer} from './player.js';

console.log("Guerrilla Gardening starting... 🌱");

let currentPlayer;

document.addEventListener("DOMContentLoaded", () => {
  console.log("Page loaded!");

  // Load saved player data (or use defaults)
  currentPlayer = loadPlayer();

  // For testing: show current coins in the page
  const container = document.getElementById("game-container");
  if (container) {
    container.innerHTML = `
      <p>Welcome back, gardener! 🌿</p>
      <p>Coins: <span id="coins-display">${currentPlayer.coins}</span></p>
      <p>Energy: ${currentPlayer.energy}/${currentPlayer.maxEnergy}</p>
      <button id="test-earn">Earn 10 coins (test)</button>
      <button id="test-spend">Spend 20 coins (test)</button>
      <button id="reset-game">Reset game (clear save)</button>
    `;
  }

  // Test buttons — remove later
  document.getElementById("test-earn")?.addEventListener("click", () => {
    updatePlayer({ coins: currentPlayer.coins + 10 });
    document.getElementById("coins-display").textContent = currentPlayer.coins;
  });

  document.getElementById("test-spend")?.addEventListener("click", () => {
    if (currentPlayer.coins >= 20) {
      updatePlayer({ coins: currentPlayer.coins - 20 });
      document.getElementById("coins-display").textContent = currentPlayer.coins;
    } else {
      alert("Not enough coins!");
    }
  });

  document.getElementById("reset-game")?.addEventListener("click", () => {
    if (confirm("Really reset all progress?")) {
      resetPlayer();
      location.reload(); // refresh to show defaults
    }
  });

  // Debug: type debugPlayer() in browser console to see full state
});