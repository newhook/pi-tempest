import * as THREE from "three";
import { GameState } from "./types";

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
  private gameState: GameState;
  private scene: THREE.Scene;

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
    this.direction = direction;
  }

  // Update enemy position based on movement style
  update(delta: number, levelRadius: number): void {
    // Update angle based on movement style
    switch (this.movementStyle) {
      case "zigzag":
        this.angle += Math.sin(this.distanceFromCenter / 10) * 0.1;
        break;
      case "circular":
        this.angle += delta * 0.5;
        break;
      case "linear":
      default:
        // No angle change for linear movement
        break;
    }

    // Increment distance from center for radial movement
    this.distanceFromCenter += this.speed * delta * 30;

    // Calculate new position based on movement style
    let x, y;
    
    if (this.movementStyle === "linear" && this.direction) {
      // For linear movement with direction vector, move in straight line
      x = this.mesh.position.x + this.direction.x * this.speed * delta * 30;
      y = this.mesh.position.y + this.direction.y * this.speed * delta * 30;
      
      // Update distance from center for boundary checking
      this.distanceFromCenter = Math.sqrt(x * x + y * y);
    } else {
      // For radial movement styles (zigzag, circular, default linear without direction)
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

      // Create the enemy with a reference to scene and gameState
      const enemy = new Enemy(
        mesh,
        Math.atan2(randomDirection.y, randomDirection.x),
        Math.sqrt(position.x * position.x + position.y * position.y),
        this.gameState.enemySpeed * 1.5, // Slightly faster than original
        -1, // Special type for smaller spheres
        0.2,
        1,
        "linear",
        this.scene,
        this.gameState,
        randomDirection
      );
      
      this.scene.add(mesh);
      this.gameState.enemies.push(enemy);
    }
  }
}