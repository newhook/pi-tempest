import * as THREE from "three";
import { MovementController } from "./types";
import { Enemy } from "./enemy";
import { SpokePosition } from "./levels";

// Base class for all movement controllers
abstract class BaseMovementController implements MovementController {
  protected enemy: Enemy;
  protected angle: number;
  constructor(enemy: Enemy) {
    this.enemy = enemy;
    this.angle = Math.random() * Math.PI * 2;
  }

  abstract update(delta: number): { x: number; y: number };

  render?(scene: THREE.Scene): void {
    // Optional rendering - override in subclasses if needed
  }

  cleanup?(scene: THREE.Scene): void {
    // Optional cleanup - override in subclasses if needed
  }
}

// Simple spoke movement - straight outward along spokes
export class SpokeMovementController extends BaseMovementController {
  private spokePosition: SpokePosition;

  constructor(enemy: Enemy) {
    super(enemy);

    // Get the actual spoke position data
    const spokePositions = enemy.level.getSpokePositions();

    // Randomly select a spoke
    const spokeCount = enemy.level.getSpokeCount();
    const randomSpokeIndex = Math.floor(Math.random() * spokeCount);

    // Set the spoke position
    this.spokePosition =
      spokePositions[randomSpokeIndex % spokePositions.length];

    // Update the angle for proper orientation (used by the enemy for visual effects)
    this.angle = this.spokePosition.angle;
  }

  update(delta: number): { x: number; y: number } {
    // Calculate position along the spoke using the stored spoke position
    const t = this.enemy.distanceFromCenter / this.enemy.level.getRadius();

    // Interpolate between inner and outer positions of the spoke
    const x =
      this.spokePosition.innerX +
      (this.spokePosition.outerX - this.spokePosition.innerX) * t;
    const y =
      this.spokePosition.innerY +
      (this.spokePosition.outerY - this.spokePosition.innerY) * t;

    return { x, y };
  }
}

// Spoke crossing movement - crosses between spokes
export class SpokeCrossingMovementController extends BaseMovementController {
  protected spokeIndex: number;
  protected spokePositions: SpokePosition[];
  protected targetSpokeIndex: number | null = null;
  protected crossingProgress: number = 0;
  protected extensionProgress: number = 0;
  protected isExtending: boolean = false;
  protected nextTransitionDistance: number;
  protected extensionLine?: THREE.Line;
  protected maxJumpDistance: number = 1; // Only adjacent spokes by default

  constructor(enemy: Enemy) {
    super(enemy);
    const spokeCount = enemy.level.getSpokeCount();
    this.spokePositions = enemy.level.getSpokePositions();

    // Randomly select a starting spoke
    this.spokeIndex = Math.floor(Math.random() * spokeCount);

    // Set initial transition distance
    this.nextTransitionDistance = 1 + Math.random() * 2;

    // Update the angle for proper orientation
    if (this.spokePositions.length > 0) {
      const currentSpoke =
        this.spokePositions[this.spokeIndex % this.spokePositions.length];
      this.angle = currentSpoke.angle;
    }
  }

  protected calculateTargetSpokeIndex(): number {
    // Choose a random direction and jump distance up to maxJumpDistance
    const direction = Math.random() > 0.5 ? 1 : -1;
    const jumpDistance = 1 + Math.floor(Math.random() * this.maxJumpDistance);

    // Get next spoke in the crossing direction
    const spokeCount = this.enemy.level.getSpokeCount();
    return (
      (this.spokeIndex + direction * jumpDistance + spokeCount) % spokeCount
    );
  }

  update(delta: number): { x: number; y: number } {
    const levelRadius = this.enemy.level.getRadius();

    // Get current spoke position
    if (this.spokePositions.length === 0) {
      // Fallback if no spoke positions available
      return {
        x: Math.cos(this.angle) * this.enemy.distanceFromCenter,
        y: Math.sin(this.angle) * this.enemy.distanceFromCenter,
      };
    }

    const currentSpoke =
      this.spokePositions[this.spokeIndex % this.spokePositions.length];

    // Calculate position along the current spoke using t-value
    const t = this.enemy.distanceFromCenter / levelRadius;

    // Check if we need to start a crossing
    if (
      !this.isExtending &&
      this.targetSpokeIndex === null &&
      this.enemy.distanceFromCenter >= this.nextTransitionDistance
    ) {
      // Start the extension phase
      this.isExtending = true;
      this.extensionProgress = 0;

      // Calculate the target spoke
      this.targetSpokeIndex = this.calculateTargetSpokeIndex();
    }

    // If we're not crossing, just follow the current spoke
    if (!this.isExtending && this.targetSpokeIndex === null) {
      // Moving along current spoke
      const x =
        currentSpoke.innerX + (currentSpoke.outerX - currentSpoke.innerX) * t;
      const y =
        currentSpoke.innerY + (currentSpoke.outerY - currentSpoke.innerY) * t;

      this.angle = currentSpoke.angle;
      return { x, y };
    }

    // If we're crossing to a new spoke
    if (this.targetSpokeIndex !== null) {
      const targetSpoke =
        this.spokePositions[this.targetSpokeIndex % this.spokePositions.length];

      // Calculate current position on current spoke
      const currentX =
        currentSpoke.innerX + (currentSpoke.outerX - currentSpoke.innerX) * t;
      const currentY =
        currentSpoke.innerY + (currentSpoke.outerY - currentSpoke.innerY) * t;

      // Phase 1: Extending a line toward the target spoke
      if (this.isExtending) {
        // Extend line from current spoke toward target spoke
        this.extensionProgress += delta * 3; // Speed of extension

        // If extension complete, begin crossing phase
        if (this.extensionProgress >= 1) {
          this.isExtending = false;
          this.crossingProgress = 0;
        }

        // During extension phase, keep position on current spoke
        this.angle = currentSpoke.angle;
        return { x: currentX, y: currentY };
      }

      // Phase 2: Zipping along the extended line
      // Zip along line from current to target spoke
      this.crossingProgress += delta * 8; // Speed of zip movement

      // If crossing complete, transition to new spoke
      if (this.crossingProgress >= 1) {
        // Move to the target spoke
        this.spokeIndex = this.targetSpokeIndex;

        // Reset crossing progress
        this.targetSpokeIndex = null;
        this.crossingProgress = 0;

        // Set next transition distance
        this.nextTransitionDistance =
          this.enemy.distanceFromCenter + 1 + Math.random() * 2;

        // Update the angle for proper orientation
        const newSpoke =
          this.spokePositions[this.spokeIndex % this.spokePositions.length];
        this.angle = newSpoke.angle;

        // Use the new spoke position
        const newX = newSpoke.innerX + (newSpoke.outerX - newSpoke.innerX) * t;
        const newY = newSpoke.innerY + (newSpoke.outerY - newSpoke.innerY) * t;

        return { x: newX, y: newY };
      }

      // During crossing, interpolate between spokes
      // Calculate position on target spoke at current distance
      const targetX =
        targetSpoke.innerX + (targetSpoke.outerX - targetSpoke.innerX) * t;
      const targetY =
        targetSpoke.innerY + (targetSpoke.outerY - targetSpoke.innerY) * t;

      // Smoothly interpolate between the two positions
      // Apply easing function for smoother transition
      const easedProgress = this.easeInOutQuad(this.crossingProgress);
      const x = currentX + (targetX - currentX) * easedProgress;
      const y = currentY + (targetY - currentY) * easedProgress;

      // Interpolate angle for proper orientation
      const angleDiff = targetSpoke.angle - currentSpoke.angle;
      // Handle wrapping around 2π
      const wrappedDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
      this.angle = currentSpoke.angle + wrappedDiff * easedProgress;

      return { x, y };
    }

    // Fallback - just move along current spoke
    const x =
      currentSpoke.innerX + (currentSpoke.outerX - currentSpoke.innerX) * t;
    const y =
      currentSpoke.innerY + (currentSpoke.outerY - currentSpoke.innerY) * t;
    return { x, y };
  }

  // Quadratic easing function for smoother transitions
  protected easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  render(scene: THREE.Scene): void {
    // Render extension line if in extension phase
    if (this.isExtending && this.targetSpokeIndex !== null) {
      this.updateExtensionLine(scene);
    } else if (this.extensionLine) {
      // Remove extension line when not in extension phase
      scene.remove(this.extensionLine);
      this.extensionLine = undefined;
    }
  }

  cleanup(scene: THREE.Scene): void {
    // Clean up extension line when enemy is removed
    if (this.extensionLine) {
      scene.remove(this.extensionLine);
      this.extensionLine = undefined;
    }
  }

  protected updateExtensionLine(scene: THREE.Scene): void {
    if (this.targetSpokeIndex === null || this.spokePositions.length === 0)
      return;

    // Get the current and target spoke positions
    const currentSpoke =
      this.spokePositions[this.spokeIndex % this.spokePositions.length];
    const targetSpoke =
      this.spokePositions[this.targetSpokeIndex % this.spokePositions.length];

    // Calculate normalized distance for current position
    const t = this.enemy.distanceFromCenter / this.enemy.level.getRadius();

    // Calculate current position on current spoke
    const currentX =
      currentSpoke.innerX + (currentSpoke.outerX - currentSpoke.innerX) * t;
    const currentY =
      currentSpoke.innerY + (currentSpoke.outerY - currentSpoke.innerY) * t;

    // Calculate position on target spoke with extension progress
    const targetT = t * this.extensionProgress;
    const targetX =
      targetSpoke.innerX + (targetSpoke.outerX - targetSpoke.innerX) * targetT;
    const targetY =
      targetSpoke.innerY + (targetSpoke.outerY - targetSpoke.innerY) * targetT;

    // Create vector positions for line endpoints
    const startPos = new THREE.Vector3(currentX, currentY, 0);
    const endPos = new THREE.Vector3(targetX, targetY, 0);

    // Create or update line
    if (!this.extensionLine) {
      // Create line geometry
      const lineGeometry = new THREE.BufferGeometry();
      const linePositions = new Float32Array([
        startPos.x,
        startPos.y,
        startPos.z,
        endPos.x,
        endPos.y,
        endPos.z,
      ]);

      lineGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(linePositions, 3)
      );

      // Create line material - color matches enemy
      const enemyMaterial = this.enemy.mesh
        .material as THREE.MeshStandardMaterial;
      const lineMaterial = new THREE.LineBasicMaterial({
        color: enemyMaterial.color,
        linewidth: 2,
        opacity: 0.7,
        transparent: true,
      });

      // Create line and add to scene
      this.extensionLine = new THREE.Line(lineGeometry, lineMaterial);
      scene.add(this.extensionLine);
    } else {
      // Update existing line
      const positions = this.extensionLine.geometry.attributes.position
        .array as Float32Array;

      // Update start position
      positions[0] = startPos.x;
      positions[1] = startPos.y;
      positions[2] = startPos.z;

      // Update end position
      positions[3] = endPos.x;
      positions[4] = endPos.y;
      positions[5] = endPos.z;

      this.extensionLine.geometry.attributes.position.needsUpdate = true;
    }
  }
}

// Zigzag movement - extends a line and zips between multiple spokes
export class ZigzagMovementController extends SpokeCrossingMovementController {
  constructor(enemy: Enemy) {
    super(enemy);
    // Allow jumping to any spoke, not just adjacent ones
    this.maxJumpDistance = 3; // Can jump up to 3 spokes away
  }
}

// Pi movement - follows Pi symbol

// Circular movement - orbits instead of moving outward
export class CircularMovementController extends BaseMovementController {
  constructor(enemy: Enemy) {
    super(enemy);
  }

  update(delta: number): { x: number; y: number } {
    // Increment angle for circular motion
    this.angle = this.angle + delta * 0.5;

    const x = Math.cos(this.angle) * this.enemy.distanceFromCenter;
    const y = Math.sin(this.angle) * this.enemy.distanceFromCenter;

    return { x, y };
  }
}

// Homing movement - enemy seeks the player
export class HomingMovementController extends BaseMovementController {
  constructor(enemy: Enemy) {
    super(enemy);
  }

  update(delta: number): { x: number; y: number } {
    const levelRadius = this.enemy.level.getRadius();
    // Get current enemy position
    const enemyPosX = this.enemy.mesh.position.x;
    const enemyPosY = this.enemy.mesh.position.y;

    // Target position (player position)
    let targetX, targetY;

    if (this.enemy.modeState.playerPosition) {
      // Use actual player position
      targetX = this.enemy.modeState.playerPosition.x;
      targetY = this.enemy.modeState.playerPosition.y;
    } else {
      // Fallback to using player angle on level edge
      const playerAngle = this.enemy.modeState.playerAngle || 0;
      targetX = Math.cos(playerAngle) * levelRadius;
      targetY = Math.sin(playerAngle) * levelRadius;
    }

    // Calculate angle to target
    const targetAngle = Math.atan2(targetY - enemyPosY, targetX - enemyPosX);

    // Calculate difference between current angle and target angle
    let angleDiff = targetAngle - this.angle;

    // Normalize to between -PI and PI (for shortest turn)
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Base turn rate - distance-based for smoother targeting
    // As enemy gets closer to player, it turns more smoothly and precisely
    const distanceFactor = Math.min(
      0.8,
      this.enemy.distanceFromCenter / levelRadius
    );
    const turnRate = 1.5 + distanceFactor * 1.0; // Increased turn rate for more responsive homing

    // Apply distance-based behavior dampening
    // Reduce oscillation as enemies get closer to edge (where player is)
    const proximityDampen =
      1 - (this.enemy.distanceFromCenter / levelRadius) * 0.5;

    // 1. Subtle "hunting" oscillation - reduced when close to player
    const huntingOscillation =
      Math.sin(this.enemy.distanceFromCenter * 2) * 0.01 * proximityDampen;

    // 2. Very mild course corrections - also reduced when close
    const courseCorrection =
      Math.sin(this.enemy.distanceFromCenter * 3) * 0.01 * proximityDampen;

    // 3. Extremely tiny random jitter - just for a touch of life
    const tinyJitter = (Math.random() - 0.5) * 0.005 * proximityDampen;

    // Apply basic smooth tracking with minimal irregularities
    // Strict limit on maximum turn per frame
    const maxTurnPerFrame = 0.08; // Increased max turn for better responsiveness

    // Calculate total turn amount with reduced irregularities
    let totalTurn =
      angleDiff * delta * turnRate +
      huntingOscillation +
      courseCorrection +
      tinyJitter;

    // Strictly clamp the turn to prevent pendulum effect
    if (totalTurn > maxTurnPerFrame) totalTurn = maxTurnPerFrame;
    if (totalTurn < -maxTurnPerFrame) totalTurn = -maxTurnPerFrame;

    // Apply the turn
    this.angle = this.angle + totalTurn;

    // Calculate new position
    const x = Math.cos(this.angle) * this.enemy.distanceFromCenter;
    const y = Math.sin(this.angle) * this.enemy.distanceFromCenter;

    return { x, y };
  }
}

// Pi movement - follows Pi symbol
export class PiMovementController extends BaseMovementController {
  private pathParams?: {
    startAngle: number;
    spiralTightness: number;
    waveAmplitude: number;
    waveFrequency: number;
    pathOffset: number;
  };
  constructor(enemy: Enemy) {
    super(enemy);
    this.pathParams = {
      startAngle: this.angle,
      spiralTightness: 0.1,
      waveAmplitude: 0.7,
      waveFrequency: 3.0,
      pathOffset: Math.random() * Math.PI * 2,
    };
  }

  update(delta: number): { x: number; y: number } {
    const levelRadius = this.enemy.level.getRadius();
    let x, y;

    // Always ensure enemies of type 8 and 9 have pathParams for Pi movement
    if ((this.enemy.type === 8 || this.enemy.type === 9) && !this.pathParams) {
      this.pathParams = {
        startAngle: this.angle,
        spiralTightness: 0.1,
        waveAmplitude: 0.7,
        waveFrequency: 3.0,
        pathOffset: Math.random() * Math.PI * 2,
      };
    }

    if (this.pathParams) {
      // Calculate position along pi symbol
      // The pi symbol consists of:
      // 1. A horizontal bar at the top
      // 2. Two vertical lines coming down from the bar

      // Normalize distance to create pi symbol within level radius
      const normalizedDist = this.enemy.distanceFromCenter / levelRadius;

      // Random starting position on Pi symbol for enemy types 8 and 9
      if (
        this.enemy.distanceFromCenter === 0 &&
        (this.enemy.type === 8 || this.enemy.type === 9)
      ) {
        // Randomly decide which part of the Pi symbol to start on
        const piPart = Math.floor(Math.random() * 3); // 0: horizontal, 1: left leg, 2: right leg

        if (piPart === 0) {
          // Start on horizontal bar - random position along the bar
          const t = Math.random(); // 0 to 1 position along the bar
          x = -levelRadius * 0.5 + t * levelRadius;
          y = -levelRadius * 0.15;
          this.enemy.distanceFromCenter = 0.4 * levelRadius; // Skip initial approach
        } else if (piPart === 1) {
          // Start on left leg - random position along the leg
          x = -levelRadius * 0.4;
          y = -levelRadius * 0.15 - Math.random() * levelRadius * 0.85;
          this.enemy.distanceFromCenter = 0.6 * levelRadius; // Skip to vertical part
        } else {
          // Start on right leg - random position along the leg
          x = levelRadius * 0.4;
          y = -levelRadius * 0.15 - Math.random() * levelRadius * 0.85;
          this.enemy.distanceFromCenter = 0.6 * levelRadius; // Skip to vertical part
        }

        // Update angle for proper orientation
        this.angle = Math.atan2(y, x);
        return { x, y };
      }

      if (normalizedDist < 0.3) {
        // Initial approach from center
        x =
          this.pathParams.startAngle < Math.PI
            ? -normalizedDist * levelRadius * 0.5
            : normalizedDist * levelRadius * 0.5;
        y = -normalizedDist * levelRadius * 0.5;
      } else if (normalizedDist < 0.5) {
        // Moving to horizontal bar position
        const t = (normalizedDist - 0.3) / 0.2;
        x =
          this.pathParams.startAngle < Math.PI
            ? -levelRadius * 0.5 + t * levelRadius
            : levelRadius * 0.5 - t * levelRadius;
        y = -levelRadius * 0.15;
      } else {
        // Moving down vertical line - default positions
        // Determine which leg of Pi to follow based on angle
        let legPosition;
        if (this.pathParams.startAngle < Math.PI * 0.67) {
          legPosition = -levelRadius * 0.4; // Left leg
        } else if (this.pathParams.startAngle < Math.PI * 1.33) {
          legPosition = 0; // Middle (for type 9)
        } else {
          legPosition = levelRadius * 0.4; // Right leg
        }

        // For crossing pi, allow swapping between legs
        // if (this.enemy.movementStyle === "piCrossing" && normalizedDist > 0.7) {
        //   const crossPhase = Math.floor((normalizedDist - 0.7) * 10);
        //   if (crossPhase % 2 === 1) {
        //     // Periodically swap legs
        //     if (legPosition === -levelRadius * 0.4) {
        //       legPosition = 0;
        //     } else if (legPosition === 0) {
        //       legPosition =
        //         legPosition === -levelRadius * 0.4
        //           ? levelRadius * 0.4
        //           : -levelRadius * 0.4;
        //     } else {
        //       legPosition = 0;
        //     }
        //   }

        //   // Add some subtle horizontal oscillation
        //   legPosition += Math.sin(normalizedDist * 15) * 0.1 * levelRadius;
        // }

        x = legPosition;
        y = -levelRadius * 0.15 - (normalizedDist - 0.5) * levelRadius * 0.85;
      }

      // Update angle for proper orientation
      this.angle = Math.atan2(y, x);
    } else {
      x = Math.cos(this.angle) * this.enemy.distanceFromCenter;
      y = Math.sin(this.angle) * this.enemy.distanceFromCenter;
    }

    return { x, y };
  }
}

// Spiral movement
export class SpiralMovementController extends BaseMovementController {
  private pathParams?: {
    startAngle: number;
    spiralTightness: number;
    waveAmplitude: number;
    waveFrequency: number;
    pathOffset: number;
  };
  constructor(enemy: Enemy) {
    super(enemy);
    this.pathParams = {
      startAngle: this.angle,
      spiralTightness: 0.1 + Math.random() * 0.3,
      waveAmplitude: 0.5 + Math.random() * 1.2,
      waveFrequency: 2 + Math.random() * 4,
      pathOffset: Math.random() * Math.PI * 2,
    };
  }

  update(delta: number): { x: number; y: number } {
    // Spiral path - angle changes as distance increases
    if (this.pathParams) {
      // if (this.enemy.movementStyle === "spiralCrossing") {
      //   // Add cross-path variation to the spiral
      //   angle =
      //     this.pathParams.startAngle +
      //     this.enemy.distanceFromCenter *
      //       this.pathParams.spiralTightness +
      //     Math.sin(this.enemy.distanceFromCenter * 0.2) * 0.5; // Add oscillation for crossing
      // } else {
      //   // Regular spiral
      //   angle =
      //     this.pathParams.startAngle +
      //     this.enemy.distanceFromCenter * this.pathParams.spiralTightness;
      // }
      // Regular spiral
      this.angle =
        this.pathParams.startAngle +
        this.enemy.distanceFromCenter * this.pathParams.spiralTightness;
    }

    const x = Math.cos(this.angle) * this.enemy.distanceFromCenter;
    const y = Math.sin(this.angle) * this.enemy.distanceFromCenter;

    return { x, y };
  }
}

// Wave movement
export class WaveMovementController extends BaseMovementController {
  private pathParams?: {
    startAngle: number;
    spiralTightness: number;
    waveAmplitude: number;
    waveFrequency: number;
    pathOffset: number;
  };
  constructor(enemy: Enemy) {
    super(enemy);
    this.pathParams = {
      startAngle: this.angle,
      spiralTightness: 0.1 + Math.random() * 0.3,
      waveAmplitude: 0.5 + Math.random() * 1.2,
      waveFrequency: 2 + Math.random() * 4,
      pathOffset: Math.random() * Math.PI * 2,
    };
  }

  update(delta: number): { x: number; y: number } {
    const levelRadius = this.enemy.level.getRadius();

    // Wave path - sinusoidal movement
    if (this.pathParams) {
      // Base angle determines the spoke we're moving along
      const baseAngle = this.pathParams.startAngle;

      // Calculate wave offset
      let waveOffset =
        (Math.sin(
          (this.enemy.distanceFromCenter * this.pathParams.waveFrequency) /
            levelRadius
        ) *
          this.pathParams.waveAmplitude) /
        levelRadius;

      // // For crossing waves, add an additional perpendicular wave component
      // if (this.enemy.movementStyle === "waveCrossing") {
      //   // Add a secondary wave that's out of phase
      //   const secondaryWave =
      //     (Math.cos(
      //       (this.enemy.distanceFromCenter *
      //         this.pathParams.waveFrequency *
      //         1.5) /
      //         levelRadius
      //     ) *
      //       this.pathParams.waveAmplitude *
      //       0.7) /
      //     levelRadius;

      //   // Combine the waves
      //   waveOffset += secondaryWave;
      // }

      this.angle = baseAngle + waveOffset;
    }

    const x = Math.cos(this.angle) * this.enemy.distanceFromCenter;
    const y = Math.sin(this.angle) * this.enemy.distanceFromCenter;

    return { x, y };
  }
}

// Star movement
export class StarMovementController extends BaseMovementController {
  private pathParams?: {
    startAngle: number;
    spiralTightness: number;
    waveAmplitude: number;
    waveFrequency: number;
    pathOffset: number;
  };
  constructor(enemy: Enemy) {
    super(enemy);
    this.pathParams = {
      startAngle: this.angle,
      spiralTightness: 0.1 + Math.random() * 0.3,
      waveAmplitude: 0.5 + Math.random() * 1.2,
      waveFrequency: 2 + Math.random() * 4,
      pathOffset: Math.random() * Math.PI * 2,
    };
  }

  update(delta: number): { x: number; y: number } {
    const levelRadius = this.enemy.level.getRadius();
    let x, y;

    // Star path
    if (this.pathParams) {
      // Number of star points increases with level
      const starPoints =
        3 + (Math.floor(this.pathParams.waveFrequency * 2) % 5);
      const pointAngle = (Math.PI * 2) / starPoints;

      // Calculate which point we're moving toward
      let pointIndex = Math.floor(
        (this.pathParams.startAngle / (Math.PI * 2)) * starPoints
      );

      // // For crossing stars, occasionally jump to a different point
      // if (this.enemy.movementStyle === "starCrossing") {
      //   const jumpPhase = Math.floor(
      //     this.enemy.distanceFromCenter / (levelRadius * 0.2)
      //   );
      //   if (
      //     jumpPhase % 3 === 0 &&
      //     this.enemy.distanceFromCenter > levelRadius * 0.3
      //   ) {
      //     // Jump to a different point randomly
      //     pointIndex =
      //       (pointIndex + 1 + Math.floor(Math.random() * (starPoints - 2))) %
      //       starPoints;
      //   }
      // }

      const nextPointIndex = (pointIndex + 1) % starPoints;

      // Calculate angle to current and next point
      const currentPointAngle = pointIndex * pointAngle;
      const nextPointAngle = nextPointIndex * pointAngle;

      // Interpolate between inner and outer radius
      const innerRadius = levelRadius * 0.4;
      const outerRadius = levelRadius;

      // Determine if we're moving to outer point or inner corner
      const toOuter =
        Math.floor((this.enemy.distanceFromCenter / levelRadius) * 10) % 2 ===
        0;

      // For crossing stars, add some oscillation to the angle
      let targetAngle;
      if (toOuter) {
        // Moving to outer point
        targetAngle = currentPointAngle;
        // if (this.enemy.movementStyle === "starCrossing") {
        //   // Add slight wobble when moving to points
        //   targetAngle += Math.sin(this.enemy.distanceFromCenter * 2) * 0.1;
        // }
      } else {
        // Moving to inner corner
        targetAngle = currentPointAngle + pointAngle / 2;
        // if (this.enemy.movementStyle === "starCrossing") {
        //   // Add slight wobble when moving to corners
        //   targetAngle += Math.cos(this.enemy.distanceFromCenter * 3) * 0.15;
        // }
      }

      this.angle = targetAngle;

      const currentRadius = toOuter
        ? innerRadius +
          ((outerRadius - innerRadius) *
            (this.enemy.distanceFromCenter % (levelRadius / 5))) /
            (levelRadius / 5)
        : outerRadius -
          ((outerRadius - innerRadius) *
            (this.enemy.distanceFromCenter % (levelRadius / 5))) /
            (levelRadius / 5);

      x = Math.cos(this.angle) * currentRadius;
      y = Math.sin(this.angle) * currentRadius;
    } else {
      x = Math.cos(this.angle) * this.enemy.distanceFromCenter;
      y = Math.sin(this.angle) * this.enemy.distanceFromCenter;
    }

    return { x, y };
  }
}

// Erratic movement - moves chaotically, periodically stops and spawns enemies
export class ErraticMovementController extends BaseMovementController {
  private lastSpawnTime: number = 0;
  private isMoving: boolean = true;
  private pauseTime: number = 0;
  private pauseDuration: number = 1.0; // 1 second pause when spawning
  private timeBetweenSpawns: number = 5.0; // Spawn every 5 seconds
  private spokePosition: SpokePosition;
  private elapsedTime: number = 0;
  
  constructor(enemy: Enemy) {
    super(enemy);
    
    // Get the actual spoke position data for more controlled movement
    const spokePositions = enemy.level.getSpokePositions();
    
    // Randomly select a spoke to generally follow (though will deviate erratically)
    const spokeCount = enemy.level.getSpokeCount();
    const randomSpokeIndex = Math.floor(Math.random() * spokeCount);
    
    // Set the spoke position
    this.spokePosition = spokePositions[randomSpokeIndex % spokePositions.length];
    
    // Start with random pause timing so not all chaotic enemies spawn at once
    this.lastSpawnTime = -Math.random() * 3.0;
  }

  update(delta: number): { x: number; y: number } {
    const levelRadius = this.enemy.level.getRadius();
    this.elapsedTime += delta;
    
    // Check if it's time to pause and spawn
    if (this.isMoving && this.elapsedTime - this.lastSpawnTime > this.timeBetweenSpawns) {
      // Stop moving and start pause
      this.isMoving = false;
      this.pauseTime = this.elapsedTime;
      
      // Spawn smaller enemies
      this.spawnSmallEnemies();
      
      // Make the enemy "flash" by modifying its material
      this.flashEnemy();
    }
    
    // Check if pause time is over
    if (!this.isMoving && this.elapsedTime - this.pauseTime > this.pauseDuration) {
      this.isMoving = true;
      this.lastSpawnTime = this.elapsedTime;
    }
    
    let x, y;
    
    if (this.isMoving) {
      // Erratic movement when active - combine random movement with slight spoke following
      const randomFactor = 0.1; // How much randomness to add
      const spokeFactor = 0.9; // How much to follow the general spoke direction
      
      // Add some erratic angle changes
      this.angle += 
        (Math.sin(this.enemy.distanceFromCenter * 0.5) +
         Math.cos(this.enemy.distanceFromCenter * 0.3)) * 0.1 +
        (Math.random() - 0.5) * 0.08;
      
      // Calculate position based on updated angle
      const randomX = Math.cos(this.angle) * this.enemy.distanceFromCenter;
      const randomY = Math.sin(this.angle) * this.enemy.distanceFromCenter;
      
      // Calculate position on spoke for partial guidance
      const t = this.enemy.distanceFromCenter / levelRadius;
      const spokeX = this.spokePosition.innerX + (this.spokePosition.outerX - this.spokePosition.innerX) * t;
      const spokeY = this.spokePosition.innerY + (this.spokePosition.outerY - this.spokePosition.innerY) * t;
      
      // Blend random movement with spoke-following for semi-guided chaos
      x = randomX * randomFactor + spokeX * spokeFactor;
      y = randomY * randomFactor + spokeY * spokeFactor;
    } else {
      // When paused, stay in place
      x = this.enemy.mesh.position.x;
      y = this.enemy.mesh.position.y;
    }
    
    return { x, y };
  }
  
  // Spawn 4 small type 10 enemies
  private spawnSmallEnemies(): void {
    // Create a sphere geometry for the small enemies
    const geometry = new THREE.SphereGeometry(0.2, 8, 8);
    
    // Create a glowing material with pulsating effect
    const hue = 0.3 + Math.random() * 0.1; // green to yellowish-green
    const color = new THREE.Color().setHSL(hue, 1, 0.5);
    
    // Get enemy's current position
    const position = this.enemy.mesh.position.clone();
    
    // Spawn 4 enemies in cardinal directions
    for (let i = 0; i < 4; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.7,
        flatShading: true,
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // Position slightly offset from parent enemy
      const angle = (i / 4) * Math.PI * 2;
      const offsetDistance = 0.5; // Distance from parent enemy
      mesh.position.set(
        position.x + Math.cos(angle) * offsetDistance,
        position.y + Math.sin(angle) * offsetDistance,
        position.z
      );
      
      // Create the enemy object with proper parameters order matching the Enemy constructor
      const smallEnemy = new Enemy(
        this.enemy.level,
        mesh,
        10, // Type 10 for small enemies
        this.enemy.scene,
        this.enemy.gameState,
        this.enemy.modeState
      );
      
      // Add to scene and enemy list
      this.enemy.scene.add(mesh);
      this.enemy.modeState.enemies.push(smallEnemy);
    }
  }
  
  // Make the enemy flash when spawning
  private flashEnemy(): void {
    const enemyMaterial = this.enemy.mesh.material as THREE.MeshStandardMaterial;
    const originalColor = enemyMaterial.color.clone();
    const originalEmissive = enemyMaterial.emissive.clone();
    const originalIntensity = enemyMaterial.emissiveIntensity;
    
    // Flash white
    enemyMaterial.color.set(0xffffff);
    enemyMaterial.emissive.set(0xffffff);
    enemyMaterial.emissiveIntensity = 1.0;
    
    // Reset after flash duration
    setTimeout(() => {
      if (this.enemy && this.enemy.mesh) {
        enemyMaterial.color.copy(originalColor);
        enemyMaterial.emissive.copy(originalEmissive);
        enemyMaterial.emissiveIntensity = originalIntensity;
      }
    }, this.pauseDuration * 800); // Flash for 80% of pause duration
  }
}

// Bounce movement
export class BounceMovementController extends BaseMovementController {
  private spokePosition: SpokePosition;
  private bounceScale: number;

  constructor(enemy: Enemy) {
    super(enemy);
    
    // Get the actual spoke position data
    const spokePositions = enemy.level.getSpokePositions();
    
    // Randomly select a spoke
    const spokeCount = enemy.level.getSpokeCount();
    const randomSpokeIndex = Math.floor(Math.random() * spokeCount);
    
    // Set the spoke position
    this.spokePosition = spokePositions[randomSpokeIndex % spokePositions.length];
    
    // Update the angle for proper orientation
    this.angle = this.spokePosition.angle;
    
    // Random bounce intensity
    this.bounceScale = 0.05 + Math.random() * 0.15; // Controls how strong the bounce is
  }

  update(delta: number): { x: number; y: number } {
    const levelRadius = this.enemy.level.getRadius();
    
    // Calculate normalized distance and maintain original distance for calculations
    const originalDistance = this.enemy.distanceFromCenter;
    let adjustedDistance = originalDistance;
    
    // Calculate bounce parameters - a bounce every 20% of the level radius
    const bouncePhase = Math.floor(originalDistance / (levelRadius * 0.2));
    const bounceProgress = (originalDistance % (levelRadius * 0.2)) / (levelRadius * 0.2);
    
    // Only apply bounce on odd phases (every other segment)
    if (bouncePhase % 2 === 1) {
      // Apply sinusoidal bounce effect to get the characteristic bounce motion
      const bounceAmount = Math.sin(bounceProgress * Math.PI) * (levelRadius * this.bounceScale);
      adjustedDistance -= bounceAmount;
    }
    
    // Calculate position along the spoke using interpolation of spoke coordinates
    const t = adjustedDistance / levelRadius;
    
    // Interpolate between inner and outer positions of the spoke
    const x = this.spokePosition.innerX + (this.spokePosition.outerX - this.spokePosition.innerX) * t;
    const y = this.spokePosition.innerY + (this.spokePosition.outerY - this.spokePosition.innerY) * t;
    
    return { x, y };
  }
}

// Linear movement with direction vector
export class LinearMovementController extends BaseMovementController {
  public direction: THREE.Vector2;
  constructor(enemy: Enemy) {
    super(enemy);
    const angle = Math.random() * Math.PI * 2;
    this.direction = new THREE.Vector2(Math.cos(angle), Math.sin(angle));
    this.angle = Math.atan2(this.direction.y, this.direction.x);
  }

  update(delta: number): { x: number; y: number } {
    let x, y;

    x =
      this.enemy.mesh.position.x +
      this.direction.x * this.enemy.speed * delta * 30;
    y =
      this.enemy.mesh.position.y +
      this.direction.y * this.enemy.speed * delta * 30;
    this.enemy.distanceFromCenter = Math.sqrt(x * x + y * y);

    return { x, y };
  }
}
