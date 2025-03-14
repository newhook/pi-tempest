import * as THREE from 'three';

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

export interface Enemy {
  mesh: THREE.Mesh;
  angle: number;
  distanceFromCenter: number;
  speed: number;
  type: number; // Based on PI digit
  size: number;
}

export interface Bullet {
  mesh: THREE.Mesh;
  direction: THREE.Vector2;
  speed: number;
}