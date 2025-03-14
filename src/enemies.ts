import * as THREE from 'three';
import { GameState, Enemy } from './types';

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
    const enemyGeometry = this.getEnemyGeometry(piDigit);
    
    // Color based on digit value (range of blues and purples)
    const hue = 0.6 + (piDigit / 30); // blues to purples
    const color = new THREE.Color().setHSL(hue, 1, 0.5);
    
    // Create material with emissive glow
    const enemyMaterial = new THREE.MeshStandardMaterial({ 
      color: color,
      emissive: color,
      emissiveIntensity: 0.5,
      flatShading: true
    });
    
    const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
    
    // Position enemy at center initially
    enemy.position.set(0, 0, 0);
    
    // Random angle for the enemy path
    const angle = Math.random() * Math.PI * 2;
    
    // Random speed variation based on PI digit (faster for higher digits)
    const speedMultiplier = 0.8 + (piDigit / 10);
    
    // Create the enemy object
    const enemyObj: Enemy = {
      mesh: enemy,
      angle: angle,
      distanceFromCenter: 0,
      speed: this.gameState.enemySpeed * speedMultiplier,
      type: piDigit,
      size: 0.3 + (piDigit / 20) // Size varies slightly by digit
    };
    
    this.scene.add(enemy);
    this.gameState.enemies.push(enemyObj);
  }
  
  private getEnemyGeometry(piDigit: number): THREE.BufferGeometry {
    // Different geometries based on PI digit
    switch(piDigit) {
      case 1:
        return new THREE.TetrahedronGeometry(0.4);
      case 2:
        return new THREE.OctahedronGeometry(0.4);
      case 3:
        return new THREE.DodecahedronGeometry(0.4);
      case 4:
        return new THREE.IcosahedronGeometry(0.4);
      case 5:
        return new THREE.TorusGeometry(0.3, 0.1, 8, 8);
      case 6:
        return new THREE.ConeGeometry(0.4, 0.8, 6);
      case 7:
        return new THREE.CylinderGeometry(0, 0.4, 0.8, 7);
      case 8:
        return new THREE.BoxGeometry(0.5, 0.5, 0.5);
      case 9:
        return new THREE.RingGeometry(0.2, 0.4, 9);
      default:
        return new THREE.SphereGeometry(0.4, 8, 8);
    }
  }
  
  update(delta: number): void {
    // Move all enemies outward along their angles
    for (const enemy of this.gameState.enemies) {
      // Increment distance from center
      enemy.distanceFromCenter += enemy.speed * delta * 30;
      
      // Calculate new position
      const x = Math.cos(enemy.angle) * enemy.distanceFromCenter;
      const y = Math.sin(enemy.angle) * enemy.distanceFromCenter;
      
      // Apply position
      enemy.mesh.position.set(x, y, 0);
      
      // Rotate enemy for visual effect
      enemy.mesh.rotation.x += delta * 2;
      enemy.mesh.rotation.y += delta * 2;
      
      // Scale enemy as it moves outward for better visibility
      const scale = 0.5 + enemy.distanceFromCenter / (this.levelRadius * 2);
      enemy.mesh.scale.set(scale, scale, scale);
    }
    
    // Remove enemies that are past the level radius
    this.removeOffscreenEnemies();
  }
  
  removeOffscreenEnemies(): void {
    // Remove enemies that are past the level boundary
    for (let i = this.gameState.enemies.length - 1; i >= 0; i--) {
      const enemy = this.gameState.enemies[i];
      
      if (enemy.distanceFromCenter > this.levelRadius + 2) {
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
      const enemyPos = enemy.mesh.position;
      
      // Calculate distance between player and enemy
      const dx = playerPos.x - enemyPos.x;
      const dy = playerPos.y - enemyPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check collision
      if (distance < playerRadius + enemy.size) {
        return true; // Collision detected
      }
    }
    
    return false; // No collision
  }
}