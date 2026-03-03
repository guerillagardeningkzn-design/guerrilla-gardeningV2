// js/main.js - known good minimal version
console.log("Clean test load");

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("game-container");
  if (container) {
    container.innerHTML = "<h2>Test - No templates</h2><p>Coins would be here</p>";
  }
  console.log("DOMContentLoaded fired");
});