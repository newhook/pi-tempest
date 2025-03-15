import { GameState } from "./types";

// Set up initial UI elements
export function setupUI(): void {
  // Create score display
  const scoreElement = document.createElement("div");
  scoreElement.id = "score";
  scoreElement.style.position = "absolute";
  scoreElement.style.top = "20px";
  scoreElement.style.left = "20px";
  scoreElement.style.fontSize = "24px";
  scoreElement.style.fontFamily = "monospace";
  scoreElement.style.color = "#00ffaa";
  scoreElement.style.textShadow = "0 0 5px #00ffaa";
  scoreElement.innerText = "Score: 0";
  document.body.appendChild(scoreElement);

  // Create level display
  const levelElement = document.createElement("div");
  levelElement.id = "level";
  levelElement.style.position = "absolute";
  levelElement.style.top = "20px";
  levelElement.style.right = "20px";
  levelElement.style.fontSize = "24px";
  levelElement.style.fontFamily = "monospace";
  levelElement.style.color = "#00ffaa";
  levelElement.style.textShadow = "0 0 5px #00ffaa";
  levelElement.innerText = "Level: 1";
  document.body.appendChild(levelElement);

  // Create π symbol display
  const piSymbol = document.createElement("div");
  piSymbol.id = "pi-symbol";
  piSymbol.style.position = "absolute";
  piSymbol.style.top = "60px";
  piSymbol.style.right = "20px";
  piSymbol.style.fontSize = "32px";
  piSymbol.style.fontFamily = "serif";
  piSymbol.style.color = "#66ccff";
  piSymbol.style.textShadow = "0 0 8px #66ccff";
  piSymbol.innerText = "π";
  document.body.appendChild(piSymbol);

  // Add title at start
  showTitle();
}

// Update score display
export function updateScore(gameState: GameState): void {
  const scoreElement = document.getElementById("score");
  if (scoreElement) {
    scoreElement.innerText = `Score: ${gameState.score}`;

    // Flash effect on score change
    scoreElement.style.fontSize = "28px";
    scoreElement.style.color = "#ffffff";

    setTimeout(() => {
      scoreElement.style.fontSize = "24px";
      scoreElement.style.color = "#00ffaa";
    }, 200);
  }

  // Update level display
  const levelElement = document.getElementById("level");
  if (levelElement) {
    levelElement.innerText = `Level: ${gameState.currentLevel}`;
  }
}

// Show game title
function showTitle(): void {
  const titleContainer = document.createElement("div");
  titleContainer.id = "title-container";
  titleContainer.style.position = "absolute";
  titleContainer.style.width = "100%";
  titleContainer.style.textAlign = "center";
  titleContainer.style.top = "30%";
  titleContainer.style.color = "#ffffff";
  titleContainer.style.fontFamily = "monospace";

  const title = document.createElement("div");
  title.style.fontSize = "48px";
  title.style.marginBottom = "20px";
  title.style.color = "#00ffcc";
  title.style.textShadow = "0 0 10px #00ffcc, 0 0 20px #00ffcc";
  title.innerHTML =
    'π-TEMPEST<br><span style="font-size:24px;color:#66ccff">Circular Chaos</span>';

  const instructions = document.createElement("div");
  instructions.style.fontSize = "18px";
  instructions.style.marginTop = "30px";
  instructions.style.color = "#aaccff";
  instructions.innerHTML =
    "Move mouse to position your ship<br>Click to shoot<br><br>Click to Start";

  titleContainer.appendChild(title);
  titleContainer.appendChild(instructions);
  document.body.appendChild(titleContainer);

  // Add start game listener
  document.addEventListener(
    "click",
    () => {
      const container = document.getElementById("title-container");
      if (container) {
        container.style.display = "none";

        // Fade out blood moon when game starts
        const sceneSetup = (window as any).sceneSetup;
        if (sceneSetup && sceneSetup.fadeOutBloodMoon) {
          sceneSetup.fadeOutBloodMoon();
        }
      }
    },
    { once: true }
  );
}

// Show game over screen
export function showGameOver(gameState: GameState): void {
  const message = document.createElement("div");
  message.style.position = "absolute";
  message.style.width = "100%";
  message.style.textAlign = "center";
  message.style.top = "40%";
  message.style.color = "#ff6666";
  message.style.fontFamily = "monospace";
  message.style.fontSize = "36px";
  message.style.textShadow = "0 0 10px #ff3333";

  const finalScore = gameState.score;
  const piMultiplier = Math.round((finalScore / 314) * 100) / 100;

  message.innerHTML = `GAME OVER<br>
                      <span style="font-size:24px;color:#ffffff">Score: ${finalScore}</span><br>
                      <span style="font-size:18px;color:#aaccff">That's ${piMultiplier}π points!</span><br><br>
                      <span style="font-size:18px">Click to restart</span>`;

  document.body.appendChild(message);

  // Add restart listener
  document.addEventListener("click", () => {
    location.reload();
  });
}

// Toggle ghost mode display
export function updateGhostModeDisplay(isActive: boolean): void {
  console.log("updateGhostModeDisplay", isActive);
  // Check if the element exists, create it if it doesn't
  let ghostModeElement = document.getElementById("ghost-mode-display");

  if (!ghostModeElement) {
    // Create the ghost mode display element
    ghostModeElement = document.createElement("div");
    ghostModeElement.id = "ghost-mode-display";
    ghostModeElement.style.position = "absolute";
    ghostModeElement.style.top = "60px"; // Position it below the score
    ghostModeElement.style.left = "10px";
    ghostModeElement.style.color = "#00ffff";
    ghostModeElement.style.fontFamily = "Arial, sans-serif";
    ghostModeElement.style.fontSize = "20px";
    document.body.appendChild(ghostModeElement);
  }

  // Update the text based on ghost mode state
  ghostModeElement.textContent = isActive ? "GHOST MODE" : "";
  ghostModeElement.style.display = isActive ? "block" : "none";
}
