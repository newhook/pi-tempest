import * as THREE from 'three';
import { GameState } from './types';
import { SceneSetup, setupScene } from './scene';
import { createPlayer, setupPlayerControls, animatePlayer } from './player';
import { EnemyManager } from './enemies';
import { updateScore, showGameOver } from './ui';
import { createLevel } from './levels';

export class Game {
  // Game components
  private gameState: GameState;
  private sceneSetup: SceneSetup;
  private player: THREE.Group;
  private enemyManager: EnemyManager;
  private level: THREE.Group;
  private levelRadius: number = 10;
  
  // Game timing
  private lastEnemyTime: number = 0;
  private clock: THREE.Clock;
  
  constructor() {
    // Initialize game state
    this.gameState = {
      score: 0,
      playerSize: 0.5,
      playerAngle: 0,
      enemySpeed: 0.03,
      enemies: [],
      bullets: [],
      currentLevel: 1,
      isGameOver: false
    };
    
    // Set up clock for timing
    this.clock = new THREE.Clock();
    
    // Set up scene and add renderer to DOM
    this.sceneSetup = setupScene();
    document.body.appendChild(this.sceneSetup.renderer.domElement);
    
    // Create level
    this.level = createLevel(this.sceneSetup.scene, this.gameState.currentLevel, this.levelRadius);
    
    // Create player and set up controls
    this.player = createPlayer(this.sceneSetup.scene, this.gameState.playerSize, this.levelRadius);
    setupPlayerControls(this.player, this.gameState, this.levelRadius, () => this.shoot());
    
    // Create enemy manager
    this.enemyManager = new EnemyManager(this.sceneSetup.scene, this.gameState, this.levelRadius);
    
    // Handle window resize
    this.setupResizeHandler();
  }
  
  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      // Update camera
      this.sceneSetup.camera.aspect = window.innerWidth / window.innerHeight;
      this.sceneSetup.camera.updateProjectionMatrix();
      
      // Update renderer
      this.sceneSetup.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
  
  public start(): void {
    // Start the game loop
    this.gameLoop();
  }
  
  private shoot(): void {
    // Create a bullet
    const bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Position the bullet at the player's position
    const playerAngle = this.gameState.playerAngle;
    const bulletSpeed = 0.3;
    
    // Set initial bullet position at player's location
    bullet.position.x = Math.cos(playerAngle) * this.levelRadius;
    bullet.position.y = Math.sin(playerAngle) * this.levelRadius;
    
    // Calculate direction vector (pointing inward)
    const directionX = -Math.cos(playerAngle);
    const directionY = -Math.sin(playerAngle);
    
    this.sceneSetup.scene.add(bullet);
    this.gameState.bullets.push({
      mesh: bullet,
      direction: new THREE.Vector2(directionX, directionY),
      speed: bulletSpeed
    });
  }
  
  private gameLoop = (): void => {
    if (this.gameState.isGameOver) {
      return; // Stop animation loop if game is over
    }
    
    // Request next frame
    requestAnimationFrame(this.gameLoop);
    
    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();
    
    // Create new enemies periodically
    if (elapsedTime - this.lastEnemyTime > 1.5) {
      this.enemyManager.createEnemy();
      this.lastEnemyTime = elapsedTime;
    }
    
    // Update enemies
    this.enemyManager.update(delta);
    
    // Update bullets
    this.updateBullets(delta);
    
    // Check for enemy-bullet collisions
    this.checkBulletCollisions();
    
    // Check for player-enemy collisions
    if (this.enemyManager.checkPlayerCollision(this.player)) {
      this.gameOver();
      return;
    }
    
    // Animate player
    animatePlayer(this.player);
    
    // Update player position based on current angle
    const playerX = Math.cos(this.gameState.playerAngle) * this.levelRadius;
    const playerY = Math.sin(this.gameState.playerAngle) * this.levelRadius;
    this.player.position.set(playerX, playerY, 0);
    
    // Point player toward center
    this.player.lookAt(0, 0, 0);
    
    // Render the scene
    this.sceneSetup.renderer.render(this.sceneSetup.scene, this.sceneSetup.camera);
  }
  
  private updateBullets(delta: number): void {
    for (let i = this.gameState.bullets.length - 1; i >= 0; i--) {
      const bullet = this.gameState.bullets[i];
      
      // Move bullet
      bullet.mesh.position.x += bullet.direction.x * bullet.speed;
      bullet.mesh.position.y += bullet.direction.y * bullet.speed;
      
      // Remove bullets that are too close to center or out of bounds
      const distanceFromCenter = Math.sqrt(
        bullet.mesh.position.x * bullet.mesh.position.x + 
        bullet.mesh.position.y * bullet.mesh.position.y
      );
      
      if (distanceFromCenter < 1 || distanceFromCenter > this.levelRadius + 5) {
        this.sceneSetup.scene.remove(bullet.mesh);
        this.gameState.bullets.splice(i, 1);
      }
    }
  }
  
  private checkBulletCollisions(): void {
    // Check each bullet against each enemy
    for (let i = this.gameState.bullets.length - 1; i >= 0; i--) {
      const bullet = this.gameState.bullets[i];
      let hitDetected = false;
      
      for (let j = this.gameState.enemies.length - 1; j >= 0; j--) {
        const enemy = this.gameState.enemies[j];
        
        // Simple distance-based collision detection
        const dx = bullet.mesh.position.x - enemy.mesh.position.x;
        const dy = bullet.mesh.position.y - enemy.mesh.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < enemy.size + 0.2) {
          // Collision detected
          this.sceneSetup.scene.remove(enemy.mesh);
          this.gameState.enemies.splice(j, 1);
          
          // Calculate score based on enemy type (pi-based)
          const piMultiplier = 3.14 * this.gameState.currentLevel;
          const points = Math.floor(enemy.type * piMultiplier);
          this.gameState.score += points;
          
          updateScore(this.gameState);
          
          // Remove the bullet
          this.sceneSetup.scene.remove(bullet.mesh);
          this.gameState.bullets.splice(i, 1);
          hitDetected = true;
          
          // Increase difficulty every 100 points
          if (this.gameState.score % 100 === 0) {
            this.gameState.enemySpeed += 0.005;
          }
          
          // Level up every 314 points
          if (this.gameState.score % 314 === 0 && this.gameState.score > 0) {
            this.levelUp();
          }
          
          break;
        }
      }
      
      if (hitDetected) break;
    }
  }
  
  private levelUp(): void {
    // Increment level
    this.gameState.currentLevel++;
    
    // Remove old level
    this.sceneSetup.scene.remove(this.level);
    
    // Create new level
    this.level = createLevel(this.sceneSetup.scene, this.gameState.currentLevel, this.levelRadius);
  }
  
  private gameOver(): void {
    this.gameState.isGameOver = true;
    showGameOver(this.gameState);
  }
}