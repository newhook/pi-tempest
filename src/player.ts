import * as THREE from "three";
import { GameState } from "./types";

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
    emissiveIntensity: 0.3,
  });

  const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
  playerMesh.rotation.z = Math.PI / 2; // Rotate to point inward

  // Add a glow effect
  const glowGeometry = new THREE.SphereGeometry(size * 1.2, 16, 16);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffaa,
    transparent: true,
    opacity: 0.3,
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
    right: false,
  };

  // Keyboard controls
  document.addEventListener("keydown", (event: KeyboardEvent) => {
    if (!gameState.isGameOver) {
      switch (event.key) {
        case "ArrowLeft":
        case "a":
          keys.left = true;
          break;
        case "ArrowRight":
        case "d":
          keys.right = true;
          break;
        case " ":
          shootCallback();
          break;
      }
    }
  });

  document.addEventListener("keyup", (event: KeyboardEvent) => {
    switch (event.key) {
      case "ArrowLeft":
      case "a":
        keys.left = false;
        break;
      case "ArrowRight":
      case "d":
        keys.right = false;
        break;
    }
  });

  // Updated mouse controls - find closest point on level outline
  document.addEventListener("mousemove", (event: MouseEvent) => {
    if (!gameState.isGameOver) {
      // Calculate mouse position relative to center of screen
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      const mouseX = event.clientX - centerX;
      const mouseY = event.clientY - centerY;

      // Calculate angle to mouse position
      const mouseAngle = Math.atan2(mouseY, mouseX);

      // This angle directly corresponds to the closest point on a circular level
      gameState.playerAngle = mouseAngle;
    }
  });

  // Mouse click to shoot
  document.addEventListener("click", () => {
    if (!gameState.isGameOver) {
      shootCallback();
    }
  });

  // Updated touch controls for mobile - find closest point on level outline
  document.addEventListener(
    "touchmove",
    (event: TouchEvent) => {
      if (!gameState.isGameOver && event.touches.length > 0) {
        const touch = event.touches[0];

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const touchX = touch.clientX - centerX;
        const touchY = touch.clientY - centerY;

        // Calculate angle to touch position
        const touchAngle = Math.atan2(touchY, touchX);

        // Use this angle directly for circular levels
        gameState.playerAngle = touchAngle;

        event.preventDefault();
      }
    },
    { passive: false }
  );

  // Touch to shoot
  document.addEventListener("touchstart", () => {
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

// Function to update player position based on current angle and level shape
export function updatePlayerPosition(
  player: THREE.Group,
  gameState: GameState,
  levelRadius: number,
  levelType: string
): void {
  let x: number, y: number;

  // Calculate position based on level type
  switch (levelType) {
    case "circle":
      // For circle levels, simple polar coordinates work
      x = Math.cos(gameState.playerAngle) * levelRadius;
      y = Math.sin(gameState.playerAngle) * levelRadius;
      break;

    case "star":
      // For star levels, adjust radius based on angle
      const starPoints = 3 + (gameState.currentLevel % 5);
      const angleStep = Math.PI / starPoints;
      const normalizedAngle = gameState.playerAngle % (2 * Math.PI);
      const angleInSection = normalizedAngle % angleStep;
      const sectionProgress = angleInSection / angleStep;

      // Interpolate between inner and outer radius
      const innerRadius = levelRadius * 0.6;
      const outerRadius = levelRadius;
      const currentRadius =
        sectionProgress < 0.5
          ? outerRadius - sectionProgress * 2 * (outerRadius - innerRadius)
          : innerRadius +
            (sectionProgress - 0.5) * 2 * (outerRadius - innerRadius);

      x = Math.cos(gameState.playerAngle) * currentRadius;
      y = Math.sin(gameState.playerAngle) * currentRadius;
      break;

    case "spiral":
      // For spiral, we position on the outer ring
      x = Math.cos(gameState.playerAngle) * levelRadius;
      y = Math.sin(gameState.playerAngle) * levelRadius;
      break;

    case "pi":
      // For pi symbol, position on the outer circle
      x = Math.cos(gameState.playerAngle) * levelRadius;
      y = Math.sin(gameState.playerAngle) * levelRadius;
      break;

    case "wave":
      // For wave level, adjust radius based on sine wave
      const amplitude = levelRadius * 0.05;
      const waveRadius =
        levelRadius + Math.sin(gameState.playerAngle * 3.14) * amplitude;

      x = Math.cos(gameState.playerAngle) * waveRadius;
      y = Math.sin(gameState.playerAngle) * waveRadius;
      break;

    default:
      // Default to circle
      x = Math.cos(gameState.playerAngle) * levelRadius;
      y = Math.sin(gameState.playerAngle) * levelRadius;
      break;
  }

  // Update player position
  player.position.set(x, y, 0);

  // Update player rotation to face toward center
  player.rotation.z = gameState.playerAngle + Math.PI / 2;
}

export function animatePlayer(player: THREE.Group): void {
  // Add subtle player effects
  player.children.forEach((child, index) => {
    if (index === 1) {
      // Glow effect
      child.scale.x = 1 + Math.sin(Date.now() * 0.005) * 0.1;
      child.scale.y = 1 + Math.sin(Date.now() * 0.005) * 0.1;
      child.scale.z = 1 + Math.sin(Date.now() * 0.005) * 0.1;
    }
  });
}
