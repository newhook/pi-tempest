import * as THREE from "three";
import { MovementController } from "./types";
import { Enemy } from "./enemy";

// Base class for all movement controllers
abstract class BaseMovementController implements MovementController {
  protected enemy: Enemy;
  
  constructor() {
    // Initialize with empty enemy - will be set in initialize()
    this.enemy = null as unknown as Enemy;
  }
  
  initialize(enemy: Enemy, params?: any): void {
    this.enemy = enemy;
  }
  
  abstract update(delta: number, levelRadius: number, numSpokes: number): { x: number, y: number, angle: number };
  
  render?(scene: THREE.Scene): void {
    // Optional rendering - override in subclasses if needed
  }
  
  cleanup?(scene: THREE.Scene): void {
    // Optional cleanup - override in subclasses if needed
  }
}

// Simple spoke movement - straight outward along spokes
export class SpokeMovementController extends BaseMovementController {
  update(delta: number, levelRadius: number, numSpokes: number): { x: number; y: number; angle: number; } {
    // Just move outward along the original angle
    const x = Math.cos(this.enemy.angle) * this.enemy.distanceFromCenter;
    const y = Math.sin(this.enemy.angle) * this.enemy.distanceFromCenter;
    
    return { x, y, angle: this.enemy.angle };
  }
}

// Spoke crossing movement - crosses between neighboring spokes
export class SpokeCrossingMovementController extends BaseMovementController {
  initialize(enemy: Enemy, params?: any): void {
    super.initialize(enemy);
    
    // Initialize spoke crossing specific parameters if not set
    if (!enemy.spokeCrossingDirection) {
      enemy.spokeCrossingDirection = Math.random() > 0.5 ? 1 : -1;
    }
    
    if (!enemy.spokeCrossingSpeed) {
      enemy.spokeCrossingSpeed = 0.01 + Math.random() * 0.03;
    }
    
    // Note: The numSpokes is handled in the Enemy.update method and doesn't
    // need to be initialized here. The controller will get the correct
    // numSpokes value in each update call.
  }
  
  update(delta: number, levelRadius: number, numSpokes: number): { x: number; y: number; angle: number; } {
    // Handle spoke crossing movement
    if (this.enemy.distanceFromCenter > levelRadius * 0.3) {
      // Calculate crossover effect based on distance from center
      const crossFactor = Math.min(
        1,
        (this.enemy.distanceFromCenter / levelRadius) * 2
      );

      // Gradually shift the angle based on distance from center
      this.enemy.angle +=
        this.enemy.spokeCrossingDirection! *
        this.enemy.spokeCrossingSpeed! *
        crossFactor *
        delta *
        10;
    }
    
    const x = Math.cos(this.enemy.angle) * this.enemy.distanceFromCenter;
    const y = Math.sin(this.enemy.angle) * this.enemy.distanceFromCenter;
    
    return { x, y, angle: this.enemy.angle };
  }
}

// Zigzag movement - extends a line and zips between spokes
export class ZigzagMovementController extends BaseMovementController {
  private zigzagState: {
    currentSpoke: number;
    targetSpoke: number | null;
    transitionProgress: number;
    isExtending: boolean;
    extensionProgress: number;
    phase: number;
    nextTransitionDistance: number;
  };
  
  private extensionLine?: THREE.Line;
  
  initialize(enemy: Enemy, params?: any): void {
    super.initialize(enemy);
    
    // Get a valid spoke count - use enemy's numSpokes or a default value
    // The actual numSpokes will be correctly set during the first update call
    const numSpokes = enemy.numSpokes || 8;
    
    // Initialize zigzag state
    this.zigzagState = {
      // Current spoke index
      currentSpoke: Math.floor(Math.random() * numSpokes),
      // Target spoke (where we're moving to)
      targetSpoke: null,
      // Progress along the transition (0-1)
      transitionProgress: 0,
      // Line "extension" phase (true) or "zip" phase (false)
      isExtending: true,
      // Line extension progress (0-1)
      extensionProgress: 0,
      // Movement phase (0: along spoke, 1: transitioning between spokes)
      phase: 0,
      // Distance when we start next transition 
      nextTransitionDistance: 1 + Math.random() * 2
    };
  }
  
  update(delta: number, levelRadius: number, numSpokes: number): { x: number; y: number; angle: number; } {
    // Get current spoke angle
    const spokeAngle = (this.zigzagState.currentSpoke / numSpokes) * Math.PI * 2;
    let angle = spokeAngle;
    
    // If we're in phase 0 (moving along spoke), check if we need to switch to transition
    if (this.zigzagState.phase === 0) {
      // Move outward along spoke
      angle = spokeAngle;
      
      // If we've reached the transition distance, set up next transition
      if (this.enemy.distanceFromCenter >= this.zigzagState.nextTransitionDistance) {
        // Switch to transition phase
        this.zigzagState.phase = 1;
        
        // Choose a target spoke (different from current)
        let nextSpokeOffset;
        // Random jump distance between 1-3 spokes
        const jumpDistance = 1 + Math.floor(Math.random() * 3);
        
        // 50% chance to go clockwise vs counter-clockwise
        if (Math.random() > 0.5) {
          nextSpokeOffset = jumpDistance;
        } else {
          nextSpokeOffset = numSpokes - jumpDistance;
        }
        
        // Calculate target spoke index
        this.zigzagState.targetSpoke = 
          (this.zigzagState.currentSpoke + nextSpokeOffset) % numSpokes;
        
        // Start extension phase
        this.zigzagState.isExtending = true;
        this.zigzagState.extensionProgress = 0;
        this.zigzagState.transitionProgress = 0;
      }
    }
    
    // Phase 1: Transition between spokes
    if (this.zigzagState.phase === 1) {
      // Get target spoke angle
      const targetSpokeAngle = (this.zigzagState.targetSpoke! / numSpokes) * Math.PI * 2;
      
      // Phase 1a: Extending line toward target spoke
      if (this.zigzagState.isExtending) {
        // Extend line from current spoke toward target spoke
        this.zigzagState.extensionProgress += delta * 3; // Speed of extension
        
        // If extension complete, begin zip phase
        if (this.zigzagState.extensionProgress >= 1) {
          this.zigzagState.isExtending = false;
          this.zigzagState.transitionProgress = 0;
        }
        
        // During extension phase, keep position on current spoke
        angle = spokeAngle;
      }
      // Phase 1b: Zipping along the extended line
      else {
        // Zip along line from current to target spoke
        this.zigzagState.transitionProgress += delta * 8; // Speed of zip movement
        
        // If zip complete, transition to target spoke
        if (this.zigzagState.transitionProgress >= 1) {
          // Complete transition to new spoke
          this.zigzagState.currentSpoke = this.zigzagState.targetSpoke!;
          this.zigzagState.targetSpoke = null;
          
          // Return to spoke movement phase
          this.zigzagState.phase = 0;
          
          // Set next transition distance
          this.zigzagState.nextTransitionDistance = 
            this.enemy.distanceFromCenter + 1 + Math.random() * 2;
          
          // Set to target spoke angle
          angle = targetSpokeAngle;
        } 
        // During zip movement, interpolate between spoke angles
        else {
          // Easing function for smooth acceleration/deceleration 
          const t = this.zigzagState.transitionProgress;
          const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          
          // Interpolate between spoke angles for smooth movement
          const angleDiff = targetSpokeAngle - spokeAngle;
          // Handle wrapping around 2π
          const wrappedDiff = 
            ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
          
          angle = spokeAngle + wrappedDiff * eased;
        }
      }
    }
    
    // Calculate position
    const x = Math.cos(angle) * this.enemy.distanceFromCenter;
    const y = Math.sin(angle) * this.enemy.distanceFromCenter;
    
    return { x, y, angle };
  }
  
  render(scene: THREE.Scene): void {
    // Render extension line if in extension phase
    if (this.zigzagState.phase === 1 && this.zigzagState.isExtending) {
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
  
  private updateExtensionLine(scene: THREE.Scene): void {
    if (!this.zigzagState.targetSpoke) return;
    
    // Calculate current and target positions
    const numSpokes = this.enemy.numSpokes || 8;
    const currentSpokeAngle = (this.zigzagState.currentSpoke / numSpokes) * Math.PI * 2;
    const targetSpokeAngle = (this.zigzagState.targetSpoke / numSpokes) * Math.PI * 2;
    
    // Get positions for line endpoints
    const startPos = new THREE.Vector3(
      Math.cos(currentSpokeAngle) * this.enemy.distanceFromCenter,
      Math.sin(currentSpokeAngle) * this.enemy.distanceFromCenter,
      0
    );
    
    // Target position at the same distance from center but on target spoke
    const endDistance = this.enemy.distanceFromCenter * this.zigzagState.extensionProgress;
    const endPos = new THREE.Vector3(
      Math.cos(targetSpokeAngle) * endDistance,
      Math.sin(targetSpokeAngle) * endDistance,
      0
    );
    
    // Create or update line
    if (!this.extensionLine) {
      // Create line geometry
      const lineGeometry = new THREE.BufferGeometry();
      const linePositions = new Float32Array([
        startPos.x, startPos.y, startPos.z,
        endPos.x, endPos.y, endPos.z
      ]);
      
      lineGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(linePositions, 3)
      );
      
      // Create line material - color matches enemy
      const enemyMaterial = this.enemy.mesh.material as THREE.MeshStandardMaterial;
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: enemyMaterial.color,
        linewidth: 2,
        opacity: 0.7,
        transparent: true
      });
      
      // Create line and add to scene
      this.extensionLine = new THREE.Line(lineGeometry, lineMaterial);
      scene.add(this.extensionLine);
    } else {
      // Update existing line
      const positions = this.extensionLine.geometry.attributes.position.array as Float32Array;
      
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

// Circular movement - orbits instead of moving outward
export class CircularMovementController extends BaseMovementController {
  update(delta: number, levelRadius: number, numSpokes: number): { x: number; y: number; angle: number; } {
    // Increment angle for circular motion
    const newAngle = this.enemy.angle + delta * 0.5;
    
    const x = Math.cos(newAngle) * this.enemy.distanceFromCenter;
    const y = Math.sin(newAngle) * this.enemy.distanceFromCenter;
    
    return { x, y, angle: newAngle };
  }
}

// Homing movement - enemy seeks the player
export class HomingMovementController extends BaseMovementController {
  update(delta: number, levelRadius: number, numSpokes: number): { x: number; y: number; angle: number; } {
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
    let angleDiff = targetAngle - this.enemy.angle;
    
    // Normalize to between -PI and PI (for shortest turn)
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    // Base turn rate - distance-based for smoother targeting
    // As enemy gets closer to player, it turns more smoothly and precisely
    const distanceFactor = Math.min(0.8, this.enemy.distanceFromCenter / levelRadius);
    const turnRate = 0.8 + (distanceFactor * 0.4); // 0.8-1.2 range
    
    // Apply distance-based behavior dampening
    // Reduce oscillation as enemies get closer to edge (where player is)
    const proximityDampen = 1 - (this.enemy.distanceFromCenter / levelRadius) * 0.8;
    
    // 1. Subtle "hunting" oscillation - reduced when close to player
    const huntingOscillation = Math.sin(this.enemy.distanceFromCenter * 2) * 0.02 * proximityDampen;
    
    // 2. Very mild course corrections - also reduced when close
    const courseCorrection = Math.sin(this.enemy.distanceFromCenter * 3) * 0.02 * proximityDampen;
    
    // 3. Extremely tiny random jitter - just for a touch of life
    const tinyJitter = (Math.random() - 0.5) * 0.01 * proximityDampen;
    
    // Apply basic smooth tracking with minimal irregularities
    // Strict limit on maximum turn per frame
    const maxTurnPerFrame = 0.04; // About 2.3 degrees max per frame
    
    // Calculate total turn amount with reduced irregularities
    let totalTurn = (angleDiff * delta * turnRate) + 
                   huntingOscillation + 
                   courseCorrection + 
                   tinyJitter;
                    
    // Strictly clamp the turn to prevent pendulum effect
    if (totalTurn > maxTurnPerFrame) totalTurn = maxTurnPerFrame;
    if (totalTurn < -maxTurnPerFrame) totalTurn = -maxTurnPerFrame;
    
    // Apply the turn
    const newAngle = this.enemy.angle + totalTurn;
    
    // Calculate new position
    const x = Math.cos(newAngle) * this.enemy.distanceFromCenter;
    const y = Math.sin(newAngle) * this.enemy.distanceFromCenter;
    
    return { x, y, angle: newAngle };
  }
}

// Pi movement - follows Pi symbol
export class PiMovementController extends BaseMovementController {
  update(delta: number, levelRadius: number, numSpokes: number): { x: number; y: number; angle: number; } {
    let x, y;
    let angle = this.enemy.angle;
    
    // Always ensure enemies of type 8 and 9 have pathParams for Pi movement
    if ((this.enemy.type === 8 || this.enemy.type === 9) && !this.enemy.pathParams) {
      this.enemy.pathParams = {
        startAngle: angle,
        spiralTightness: 0.1,
        waveAmplitude: 0.7,
        waveFrequency: 3.0,
        pathOffset: Math.random() * Math.PI * 2
      };
    }
    
    if (this.enemy.pathParams) {
      // Calculate position along pi symbol
      // The pi symbol consists of:
      // 1. A horizontal bar at the top
      // 2. Two vertical lines coming down from the bar

      // Normalize distance to create pi symbol within level radius
      const normalizedDist = this.enemy.distanceFromCenter / levelRadius;
      
      // Random starting position on Pi symbol for enemy types 8 and 9
      if (this.enemy.distanceFromCenter === 0 && (this.enemy.type === 8 || this.enemy.type === 9)) {
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
        angle = Math.atan2(y, x);
        return { x, y, angle };
      }
      
      if (normalizedDist < 0.3) {
        // Initial approach from center
        x =
          this.enemy.pathParams.startAngle < Math.PI
            ? -normalizedDist * levelRadius * 0.5
            : normalizedDist * levelRadius * 0.5;
        y = -normalizedDist * levelRadius * 0.5;
      } else if (normalizedDist < 0.5) {
        // Moving to horizontal bar position
        const t = (normalizedDist - 0.3) / 0.2;
        x =
          this.enemy.pathParams.startAngle < Math.PI
            ? -levelRadius * 0.5 + t * levelRadius
            : levelRadius * 0.5 - t * levelRadius;
        y = -levelRadius * 0.15;
      } else {
        // Moving down vertical line - default positions
        // Determine which leg of Pi to follow based on angle
        let legPosition;
        if (this.enemy.pathParams.startAngle < Math.PI * 0.67) {
          legPosition = -levelRadius * 0.4; // Left leg
        } else if (this.enemy.pathParams.startAngle < Math.PI * 1.33) {
          legPosition = 0; // Middle (for type 9)
        } else {
          legPosition = levelRadius * 0.4; // Right leg
        }
            
        // For crossing pi, allow swapping between legs
        if (this.enemy.movementStyle === "piCrossing" && normalizedDist > 0.7) {
          const crossPhase = Math.floor((normalizedDist - 0.7) * 10);
          if (crossPhase % 2 === 1) {
            // Periodically swap legs
            if (legPosition === -levelRadius * 0.4) {
              legPosition = 0;
            } else if (legPosition === 0) {
              legPosition = legPosition === -levelRadius * 0.4 ? levelRadius * 0.4 : -levelRadius * 0.4;
            } else {
              legPosition = 0;
            }
          }
          
          // Add some subtle horizontal oscillation
          legPosition += Math.sin(normalizedDist * 15) * 0.1 * levelRadius;
        }
        
        x = legPosition;
        y = -levelRadius * 0.15 - (normalizedDist - 0.5) * levelRadius * 0.85;
      }

      // Update angle for proper orientation
      angle = Math.atan2(y, x);
    } else {
      x = Math.cos(angle) * this.enemy.distanceFromCenter;
      y = Math.sin(angle) * this.enemy.distanceFromCenter;
    }
    
    return { x, y, angle };
  }
}

// Spiral movement
export class SpiralMovementController extends BaseMovementController {
  update(delta: number, levelRadius: number, numSpokes: number): { x: number; y: number; angle: number; } {
    let angle = this.enemy.angle;
    
    // Spiral path - angle changes as distance increases
    if (this.enemy.pathParams) {
      if (this.enemy.movementStyle === "spiralCrossing") {
        // Add cross-path variation to the spiral
        angle =
          this.enemy.pathParams.startAngle +
          this.enemy.distanceFromCenter * this.enemy.pathParams.spiralTightness + 
          Math.sin(this.enemy.distanceFromCenter * 0.2) * 0.5; // Add oscillation for crossing
      } else {
        // Regular spiral
        angle =
          this.enemy.pathParams.startAngle +
          this.enemy.distanceFromCenter * this.enemy.pathParams.spiralTightness;
      }
    }
    
    const x = Math.cos(angle) * this.enemy.distanceFromCenter;
    const y = Math.sin(angle) * this.enemy.distanceFromCenter;
    
    return { x, y, angle };
  }
}

// Wave movement
export class WaveMovementController extends BaseMovementController {
  update(delta: number, levelRadius: number, numSpokes: number): { x: number; y: number; angle: number; } {
    let angle = this.enemy.angle;
    
    // Wave path - sinusoidal movement
    if (this.enemy.pathParams) {
      // Base angle determines the spoke we're moving along
      const baseAngle = this.enemy.pathParams.startAngle;
      
      // Calculate wave offset
      let waveOffset = (Math.sin(
        (this.enemy.distanceFromCenter * this.enemy.pathParams.waveFrequency) /
          levelRadius
      ) * this.enemy.pathParams.waveAmplitude) / levelRadius;
      
      // For crossing waves, add an additional perpendicular wave component
      if (this.enemy.movementStyle === "waveCrossing") {
        // Add a secondary wave that's out of phase
        const secondaryWave = (Math.cos(
          (this.enemy.distanceFromCenter * this.enemy.pathParams.waveFrequency * 1.5) /
            levelRadius
        ) * this.enemy.pathParams.waveAmplitude * 0.7) / levelRadius;
        
        // Combine the waves
        waveOffset += secondaryWave;
      }

      angle = baseAngle + waveOffset;
    }
    
    const x = Math.cos(angle) * this.enemy.distanceFromCenter;
    const y = Math.sin(angle) * this.enemy.distanceFromCenter;
    
    return { x, y, angle };
  }
}

// Star movement
export class StarMovementController extends BaseMovementController {
  update(delta: number, levelRadius: number, numSpokes: number): { x: number; y: number; angle: number; } {
    let x, y;
    let angle = this.enemy.angle;
    
    // Star path
    if (this.enemy.pathParams) {
      // Number of star points increases with level
      const starPoints = 3 + (Math.floor(this.enemy.pathParams.waveFrequency * 2) % 5);
      const pointAngle = (Math.PI * 2) / starPoints;

      // Calculate which point we're moving toward
      let pointIndex = Math.floor(
        (this.enemy.pathParams.startAngle / (Math.PI * 2)) * starPoints
      );
      
      // For crossing stars, occasionally jump to a different point
      if (this.enemy.movementStyle === "starCrossing") {
        const jumpPhase = Math.floor(this.enemy.distanceFromCenter / (levelRadius * 0.2));
        if (jumpPhase % 3 === 0 && this.enemy.distanceFromCenter > levelRadius * 0.3) {
          // Jump to a different point randomly
          pointIndex = (pointIndex + 1 + Math.floor(Math.random() * (starPoints - 2))) % starPoints;
        }
      }
      
      const nextPointIndex = (pointIndex + 1) % starPoints;

      // Calculate angle to current and next point
      const currentPointAngle = pointIndex * pointAngle;
      const nextPointAngle = nextPointIndex * pointAngle;

      // Interpolate between inner and outer radius
      const innerRadius = levelRadius * 0.4;
      const outerRadius = levelRadius;

      // Determine if we're moving to outer point or inner corner
      const toOuter = Math.floor((this.enemy.distanceFromCenter / levelRadius) * 10) % 2 === 0;
        
      // For crossing stars, add some oscillation to the angle
      let targetAngle;
      if (toOuter) {
        // Moving to outer point
        targetAngle = currentPointAngle;
        if (this.enemy.movementStyle === "starCrossing") {
          // Add slight wobble when moving to points
          targetAngle += Math.sin(this.enemy.distanceFromCenter * 2) * 0.1;
        }
      } else {
        // Moving to inner corner
        targetAngle = currentPointAngle + pointAngle / 2;
        if (this.enemy.movementStyle === "starCrossing") {
          // Add slight wobble when moving to corners
          targetAngle += Math.cos(this.enemy.distanceFromCenter * 3) * 0.15;
        }
      }
      
      angle = targetAngle;

      const currentRadius = toOuter
        ? innerRadius +
          ((outerRadius - innerRadius) *
            (this.enemy.distanceFromCenter % (levelRadius / 5))) /
            (levelRadius / 5)
        : outerRadius -
          ((outerRadius - innerRadius) *
            (this.enemy.distanceFromCenter % (levelRadius / 5))) /
            (levelRadius / 5);

      x = Math.cos(angle) * currentRadius;
      y = Math.sin(angle) * currentRadius;
    } else {
      x = Math.cos(angle) * this.enemy.distanceFromCenter;
      y = Math.sin(angle) * this.enemy.distanceFromCenter;
    }
    
    return { x, y, angle };
  }
}

// Erratic movement
export class ErraticMovementController extends BaseMovementController {
  update(delta: number, levelRadius: number, numSpokes: number): { x: number; y: number; angle: number; } {
    // Very erratic zig-zag with random direction changes
    const angle = this.enemy.angle + 
      (Math.sin(this.enemy.distanceFromCenter * 0.5) + Math.cos(this.enemy.distanceFromCenter * 0.3)) * 0.2 +
      (Math.random() - 0.5) * 0.1;
    
    const x = Math.cos(angle) * this.enemy.distanceFromCenter;
    const y = Math.sin(angle) * this.enemy.distanceFromCenter;
    
    return { x, y, angle };
  }
}

// Bounce movement
export class BounceMovementController extends BaseMovementController {
  update(delta: number, levelRadius: number, numSpokes: number): { x: number; y: number; angle: number; } {
    let distanceFromCenter = this.enemy.distanceFromCenter;
    const angle = this.enemy.pathParams?.startAngle || this.enemy.angle;
    
    // Calculate bounce effect
    const bouncePhase = Math.floor(distanceFromCenter / (levelRadius * 0.2));
    const bounceProgress = (distanceFromCenter % (levelRadius * 0.2)) / (levelRadius * 0.2);
    
    // If in odd bounce phase, create bounce effect by temporarily reducing distance
    if (bouncePhase % 2 === 1) {
      // Moving inward temporarily
      const bounceAmount = Math.sin(bounceProgress * Math.PI) * (levelRadius * 0.1);
      distanceFromCenter -= bounceAmount;
    }
    
    const x = Math.cos(angle) * distanceFromCenter;
    const y = Math.sin(angle) * distanceFromCenter;
    
    return { x, y, angle };
  }
}

// Linear movement with direction vector
export class LinearMovementController extends BaseMovementController {
  update(delta: number, levelRadius: number, numSpokes: number): { x: number; y: number; angle: number; } {
    let x, y;
    
    if (this.enemy.direction) {
      x = this.enemy.mesh.position.x + this.enemy.direction.x * this.enemy.speed * delta * 30;
      y = this.enemy.mesh.position.y + this.enemy.direction.y * this.enemy.speed * delta * 30;
      this.enemy.distanceFromCenter = Math.sqrt(x * x + y * y);
    } else {
      x = Math.cos(this.enemy.angle) * this.enemy.distanceFromCenter;
      y = Math.sin(this.enemy.angle) * this.enemy.distanceFromCenter;
    }
    
    return { x, y, angle: this.enemy.angle };
  }
}

// Factory function to create the appropriate movement controller
export function createMovementController(movementStyle: string): MovementController {
  switch (movementStyle) {
    case "spoke":
      return new SpokeMovementController();
    case "spokeCrossing":
      return new SpokeCrossingMovementController();
    case "zigzag":
      return new ZigzagMovementController();
    case "circular":
      return new CircularMovementController();
    case "homing":
      return new HomingMovementController();
    case "pi":
    case "piCrossing":
      return new PiMovementController();
    case "spiral":
    case "spiralCrossing":
      return new SpiralMovementController();
    case "wave":
    case "waveCrossing":
      return new WaveMovementController();
    case "star":
    case "starCrossing":
      return new StarMovementController();
    case "erratic":
      return new ErraticMovementController();
    case "bounce":
      return new BounceMovementController();
    case "linear":
      return new LinearMovementController();
    default:
      // Default to spoke movement
      return new SpokeMovementController();
  }
}