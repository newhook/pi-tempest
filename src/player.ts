import * as THREE from 'three';
import { GameState } from './types';

export function createPlayer(
  scene: THREE.Scene, 
  size: number, 
  levelRadius: number
): THREE.Group {
  // Create a group to hold all player parts
  const playerGroup = new THREE.Group();
  
  // Create the player ship
  const playerGeometry = new THREE.ConeGeometry(size, size * 2, 8);
  const playerMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x00ff88,
    emissive: 0x00ff88,
    emissiveIntensity: 0.3
  });
  
  const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
  playerMesh.rotation.z = Math.PI / 2; // Rotate to point inward
  
  // Add a glow effect
  const glowGeometry = new THREE.SphereGeometry(size * 1.2, 16, 16);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffaa,
    transparent: true,
    opacity: 0.3
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  
  // Add both meshes to the group
  playerGroup.add(playerMesh);
  playerGroup.add(glow);
  
  // Position at the edge of circle at angle 0
  playerGroup.position.set(levelRadius, 0, 0);
  
  scene.add(playerGroup);
  return playerGroup;
}

export function setupPlayerControls(
  player: THREE.Group,
  gameState: GameState,
  levelRadius: number,
  shootCallback: () => void
): void {
  // Track key states
  const keys = {
    left: false,
    right: false
  };
  
  // Keyboard controls
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (!gameState.isGameOver) {
      switch(event.key) {
        case 'ArrowLeft':
        case 'a':
          keys.left = true;
          break;
        case 'ArrowRight':
        case 'd':
          keys.right = true;
          break;
        case ' ':
          shootCallback();
          break;
      }
    }
  });
  
  document.addEventListener('keyup', (event: KeyboardEvent) => {
    switch(event.key) {
      case 'ArrowLeft':
      case 'a':
        keys.left = false;
        break;
      case 'ArrowRight':
      case 'd':
        keys.right = false;
        break;
    }
  });
  
  // Mouse controls
  document.addEventListener('mousemove', (event: MouseEvent) => {
    if (!gameState.isGameOver) {
      // Calculate angle based on mouse position relative to center of screen
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      const mouseX = event.clientX - centerX;
      const mouseY = event.clientY - centerY;
      
      // Calculate angle with atan2
      gameState.playerAngle = Math.atan2(mouseY, mouseX);
    }
  });
  
  // Mouse click to shoot
  document.addEventListener('click', () => {
    if (!gameState.isGameOver) {
      shootCallback();
    }
  });
  
  // Touch controls for mobile
  document.addEventListener('touchmove', (event: TouchEvent) => {
    if (!gameState.isGameOver && event.touches.length > 0) {
      const touch = event.touches[0];
      
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      const touchX = touch.clientX - centerX;
      const touchY = touch.clientY - centerY;
      
      gameState.playerAngle = Math.atan2(touchY, touchX);
      event.preventDefault();
    }
  }, { passive: false });
  
  // Touch to shoot
  document.addEventListener('touchstart', () => {
    if (!gameState.isGameOver) {
      shootCallback();
    }
  });
  
  // Update player angle based on keys in animation loop
  setInterval(() => {
    if (!gameState.isGameOver) {
      const moveSpeed = 0.1;
      
      if (keys.left) {
        gameState.playerAngle -= moveSpeed;
      }
      if (keys.right) {
        gameState.playerAngle += moveSpeed;
      }
    }
  }, 16); // ~60fps
}

export function animatePlayer(player: THREE.Group): void {
  // Add subtle player effects
  player.children.forEach((child, index) => {
    if (index === 1) { // Glow effect
      child.scale.x = 1 + Math.sin(Date.now() * 0.005) * 0.1;
      child.scale.y = 1 + Math.sin(Date.now() * 0.005) * 0.1;
      child.scale.z = 1 + Math.sin(Date.now() * 0.005) * 0.1;
    }
  });
}