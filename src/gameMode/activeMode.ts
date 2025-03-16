import * as THREE from "three";
import { GameState, ActiveModeState, Bullet } from "../types";
import { GameMode } from "./gameMode";
import { SceneSetup } from "../scene";
import { EnemyManager } from "../enemies";
import { Enemy } from "../enemy";
import { updateScore, updateCountdownTimer } from "../ui";
import { createPlayer, animatePlayer } from "../player";
import { BloodMoon } from "../bloodMoon";
import { Level, LevelType } from "../levels";
import { SoundManager } from "../synth";

export class ActiveMode implements GameMode {
  private sceneSetup: SceneSetup;
  private gameState: GameState;
  private player: THREE.Group;
  private enemyManager: EnemyManager;
  private clock: THREE.Clock;
  private nextEnemyTime: number = 0;
  private level!: Level;
  private levelRadius: number = 10;
  private bloodMoon: BloodMoon;
  private transitionInProgress: boolean = false;
  private keys = {
    left: false,
    right: false,
  };
  private isMouseDown: boolean = false;
  private shootingInterval: number | null = null;
  private keyMovementInterval: number | null = null;
  private piLevelRotationDirection: number = 1; // 1 for clockwise, -1 for counter-clockwise
  private nextDirectionChangeTime: number = 0;

  // Active mode specific state
  private modeState: ActiveModeState = {
    playerSize: 0.5,
    playerAngle: 0,
    enemySpeed: 0.03,
    enemies: [],
    bullets: [],
    enemyBullets: [],
    explosions: [], // Track active explosions
    ghostMode: false,
    spawnEnemies: true, // Enemies spawn by default
  };

  constructor(
    sceneSetup: SceneSetup,
    gameState: GameState,
    clock: THREE.Clock
  ) {
    this.sceneSetup = sceneSetup;
    this.gameState = gameState;
    this.clock = clock;

    this.player = createPlayer(this.modeState.playerSize, this.levelRadius);

    // Create the blood moon but don't add it to the scene yet
    this.bloodMoon = new BloodMoon(this.sceneSetup.scene);

    this.enemyManager = new EnemyManager(
      this.sceneSetup.scene,
      this.gameState,
      this.modeState
    );
  }

  public getPlayer(): THREE.Group {
    return this.player;
  }

  public enter(): void {
    this.level = new Level(this.gameState.currentLevel, this.levelRadius);
    this.sceneSetup.scene.add(this.level.getGroup());

    // Ensure player is in the scene
    this.sceneSetup.scene.add(this.player);

    // Configure the blood moon with the current level's radius
    this.bloodMoon.setLevelRadius(this.levelRadius);
    this.bloodMoon.enter();

    // Immediately start the blood moon growing (this will be invisible at first)
    this.bloodMoon.startGrowing(60);

    // Show the initial countdown time of 60 seconds
    updateCountdownTimer(60);

    // Initialize or update the lives display
    import("../ui").then((ui) => ui.updateLives(this.gameState));

    // Display level start messages only on the first level
    if (this.gameState.currentLevel === 1) {
      this.showLevelStartText();
    }

    // Reset rotation direction change timer for Pi symbol level
    this.piLevelRotationDirection = Math.random() < 0.5 ? 1 : -1; // Random initial direction
    this.nextDirectionChangeTime =
      this.clock.getElapsedTime() + 5 + Math.random() * 5; // Change direction after 5-10 seconds

    // Reset enemy spawn timer to start spawning enemies
    this.nextEnemyTime = this.clock.getElapsedTime();

    // Reset enemy spawning to random (not forced) when starting
    this.modeState.forcedEnemyType = undefined;

    // Set up player movement based on keys
    // Update player angle based on keys in animation loop
    this.keyMovementInterval = window.setInterval(() => {
      const moveSpeed = 0.1;

      if (this.keys.left) {
        this.modeState.playerAngle -= moveSpeed;
        this.normalizePlayerAngle();
      }
      if (this.keys.right) {
        this.modeState.playerAngle += moveSpeed;
        this.normalizePlayerAngle();
      }
    }, 16); // ~60fps

    // Reset player position
    const playerPosition = this.getPositionOnLevelOutline(
      this.modeState.playerAngle
    );
    this.player.position.set(playerPosition.x, playerPosition.y, 0);
    this.player.lookAt(0, 0, 0);
  }

  public update(delta: number): void {
    const elapsedTime = this.clock.getElapsedTime();

    // Get remaining time and update the countdown timer
    if (!this.transitionInProgress) {
      const remainingSeconds = this.bloodMoon.getRemainingTime();
      updateCountdownTimer(remainingSeconds);

      // Check if time has run out (and not in ghost mode)
      if (remainingSeconds <= 0 && !this.modeState.ghostMode) {
        this.handleBloodMoonReachedBoundary();
        return;
      }
    }

    // Check if the blood moon has reached the level boundary (backup check)
    if (!this.transitionInProgress && !this.modeState.ghostMode) {
      const moonProgress = this.bloodMoon.getGrowthProgress();
      if (moonProgress >= 0.99) {
        // Moon has reached the boundary, end the game if the player hasn't cleared the level
        this.handleBloodMoonReachedBoundary();
        return;
      }
    }

    // Rotate certain level types
    if (this.level.levelType === LevelType.Spiral) {
      // Rotate Spiral level at a constant speed
      const rotationSpeed = 0.005; // radians per frame
      this.level.rotateLevel(rotationSpeed * delta * 30);
    } else if (this.level.levelType === LevelType.PiSymbol) {
      // Rotate Pi level with direction changes
      const rotationSpeed = 0.007; // slightly faster than spiral level

      // Check if it's time to change rotation direction
      const currentTime = this.clock.getElapsedTime();
      if (currentTime >= this.nextDirectionChangeTime) {
        // Change direction
        this.piLevelRotationDirection *= -1;

        // Schedule next direction change (between 5 and 10 seconds from now)
        this.nextDirectionChangeTime = currentTime + 5 + Math.random() * 5;
      }

      // Apply rotation with current direction
      this.level.rotateLevel(
        this.piLevelRotationDirection * rotationSpeed * delta * 30
      );
    } else if (this.level.levelType === LevelType.Wave) {
      // Rotate Wave level at a constant speed in the opposite direction
      const rotationSpeed = 0.005; // radians per frame
      this.level.rotateLevel(-1 * rotationSpeed * delta * 30);
    }

    // Create new enemies periodically if enemy spawning is enabled
    if (
      this.modeState.spawnEnemies &&
      elapsedTime >= this.nextEnemyTime &&
      !this.transitionInProgress
    ) {
      this.enemyManager.createEnemy(this.level);

      const nextTime = 0.5 + 0.5 * (this.bloodMoon.getRemainingTime() / 60);
      this.nextEnemyTime = elapsedTime + 0.5 + Math.random() * nextTime;
    }

    // Update enemies
    this.enemyManager.update(delta, this.level);

    // Update player bullets
    this.updateBullets(delta);

    // Update enemy bullets
    this.updateEnemyBullets(delta);

    // Check for enemy-bullet collisions
    this.checkBulletCollisions();

    // Only check for collisions if the player is vulnerable
    if (!this.modeState.ghostMode && !this.transitionInProgress) {
      let playerHit = false;

      // Check each type of collision separately, but only process the first hit
      if (this.enemyManager.checkPlayerCollision(this.player)) {
        playerHit = true;
      } else if (this.checkPlayerHitByEnemyBullets()) {
        playerHit = true;
      } else if (this.checkPlayerHitByExplosion()) {
        playerHit = true;
      }

      // If player was hit, handle the collision
      if (playerHit) {
        // Stop current sounds
        SoundManager.getInstance().stopAllSounds();
        
        // Decrement lives when player is hit
        this.gameState.lives--;

        // Update lives UI
        import("../ui").then((ui) => ui.updateLives(this.gameState));

        if (this.gameState.lives <= 0) {
          // Game over if no lives left
          document.dispatchEvent(
            new CustomEvent("gameStatusChanged", {
              detail: { status: "gameOver" },
            })
          );
          return;
        } else {
          // Respawn player with temporary invulnerability
          this.respawnPlayer();
          return;
        }
      }
    }

    // Animate player
    animatePlayer(this.player);

    // Update player position based on current angle and level type
    const playerPosition = this.getPositionOnLevelOutline(
      this.modeState.playerAngle
    );
    this.player.position.set(playerPosition.x, playerPosition.y, 0);

    // Store current player position in modeState for enemy targeting
    this.modeState.playerPosition = {
      x: playerPosition.x,
      y: playerPosition.y,
    };

    // Point player toward center
    this.player.lookAt(0, 0, 0);

    // Render the scene
    this.sceneSetup.renderer.render(
      this.sceneSetup.scene,
      this.sceneSetup.camera
    );
  }

  public exit(): void {
    // Clean up player if it exists
    this.sceneSetup.scene.remove(this.player);

    // Remove all enemies
    this.destroyAllEnemies();

    // Remove all player bullets
    for (const bullet of this.modeState.bullets) {
      this.sceneSetup.scene.remove(bullet.mesh);
    }
    this.modeState.bullets = [];

    // Remove all enemy bullets
    for (const bullet of this.modeState.enemyBullets) {
      this.sceneSetup.scene.remove(bullet.mesh);
    }
    this.modeState.enemyBullets = [];

    // Remove level if it exists
    this.sceneSetup.scene.remove(this.level.getGroup());

    this.bloodMoon.exit();

    // Cancel any ongoing intervals
    if (this.keyMovementInterval) {
      clearInterval(this.keyMovementInterval);
      this.keyMovementInterval = null;
    }

    // Cancel any ongoing shooting interval
    if (this.shootingInterval) {
      clearInterval(this.shootingInterval);
      this.shootingInterval = null;
    }
  }

  public shoot(): void {
    // Don't shoot if in transition or player doesn't exist
    if (this.transitionInProgress) return;

    // Play shooting sound
    SoundManager.getInstance().playLaser();

    // Create a bullet
    const bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

    // Position the bullet at the player's position
    const playerAngle = this.modeState.playerAngle;
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
    this.modeState.bullets.push({
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
    await this.delay(1000);

    // Destroy all enemies
    this.destroyAllEnemies();

    // 1. EXPAND THE BLOOD MOON TO FILL THE LEVEL

    // Expand the Blood Moon to fill the level
    this.bloodMoon.startGrowing(1.5);

    // Wait 1.5s, and then wait briefly at maximum size for dramatic effect
    await this.delay(2000);

    // 2. SHRINK THE MOON WHILE FLYING THE PLAYER TO CENTER

    // Start the Blood Moon collapsing animation
    this.bloodMoon.startShrinking(2);

    // Simultaneously fly the player to the center
    await this.flyPlayerToBloodMoon();

    // Wait briefly for dramatic effect after collapse
    await this.delay(300);

    // 3. CREATE NEW LEVEL AND RESET EVERYTHING

    // Increment level
    this.gameState.currentLevel++;

    // Remove old level
    this.sceneSetup.scene.remove(this.level.getGroup());

    // Create new level
    this.level = new Level(this.gameState.currentLevel, this.levelRadius);
    this.sceneSetup.scene.add(this.level.getGroup());

    // Reset enemy spawning to random
    this.modeState.forcedEnemyType = undefined;
    this.updateForcedEnemyTypeDisplay();

    // Reset rotation direction change timer for Pi symbol level
    this.piLevelRotationDirection = Math.random() < 0.5 ? 1 : -1; // Random initial direction
    this.nextDirectionChangeTime =
      this.clock.getElapsedTime() + 5 + Math.random() * 5; // Change after 5-10 seconds

    // Reset player position to level outline
    const playerPosition = this.getPositionOnLevelOutline(
      this.modeState.playerAngle
    );
    this.player.position.set(playerPosition.x, playerPosition.y, 0);
    this.player.lookAt(0, 0, 0);

    this.bloodMoon.setLevelRadius(this.levelRadius);

    // Start the Blood Moon growing for the new level
    this.bloodMoon.startGrowing(60);

    // Reset the countdown timer for the new level
    updateCountdownTimer(60);

    // No level start messages on level transitions

    // Give a brief period of invulnerability after level change
    this.modeState.ghostMode = true;
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
      this.modeState.ghostMode = false;
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

    this.modeState.ghostMode = !this.modeState.ghostMode;

    // Update the UI display to show ghost mode status
    this.updateGhostModeDisplay(this.modeState.ghostMode);

    // Visual feedback for ghost mode
    if (this.modeState.ghostMode) {
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
    // Get existing status display or create a new one
    let statusElement = document.getElementById("game-status");

    if (!statusElement) {
      statusElement = document.createElement("div");
      statusElement.id = "game-status";
      statusElement.style.position = "absolute";
      statusElement.style.top = "60px";
      statusElement.style.right = "20px";
      statusElement.style.color = "#00FFFF";
      statusElement.style.fontFamily = "Arial, sans-serif";
      statusElement.style.fontSize = "20px";
      statusElement.style.textAlign = "right";
      document.body.appendChild(statusElement);
    }

    // Build status text based on various modes
    let statusText = "";

    // Add ghost mode status
    if (isActive) {
      statusText += "GHOST MODE: ACTIVE";
    }

    // Add enemy spawning status
    if (!this.modeState.spawnEnemies) {
      if (statusText) statusText += "<br>";
      statusText += "ENEMY SPAWNING: DISABLED";
    }

    // Only display if we have something to show or if forced enemy type is set
    if (statusText || this.modeState.forcedEnemyType !== undefined) {
      statusElement.innerHTML = statusText;
      statusElement.style.display = "block";
    } else {
      statusElement.style.display = "none";
    }

    // Update forced enemy type display if applicable
    this.updateForcedEnemyTypeDisplay();
  }

  // Toggle enemy spawning on/off
  public toggleEnemySpawning(): void {
    if (this.transitionInProgress) return;

    this.modeState.spawnEnemies = !this.modeState.spawnEnemies;

    // Update the status display
    this.updateGhostModeDisplay(this.modeState.ghostMode);
  }

  private updateForcedEnemyTypeDisplay(): void {
    // Get existing status display
    let statusElement = document.getElementById("game-status");

    if (!statusElement) {
      // Create it if it doesn't exist
      statusElement = document.createElement("div");
      statusElement.id = "game-status";
      statusElement.style.position = "absolute";
      statusElement.style.top = "60px";
      statusElement.style.right = "20px";
      statusElement.style.color = "#00FFFF";
      statusElement.style.fontFamily = "Arial, sans-serif";
      statusElement.style.fontSize = "20px";
      statusElement.style.textAlign = "right";
      document.body.appendChild(statusElement);
    }

    if (this.modeState.forcedEnemyType !== undefined) {
      // Get current status text and append enemy type info
      let statusText = statusElement.innerHTML;

      // Add enemy type info
      if (statusText) statusText += "<br>";
      statusText += `SPAWNING ENEMY TYPE: ${Enemy.name(
        this.modeState.forcedEnemyType
      )}`;

      // Update display
      statusElement.innerHTML = statusText;
      statusElement.style.display = "block";
    }
  }

  // Cycle to the next enemy type (0-9) or start from 0
  private cycleEnemyType(): void {
    if (this.modeState.forcedEnemyType === undefined) {
      this.modeState.forcedEnemyType = 0;
    } else {
      this.modeState.forcedEnemyType =
        (this.modeState.forcedEnemyType + 1) % 10;
    }

    // Update the UI to show which enemy type is being forced
    this.updateForcedEnemyTypeDisplay();
  }

  // Reset to random enemy spawning
  private resetEnemySpawning(): void {
    this.modeState.forcedEnemyType = undefined;

    // Update the UI
    this.updateForcedEnemyTypeDisplay();
  }

  // The getLevelType method is no longer needed as we use the LevelType enum directly

  private getPositionOnLevelOutline(angle: number): { x: number; y: number } {
    let x: number, y: number;

    switch (this.level.levelType) {
      case LevelType.Circle:
      case LevelType.Spiral:
      case LevelType.PiSymbol:
        // Simple circle
        x = Math.cos(angle) * this.levelRadius;
        y = Math.sin(angle) * this.levelRadius;
        break;

      case LevelType.Star:
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

      case LevelType.Wave:
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
    for (let i = this.modeState.bullets.length - 1; i >= 0; i--) {
      const bullet = this.modeState.bullets[i];

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
        this.modeState.bullets.splice(i, 1);
      }
    }
  }

  // Update enemy bullets
  private updateEnemyBullets(delta: number): void {
    for (let i = this.modeState.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.modeState.enemyBullets[i];

      // Move bullet
      bullet.mesh.position.x += bullet.direction.x * bullet.speed;
      bullet.mesh.position.y += bullet.direction.y * bullet.speed;

      // Calculate distance from center
      const distanceFromCenter = Math.sqrt(
        bullet.mesh.position.x * bullet.mesh.position.x +
          bullet.mesh.position.y * bullet.mesh.position.y
      );

      // Check if bullet goes out of bounds or too close to center
      if (distanceFromCenter < 1) {
        // Too close to center, just remove the bullet
        this.sceneSetup.scene.remove(bullet.mesh);
        this.modeState.enemyBullets.splice(i, 1);
      } else if (distanceFromCenter > this.levelRadius) {
        // Reached the level boundary
        if (bullet.isBomb) {
          // Create an explosion at the level boundary for bombs
          this.createBombExplosion(bullet);
        }

        // Remove the bullet
        this.sceneSetup.scene.remove(bullet.mesh);
        this.modeState.enemyBullets.splice(i, 1);
      }
    }
  }

  // Create an explosion when a bomb hits the level boundary
  private createBombExplosion(bomb: Bullet): void {
    // Calculate position at boundary
    const bulletPos = bomb.mesh.position;
    const direction = new THREE.Vector3(
      bulletPos.x,
      bulletPos.y,
      0
    ).normalize();

    // Get the position on the boundary by calculating intersection with level shape
    // For simplicity, we'll use a circular boundary calculation
    const boundaryPosition = direction.clone().multiplyScalar(this.levelRadius);

    // Get the color of the bomb to match the explosion color
    const bombMaterial = bomb.mesh.material as THREE.MeshStandardMaterial;
    const bombColor = bombMaterial.color || new THREE.Color(0xff6600); // Default orange if not available

    // Import EnemyExplosion class from enemies.ts
    // We'll directly use the EnemyManager to create an explosion
    this.enemyManager.createExplosionAtPosition(boundaryPosition, bombColor);
  }

  // Check if player is hit by any enemy bullets
  private checkPlayerHitByEnemyBullets(): boolean {
    // Get player position
    const playerPos = this.player.position;
    const playerRadius = this.modeState.playerSize * 0.8; // Same collision radius as used for enemies

    // Check each enemy bullet for collision with player
    for (let i = this.modeState.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.modeState.enemyBullets[i];

      // Calculate distance between bullet and player
      const dx = playerPos.x - bullet.mesh.position.x;
      const dy = playerPos.y - bullet.mesh.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check for collision (bullet radius is approximately 0.15)
      if (distance < playerRadius + 0.15) {
        // Remove the bullet
        this.sceneSetup.scene.remove(bullet.mesh);
        this.modeState.enemyBullets.splice(i, 1);

        // Player is hit!
        return true;
      }
    }

    return false; // No collision detected
  }

  // Check if player is hit by any active explosions
  private checkPlayerHitByExplosion(): boolean {
    // If no explosions are active, return quickly
    if (!this.modeState.explosions || this.modeState.explosions.length === 0) {
      return false;
    }

    // Get player position
    const playerPos = this.player.position;
    const playerRadius = this.modeState.playerSize * 0.8; // Same collision radius as used for enemies

    // Check each active explosion for collision with player
    for (const explosion of this.modeState.explosions) {
      // Only check if explosion has a non-zero radius (is active)
      if (explosion.radius <= 0) continue;

      // Calculate distance between explosion center and player
      const dx = playerPos.x - explosion.position.x;
      const dy = playerPos.y - explosion.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check for collision with explosion radius
      if (distance < playerRadius + explosion.radius) {
        // Player is hit by explosion!
        return true;
      }
    }

    return false; // No collision detected
  }

  private checkBulletCollisions(): void {
    // Check each bullet against each enemy
    for (let i = this.modeState.bullets.length - 1; i >= 0; i--) {
      const bullet = this.modeState.bullets[i];
      let hitDetected = false;

      for (let j = this.modeState.enemies.length - 1; j >= 0; j--) {
        const enemy = this.modeState.enemies[j];

        // Simple distance-based collision detection
        const dx = bullet.mesh.position.x - enemy.mesh.position.x;
        const dy = bullet.mesh.position.y - enemy.mesh.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < enemy.size + 0.2) {
          // Collision detected - apply damage to the enemy
          const enemyDestroyed = enemy.takeDamage();

          if (enemyDestroyed) {
            // Trigger explosion effect
            enemy.explode();

            // Remove enemy from the list
            this.modeState.enemies.splice(j, 1);

            this.gameState.score += enemy.getPoints();
            updateScore(this.gameState);

            // Increase difficulty every 100 points
            if (this.gameState.score % 100 === 0) {
              this.modeState.enemySpeed += 0.005;
            }

            // Level up every 314 points
            if (this.gameState.score > this.gameState.currentLevel * 314) {
              this.levelUp();
            }
          }

          // Remove the bullet regardless of whether enemy was destroyed
          this.sceneSetup.scene.remove(bullet.mesh);
          this.modeState.bullets.splice(i, 1);
          hitDetected = true;
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

    // Play power-up/level complete sound
    SoundManager.getInstance().playPowerUp();

    // Remove the text after the transition
    setTimeout(() => {
      const textElement = document.getElementById("level-completed-text");
      if (textElement) {
        document.body.removeChild(textElement);
      }
    }, 3000);
  }

  private showLevelStartText(): void {
    // First message: "The dark moon is rising..."
    const darkMoonText = document.createElement("div");
    darkMoonText.textContent = "The dark moon is rising...";
    darkMoonText.style.position = "absolute";
    darkMoonText.style.top = "10%";
    darkMoonText.style.left = "50%";
    darkMoonText.style.transform = "translateX(-50%)";
    darkMoonText.style.color = "#FF0000";
    darkMoonText.style.fontFamily = "Arial, sans-serif";
    darkMoonText.style.fontSize = "36px";
    darkMoonText.style.fontWeight = "bold";
    darkMoonText.style.textShadow = "0 0 10px #FF0000";
    darkMoonText.style.opacity = "0";
    darkMoonText.style.transition = "opacity 1s ease-in-out";
    darkMoonText.id = "dark-moon-text";

    // Play level start sound
    SoundManager.getInstance().playLevelStart();

    document.body.appendChild(darkMoonText);

    // Fade in the first message
    setTimeout(() => {
      const textElement = document.getElementById("dark-moon-text");
      if (textElement) {
        textElement.style.opacity = "1";
      }
    }, 100);

    // Remove the first message and show the second one after a delay
    setTimeout(() => {
      const textElement = document.getElementById("dark-moon-text");
      if (textElement) {
        textElement.style.opacity = "0";

        // Remove after fade out
        setTimeout(() => {
          if (textElement.parentNode) {
            document.body.removeChild(textElement);
          }

          // Show second message: "Hurry! Clear the level"
          const hurryText = document.createElement("div");
          hurryText.textContent = "Hurry! Clear the level";
          hurryText.style.position = "absolute";
          hurryText.style.top = "10%";
          hurryText.style.left = "50%";
          hurryText.style.transform = "translateX(-50%)";
          hurryText.style.color = "#FF0000";
          hurryText.style.fontFamily = "Arial, sans-serif";
          hurryText.style.fontSize = "36px";
          hurryText.style.fontWeight = "bold";
          hurryText.style.textShadow = "0 0 10px #FF0000";
          hurryText.style.opacity = "0";
          hurryText.style.transition = "opacity 1s ease-in-out";
          hurryText.id = "hurry-text";

          document.body.appendChild(hurryText);

          // Fade in the second message
          setTimeout(() => {
            const hurryElement = document.getElementById("hurry-text");
            if (hurryElement) {
              hurryElement.style.opacity = "1";
            }
          }, 100);

          // Remove the second message after a delay
          setTimeout(() => {
            const hurryElement = document.getElementById("hurry-text");
            if (hurryElement) {
              hurryElement.style.opacity = "0";

              // Remove after fade out
              setTimeout(() => {
                if (hurryElement.parentNode) {
                  document.body.removeChild(hurryElement);
                }
              }, 1000);
            }
          }, 2000);
        }, 1000);
      }
    }, 2000);
  }

  private destroyAllEnemies(): void {
    // Remove all enemies if they exist
    if (this.enemyManager && this.modeState.enemies.length > 0) {
      for (const enemy of this.modeState.enemies) {
        // Trigger explosion effect
        enemy.explode();
      }
      this.modeState.enemies = [];
    }
  }

  private async flyPlayerToBloodMoon(): Promise<void> {
    const duration = 2000; // Longer duration (2 seconds) to match with Blood Moon collapse
    const startPosition = {
      x: this.player.position.x,
      y: this.player.position.y,
      z: this.player.position.z,
    };

    // Add a small rotation effect as the player flies in
    const startRotation = {
      x: this.player.rotation.x,
      y: this.player.rotation.y,
      z: this.player.rotation.z,
    };

    return new Promise<void>((resolve) => {
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Custom easing function for dramatic flight
        // Starts slow, accelerates, then slows at the end
        const easeProgress =
          progress < 0.3
            ? 3 * progress * progress
            : progress > 0.7
            ? 1 - Math.pow(-2 * progress + 2, 2) / 2
            : 0.27 + (progress - 0.3) * 1.15; // Linear in middle section

        // Move player toward center of screen (where blood moon is)
        this.player.position.x = startPosition.x * (1 - easeProgress);
        this.player.position.y = startPosition.y * (1 - easeProgress);
        this.player.position.z = startPosition.z + easeProgress * 3; // Move more forward for dramatic effect

        // Add slight rotation as player flies in (barrel roll effect)
        const rotationEffect = Math.sin(progress * Math.PI * 4) * 0.15;
        this.player.rotation.z = startRotation.z + rotationEffect;

        // Shrink player as it approaches center
        const scale = 1 - easeProgress * 0.6;
        this.player.scale.set(scale, scale, scale);

        // Add a slight color effect to the player (gets redder as it approaches the Blood Moon)
        this.player.traverse((object) => {
          if (object instanceof THREE.Mesh && object.material) {
            const material = object.material as THREE.MeshBasicMaterial;
            if (material && material.color) {
              // Store original color if not already stored
              if (!object.userData.originalColor) {
                object.userData.originalColor = material.color.clone();
              }

              // Apply red tint
              material.color.setRGB(
                1, // Full red
                1 - easeProgress * 0.7, // Reduce green
                1 - easeProgress * 0.7 // Reduce blue
              );
            }
          }
        });

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Reset player scale and rotation
          this.player.scale.set(1, 1, 1);
          this.player.rotation.set(
            startRotation.x,
            startRotation.y,
            startRotation.z
          );

          // Reset player color to original
          this.player.traverse((object) => {
            if (object instanceof THREE.Mesh && object.material) {
              const material = object.material as THREE.MeshBasicMaterial;
              if (material && material.color && object.userData.originalColor) {
                material.color.copy(object.userData.originalColor);
              }
            }
          });

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

  // Handle player death and respawn with temporary invulnerability
  private respawnPlayer(): void {
    // Set ghostMode immediately to prevent multiple collisions during death animation
    this.modeState.ghostMode = true;

    // Visual feedback for player death
    this.createPlayerDeathEffect();

    // Make player temporarily invisible
    this.player.visible = false;

    // Remove all enemy bullets to give player a cleaner start
    this.clearEnemyBullets();

    // Set a timeout to respawn the player with temporary invulnerability
    setTimeout(() => {
      // Reset player position to a random position on the level
      this.modeState.playerAngle = Math.random() * Math.PI * 2;
      this.normalizePlayerAngle();

      const playerPosition = this.getPositionOnLevelOutline(
        this.modeState.playerAngle
      );
      this.player.position.set(playerPosition.x, playerPosition.y, 0);
      this.player.lookAt(0, 0, 0);

      // Make the player visible again but semi-transparent
      this.player.visible = true;

      // Update the ghost mode display
      this.updateGhostModeDisplay(true);

      // Make the player semi-transparent to indicate invulnerability
      this.player.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.material.opacity = 0.5;
          object.material.transparent = true;
        }
      });

      // Set a timer to end invulnerability
      setTimeout(() => {
        if (this.gameState.gameStatus === "active") {
          this.modeState.ghostMode = false;
          this.updateGhostModeDisplay(false);

          // Restore player opacity
          this.player.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              object.material.opacity = 1.0;
              object.material.transparent = false;
            }
          });
        }
      }, 3000); // 3 seconds of invulnerability
    }, 1000); // 1 second delay before respawn
  }

  // Clear all enemy bullets from the screen
  private clearEnemyBullets(): void {
    if (this.modeState.enemyBullets) {
      // Remove all enemy bullets from the scene
      for (const bullet of this.modeState.enemyBullets) {
        this.sceneSetup.scene.remove(bullet.mesh);
      }
      // Clear the bullets array
      this.modeState.enemyBullets = [];
    }
  }

  // Create a visual effect for player death
  private createPlayerDeathEffect(): void {
    // Create explosion effect at player position
    const particleCount = 60;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    // Player position
    const playerPos = this.player.position.clone();

    for (let i = 0; i < particleCount; i++) {
      // Set initial positions at player location
      positions[i * 3] = playerPos.x;
      positions[i * 3 + 1] = playerPos.y;
      positions[i * 3 + 2] = playerPos.z;

      // Random velocities for explosion effect
      velocities[i * 3] = (Math.random() - 0.5) * 0.5;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;

      // Player colors (blue/cyan)
      colors[i * 3] = 0.0; // R
      colors[i * 3 + 1] = 0.7 + Math.random() * 0.3; // G
      colors[i * 3 + 2] = 0.8 + Math.random() * 0.2; // B
    }

    particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particles.setAttribute(
      "velocity",
      new THREE.BufferAttribute(velocities, 3)
    );
    particles.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Create colored particle material
    const pMaterial = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
    });

    // Create the particle system
    const particleSystem = new THREE.Points(particles, pMaterial);
    this.sceneSetup.scene.add(particleSystem);

    // Play explosion sound
    SoundManager.getInstance().playBigExplosion();

    // Animate the particles
    const updateParticles = () => {
      const positions = particles.attributes.position.array as Float32Array;
      const velocities = particles.attributes.velocity.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        // Update positions based on velocities
        positions[i * 3] += velocities[i * 3];
        positions[i * 3 + 1] += velocities[i * 3 + 1];
        positions[i * 3 + 2] += velocities[i * 3 + 2];

        // Add gravity effect
        velocities[i * 3 + 1] -= 0.01;
      }

      particles.attributes.position.needsUpdate = true;

      // Gradually reduce opacity
      pMaterial.opacity -= 0.01;
      if (pMaterial.opacity <= 0) {
        pMaterial.opacity = 0;
      }

      // Continue animation until particles fade out
      if (pMaterial.opacity > 0 && particleSystem.parent) {
        requestAnimationFrame(updateParticles);
      } else {
        this.sceneSetup.scene.remove(particleSystem);
      }
    };

    // Start the animation
    updateParticles();

    // Remove particles after animation completes
    setTimeout(() => {
      if (particleSystem.parent) {
        this.sceneSetup.scene.remove(particleSystem);
      }
    }, 2000);
  }

  // Handle when the blood moon reaches the level boundary
  private handleBloodMoonReachedBoundary(): void {
    // Stop any ongoing sounds
    SoundManager.getInstance().stopAllSounds();
    
    // Show a warning message
    const warningMessage = document.createElement("div");
    warningMessage.id = "blood-moon-warning";
    warningMessage.style.position = "absolute";
    warningMessage.style.top = "30%";
    warningMessage.style.left = "50%";
    warningMessage.style.transform = "translate(-50%, -50%)";
    warningMessage.style.color = "#FF0000";
    warningMessage.style.fontFamily = "Arial, sans-serif";
    warningMessage.style.fontSize = "48px";
    warningMessage.style.fontWeight = "bold";
    warningMessage.style.textAlign = "center";
    warningMessage.style.textShadow = "0 0 10px #FF0000";
    warningMessage.innerHTML = "THE BLOOD MOON HAS CONSUMED YOU";
    document.body.appendChild(warningMessage);

    // Play blood moon sound effect
    SoundManager.getInstance().playBloodMoonActivation();

    // Pause for dramatic effect, then end the game
    setTimeout(() => {
      // Remove the warning message
      document.body.removeChild(warningMessage);

      // Trigger game over
      document.dispatchEvent(
        new CustomEvent("gameStatusChanged", {
          detail: { status: "gameOver" },
        })
      );
    }, 2000);
  }

  private updatePlayerAngle(targetAngle: number): void {
    // Set player angle directly
    this.modeState.playerAngle = targetAngle;
    this.normalizePlayerAngle();
  }

  private normalizePlayerAngle(): void {
    // Normalize angle to be between 0 and 2π for calculations
    while (this.modeState.playerAngle < 0)
      this.modeState.playerAngle += Math.PI * 2;
    while (this.modeState.playerAngle >= Math.PI * 2)
      this.modeState.playerAngle -= Math.PI * 2;
  }

  public handleKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowLeft":
      case "a":
        this.keys.left = true;
        break;
      case "ArrowRight":
      case "d":
        this.keys.right = true;
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
      case "s": // Add "s" key to toggle enemy spawning
        this.toggleEnemySpawning();
        break;
      case "e": // Add "e" key to force spawn specific enemy type
        this.cycleEnemyType();
        break;
      case "E": // Add "E" key to return to random enemy spawning
        this.resetEnemySpawning();
        break;
      case "m": // Add "m" key to toggle sound
        SoundManager.getInstance().toggleMute();
        this.showSoundStatus();
        break;
    }
  }

  private showSoundStatus(): void {
    const isMuted = SoundManager.getInstance().isSoundMuted();

    // Create temporary message
    const message = document.createElement("div");
    message.textContent = isMuted ? "SOUND: OFF" : "SOUND: ON";
    message.style.position = "absolute";
    message.style.top = "10%";
    message.style.left = "50%";
    message.style.transform = "translateX(-50%)";
    message.style.color = "#00FFFF";
    message.style.fontFamily = "Arial, sans-serif";
    message.style.fontSize = "24px";
    message.style.fontWeight = "bold";
    message.style.textShadow = "0 0 5px #00FFFF";
    message.id = "sound-status-text";

    // Remove existing message if any
    const existingMessage = document.getElementById("sound-status-text");
    if (existingMessage) {
      document.body.removeChild(existingMessage);
    }

    document.body.appendChild(message);

    // Remove after 1.5 seconds
    setTimeout(() => {
      const textElement = document.getElementById("sound-status-text");
      if (textElement && textElement.parentNode) {
        document.body.removeChild(textElement);
      }
    }, 1500);
  }

  public handleKeyUp(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowLeft":
      case "a":
        this.keys.left = false;
        break;
      case "ArrowRight":
      case "d":
        this.keys.right = false;
        break;
    }
  }

  public handleMouseMove(event: MouseEvent): void {
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

  // Add method to handle mouseup event
  public handleMouseUp(event: MouseEvent): void {
    // Only handle left mouse button release (button 0)
    if (event.button === 0) {
      this.isMouseDown = false;

      // Stop continuous shooting
      if (this.shootingInterval) {
        clearInterval(this.shootingInterval);
        this.shootingInterval = null;
      }
    }
  }

  public handleMouseDown(event: MouseEvent): void {
    // Only handle left mouse button press (button 0)
    if (event.button === 0) {
      this.shoot();

      // Set the mouse down flag
      this.isMouseDown = true;

      // Start continuous shooting
      this.startContinuousShooting();
    }
  }

  public handleClick(event: MouseEvent): void {
    // We're now handling the initial shot in mousedown
    // This is still kept for compatibility but doesn't duplicate the shot
  }

  private startContinuousShooting(): void {
    // Clear any existing interval first
    if (this.shootingInterval) {
      clearInterval(this.shootingInterval);
      this.shootingInterval = null;
    }

    // Create a new interval for continuous shooting
    // Start the interval with a slight delay to avoid double-firing
    // since we already fired one shot on the initial mouse down
    setTimeout(() => {
      this.shootingInterval = window.setInterval(() => {
        if (this.isMouseDown && !this.transitionInProgress) {
          this.shoot();
        } else if (!this.isMouseDown) {
          // Stop the interval if mouse is no longer down
          if (this.shootingInterval) {
            clearInterval(this.shootingInterval);
            this.shootingInterval = null;
          }
        }
      }, 200); // Shoot every 200ms (adjust for desired fire rate)
    }, 50);
  }

  public handleTouchMove(event: TouchEvent): void {
    if (event.touches.length > 0) {
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
  }

  public handleTouchStart(event: TouchEvent): void {
    this.shoot();

    // Set the mouse down flag to enable continuous shooting
    this.isMouseDown = true;

    // Start continuous shooting, same as with mouse
    this.startContinuousShooting();
  }

  public handleTouchEnd(event: TouchEvent): void {
    // Stop continuous shooting
    this.isMouseDown = false;

    // Clear any shooting interval
    if (this.shootingInterval) {
      clearInterval(this.shootingInterval);
      this.shootingInterval = null;
    }
  }
}
