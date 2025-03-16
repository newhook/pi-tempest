/**
 * 80s-style retro sound synthesizer for game sound effects
 */

// AudioContext singleton
let audioContextInstance: AudioContext | null = null;
// Track active oscillators/sounds to be able to stop them
let activeSounds: Set<OscillatorNode | AudioBufferSourceNode> = new Set();

// Get or create AudioContext
function getAudioContext(): AudioContext {
  if (!audioContextInstance) {
    audioContextInstance = new AudioContext();
  }
  return audioContextInstance;
}

// Add sound to tracking set
function trackSound(sound: OscillatorNode | AudioBufferSourceNode): void {
  activeSounds.add(sound);
  // Remove from tracking when ended
  sound.onended = () => {
    activeSounds.delete(sound);
  };
}

// Stop all active sounds
function stopAllSounds(): void {
  activeSounds.forEach(sound => {
    try {
      sound.stop();
    } catch (e) {
      // Ignore errors if sound already stopped
    }
  });
  activeSounds.clear();
}

// Base class for all sound effects
class SoundEffect {
  protected context: AudioContext;

  constructor() {
    this.context = getAudioContext();
  }

  play(): void {
    // Override in subclasses
  }
}

// Laser sound (player shooting)
export class LaserSound extends SoundEffect {
  play(): void {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    
    // Connect nodes
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    
    // Configure oscillator
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(1200, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, this.context.currentTime + 0.1);
    
    // Configure gain
    gain.gain.setValueAtTime(0.3, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);
    
    // Start and stop
    oscillator.start();
    oscillator.stop(this.context.currentTime + 0.1);
    
    // Track this sound
    trackSound(oscillator);
  }
}

// Enemy laser sound (different pitch)
export class EnemyLaserSound extends SoundEffect {
  play(): void {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    
    // Connect nodes
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    
    // Configure oscillator
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(800, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, this.context.currentTime + 0.15);
    
    // Configure gain
    gain.gain.setValueAtTime(0.2, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.15);
    
    // Start and stop
    oscillator.start();
    oscillator.stop(this.context.currentTime + 0.15);
    
    // Track this sound
    trackSound(oscillator);
  }
}

// Explosion sound (when enemies die)
export class ExplosionSound extends SoundEffect {
  play(): void {
    const noiseLength = 0.5;
    
    // Create noise node
    const bufferSize = this.context.sampleRate * noiseLength;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill with noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    // Create source
    const noise = this.context.createBufferSource();
    noise.buffer = buffer;
    
    // Create filters for explosion effect
    const lowpass = this.context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1000, this.context.currentTime);
    lowpass.frequency.exponentialRampToValueAtTime(20, this.context.currentTime + noiseLength);
    
    // Create gain node
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.8, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + noiseLength);
    
    // Connect everything
    noise.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.context.destination);
    
    // Play the sound
    noise.start();
    noise.stop(this.context.currentTime + noiseLength);
    
    // Track this sound
    trackSound(noise);
  }
}

// Bigger explosion (player death or bomb)
export class BigExplosionSound extends SoundEffect {
  play(): void {
    const noiseLength = 1;
    
    // Create multiple noise components for a bigger explosion
    this.playExplosionComponent(800, 0, 0.7);
    this.playExplosionComponent(400, 0.05, 0.8);
    this.playExplosionComponent(200, 0.1, 1);
    this.playExplosionComponent(100, 0.2, 0.9);
    this.playExplosionComponent(50, 0.3, 0.7);
  }
  
  private playExplosionComponent(frequency: number, delay: number, volume: number): void {
    // Create oscillator
    const oscillator = this.context.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(frequency, this.context.currentTime + delay);
    oscillator.frequency.exponentialRampToValueAtTime(frequency / 4, this.context.currentTime + delay + 0.5);
    
    // Create noise for texture
    const bufferSize = this.context.sampleRate * 0.5;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.context.createBufferSource();
    noise.buffer = buffer;
    
    // Create gain nodes
    const oscillatorGain = this.context.createGain();
    oscillatorGain.gain.setValueAtTime(volume * 0.5, this.context.currentTime + delay);
    oscillatorGain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + delay + 0.5);
    
    const noiseGain = this.context.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.5, this.context.currentTime + delay);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + delay + 0.5);
    
    // Connect everything
    oscillator.connect(oscillatorGain);
    noise.connect(noiseGain);
    oscillatorGain.connect(this.context.destination);
    noiseGain.connect(this.context.destination);
    
    // Play the sounds
    oscillator.start(this.context.currentTime + delay);
    oscillator.stop(this.context.currentTime + delay + 0.5);
    noise.start(this.context.currentTime + delay);
    noise.stop(this.context.currentTime + delay + 0.5);
    
    // Track these sounds
    trackSound(oscillator);
    trackSound(noise);
  }
}

// Level start sound
export class LevelStartSound extends SoundEffect {
  play(): void {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((frequency, index) => {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      
      oscillator.type = 'square';
      oscillator.frequency.value = frequency;
      
      const startTime = this.context.currentTime + index * 0.15;
      const duration = 0.15;
      
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
      
      // Track this sound
      trackSound(oscillator);
    });
  }
}

// Level completion victory sound
export class LevelCompleteSound extends SoundEffect {
  play(): void {
    const baseNotes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const notes = [...baseNotes, 1318.51, 1567.98]; // Add E6, G6
    
    // Play arpeggiated chord
    notes.forEach((frequency, index) => {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      
      // Add chorus effect with secondary oscillator
      const detuneOsc = this.context.createOscillator();
      const detuneGain = this.context.createGain();
      
      // Connect main oscillator
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      
      // Connect chorus oscillator
      detuneOsc.connect(detuneGain);
      detuneGain.connect(this.context.destination);
      
      // Configure oscillators
      oscillator.type = 'square';
      oscillator.frequency.value = frequency;
      
      detuneOsc.type = 'triangle'; 
      detuneOsc.frequency.value = frequency * 1.005; // Slight detuning for chorus effect
      
      const startTime = this.context.currentTime + index * 0.1;
      const duration = 0.3;
      
      // Main oscillator envelope
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      // Chorus oscillator envelope (quieter)
      detuneGain.gain.setValueAtTime(0.1, startTime);
      detuneGain.gain.linearRampToValueAtTime(0.15, startTime + 0.1);
      detuneGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      // Start and stop both oscillators
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
      
      detuneOsc.start(startTime);
      detuneOsc.stop(startTime + duration);
      
      // Track these sounds
      trackSound(oscillator);
      trackSound(detuneOsc);
    });
    
    // Add final triumphant chord
    setTimeout(() => {
      const chordFrequencies = [523.25, 659.25, 783.99, 1046.50]; // C major chord
      
      chordFrequencies.forEach(frequency => {
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        
        oscillator.connect(gain);
        gain.connect(this.context.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        
        gain.gain.setValueAtTime(0.15, this.context.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, this.context.currentTime + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 1.0);
        
        oscillator.start();
        oscillator.stop(this.context.currentTime + 1.0);
        
        // Track this sound
        trackSound(oscillator);
      });
    }, notes.length * 100 + 50);
  }
}

// Power-up collected sound
export class PowerUpSound extends SoundEffect {
  play(): void {
    const startFreq = 600;
    const endFreq = 1200;
    const duration = 0.4;
    
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(startFreq, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, this.context.currentTime + duration);
    
    gain.gain.setValueAtTime(0.3, this.context.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, this.context.currentTime + duration / 2);
    gain.gain.linearRampToValueAtTime(0.01, this.context.currentTime + duration);
    
    oscillator.start();
    oscillator.stop(this.context.currentTime + duration);
    
    // Track this sound
    trackSound(oscillator);
  }
}

// Countdown timer sound (beeping that accelerates)
export class CountdownSound extends SoundEffect {
  private intervalId: number | null = null;
  private beepRate: number = 1000; // Start at 1 beep per second
  private minRate: number = 100; // Fastest beeping rate in ms
  
  play(): void {
    this.beep(); // Initial beep
    
    // Set up recurring beeps that accelerate
    this.intervalId = window.setInterval(() => {
      this.beep();
      
      // Accelerate the beeping (decrease interval time)
      if (this.beepRate > this.minRate) {
        this.beepRate = Math.max(this.minRate, this.beepRate * 0.9);
        
        // Clear and restart interval with new timing
        if (this.intervalId !== null) {
          window.clearInterval(this.intervalId);
          this.intervalId = window.setInterval(() => {
            this.beep();
          }, this.beepRate);
        }
      }
    }, this.beepRate);
  }
  
  private beep(): void {
    // Create a short beep sound
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    
    // Connect nodes
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    
    // Configure oscillator for alarm-like sound
    oscillator.type = 'square';
    oscillator.frequency.value = 880; // A5 - high pitched beep
    
    // Short beep envelope
    const beepDuration = 0.08;
    gain.gain.setValueAtTime(0.0, this.context.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.context.currentTime + 0.01);
    gain.gain.setValueAtTime(0.3, this.context.currentTime + beepDuration - 0.02);
    gain.gain.linearRampToValueAtTime(0.0, this.context.currentTime + beepDuration);
    
    // Start and stop
    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + beepDuration);
    
    // Track this sound
    trackSound(oscillator);
  }
  
  stop(): void {
    // Clean up interval if it exists
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Ship flying sound
export class ShipFlyingSound extends SoundEffect {
  private stopTime: number = 0;
  private oscillators: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  
  play(): void {
    // Create main engine sound - sweeping frequency
    const mainOsc = this.context.createOscillator();
    const mainGain = this.context.createGain();
    
    // Create filter for engine sound
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.context.currentTime);
    filter.frequency.linearRampToValueAtTime(2000, this.context.currentTime + 2);
    filter.Q.value = 5;
    
    // Connect nodes
    mainOsc.connect(filter);
    filter.connect(mainGain);
    mainGain.connect(this.context.destination);
    
    // Configure oscillator
    mainOsc.type = 'sawtooth';
    mainOsc.frequency.setValueAtTime(100, this.context.currentTime);
    mainOsc.frequency.exponentialRampToValueAtTime(800, this.context.currentTime + 2);
    
    // Configure gain - ramp up then sustain
    mainGain.gain.setValueAtTime(0.01, this.context.currentTime);
    mainGain.gain.linearRampToValueAtTime(0.15, this.context.currentTime + 0.5);
    
    // Create secondary effect - pulsing high frequency
    const pulseOsc = this.context.createOscillator();
    const pulseGain = this.context.createGain();
    
    pulseOsc.connect(pulseGain);
    pulseGain.connect(this.context.destination);
    
    pulseOsc.type = 'sine';
    pulseOsc.frequency.setValueAtTime(1200, this.context.currentTime);
    pulseOsc.frequency.linearRampToValueAtTime(3000, this.context.currentTime + 2);
    
    // Pulse the volume for effect
    const pulseRate = 8; // Hz
    for (let i = 0; i < 16; i++) {
      const t = this.context.currentTime + i/pulseRate;
      const pulseVal = i % 2 === 0 ? 0.1 : 0.01;
      pulseGain.gain.setValueAtTime(pulseVal, t);
    }
    
    // Start oscillators
    mainOsc.start();
    pulseOsc.start();
    
    // Store for stopping later
    this.oscillators = [mainOsc, pulseOsc];
    this.gains = [mainGain, pulseGain];
    this.stopTime = this.context.currentTime + 2; // Default stop time
    
    // Track these sounds
    trackSound(mainOsc);
    trackSound(pulseOsc);
  }
  
  stop(): void {
    const fadeOutTime = 0.3;
    const now = this.context.currentTime;
    
    // Fade out all gains
    this.gains.forEach(gain => {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + fadeOutTime);
    });
    
    // Stop all oscillators after fade out
    this.oscillators.forEach(osc => {
      osc.stop(now + fadeOutTime + 0.01);
    });
  }
}

// Blood moon activation sound
export class BloodMoonSound extends SoundEffect {
  play(): void {
    // Create deep, ominous sound
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    
    // Connect nodes
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    
    // Configure oscillator
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(100, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(40, this.context.currentTime + 1.5);
    
    // Configure filter
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.context.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, this.context.currentTime + 1.5);
    filter.Q.value = 5;
    
    // Configure gain
    gain.gain.setValueAtTime(0.01, this.context.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, this.context.currentTime + 0.5);
    gain.gain.linearRampToValueAtTime(0.01, this.context.currentTime + 1.5);
    
    // Start and stop
    oscillator.start();
    oscillator.stop(this.context.currentTime + 1.5);
    
    // Track this sound
    trackSound(oscillator);
  }
}

// Sound manager that can be used throughout the game
export class SoundManager {
  private static instance: SoundManager;
  private isMuted: boolean = false;
  
  private constructor() {
    // Initialize AudioContext on first user interaction
    document.addEventListener('click', () => getAudioContext(), { once: true });
  }
  
  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }
  
  public playLaser(): void {
    if (!this.isMuted) {
      new LaserSound().play();
    }
  }
  
  public playEnemyLaser(): void {
    if (!this.isMuted) {
      new EnemyLaserSound().play();
    }
  }
  
  public playExplosion(): void {
    if (!this.isMuted) {
      new ExplosionSound().play();
    }
  }
  
  public playBigExplosion(): void {
    if (!this.isMuted) {
      new BigExplosionSound().play();
    }
  }
  
  public playLevelStart(): void {
    if (!this.isMuted) {
      new LevelStartSound().play();
    }
  }
  
  public playPowerUp(): void {
    if (!this.isMuted) {
      new PowerUpSound().play();
    }
  }
  
  public playLevelComplete(): void {
    if (!this.isMuted) {
      new LevelCompleteSound().play();
    }
  }
  
  public playBloodMoonActivation(): void {
    if (!this.isMuted) {
      new BloodMoonSound().play();
    }
  }
  
  // For ship flying to center
  public playShipFlying(): ShipFlyingSound {
    if (!this.isMuted) {
      const flyingSound = new ShipFlyingSound();
      flyingSound.play();
      return flyingSound;
    }
    return new ShipFlyingSound(); // Return dummy instance if muted
  }
  
  // For final countdown timer
  public playCountdown(): CountdownSound {
    if (!this.isMuted) {
      const countdownSound = new CountdownSound();
      countdownSound.play();
      return countdownSound;
    }
    return new CountdownSound(); // Return dummy instance if muted
  }
  
  public mute(): void {
    this.isMuted = true;
  }
  
  public unmute(): void {
    this.isMuted = false;
  }
  
  public toggleMute(): void {
    this.isMuted = !this.isMuted;
  }
  
  public isSoundMuted(): boolean {
    return this.isMuted;
  }
  
  public stopAllSounds(): void {
    stopAllSounds();
  }
}