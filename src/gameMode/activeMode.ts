import * as THREE from "three";
import { GameState, Bullet } from "../types";
import { GameMode } from "./gameMode";
import { SceneSetup } from "../scene";
import { EnemyManager } from "../enemies";
import { updateScore } from "../ui";
import { createPlayer, animatePlayer } from "../player";
import { BloodMoon } from "../bloodMoon";
import { createLevel } from "../levels";

export class ActiveMode implements GameMode {
  private sceneSetup: SceneSetup;
  private gameState: GameState;
  private player: THREE.Group;
  private enemyManager: EnemyManager;
  private clock: THREE.Clock;
  private lastEnemyTime: number = 0;
  private level: THREE.Group;
  private levelRadius: number = 10;
  private currentLevelType: string;
  private bloodMoon: BloodMoon;
  private transitionInProgress: boolean = false;

  constructor(sceneSetup: SceneSetup, gameState: GameState, clock: THREE.Clock) {
    this.sceneSetup = sceneSetup;
    this.gameState = gameState;
    this.clock = clock;
    
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
    this.player.visible = false; // Initially hidden, will be shown in enter()

    // Create enemy manager
    this.enemyManager = new EnemyManager(
      this.sceneSetup.scene,
      this.gameState,
      this.levelRadius
    );

    // Create the blood moon
    this.bloodMoon = new BloodMoon(this.sceneSetup.scene);
  }

  public getPlayer(): THREE.Group {
    return this.player;
  }

  public enter(): void {
    // Show player and enable gameplay
    this.player.visible = true;

    // Reset enemy spawn timer to start spawning enemies
    this.lastEnemyTime = this.clock.getElapsedTime();

    // Reset game elements for a fresh start
    this.gameState.isGameOver = false;

    // Clear any existing enemies
    this.destroyAllEnemies();
  }

  public update(delta: number): void {
    const elapsedTime = this.clock.getElapsedTime();

    // Create new enemies periodically
    if (elapsedTime - this.lastEnemyTime > 1.5 && !this.transitionInProgress) {
      this.enemyManager.createEnemy();
      this.lastEnemyTime = elapsedTime;
    }

    // Update enemies
    this.enemyManager.update(delta);

    // Update bullets
    this.updateBullets(delta);

    // Check for enemy-bullet collisions
    this.checkBulletCollisions();

    // Check for player-enemy collisions (only if ghost mode is not active and not during transition)
    if (
      !this.gameState.ghostMode &&
      !this.transitionInProgress &&
      this.enemyManager.checkPlayerCollision(this.player)
    ) {
      document.dispatchEvent(
        new CustomEvent("gameStatusChanged", {
          detail: { status: "gameOver" },
        })
      );
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
  }

  public exit(): void {
    // Hide player when exiting active mode
    this.player.visible = false;
  }

  public shoot(): void {
    // Don't shoot if in transition
    if (this.transitionInProgress) return;
    
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

  public async levelUp(): Promise<void> {
    if (this.transitionInProgress) return;
    this.transitionInProgress = true;

    // Show level completed text
    this.showLevelCompletedText();

    // Wait a moment for user to read the text
    await this.delay(1500);

    // Destroy all enemies
    this.destroyAllEnemies();

    // Fly the player ship to the blood moon
    await this.flyPlayerToBloodMoon();

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

    // Reset player position to level outline
    const playerPosition = this.getPositionOnLevelOutline(
      this.gameState.playerAngle
    );
    this.player.position.set(playerPosition.x, playerPosition.y, 0);
    this.player.lookAt(0, 0, 0);

    // Add a brief delay before ending the transition
    await this.delay(500);

    // Fade out the blood moon if it exists
    this.bloodMoon.fadeOut();

    // Give a brief period of invulnerability after level change
    this.gameState.ghostMode = true;
    this.updateGhostModeDisplay(true);

    // Make the player semi-transparent to indicate invulnerability
    this.player.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.material.opacity = 0.5;
        object.material.transparent = true;
      }
    });

    // Resume normal gameplay
    this.transitionInProgress = false;

    // End invulnerability after a brief period
    setTimeout(() => {
      this.gameState.ghostMode = false;
      this.updateGhostModeDisplay(false);

      // Restore player opacity
      this.player.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.material.opacity = 1.0;
          object.material.transparent = false;
        }
      });
    }, 2000);
  }

  public toggleGhostMode(): void {
    if (this.transitionInProgress) return;
    
    this.gameState.ghostMode = !this.gameState.ghostMode;

    // Update the UI display to show ghost mode status
    this.updateGhostModeDisplay(this.gameState.ghostMode);

    // Visual feedback for ghost mode
    if (this.gameState.ghostMode) {
      // Make player semi-transparent when ghost mode is active
      this.player.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.material.opacity = 0.5;
          object.material.transparent = true;
        }
      });
    } else {
      // Restore player opacity when ghost mode is deactivated
      this.player.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.material.opacity = 1.0;
          object.material.transparent = false;
        }
      });
    }
  }

  private updateGhostModeDisplay(isActive: boolean): void {
    // Get existing ghost mode display or create a new one
    let ghostModeElement = document.getElementById("ghost-mode");
    
    if (!ghostModeElement) {
      ghostModeElement = document.createElement("div");
      ghostModeElement.id = "ghost-mode";
      ghostModeElement.style.position = "absolute";
      ghostModeElement.style.top = "60px";
      ghostModeElement.style.right = "20px";
      ghostModeElement.style.color = "#00FFFF";
      ghostModeElement.style.fontFamily = "Arial, sans-serif";
      ghostModeElement.style.fontSize = "20px";
      document.body.appendChild(ghostModeElement);
    }
    
    if (isActive) {
      ghostModeElement.textContent = "GHOST MODE: ACTIVE";
      ghostModeElement.style.display = "block";
    } else {
      ghostModeElement.style.display = "none";
    }
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

  private showLevelCompletedText(): void {
    const levelCompleted = document.createElement("div");
    levelCompleted.textContent = "LEVEL COMPLETED";
    levelCompleted.style.position = "absolute";
    levelCompleted.style.top = "10%";
    levelCompleted.style.left = "50%";
    levelCompleted.style.transform = "translateX(-50%)";
    levelCompleted.style.color = "#FF0000";
    levelCompleted.style.fontFamily = "Arial, sans-serif";
    levelCompleted.style.fontSize = "36px";
    levelCompleted.style.fontWeight = "bold";
    levelCompleted.id = "level-completed-text";

    document.body.appendChild(levelCompleted);

    // Remove the text after the transition
    setTimeout(() => {
      const textElement = document.getElementById("level-completed-text");
      if (textElement) {
        document.body.removeChild(textElement);
      }
    }, 3000);
  }

  private destroyAllEnemies(): void {
    // Remove all enemies
    for (const enemy of this.gameState.enemies) {
      enemy.explode(); // Trigger explosion effect
      this.sceneSetup.scene.remove(enemy.mesh);
    }
    this.gameState.enemies = [];
  }

  private async flyPlayerToBloodMoon(): Promise<void> {
    const duration = 1500; // 1.5 seconds
    const startPosition = {
      x: this.player.position.x,
      y: this.player.position.y,
      z: this.player.position.z,
    };

    return new Promise<void>((resolve) => {
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation
        const easeProgress =
          progress < 0.5
            ? 2 * progress * progress
            : -1 + (4 - 2 * progress) * progress;

        // Move player toward blood moon (center)
        this.player.position.x = startPosition.x * (1 - easeProgress);
        this.player.position.y = startPosition.y * (1 - easeProgress);
        this.player.position.z = startPosition.z + easeProgress * 2; // Move slightly forward

        // Shrink player as it approaches "distance"
        const scale = 1 - easeProgress * 0.5;
        this.player.scale.set(scale, scale, scale);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Reset player scale
          this.player.scale.set(1, 1, 1);
          resolve();
        }

        // Render during animation
        this.sceneSetup.renderer.render(
          this.sceneSetup.scene,
          this.sceneSetup.camera
        );
      };

      animate();
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}