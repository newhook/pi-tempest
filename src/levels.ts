import * as THREE from "three";
import { Enemy } from "./enemy";

export enum LevelType {
  Circle = 0,
  Spiral = 1,
  Star = 2,
  Wave = 3,
  PiSymbol = 4,
}

export interface SpokePosition {
  angle: number; // Angle of the spoke in radians
  outerX: number; // X coordinate at outer end of spoke
  outerY: number; // Y coordinate at outer end of spoke
  innerX: number; // X coordinate at inner end of spoke (usually 0)
  innerY: number; // Y coordinate at inner end of spoke (usually 0)
}

export class Level {
  public group: THREE.Group;
  public radius: number;
  public levelNumber: number;
  public levelType: LevelType;
  public spokeCount!: number;
  public spokePositions: SpokePosition[] = [];

  constructor(levelNumber: number, radius: number) {
    this.group = new THREE.Group();
    this.radius = radius;
    this.levelNumber = levelNumber;
    this.levelType = ((levelNumber - 1) % 5) as LevelType;

    switch (this.levelType) {
      case LevelType.Circle:
        this.createCircleLevel();
        break;
      case LevelType.Spiral:
        this.createSpiralLevel();
        break;
      case LevelType.Star:
        this.createStarLevel(3 + (this.levelNumber % 5));
        break;
      case LevelType.Wave:
        this.createWaveLevel();
        break;
      case LevelType.PiSymbol:
        this.createPiSymbolLevel();
        break;
    }

    // Add Pi digits as background decoration
    this.addPiDigits();
  }

  // Rotate the level by the given angle (in radians)
  public rotateLevel(angle: number): void {
    // Rotate the entire level group
    this.group.rotation.z += angle;

    // Update all spoke positions
    for (let i = 0; i < this.spokePositions.length; i++) {
      const spoke = this.spokePositions[i];

      // Update the spoke angle
      spoke.angle += angle;

      // Calculate new outer coordinates based on the rotated angle
      spoke.outerX = Math.cos(spoke.angle) * this.radius;
      spoke.outerY = Math.sin(spoke.angle) * this.radius;

      // Inner coordinates remain at 0,0 for center-radiating spokes
    }
  }

  // Add pi digits as background decoration
  private addPiDigits(): void {
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
      const distance = this.radius * 0.3 + i * this.radius * 0.02;

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

      this.group.add(digitMesh);
    }
  }

  // Helper method to get level's THREE.Group object
  public getGroup(): THREE.Group {
    return this.group;
  }

  // Helper method to get the number of spokes in the level
  public getSpokeCount(): number {
    return this.spokeCount;
  }

  // Helper method to get the radius of the level
  public getRadius(): number {
    return this.radius;
  }

  // Helper method to get the spoke positions
  public getSpokePositions(): SpokePosition[] {
    return this.spokePositions;
  }

  // Helper method to get the Pi symbol vertices
  public getPiSymbolVertices(scale: number = this.radius * 0.5): number[] {
    // Define the base vertices of the Pi symbol
    const baseVertices = [
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

    // Apply the current rotation of the level to the vertices
    const rotationZ = this.group.rotation.z;
    const rotatedVertices = [...baseVertices]; // Copy the base vertices

    // Apply rotation to each vertex (they are stored as x,y,z triplets)
    for (let i = 0; i < rotatedVertices.length; i += 3) {
      const x = rotatedVertices[i];
      const y = rotatedVertices[i + 1];

      // Apply rotation transform
      rotatedVertices[i] = x * Math.cos(rotationZ) - y * Math.sin(rotationZ);
      rotatedVertices[i + 1] =
        x * Math.sin(rotationZ) + y * Math.cos(rotationZ);
    }

    return rotatedVertices;
  }

  public collidesWithEnemy(enemy: Enemy): boolean {
    // Get enemy position and size
    const enemyPos = enemy.mesh.position;
    const enemyDistanceFromCenter = Math.sqrt(
      enemyPos.x * enemyPos.x + enemyPos.y * enemyPos.y
    );

    // Include the enemy's size in the collision check
    // This ensures we detect collision when the enemy's edge touches the level boundary
    const effectiveDistance = enemyDistanceFromCenter + enemy.size;

    // Check if enemy has reached or passed the outer boundary of the level
    switch (this.levelType) {
      case LevelType.Star:
        // For star levels, collision depends on the angle (star points extend further than inward sections)
        // Get normalized angle between 0 and 2π
        let angle = Math.atan2(enemyPos.y, enemyPos.x);
        if (angle < 0) angle += Math.PI * 2;

        const starPoints = 3 + (this.levelNumber % 5);
        const totalVertices = starPoints * 2; // Total vertices (inner + outer points)
        const anglePerVertex = (Math.PI * 2) / totalVertices;

        // Determine which segment of the star we're in
        const vertexIndex = Math.floor(angle / anglePerVertex);

        // Calculate progress within the current segment (0 to 1)
        const segmentProgress = (angle % anglePerVertex) / anglePerVertex;

        // Get the radii of the current and next vertex
        const currentIsOuter = vertexIndex % 2 === 0;
        const currentRadius = currentIsOuter ? this.radius : this.radius * 0.6;
        const nextRadius = currentIsOuter ? this.radius * 0.6 : this.radius;

        // Interpolate radius based on progress within the segment
        const radiusAtAngle =
          currentRadius + (nextRadius - currentRadius) * segmentProgress;

        return effectiveDistance >= radiusAtAngle;

      case LevelType.Wave:
        // For wave levels, boundary has a sine wave pattern
        const waveAngle = Math.atan2(enemyPos.y, enemyPos.x);
        const amplitude = this.radius * 0.05; // Same amplitude as in createWaveLevel
        const waveRadius = this.radius + Math.sin(waveAngle * 3.14) * amplitude;

        return effectiveDistance >= waveRadius;

      case LevelType.PiSymbol:
      case LevelType.Circle:
      case LevelType.Spiral:
      default:
        // For regular circular levels, a simple radius check is sufficient
        return effectiveDistance >= this.radius;
    }
  }

  // Create a basic circular level
  private createCircleLevel(): void {
    // Main circle
    const circleGeometry = new THREE.RingGeometry(
      this.radius - 0.1,
      this.radius,
      64
    );
    const circleMaterial = new THREE.MeshBasicMaterial({
      color: 0x3399ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const circleRing = new THREE.Mesh(circleGeometry, circleMaterial);
    this.group.add(circleRing);

    // Add "spokes" radiating from center
    this.spokeCount = 16;
    const spokeGeometry = new THREE.BufferGeometry();

    // Clear any existing spoke positions
    this.spokePositions = [];

    const positions = [];
    for (let i = 0; i < this.spokeCount; i++) {
      const angle = (i / this.spokeCount) * Math.PI * 2;
      const outerX = Math.cos(angle) * this.radius;
      const outerY = Math.sin(angle) * this.radius;

      // Store spoke positions for enemy controllers
      this.spokePositions.push({
        angle: angle,
        outerX: outerX,
        outerY: outerY,
        innerX: 0,
        innerY: 0,
      });

      // Add to positions for rendering
      positions.push(0, 0, 0);
      positions.push(outerX, outerY, 0);
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

    this.group.add(spokes);
  }

  // Create a spiral level inspired by Pi
  private createSpiralLevel(): void {
    const spiralGeometry = new THREE.BufferGeometry();
    const points = [];

    // Generate spiral points
    const turns = 3; // 3 for pi
    const pointsPerTurn = 50;
    const totalPoints = turns * pointsPerTurn;

    for (let i = 0; i < totalPoints; i++) {
      const t = i / totalPoints;
      const angle = turns * Math.PI * 2 * t;
      const distance = t * this.radius;

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

    this.group.add(spiral);

    // Add outer ring
    const outerRing = new THREE.RingGeometry(
      this.radius - 0.1,
      this.radius,
      64
    );
    const outerMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const ring = new THREE.Mesh(outerRing, outerMaterial);
    this.group.add(ring);

    // Add spokes radiating from center
    this.spokeCount = 20;
    const spokeGeometry = new THREE.BufferGeometry();

    // Clear any existing spoke positions
    this.spokePositions = [];

    const positions = [];
    for (let i = 0; i < this.spokeCount; i++) {
      const angle = (i / this.spokeCount) * Math.PI * 2;
      const outerX = Math.cos(angle) * this.radius;
      const outerY = Math.sin(angle) * this.radius;

      // Store spoke positions for enemy controllers
      this.spokePositions.push({
        angle: angle,
        outerX: outerX,
        outerY: outerY,
        innerX: 0,
        innerY: 0,
      });

      positions.push(0, 0, 0);
      positions.push(outerX, outerY, 0);
    }

    spokeGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );

    const spokeMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.4,
    });
    const spokes = new THREE.LineSegments(spokeGeometry, spokeMaterial);

    this.group.add(spokes);
  }

  // Create a star-shaped level
  private createStarLevel(points: number): void {
    // Create a star shape
    const starGeometry = new THREE.BufferGeometry();
    const vertices = [];

    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? this.radius : this.radius * 0.6;

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

    this.group.add(star);

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

    this.group.add(filledStar);

    // Set spoke count to match star points and add spokes
    this.spokeCount = points;
    const spokeGeometry = new THREE.BufferGeometry();
    const spokeVertices = [];

    // Clear any existing spoke positions
    this.spokePositions = [];

    // Add spokes to the points of the star
    for (let i = 0; i < points * 2; i += 2) {
      // Only to the outer points
      const angle = (i / (points * 2)) * Math.PI * 2;
      const outerX = Math.cos(angle) * this.radius;
      const outerY = Math.sin(angle) * this.radius;

      // Store spoke positions for enemy controllers
      this.spokePositions.push({
        angle: angle,
        outerX: outerX,
        outerY: outerY,
        innerX: 0,
        innerY: 0,
      });

      spokeVertices.push(0, 0, 0); // Center
      spokeVertices.push(outerX, outerY, 0); // Outer point
    }

    spokeGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(spokeVertices, 3)
    );

    const spokeMaterial = new THREE.LineBasicMaterial({
      color: 0xff66aa,
      transparent: true,
      opacity: 0.5,
    });
    const spokes = new THREE.LineSegments(spokeGeometry, spokeMaterial);

    this.group.add(spokes);
  }

  // Create a level shaped like the Pi symbol
  private createPiSymbolLevel(): void {
    // Create outer circle
    const circleGeometry = new THREE.RingGeometry(
      this.radius - 0.1,
      this.radius,
      64
    );
    const circleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const circleRing = new THREE.Mesh(circleGeometry, circleMaterial);
    this.group.add(circleRing);

    // Create Pi symbol in center
    const piGeometry = new THREE.BufferGeometry();
    const scale = this.radius * 0.5;

    // Pi symbol vertices (simplified)
    const piVertices = this.getPiSymbolVertices(scale);

    piGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(piVertices, 3)
    );

    const piMaterial = new THREE.LineBasicMaterial({
      color: 0xffcc66,
      linewidth: 3,
    });
    const piSymbol = new THREE.LineSegments(piGeometry, piMaterial);

    this.group.add(piSymbol);

    // Add spokes radiating from center
    this.spokeCount = 18;
    const spokeGeometry = new THREE.BufferGeometry();

    // Clear any existing spoke positions
    this.spokePositions = [];

    const positions = [];
    for (let i = 0; i < this.spokeCount; i++) {
      const angle = (i / this.spokeCount) * Math.PI * 2;
      const outerX = Math.cos(angle) * this.radius;
      const outerY = Math.sin(angle) * this.radius;

      // Store spoke positions for enemy controllers
      this.spokePositions.push({
        angle: angle,
        outerX: outerX,
        outerY: outerY,
        innerX: 0,
        innerY: 0,
      });

      positions.push(0, 0, 0);
      positions.push(outerX, outerY, 0);
    }

    spokeGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );

    const spokeMaterial = new THREE.LineBasicMaterial({
      color: 0xffcc66,
      transparent: true,
      opacity: 0.4,
    });
    const spokes = new THREE.LineSegments(spokeGeometry, spokeMaterial);

    this.group.add(spokes);
  }

  // Create a wave/sine level based on pi
  private createWaveLevel(): void {
    // Outer ring
    const ringGeometry = new THREE.RingGeometry(
      this.radius - 0.1,
      this.radius,
      64
    );
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x66ff99,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    this.group.add(ring);

    // Create sine wave rings
    for (let r = this.radius * 0.2; r < this.radius; r += this.radius * 0.2) {
      const waveGeometry = new THREE.BufferGeometry();
      const points = [];

      const segments = 64;
      const amplitude = this.radius * 0.05; // Small wave amplitude

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
        opacity: 0.7 - (r / this.radius) * 0.5, // Fade opacity for inner circles
      });
      const wave = new THREE.Line(waveGeometry, waveMaterial);

      this.group.add(wave);
    }

    // Add spokes radiating from center
    this.spokeCount = 24;
    const spokeGeometry = new THREE.BufferGeometry();

    // Clear any existing spoke positions
    this.spokePositions = [];

    const positions = [];
    for (let i = 0; i < this.spokeCount; i++) {
      const angle = (i / this.spokeCount) * Math.PI * 2;
      // For wave levels, calculate the outer position with the wave function
      const amplitude = this.radius * 0.05;
      const waveRadius = this.radius + Math.sin(angle * 3.14) * amplitude;
      const outerX = Math.cos(angle) * waveRadius;
      const outerY = Math.sin(angle) * waveRadius;

      // Store spoke positions for enemy controllers
      this.spokePositions.push({
        angle: angle,
        outerX: outerX,
        outerY: outerY,
        innerX: 0,
        innerY: 0,
      });

      positions.push(0, 0, 0);
      positions.push(outerX, outerY, 0);
    }

    spokeGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );

    const spokeMaterial = new THREE.LineBasicMaterial({
      color: 0x66ff99,
      transparent: true,
      opacity: 0.5,
    });
    const spokes = new THREE.LineSegments(spokeGeometry, spokeMaterial);

    this.group.add(spokes);
  }
}
