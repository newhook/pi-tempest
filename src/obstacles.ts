import * as THREE from 'three';
import { GameState } from './types';

export class ObstacleManager {
  private scene: THREE.Scene;
  private gameState: GameState;
  
  constructor(scene: THREE.Scene, gameState: GameState) {
    this.scene = scene;
    this.gameState = gameState;
  }
  
  createObstacle(): void {
    const width = Math.random() * 10 + 5;
    const obstacleGeometry = new THREE.BoxGeometry(width, 1, 1);
    const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
    
    // Position the obstacle at the top with random x position
    obstacle.position.y = 10;
    obstacle.position.x = Math.random() * 20 - 10;
    
    this.scene.add(obstacle);
    this.gameState.obstacles.push(obstacle);
  }
  
  update(): void {
    // Move all obstacles downward
    for (const obstacle of this.gameState.obstacles) {
      obstacle.position.y -= this.gameState.obstacleSpeed;
    }
  }
  
  removeOffscreenObstacles(): number {
    let count = 0;
    
    // Remove obstacles that are off-screen
    for (let i = this.gameState.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.gameState.obstacles[i];
      
      if (obstacle.position.y < -10) {
        this.scene.remove(obstacle);
        this.gameState.obstacles.splice(i, 1);
        count++;
      }
    }
    
    return count; // Return how many were removed
  }
  
  checkCollision(player: THREE.Mesh): boolean {
    const playerBox = new THREE.Box3().setFromObject(player);
    
    for (const obstacle of this.gameState.obstacles) {
      const obstacleBox = new THREE.Box3().setFromObject(obstacle);
      
      if (playerBox.intersectsBox(obstacleBox)) {
        return true; // Collision detected
      }
    }
    
    return false; // No collision
  }
}