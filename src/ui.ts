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

  // Initialize the game in marquee mode
  document.dispatchEvent(
    new CustomEvent("gameStatusChanged", { detail: { status: "marquee" } })
  );
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
