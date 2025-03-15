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
  // Skip updates if game hasn't started yet
  if (gameState.gameStatus !== "active") return;

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

// Show game title with marquee effect
function showTitle(): void {
  // Dispatch event so other components can respond
  document.dispatchEvent(
    new CustomEvent("gameStatusChanged", { detail: { status: "marquee" } })
  );

  // Hide any existing game elements that might be visible
  const gameElements = document.querySelectorAll(".game-element");
  gameElements.forEach((element) => {
    if (element instanceof HTMLElement) {
      element.style.visibility = "hidden";
    }
  });

  const titleContainer = document.createElement("div");
  titleContainer.id = "title-container";
  titleContainer.style.position = "absolute";
  titleContainer.style.width = "100%";
  titleContainer.style.textAlign = "center";
  titleContainer.style.top = "30%";
  titleContainer.style.color = "#ffffff";
  titleContainer.style.fontFamily = "monospace";

  const title = document.createElement("div");
  title.id = "game-title";
  title.style.fontSize = "48px";
  title.style.marginBottom = "20px";
  title.style.color = "#00ffcc";
  title.style.textShadow = "0 0 10px #00ffcc, 0 0 20px #00ffcc";
  title.innerHTML =
    'π-TEMPEST<br><span style="font-size:24px;color:#66ccff">Circular Chaos</span>';

  const marquee = document.createElement("div");
  marquee.id = "marquee-text";
  marquee.style.fontSize = "24px";
  marquee.style.marginTop = "20px";
  marquee.style.color = "#ff9900";
  marquee.style.opacity = "0";
  marquee.style.textShadow = "0 0 8px #ff9900";
  marquee.innerText = "HIGH SCORE CHALLENGE";

  const instructions = document.createElement("div");
  instructions.id = "instructions";
  instructions.style.fontSize = "18px";
  instructions.style.marginTop = "30px";
  instructions.style.color = "#aaccff";
  instructions.innerHTML =
    "Move mouse to position your ship<br>Click to shoot<br><br>Click to Start";
  instructions.style.opacity = "0";

  titleContainer.appendChild(title);
  titleContainer.appendChild(marquee);
  titleContainer.appendChild(instructions);
  document.body.appendChild(titleContainer);

  // Start marquee animations
  let marqueeInterval: number;
  let instructionsBlinkInterval: number;
  let titlePulseInterval: number;

  // Marquee text animation
  let marqueePos = -100;
  marquee.style.opacity = "1";
  marqueeInterval = window.setInterval(() => {
    marqueePos = marqueePos > 100 ? -100 : marqueePos + 2;
    marquee.style.transform = `translateX(${marqueePos}px)`;
    marquee.style.opacity =
      Math.abs(marqueePos) > 80 ? (100 - Math.abs(marqueePos)) / 20 + "" : "1";
  }, 30);

  // Instructions blinking
  instructions.style.opacity = "1";
  let instructionsVisible = true;
  instructionsBlinkInterval = window.setInterval(() => {
    instructionsVisible = !instructionsVisible;
    instructions.style.opacity = instructionsVisible ? "1" : "0.3";
  }, 800);

  // Title pulsing effect
  let pulseSize = 1;
  let growing = false;
  titlePulseInterval = window.setInterval(() => {
    pulseSize = growing ? pulseSize + 0.01 : pulseSize - 0.01;
    if (pulseSize >= 1.1) growing = false;
    if (pulseSize <= 0.9) growing = true;
    title.style.transform = `scale(${pulseSize})`;
  }, 50);

  // Add start game listener
  document.addEventListener(
    "click",
    () => {
      // Clear all animation intervals
      clearInterval(marqueeInterval);
      clearInterval(instructionsBlinkInterval);
      clearInterval(titlePulseInterval);

      const container = document.getElementById("title-container");
      if (container) {
        // Add fade out animation
        container.style.transition = "opacity 1s ease-out";
        container.style.opacity = "0";

        setTimeout(() => {
          container.style.display = "none";

          // Dispatch a more descriptive event that other components can listen for
          document.dispatchEvent(
            new CustomEvent("gameStatusChanged", {
              detail: { status: "active" },
            })
          );

          // Show any hidden game elements
          const gameElements = document.querySelectorAll(".game-element");
          gameElements.forEach((element) => {
            if (element instanceof HTMLElement) {
              element.style.visibility = "visible";
            }
          });

          const sceneSetup = (window as any).sceneSetup;
          if (sceneSetup && sceneSetup.fadeOutBloodMoon) {
            sceneSetup.fadeOutBloodMoon();
          }
        }, 1000);
      }
    },
    { once: true }
  );
}

// Show game over screen
export function showGameOver(gameState: GameState): void {
  // Don't allow game over unless game is active
  if (gameState.gameStatus !== "active") return;

  // Update game state
  gameState.gameStatus = "gameOver";

  // Dispatch event for other components
  document.dispatchEvent(
    new CustomEvent("gameStatusChanged", {
      detail: { status: "gameOver" },
    })
  );

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
  // Get access to game state
  const gameState = (window as any).gameState;

  // Don't show ghost mode during non-active game states
  if (gameState && gameState.gameStatus !== "active") return;

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
