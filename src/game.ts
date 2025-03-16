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

  // Game modes
  private currentMode: GameMode;
  private gameModes: Record<GameStatus, GameMode>;

  constructor() {
    // Initialize game state with only shared properties
    this.gameState = {
      score: 0,
      currentLevel: 1,
      gameStatus: "marquee",
      lives: 3, // Start with three lives
    };

    // Set up clock for timing
    this.clock = new THREE.Clock();

    // Set up scene and add renderer to DOM
    this.sceneSetup = setupScene();
    document.body.appendChild(this.sceneSetup.renderer.domElement);

    // Store sceneSetup and gameState on window for access from UI component
    (window as any).sceneSetup = this.sceneSetup;
    (window as any).gameState = this.gameState;

    // Set up event handlers for game status changes
    this.setupGameStatusHandlers();

    // Set up controls
    this.setupControls();

    // Handle window resize
    this.setupResizeHandler();

    this.gameModes = {
      marquee: new MarqueeMode(this.sceneSetup, this.gameState),
      active: new ActiveMode(this.sceneSetup, this.gameState, this.clock),
      gameOver: new GameOverMode(this.sceneSetup, this.gameState),
    };

    // Set the current mode to the initial mode
    this.currentMode = this.gameModes.marquee;

    // Enter the initial mode
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

    document.addEventListener("mousedown", (event: MouseEvent) => {
      // Forward the event to the current mode
      if (this.currentMode.handleMouseDown) {
        this.currentMode.handleMouseDown(event);
      }
    });

    document.addEventListener("click", (event: MouseEvent) => {
      // Forward the event to the current mode
      this.currentMode.handleClick(event);
    });
    
    document.addEventListener("mouseup", (event: MouseEvent) => {
      // Forward the event to the current mode
      if (this.currentMode.handleMouseUp) {
        this.currentMode.handleMouseUp(event);
      }
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
    
    document.addEventListener("touchend", (event: TouchEvent) => {
      // Forward the event to the current mode
      if (this.currentMode.handleTouchEnd) {
        this.currentMode.handleTouchEnd(event);
      }
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

    // Set and enter the new mode
    this.currentMode = this.gameModes[newStatus];
    this.currentMode.enter();
  }
}
