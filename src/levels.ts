import * as THREE from "three";

// Pi-inspired level designs
export function createLevel(
  scene: THREE.Scene,
  levelNumber: number,
  radius: number
): THREE.Group {
  const levelGroup = new THREE.Group();

  // Choose level type based on level number
  switch ((levelNumber - 1) % 5) {
    case 0:
      createCircleLevel(levelGroup, radius);
      break;
    case 1:
      createSpiralLevel(levelGroup, radius);
      break;
    case 2:
      createStarLevel(levelGroup, radius, 3 + (levelNumber % 5));
      break;
    case 3:
      createPiSymbolLevel(levelGroup, radius);
      break;
    case 4:
      createWaveLevel(levelGroup, radius);
      break;
  }

  // Add pi digits as background decoration
  function addPiDigits(group: THREE.Group, radius: number): void {
    const PI_DIGITS = "3.14159265358979323846";

    // Note: We're using simple geometry for the digits instead of FontLoader
    // since FontLoader is in Three.js examples and not in the core module

    // Create using regular geometry as fallback (since we can't load fonts dynamically)
    for (let i = 0; i < PI_DIGITS.length; i++) {
      const digit = PI_DIGITS[i];

      // Skip the decimal point for placement
      if (digit === ".") continue;

      // Calculate position in a spiral pattern
      const angle = (i / PI_DIGITS.length) * Math.PI * 4; // 2 full rotations
      const distance = radius * 0.3 + i * radius * 0.02;

      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      // Create a simple cube for each digit
      const digitGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.1);
      const digitMaterial = new THREE.MeshBasicMaterial({
        color: 0xaaaaff,
        transparent: true,
        opacity: 0.4,
      });

      const digitMesh = new THREE.Mesh(digitGeometry, digitMaterial);
      digitMesh.position.set(x, y, -0.5); // Place behind the level

      group.add(digitMesh);
    }
  }

  // Add Pi digits as background decoration
  addPiDigits(levelGroup, radius);

  scene.add(levelGroup);
  return levelGroup;
}

// Create a basic circular level
function createCircleLevel(group: THREE.Group, radius: number): void {
  // Main circle
  const circleGeometry = new THREE.RingGeometry(radius - 0.1, radius, 64);
  const circleMaterial = new THREE.MeshBasicMaterial({
    color: 0x3399ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7,
  });
  const circleRing = new THREE.Mesh(circleGeometry, circleMaterial);
  group.add(circleRing);

  // Add "spokes" radiating from center
  const spokeCount = 16;
  const spokeGeometry = new THREE.BufferGeometry();

  const positions = [];
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI * 2;
    positions.push(0, 0, 0);
    positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
  }

  spokeGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );

  const spokeMaterial = new THREE.LineBasicMaterial({
    color: 0x66ccff,
    transparent: true,
    opacity: 0.5,
  });
  const spokes = new THREE.LineSegments(spokeGeometry, spokeMaterial);

  group.add(spokes);
}

// Create a spiral level inspired by Pi
function createSpiralLevel(group: THREE.Group, radius: number): void {
  const spiralGeometry = new THREE.BufferGeometry();
  const points = [];

  // Generate spiral points
  const turns = 3; // 3 for pi
  const pointsPerTurn = 50;
  const totalPoints = turns * pointsPerTurn;

  for (let i = 0; i < totalPoints; i++) {
    const t = i / totalPoints;
    const angle = turns * Math.PI * 2 * t;
    const distance = t * radius;

    points.push(Math.cos(angle) * distance, Math.sin(angle) * distance, 0);
  }

  spiralGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(points, 3)
  );

  const spiralMaterial = new THREE.LineBasicMaterial({
    color: 0x00ffcc,
    linewidth: 2,
  });
  const spiral = new THREE.Line(spiralGeometry, spiralMaterial);

  group.add(spiral);

  // Add outer ring
  const outerRing = new THREE.RingGeometry(radius - 0.1, radius, 64);
  const outerMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffcc,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7,
  });
  const ring = new THREE.Mesh(outerRing, outerMaterial);
  group.add(ring);
}

// Create a star-shaped level
function createStarLevel(
  group: THREE.Group,
  radius: number,
  points: number
): void {
  // Create a star shape
  const starGeometry = new THREE.BufferGeometry();
  const vertices = [];

  for (let i = 0; i < points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? radius : radius * 0.6;

    vertices.push(Math.cos(angle) * r, Math.sin(angle) * r, 0);
  }

  // Close the shape
  vertices.push(vertices[0], vertices[1], vertices[2]);

  starGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );

  const starMaterial = new THREE.LineBasicMaterial({
    color: 0xff66aa,
    linewidth: 2,
  });
  const star = new THREE.Line(starGeometry, starMaterial);

  group.add(star);

  // Add filled background with slightly different color
  const starShape = new THREE.Shape();
  starShape.moveTo(vertices[0], vertices[1]);

  for (let i = 3; i < vertices.length; i += 3) {
    starShape.lineTo(vertices[i], vertices[i + 1]);
  }

  const filledGeometry = new THREE.ShapeGeometry(starShape);
  const filledMaterial = new THREE.MeshBasicMaterial({
    color: 0xff99cc,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  });
  const filledStar = new THREE.Mesh(filledGeometry, filledMaterial);

  group.add(filledStar);
}

// Create a level shaped like the Pi symbol
function createPiSymbolLevel(group: THREE.Group, radius: number): void {
  // Create outer circle
  const circleGeometry = new THREE.RingGeometry(radius - 0.1, radius, 64);
  const circleMaterial = new THREE.MeshBasicMaterial({
    color: 0xffaa33,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7,
  });
  const circleRing = new THREE.Mesh(circleGeometry, circleMaterial);
  group.add(circleRing);

  // Create Pi symbol in center
  const piGeometry = new THREE.BufferGeometry();
  const scale = radius * 0.5;

  // Pi symbol vertices (simplified)
  const piVertices = [
    // Top horizontal line
    -0.6 * scale,
    0.5 * scale,
    0,
    0.6 * scale,
    0.5 * scale,
    0,

    // Left vertical line
    -0.4 * scale,
    0.5 * scale,
    0,
    -0.4 * scale,
    -0.5 * scale,
    0,

    // Right vertical line
    0.4 * scale,
    0.5 * scale,
    0,
    0.4 * scale,
    -0.3 * scale,
    0,
  ];

  piGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(piVertices, 3)
  );

  const piMaterial = new THREE.LineBasicMaterial({
    color: 0xffcc66,
    linewidth: 3,
  });
  const piSymbol = new THREE.LineSegments(piGeometry, piMaterial);

  group.add(piSymbol);
}

// Create a wave/sine level based on pi
function createWaveLevel(group: THREE.Group, radius: number): void {
  // Outer ring
  const ringGeometry = new THREE.RingGeometry(radius - 0.1, radius, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x66ff99,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  group.add(ring);

  // Create sine wave rings
  for (let r = radius * 0.2; r < radius; r += radius * 0.2) {
    const waveGeometry = new THREE.BufferGeometry();
    const points = [];

    const segments = 64;
    const amplitude = radius * 0.05; // Small wave amplitude

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const radiusAtPoint = r + Math.sin(angle * 3.14) * amplitude; // Use 3.14 (pi) for wave frequency

      points.push(
        Math.cos(angle) * radiusAtPoint,
        Math.sin(angle) * radiusAtPoint,
        0
      );
    }

    waveGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points, 3)
    );

    const waveMaterial = new THREE.LineBasicMaterial({
      color: 0x33ff88,
      transparent: true,
      opacity: 0.7 - (r / radius) * 0.5, // Fade opacity for inner circles
    });
    const wave = new THREE.Line(waveGeometry, waveMaterial);

    group.add(wave);
  }
}
