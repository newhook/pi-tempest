import * as THREE from "three";
import { GameState, GameStatus } from "./types";
import { SceneSetup, setupScene } from "./scene";

// Import game modes
import { GameMode } from "./gameMode/gameMode";
import { MarqueeMode } from "./gameMode/marqueeMode";
import { ActiveMode } from "./gameMode/activeMode";
import { GameOverMode } from "./gameMode/gameOverMode";

export class Game {
  // Game components
  private gameState: GameState;
  private sceneSetup: SceneSetup;
  private clock: THREE.Clock;

  // Current game mode
  private currentMode: GameMode;
  private activeMode: ActiveMode | null = null;

  constructor() {
    // Initialize game state with only shared properties
    this.gameState = {
      score: 0,
      currentLevel: 1,
      gameStatus: "marquee",
    };

    // Set up clock for timing
    this.clock = new THREE.Clock();

    // Set up scene and add renderer to DOM
    this.sceneSetup = setupScene();
    document.body.appendChild(this.sceneSetup.renderer.domElement);

    // Store sceneSetup and gameState on window for access from UI component
    (window as any).sceneSetup = this.sceneSetup;
    (window as any).gameState = this.gameState;

    // Initialize game modes
    this.initGameModes();

    // Set up event handlers for game status changes
    this.setupGameStatusHandlers();

    // Set up controls
    this.setupControls();

    // Handle window resize
    this.setupResizeHandler();
  }

  private initGameModes(): void {
    // Create and set the initial mode (marquee)
    this.currentMode = new MarqueeMode(this.sceneSetup, this.gameState);
    this.currentMode.enter();
  }

  private setupControls(): void {
    // Keyboard controls
    document.addEventListener("keydown", (event: KeyboardEvent) => {
      // Forward the event to the current mode
      this.currentMode.handleKeyDown(event);
    });

    document.addEventListener("keyup", (event: KeyboardEvent) => {
      // Forward the event to the current mode
      this.currentMode.handleKeyUp(event);
    });

    // Mouse controls
    document.addEventListener("mousemove", (event: MouseEvent) => {
      // Forward the event to the current mode
      this.currentMode.handleMouseMove(event);
    });

    document.addEventListener("click", (event: MouseEvent) => {
      // Forward the event to the current mode
      this.currentMode.handleClick(event);
    });

    // Touch controls
    document.addEventListener(
      "touchmove",
      (event: TouchEvent) => {
        // Forward the event to the current mode
        this.currentMode.handleTouchMove(event);
      },
      { passive: false }
    );

    document.addEventListener("touchstart", (event: TouchEvent) => {
      // Forward the event to the current mode
      this.currentMode.handleTouchStart(event);
    });
  }

  private setupResizeHandler(): void {
    window.addEventListener("resize", () => {
      // Update camera
      this.sceneSetup.camera.aspect = window.innerWidth / window.innerHeight;
      this.sceneSetup.camera.updateProjectionMatrix();

      // Update renderer
      this.sceneSetup.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  public start(): void {
    // Start the game loop
    this.gameLoop();
  }

  private gameLoop = (): void => {
    // Request next frame
    requestAnimationFrame(this.gameLoop);

    // Get time delta
    const delta = this.clock.getDelta();

    // Update current mode
    this.currentMode.update(delta);
  };

  // Set up game status event handlers
  private setupGameStatusHandlers(): void {
    // Listen for game status change events
    document.addEventListener("gameStatusChanged", (event: Event) => {
      const customEvent = event as CustomEvent;
      const newStatus = customEvent.detail?.status as GameStatus;

      if (newStatus && newStatus !== this.gameState.gameStatus) {
        this.changeGameMode(newStatus);
      }
    });
  }

  // Handle changes to game mode
  private changeGameMode(newStatus: GameStatus): void {
    // Exit the current mode
    this.currentMode.exit();
    
    // Update game state
    this.gameState.gameStatus = newStatus;
    
    // Create the new mode
    switch (newStatus) {
      case "active":
        this.activeMode = new ActiveMode(this.sceneSetup, this.gameState, this.clock);
        this.currentMode = this.activeMode;
        break;
      case "gameOver":
        this.currentMode = new GameOverMode(this.sceneSetup, this.gameState);
        break;
      case "marquee":
        this.currentMode = new MarqueeMode(this.sceneSetup, this.gameState);
        break;
    }
    
    // Enter the new mode
    this.currentMode.enter();
  }
}
