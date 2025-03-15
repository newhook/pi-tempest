import * as THREE from "three";

export interface SceneSetup {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
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

  // Create subtle circular grid in background
  createCircularGrid(scene);

  return { scene, camera, renderer };
}

function createStarryBackground(scene: THREE.Scene): void {
  // Create particles for regular stars
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

  // Create special shining stars
  const shiningStarCount = 25; // Number of special shining stars
  const shiningStars: THREE.Mesh[] = [];

  for (let i = 0; i < shiningStarCount; i++) {
    // Random position for shining star - position them further away
    const radius = 70 + Math.random() * 40; // Increased minimum radius to push stars further out
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    // Create a much smaller glowing sprite for the shining star
    const size = 0.15 + Math.random() * 0.25; // Significantly reduced size
    const starGeometry = new THREE.PlaneGeometry(size, size);

    // Random star color (white to blue-white to gold)
    const colorChoice = Math.random();
    let starColor;

    if (colorChoice < 0.6) {
      // Blue-white star
      starColor = new THREE.Color(0xaaccff);
    } else if (colorChoice < 0.9) {
      // Pure white star
      starColor = new THREE.Color(0xffffff);
    } else {
      // Gold star (rare)
      starColor = new THREE.Color(0xffdd99);
    }

    // Create material with glow
    const starMaterial = new THREE.MeshBasicMaterial({
      color: starColor,
      transparent: true,
      opacity: 0.8, // Slightly reduced opacity
      side: THREE.DoubleSide,
    });

    // Create the star mesh
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.position.set(x, y, z);

    // Make star always face camera
    star.lookAt(0, 0, 0);

    // Add unique properties for animation (more subtle animation)
    (star as any).pulseFactor = 0.3 + Math.random() * 0.7; // Reduced pulse intensity
    (star as any).pulseSpeed = 0.5 + Math.random() * 1.5; // Slower pulsing
    (star as any).initialOpacity = 0.6 + Math.random() * 0.3;
    (star as any).twinklePhase = Math.random() * Math.PI * 2;
    (star as any).initialSize = size;

    shiningStars.push(star);
    scene.add(star);
  }

  // Animate stars with subtle rotation
  function animateStars() {
    // Rotate regular star field
    stars.rotation.x += 0.0001;
    stars.rotation.y += 0.0002;

    // Animate shining stars
    const time = Date.now() * 0.001;

    shiningStars.forEach((star) => {
      // Get customization factors
      const pulseFactor = (star as any).pulseFactor;
      const pulseSpeed = (star as any).pulseSpeed;
      const initialOpacity = (star as any).initialOpacity;
      const twinklePhase = (star as any).twinklePhase;
      const initialSize = (star as any).initialSize;

      // Calculate shine effect (combination of sine waves for complexity)
      // Using subtler sine wave combination for more natural twinkling
      const shine =
        0.6 * Math.sin(time * pulseSpeed + twinklePhase) +
        0.2 * Math.sin(time * pulseSpeed * 1.7 + twinklePhase * 2.3) +
        0.2 * Math.cos(time * pulseSpeed * 0.6 + twinklePhase * 1.1);

      // Apply opacity effect - more subtle variation
      (star.material as THREE.MeshBasicMaterial).opacity =
        initialOpacity * (0.75 + 0.25 * (0.5 + 0.5 * shine));

      // Scale effect - reduced scale change
      const scale = 1 + 0.1 * Math.max(0, shine) * pulseFactor;
      star.scale.set(scale, scale, scale);

      // Color shift only for gold stars and with very subtle variation
      if (star.material.color.r > 0.9 && star.material.color.g > 0.8) {
        // For gold stars only, add very subtle color variation
        const hue = (0.14 + 0.01 * shine) % 1; // Minimal hue shift for gold stars
        const saturation = 0.6 + 0.1 * shine;
        const color = new THREE.Color();
        color.setHSL(hue, saturation, 0.8);
        (star.material as THREE.MeshBasicMaterial).color = color;
      }
    });

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
