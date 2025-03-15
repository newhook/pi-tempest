import * as THREE from "three";
import { GameState, GameStatus } from "./types";
import { SceneSetup, setupScene } from "./scene";
import { createPlayer } from "./player";
import { EnemyManager } from "./enemies";
import { createLevel } from "./levels";
import { BloodMoon } from "./bloodMoon";

// Import game modes
import { GameMode } from "./gameMode/gameMode";
import { MarqueeMode } from "./gameMode/marqueeMode";
import { ActiveMode } from "./gameMode/activeMode";
import { GameOverMode } from "./gameMode/gameOverMode";

export class Game {
  // Game components
  private gameState: GameState;
  private sceneSetup: SceneSetup;
  private player: THREE.Group;
  private enemyManager: EnemyManager;
  private level: THREE.Group;
  private levelRadius: number = 10;
  private currentLevelType: string;
  private bloodMoon: BloodMoon;
  private clock: THREE.Clock;

  // Game modes
  private currentMode: GameMode;
  private gameModes: Record<GameStatus, GameMode>;

  constructor() {
    // Initialize game state
    this.gameState = {
      score: 0,
      playerSize: 0.5,
      playerAngle: 0,
      enemySpeed: 0.03,
      enemies: [],
      bullets: [],
      currentLevel: 1,
      isGameOver: false,
      ghostMode: false,
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

    // Create level and determine its type
    this.level = createLevel(
      this.sceneSetup.scene,
      this.gameState.currentLevel,
      this.levelRadius
    );
    this.currentLevelType = this.getLevelType(this.gameState.currentLevel);

    // Create player
    this.player = createPlayer(
      this.sceneSetup.scene,
      this.gameState.playerSize,
      this.levelRadius
    );

    // Create enemy manager
    this.enemyManager = new EnemyManager(
      this.sceneSetup.scene,
      this.gameState,
      this.levelRadius
    );

    // Create the blood moon
    this.bloodMoon = new BloodMoon(this.sceneSetup.scene);

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
    // Create all game modes
    this.gameModes = {
      marquee: new MarqueeMode(this.sceneSetup, this.gameState, this.player),
      active: new ActiveMode(
        this.sceneSetup,
        this.gameState,
        this.player,
        this.enemyManager,
        this.level,
        this.levelRadius,
        this.currentLevelType,
        this.bloodMoon,
        this.clock
      ),
      gameOver: new GameOverMode(this.sceneSetup, this.gameState, this.player)
    };

    // Set initial mode
    this.currentMode = this.gameModes[this.gameState.gameStatus];
    this.currentMode.enter();
  }

  private getLevelType(levelNumber: number): string {
    switch ((levelNumber - 1) % 5) {
      case 0:
        return "circle";
      case 1:
        return "spiral";
      case 2:
        return "star";
      case 3:
        return "pi";
      case 4:
        return "wave";
      default:
        return "circle";
    }
  }

  private setupControls(): void {
    // Track key states
    const keys = {
      left: false,
      right: false,
    };

    // Keyboard controls
    document.addEventListener("keydown", (event: KeyboardEvent) => {
      if (!this.gameState.isGameOver) {
        switch (event.key) {
          case "ArrowLeft":
          case "a":
            keys.left = true;
            break;
          case "ArrowRight":
          case "d":
            keys.right = true;
            break;
          case " ":
            if (this.gameState.gameStatus === "active") {
              (this.gameModes.active as ActiveMode).shoot();
            }
            break;
          case "l": // Add "l" key to force level transition
            if (this.gameState.gameStatus === "active") {
              (this.gameModes.active as ActiveMode).levelUp();
            }
            break;
          case "g": // Add "g" key to toggle ghost mode
            if (this.gameState.gameStatus === "active") {
              (this.gameModes.active as ActiveMode).toggleGhostMode();
            }
            break;
        }
      }
    });

    document.addEventListener("keyup", (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowLeft":
        case "a":
          keys.left = false;
          break;
        case "ArrowRight":
        case "d":
          keys.right = false;
          break;
      }
    });

    // Modified mouse controls for alignment with level outline
    document.addEventListener("mousemove", (event: MouseEvent) => {
      if (!this.gameState.isGameOver && this.gameState.gameStatus === "active") {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const mouseX = event.clientX - centerX;
        // Invert Y coordinate to fix the vertical inversion issue
        const mouseY = -(event.clientY - centerY);

        // Calculate angle to mouse position
        const mouseAngle = Math.atan2(mouseY, mouseX);

        // Update player angle
        this.updatePlayerAngle(mouseAngle);
      }
    });

    // Mouse click to shoot
    document.addEventListener("click", () => {
      if (!this.gameState.isGameOver && this.gameState.gameStatus === "active") {
        (this.gameModes.active as ActiveMode).shoot();
      }
    });

    // Touch controls for mobile
    document.addEventListener(
      "touchmove",
      (event: TouchEvent) => {
        if (!this.gameState.isGameOver && 
            this.gameState.gameStatus === "active" && 
            event.touches.length > 0) {
          const touch = event.touches[0];

          const centerX = window.innerWidth / 2;
          const centerY = window.innerHeight / 2;

          const touchX = touch.clientX - centerX;
          // Invert Y coordinate to fix the vertical inversion issue
          const touchY = -(touch.clientY - centerY);

          // Calculate angle to touch position
          const touchAngle = Math.atan2(touchY, touchX);

          // Update player angle
          this.updatePlayerAngle(touchAngle);

          event.preventDefault();
        }
      },
      { passive: false }
    );

    // Touch to shoot
    document.addEventListener("touchstart", () => {
      if (!this.gameState.isGameOver && this.gameState.gameStatus === "active") {
        (this.gameModes.active as ActiveMode).shoot();
      }
    });

    // Update player angle based on keys in animation loop
    setInterval(() => {
      if (!this.gameState.isGameOver && this.gameState.gameStatus === "active") {
        const moveSpeed = 0.1;

        if (keys.left) {
          this.gameState.playerAngle -= moveSpeed;
          this.normalizePlayerAngle();
        }
        if (keys.right) {
          this.gameState.playerAngle += moveSpeed;
          this.normalizePlayerAngle();
        }
      }
    }, 16); // ~60fps
  }

  private updatePlayerAngle(targetAngle: number): void {
    // Set player angle directly
    this.gameState.playerAngle = targetAngle;
    this.normalizePlayerAngle();
  }

  private normalizePlayerAngle(): void {
    // Normalize angle to be between 0 and 2π for calculations
    while (this.gameState.playerAngle < 0)
      this.gameState.playerAngle += Math.PI * 2;
    while (this.gameState.playerAngle >= Math.PI * 2)
      this.gameState.playerAngle -= Math.PI * 2;
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
    const oldStatus = this.gameState.gameStatus;
    
    // Exit the current mode
    this.currentMode.exit();
    
    // Update game state
    this.gameState.gameStatus = newStatus;
    
    // Update active mode with latest level info if transitioning to active mode
    if (newStatus === "active" && this.level) {
      this.gameModes.active = new ActiveMode(
        this.sceneSetup,
        this.gameState,
        this.player,
        this.enemyManager,
        this.level,
        this.levelRadius,
        this.currentLevelType,
        this.bloodMoon,
        this.clock
      );
    }
    
    // Set and enter the new mode
    this.currentMode = this.gameModes[newStatus];
    this.currentMode.enter();
  }
}
