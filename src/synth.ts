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
  
  public playBloodMoonActivation(): void {
    if (!this.isMuted) {
      new BloodMoonSound().play();
    }
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