import * as THREE from "three";
import { GameState } from "../types";
import { GameMode } from "./gameMode";
import { SceneSetup } from "../scene";
import { BloodMoon } from "../bloodMoon";

export class MarqueeMode implements GameMode {
  private sceneSetup: SceneSetup;
  private gameState: GameState;
  private marqueeContainer: HTMLElement;
  private bloodMoon: BloodMoon;

  constructor(sceneSetup: SceneSetup, gameState: GameState) {
    this.sceneSetup = sceneSetup;
    this.gameState = gameState;

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
      this.startGame();
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
      <p>Press SPACE or ENTER to start game</p>
    `;
    marqueeContainer.appendChild(instructionsElement);

    this.marqueeContainer = marqueeContainer;

    this.bloodMoon = new BloodMoon(this.sceneSetup.scene);
  }

  public enter(): void {
    document.body.appendChild(this.marqueeContainer);
    this.bloodMoon.enter();
  }

  public update(delta: number): void {
    // Render the scene for visual effects
    this.sceneSetup.renderer.render(
      this.sceneSetup.scene,
      this.sceneSetup.camera
    );
  }

  public exit(): void {
    document.body.removeChild(this.marqueeContainer);
    this.bloodMoon.exit();
  }

  // Input handling methods
  public handleKeyDown(event: KeyboardEvent): void {
    // In marquee mode, space or enter can start the game
    if (event.key === " " || event.key === "Enter") {
      this.startGame();
    }
  }

  public handleKeyUp(event: KeyboardEvent): void {
    // No specific key up handling needed for marquee mode
  }

  public handleMouseMove(event: MouseEvent): void {
    // No mouse movement handling needed for marquee mode
  }

  public handleClick(event: MouseEvent): void {
    // Clicking anywhere in marquee mode starts the game
    // (unless clicking on a specific UI element that has its own handler)
    if (!(event.target as Element).tagName.toLowerCase() === "button") {
      this.startGame();
    }
  }

  public handleTouchMove(event: TouchEvent): void {
    // No touch movement handling needed for marquee mode
  }

  public handleTouchStart(event: TouchEvent): void {
    // No specific touch start handling needed for marquee mode
    // Start button has its own click handler
  }

  private startGame(): void {
    // Transition to active game mode
    document.dispatchEvent(
      new CustomEvent("gameStatusChanged", {
        detail: { status: "active" },
      })
    );
  }
}
