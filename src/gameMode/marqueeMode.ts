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

  private isShrinking: boolean = false;
  private pulseTimer: number | null = null;

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
    titleElement.textContent = "BLOOD MOON";
    titleElement.style.fontSize = "64px";
    titleElement.style.margin = "20px 0";
    titleElement.style.textShadow = "0 0 10px #FF0000";
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
    startButton.style.boxShadow = "0 0 10px #FF0000";
    startButton.style.transition = "all 0.3s ease";

    // Add hover effect for the button
    startButton.addEventListener("mouseover", () => {
      startButton.style.backgroundColor = "#FF3333";
      startButton.style.transform = "scale(1.05)";
      startButton.style.boxShadow = "0 0 20px #FF3333";
    });

    startButton.addEventListener("mouseout", () => {
      startButton.style.backgroundColor = "#FF0000";
      startButton.style.transform = "scale(1)";
      startButton.style.boxShadow = "0 0 10px #FF0000";
    });

    startButton.addEventListener("click", () => {
      this.startGame();
    });

    marqueeContainer.appendChild(startButton);

    // Instructions
    const instructionsElement = document.createElement("div");
    instructionsElement.style.fontSize = "18px";
    instructionsElement.style.maxWidth = "600px";
    instructionsElement.style.margin = "20px 0";
    instructionsElement.style.textShadow = "0 0 5px #FF0000";
    instructionsElement.innerHTML = `
      <p>Use arrow keys or mouse to move</p>
      <p>Click or press space to shoot</p>
      <p>Press G to toggle ghost mode</p>
      <p>Press S to toggle enemy spawning</p>
      <p>Press SPACE or ENTER to start game</p>
    `;
    marqueeContainer.appendChild(instructionsElement);

    this.marqueeContainer = marqueeContainer;

    // Create the blood moon
    this.bloodMoon = new BloodMoon(this.sceneSetup.scene);
  }

  public enter(): void {
    document.body.appendChild(this.marqueeContainer);
    this.bloodMoon.enter();

    // Set up the Blood Moon for marquee mode
    // Move it to a visible position (slightly to the side for better aesthetics)
    this.bloodMoon.getGroup().position.set(-8, -5, -20);

    // Start with a moderate size
    this.bloodMoon.getGroup().scale.set(3, 3, 1);

    // Start the pulsation timer
    this.startBloodMoonAnimation();
  }

  public update(delta: number): void {
    // Pulse animation for Blood Moon in the marquee
    this.updateBloodMoonAnimation(delta);

    // Render the scene for visual effects
    this.sceneSetup.renderer.render(
      this.sceneSetup.scene,
      this.sceneSetup.camera
    );
  }

  public exit(): void {
    // Clean up the pulsation timer if it exists
    if (this.pulseTimer !== null) {
      window.clearTimeout(this.pulseTimer);
      this.pulseTimer = null;
    }

    document.body.removeChild(this.marqueeContainer);
    this.bloodMoon.exit();
  }

  // Start Blood Moon growing and shrinking animation
  private startBloodMoonAnimation(): void {
    // Initial state
    this.isShrinking = false;

    // Get the Blood Moon group
    const moonGroup = this.bloodMoon.getGroup();

    // Make sure it's visible and at a good initial size
    const initialScale = 3;
    moonGroup.scale.set(initialScale, initialScale, 1);
  }

  // Update Blood Moon animation
  private updateBloodMoonAnimation(delta: number): void {
    const moonGroup = this.bloodMoon.getGroup();
    const currentScale = moonGroup.scale.x;

    // Define min/max scales for the animation
    const minScale = 2.5;
    const maxScale = 3.5;
    const scaleSpeed = 0.25 * delta;

    // Update scale based on current direction
    if (this.isShrinking) {
      // Shrinking phase
      const newScale = Math.max(minScale, currentScale - scaleSpeed);
      moonGroup.scale.set(newScale, newScale, 1);

      // Check if minimum scale reached
      if (newScale <= minScale) {
        this.isShrinking = false;
      }
    } else {
      // Growing phase
      const newScale = Math.min(maxScale, currentScale + scaleSpeed);
      moonGroup.scale.set(newScale, newScale, 1);

      // Check if maximum scale reached
      if (newScale >= maxScale) {
        this.isShrinking = true;
      }
    }

    // Add a subtle rotation
    moonGroup.rotation.z += delta * 0.05;

    // Animate the color intensity
    const moon = moonGroup.children[1] as THREE.Mesh;
    const glow = moonGroup.children[0] as THREE.Mesh;

    if (moon.material && glow.material) {
      const moonMaterial = moon.material as THREE.MeshBasicMaterial;
      const glowMaterial = glow.material as THREE.MeshBasicMaterial;

      // Pulsate the color intensity with sin wave
      const time = Date.now() * 0.001;
      const intensity = 0.6 + 0.4 * Math.sin(time * 0.5);

      moonMaterial.color.setRGB(intensity * 0.67, 0, 0);
      glowMaterial.color.setRGB(intensity, intensity * 0.2, intensity * 0.2);

      // Adjust the glow size too
      const glowScale = 1 + 0.1 * Math.sin(time * 0.7);
      glow.scale.set(glowScale, glowScale, 1);

      // Also animate the title text to pulse with the Blood Moon
      this.updateTitlePulsation(intensity);
    }
  }

  // Sync the title pulsation with the Blood Moon
  private updateTitlePulsation(intensity: number): void {
    // Find the title element
    const titleElement = document.querySelector("#marquee-container h1");
    if (titleElement) {
      // Calculate text shadow based on intensity
      const shadowSize = Math.floor(10 + intensity * 15);
      const brightnessValue = Math.floor(155 + intensity * 100);

      // Apply the pulsing glow effect
      (
        titleElement as HTMLElement
      ).style.textShadow = `0 0 ${shadowSize}px rgba(255, ${brightnessValue}, ${brightnessValue}, ${intensity})`;

      // Slight scale effect
      const scale = 1 + (intensity - 0.6) * 0.08;
      (titleElement as HTMLElement).style.transform = `scale(${scale})`;
    }

    // Also give a subtle pulse to the start button
    const startButton = document.querySelector("#marquee-container button");
    if (startButton) {
      const buttonGlow = Math.floor(10 + intensity * 15);
      (
        startButton as HTMLElement
      ).style.boxShadow = `0 0 ${buttonGlow}px rgba(255, ${Math.floor(
        intensity * 100
      )}, ${Math.floor(intensity * 50)}, 1)`;
    }
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
