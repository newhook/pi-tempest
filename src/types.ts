import * as THREE from "three";
import { Enemy } from "./enemy";

// Define possible game status values
export type GameStatus = "marquee" | "active" | "gameOver";

// Core game state shared across all modes
export interface GameState {
  // Shared state
  score: number;
  gameStatus: GameStatus;
  currentLevel: number;
}

// Active mode specific state
export interface ActiveModeState {
  playerSize: number;
  playerAngle: number;
  enemySpeed: number;
  enemies: Enemy[];
  bullets: Bullet[];
  enemyBullets: Bullet[]; // Bullets fired by enemies
  explosions: Explosion[]; // Track active explosions for collision detection
  ghostMode: boolean;
  spawnEnemies: boolean; // Toggle for enabling/disabling enemy spawning
  playerPosition?: { x: number; y: number }; // Added for enemy targeting
  forcedEnemyType?: number; // If set, spawn this specific enemy type
}

export interface Bullet {
  mesh: THREE.Mesh;
  direction: THREE.Vector2;
  speed: number;
  fromEnemy?: boolean; // Flag to identify enemy bullets
}

// Interface for enemy movement controllers
export interface MovementController {
  // Update enemy position based on current state
  update(delta: number): { x: number; y: number };

  // Optional rendering for special effects (e.g., extension lines)
  render?(scene: THREE.Scene): void;

  // Clean up any resources when the enemy is destroyed
  cleanup?(scene: THREE.Scene): void;
}

// Interface for explosions
export interface Explosion {
  id: string;
  position: THREE.Vector3;
  radius: number;
  maxRadius: number;
  startTime: number;
  duration: number;
}
