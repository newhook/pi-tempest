import * as THREE from "three";
import { GameState, ActiveModeState } from "./types";
import { Enemy } from "./enemy";
import { Level, LevelType } from "./levels";

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
        // XXX: explode.
        this.scene.remove(enemy.mesh);
        this.modeState.enemies.splice(i, 1);

        // Penalty for missing an enemy
        // Subtract points based on enemy type
        const penalty = Math.floor(enemy.type * 1.5);
        this.gameState.score = Math.max(0, this.gameState.score - penalty);
      }
    }
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
}
