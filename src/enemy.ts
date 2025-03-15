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
        // Spiral path - angle changes as distance increases
        if (this.pathParams) {
          this.angle =
            this.pathParams.startAngle +
            this.distanceFromCenter * this.pathParams.spiralTightness;
          x = Math.cos(this.angle) * this.distanceFromCenter;
          y = Math.sin(this.angle) * this.distanceFromCenter;
        } else {
          x = Math.cos(this.angle) * this.distanceFromCenter;
          y = Math.sin(this.angle) * this.distanceFromCenter;
        }
        break;

      case "wave":
        // Wave path - sinusoidal movement
        if (this.pathParams) {
          // Base angle determines the spoke we're moving along
          const baseAngle = this.pathParams.startAngle;
          // Add sine wave modulation to angle
          const waveOffset =
            (Math.sin(
              (this.distanceFromCenter * this.pathParams.waveFrequency) /
                levelRadius
            ) *
              this.pathParams.waveAmplitude) /
            levelRadius;

          this.angle = baseAngle + waveOffset;
          x = Math.cos(this.angle) * this.distanceFromCenter;
          y = Math.sin(this.angle) * this.distanceFromCenter;
        } else {
          x = Math.cos(this.angle) * this.distanceFromCenter;
          y = Math.sin(this.angle) * this.distanceFromCenter;
        }
        break;

      case "pi":
        // Pi symbol path
        if (this.pathParams) {
          // Calculate position along pi symbol
          // The pi symbol consists of:
          // 1. A horizontal bar at the top
          // 2. Two vertical lines coming down from the bar

          // Normalize distance to create pi symbol within level radius
          const normalizedDist = this.distanceFromCenter / levelRadius;

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
            // Moving down vertical line
            const legPosition =
              this.pathParams.startAngle < Math.PI * 0.67
                ? -levelRadius * 0.4
                : this.pathParams.startAngle < Math.PI * 1.33
                ? 0
                : levelRadius * 0.4;
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
        // Star path
        if (this.pathParams) {
          // Number of star points increases with level
          const starPoints =
            3 + (Math.floor(this.pathParams.waveFrequency * 2) % 5);
          const pointAngle = (Math.PI * 2) / starPoints;

          // Calculate which point we're moving toward
          const pointIndex = Math.floor(
            (this.pathParams.startAngle / (Math.PI * 2)) * starPoints
          );
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

          if (toOuter) {
            // Moving to outer point
            const targetAngle = currentPointAngle;
            this.angle = targetAngle;
          } else {
            // Moving to inner corner
            const targetAngle = currentPointAngle + pointAngle / 2;
            this.angle = targetAngle;
          }

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
  }

  // Check if enemy is outside the level boundary
  isOffscreen(levelRadius: number): boolean {
    return this.distanceFromCenter > levelRadius + 2;
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
      this.createSmallerSpheres(this.mesh.position);
    }

    // Play explosion sound
    const audio = new Audio("explosion-1.mp3");
    audio.play();
  }

  // Static methods for creating different types of enemies

  // Get geometry based on enemy type
  static getGeometry(piDigit: number): THREE.BufferGeometry {
    // Different geometries based on PI digit
    switch (piDigit) {
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
  static getBehavior(piDigit: number): {
    hitPoints: number;
    speedMultiplier: number;
    movementStyle: string;
  } {
    switch (piDigit) {
      case 1:
        return { hitPoints: 1, speedMultiplier: 1.0, movementStyle: "linear" };
      case 2:
        return { hitPoints: 2, speedMultiplier: 0.9, movementStyle: "zigzag" };
      case 3:
        return {
          hitPoints: 3,
          speedMultiplier: 0.8,
          movementStyle: "circular",
        };
      case 4:
        return { hitPoints: 4, speedMultiplier: 0.7, movementStyle: "linear" };
      case 5:
        return { hitPoints: 5, speedMultiplier: 0.6, movementStyle: "zigzag" };
      case 6:
        return {
          hitPoints: 6,
          speedMultiplier: 0.5,
          movementStyle: "circular",
        };
      case 7:
        return { hitPoints: 7, speedMultiplier: 0.4, movementStyle: "linear" };
      case 8:
        return { hitPoints: 8, speedMultiplier: 0.3, movementStyle: "zigzag" };
      case 9:
        return {
          hitPoints: 9,
          speedMultiplier: 0.2,
          movementStyle: "circular",
        };
      default:
        return { hitPoints: 1, speedMultiplier: 1.0, movementStyle: "linear" };
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
  private createSmallerSpheres(position: THREE.Vector3): void {
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
