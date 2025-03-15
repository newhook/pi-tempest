import * as THREE from "three";
import { GameState } from "../types";
import { GameMode } from "./gameMode";
import { SceneSetup } from "../scene";

export class GameOverMode implements GameMode {
  private sceneSetup: SceneSetup;
  private gameState: GameState;
  private player: THREE.Group;

  constructor(sceneSetup: SceneSetup, gameState: GameState, player: THREE.Group) {
    this.sceneSetup = sceneSetup;
    this.gameState = gameState;
    this.player = player;
  }

  public enter(): void {
    // Set game over state
    this.gameState.isGameOver = true;
    
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
      document.dispatchEvent(
        new CustomEvent("gameStatusChanged", {
          detail: { status: "marquee" },
        })
      );
    });
    
    gameOverContainer.appendChild(retryButton);

    document.body.appendChild(gameOverContainer);
  }

  private resetGameState(): void {
    // Reset game state for new game
    this.gameState.score = 0;
    this.gameState.currentLevel = 1;
    this.gameState.enemySpeed = 0.03;
    this.gameState.isGameOver = false;
    this.gameState.ghostMode = false;
    
    // Clear any remaining bullets and enemies
    for (const bullet of this.gameState.bullets) {
      this.sceneSetup.scene.remove(bullet.mesh);
    }
    this.gameState.bullets = [];
    
    for (const enemy of this.gameState.enemies) {
      this.sceneSetup.scene.remove(enemy.mesh);
    }
    this.gameState.enemies = [];
  }
}