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
  ghostMode: boolean;
  playerPosition?: { x: number; y: number }; // Added for enemy targeting
}

export interface Bullet {
  mesh: THREE.Mesh;
  direction: THREE.Vector2;
  speed: number;
  fromEnemy?: boolean; // Flag to identify enemy bullets
}
