import * as THREE from "three";
import { GameState, ActiveModeState, Explosion } from "./types";
import { Enemy } from "./enemy";
import { Level, LevelType } from "./levels";

// Class to handle enemy explosions at the level boundary
class EnemyExplosion {
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private color: THREE.Color;
  private explosionId: string;
  private modeState: ActiveModeState;
  private rings: THREE.Mesh[] = [];
  private light: THREE.PointLight;
  private explosionRadius: number = 2.0;
  private duration: number = 2000; // Duration in ms
  private numRings: number = 5; // Number of concentric circles

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    color: THREE.Color,
    modeState: ActiveModeState
  ) {
    this.scene = scene;
    this.position = position;
    this.color = color;
    this.modeState = modeState;
    this.explosionId = Date.now().toString() + Math.random().toString();

    // Create and track explosion for collision detection
    this.trackExplosion();

    // Create the concentric rings
    this.createRings();

    // Add light effect
    this.light = new THREE.PointLight(this.color, 2, this.explosionRadius * 3);
    this.light.position.copy(this.position);
    this.scene.add(this.light);

    // Start animation
    this.animate();

    // Play explosion sound
    this.playSound();
  }

  private trackExplosion(): void {
    // Create explosion data for collision detection
    const explosion: Explosion = {
      id: this.explosionId,
      position: this.position.clone(),
      radius: 0, // Start at 0 and expand
      maxRadius: this.explosionRadius,
      startTime: Date.now(),
      duration: this.duration,
    };

    // Add to tracked explosions
    this.modeState.explosions.push(explosion);
  }

  private createRings(): void {
    // Create multiple concentric circles/rings
    for (let i = 0; i < this.numRings; i++) {
      // Each ring starts with a tiny radius
      // Pass the inverted ring index so innermost is numRings-1 (yellow) and outermost is 0 (dark red)
      const ring = this.createRing(0.1, this.numRings - 1 - i);
      this.rings.push(ring);
      this.scene.add(ring);
    }
  }

  private createRing(radius: number, ringIndex: number): THREE.Mesh {
    // Create a circle geometry (filled disk)
    const segments = 32; // Number of segments in the circle
    const circleGeometry = new THREE.CircleGeometry(radius, segments);

    // Create color gradient from dark red (outermost) to yellow (innermost)
    // Map the ring index to a color in the gradient
    const colorIndex = ringIndex / (this.numRings - 1); // 0 to 1 based on position in sequence

    // Create a color gradient from dark red (0) to bright yellow (1)
    let ringColor: THREE.Color;
    if (colorIndex < 0.33) {
      // Dark red to red (first third)
      const t = colorIndex / 0.33;
      ringColor = new THREE.Color(0x660000).lerp(new THREE.Color(0xff0000), t);
    } else if (colorIndex < 0.66) {
      // Red to orange (middle third)
      const t = (colorIndex - 0.33) / 0.33;
      ringColor = new THREE.Color(0xff0000).lerp(new THREE.Color(0xff6600), t);
    } else {
      // Orange to yellow (final third)
      const t = (colorIndex - 0.66) / 0.34;
      ringColor = new THREE.Color(0xff6600).lerp(new THREE.Color(0xffff00), t);
    }

    // Create material for solid filled circle
    const material = new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide, // Make sure it's visible from both sides
    });

    // Create the filled circle
    const ring = new THREE.Mesh(circleGeometry, material);

    // Position at explosion center
    ring.position.copy(this.position);

    return ring;
  }

  private animate(): void {
    const startTime = Date.now();

    const updateFrame = () => {
      const elapsedTime = Date.now() - startTime;
      const progress = Math.min(elapsedTime / this.duration, 1.0);

      // If animation completed, clean up
      if (progress >= 1.0) {
        this.cleanup();
        return;
      }

      // Update rings (expand outward)
      this.animateRings(progress);

      // Update explosion radius for collision detection
      this.updateExplosionRadius(progress);

      // Update light intensity
      this.light.intensity = 2.0 * (1.0 - progress);

      // Continue animation
      requestAnimationFrame(updateFrame);
    };

    // Start animation loop
    updateFrame();
  }

  private animateRings(progress: number): void {
    // Update each ring's radius and opacity
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i];

      // Calculate individual timing for each ring to create wave effect
      // Stagger the rings by offsetting their timings
      const ringDelay = i * (1.0 / this.numRings); // Delay between rings
      const ringProgress = Math.max(
        0,
        Math.min(1, (progress - ringDelay) * 1.5)
      ); // Adjusted progress for this ring

      if (ringProgress <= 0) {
        // Ring hasn't started expanding yet
        ring.visible = false;
        continue;
      }

      ring.visible = true;

      // Calculate radius for this ring
      const maxRadius = (this.explosionRadius * (i + 1)) / this.numRings;
      const radius = maxRadius * ringProgress;

      // Update ring scale rather than geometry (simpler for CircleGeometry)
      this.updateRingSize(ring, radius);

      // Fade out as rings expand
      const material = ring.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, 1.0 - ringProgress);
    }
  }

  private updateRingSize(ring: THREE.Mesh, radius: number): void {
    // For CircleGeometry, we scale the mesh rather than updating vertices
    // Get the current mesh scale
    const currentScale = ring.scale.x;

    // Calculate required scale to achieve target radius
    // Initial geometry has radius 0.1, so scale = target radius / 0.1
    const targetScale = radius / 0.1;

    // Update the mesh scale
    ring.scale.set(targetScale, targetScale, 1);
  }

  private updateExplosionRadius(progress: number): void {
    // Find this explosion in the tracked list
    const explosionIndex = this.modeState.explosions.findIndex(
      (exp) => exp.id === this.explosionId
    );
    if (explosionIndex === -1) return;

    // Update radius based on animation phase
    if (progress < 0.3) {
      // Fast expansion phase (0 to 30% of animation)
      this.modeState.explosions[explosionIndex].radius =
        this.explosionRadius * (progress / 0.3);
    } else if (progress < 0.7) {
      // Hold at maximum radius (30% to 70% of animation)
      this.modeState.explosions[explosionIndex].radius = this.explosionRadius;
    } else {
      // Contract from max radius back to 0 (70% to 100% of animation)
      const contractionProgress = (progress - 0.7) / 0.3;
      this.modeState.explosions[explosionIndex].radius =
        this.explosionRadius * (1 - contractionProgress);
    }
  }

  private cleanup(): void {
    // Remove all rings
    for (const ring of this.rings) {
      this.scene.remove(ring);

      // Dispose of resources to prevent memory leaks
      if (ring.geometry) {
        ring.geometry.dispose();
      }

      // Dispose of material
      if (ring.material) {
        if (Array.isArray(ring.material)) {
          // Handle array of materials
          ring.material.forEach((material) => material.dispose());
        } else {
          // Handle single material
          (ring.material as THREE.Material).dispose();
        }
      }
    }
    this.rings = [];

    // Remove light
    this.scene.remove(this.light);

    // Remove from tracked explosions
    const explosionIndex = this.modeState.explosions.findIndex(
      (exp) => exp.id === this.explosionId
    );
    if (explosionIndex !== -1) {
      this.modeState.explosions.splice(explosionIndex, 1);
    }
  }

  private playSound(): void {
    try {
      const audio = new Audio("/explosion-1.mp3");
      audio.volume = 0.5;
      audio.play().catch((e) => console.log("Audio play failed:", e));
    } catch (error) {
      console.log("Could not play explosion sound:", error);
    }
  }
}

// Make EnemyExplosion class available for export
export { EnemyExplosion };

export class EnemyManager {
  private scene: THREE.Scene;
  private gameState: GameState;
  private modeState: ActiveModeState;

  constructor(
    scene: THREE.Scene,
    gameState: GameState,
    modeState: ActiveModeState
  ) {
    this.scene = scene;
    this.gameState = gameState;
    this.modeState = modeState;
  }

  createEnemy(level: Level): void {
    // Determine the available enemy types based on level
    // Level 1: types 0, 1
    // Level 2: types 0, 1, 2, 3
    // Level 3: types 0, 1, 2, 3, 4, 5
    // Level 4: types 0, 1, 2, 3, 4, 5, 6, 7
    // Level 5+: all types (0-9)
    const maxEnemyType = Math.min(
      9, // Maximum enemy type is 9
      Math.ceil(this.gameState.currentLevel * 2 - 1) // 2 new types per level
    );

    // Use forced enemy type if available, otherwise random
    let enemyType;
    if (this.modeState.forcedEnemyType !== undefined) {
      // Make sure the forced type is within valid range (0-9)
      enemyType = Math.min(9, Math.max(0, this.modeState.forcedEnemyType));
    } else {
      // Select a random enemy type from the available range
      enemyType = Math.floor(Math.random() * (maxEnemyType + 1));
    }

    // Create enemy geometry based on the enemy type
    const enemyGeometry = Enemy.getGeometry(enemyType);

    // Color based on enemy type (range of blues and purples)
    const hue = 0.6 + enemyType / 30; // blues to purples
    const color = new THREE.Color().setHSL(hue, 1, 0.5);

    // Create material with emissive glow
    const enemyMaterial = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.5,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(enemyGeometry, enemyMaterial);

    // Position enemy at center initially
    mesh.position.set(0, 0, 0);

    // Create the enemy object
    const enemy = new Enemy(
      level,
      mesh,
      enemyType,
      this.scene,
      this.gameState,
      this.modeState
    );

    this.scene.add(mesh);
    this.modeState.enemies.push(enemy);
  }

  update(delta: number, level: Level): void {
    // Move all enemies based on their movement style
    for (const enemy of this.modeState.enemies) {
      // Use the unified update method for all enemy types
      enemy.update(delta);
    }

    // Remove enemies that are past the level radius
    this.removeOffscreenEnemies(level);
  }

  removeOffscreenEnemies(level: Level): void {
    // Remove enemies that are past the level boundary
    for (let i = this.modeState.enemies.length - 1; i >= 0; i--) {
      const enemy = this.modeState.enemies[i];

      if (level.collidesWithEnemy(enemy)) {
        // Create explosion at the boundary
        this.createBoundaryExplosion(enemy, level);

        // Remove the enemy
        enemy.remove();
        this.modeState.enemies.splice(i, 1);
      }
    }
  }

  // Create an explosion effect at the level boundary when an enemy collides with it
  private createBoundaryExplosion(enemy: Enemy, level: Level): void {
    // Get enemy position and direction
    const enemyPos = enemy.mesh.position;
    const direction = new THREE.Vector3(enemyPos.x, enemyPos.y, 0).normalize();
    const levelRadius = level.getRadius();

    // Calculate position at level boundary based on level type
    let explosionPosition: THREE.Vector3;

    switch (level.levelType) {
      case LevelType.Star:
        // For star levels, calculate position based on angle
        const angle = Math.atan2(enemyPos.y, enemyPos.x);
        const starPoints = 3 + (level.levelNumber % 5);
        const anglePerPoint = (Math.PI * 2) / starPoints;
        const pointIndex = Math.floor(angle / anglePerPoint);

        // Calculate if we're at an outer point or inner corner
        const isOuterPoint = pointIndex % 2 === 0;
        const radiusAtAngle = isOuterPoint ? levelRadius : levelRadius * 0.6;

        // Position at the proper boundary point
        explosionPosition = new THREE.Vector3(
          direction.x * radiusAtAngle,
          direction.y * radiusAtAngle,
          0
        );
        break;

      case LevelType.Wave:
        // For wave levels, calculate position based on sine wave
        const waveAngle = Math.atan2(enemyPos.y, enemyPos.x);
        const amplitude = levelRadius * 0.05;
        const waveRadius = levelRadius + Math.sin(waveAngle * 3.14) * amplitude;

        explosionPosition = new THREE.Vector3(
          direction.x * waveRadius,
          direction.y * waveRadius,
          0
        );
        break;

      default:
        // For circular levels, simple radius calculation
        explosionPosition = new THREE.Vector3(
          direction.x * levelRadius,
          direction.y * levelRadius,
          0
        );
    }

    // Get enemy color
    const enemyMaterial = enemy.mesh.material as THREE.MeshStandardMaterial;
    const color = enemyMaterial.color.clone();

    // Create the explosion at the determined position
    new EnemyExplosion(this.scene, explosionPosition, color, this.modeState);
  }

  checkPlayerCollision(player: THREE.Group): boolean {
    // Player collision radius (slightly smaller than visual size)
    const playerRadius = this.modeState.playerSize * 0.8;

    // Get player position
    const playerPos = player.position;

    for (const enemy of this.modeState.enemies) {
      if (enemy.checkCollision(playerPos, playerRadius)) {
        return true; // Collision detected
      }
    }

    return false; // No collision
  }

  // Create an explosion at a specific position
  createExplosionAtPosition(position: THREE.Vector3, color: THREE.Color): void {
    // Create an explosion effect at the specified position
    new EnemyExplosion(this.scene, position, color, this.modeState);
  }
}
