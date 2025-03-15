import * as THREE from "three";
import { GameState } from "./types";
import { SceneSetup, setupScene } from "./scene";
import { createPlayer, setupPlayerControls, animatePlayer } from "./player";
import { EnemyManager } from "./enemies";
import { updateScore, showGameOver, updateGhostModeDisplay } from "./ui";
import { createLevel } from "./levels";

export class Game {
  // Game components
  private gameState: GameState;
  private sceneSetup: SceneSetup;
  private player: THREE.Group;
  private enemyManager: EnemyManager;
  private level: THREE.Group;
  private levelRadius: number = 10;
  private currentLevelType: string;

  // Game timing
  private lastEnemyTime: number = 0;
  private clock: THREE.Clock;

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
      ghostMode: false, // Add ghost mode property
    };

    // Set up clock for timing
    this.clock = new THREE.Clock();

    // Set up scene and add renderer to DOM
    this.sceneSetup = setupScene();
    document.body.appendChild(this.sceneSetup.renderer.domElement);

    // Store sceneSetup on window for access from UI component
    (window as any).sceneSetup = this.sceneSetup;

    // Create level and determine its type
    this.level = createLevel(
      this.sceneSetup.scene,
      this.gameState.currentLevel,
      this.levelRadius
    );
    this.currentLevelType = this.getLevelType(this.gameState.currentLevel);

    // Create player and set up controls
    this.player = createPlayer(
      this.sceneSetup.scene,
      this.gameState.playerSize,
      this.levelRadius
    );

    // Set up the modified controls
    this.setupModifiedControls();

    // Create enemy manager
    this.enemyManager = new EnemyManager(
      this.sceneSetup.scene,
      this.gameState,
      this.levelRadius
    );

    // Handle window resize
    this.setupResizeHandler();

    // Set up user interaction to start background soundtrack
    // document.addEventListener("click", this.startBackgroundSoundtrack, {
    //   once: true,
    // });
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

  private setupModifiedControls(): void {
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
            this.shoot();
            break;
          case "l": // Add "l" key to force level transition
            this.levelUp();
            break;
          case "g": // Add "g" key to toggle ghost mode
            this.toggleGhostMode();
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
      if (!this.gameState.isGameOver) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const mouseX = event.clientX - centerX;
        // Invert Y coordinate to fix the vertical inversion issue
        const mouseY = -(event.clientY - centerY);

        // Calculate angle to mouse position
        const mouseAngle = Math.atan2(mouseY, mouseX);

        // Update player angle based on level type
        this.updatePlayerAngleForLevelType(mouseAngle);
      }
    });

    // Mouse click to shoot
    document.addEventListener("click", () => {
      if (!this.gameState.isGameOver) {
        this.shoot();
      }
    });

    // Touch controls for mobile with level outline alignment
    document.addEventListener(
      "touchmove",
      (event: TouchEvent) => {
        if (!this.gameState.isGameOver && event.touches.length > 0) {
          const touch = event.touches[0];

          const centerX = window.innerWidth / 2;
          const centerY = window.innerHeight / 2;

          const touchX = touch.clientX - centerX;
          // Invert Y coordinate to fix the vertical inversion issue
          const touchY = -(touch.clientY - centerY);

          // Calculate angle to touch position
          const touchAngle = Math.atan2(touchY, touchX);

          // Update player angle based on level type
          this.updatePlayerAngleForLevelType(touchAngle);

          event.preventDefault();
        }
      },
      { passive: false }
    );

    // Touch to shoot
    document.addEventListener("touchstart", () => {
      if (!this.gameState.isGameOver) {
        this.shoot();
      }
    });

    // Update player angle based on keys in animation loop
    setInterval(() => {
      if (!this.gameState.isGameOver) {
        const moveSpeed = 0.1;

        if (keys.left) {
          this.gameState.playerAngle -= moveSpeed;
        }
        if (keys.right) {
          this.gameState.playerAngle += moveSpeed;
        }
      }
    }, 16); // ~60fps
  }

  // Add method to toggle ghost mode
  private toggleGhostMode(): void {
    this.gameState.ghostMode = !this.gameState.ghostMode;
    console.log("toggleGhostMode", this.gameState.ghostMode);

    // Update the UI display to show ghost mode status
    updateGhostModeDisplay(this.gameState.ghostMode);

    // Visual feedback for ghost mode
    if (this.gameState.ghostMode) {
      // Make player semi-transparent when ghost mode is active
      this.player.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.material.opacity = 0.5;
          object.material.transparent = true;
        }
      });

      console.log("Ghost mode activated!");
    } else {
      // Restore player opacity when ghost mode is deactivated
      this.player.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.material.opacity = 1.0;
          object.material.transparent = false;
        }
        if (object instanceof THREE.Mesh) {
          object.material.opacity = 1.0;
          object.material.transparent = false;
        }
      });
      console.log("Ghost mode deactivated!");
    }
  }

  private updatePlayerAngleForLevelType(targetAngle: number): void {
    // For all level types, we want the player to trace the outline
    // so we just use the target angle directly
    this.gameState.playerAngle = targetAngle;

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

  private startBackgroundSoundtrack = (): void => {
    const audio = new Audio("soundtrack-1.mp3");
    audio.volume = 1;
    audio.loop = true;
    audio.play();
  };

  public start(): void {
    // Start the game loop
    this.gameLoop();
  }

  private shoot(): void {
    // Play shooting sound
    const audio = new Audio("laser-1.mp3");
    audio.play();

    // Create a bullet
    const bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

    // Position the bullet at the player's position
    const playerAngle = this.gameState.playerAngle;
    const bulletSpeed = 0.3;

    // Get player position on level outline
    const playerPosition = this.getPositionOnLevelOutline(playerAngle);

    // Set initial bullet position at player's location
    bullet.position.x = playerPosition.x;
    bullet.position.y = playerPosition.y;

    // Calculate direction vector (pointing inward)
    const directionX = -Math.cos(playerAngle);
    const directionY = -Math.sin(playerAngle);

    this.sceneSetup.scene.add(bullet);
    this.gameState.bullets.push({
      mesh: bullet,
      direction: new THREE.Vector2(directionX, directionY),
      speed: bulletSpeed,
    });
  }

  private getPositionOnLevelOutline(angle: number): { x: number; y: number } {
    let x: number, y: number;

    switch (this.currentLevelType) {
      case "circle":
      case "spiral":
      case "pi":
        // Simple circle
        x = Math.cos(angle) * this.levelRadius;
        y = Math.sin(angle) * this.levelRadius;
        break;

      case "star":
        // Star level - calculate radius based on angle
        const starPoints = 3 + (this.gameState.currentLevel % 5);
        // Calculate how many vertices the star has (points * 2 for both inner and outer points)
        const totalVertices = starPoints * 2;
        // Calculate angle per vertex
        const anglePerVertex = (Math.PI * 2) / totalVertices;
        // Calculate which section of the star we're in
        const sectionIndex = Math.floor(angle / anglePerVertex);
        // Calculate progress within this section (0 to 1)
        const sectionProgress = (angle % anglePerVertex) / anglePerVertex;

        // Get the angles of the two vertices we're between
        const startVertexAngle = sectionIndex * anglePerVertex;
        const endVertexAngle = (sectionIndex + 1) * anglePerVertex;

        // Get the radii of these vertices (alternating between outer and inner)
        const startRadius =
          sectionIndex % 2 === 0 ? this.levelRadius : this.levelRadius * 0.6;
        const endRadius =
          sectionIndex % 2 === 0 ? this.levelRadius * 0.6 : this.levelRadius;

        // Calculate start and end positions
        const startX = Math.cos(startVertexAngle) * startRadius;
        const startY = Math.sin(startVertexAngle) * startRadius;
        const endX = Math.cos(endVertexAngle) * endRadius;
        const endY = Math.sin(endVertexAngle) * endRadius;

        // Linearly interpolate between start and end positions
        x = startX + (endX - startX) * sectionProgress;
        y = startY + (endY - startY) * sectionProgress;
        break;

      case "wave":
        // Wave level - adjust radius based on sine wave
        const amplitude = this.levelRadius * 0.05;
        const waveRadius =
          this.levelRadius + Math.sin(angle * 3.14) * amplitude;

        x = Math.cos(angle) * waveRadius;
        y = Math.sin(angle) * waveRadius;
        break;

      default:
        // Default to circle
        x = Math.cos(angle) * this.levelRadius;
        y = Math.sin(angle) * this.levelRadius;
        break;
    }

    return { x, y };
  }

  private gameLoop = (): void => {
    if (this.gameState.isGameOver) {
      return; // Stop animation loop if game is over
    }

    // Request next frame
    requestAnimationFrame(this.gameLoop);

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // Create new enemies periodically
    if (elapsedTime - this.lastEnemyTime > 1.5) {
      this.enemyManager.createEnemy();
      this.lastEnemyTime = elapsedTime;
    }

    // Update enemies
    this.enemyManager.update(delta);

    // Update bullets
    this.updateBullets(delta);

    // Check for enemy-bullet collisions
    this.checkBulletCollisions();

    // Check for player-enemy collisions (only if ghost mode is not active)
    if (
      !this.gameState.ghostMode &&
      this.enemyManager.checkPlayerCollision(this.player)
    ) {
      this.gameOver();
      return;
    }

    // Animate player
    animatePlayer(this.player);

    // Update player position based on current angle and level type
    const playerPosition = this.getPositionOnLevelOutline(
      this.gameState.playerAngle
    );
    this.player.position.set(playerPosition.x, playerPosition.y, 0);

    // Point player toward center
    this.player.lookAt(0, 0, 0);

    // Render the scene
    this.sceneSetup.renderer.render(
      this.sceneSetup.scene,
      this.sceneSetup.camera
    );
  };

  private updateBullets(delta: number): void {
    for (let i = this.gameState.bullets.length - 1; i >= 0; i--) {
      const bullet = this.gameState.bullets[i];

      // Move bullet
      bullet.mesh.position.x += bullet.direction.x * bullet.speed;
      bullet.mesh.position.y += bullet.direction.y * bullet.speed;

      // Remove bullets that are too close to center or out of bounds
      const distanceFromCenter = Math.sqrt(
        bullet.mesh.position.x * bullet.mesh.position.x +
          bullet.mesh.position.y * bullet.mesh.position.y
      );

      if (distanceFromCenter < 1 || distanceFromCenter > this.levelRadius + 5) {
        this.sceneSetup.scene.remove(bullet.mesh);
        this.gameState.bullets.splice(i, 1);
      }
    }
  }

  private checkBulletCollisions(): void {
    // Check each bullet against each enemy
    for (let i = this.gameState.bullets.length - 1; i >= 0; i--) {
      const bullet = this.gameState.bullets[i];
      let hitDetected = false;

      for (let j = this.gameState.enemies.length - 1; j >= 0; j--) {
        const enemy = this.gameState.enemies[j];

        // Simple distance-based collision detection
        const dx = bullet.mesh.position.x - enemy.mesh.position.x;
        const dy = bullet.mesh.position.y - enemy.mesh.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < enemy.size + 0.2) {
          // Collision detected

          // Trigger enemy explosion (which handles effects and smaller spheres)
          enemy.explode();

          // Remove the enemy after explosion triggered
          this.sceneSetup.scene.remove(enemy.mesh);
          this.gameState.enemies.splice(j, 1);

          // Calculate score based on enemy type (pi-based)
          const piMultiplier = 3.14 * this.gameState.currentLevel;
          const points = Math.floor(enemy.type * piMultiplier);
          this.gameState.score += points;

          updateScore(this.gameState);

          // Remove the bullet
          this.sceneSetup.scene.remove(bullet.mesh);
          this.gameState.bullets.splice(i, 1);
          hitDetected = true;

          // Increase difficulty every 100 points
          if (this.gameState.score % 100 === 0) {
            this.gameState.enemySpeed += 0.005;
          }

          // Level up every 314 points
          if (this.gameState.score > this.gameState.currentLevel * 314) {
            this.levelUp();
          }

          break;
        }
      }

      if (hitDetected) break;
    }
  }

  private levelUp(): void {
    // Increment level
    this.gameState.currentLevel++;

    // Remove old level
    this.sceneSetup.scene.remove(this.level);

    // Create new level
    this.level = createLevel(
      this.sceneSetup.scene,
      this.gameState.currentLevel,
      this.levelRadius
    );

    // Update the current level type
    this.currentLevelType = this.getLevelType(this.gameState.currentLevel);
  }

  private gameOver(): void {
    this.gameState.isGameOver = true;
    showGameOver(this.gameState);
  }
}
