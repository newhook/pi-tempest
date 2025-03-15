import * as THREE from "three";
import { Enemy } from "./enemy";

// Define possible game status values
export type GameStatus = "marquee" | "active" | "gameOver";

export interface GameState {
  score: number;
  playerSize: number;
  playerAngle: number;
  enemySpeed: number;
  enemies: Enemy[];
  bullets: Bullet[];
  currentLevel: number;
  isGameOver: boolean;
  ghostMode: boolean;
  gameStatus: GameStatus;
}

export interface Bullet {
  mesh: THREE.Mesh;
  direction: THREE.Vector2;
  speed: number;
}
