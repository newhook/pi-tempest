import * as THREE from "three";

export function createBloodMoon(scene: THREE.Scene): () => void {
  console.log("Creating blood moon");
  // Create blood moon group
  const moonGroup = new THREE.Group();

  // Parameters
  const levelRadius = 10; // Match the game's circular level radius
  const moonSize = 3.2; // Size of the moon
  const moonPosition = { x: levelRadius * 0.72, y: levelRadius * 0.72, z: -10 }; // Position at edge of level

  // Create the main moon disc
  const moonGeometry = new THREE.CircleGeometry(moonSize, 32);
  const moonMaterial = new THREE.MeshBasicMaterial({
    color: 0xaa0000, // Deep red base color
    transparent: true,
    opacity: 0.9,
  });
  const moon = new THREE.Mesh(moonGeometry, moonMaterial);
  moon.position.set(moonPosition.x, moonPosition.y, moonPosition.z);

  // Create outer glow
  const glowSize = moonSize * 1.3;
  const glowGeometry = new THREE.CircleGeometry(glowSize, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xff3333, // Brighter red for the glow
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.set(moonPosition.x, moonPosition.y, moonPosition.z - 0.1);

  // Create surface details (craters)
  const detailCount = 8;
  const craters: THREE.Mesh[] = [];
  
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
    
    craters.push(crater);
    moonGroup.add(crater);
  }

  // Add moon and glow to the group
  moonGroup.add(glow);
  moonGroup.add(moon);

  // Add the whole group to the scene
  scene.add(moonGroup);
  
  // Fade-out state
  let isFadingOut = false;
  let fadeStart = 0;
  const fadeDuration = 2000; // 2 seconds fade-out
  
  // Function to fade out the blood moon
  const fadeOut = () => {
    if (!isFadingOut) {
      isFadingOut = true;
      fadeStart = Date.now();
    }
  };

  // Animate the blood moon with a subtle pulsing effect
  function animateMoon() {
    const time = Date.now() * 0.001;
    
    if (isFadingOut) {
      // Calculate fade progress
      const fadeProgress = Math.min(1, (Date.now() - fadeStart) / fadeDuration);
      const opacity = 1 - fadeProgress;
      
      // Apply opacity to all elements
      moonMaterial.opacity = 0.9 * opacity;
      glowMaterial.opacity = 0.25 * opacity;
      
      craters.forEach(crater => {
        (crater.material as THREE.MeshBasicMaterial).opacity = 0.8 * opacity;
      });
      
      // Remove moon group when fully faded out
      if (fadeProgress === 1) {
        scene.remove(moonGroup);
        return; // Stop animation loop
      }
    } else {
      // Subtle pulsing effect on the glow
      glow.scale.set(
        1 + Math.sin(time * 0.5) * 0.05,
        1 + Math.sin(time * 0.5) * 0.05,
        1
      );

      // Very subtle movement
      moonGroup.position.y = Math.sin(time * 0.2) * 0.3;
      moonGroup.position.x = Math.cos(time * 0.3) * 0.2;
    }

    requestAnimationFrame(animateMoon);
  }

  animateMoon();
  
  // Return the fade out function
  return fadeOut;
}