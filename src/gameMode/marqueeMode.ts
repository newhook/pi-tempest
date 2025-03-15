import * as THREE from "three";
import { GameState } from "../types";
import { GameMode } from "./gameMode";
import { SceneSetup } from "../scene";

export class MarqueeMode implements GameMode {
  private sceneSetup: SceneSetup;
  private gameState: GameState;
  private player: THREE.Group;

  constructor(sceneSetup: SceneSetup, gameState: GameState, player: THREE.Group) {
    this.sceneSetup = sceneSetup;
    this.gameState = gameState;
    this.player = player;
    
    // Hide player in marquee mode
    if (this.player) {
      this.player.visible = false;
    }
  }

  public enter(): void {
    // Reset any necessary game elements
    this.player.visible = false;
    
    // Display marquee UI elements
    this.displayMarqueeScreen();
  }

  public update(delta: number): void {
    // Render the scene for visual effects
    this.sceneSetup.renderer.render(
      this.sceneSetup.scene,
      this.sceneSetup.camera
    );
  }

  public exit(): void {
    // Clean up any marquee-specific elements
    const marqueeElement = document.getElementById("marquee-container");
    if (marqueeElement) {
      document.body.removeChild(marqueeElement);
    }
  }

  private displayMarqueeScreen(): void {
    // Create marquee screen container
    const marqueeContainer = document.createElement("div");
    marqueeContainer.id = "marquee-container";
    marqueeContainer.style.position = "absolute";
    marqueeContainer.style.top = "0";
    marqueeContainer.style.left = "0";
    marqueeContainer.style.width = "100%";
    marqueeContainer.style.height = "100%";
    marqueeContainer.style.display = "flex";
    marqueeContainer.style.flexDirection = "column";
    marqueeContainer.style.justifyContent = "center";
    marqueeContainer.style.alignItems = "center";
    marqueeContainer.style.color = "#FF0000";
    marqueeContainer.style.fontFamily = "Arial, sans-serif";
    marqueeContainer.style.textAlign = "center";
    marqueeContainer.style.zIndex = "1000";

    // Title
    const titleElement = document.createElement("h1");
    titleElement.textContent = "TEMPEST";
    titleElement.style.fontSize = "64px";
    titleElement.style.margin = "20px 0";
    marqueeContainer.appendChild(titleElement);

    // Start button
    const startButton = document.createElement("button");
    startButton.textContent = "START GAME";
    startButton.style.padding = "15px 30px";
    startButton.style.fontSize = "24px";
    startButton.style.backgroundColor = "#FF0000";
    startButton.style.color = "#FFFFFF";
    startButton.style.border = "none";
    startButton.style.borderRadius = "5px";
    startButton.style.cursor = "pointer";
    startButton.style.margin = "20px 0";
    
    startButton.addEventListener("click", () => {
      // Dispatch event to change game status to active
      document.dispatchEvent(
        new CustomEvent("gameStatusChanged", {
          detail: { status: "active" },
        })
      );
    });
    
    marqueeContainer.appendChild(startButton);

    // Instructions
    const instructionsElement = document.createElement("div");
    instructionsElement.style.fontSize = "18px";
    instructionsElement.style.maxWidth = "600px";
    instructionsElement.style.margin = "20px 0";
    instructionsElement.innerHTML = `
      <p>Use arrow keys or mouse to move</p>
      <p>Click or press space to shoot</p>
      <p>Press G to toggle ghost mode</p>
    `;
    marqueeContainer.appendChild(instructionsElement);

    document.body.appendChild(marqueeContainer);
  }
}