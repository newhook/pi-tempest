import * as THREE from "three";
import { GameState, ActiveModeState, MovementController } from "./types";
import {
  SpokeMovementController,
  SpokeCrossingMovementController,
  ZigzagMovementController,
  CircularMovementController,
  HomingMovementController,
  PiMovementController,
  ErraticMovementController,
  BounceMovementController,
  LinearMovementController,
} from "./movementControllers";
import { Level, LevelType } from "./levels";
import { SoundManager } from "./synth";

// Class representing an individual enemy
export class Enemy {
  public mesh: THREE.Mesh;
  public distanceFromCenter: number;
  public speed: number;
  public type: number;
  public size: number;
  public hitPoints: number;
  public gameState: GameState; // Changed to public for access by controllers
  public modeState: ActiveModeState; // Changed to public for access by controllers
  public scene: THREE.Scene; // Changed to public for access by controllers
  public level: Level;
  private lastFireTime: number = 0; // Track time since last bullet fired
  private movementController: MovementController;
  private points: number;

  public static name(type: number): string {
    switch (type) {
      case 0:
        return "Follower";
      case 1:
        return "Crosser";
      case 2:
        return "Speeder";
      case 3:
        return "Zigzagger";
      case 4:
        return "Orbiter";
      case 5:
        return "Bouncer";
      case 6:
        return "Chaotic";
      case 7:
        return "Hunter";
      case 8:
        return "Pi-follower";
      case 9:
        return "Advanced Pi-follower";
      case 10:
        return "Shard";
      default:
        return "Unknown";
    }
  }

  // Health bar elements
  private healthBar: THREE.Group | null = null;
  private maxHitPoints: number = 1;

  constructor(
    level: Level,
    mesh: THREE.Mesh,
    type: number,
    scene: THREE.Scene,
    gameState: GameState,
    modeState: ActiveModeState
  ) {
    this.mesh = mesh;
    this.distanceFromCenter = 0;
    this.type = type;
    this.scene = scene;
    this.gameState = gameState;
    this.modeState = modeState;
    this.level = level;

    // Get the current level type
    const levelType = level.levelType;

    // Assign hitpoints and speed based on enemy type
    const { hitPoints, speedMultiplier, points } = this.getBehavior();
    this.points = points;
    this.hitPoints = hitPoints;
    this.maxHitPoints = hitPoints; // Store the maximum hitpoints for health bar
    this.speed = this.modeState.enemySpeed * speedMultiplier;

    // Create health bar for enemies with more than 1 hit point
    if (hitPoints > 1) {
      this.createHealthBar();
    }

    // Assign movement style based on enemy type
    switch (type) {
      case 0: // Type 0: Always follows spokes
        // Always use spoke movement regardless of level type
        this.movementController = new SpokeMovementController(this);
        break;

      case 1: // Type 1: Always follows spokes but can cross between them
        // Always use spoke crossing regardless of level type
        this.movementController = new SpokeCrossingMovementController(this);
        break;

      case 2: // Type 2: Follows patterns but moves faster (speed is handled later)
        // Same as type 0 but with speed multiplier (applied below)
        this.movementController = new SpokeMovementController(this);
        break;

      case 3: // Type 3: Zigzag movement
        this.movementController = new ZigzagMovementController(this);
        break;

      case 4: // Type 4: Circular orbit movement
        this.movementController = new CircularMovementController(this);
        break;

      case 5: // Type 5: Bouncing movement
        this.movementController = new BounceMovementController(this);
        break;

      case 6: // Type 6: Erratic movement
        this.movementController = new ErraticMovementController(this);
        break;

      case 7: // Type 7: Homing movement (tries to follow player)
        this.movementController = new HomingMovementController(this);
        break;

      case 8: // Type 8: Follows Pi symbol on Pi level (4) and level 5, otherwise uses spokes
        // Force Pi movement if on pi level or level 5 (wave level)
        if (levelType === LevelType.PiSymbol) {
          this.movementController = new PiMovementController(this);
        } else {
          this.movementController = new SpokeMovementController(this);
        }
        break;

      case 9: // Type 9: Only on Pi level and follows Pi symbol, otherwise uses spokes
        // Force Pi movement if on pi level
        if (levelType === LevelType.PiSymbol) {
          this.movementController = new PiMovementController(this);
        } else {
          this.movementController = new SpokeMovementController(this);
        }
        break;

      case 10: // Type 10:  linear movement
        this.distanceFromCenter = Math.sqrt(
          mesh.position.x * mesh.position.x + mesh.position.y * mesh.position.y
        );
        this.movementController = new LinearMovementController(this);
        break;

      default:
        this.movementController = new SpokeMovementController(this);
    }

    // Randomize size slightly
    this.size = 0.3 + this.type / 20 + Math.random() * 0.1;
  }

  // Update enemy position based on movement style
  update(delta: number): void {
    // Use the movement controller to update position and angle
    const result = this.movementController.update(delta);

    // Increment distance from center for all movement types
    this.distanceFromCenter = Math.sqrt(
      result.x * result.x + result.y * result.y
    );

    // Apply the position and angle from the controller
    this.mesh.position.set(result.x, result.y, 0);

    // Rotate enemy for visual effect
    this.mesh.rotation.x += delta * 2;
    this.mesh.rotation.y += delta * 2;

    // Scale enemy as it moves outward for better visibility
    const scale = 0.5 + this.distanceFromCenter / (this.level.getRadius() * 2);
    this.mesh.scale.set(scale, scale, scale);

    // Make the health bar always face the camera
    if (this.healthBar) {
      // Make health bar face the camera by aligning it with world up vector
      this.healthBar.up.set(0, 1, 0);
      this.healthBar.lookAt(0, 0, 5); // Look at camera (assumed to be at z=5)

      // Scale the health bar inversely to enemy's scale so it maintains size
      const barScale = 1 / scale;
      this.healthBar.scale.set(barScale, barScale, barScale);
    }

    // Call the movement controller's optional render method for special effects
    if (this.movementController.render) {
      this.movementController.render(this.scene);
    }

    // For enemy type 8, fire bullets at the player
    if (this.type === 8) {
      this.tryFireBullet(delta);
    }

    // For enemy type 9, fire bombs that explode on boundary contact
    if (this.type === 9) {
      this.tryFireBomb(delta);
    }
  }

  remove(): void {
    // Clean up any resources from the movement controller
    if (this.movementController.cleanup) {
      this.movementController.cleanup(this.scene);
    }

    // Clean up health bar if it exists
    if (this.healthBar) {
      // Health bar should automatically be removed since it's a child of the mesh
      this.healthBar = null;
    }

    this.scene.remove(this.mesh);
  }

  // Handle enemy explosion effects
  explode(): void {
    // Get enemy material and color
    const enemyMaterial = this.mesh.material as THREE.MeshStandardMaterial;

    // Create explosion particles
    this.createExplosion(this.mesh.position, enemyMaterial.color);

    // For sphere type enemies, create smaller spheres on explosion
    if (this.type === 0) {
      this.createAdditionalEnemies(this.mesh.position);
    }

    // Play explosion sound
    SoundManager.getInstance().playExplosion();

    this.remove();
  }

  // Handle getting hit by a bullet
  // Returns true if the enemy was destroyed, false if it just lost a hit point
  takeDamage(): boolean {
    // Reduce hit points
    this.hitPoints--;

    // Flash the enemy to indicate it was hit
    this.flashOnHit();

    // If hit points reached zero, return true (enemy destroyed)
    return this.hitPoints <= 0;
  }

  // Create health bar for enemies with multiple hit points
  private createHealthBar(): void {
    // Create a group to hold the health bar
    this.healthBar = new THREE.Group();

    // Create the background bar (gray)
    const bgBarGeometry = new THREE.BoxGeometry(1, 0.1, 0.05);
    const bgBarMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const bgBar = new THREE.Mesh(bgBarGeometry, bgBarMaterial);

    // Create the foreground bar (health indicator - green)
    const fgBarGeometry = new THREE.BoxGeometry(1, 0.1, 0.06); // Slightly in front
    const fgBarMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const fgBar = new THREE.Mesh(fgBarGeometry, fgBarMaterial);

    // Add the bars to the group
    this.healthBar.add(bgBar);
    this.healthBar.add(fgBar);

    // Position the health bar above the enemy
    this.healthBar.position.set(0, this.size * 1.5, 0);

    // Add the health bar to the enemy mesh
    this.mesh.add(this.healthBar);

    // Store reference to the foreground bar for updating
    this.healthBar.userData.foregroundBar = fgBar;
  }

  // Update the health bar to reflect current health
  private updateHealthBar(): void {
    if (!this.healthBar) return;

    // Get the foreground bar
    const fgBar = this.healthBar.userData.foregroundBar as THREE.Mesh;

    if (fgBar) {
      // Calculate health percentage
      const healthPercent = this.hitPoints / this.maxHitPoints;

      // Resize the bar
      fgBar.scale.x = Math.max(0.01, healthPercent); // Ensure it's never zero

      // Update the position to align with the left side of background bar
      fgBar.position.x = (healthPercent - 1) / 2;

      // Update color based on health (green -> yellow -> red)
      const fgBarMaterial = fgBar.material as THREE.MeshBasicMaterial;

      if (healthPercent > 0.6) {
        fgBarMaterial.color.setHex(0x00ff00); // Green
      } else if (healthPercent > 0.3) {
        fgBarMaterial.color.setHex(0xffff00); // Yellow
      } else {
        fgBarMaterial.color.setHex(0xff0000); // Red
      }
    }
  }

  // Visual feedback when enemy is hit but not destroyed
  private flashOnHit(): void {
    // Get the material
    const material = this.mesh.material as THREE.MeshStandardMaterial;

    // Store original color values if not already stored
    if (!this.mesh.userData.originalColor) {
      this.mesh.userData.originalColor = material.color.clone();
      this.mesh.userData.originalEmissive = material.emissive.clone();
      this.mesh.userData.originalEmissiveIntensity = material.emissiveIntensity;

      // Store a reference to any active recolorTimer
      this.mesh.userData.recolorTimer = null;
    }

    // Clear any existing recolor timeout to prevent race conditions
    if (this.mesh.userData.recolorTimer) {
      clearTimeout(this.mesh.userData.recolorTimer);
      this.mesh.userData.recolorTimer = null;
    }

    // Flash bright white
    material.color.set(0xffffff);
    material.emissive.set(0xffffff);
    material.emissiveIntensity = 1.0;

    // Update health bar
    this.updateHealthBar();

    // Return to original color after a short delay
    this.mesh.userData.recolorTimer = setTimeout(() => {
      if (this.mesh && this.mesh.material) {
        try {
          // Restore original color
          if (this.mesh.userData.originalColor) {
            material.color.copy(this.mesh.userData.originalColor);
          }

          // Restore original emissive color
          if (this.mesh.userData.originalEmissive) {
            material.emissive.copy(this.mesh.userData.originalEmissive);
          } else {
            // Fallback if for some reason original emissive wasn't stored
            const hue = 0.6 + this.type / 30; // blues to purples, matching the creation color
            const color = new THREE.Color().setHSL(hue, 1, 0.5);
            material.emissive.copy(color);
          }

          // Restore original emissive intensity
          if (this.mesh.userData.originalEmissiveIntensity !== undefined) {
            material.emissiveIntensity =
              this.mesh.userData.originalEmissiveIntensity;
          } else {
            material.emissiveIntensity = 0.5; // Default fallback
          }

          // Clear the timer reference
          this.mesh.userData.recolorTimer = null;
        } catch (e) {
          console.error("Error restoring enemy color:", e);
        }
      }
    }, 100);
  }

  public getPoints(): number {
    return this.points;
  }

  // Try to fire a bullet at the player
  private tryFireBullet(delta: number): void {
    // Add time to last fire counter
    this.lastFireTime += delta;

    // Fire bullets every 2-3 seconds
    const fireInterval = 2 + Math.random();

    if (this.lastFireTime > fireInterval) {
      this.lastFireTime = 0; // Reset fire timer
      this.fireBullet();
    }
  }

  // Try to fire a bomb that explodes on boundary contact
  private tryFireBomb(delta: number): void {
    // Add time to last fire counter
    this.lastFireTime += delta;

    // Fire bombs every 3-5 seconds (less frequent than regular bullets)
    const fireInterval = 3 + Math.random() * 2;

    if (this.lastFireTime > fireInterval) {
      this.lastFireTime = 0; // Reset fire timer
      this.fireBomb();
    }
  }

  // Fire a bullet toward the player on the level edge
  private fireBullet(): void {
    // Create a bullet
    const bulletGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red bullet
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

    // Set bullet position at enemy location
    bullet.position.set(this.mesh.position.x, this.mesh.position.y, 0);

    // Get the player's position for targeting
    let playerDirection: THREE.Vector2;
    const enemyPos = this.mesh.position;

    // Use actual player position for targeting if available
    if (this.modeState.playerPosition) {
      // Calculate vector pointing from enemy to player
      playerDirection = new THREE.Vector2(
        this.modeState.playerPosition.x - enemyPos.x,
        this.modeState.playerPosition.y - enemyPos.y
      ).normalize();
    } else {
      // Fallback if player position isn't available:
      // Calculate position based on player angle on the level edge
      const playerAngle = this.modeState.playerAngle || 0;
      const playerPos = {
        x: Math.cos(playerAngle) * 10, // Assuming level radius is about 10
        y: Math.sin(playerAngle) * 10,
      };

      playerDirection = new THREE.Vector2(
        playerPos.x - enemyPos.x,
        playerPos.y - enemyPos.y
      ).normalize();
    }

    // Add a small random deviation to make it less accurate
    const randomAngle = Math.random() * 0.2 - 0.1; // -0.1 to 0.1 radians
    const aimAngle =
      Math.atan2(playerDirection.y, playerDirection.x) + randomAngle;
    const finalDirectionX = Math.cos(aimAngle);
    const finalDirectionY = Math.sin(aimAngle);

    // Bullet speed is slightly slower than player bullets
    const bulletSpeed = 0.2;

    // Add to scene and enemy bullets array
    this.scene.add(bullet);

    // Create new property in modeState if it doesn't exist
    if (!this.modeState.enemyBullets) {
      this.modeState.enemyBullets = [];
    }

    // Add to enemy bullets array
    this.modeState.enemyBullets.push({
      mesh: bullet,
      direction: new THREE.Vector2(finalDirectionX, finalDirectionY),
      speed: bulletSpeed,
      fromEnemy: true,
    });

    // Debug visualization to verify bullet direction
    // Create a small line showing the direction
    const directionHelper = new THREE.ArrowHelper(
      new THREE.Vector3(finalDirectionX, finalDirectionY, 0),
      new THREE.Vector3(bullet.position.x, bullet.position.y, 0),
      0.5,
      0xff0000
    );
    this.scene.add(directionHelper);

    // Remove helper after 500ms
    setTimeout(() => {
      this.scene.remove(directionHelper);
    }, 500);

    // Play a subtle sound for enemy fire
    SoundManager.getInstance().playEnemyLaser();
  }

  // Fire a bomb that explodes on contact with the level boundary
  private fireBomb(): void {
    // Create a larger, more distinctive bomb
    const bombGeometry = new THREE.SphereGeometry(0.25, 12, 12);

    // Create pulsating material with orange-red colors
    const bombMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6600, // Orange
      emissive: 0xff3300, // Red-orange glow
      emissiveIntensity: 0.7,
      metalness: 0.3,
      roughness: 0.4,
    });

    const bomb = new THREE.Mesh(bombGeometry, bombMaterial);

    // Set bomb position at enemy location
    bomb.position.set(this.mesh.position.x, this.mesh.position.y, 0);

    // Add a pulsating animation to the bomb
    const pulse = () => {
      if (bomb && bomb.scale) {
        // Pulsate between 0.9 and 1.1 size
        const s = 1 + 0.1 * Math.sin(Date.now() * 0.01);
        bomb.scale.set(s, s, s);

        // Continue the animation if the bomb still exists
        if (bomb.parent) {
          requestAnimationFrame(pulse);
        }
      }
    };
    pulse(); // Start the pulsating animation

    // Choose direction - bombs can target in various ways
    let direction: THREE.Vector2;

    // 70% chance to target player, 30% chance for random direction
    if (Math.random() < 0.7) {
      // Target player similar to regular bullets
      const enemyPos = this.mesh.position;

      // Use actual player position for targeting if available
      if (this.modeState.playerPosition) {
        // Calculate vector pointing from enemy to player
        direction = new THREE.Vector2(
          this.modeState.playerPosition.x - enemyPos.x,
          this.modeState.playerPosition.y - enemyPos.y
        ).normalize();
      } else {
        // Fallback if player position isn't available
        const playerAngle = this.modeState.playerAngle || 0;
        const playerPos = {
          x: Math.cos(playerAngle) * 10,
          y: Math.sin(playerAngle) * 10,
        };

        direction = new THREE.Vector2(
          playerPos.x - enemyPos.x,
          playerPos.y - enemyPos.y
        ).normalize();
      }

      // Add a larger random deviation than regular bullets
      const randomAngle = Math.random() * 0.5 - 0.25; // -0.25 to 0.25 radians
      const aimAngle = Math.atan2(direction.y, direction.x) + randomAngle;
      direction = new THREE.Vector2(Math.cos(aimAngle), Math.sin(aimAngle));
    } else {
      // Random direction
      const randomAngle = Math.random() * Math.PI * 2;
      direction = new THREE.Vector2(
        Math.cos(randomAngle),
        Math.sin(randomAngle)
      );
    }

    // Bomb speed is slower than regular bullets
    const bombSpeed = 0.15;

    // Add to scene
    this.scene.add(bomb);

    // Create new property in modeState if it doesn't exist
    if (!this.modeState.enemyBullets) {
      this.modeState.enemyBullets = [];
    }

    // Add to enemy bullets array with the bomb flag
    this.modeState.enemyBullets.push({
      mesh: bomb,
      direction: direction,
      speed: bombSpeed,
      fromEnemy: true,
      isBomb: true, // Mark as a bomb that will explode on boundary contact
    });

    // Play a distinctive sound for bomb firing
    SoundManager.getInstance().playBigExplosion();
  }

  // Check collision with player
  checkCollision(playerPos: THREE.Vector3, playerRadius: number): boolean {
    const enemyPos = this.mesh.position;

    // Calculate distance between player and enemy
    const dx = playerPos.x - enemyPos.x;
    const dy = playerPos.y - enemyPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check collision
    return distance < playerRadius + this.size;
  }

  // Static methods for creating different types of enemies

  // Get geometry based on enemy type
  static getGeometry(enemyType: number): THREE.BufferGeometry {
    // Different geometries based on PI digit
    switch (enemyType) {
      case 1:
        return new THREE.TetrahedronGeometry(0.4);
      case 2:
        return new THREE.OctahedronGeometry(0.4);
      case 3:
        return new THREE.DodecahedronGeometry(0.4);
      case 4:
        return new THREE.IcosahedronGeometry(0.4);
      case 5:
        return new THREE.TorusGeometry(0.3, 0.1, 8, 8);
      case 6:
        return new THREE.ConeGeometry(0.4, 0.8, 6);
      case 7:
        return new THREE.CylinderGeometry(0, 0.4, 0.8, 7);
      case 8:
        return new THREE.BoxGeometry(0.5, 0.5, 0.5);
      case 9:
        return new THREE.RingGeometry(0.2, 0.4, 9);
      default:
        return new THREE.SphereGeometry(0.4, 8, 8);
    }
  }

  // Get behavior attributes based on enemy type
  private getBehavior(): {
    hitPoints: number;
    speedMultiplier: number;
    points: number;
  } {
    switch (this.type) {
      case 0: // Standard follower - always follows spokes
        return {
          hitPoints: 1,
          speedMultiplier: 1.0,
          points: 3,
        };

      case 1: // Crosser - always follows spokes but crosses between them
        return {
          hitPoints: 2,
          speedMultiplier: 0.9,
          points: 4,
        };

      case 2: // Speeder - follows patterns but moves faster
        return {
          hitPoints: 2,
          speedMultiplier: 1.5, // Faster!
          points: 5,
        };

      case 3: // Zigzagger - erratic zig-zag movement
        return {
          hitPoints: 3,
          speedMultiplier: 1.1,
          points: 6,
        };

      case 4: // Orbiter - circular orbital movement
        return {
          hitPoints: 3,
          speedMultiplier: 0.8,
          points: 8,
        };

      case 5: // Bouncer - bouncing movement pattern
        return {
          hitPoints: 4,
          speedMultiplier: 1.2,
          points: 5,
        };

      case 6: // Chaotic - extremely erratic movement
        return {
          hitPoints: 4,
          speedMultiplier: 0.9,
          points: 8,
        };

      case 7: // Hunter - attempts to home in on player
        return {
          hitPoints: 5,
          speedMultiplier: 0.7,
          points: 9,
        };

      case 8: // Pi-follower - follows pi symbol on pi levels
        return {
          hitPoints: 6,
          speedMultiplier: 0.8,
          points: 10,
        };

      case 9: // Advanced Pi-follower - follows pi symbol but faster and more hit points
        return {
          hitPoints: 8,
          speedMultiplier: 1.0,
          points: 12,
        };

      case 10:
        return {
          hitPoints: 1,
          speedMultiplier: 3.0,
          points: 5,
        };

      default: // Fallback for any unexpected enemy types
        return {
          hitPoints: 1,
          speedMultiplier: 1.0,
          points: 3,
        };
    }
  }

  // Create explosion particles
  private createExplosion(position: THREE.Vector3, color: THREE.Color): void {
    const particleCount = 50;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const alphas = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      // Random velocity for each particle
      velocities[i * 3] = (Math.random() - 0.5) * 2;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 2;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;

      // Initial alpha value
      alphas[i] = 1.0;
    }

    particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particles.setAttribute(
      "velocity",
      new THREE.BufferAttribute(velocities, 3)
    );
    particles.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));

    const pMaterial = new THREE.PointsMaterial({
      color: color,
      size: 0.2,
      transparent: true,
      opacity: 1.0,
      depthWrite: false, // Ensure particles are rendered with transparency
    });

    const particleSystem = new THREE.Points(particles, pMaterial);
    this.scene.add(particleSystem);

    // Update particle positions and alpha values over time
    const updateParticles = () => {
      const positions = particles.attributes.position.array as Float32Array;
      const velocities = particles.attributes.velocity.array as Float32Array;
      const alphas = particles.attributes.alpha.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += velocities[i * 3] * 0.1;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * 0.1;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * 0.1;

        // Decrease alpha value to create fading effect
        alphas[i] -= 0.02;
        if (alphas[i] < 0) alphas[i] = 0;
      }

      particles.attributes.position.needsUpdate = true;
      particles.attributes.alpha.needsUpdate = true;

      // Update material opacity based on alpha values
      pMaterial.opacity = Math.max(...alphas);

      // Continue updating particles until they are removed
      if (this.scene.children.includes(particleSystem)) {
        requestAnimationFrame(updateParticles);
      }
    };

    updateParticles();

    // Remove particle system after a short duration
    setTimeout(() => {
      this.scene.remove(particleSystem);
    }, 1000);
  }

  // Create smaller spheres on explosion
  private createAdditionalEnemies(position: THREE.Vector3): void {
    // Create a random number (1-4) of smaller spheres
    const enemyCount = 1 + Math.floor(Math.random() * 4);

    for (let i = 0; i < enemyCount; i++) {
      // Create a smaller sphere enemy
      const geometry = new THREE.SphereGeometry(0.2, 8, 8);

      // Create a glowing material with color variations
      const hue = 0.3 + Math.random() * 0.1; // green to yellowish-green
      const color = new THREE.Color().setHSL(hue, 1, 0.5);

      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.7,
        flatShading: true,
      });

      const mesh = new THREE.Mesh(geometry, material);

      // Ensure the smaller spheres start at the position of the original enemy
      mesh.position.set(position.x, position.y, position.z);

      const enemy = new Enemy(
        this.level,
        mesh,
        10, // Type 10 for small spheres
        this.scene,
        this.gameState,
        this.modeState
      );

      this.scene.add(mesh);
      this.modeState.enemies.push(enemy);
    }
  }
}
