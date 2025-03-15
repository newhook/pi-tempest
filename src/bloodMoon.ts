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

    // Create the main moon disc
    const moonGeometry = new THREE.CircleGeometry(moonSize, 32);
    this.moonMaterial = new THREE.MeshBasicMaterial({
      color: 0xaa0000, // Deep red base color
      transparent: true,
      opacity: 0.9,
    });
    this.moon = new THREE.Mesh(moonGeometry, this.moonMaterial);
    this.moon.position.set(moonPosition.x, moonPosition.y, moonPosition.z);

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
    this.glow.position.set(
      moonPosition.x,
      moonPosition.y,
      moonPosition.z - 0.1
    );

    // Create surface details (craters)
    this.createCraters(moonPosition, moonSize);

    // Add moon and glow to the group
    this.moonGroup.add(this.glow);
    this.moonGroup.add(this.moon);

    // Add the whole group to the scene
    this.scene.add(this.moonGroup);

    // Start animation
    this.animate();
  }

  /**
   * Create craters on the blood moon
   */
  private createCraters(
    moonPosition: { x: number; y: number; z: number },
    moonSize: number
  ): void {
    const detailCount = 8;

    for (let i = 0; i < detailCount; i++) {
      // Random position within the moon
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * moonSize * 0.7;
      const x = moonPosition.x + Math.cos(angle) * distance;
      const y = moonPosition.y + Math.sin(angle) * distance;

      // Create crater
      const craterSize = 0.2 + Math.random() * 0.6;
      const craterGeometry = new THREE.CircleGeometry(craterSize, 16);
      const craterMaterial = new THREE.MeshBasicMaterial({
        color: 0x770000, // Darker red for craters
        transparent: true,
        opacity: 0.8,
      });
      const crater = new THREE.Mesh(craterGeometry, craterMaterial);
      crater.position.set(x, y, moonPosition.z + 0.1);

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
  public remove(): void {
    // Cancel any ongoing animation
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    // Remove from scene
    this.scene.remove(this.moonGroup);
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
    } else {
      // Subtle pulsing effect on the glow
      this.glow.scale.set(
        1 + Math.sin(time * 0.5) * 0.05,
        1 + Math.sin(time * 0.5) * 0.05,
        1
      );

      // Very subtle movement
      this.moonGroup.position.y = Math.sin(time * 0.2) * 0.3;
      this.moonGroup.position.x = Math.cos(time * 0.3) * 0.2;
    }

    // Continue animation loop
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }
}
