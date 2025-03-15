import * as THREE from "three";
import { GameState } from "./types";
import { Enemy } from "./enemy";

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
    const enemyGeometry = Enemy.getGeometry(piDigit);

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

    const mesh = new THREE.Mesh(enemyGeometry, enemyMaterial);

    // Position enemy at center initially
    mesh.position.set(0, 0, 0);

    // Random angle for the enemy path
    const angle = Math.random() * Math.PI * 2;

    // Assign hitpoints and speed based on piDigit
    const { hitPoints, speedMultiplier, movementStyle } =
      Enemy.getBehavior(piDigit);

    // Randomize size slightly
    const size = 0.3 + piDigit / 20 + Math.random() * 0.1;

    // Create the enemy object
    const enemy = new Enemy(
      mesh,
      angle,
      0, // distanceFromCenter starts at 0
      this.gameState.enemySpeed * speedMultiplier,
      piDigit,
      size,
      hitPoints,
      movementStyle,
      this.scene,
      this.gameState
    );

    this.scene.add(mesh);
    this.gameState.enemies.push(enemy);
  }

  update(delta: number): void {
    // Move all enemies based on their movement style
    for (const enemy of this.gameState.enemies) {
      // Update enemy position
      enemy.update(delta, this.levelRadius);
    }

    // Remove enemies that are past the level radius
    this.removeOffscreenEnemies();
  }

  removeOffscreenEnemies(): void {
    // Remove enemies that are past the level boundary
    for (let i = this.gameState.enemies.length - 1; i >= 0; i--) {
      const enemy = this.gameState.enemies[i];

      if (enemy.isOffscreen(this.levelRadius)) {
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
      if (enemy.checkCollision(playerPos, playerRadius)) {
        return true; // Collision detected
      }
    }

    return false; // No collision
  }
}
