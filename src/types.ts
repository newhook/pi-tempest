import * as THREE from "three";
import { Enemy } from "./enemy";

export interface GameState {
  score: number;
  playerSize: number;
  playerAngle: number;
  enemySpeed: number;
  enemies: Enemy[];
  bullets: Bullet[];
  currentLevel: number;
  isGameOver: boolean;
}

export interface Bullet {
  mesh: THREE.Mesh;
  direction: THREE.Vector2;
  speed: number;
}
