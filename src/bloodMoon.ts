import * as THREE from "three";

export class BloodMoon {
  private moonGroup: THREE.Group;
  private moon: THREE.Mesh;
  private glow: THREE.Mesh;
  private craters: THREE.Mesh[] = [];
  private scene: THREE.Scene;

  // Animation properties
  private isFadingOut: boolean = false;
  private fadeStart: number = 0;
  private fadeDuration: number = 2000; // 2 seconds fade-out
  private animationFrame: number | null = null;
  private isShrinking: boolean = false;
  private shrinkStart: number = 0;
  private shrinkDuration: number = 1500; // 1.5 seconds to shrink

  // Materials for opacity control
  private moonMaterial: THREE.MeshBasicMaterial;
  private glowMaterial: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.moonGroup = new THREE.Group();

    // Parameters
    const levelRadius = 10; // Match the game's circular level radius
    const moonSize = 3.2; // Size of the moon
    const moonPosition = {
      x: levelRadius * 0.72,
      y: levelRadius * 0.72,
      z: -10,
    }; // Position at edge of level

    // Set up the moon group position
    this.moonGroup.position.set(moonPosition.x, moonPosition.y, 0);

    // Create the main moon disc
    const moonGeometry = new THREE.CircleGeometry(moonSize, 32);
    this.moonMaterial = new THREE.MeshBasicMaterial({
      color: 0xaa0000, // Deep red base color
      transparent: true,
      opacity: 0.9,
    });
    this.moon = new THREE.Mesh(moonGeometry, this.moonMaterial);
    this.moon.position.set(0, 0, moonPosition.z); // Position relative to group

    // Create outer glow
    const glowSize = moonSize * 1.3;
    const glowGeometry = new THREE.CircleGeometry(glowSize, 32);
    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff3333, // Brighter red for the glow
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });
    this.glow = new THREE.Mesh(glowGeometry, this.glowMaterial);
    this.glow.position.set(0, 0, moonPosition.z - 0.1); // Position relative to group

    // Create surface details (craters)
    this.createCraters(moonSize);

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
   * Fade out the blood moon
   */
  public fadeOut(): void {
    if (!this.isFadingOut) {
      this.isFadingOut = true;
      this.fadeStart = Date.now();
    }
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
   * Reset the blood moon to its original state
   * Call this when re-entering a mode after the moon has been faded out
   */
  public reset(): void {
    // Reset flags
    this.isFadingOut = false;
    this.isShrinking = false;

    // Reset group position to original position
    const levelRadius = 10; // Default level radius
    this.moonGroup.position.set(levelRadius * 0.72, levelRadius * 0.72, 0);

    // Reset scale
    this.moonGroup.scale.set(1, 1, 1);

    // Reset opacities
    this.moonMaterial.opacity = 0.9;
    this.glowMaterial.opacity = 0.25;

    // Reset crater opacities
    this.craters.forEach((crater) => {
      (crater.material as THREE.MeshBasicMaterial).opacity = 0.8;
    });

    // Restart the animation if needed
    if (!this.animationFrame) {
      this.animationFrame = requestAnimationFrame(() => this.animate());
    }
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

    if (this.isFadingOut) {
      // Calculate fade progress
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
    } else if (this.isShrinking) {
      // Calculate shrink progress
      const shrinkProgress = Math.min(
        1,
        (Date.now() - this.shrinkStart) / this.shrinkDuration
      );

      // Ease-in-out function for smooth animation
      const easedProgress =
        shrinkProgress < 0.5
          ? 2 * shrinkProgress * shrinkProgress
          : -1 + (4 - 2 * shrinkProgress) * shrinkProgress;

      // Get current scale and reduce it
      const currentScale = this.moonGroup.scale.x;
      const finalScale = 0.2; // Shrink to 20% of expanded size

      // Calculate new scale
      const newScale =
        currentScale - (currentScale - finalScale) * easedProgress;

      // Apply new scale
      this.moonGroup.scale.set(newScale, newScale, 1);

      // When shrinking is complete, reset isShrinking
      if (shrinkProgress === 1) {
        this.isShrinking = false;
      }
    } else {
      // Subtle pulsing effect on the glow
      this.glow.scale.set(
        1 + Math.sin(time * 0.5) * 0.05,
        1 + Math.sin(time * 0.5) * 0.05,
        1
      );

      // Only apply subtle wobble animation if the moon is at its original position
      // Check if we're at the original position or not
      const isAtOriginalPosition =
        Math.abs(this.moonGroup.position.x - 7.2) < 0.1 &&
        Math.abs(this.moonGroup.position.y - 7.2) < 0.1;

      if (isAtOriginalPosition) {
        // Very subtle movement when at original position
        const wobbleX = Math.cos(time * 0.3) * 0.2;
        const wobbleY = Math.sin(time * 0.2) * 0.3;

        this.moonGroup.position.set(7.2 + wobbleX, 7.2 + wobbleY, 0);
      }
    }

    // Continue animation loop
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }
}
