import * as THREE from "three";
import { GameState, ActiveModeState } from "./types";

// Class representing an individual enemy
export class Enemy {
  public mesh: THREE.Mesh;
  public angle: number;
  public distanceFromCenter: number;
  public speed: number;
  public type: number;
  public size: number;
  public hitPoints: number;
  public movementStyle: string;
  public direction?: THREE.Vector2;
  // For spoke movement
  public spokeIndex?: number;
  public spokeCrossingDirection?: number;
  public spokeCrossingSpeed?: number;
  private gameState: GameState;
  private modeState: ActiveModeState;
  private scene: THREE.Scene;
  // Number of spokes in the current level (needed for spoke movement)
  private numSpokes: number = 8;
  private lastFireTime: number = 0; // Track time since last bullet fired
  public pathParams?: {
    startAngle: number;
    spiralTightness: number;
    waveAmplitude: number;
    waveFrequency: number;
    pathOffset: number;
  };

  constructor(
    mesh: THREE.Mesh,
    angle: number,
    distanceFromCenter: number,
    speed: number,
    type: number,
    size: number,
    hitPoints: number,
    movementStyle: string,
    scene: THREE.Scene,
    gameState: GameState,
    modeState: ActiveModeState,
    direction?: THREE.Vector2
  ) {
    this.mesh = mesh;
    this.angle = angle;
    this.distanceFromCenter = distanceFromCenter;
    this.speed = speed;
    this.type = type;
    this.size = size;
    this.hitPoints = hitPoints;
    this.movementStyle = movementStyle;
    this.scene = scene;
    this.gameState = gameState;
    this.modeState = modeState;
    this.direction = direction;
  }

  // Update enemy position based on movement style
  update(delta: number, levelRadius: number, numSpokes: number = 8): void {
    // Store number of spokes for spoke-based movement
    if (
      this.movementStyle === "spoke" ||
      this.movementStyle === "spokeCrossing"
    ) {
      this.numSpokes = numSpokes;
    }

    // Increment distance from center for all movement types
    this.distanceFromCenter += this.speed * delta * 30;

    // Calculate new position based on movement style
    let x: number, y: number;

    switch (this.movementStyle) {
      case "erratic": // Type 6: Chaotic movement
        // Very erratic zig-zag with random direction changes
        this.angle +=
          (Math.sin(this.distanceFromCenter * 0.5) +
            Math.cos(this.distanceFromCenter * 0.3)) *
          0.2;
        // Add some random jitter
        this.angle += (Math.random() - 0.5) * 0.1;
        x = Math.cos(this.angle) * this.distanceFromCenter;
        y = Math.sin(this.angle) * this.distanceFromCenter;
        break;

      case "bounce": // Type 5: Bouncing movement
        // Calculate bounce effect
        const bouncePhase = Math.floor(
          this.distanceFromCenter / (levelRadius * 0.2)
        );
        const bounceProgress =
          (this.distanceFromCenter % (levelRadius * 0.2)) / (levelRadius * 0.2);

        // Switch direction on each bounce phase
        if (bouncePhase % 2 === 0) {
          // Moving outward
          this.angle = this.pathParams?.startAngle || this.angle;
        } else {
          // Moving inward temporarily
          this.angle = this.pathParams?.startAngle || this.angle;
          // Temporarily reduce distance to create bounce effect
          const bounceAmount =
            Math.sin(bounceProgress * Math.PI) * (levelRadius * 0.1);
          this.distanceFromCenter -= bounceAmount;
        }

        x = Math.cos(this.angle) * this.distanceFromCenter;
        y = Math.sin(this.angle) * this.distanceFromCenter;
        break;

      case "homing": // Type 7: Homing movement
        // Calculate vector to center (as a proxy for player position)
        // In a real implementation, this would use the actual player position
        const dx = -Math.cos(this.angle) * this.distanceFromCenter * 0.1;
        const dy = -Math.sin(this.angle) * this.distanceFromCenter * 0.1;

        // Adjust angle to move toward center/player
        const targetAngle = Math.atan2(dy, dx);
        const angleDiff = targetAngle - this.angle;

        // Normalize angle difference
        const normalizedDiff =
          ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;

        // Gradually turn toward target
        this.angle += normalizedDiff * delta * 0.5;

        x = Math.cos(this.angle) * this.distanceFromCenter;
        y = Math.sin(this.angle) * this.distanceFromCenter;
        break;

      case "zigzag":
        this.angle += Math.sin(this.distanceFromCenter / 10) * 0.1;
        x = Math.cos(this.angle) * this.distanceFromCenter;
        y = Math.sin(this.angle) * this.distanceFromCenter;
        break;

      case "circular":
        this.angle += delta * 0.5;
        x = Math.cos(this.angle) * this.distanceFromCenter;
        y = Math.sin(this.angle) * this.distanceFromCenter;
        break;

      case "spiral":
      case "spiralCrossing":
        // Spiral path - angle changes as distance increases
        if (this.pathParams) {
          if (this.movementStyle === "spiralCrossing") {
            // Add cross-path variation to the spiral
            this.angle =
              this.pathParams.startAngle +
              this.distanceFromCenter * this.pathParams.spiralTightness +
              Math.sin(this.distanceFromCenter * 0.2) * 0.5; // Add oscillation for crossing
          } else {
            // Regular spiral
            this.angle =
              this.pathParams.startAngle +
              this.distanceFromCenter * this.pathParams.spiralTightness;
          }
          x = Math.cos(this.angle) * this.distanceFromCenter;
          y = Math.sin(this.angle) * this.distanceFromCenter;
        } else {
          x = Math.cos(this.angle) * this.distanceFromCenter;
          y = Math.sin(this.angle) * this.distanceFromCenter;
        }
        break;

      case "wave":
      case "waveCrossing":
        // Wave path - sinusoidal movement
        if (this.pathParams) {
          // Base angle determines the spoke we're moving along
          const baseAngle = this.pathParams.startAngle;

          // Calculate wave offset
          let waveOffset =
            (Math.sin(
              (this.distanceFromCenter * this.pathParams.waveFrequency) /
                levelRadius
            ) *
              this.pathParams.waveAmplitude) /
            levelRadius;

          // For crossing waves, add an additional perpendicular wave component
          if (this.movementStyle === "waveCrossing") {
            // Add a secondary wave that's out of phase
            const secondaryWave =
              (Math.cos(
                (this.distanceFromCenter *
                  this.pathParams.waveFrequency *
                  1.5) /
                  levelRadius
              ) *
                this.pathParams.waveAmplitude *
                0.7) /
              levelRadius;

            // Combine the waves
            waveOffset += secondaryWave;
          }

          this.angle = baseAngle + waveOffset;
          x = Math.cos(this.angle) * this.distanceFromCenter;
          y = Math.sin(this.angle) * this.distanceFromCenter;
        } else {
          x = Math.cos(this.angle) * this.distanceFromCenter;
          y = Math.sin(this.angle) * this.distanceFromCenter;
        }
        break;

      case "pi":
      case "piCrossing":
        // Pi symbol path
        // Always ensure enemies of type 8 and 9 have pathParams for Pi movement
        if ((this.type === 8 || this.type === 9) && !this.pathParams) {
          this.pathParams = {
            startAngle: this.angle,
            spiralTightness: 0.1,
            waveAmplitude: 0.7,
            waveFrequency: 3.0,
            pathOffset: Math.random() * Math.PI * 2,
          };
        }

        if (this.pathParams) {
          // Calculate position along pi symbol
          // The pi symbol consists of:
          // 1. A horizontal bar at the top
          // 2. Two vertical lines coming down from the bar

          // Normalize distance to create pi symbol within level radius
          const normalizedDist = this.distanceFromCenter / levelRadius;

          // Random starting position on Pi symbol for enemy types 8 and 9
          if (
            this.distanceFromCenter === 0 &&
            (this.type === 8 || this.type === 9)
          ) {
            // Randomly decide which part of the Pi symbol to start on
            const piPart = Math.floor(Math.random() * 3); // 0: horizontal, 1: left leg, 2: right leg

            if (piPart === 0) {
              // Start on horizontal bar - random position along the bar
              const t = Math.random(); // 0 to 1 position along the bar
              x = -levelRadius * 0.5 + t * levelRadius;
              y = -levelRadius * 0.15;
              this.distanceFromCenter = 0.4 * levelRadius; // Skip initial approach
            } else if (piPart === 1) {
              // Start on left leg - random position along the leg
              x = -levelRadius * 0.4;
              y = -levelRadius * 0.15 - Math.random() * levelRadius * 0.85;
              this.distanceFromCenter = 0.6 * levelRadius; // Skip to vertical part
            } else {
              // Start on right leg - random position along the leg
              x = levelRadius * 0.4;
              y = -levelRadius * 0.15 - Math.random() * levelRadius * 0.85;
              this.distanceFromCenter = 0.6 * levelRadius; // Skip to vertical part
            }

            // Update angle for proper orientation
            this.angle = Math.atan2(y, x);
            return; // Return early after setting initial position
          }

          if (normalizedDist < 0.3) {
            // Initial approach from center
            x =
              this.pathParams.startAngle < Math.PI
                ? -normalizedDist * levelRadius * 0.5
                : normalizedDist * levelRadius * 0.5;
            y = -normalizedDist * levelRadius * 0.5;
          } else if (normalizedDist < 0.5) {
            // Moving to horizontal bar position
            const t = (normalizedDist - 0.3) / 0.2;
            x =
              this.pathParams.startAngle < Math.PI
                ? -levelRadius * 0.5 + t * levelRadius
                : levelRadius * 0.5 - t * levelRadius;
            y = -levelRadius * 0.15;
          } else {
            // Moving down vertical line - default positions
            // Determine which leg of Pi to follow based on angle
            let legPosition;
            if (this.pathParams.startAngle < Math.PI * 0.67) {
              legPosition = -levelRadius * 0.4; // Left leg
            } else if (this.pathParams.startAngle < Math.PI * 1.33) {
              legPosition = 0; // Middle (for type 9)
            } else {
              legPosition = levelRadius * 0.4; // Right leg
            }

            // For crossing pi, allow swapping between legs
            if (this.movementStyle === "piCrossing" && normalizedDist > 0.7) {
              const crossPhase = Math.floor((normalizedDist - 0.7) * 10);
              if (crossPhase % 2 === 1) {
                // Periodically swap legs
                if (legPosition === -levelRadius * 0.4) {
                  legPosition = 0;
                } else if (legPosition === 0) {
                  legPosition =
                    legPosition === -levelRadius * 0.4
                      ? levelRadius * 0.4
                      : -levelRadius * 0.4;
                } else {
                  legPosition = 0;
                }
              }

              // Add some subtle horizontal oscillation
              legPosition += Math.sin(normalizedDist * 15) * 0.1 * levelRadius;
            }

            x = legPosition;
            y =
              -levelRadius * 0.15 - (normalizedDist - 0.5) * levelRadius * 0.85;
          }

          // Update angle for proper orientation
          this.angle = Math.atan2(y, x);
        } else {
          x = Math.cos(this.angle) * this.distanceFromCenter;
          y = Math.sin(this.angle) * this.distanceFromCenter;
        }
        break;

      case "star":
      case "starCrossing":
        // Star path
        if (this.pathParams) {
          // Number of star points increases with level
          const starPoints =
            3 + (Math.floor(this.pathParams.waveFrequency * 2) % 5);
          const pointAngle = (Math.PI * 2) / starPoints;

          // Calculate which point we're moving toward
          let pointIndex = Math.floor(
            (this.pathParams.startAngle / (Math.PI * 2)) * starPoints
          );

          // For crossing stars, occasionally jump to a different point
          if (this.movementStyle === "starCrossing") {
            const jumpPhase = Math.floor(
              this.distanceFromCenter / (levelRadius * 0.2)
            );
            if (
              jumpPhase % 3 === 0 &&
              this.distanceFromCenter > levelRadius * 0.3
            ) {
              // Jump to a different point randomly
              pointIndex =
                (pointIndex +
                  1 +
                  Math.floor(Math.random() * (starPoints - 2))) %
                starPoints;
            }
          }

          const nextPointIndex = (pointIndex + 1) % starPoints;

          // Calculate angle to current and next point
          const currentPointAngle = pointIndex * pointAngle;
          const nextPointAngle = nextPointIndex * pointAngle;

          // Interpolate between inner and outer radius
          const innerRadius = levelRadius * 0.4;
          const outerRadius = levelRadius;

          // Determine if we're moving to outer point or inner corner
          const toOuter =
            Math.floor((this.distanceFromCenter / levelRadius) * 10) % 2 === 0;

          // For crossing stars, add some oscillation to the angle
          let targetAngle;
          if (toOuter) {
            // Moving to outer point
            targetAngle = currentPointAngle;
            if (this.movementStyle === "starCrossing") {
              // Add slight wobble when moving to points
              targetAngle += Math.sin(this.distanceFromCenter * 2) * 0.1;
            }
          } else {
            // Moving to inner corner
            targetAngle = currentPointAngle + pointAngle / 2;
            if (this.movementStyle === "starCrossing") {
              // Add slight wobble when moving to corners
              targetAngle += Math.cos(this.distanceFromCenter * 3) * 0.15;
            }
          }

          this.angle = targetAngle;

          const currentRadius = toOuter
            ? innerRadius +
              ((outerRadius - innerRadius) *
                (this.distanceFromCenter % (levelRadius / 5))) /
                (levelRadius / 5)
            : outerRadius -
              ((outerRadius - innerRadius) *
                (this.distanceFromCenter % (levelRadius / 5))) /
                (levelRadius / 5);

          x = Math.cos(this.angle) * currentRadius;
          y = Math.sin(this.angle) * currentRadius;
        } else {
          x = Math.cos(this.angle) * this.distanceFromCenter;
          y = Math.sin(this.angle) * this.distanceFromCenter;
        }
        break;

      case "spoke":
        // Default spoke movement - just move outward along the spoke
        x = Math.cos(this.angle) * this.distanceFromCenter;
        y = Math.sin(this.angle) * this.distanceFromCenter;
        break;

      case "spokeCrossing":
        // Handle spoke crossing movement
        if (this.distanceFromCenter > levelRadius * 0.3) {
          // Calculate crossover effect based on distance from center
          const crossFactor = Math.min(
            1,
            (this.distanceFromCenter / levelRadius) * 2
          );

          // Gradually shift the angle based on distance from center
          this.angle +=
            this.spokeCrossingDirection! *
            this.spokeCrossingSpeed! *
            crossFactor *
            delta *
            10;
        }
        x = Math.cos(this.angle) * this.distanceFromCenter;
        y = Math.sin(this.angle) * this.distanceFromCenter;
        break;

      case "linear":
        // Linear movement with direction vector
        if (this.direction) {
          x = this.mesh.position.x + this.direction.x * this.speed * delta * 30;
          y = this.mesh.position.y + this.direction.y * this.speed * delta * 30;
          this.distanceFromCenter = Math.sqrt(x * x + y * y);
        } else {
          x = Math.cos(this.angle) * this.distanceFromCenter;
          y = Math.sin(this.angle) * this.distanceFromCenter;
        }
        break;

      default:
        x = Math.cos(this.angle) * this.distanceFromCenter;
        y = Math.sin(this.angle) * this.distanceFromCenter;
    }

    // Apply position
    this.mesh.position.set(x, y, 0);

    // Rotate enemy for visual effect
    this.mesh.rotation.x += delta * 2;
    this.mesh.rotation.y += delta * 2;

    // Scale enemy as it moves outward for better visibility
    const scale = 0.5 + this.distanceFromCenter / (levelRadius * 2);
    this.mesh.scale.set(scale, scale, scale);

    // For enemy type 8, fire bullets at the player
    if (this.type === 8) {
      this.tryFireBullet(delta);
    }
  }

  // Check if enemy is outside the level boundary
  isOffscreen(levelRadius: number): boolean {
    return this.distanceFromCenter > levelRadius + 2;
  }

  // Try to fire a bullet at the player
  private tryFireBullet(delta: number): void {
    // Only fire bullets when enemy is within a certain range
    const minFireDistance = 3; // Min distance from center to start firing
    const maxFireDistance = 8; // Max distance from center to stop firing

    // Check if enemy is in firing range
    if (
      this.distanceFromCenter < minFireDistance ||
      this.distanceFromCenter > maxFireDistance
    ) {
      return;
    }

    // Add time to last fire counter
    this.lastFireTime += delta;

    // Fire bullets every 2-3 seconds
    const fireInterval = 2 + Math.random();

    if (this.lastFireTime > fireInterval) {
      this.lastFireTime = 0; // Reset fire timer
      this.fireBullet();
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
        y: Math.sin(playerAngle) * 10
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
    const audio = new Audio();
    audio.volume = 0.3; // Lower volume than player shots
    audio.src = "laser-1.mp3"; // Reuse the laser sound for now
    audio.play();
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
    // const audio = new Audio("explosion-1.mp3");
    // audio.play();
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
  static getBehavior(enemyType: number): {
    hitPoints: number;
    speedMultiplier: number;
    movementStyle: string;
  } {
    switch (enemyType) {
      case 0: // Standard follower - always follows spokes
        return {
          hitPoints: 1,
          speedMultiplier: 1.0,
          movementStyle: "spoke",
        };

      case 1: // Crosser - always follows spokes but crosses between them
        return {
          hitPoints: 2,
          speedMultiplier: 0.9,
          movementStyle: "spokeCrossing",
        };

      case 2: // Speeder - follows patterns but moves faster
        return {
          hitPoints: 2,
          speedMultiplier: 1.5, // Faster!
          movementStyle: "follow",
        };

      case 3: // Zigzagger - erratic zig-zag movement
        return {
          hitPoints: 3,
          speedMultiplier: 1.1,
          movementStyle: "zigzag",
        };

      case 4: // Orbiter - circular orbital movement
        return {
          hitPoints: 3,
          speedMultiplier: 0.8,
          movementStyle: "circular",
        };

      case 5: // Bouncer - bouncing movement pattern
        return {
          hitPoints: 4,
          speedMultiplier: 1.2,
          movementStyle: "bounce",
        };

      case 6: // Chaotic - extremely erratic movement
        return {
          hitPoints: 4,
          speedMultiplier: 0.9,
          movementStyle: "erratic",
        };

      case 7: // Hunter - attempts to home in on player
        return {
          hitPoints: 5,
          speedMultiplier: 0.7,
          movementStyle: "homing",
        };

      case 8: // Pi-follower - follows pi symbol on pi levels
        return {
          hitPoints: 6,
          speedMultiplier: 0.8,
          movementStyle: "pi",
        };

      case 9: // Advanced Pi-follower - follows pi symbol but faster and more hit points
        return {
          hitPoints: 8,
          speedMultiplier: 1.0,
          movementStyle: "pi",
        };

      default: // Fallback for any unexpected enemy types
        return {
          hitPoints: 1,
          speedMultiplier: 1.0,
          movementStyle: "follow",
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
    // Create three smaller spheres with random directions
    for (let i = 0; i < 3; i++) {
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

      // Randomize direction
      const angle = Math.random() * Math.PI * 2;
      const randomDirection = new THREE.Vector2(
        Math.cos(angle),
        Math.sin(angle)
      );

      // Create the enemy with a reference to scene, gameState, and modeState
      const enemy = new Enemy(
        mesh,
        Math.atan2(randomDirection.y, randomDirection.x),
        Math.sqrt(position.x * position.x + position.y * position.y),
        this.modeState.enemySpeed * 1.5, // Slightly faster than original
        -1, // Special type for smaller spheres
        0.2,
        1,
        "linear",
        this.scene,
        this.gameState,
        this.modeState,
        randomDirection
      );

      this.scene.add(mesh);
      this.modeState.enemies.push(enemy);
    }
  }
}
