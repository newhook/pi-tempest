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

  // Create countdown timer display below the score
  const timerElement = document.createElement("div");
  timerElement.id = "countdown-timer";
  timerElement.style.position = "absolute";
  timerElement.style.top = "60px";
  timerElement.style.left = "20px";
  timerElement.style.fontSize = "24px";
  timerElement.style.fontFamily = "monospace";
  timerElement.style.color = "#FF3333"; // Red color for urgency
  timerElement.style.textShadow = "0 0 5px #FF3333";
  timerElement.innerText = "Time: 60";
  document.body.appendChild(timerElement);

  // Create lives display below the timer
  const livesElement = document.createElement("div");
  livesElement.id = "lives";
  livesElement.style.position = "absolute";
  livesElement.style.top = "100px";
  livesElement.style.left = "20px";
  livesElement.style.fontSize = "24px";
  livesElement.style.fontFamily = "monospace";
  livesElement.style.color = "#00ffaa"; // Same color as score
  livesElement.style.textShadow = "0 0 5px #00ffaa";
  livesElement.innerText = "Lives: 3";
  document.body.appendChild(livesElement);

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

// Update countdown timer display
export function updateCountdownTimer(remainingSeconds: number): void {
  const timerElement = document.getElementById("countdown-timer");
  if (!timerElement) return;

  timerElement.innerText = `Time: ${remainingSeconds}`;

  // Update color based on time remaining
  if (remainingSeconds <= 10) {
    // Urgent red flashing for last 10 seconds
    const isFlashing = Math.floor(Date.now() / 500) % 2 === 0;
    timerElement.style.color = isFlashing ? "#FF0000" : "#FFFFFF";
    timerElement.style.textShadow = isFlashing
      ? "0 0 10px #FF0000"
      : "0 0 10px #FFFFFF";
    timerElement.style.fontSize = isFlashing ? "28px" : "24px";
  } else if (remainingSeconds <= 20) {
    // Orange for 11-20 seconds
    timerElement.style.color = "#FF6600";
    timerElement.style.textShadow = "0 0 5px #FF6600";
    timerElement.style.fontSize = "24px";
  } else {
    // Normal red for > 20 seconds
    timerElement.style.color = "#FF3333";
    timerElement.style.textShadow = "0 0 5px #FF3333";
    timerElement.style.fontSize = "24px";
  }
}

// Update lives display
export function updateLives(gameState: GameState): void {
  const livesElement = document.getElementById("lives");
  if (!livesElement) return;

  livesElement.innerText = `Lives: ${gameState.lives}`;

  // Flash effect when lives change
  livesElement.style.fontSize = "28px";
  livesElement.style.color = "#ffffff";

  setTimeout(() => {
    livesElement.style.fontSize = "24px";
    livesElement.style.color = "#00ffaa";
  }, 200);
}
