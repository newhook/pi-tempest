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
  private distanceFromCenter: number = 0;

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
    this.distanceFromCenter += this.enemy.speed * delta * 30;

    // Calculate position along the spoke using the stored spoke position
    const t = this.distanceFromCenter / this.enemy.level.getRadius();

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
  private distanceFromCenter: number = 0;

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
    this.distanceFromCenter += this.enemy.speed * delta * 30;
    const levelRadius = this.enemy.level.getRadius();

    const currentSpoke =
      this.spokePositions[this.spokeIndex % this.spokePositions.length];

    // Calculate position along the current spoke using t-value
    const t = this.distanceFromCenter / levelRadius;

    // Check if we need to start a crossing
    if (
      !this.isExtending &&
      this.targetSpokeIndex === null &&
      this.distanceFromCenter >= this.nextTransitionDistance
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
          this.distanceFromCenter + 1 + Math.random() * 2;

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
    const t = this.distanceFromCenter / this.enemy.level.getRadius();

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
  private distanceFromCenter: number = 0;
  constructor(enemy: Enemy) {
    super(enemy);
  }

  update(delta: number): { x: number; y: number } {
    this.distanceFromCenter += this.enemy.speed * delta * 30;
    this.angle = this.angle + delta * 0.5;

    const x = Math.cos(this.angle) * this.distanceFromCenter;
    const y = Math.sin(this.angle) * this.distanceFromCenter;

    return { x, y };
  }
}

// Homing movement - enemy seeks the player
export class HomingMovementController extends BaseMovementController {
  private distanceFromCenter: number = 0;
  constructor(enemy: Enemy) {
    super(enemy);
  }

  update(delta: number): { x: number; y: number } {
    this.distanceFromCenter += this.enemy.speed * delta * 30;
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
    const distanceFactor = Math.min(0.8, this.distanceFromCenter / levelRadius);
    const turnRate = 1.5 + distanceFactor * 1.0; // Increased turn rate for more responsive homing

    // Apply distance-based behavior dampening
    // Reduce oscillation as enemies get closer to edge (where player is)
    const proximityDampen = 1 - (this.distanceFromCenter / levelRadius) * 0.5;

    // 1. Subtle "hunting" oscillation - reduced when close to player
    const huntingOscillation =
      Math.sin(this.distanceFromCenter * 2) * 0.01 * proximityDampen;

    // 2. Very mild course corrections - also reduced when close
    const courseCorrection =
      Math.sin(this.distanceFromCenter * 3) * 0.01 * proximityDampen;

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
    const x = Math.cos(this.angle) * this.distanceFromCenter;
    const y = Math.sin(this.angle) * this.distanceFromCenter;

    return { x, y };
  }
}

// Pi movement - follows Pi symbol
export class PiMovementController extends BaseMovementController {
  // Which part of the Pi we're currently traversing
  // 0 = horizontal bar, 1 = left leg, 2 = right leg
  private currentPart: number;

  // Progress along the current part (0.0 to 1.0)
  private progress: number;

  // Movement speed scaling
  private speed: number;

  // For type 9 (advanced Pi follower), we can jump between parts
  private canJumpBetweenParts: boolean;

  // Direction of movement (1 = forward, -1 = backward)
  private direction: number = 1;

  // Pi shape vertices from the level
  private horizontalBarStart: { x: number; y: number };
  private horizontalBarEnd: { x: number; y: number };
  private leftLegStart: { x: number; y: number };
  private leftLegEnd: { x: number; y: number };
  private rightLegStart: { x: number; y: number };
  private rightLegEnd: { x: number; y: number };

  // Zipping across parts (for type 9)
  private isZipping: boolean = false;
  private targetPart: number | null = null;
  private extensionProgress: number = 0;
  private crossingProgress: number = 0;
  private extensionLine?: THREE.Line;

  constructor(enemy: Enemy) {
    super(enemy);

    // Get Pi symbol vertices from the level
    const piVertices = enemy.level.getPiSymbolVertices();

    // Top horizontal line
    this.horizontalBarStart = {
      x: piVertices[0],
      y: piVertices[1],
    };
    this.horizontalBarEnd = {
      x: piVertices[3],
      y: piVertices[4],
    };

    // Left vertical line
    this.leftLegStart = {
      x: piVertices[6],
      y: piVertices[7],
    };
    this.leftLegEnd = {
      x: piVertices[9],
      y: piVertices[10],
    };

    // Right vertical line
    this.rightLegStart = {
      x: piVertices[12],
      y: piVertices[13],
    };
    this.rightLegEnd = {
      x: piVertices[15],
      y: piVertices[16],
    };

    // Initialize movement
    this.currentPart = Math.floor(Math.random() * 3); // Start on a random part
    this.progress = Math.random(); // Start at a random position on the part

    // Randomize initial direction
    this.direction = Math.random() > 0.5 ? 1 : -1;

    // For type 9, enable jumping between Pi parts
    this.canJumpBetweenParts = enemy.type === 9;

    // Type 9 moves faster than type 8
    this.speed = enemy.type === 9 ? 0.3 : 0.2;

    // Move enemy to initial position on the Pi
    const initialPosition = this.calculatePosition();
    enemy.mesh.position.set(initialPosition.x, initialPosition.y, 0);
  }

  update(delta: number): { x: number; y: number } {
    // For type 9, check if we should start zipping to a different part
    if (this.canJumpBetweenParts && !this.isZipping && Math.random() < 0.01) {
      this.startZipping();
      return this.calculatePosition(); // Return current position while starting to zip
    }

    // Handle zipping movement for type 9
    if (this.isZipping && this.targetPart !== null) {
      return this.updateZipping(delta);
    }

    // Update progress along the current part based on direction
    this.progress += delta * this.speed * this.direction;

    // Check boundaries and reverse direction if needed
    if (this.progress >= 1.0) {
      if (this.canJumpBetweenParts && Math.random() > 0.7) {
        // Type 9: Sometimes jump to a random part instead of reversing
        this.progress = 0.0;
        const oldPart = this.currentPart;
        do {
          this.currentPart = Math.floor(Math.random() * 3);
        } while (this.currentPart === oldPart);
      } else {
        // Hit end of segment, reverse direction
        this.progress = 1.0;
        this.direction = -1;
      }
    } else if (this.progress <= 0.0) {
      if (this.canJumpBetweenParts && Math.random() > 0.7) {
        // Type 9: Sometimes jump to a random part instead of reversing
        this.progress = 1.0;
        const oldPart = this.currentPart;
        do {
          this.currentPart = Math.floor(Math.random() * 3);
        } while (this.currentPart === oldPart);
      } else {
        // Hit start of segment, reverse direction
        this.progress = 0.0;
        this.direction = 1;

        // Type 8: Occasionally move to next segment when at a junction
        if (!this.canJumpBetweenParts && Math.random() > 0.5) {
          // Only switch segments if we're at a junction (top of a leg or end of horizontal)
          if (
            (this.currentPart === 1 && this.progress === 0.0) || // Top of left leg
            (this.currentPart === 2 && this.progress === 0.0) || // Top of right leg
            (this.currentPart === 0 &&
              (this.progress === 0.0 || this.progress === 1.0))
          ) {
            // Ends of horizontal
            this.currentPart = (this.currentPart + 1) % 3;
          }
        }
      }
    }

    // Calculate position on the Pi symbol
    const position = this.calculatePosition();

    // Update angle for proper orientation
    this.angle = Math.atan2(position.y, position.x);

    return position;
  }

  // Start the zipping process to another part of the Pi symbol
  private startZipping(): void {
    // Only for type 9
    if (!this.canJumpBetweenParts) return;

    this.isZipping = true;
    this.extensionProgress = 0;
    this.crossingProgress = 0;

    // Select a target part different from current part
    do {
      this.targetPart = Math.floor(Math.random() * 3);
    } while (this.targetPart === this.currentPart);

    // Randomize target progress position on the new segment
    this.progress = Math.random();
  }

  // Update the zipping movement (extending a line and crossing to a new part)
  private updateZipping(delta: number): { x: number; y: number } {
    if (this.targetPart === null) {
      this.isZipping = false;
      return this.calculatePosition();
    }

    // Current position
    const currentPosition = this.calculatePosition();

    // Phase 1: Extending a line toward the target part
    if (this.extensionProgress < 1.0) {
      this.extensionProgress += delta * 3; // Speed of extension

      // Keep the current position during extension
      return currentPosition;
    }

    // Phase 2: Zipping along the extended line
    this.crossingProgress += delta * 8; // Speed of zip movement

    // If crossing is complete, transition to the target part
    if (this.crossingProgress >= 1.0) {
      this.currentPart = this.targetPart;
      this.targetPart = null;
      this.isZipping = false;
      this.extensionProgress = 0;
      this.crossingProgress = 0;

      // Ensure extension line is properly removed from scene when zipping completes
      if (this.extensionLine && this.enemy && this.enemy.scene) {
        this.removeExtensionLine(this.enemy.scene);
      }

      // Return the new position on the target part
      return this.calculatePosition();
    }

    // During crossing, interpolate between current and target positions
    // Calculate target position
    const originalPart = this.currentPart;
    this.currentPart = this.targetPart;
    const targetPosition = this.calculatePosition();
    this.currentPart = originalPart;

    // Apply easing for smoother transition
    const easedProgress = this.easeInOutQuad(this.crossingProgress);

    const x =
      currentPosition.x +
      (targetPosition.x - currentPosition.x) * easedProgress;
    const y =
      currentPosition.y +
      (targetPosition.y - currentPosition.y) * easedProgress;

    // Update angle for proper orientation during crossing
    this.angle = Math.atan2(y, x);

    return { x, y };
  }

  // Quadratic easing function for smoother transitions
  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  // Render the extension line during zipping
  render(scene: THREE.Scene): void {
    try {
      // Render extension line if in extension or crossing phase
      if (this.isZipping && this.targetPart !== null) {
        this.updateExtensionLine(scene);
      } else {
        // Always ensure extension line is removed when not zipping
        this.removeExtensionLine(scene);
      }
    } catch (error) {
      // If any error occurs during rendering, make sure to clean up
      console.error("Error in PiMovementController render:", error);
      this.removeExtensionLine(scene);
    }
  }

  cleanup(scene: THREE.Scene): void {
    // Ensure the extension line is removed when enemy is destroyed
    this.removeExtensionLine(scene);
  }

  // Helper method to safely remove extension line
  private removeExtensionLine(scene: THREE.Scene): void {
    if (this.extensionLine) {
      try {
        scene.remove(this.extensionLine);
      } catch (e) {
        console.error("Error removing extension line:", e);
      }

      // Dispose of geometry and material to prevent memory leaks
      if (this.extensionLine.geometry) {
        this.extensionLine.geometry.dispose();
      }

      if (this.extensionLine.material) {
        // Check if it's an array of materials or a single material
        if (Array.isArray(this.extensionLine.material)) {
          this.extensionLine.material.forEach((material) => material.dispose());
        } else {
          this.extensionLine.material.dispose();
        }
      }

      this.extensionLine = undefined;
    }

    // Reset zipping state to ensure we don't try to render lines in an invalid state
    if (!this.isZipping) {
      this.extensionProgress = 0;
      this.crossingProgress = 0;
      this.targetPart = null;
    }
  }

  private updateExtensionLine(scene: THREE.Scene): void {
    if (this.targetPart === null) return;

    // Current position
    const currentPosition = this.calculatePosition();

    // Calculate target position
    const originalPart = this.currentPart;
    this.currentPart = this.targetPart;
    const targetPosition = this.calculatePosition();
    this.currentPart = originalPart;

    // Calculate target position with extension progress
    const targetX =
      currentPosition.x +
      (targetPosition.x - currentPosition.x) * this.extensionProgress;
    const targetY =
      currentPosition.y +
      (targetPosition.y - currentPosition.y) * this.extensionProgress;

    // Create vector positions for line endpoints
    const startPos = new THREE.Vector3(currentPosition.x, currentPosition.y, 0);
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

  private calculatePosition(): { x: number; y: number } {
    let x, y;

    // Get the latest Pi symbol vertices from the level
    // This ensures we're using the current rotated positions
    const piVertices = this.enemy.level.getPiSymbolVertices();

    // Update the Pi symbol vertices to reflect current rotation
    // Top horizontal line
    this.horizontalBarStart = {
      x: piVertices[0],
      y: piVertices[1],
    };
    this.horizontalBarEnd = {
      x: piVertices[3],
      y: piVertices[4],
    };

    // Left vertical line
    this.leftLegStart = {
      x: piVertices[6],
      y: piVertices[7],
    };
    this.leftLegEnd = {
      x: piVertices[9],
      y: piVertices[10],
    };

    // Right vertical line
    this.rightLegStart = {
      x: piVertices[12],
      y: piVertices[13],
    };
    this.rightLegEnd = {
      x: piVertices[15],
      y: piVertices[16],
    };

    switch (this.currentPart) {
      case 0: // Horizontal bar
        // Interpolate along the bar based on progress
        x =
          this.horizontalBarStart.x +
          (this.horizontalBarEnd.x - this.horizontalBarStart.x) * this.progress;
        y = 
          this.horizontalBarStart.y +
          (this.horizontalBarEnd.y - this.horizontalBarStart.y) * this.progress;
        break;

      case 1: // Left leg
        // Interpolate along the left leg based on progress
        x = 
          this.leftLegStart.x +
          (this.leftLegEnd.x - this.leftLegStart.x) * this.progress;
        y =
          this.leftLegStart.y +
          (this.leftLegEnd.y - this.leftLegStart.y) * this.progress;
        break;

      case 2: // Right leg
        // Interpolate along the right leg based on progress
        x = 
          this.rightLegStart.x +
          (this.rightLegEnd.x - this.rightLegStart.x) * this.progress;
        y =
          this.rightLegStart.y +
          (this.rightLegEnd.y - this.rightLegStart.y) * this.progress;
        break;
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
  private distanceFromCenter: number = 0;

  constructor(enemy: Enemy) {
    super(enemy);

    // Get the actual spoke position data for more controlled movement
    const spokePositions = enemy.level.getSpokePositions();

    // Randomly select a spoke to generally follow (though will deviate erratically)
    const spokeCount = enemy.level.getSpokeCount();
    const randomSpokeIndex = Math.floor(Math.random() * spokeCount);

    // Set the spoke position
    this.spokePosition =
      spokePositions[randomSpokeIndex % spokePositions.length];

    // Start with random pause timing so not all chaotic enemies spawn at once
    this.lastSpawnTime = -Math.random() * 3.0;
  }

  update(delta: number): { x: number; y: number } {
    this.distanceFromCenter += this.enemy.speed * delta * 30;
    const levelRadius = this.enemy.level.getRadius();
    this.elapsedTime += delta;

    // Check if it's time to pause and spawn
    if (
      this.isMoving &&
      this.elapsedTime - this.lastSpawnTime > this.timeBetweenSpawns
    ) {
      // Stop moving and start pause
      this.isMoving = false;
      this.pauseTime = this.elapsedTime;

      // Spawn smaller enemies
      this.spawnSmallEnemies();

      // Make the enemy "flash" by modifying its material
      this.flashEnemy();
    }

    // Check if pause time is over
    if (
      !this.isMoving &&
      this.elapsedTime - this.pauseTime > this.pauseDuration
    ) {
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
        (Math.sin(this.distanceFromCenter * 0.5) +
          Math.cos(this.distanceFromCenter * 0.3)) *
          0.1 +
        (Math.random() - 0.5) * 0.08;

      // Calculate position based on updated angle
      const randomX = Math.cos(this.angle) * this.distanceFromCenter;
      const randomY = Math.sin(this.angle) * this.distanceFromCenter;

      // Calculate position on spoke for partial guidance
      const t = this.distanceFromCenter / levelRadius;
      const spokeX =
        this.spokePosition.innerX +
        (this.spokePosition.outerX - this.spokePosition.innerX) * t;
      const spokeY =
        this.spokePosition.innerY +
        (this.spokePosition.outerY - this.spokePosition.innerY) * t;

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
    const enemyMaterial = this.enemy.mesh
      .material as THREE.MeshStandardMaterial;
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
  private distanceFromCenter: number = 0;

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

    // Update the angle for proper orientation
    this.angle = this.spokePosition.angle;

    // Random bounce intensity
    this.bounceScale = 0.05 + Math.random() * 0.15; // Controls how strong the bounce is
  }

  update(delta: number): { x: number; y: number } {
    this.distanceFromCenter += this.enemy.speed * delta * 30;
    const levelRadius = this.enemy.level.getRadius();

    // Calculate normalized distance and maintain original distance for calculations
    const originalDistance = this.distanceFromCenter;
    let adjustedDistance = originalDistance;

    // Calculate bounce parameters - a bounce every 20% of the level radius
    const bouncePhase = Math.floor(originalDistance / (levelRadius * 0.2));
    const bounceProgress =
      (originalDistance % (levelRadius * 0.2)) / (levelRadius * 0.2);

    // Only apply bounce on odd phases (every other segment)
    if (bouncePhase % 2 === 1) {
      // Apply sinusoidal bounce effect to get the characteristic bounce motion
      const bounceAmount =
        Math.sin(bounceProgress * Math.PI) * (levelRadius * this.bounceScale);
      adjustedDistance -= bounceAmount;
    }

    // Calculate position along the spoke using interpolation of spoke coordinates
    const t = adjustedDistance / levelRadius;

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

    return { x, y };
  }
}
