import * as THREE from "three";

export class BloodMoon {
  private moonGroup: THREE.Group;
  private moon: THREE.Mesh;
  private glow: THREE.Mesh;
  private craters: THREE.Mesh[] = [];
  private scene: THREE.Scene;

  // Animation properties
  private isFadingOut: boolean = false;
  private isFadingIn: boolean = false;
  private fadeStart: number = 0;
  private fadeDuration: number = 2000; // 2 seconds fade duration
  private animationFrame: number | null = null;
  private isShrinking: boolean = false;
  private isGrowing: boolean = false;
  private growthStart: number = 0;
  private growthDuration: number = 60000; // 60 seconds to grow to level boundary
  private shrinkStart: number = 0;
  private shrinkDuration: number = 2000; // 2 seconds to shrink (matching player flight)
  private levelRadius: number = 10; // Default level radius

  // Materials for opacity control
  private moonMaterial: THREE.MeshBasicMaterial;
  private glowMaterial: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.moonGroup = new THREE.Group();

    // Parameters
    this.levelRadius = 10; // Match the game's circular level radius
    const moonSize = 3.2; // Size of the moon
    const moonPosition = {
      x: 0, // Center position
      y: 0, // Center position
      z: -10,
    };

    // Set up the moon group position at the center
    this.moonGroup.position.set(moonPosition.x, moonPosition.y, 0);

    // Create the main moon disc
    const moonGeometry = new THREE.CircleGeometry(moonSize, 32);
    this.moonMaterial = new THREE.MeshBasicMaterial({
      color: 0xaa0000, // Deep red base color
      transparent: true,
      opacity: 0, // Start invisible and fade in
    });
    this.moon = new THREE.Mesh(moonGeometry, this.moonMaterial);
    this.moon.position.set(0, 0, moonPosition.z); // Position relative to group

    // Create outer glow
    const glowSize = moonSize * 1.3;
    const glowGeometry = new THREE.CircleGeometry(glowSize, 32);
    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff3333, // Brighter red for the glow
      transparent: true,
      opacity: 0, // Start invisible and fade in
      blending: THREE.AdditiveBlending,
    });
    this.glow = new THREE.Mesh(glowGeometry, this.glowMaterial);
    this.glow.position.set(0, 0, moonPosition.z - 0.1); // Position relative to group

    // Create surface details (craters)
    this.createCraters(moonSize);

    // Make craters initially invisible
    this.craters.forEach(crater => {
      const material = crater.material as THREE.MeshBasicMaterial;
      material.opacity = 0;
    });

    // Set the initial scale (start small)
    this.moonGroup.scale.set(0.1, 0.1, 1);

    // Add moon and glow to the group
    this.moonGroup.add(this.glow);
    this.moonGroup.add(this.moon);

    // Start animation
    this.animate();
  }

  /**
   * Move the blood moon to the center of the level and resize it
   * @param levelRadius The radius of the current level
   */
  public moveToCenter(levelRadius: number): void {
    // Reset the group position to center
    this.moonGroup.position.set(0, 0, 0);

    // Reset moon and glow positions within the group
    this.moon.position.set(0, 0, -10);
    this.glow.position.set(0, 0, -10.1);

    // Reset crater positions
    this.craters.forEach((crater) => {
      // Keep the crater's x/y offset but center their base position
      const currentX = crater.position.x;
      const currentY = crater.position.y;

      // Calculate offset from parent position
      const offsetX =
        currentX - (this.moonGroup.position.x + this.moon.position.x);
      const offsetY =
        currentY - (this.moonGroup.position.y + this.moon.position.y);

      // Set new position with offset preserved
      crater.position.set(
        this.moon.position.x + offsetX,
        this.moon.position.y + offsetY,
        -9.9
      );
    });

    // Reset any ongoing animation
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    // Reset scale before expanding
    this.moonGroup.scale.set(1, 1, 1);

    // Start expansion animation
    this.expandAnimation(levelRadius);

    console.log("Blood Moon moved to center: ", this.moonGroup.position);
  }

  /**
   * Animate the blood moon expanding to fill the level
   * @param levelRadius The radius to expand to
   */
  private expandAnimation(levelRadius: number): void {
    const originalScale = this.moonGroup.scale.x;
    const targetScale = levelRadius / 3.2; // Based on original moon size
    const duration = 1000; // 1 second for expansion
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-in function
      const easedProgress = progress * progress;

      // Scale the moon group
      const currentScale =
        originalScale + (targetScale - originalScale) * easedProgress;
      this.moonGroup.scale.set(currentScale, currentScale, 1);

      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        // Full expansion reached
        this.isShrinking = false;
      }
    };

    animate();
  }

  /**
   * Start the shrinking animation as player flies toward center
   */
  public startShrinking(): void {
    // Start shrinking animation
    this.isShrinking = true;
    this.shrinkStart = Date.now();
  }

  /**
   * Create craters on the blood moon
   */
  private createCraters(moonSize: number): void {
    const detailCount = 8;

    for (let i = 0; i < detailCount; i++) {
      // Random position within the moon
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * moonSize * 0.7;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      // Create crater
      const craterSize = 0.2 + Math.random() * 0.6;
      const craterGeometry = new THREE.CircleGeometry(craterSize, 16);
      const craterMaterial = new THREE.MeshBasicMaterial({
        color: 0x770000, // Darker red for craters
        transparent: true,
        opacity: 0.8,
      });
      const crater = new THREE.Mesh(craterGeometry, craterMaterial);
      crater.position.set(x, y, -9.9); // Slightly in front of the moon

      this.craters.push(crater);
      this.moonGroup.add(crater);
    }
  }

  /**
   * Fade in the blood moon
   */
  public fadeIn(): void {
    if (!this.isFadingIn) {
      this.isFadingIn = true;
      this.fadeStart = Date.now();
    }
  }

  /**
   * Fade out the blood moon
   */
  public fadeOut(): void {
    if (!this.isFadingOut) {
      this.isFadingOut = true;
      this.fadeStart = Date.now();
    }
  }
  
  /**
   * Start growing the blood moon towards the level boundary
   */
  public startGrowing(): void {
    if (!this.isGrowing) {
      this.isGrowing = true;
      this.growthStart = Date.now();
    }
  }
  
  /**
   * Get the current scale of the blood moon relative to the level radius
   * Returns a value between 0 and 1, where 1 means the moon has reached the level boundary
   */
  public getGrowthProgress(): number {
    if (!this.isGrowing) {
      return 0;
    }
    
    const currentScale = this.moonGroup.scale.x;
    const targetScale = this.levelRadius / 3.2; // Based on original moon size
    
    return Math.min(1, currentScale / targetScale);
  }
  
  /**
   * Get the remaining time in seconds before the blood moon reaches the boundary
   * Returns a value between 0 and the total growth duration in seconds
   */
  public getRemainingTime(): number {
    if (!this.isGrowing) {
      return this.growthDuration / 1000; // Return full duration if not growing yet
    }
    
    const elapsedTime = Date.now() - this.growthStart;
    const remainingTime = Math.max(0, this.growthDuration - elapsedTime);
    
    return Math.ceil(remainingTime / 1000); // Return seconds, rounded up
  }

  /**
   * Immediately remove the blood moon from the scene
   * Use this for cleanup when transitioning between game modes
   */
  public exit(): void {
    // Cancel any ongoing animation
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    // Remove from scene
    this.scene.remove(this.moonGroup);
  }

  /**
   * Reset the blood moon to its initial state at the center
   * Call this when entering a new level
   */
  public reset(): void {
    // Reset flags
    this.isFadingOut = false;
    this.isFadingIn = false;
    this.isShrinking = false;
    this.isGrowing = false;

    // Reset group position to center
    this.moonGroup.position.set(0, 0, 0);

    // Reset to starting scale - slightly larger so it's visible when it fades in
    this.moonGroup.scale.set(0.2, 0.2, 1);

    // Reset opacities to invisible
    this.moonMaterial.opacity = 0;
    this.glowMaterial.opacity = 0;

    // Reset crater opacities
    this.craters.forEach((crater) => {
      (crater.material as THREE.MeshBasicMaterial).opacity = 0;
    });
    
    // Reset colors to default
    this.moonMaterial.color.setRGB(0.67, 0, 0); // Reset to default deep red
    this.glowMaterial.color.setRGB(1, 0.2, 0.2); // Reset to default glow

    // Restart the animation if needed
    if (!this.animationFrame) {
      this.animationFrame = requestAnimationFrame(() => this.animate());
    }
  }
  
  /**
   * Set the level radius for growth calculations
   */
  public setLevelRadius(radius: number): void {
    this.levelRadius = radius;
  }

  /**
   * Get the moon group for attaching to the scene
   */
  public getGroup(): THREE.Group {
    return this.moonGroup;
  }

  /**
   * Enter the scene - called when the active mode enters
   */
  public enter(): void {
    // Reset the blood moon
    this.reset();

    // Add to scene
    this.scene.add(this.moonGroup);
  }

  /**
   * Animate the blood moon
   */
  private animate(): void {
    const time = Date.now() * 0.001;

    if (this.isFadingIn) {
      // Calculate fade-in progress
      const fadeProgress = Math.min(
        1,
        (Date.now() - this.fadeStart) / this.fadeDuration
      );

      // Apply opacity to all elements
      this.moonMaterial.opacity = 0.9 * fadeProgress;
      this.glowMaterial.opacity = 0.25 * fadeProgress;

      this.craters.forEach((crater) => {
        (crater.material as THREE.MeshBasicMaterial).opacity = 0.8 * fadeProgress;
      });

      // When fade-in is complete, reset isFadingIn
      if (fadeProgress === 1) {
        this.isFadingIn = false;
      }
    } else if (this.isFadingOut) {
      // Calculate fade-out progress
      const fadeProgress = Math.min(
        1,
        (Date.now() - this.fadeStart) / this.fadeDuration
      );
      const opacity = 1 - fadeProgress;

      // Apply opacity to all elements
      this.moonMaterial.opacity = 0.9 * opacity;
      this.glowMaterial.opacity = 0.25 * opacity;

      this.craters.forEach((crater) => {
        (crater.material as THREE.MeshBasicMaterial).opacity = 0.8 * opacity;
      });

      // Remove moon group when fully faded out
      if (fadeProgress === 1) {
        this.scene.remove(this.moonGroup);

        // Clean up animation frame to prevent memory leaks
        if (this.animationFrame !== null) {
          cancelAnimationFrame(this.animationFrame);
          this.animationFrame = null;
        }

        return; // Stop animation loop
      }
    } else if (this.isGrowing) {
      // Calculate growth progress
      const growthProgress = Math.min(
        1,
        (Date.now() - this.growthStart) / this.growthDuration
      );

      // Calculate target scale based on level radius
      const targetScale = this.levelRadius / 3.2; // Based on original moon size of 3.2
      
      // Calculate new scale - linear growth
      // Start very small (0.05) and grow to full size (targetScale)
      let newScale = 0.05 + (targetScale - 0.05) * growthProgress;
      
      // If the moon is still invisible (during initial fade-in period),
      // keep the visual scale tiny but let the timer countdown continue
      if (this.moonMaterial.opacity < 0.1) {
        newScale = 0.05; // Stay visually small until fade-in completes
      }
      
      // Apply new scale
      this.moonGroup.scale.set(newScale, newScale, 1);
      
      // When growth is complete, keep the final size
      if (growthProgress === 1) {
        this.isGrowing = false;
      }
    } else if (this.isShrinking) {
      // Calculate shrink progress
      const shrinkProgress = Math.min(
        1,
        (Date.now() - this.shrinkStart) / this.shrinkDuration
      );

      // Use a more dramatic, non-linear shrinking animation
      // Start slowly, then collapse rapidly at the end
      const easedProgress = Math.pow(shrinkProgress, 3); // Cubic easing

      // Get current scale and reduce it
      const currentScale = this.moonGroup.scale.x;
      const finalScale = 0.01; // Shrink to almost nothing (1% of expanded size)

      // Calculate new scale
      const newScale =
        currentScale - (currentScale - finalScale) * easedProgress;

      // Apply new scale
      this.moonGroup.scale.set(newScale, newScale, 1);
      
      // Make the Blood Moon glow more intensely as it collapses
      const glowIntensity = 1 + (1 - shrinkProgress) * 2; // Glow increases then fades
      this.glow.scale.set(
        glowIntensity,
        glowIntensity,
        1
      );
      
      // Change color to become more intense red as it collapses
      const redIntensity = 1 + (1 - Math.pow(shrinkProgress, 2)) * 0.5;
      this.moonMaterial.color.setRGB(redIntensity, 0.2, 0.2);
      this.glowMaterial.color.setRGB(redIntensity, 0.3, 0.3);
      
      // Add some pulsation during collapse
      if (shrinkProgress > 0.5) {
        const pulseRate = 20 + shrinkProgress * 50; // Faster pulsing as it collapses
        const pulseAmount = 0.1 * (1 - shrinkProgress);
        const pulse = 1 + Math.sin(Date.now() * 0.01 * pulseRate) * pulseAmount;
        
        // Apply pulse to opacity
        this.moonMaterial.opacity = 0.9 * pulse;
        this.glowMaterial.opacity = 0.25 * pulse * 3; // Glow pulses more dramatically
      }

      // When shrinking is complete, reset isShrinking
      if (shrinkProgress === 1) {
        this.isShrinking = false;
        
        // Reset appearance
        this.moonMaterial.color.setRGB(0.67, 0, 0); // Back to default deep red
        this.glowMaterial.color.setRGB(1, 0.2, 0.2); // Back to default glow
        
        // The moon should be almost invisible at this point
        this.moonMaterial.opacity = 0.05;
        this.glowMaterial.opacity = 0.01;
      }
    }

    // Always apply subtle pulsing effect on the glow, regardless of other animations
    this.glow.scale.set(
      1 + Math.sin(time * 0.5) * 0.05,
      1 + Math.sin(time * 0.5) * 0.05,
      1
    );

    // Add a subtle wobble to the moon at the center
    if (this.moonGroup.position.x === 0 && this.moonGroup.position.y === 0) {
      // Very subtle movement when at center
      const wobbleX = Math.cos(time * 0.3) * 0.05;
      const wobbleY = Math.sin(time * 0.2) * 0.05;

      // Apply wobble if not zipping across the level
      if (!this.isShrinking) {
        this.moonGroup.position.set(wobbleX, wobbleY, 0);
      }
    }

    // Continue animation loop
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }
}
