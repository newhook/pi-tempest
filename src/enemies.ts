import * as THREE from "three";
import { GameState, ActiveModeState } from "./types";
import { Enemy } from "./enemy";

// Pi digits to use for enemy generation
const PI_DIGITS = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9];

export class EnemyManager {
  private scene: THREE.Scene;
  private gameState: GameState;
  private modeState: ActiveModeState;
  private levelRadius: number;
  private piIndex: number = 0;
  private numSpokes: number = 8; // Number of spokes in the wheel

  constructor(scene: THREE.Scene, gameState: GameState, modeState: ActiveModeState, levelRadius: number) {
    this.scene = scene;
    this.gameState = gameState;
    this.modeState = modeState;
    this.levelRadius = levelRadius;

    // Set number of spokes based on level
    this.updateSpokeCount();
  }

  private updateSpokeCount(): void {
    // Adjust spoke count based on level
    this.numSpokes = Math.min(
      16,
      8 + Math.floor(this.gameState.currentLevel / 2)
    );
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

    // Determine movement style based on level type
    let angle;
    let movementStyle;

    // Get the current level type
    const levelType = this.getLevelType(this.gameState.currentLevel);

    // Determine if enemy follows spokes or level-specific path
    const followLevelPath = Math.random() > 0.6; // 40% chance of following level-specific path

    if (followLevelPath && levelType !== "circle") {
      // Level-specific path movement
      angle = Math.random() * Math.PI * 2;
      switch (levelType) {
        case "spiral":
          movementStyle = "spiral";
          break;
        case "star":
          movementStyle = "star";
          break;
        case "wave":
          movementStyle = "wave";
          break;
        case "pi":
          movementStyle = "pi";
          break;
        default:
          movementStyle = "spoke";
      }
    } else {
      // Default spoke-based movement
      const spokeIndex = Math.floor(Math.random() * this.numSpokes);
      angle = (spokeIndex / this.numSpokes) * Math.PI * 2;

      // Determine if this enemy will cross between spokes
      const willCross = Math.random() > 0.7; // 30% chance to cross between spokes
      movementStyle = willCross ? "spokeCrossing" : "spoke";
    }

    // Assign hitpoints and speed based on piDigit
    const { hitPoints, speedMultiplier } = Enemy.getBehavior(piDigit);

    // Randomize size slightly
    const size = 0.3 + piDigit / 20 + Math.random() * 0.1;

    // Create the enemy object
    const enemy = new Enemy(
      mesh,
      angle,
      0, // distanceFromCenter starts at 0
      this.modeState.enemySpeed * speedMultiplier,
      piDigit,
      size,
      hitPoints,
      movementStyle,
      this.scene,
      this.gameState,
      this.modeState
    );

    // Store spoke information for enemies on spokes
    if (movementStyle === "spoke" || movementStyle === "spokeCrossing") {
      enemy.spokeIndex = Math.floor((angle / (Math.PI * 2)) * this.numSpokes);
      enemy.spokeCrossingDirection = Math.random() > 0.5 ? 1 : -1; // clockwise or counterclockwise
      enemy.spokeCrossingSpeed = 0.01 + Math.random() * 0.03; // random speed for crossing
    }

    // Store level-specific path parameters
    if (["spiral", "wave", "pi", "star"].includes(movementStyle)) {
      enemy.pathParams = {
        startAngle: angle,
        spiralTightness: 0.1 + Math.random() * 0.2,
        waveAmplitude: 0.5 + Math.random() * 1.0,
        waveFrequency: 2 + Math.random() * 3,
        pathOffset: Math.random() * Math.PI * 2,
      };
    }

    this.scene.add(mesh);
    this.modeState.enemies.push(enemy);
  }

  // Get the level type based on level number
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

  update(delta: number): void {
    // Update number of spokes if level changed
    this.updateSpokeCount();

    // Move all enemies based on their movement style
    for (const enemy of this.modeState.enemies) {
      // Use the unified update method for all enemy types
      enemy.update(delta, this.levelRadius, this.numSpokes);
    }

    // Remove enemies that are past the level radius
    this.removeOffscreenEnemies();
  }

  removeOffscreenEnemies(): void {
    // Remove enemies that are past the level boundary
    for (let i = this.modeState.enemies.length - 1; i >= 0; i--) {
      const enemy = this.modeState.enemies[i];

      if (enemy.isOffscreen(this.levelRadius)) {
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
