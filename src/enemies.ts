import * as THREE from "three";
import { GameState, ActiveModeState } from "./types";
import { Enemy } from "./enemy";
import { Level } from "./levels";

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

    // Select a random enemy type from the available range
    // const enemyType = Math.floor(Math.random() * (maxEnemyType + 1));
    let enemyType = 3;

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

    // Determine movement style based on enemy type and level type
    let angle;
    let movementStyle;

    // Get the current level type
    const levelType = this.getLevelType(this.gameState.currentLevel);

    // Generate a random angle for initial positioning
    // Add random offset to ensure enemies don't all follow the same path
    angle = Math.random() * Math.PI * 2;

    // Assign movement style based on enemy type
    switch (enemyType) {
      case 0: // Type 0: Always follows spokes
        // Always use spoke movement regardless of level type
        movementStyle = "spoke";
        break;

      case 1: // Type 1: Always follows spokes but can cross between them
        // Always use spoke crossing regardless of level type
        movementStyle = "spokeCrossing";
        break;

      case 2: // Type 2: Follows patterns but moves faster (speed is handled later)
        // Same as type 0 but with speed multiplier (applied below)
        if (levelType === "circle") {
          movementStyle = "spoke";
        } else {
          movementStyle = levelType;
        }
        break;

      case 3: // Type 3: Zigzag movement
        movementStyle = "zigzag";
        break;

      case 4: // Type 4: Circular orbit movement
        movementStyle = "circular";
        break;

      case 5: // Type 5: Bouncing movement
        movementStyle = "bounce";
        break;

      case 6: // Type 6: Erratic movement
        movementStyle = "erratic";
        break;

      case 7: // Type 7: Homing movement (tries to follow player)
        movementStyle = "homing";
        break;

      case 8: // Type 8: Follows Pi symbol on Pi level (4) and level 5, otherwise uses spokes
        // Force Pi movement if on pi level or level 5 (wave level)
        if (levelType === "pi") {
          movementStyle = "pi";
        } else {
          // Default to spoke movement on other levels
          movementStyle = "spoke";
        }
        break;

      case 9: // Type 9: Only on Pi level and follows Pi symbol, otherwise uses spokes
        // Force Pi movement if on pi level
        if (levelType === "pi") {
          movementStyle = "pi";
        } else {
          // Default to spoke movement on non-pi levels
          movementStyle = "spoke";
        }
        break;

      default:
        // Default to spoke movement
        movementStyle = "spoke";
    }
    console.log("levelType", levelType);
    console.log("enemyType", enemyType);
    console.log("movementStyle", movementStyle);

    const numSpokes = level.getSpokeCount();

    // If using spoke movement, calculate spoke-specific angle
    if (movementStyle === "spoke" || movementStyle === "spokeCrossing") {
      const spokeIndex = Math.floor(Math.random() * numSpokes);
      angle = (spokeIndex / numSpokes) * Math.PI * 2;
    }

    // Assign hitpoints and speed based on enemy type
    const { hitPoints, speedMultiplier } = Enemy.getBehavior(enemyType);

    // Randomize size slightly
    const size = 0.3 + enemyType / 20 + Math.random() * 0.1;

    // Handle special cases for the "follow" and "cross" behaviors
    if (movementStyle === "follow") {
      // Transform "follow" into actual movement style based on level type
      if (levelType === "circle" || enemyType === 0) {
        movementStyle = "spoke";
      } else {
        movementStyle = levelType;
      }
    } else if (movementStyle === "cross") {
      // Transform "cross" into crossing movement style based on level type
      if (levelType === "circle" || enemyType === 1) {
        movementStyle = "spokeCrossing";
      } else {
        movementStyle = levelType + "Crossing";
      }
    }

    // Create the enemy object
    const enemy = new Enemy(
      level,
      mesh,
      angle,
      0, // distanceFromCenter starts at 0
      this.modeState.enemySpeed * speedMultiplier,
      enemyType,
      size,
      hitPoints,
      movementStyle,
      this.scene,
      this.gameState,
      this.modeState
    );

    // Store spoke information for enemies on spokes
    if (movementStyle === "spoke" || movementStyle === "spokeCrossing") {
      enemy.spokeIndex = Math.floor((angle / (Math.PI * 2)) * numSpokes);
      enemy.spokeCrossingDirection = Math.random() > 0.5 ? 1 : -1; // clockwise or counterclockwise
      enemy.spokeCrossingSpeed = 0.01 + Math.random() * 0.03; // random speed for crossing
    }

    // Always ensure path params are initialized for pi movement
    if (movementStyle === "pi") {
      enemy.pathParams = {
        startAngle: angle,
        spiralTightness: 0.1,
        waveAmplitude: 0.7,
        waveFrequency: 3.0,
        pathOffset: Math.random() * Math.PI * 2,
      };
    } else {
      // Store level-specific path parameters
      if (
        [
          "spiral",
          "wave",
          "pi",
          "star",
          "spiralCrossing",
          "waveCrossing",
          "piCrossing",
          "starCrossing",
          "bounce",
          "erratic",
          "homing",
          "zigzag", // Explicitly add zigzag to ensure it gets proper path parameters
        ].includes(movementStyle)
      ) {
        // Generate more randomized path parameters to ensure variety
        enemy.pathParams = {
          startAngle: angle,
          spiralTightness: 0.1 + Math.random() * 0.3,
          waveAmplitude: 0.5 + Math.random() * 1.2,
          waveFrequency: 2 + Math.random() * 4,
          pathOffset: Math.random() * Math.PI * 2,
        };
      }
    }

    this.scene.add(mesh);
    this.modeState.enemies.push(enemy);
  }

  // Get the level type based on level number
  private getLevelType(levelNumber: number): string {
    switch ((levelNumber - 1) % 5) {
      case 0:
        return "circle"; // Level 1, 6, 11, etc.
      case 1:
        return "spiral"; // Level 2, 7, 12, etc.
      case 2:
        return "star"; // Level 3, 8, 13, etc.
      case 3:
        return "wave"; // Level 4, 9, 14, etc.
      case 4:
        return "pi"; // Level 5, 10, 15, etc.
      default:
        return "circle";
    }
  }

  update(delta: number): void {
    // Move all enemies based on their movement style
    for (const enemy of this.modeState.enemies) {
      // Use the unified update method for all enemy types
      enemy.update(delta);
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
