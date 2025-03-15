import * as THREE from "three";
import { createBloodMoon } from "./bloodMoon";

export interface SceneSetup {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  fadeOutBloodMoon: () => void;
}

export function setupScene(): SceneSetup {
  // Create scene
  const scene = new THREE.Scene();

  // Set up camera
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 20;

  // Create renderer with post-processing
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 1);

  // Add ambient lighting
  const ambientLight = new THREE.AmbientLight(0x222244, 0.5);
  scene.add(ambientLight);

  // Add point light at center
  const pointLight = new THREE.PointLight(0x3377ff, 1, 50);
  pointLight.position.set(0, 0, 5);
  scene.add(pointLight);

  // Create starry background
  createStarryBackground(scene);

  // Create stylized blood moon with fade-out capability
  const fadeOutBloodMoon = createBloodMoon(scene);

  // Create subtle circular grid in background
  createCircularGrid(scene);

  return { scene, camera, renderer, fadeOutBloodMoon };
}

function createStarryBackground(scene: THREE.Scene): void {
  // Create particles for stars
  const starCount = 300;
  const starsGeometry = new THREE.BufferGeometry();
  const starPositions = [];
  const starColors = [];

  for (let i = 0; i < starCount; i++) {
    // Position stars in a sphere around the scene
    const radius = 50 + Math.random() * 50;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    starPositions.push(x, y, z);

    // Add color variation to stars (blue/purple theme)
    const color = new THREE.Color();
    const hue = 0.6 + Math.random() * 0.2; // Blue to purple
    const saturation = 0.5 + Math.random() * 0.5;
    const lightness = 0.7 + Math.random() * 0.3;

    color.setHSL(hue, saturation, lightness);
    starColors.push(color.r, color.g, color.b);
  }

  starsGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(starPositions, 3)
  );
  starsGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(starColors, 3)
  );

  const starsMaterial = new THREE.PointsMaterial({
    size: 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
  });

  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);

  // Animate stars with subtle rotation
  function animateStars() {
    stars.rotation.x += 0.0001;
    stars.rotation.y += 0.0002;

    requestAnimationFrame(animateStars);
  }

  animateStars();
}

function createCircularGrid(scene: THREE.Scene): void {
  // Create a series of concentric rings for grid effect
  const gridGroup = new THREE.Group();

  // Grid parameters
  const maxRadius = 30;
  const ringCount = 8;

  for (let i = 1; i <= ringCount; i++) {
    const radius = maxRadius * (i / ringCount);
    const segments = 64;

    const ringGeometry = new THREE.RingGeometry(
      radius - 0.05,
      radius,
      segments
    );
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x3355aa,
      transparent: true,
      opacity: 0.1 + (i / ringCount) * 0.05, // Fade in as rings get larger
      side: THREE.DoubleSide,
    });

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2; // Lay flat on x-z plane
    ring.position.z = -5; // Behind the gameplay

    gridGroup.add(ring);
  }

  // Add radial lines for grid effect
  const lineCount = 16;
  const lineLength = maxRadius;

  for (let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * Math.PI * 2;
    const lineGeometry = new THREE.BufferGeometry();

    const vertices = [
      0,
      0,
      -5, // Start at center
      Math.cos(angle) * lineLength,
      Math.sin(angle) * lineLength,
      -5, // End at edge
    ];

    lineGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x3355aa,
      transparent: true,
      opacity: 0.15,
    });

    const line = new THREE.Line(lineGeometry, lineMaterial);
    gridGroup.add(line);
  }

  scene.add(gridGroup);

  // Animate grid with subtle rotation
  function animateGrid() {
    gridGroup.rotation.z += 0.0005;

    requestAnimationFrame(animateGrid);
  }

  animateGrid();
}