import * as THREE from "three";
import { GameState } from "../types";
import { GameMode } from "./gameMode";
import { SceneSetup } from "../scene";

export class GameOverMode implements GameMode {
  private sceneSetup: SceneSetup;
  private gameState: GameState;

  constructor(sceneSetup: SceneSetup, gameState: GameState) {
    this.sceneSetup = sceneSetup;
    this.gameState = gameState;
  }

  public enter(): void {
    // Display game over UI
    this.showGameOver();
  }

  public update(delta: number): void {
    // Render the scene for visual effects
    this.sceneSetup.renderer.render(
      this.sceneSetup.scene,
      this.sceneSetup.camera
    );
  }

  public exit(): void {
    // Clean up game over screen
    const gameOverElement = document.getElementById("game-over-container");
    if (gameOverElement) {
      document.body.removeChild(gameOverElement);
    }
    
    // Reset game state if transitioning back to marquee
    this.resetGameState();
  }

  // Input handling methods
  public handleKeyDown(event: KeyboardEvent): void {
    // Space, Enter, or R to retry
    if (event.key === " " || event.key === "Enter" || event.key === "r" || event.key === "R") {
      this.restartGame();
    }
  }

  public handleKeyUp(event: KeyboardEvent): void {
    // No key up handling needed
  }

  public handleMouseMove(event: MouseEvent): void {
    // No mouse movement handling needed
  }

  public handleClick(event: MouseEvent): void {
    // Clicking anywhere (except buttons) will restart
    if (!(event.target as Element).tagName.toLowerCase() === "button") {
      this.restartGame();
    }
  }

  public handleTouchMove(event: TouchEvent): void {
    // No touch movement handling needed
  }

  public handleTouchStart(event: TouchEvent): void {
    // No touch start handling needed
    // Retry button has its own click handler
  }
  
  public handleMouseDown(event: MouseEvent): void {
    // No specific mouse down handling needed for game over mode
  }
  
  public handleMouseUp(event: MouseEvent): void {
    // No specific mouse up handling needed for game over mode
  }
  
  public handleTouchEnd(event: TouchEvent): void {
    // No specific touch end handling needed for game over mode
  }

  private restartGame(): void {
    // Transition back to marquee mode
    document.dispatchEvent(
      new CustomEvent("gameStatusChanged", {
        detail: { status: "marquee" },
      })
    );
  }

  private showGameOver(): void {
    // Explosion sound
    const audio = new Audio("explosion-1.mp3");
    audio.play();

    // Create game over container
    const gameOverContainer = document.createElement("div");
    gameOverContainer.id = "game-over-container";
    gameOverContainer.style.position = "absolute";
    gameOverContainer.style.top = "0";
    gameOverContainer.style.left = "0";
    gameOverContainer.style.width = "100%";
    gameOverContainer.style.height = "100%";
    gameOverContainer.style.display = "flex";
    gameOverContainer.style.flexDirection = "column";
    gameOverContainer.style.justifyContent = "center";
    gameOverContainer.style.alignItems = "center";
    gameOverContainer.style.color = "#FF0000";
    gameOverContainer.style.fontFamily = "Arial, sans-serif";
    gameOverContainer.style.textAlign = "center";
    gameOverContainer.style.zIndex = "1000";

    // Game Over Text
    const gameOverText = document.createElement("h1");
    gameOverText.textContent = "GAME OVER";
    gameOverText.style.fontSize = "64px";
    gameOverText.style.margin = "20px 0";
    gameOverContainer.appendChild(gameOverText);

    // Final Score
    const scoreElement = document.createElement("h2");
    scoreElement.textContent = `FINAL SCORE: ${this.gameState.score}`;
    scoreElement.style.fontSize = "36px";
    scoreElement.style.margin = "20px 0";
    gameOverContainer.appendChild(scoreElement);

    // Level Reached
    const levelElement = document.createElement("h3");
    levelElement.textContent = `LEVEL REACHED: ${this.gameState.currentLevel}`;
    levelElement.style.fontSize = "24px";
    levelElement.style.margin = "10px 0 30px 0";
    gameOverContainer.appendChild(levelElement);

    // Retry Button
    const retryButton = document.createElement("button");
    retryButton.textContent = "PLAY AGAIN";
    retryButton.style.padding = "15px 30px";
    retryButton.style.fontSize = "24px";
    retryButton.style.backgroundColor = "#FF0000";
    retryButton.style.color = "#FFFFFF";
    retryButton.style.border = "none";
    retryButton.style.borderRadius = "5px";
    retryButton.style.cursor = "pointer";
    retryButton.style.margin = "20px 0";
    
    // Add event listener for the retry button
    retryButton.addEventListener("click", () => {
      this.restartGame();
    });
    
    gameOverContainer.appendChild(retryButton);

    // Instructions
    const instructionsElement = document.createElement("div");
    instructionsElement.style.fontSize = "18px";
    instructionsElement.style.maxWidth = "600px";
    instructionsElement.style.margin = "20px 0";
    instructionsElement.innerHTML = `
      <p>Press SPACE, ENTER or R to play again</p>
    `;
    gameOverContainer.appendChild(instructionsElement);

    document.body.appendChild(gameOverContainer);
  }

  private resetGameState(): void {
    // Reset game state for new game
    this.gameState.score = 0;
    this.gameState.currentLevel = 1;
    this.gameState.lives = 3; // Reset lives to 3
    
    // The active mode will initialize its own state when created
  }
}