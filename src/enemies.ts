import * as THREE from "three";
import { GameState, Enemy } from "./types";

// Pi digits to use for enemy generation
const PI_DIGITS = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9];

export class EnemyManager {
  private scene: THREE.Scene;
  private gameState: GameState;
  private levelRadius: number;
  private piIndex: number = 0;

  constructor(scene: THREE.Scene, gameState: GameState, levelRadius: number) {
    this.scene = scene;
    this.gameState = gameState;
    this.levelRadius = levelRadius;
  }

  createEnemy(): void {
    // Get next PI digit as enemy type
    const piDigit = PI_DIGITS[this.piIndex % PI_DIGITS.length];
    this.piIndex++;

    // Create enemy geometry based on pi digit
    const enemyGeometry = this.getEnemyGeometry(piDigit);

    // Color based on digit value (range of blues and purples)
    const hue = 0.6 + piDigit / 30; // blues to purples
    const color = new THREE.Color().setHSL(hue, 1, 0.5);

    // Create material with emissive glow
    const enemyMaterial = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.5,
      flatShading: true,
    });

    const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);

    // Position enemy at center initially
    enemy.position.set(0, 0, 0);

    // Random angle for the enemy path
    const angle = Math.random() * Math.PI * 2;

    // Assign hitpoints and speed based on piDigit
    const { hitPoints, speedMultiplier, movementStyle } =
      this.getEnemyBehavior(piDigit);

    // Create the enemy object with randomized size
    const enemyObj: Enemy = {
      mesh: enemy,
      angle: angle,
      distanceFromCenter: 0,
      speed: this.gameState.enemySpeed * speedMultiplier,
      type: piDigit,
      size: 0.3 + piDigit / 20 + Math.random() * 0.1, // Randomize size slightly
      hitPoints: hitPoints,
      movementStyle: movementStyle,
    };

    this.scene.add(enemy);
    this.gameState.enemies.push(enemyObj);
  }

  private getEnemyGeometry(piDigit: number): THREE.BufferGeometry {
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

  private getEnemyBehavior(piDigit: number): {
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

  update(delta: number): void {
    // Move all enemies based on their movement style
    for (const enemy of this.gameState.enemies) {
      switch (enemy.movementStyle) {
        case "zigzag":
          enemy.angle += Math.sin(enemy.distanceFromCenter / 10) * 0.1;
          break;
        case "circular":
          enemy.angle += delta * 0.5;
          break;
        case "linear":
        default:
          // No angle change for linear movement
          break;
      }

      // Increment distance from center for radial movement
      enemy.distanceFromCenter += enemy.speed * delta * 30;

      // Calculate new position based on movement style
      let x, y;

      if (enemy.movementStyle === "linear" && enemy.direction) {
        // For linear movement with direction vector, move in straight line
        x =
          enemy.mesh.position.x + enemy.direction.x * enemy.speed * delta * 30;
        y =
          enemy.mesh.position.y + enemy.direction.y * enemy.speed * delta * 30;

        // Update distance from center for boundary checking
        enemy.distanceFromCenter = Math.sqrt(x * x + y * y);
      } else {
        // For radial movement styles (zigzag, circular, default linear without direction)
        x = Math.cos(enemy.angle) * enemy.distanceFromCenter;
        y = Math.sin(enemy.angle) * enemy.distanceFromCenter;
      }

      // Apply position
      enemy.mesh.position.set(x, y, 0);

      // Rotate enemy for visual effect
      enemy.mesh.rotation.x += delta * 2;
      enemy.mesh.rotation.y += delta * 2;

      // Scale enemy as it moves outward for better visibility
      const scale = 0.5 + enemy.distanceFromCenter / (this.levelRadius * 2);
      enemy.mesh.scale.set(scale, scale, scale);
    }

    // Remove enemies that are past the level radius
    this.removeOffscreenEnemies();
  }

  removeOffscreenEnemies(): void {
    // Remove enemies that are past the level boundary
    for (let i = this.gameState.enemies.length - 1; i >= 0; i--) {
      const enemy = this.gameState.enemies[i];

      if (enemy.distanceFromCenter > this.levelRadius + 2) {
        this.scene.remove(enemy.mesh);
        this.gameState.enemies.splice(i, 1);

        // Penalty for missing an enemy
        if (!this.gameState.isGameOver) {
          // Subtract points based on enemy type
          const penalty = Math.floor(enemy.type * 1.5);
          this.gameState.score = Math.max(0, this.gameState.score - penalty);
        }
      }
    }
  }

  checkPlayerCollision(player: THREE.Group): boolean {
    // Player collision radius (slightly smaller than visual size)
    const playerRadius = this.gameState.playerSize * 0.8;

    // Get player position
    const playerPos = player.position;

    for (const enemy of this.gameState.enemies) {
      const enemyPos = enemy.mesh.position;

      // Calculate distance between player and enemy
      const dx = playerPos.x - enemyPos.x;
      const dy = playerPos.y - enemyPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check collision
      if (distance < playerRadius + enemy.size) {
        return true; // Collision detected
      }
    }

    return false; // No collision
  }

  public handleEnemyExplosion(enemy: Enemy): void {
    const enemyMaterial = enemy.mesh.material as THREE.MeshBasicMaterial;
    this.createExplosion(enemy.mesh.position, enemyMaterial.color);

    if (enemy.type === 0) {
      this.createSmallerSpheres(enemy.mesh.position);
    }
  }

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

  private createSmallerSpheres(position: THREE.Vector3): void {
    // Create three smaller spheres with random directions
    for (let i = 0; i < 3; i++) {
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

      const enemyObj: Enemy = {
        mesh: mesh,
        angle: Math.atan2(randomDirection.y, randomDirection.x),
        distanceFromCenter: Math.sqrt(
          position.x * position.x + position.y * position.y
        ),
        speed: this.gameState.enemySpeed * 1.5, // Slightly faster than original
        type: -1, // Special type for smaller spheres
        size: 0.2,
        hitPoints: 1,
        movementStyle: "linear",
        // Add directional movement vector
        direction: randomDirection,
      };

      this.scene.add(mesh);
      this.gameState.enemies.push(enemyObj);
    }
  }
}
