/**
 * 80s-style retro sound synthesizer for game sound effects
 */

// AudioContext singleton
let audioContextInstance: AudioContext | null = null;
// Track active oscillators/sounds to be able to stop them
let activeSounds: Set<OscillatorNode | AudioBufferSourceNode> = new Set();
// Track background music
let backgroundMusicInstance: BackgroundMusic | null = null;
// Track current countdown time (for music tempo adjustment)
let currentCountdownSeconds: number = 60;

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
  activeSounds.forEach((sound) => {
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
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(1200, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      400,
      this.context.currentTime + 0.1
    );

    // Configure gain
    gain.gain.setValueAtTime(0.3, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      this.context.currentTime + 0.1
    );

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
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(800, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      200,
      this.context.currentTime + 0.15
    );

    // Configure gain
    gain.gain.setValueAtTime(0.2, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      this.context.currentTime + 0.15
    );

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
    const buffer = this.context.createBuffer(
      1,
      bufferSize,
      this.context.sampleRate
    );
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
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(1000, this.context.currentTime);
    lowpass.frequency.exponentialRampToValueAtTime(
      20,
      this.context.currentTime + noiseLength
    );

    // Create gain node
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.8, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      this.context.currentTime + noiseLength
    );

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

  private playExplosionComponent(
    frequency: number,
    delay: number,
    volume: number
  ): void {
    // Create oscillator
    const oscillator = this.context.createOscillator();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(
      frequency,
      this.context.currentTime + delay
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      frequency / 4,
      this.context.currentTime + delay + 0.5
    );

    // Create noise for texture
    const bufferSize = this.context.sampleRate * 0.5;
    const buffer = this.context.createBuffer(
      1,
      bufferSize,
      this.context.sampleRate
    );
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.context.createBufferSource();
    noise.buffer = buffer;

    // Create gain nodes
    const oscillatorGain = this.context.createGain();
    oscillatorGain.gain.setValueAtTime(
      volume * 0.5,
      this.context.currentTime + delay
    );
    oscillatorGain.gain.exponentialRampToValueAtTime(
      0.01,
      this.context.currentTime + delay + 0.5
    );

    const noiseGain = this.context.createGain();
    noiseGain.gain.setValueAtTime(
      volume * 0.5,
      this.context.currentTime + delay
    );
    noiseGain.gain.exponentialRampToValueAtTime(
      0.01,
      this.context.currentTime + delay + 0.5
    );

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
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((frequency, index) => {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();

      oscillator.connect(gain);
      gain.connect(this.context.destination);

      oscillator.type = "square";
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
    const baseNotes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
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
      oscillator.type = "square";
      oscillator.frequency.value = frequency;

      detuneOsc.type = "triangle";
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
      const chordFrequencies = [523.25, 659.25, 783.99, 1046.5]; // C major chord

      chordFrequencies.forEach((frequency) => {
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();

        oscillator.connect(gain);
        gain.connect(this.context.destination);

        oscillator.type = "sine";
        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(0.15, this.context.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, this.context.currentTime + 0.2);
        gain.gain.exponentialRampToValueAtTime(
          0.01,
          this.context.currentTime + 1.0
        );

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

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(startFreq, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      endFreq,
      this.context.currentTime + duration
    );

    gain.gain.setValueAtTime(0.3, this.context.currentTime);
    gain.gain.linearRampToValueAtTime(
      0.4,
      this.context.currentTime + duration / 2
    );
    gain.gain.linearRampToValueAtTime(
      0.01,
      this.context.currentTime + duration
    );

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
    oscillator.type = "square";
    oscillator.frequency.value = 880; // A5 - high pitched beep

    // Short beep envelope
    const beepDuration = 0.08;
    gain.gain.setValueAtTime(0.0, this.context.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.context.currentTime + 0.01);
    gain.gain.setValueAtTime(
      0.3,
      this.context.currentTime + beepDuration - 0.02
    );
    gain.gain.linearRampToValueAtTime(
      0.0,
      this.context.currentTime + beepDuration
    );

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
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, this.context.currentTime);
    filter.frequency.linearRampToValueAtTime(
      2000,
      this.context.currentTime + 2
    );
    filter.Q.value = 5;

    // Connect nodes
    mainOsc.connect(filter);
    filter.connect(mainGain);
    mainGain.connect(this.context.destination);

    // Configure oscillator
    mainOsc.type = "sawtooth";
    mainOsc.frequency.setValueAtTime(100, this.context.currentTime);
    mainOsc.frequency.exponentialRampToValueAtTime(
      800,
      this.context.currentTime + 2
    );

    // Configure gain - ramp up then sustain
    mainGain.gain.setValueAtTime(0.01, this.context.currentTime);
    mainGain.gain.linearRampToValueAtTime(0.15, this.context.currentTime + 0.5);

    // Create secondary effect - pulsing high frequency
    const pulseOsc = this.context.createOscillator();
    const pulseGain = this.context.createGain();

    pulseOsc.connect(pulseGain);
    pulseGain.connect(this.context.destination);

    pulseOsc.type = "sine";
    pulseOsc.frequency.setValueAtTime(1200, this.context.currentTime);
    pulseOsc.frequency.linearRampToValueAtTime(
      3000,
      this.context.currentTime + 2
    );

    // Pulse the volume for effect
    const pulseRate = 8; // Hz
    for (let i = 0; i < 16; i++) {
      const t = this.context.currentTime + i / pulseRate;
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
    this.gains.forEach((gain) => {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + fadeOutTime);
    });

    // Stop all oscillators after fade out
    this.oscillators.forEach((osc) => {
      osc.stop(now + fadeOutTime + 0.01);
    });
  }
}

// Background music synth track
export class BackgroundMusic extends SoundEffect {
  // Master volume control for all elements of the background music (0.0 to 1.0)
  private masterVolume: number = 0.4;
  private running: boolean = false;
  private arpeggiator: any = null;
  private bassline: any = null;
  private pad: any = null;
  private lead: any = null;
  private bpm: number = 120;
  private key: string = "c"; // Base key
  private scale: string = "minor"; // Scale type
  private barCount: number = 0; // Track musical progress
  private patternPosition: number = 0;
  private currentSection: number = 0; // Track musical section (intro, verse, etc)

  // Notes for scales (by semitone steps from root)
  private scaleNotes = {
    minor: [0, 2, 3, 5, 7, 8, 10],
    major: [0, 2, 4, 5, 7, 9, 11],
    minorPentatonic: [0, 3, 5, 7, 10],
    majorPentatonic: [0, 2, 4, 7, 9],
  };

  // Root note frequencies
  private rootNotes = {
    c: 65.41, // C2
    d: 73.42,
    e: 82.41,
    f: 87.31,
    g: 98.0,
    a: 110.0,
    b: 123.47,
  };

  // Melodic patterns for lead (scale degrees)
  private leadPatterns = [
    // Main theme (2-bar phrase)
    [0, 2, 4, 7, 4, 2, 0, -1, 0, 2, 4, 7, 9, 7, 4, 2],
    // Secondary theme (variation)
    [4, 7, 9, 7, 4, 2, 0, 2, 4, 2, 0, -1, 0, 2, 4, 7],
    // Third theme (bridge section)
    [7, 6, 4, 2, 0, 2, 4, 7, 7, 6, 4, 2, 4, 2, 0, -3],
  ];

  // Chord progression arrays (scale degrees of root notes)
  private chordProgressions = [
    // i - VI - VII - i (common minor progression)
    [0, 5, 6, 0],
    // i - iv - v - i (minor with subdominant)
    [0, 3, 4, 0],
    // i - VI - III - VII (more movement)
    [0, 5, 2, 6],
  ];

  // Sequences for arpeggios (relative to chord root)
  private arpPatterns = [
    [0, 2, 4, 7], // Root triad + 7th
    [0, 4, 7, 4], // Up and down
    [0, 7, 4, 7], // Root-5th-3rd-5th
    [0, 4, 7, 12], // Root up to octave
    [7, 4, 0, 4], // Descending then rising
  ];

  // Bassline patterns (relative to chord root)
  private bassPatterns = [
    [0, 0, 7, 0], // Root-root-fifth-root
    [0, 7, 5, 7], // Root-fifth-fourth-fifth
    [0, 3, 5, 7], // Rising scale fragment
    [0, 0, 0, 7], // Three roots then fifth
    [0, -5, 0, 7], // Root down a fourth up to fifth
  ];

  constructor() {
    super();

    // Start with first progression, first pattern
    this.currentArpPattern = 0;
    this.currentBassPattern = 0;
    this.currentProgression = 0;
    this.currentLeadPattern = 0;

    // Set to minor pentatonic for lead melody
    this.leadScale = "minorPentatonic";
  }

  private currentArpPattern: number = 0;
  private currentBassPattern: number = 0;
  private currentProgression: number = 0;
  private currentLeadPattern: number = 0;
  private leadScale: string = "minorPentatonic";
  private currentChord: number = 0;
  private currentBar: number = 0;

  // Generate a note frequency based on scale degree in selected scale
  private getNoteFrequency(
    degree: number,
    octave: number = 0,
    scaleType: string = this.scale
  ): number {
    const rootFreq = this.rootNotes[this.key];
    const scaleArray = this.scaleNotes[scaleType];

    // Handle negative scale degrees (going below the root)
    let adjustedDegree = degree;
    let octaveAdjust = 0;

    while (adjustedDegree < 0) {
      adjustedDegree += scaleArray.length;
      octaveAdjust -= 1;
    }

    const scaleNote = scaleArray[adjustedDegree % scaleArray.length];
    const octaveOffset =
      Math.floor(adjustedDegree / scaleArray.length) + octaveAdjust;

    // Calculate frequency using equal temperament formula: f = rootFreq * 2^(n/12)
    // where n is the number of semitones from the root
    return (
      rootFreq * Math.pow(2, (scaleNote + (octave + octaveOffset) * 12) / 12)
    );
  }

  // Get semitone of a scale degree in a given scale
  private getSemitone(degree: number, scaleType: string = this.scale): number {
    const scaleArray = this.scaleNotes[scaleType];

    // Handle negative scale degrees (going below the root)
    let adjustedDegree = degree;
    let octaveAdjust = 0;

    while (adjustedDegree < 0) {
      adjustedDegree += scaleArray.length;
      octaveAdjust -= 1;
    }

    const scaleNote = scaleArray[adjustedDegree % scaleArray.length];
    const octaveOffset =
      Math.floor(adjustedDegree / scaleArray.length) + octaveAdjust;

    return scaleNote + octaveOffset * 12;
  }

  play(): void {
    if (this.running) return; // Already playing
    this.running = true;

    // Reset music state
    this.barCount = 0;
    this.patternPosition = 0;
    this.currentSection = 0;
    this.currentChord = 0;
    this.currentBar = 0;

    // Start the various musical elements
    this.startBassline();
    this.startArpeggiator();
    this.startPad();
    this.startLead();

    // Every 8 bars (32 beats), potentially change musical section
    setInterval(() => {
      if (!this.running) return;

      this.barCount += 8;

      // Move to next section every 16 or 24 bars for musical development
      if (this.barCount % 16 === 0) {
        this.changeSection();
      }
    }, this.getTimingMs() * 32); // 8 bars
  }

  // Change musical section for variety
  private changeSection(): void {
    // Advance to next section (with wraparound)
    this.currentSection = (this.currentSection + 1) % 3;

    // Each section has distinct musical characteristics
    switch (this.currentSection) {
      case 0: // "Verse" section
        this.currentProgression = 0;
        this.currentArpPattern = Math.floor(Math.random() * 3);
        this.currentBassPattern = 0;
        this.currentLeadPattern = 0;
        break;

      case 1: // "Chorus" section - more movement
        this.currentProgression = 1;
        this.currentArpPattern = 3;
        this.currentBassPattern = 2;
        this.currentLeadPattern = 1;
        break;

      case 2: // "Bridge" section - most variation
        this.currentProgression = 2;
        this.currentArpPattern = 4;
        this.currentBassPattern = 4;
        this.currentLeadPattern = 2;
        break;
    }
  }

  // Get timing in milliseconds for one beat at current BPM
  private getTimingMs(): number {
    return 60000 / this.bpm;
  }

  // Get timing in seconds for one beat at current BPM
  private getTiming(): number {
    return 60 / this.bpm;
  }

  // Get current chord root note based on progression position
  private getCurrentChordRoot(): number {
    // Get the current chord's root scale degree from the progression
    return this.chordProgressions[this.currentProgression][this.currentChord];
  }

  // Advance to next chord in progression
  private advanceChord(): void {
    this.currentChord =
      (this.currentChord + 1) %
      this.chordProgressions[this.currentProgression].length;

    // Track bar position (each chord lasts 1 bar)
    this.currentBar = (this.currentBar + 1) % 4;

    // If we completed a 4-bar phrase, increment phrase counter
    if (this.currentBar === 0) {
      this.patternPosition = 0; // Reset lead pattern position at phrase boundaries
    }
  }

  private startArpeggiator(): void {
    const playArpNote = () => {
      if (!this.running) return;

      // Get the current pattern
      const pattern = this.arpPatterns[this.currentArpPattern];
      const pos = this.patternPosition % pattern.length;

      // Get the current chord's root scale degree
      const chordRoot = this.getCurrentChordRoot();

      // Calculate actual scale degree by adding pattern value to chord root
      const scaleDegree = chordRoot + pattern[pos];

      // Create oscillator for this note
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();

      // Add detune for slight pitch variance
      osc.detune.value = Math.random() * 6 - 3;

      // Arpeggios use higher octaves
      const freq = this.getNoteFrequency(scaleDegree, 2);

      // Configure sound - use triangle for a softer sound
      osc.type = "triangle";
      osc.frequency.value = freq;

      // Apply filter
      const filter = this.context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 3000;
      filter.Q.value = 2;

      // Set up signal chain
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.context.destination);

      // Rhythmic variation - emphasize first beat of each group
      const emphasis = pos === 0 ? 1.2 : 1.0;

      // Note envelope
      const noteLength = this.getTiming() * 0.7; // 70% of beat length
      const arpVolume = 0.12 * this.masterVolume * emphasis;
      gain.gain.setValueAtTime(0, this.context.currentTime);
      gain.gain.linearRampToValueAtTime(
        arpVolume,
        this.context.currentTime + 0.02
      );
      gain.gain.setValueAtTime(
        arpVolume,
        this.context.currentTime + noteLength * 0.6
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.context.currentTime + noteLength
      );

      // Start and stop
      osc.start();
      osc.stop(this.context.currentTime + noteLength);

      // Track this sound
      trackSound(osc);

      // Increment pattern position
      this.patternPosition = (this.patternPosition + 1) % 16;

      // Change chord every 4 beats (1 bar)
      if (this.patternPosition % 4 === 0 && this.patternPosition > 0) {
        this.advanceChord();
      }

      // Schedule next note
      if (this.running) {
        this.arpeggiator = setTimeout(playArpNote, this.getTimingMs() / 2); // 8th notes (2 per beat)
      }
    };

    // Start the first note
    playArpNote();
  }

  private startBassline(): void {
    const playBassNote = () => {
      if (!this.running) return;

      // Get current pattern
      const pattern = this.bassPatterns[this.currentBassPattern];
      const pos = Math.floor(this.patternPosition / 2) % pattern.length; // One bass note per two 8th notes

      // Get the current chord's root scale degree
      const chordRoot = this.getCurrentChordRoot();

      // Calculate actual scale degree by adding pattern value to chord root
      const scaleDegree = chordRoot + pattern[pos];

      // Create oscillator for bass note
      const osc1 = this.context.createOscillator();
      const osc2 = this.context.createOscillator();
      const gain = this.context.createGain();

      // Bass uses low octave
      const freq = this.getNoteFrequency(scaleDegree, 0);

      // Two oscillators for richer bass sound
      osc1.type = "triangle";
      osc1.frequency.value = freq;

      osc2.type = "sine";
      osc2.frequency.value = freq / 2; // One octave lower
      osc2.detune.value = -5; // Slight detune for fatness

      // Filter for bass sound
      const filter = this.context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 800;
      filter.Q.value = 1;

      // Set up signal chain
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.context.destination);

      // Rhythmic variation - emphasize beat 1
      const emphasis = pos === 0 ? 1.3 : 1.0;

      // Note envelope - slightly different for different positions
      const noteLength = this.getTiming() * 0.85; // 85% of beat length
      const bassVolume = 0.22 * this.masterVolume * emphasis;
      gain.gain.setValueAtTime(0, this.context.currentTime);
      gain.gain.linearRampToValueAtTime(
        bassVolume,
        this.context.currentTime + 0.05
      );

      if (pos === 0 || pos === 2) {
        // Longer notes on beats 1 and 3
        gain.gain.setValueAtTime(
          bassVolume,
          this.context.currentTime + noteLength * 0.7
        );
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          this.context.currentTime + noteLength
        );
      } else {
        // Shorter notes on beats 2 and 4
        gain.gain.setValueAtTime(
          bassVolume,
          this.context.currentTime + noteLength * 0.5
        );
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          this.context.currentTime + noteLength * 0.8
        );
      }

      // Start and stop
      osc1.start();
      osc1.stop(this.context.currentTime + noteLength);
      osc2.start();
      osc2.stop(this.context.currentTime + noteLength);

      // Track these sounds
      trackSound(osc1);
      trackSound(osc2);

      // Schedule next bass note
      if (this.running) {
        this.bassline = setTimeout(playBassNote, this.getTimingMs() / 2); // 8th notes for more movement
      }
    };

    // Start the first bass note
    playBassNote();
  }

  private startPad(): void {
    const playPadChord = () => {
      if (!this.running) return;

      // Get the current chord's root scale degree
      const chordRoot = this.getCurrentChordRoot();

      // Chord structure: depends on section
      // For minor chords: root, minor third, fifth
      // For major chords: root, major third, fifth
      let chordType = "minor";
      let chordIntervals = [0, 3, 7]; // Minor triad by default

      // Determine chord type based on scale degree and scale
      if (this.scale === "minor") {
        // In minor: i, iv, v are minor; III, VI, VII are major
        if (chordRoot === 2 || chordRoot === 5 || chordRoot === 6) {
          chordType = "major";
          chordIntervals = [0, 4, 7]; // Major triad
        }
      } else {
        // In major: I, IV, V are major; ii, iii, vi are minor
        if (chordRoot === 0 || chordRoot === 3 || chordRoot === 4) {
          chordType = "major";
          chordIntervals = [0, 4, 7]; // Major triad
        }
      }

      // Add 7th for more complex harmony in some sections
      if (this.currentSection === 1 || this.currentSection === 2) {
        // Add 7th (minor 7th for minor chords, major 7th for major chords)
        chordIntervals.push(chordType === "minor" ? 10 : 11);
      }

      // Play each note of the chord
      chordIntervals.forEach((interval, i) => {
        // Create oscillator for this chord tone
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        // Calculate actual scale degree by adding interval to chord root
        const scaleDegree = chordRoot + Math.floor(interval / 12); // Handle octave part
        const semitoneOffset = interval % 12; // Handle semitone part

        // Get base frequency for scale degree
        const baseSemitone = this.getSemitone(scaleDegree);
        const freq =
          this.rootNotes[this.key] *
          Math.pow(2, (baseSemitone + semitoneOffset) / 12);

        // Pads use middle octave
        const octaveOffset = 1;
        const finalFreq = freq * Math.pow(2, octaveOffset);

        // Configure sound - use sine for smooth pads
        osc.type = "sine";
        osc.frequency.value = finalFreq;

        // Add chorus effect with slight detuning
        const detune = Math.random() * 10 - 5 - i * 2; // Progressive detuning per voice
        osc.detune.value = detune;

        // Add vibrato for expression
        const vibratoOsc = this.context.createOscillator();
        const vibratoGain = this.context.createGain();
        vibratoOsc.frequency.value = 5 + Math.random() * 2; // 5-7 Hz vibrato
        vibratoGain.gain.value = 2 + Math.random() * 2; // 2-4 cents vibrato depth
        vibratoOsc.connect(vibratoGain);
        vibratoGain.connect(osc.detune);
        vibratoOsc.start();
        vibratoOsc.stop(this.context.currentTime + 16 * this.getTiming());
        trackSound(vibratoOsc);

        // Mild low-pass filter for soft sound
        const filter = this.context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1800 - i * 200; // Roll off highs more for higher notes

        // Set up signal chain with very low volume
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.context.destination);

        // Long, gentle envelope
        const noteLength = this.getTiming() * 16; // 4 bars

        // Different volumes for different chord tones
        const volumes = [0.07, 0.05, 0.06, 0.04]; // Root, 3rd, 5th, 7th volumes
        const padVolume = volumes[i] * this.masterVolume;

        gain.gain.setValueAtTime(0, this.context.currentTime);
        gain.gain.linearRampToValueAtTime(
          padVolume,
          this.context.currentTime + 2
        );
        gain.gain.setValueAtTime(
          padVolume,
          this.context.currentTime + noteLength - 2
        );
        gain.gain.linearRampToValueAtTime(
          0,
          this.context.currentTime + noteLength
        );

        // Start and stop
        osc.start();
        osc.stop(this.context.currentTime + noteLength);

        // Track this sound
        trackSound(osc);
      });

      // Schedule next pad chord
      if (this.running) {
        this.pad = setTimeout(playPadChord, this.getTimingMs() * 16); // Every 4 bars
      }
    };

    // Start the first pad chord
    playPadChord();
  }

  // Add melodic lead line
  private startLead(): void {
    // Start with a delay to let other elements establish first
    setTimeout(() => {
      const playLeadNote = () => {
        if (!this.running) return;

        // Only play lead in certain musical sections or phrases
        // Skip lead in the intro section and only play in certain parts later
        if (
          this.barCount < 8 ||
          (this.currentSection === 0 && this.barCount % 16 < 8)
        ) {
          // Schedule next check
          this.lead = setTimeout(playLeadNote, this.getTimingMs());
          return;
        }

        // Get the current lead pattern
        const pattern = this.leadPatterns[this.currentLeadPattern];
        const pos = this.patternPosition % pattern.length;

        // If note is -99, it's a rest (silence)
        if (pattern[pos] === -99) {
          // Increment pattern position
          this.patternPosition = (this.patternPosition + 1) % pattern.length;

          // Schedule next lead note
          if (this.running) {
            this.lead = setTimeout(playLeadNote, this.getTimingMs());
          }
          return;
        }

        // Create oscillator for lead note
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        // Get the current chord's root to offset the melody
        const chordRoot = this.getCurrentChordRoot();

        // Calculate actual scale degree by adding pattern value to chord root
        // Use pentatonic scale for lead to ensure consonance
        const scaleDegree = chordRoot + pattern[pos];

        // Lead uses higher octave
        const freq = this.getNoteFrequency(scaleDegree, 3, this.leadScale);

        // Configure sound
        osc.type = "sine";
        osc.frequency.value = freq;

        // Add vibrato for expressiveness
        const vibratoOsc = this.context.createOscillator();
        const vibratoGain = this.context.createGain();
        vibratoOsc.frequency.value = 6; // 6 Hz vibrato
        vibratoGain.gain.value = 15; // Vibrato depth
        vibratoOsc.connect(vibratoGain);
        vibratoGain.connect(osc.detune);
        vibratoOsc.start();

        // Apply mild filter to soften the sound
        const filter = this.context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 3000;
        filter.Q.value = 1;

        // Set up signal chain
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.context.destination);

        // Note expression depends on position in pattern
        let noteLength = this.getTiming();
        let leadVolume = 0.08 * this.masterVolume;

        // Emphasis on main beats and longer notes on phrase boundaries
        if (pos % 8 === 0) {
          // Phrase start - slightly longer, more emphasis
          noteLength *= 1.8;
          leadVolume *= 1.2;
        } else if (pos % 4 === 0) {
          // Bar start - slightly longer note
          noteLength *= 1.5;
          leadVolume *= 1.1;
        } else if (pos % 2 === 0) {
          // Beat start - normal length note
          noteLength *= 1.0;
        } else {
          // Off beat - shorter note
          noteLength *= 0.8;
          leadVolume *= 0.9;
        }

        // Note envelope with expressive shape
        gain.gain.setValueAtTime(0, this.context.currentTime);
        gain.gain.linearRampToValueAtTime(
          leadVolume,
          this.context.currentTime + 0.05
        );
        gain.gain.setValueAtTime(
          leadVolume * 0.8,
          this.context.currentTime + noteLength * 0.6
        );
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          this.context.currentTime + noteLength
        );

        // Start and stop
        osc.start();
        osc.stop(this.context.currentTime + noteLength);
        vibratoOsc.stop(this.context.currentTime + noteLength);

        // Track these sounds
        trackSound(osc);
        trackSound(vibratoOsc);

        // Increment pattern position
        this.patternPosition = (this.patternPosition + 1) % pattern.length;

        // Schedule next lead note
        if (this.running) {
          this.lead = setTimeout(playLeadNote, this.getTimingMs());
        }
      };

      // Start the lead melody
      playLeadNote();
    }, this.getTimingMs() * 8); // Start after 2 bars
  }

  stop(): void {
    this.running = false;

    // Clear all timers
    if (this.arpeggiator) clearTimeout(this.arpeggiator);
    if (this.bassline) clearTimeout(this.bassline);
    if (this.pad) clearTimeout(this.pad);
    if (this.lead) clearTimeout(this.lead);

    // All actual sounds will stop naturally as they finish their envelopes
    // and are removed from the activeSounds set when they end
  }

  // Change the base key of the music
  setKey(newKey: string): void {
    if (this.rootNotes[newKey]) {
      this.key = newKey;
    }
  }

  // Change the scale of the music
  setScale(newScale: string): void {
    if (this.scaleNotes[newScale]) {
      this.scale = newScale;
    }
  }

  // Change the tempo of the music
  setBpm(newBpm: number): void {
    // Apply limits and round to nearest whole number
    const oldBpm = this.bpm;
    this.bpm = Math.max(60, Math.min(180, Math.round(newBpm)));

    // If BPM has significantly changed, we need to reset the timers
    // to ensure they use the new timing
    if (Math.abs(oldBpm - this.bpm) > 2 && this.running) {
      // Save current state
      const wasRunning = this.running;

      // Stop all existing timers
      if (this.arpeggiator) clearTimeout(this.arpeggiator);
      if (this.bassline) clearTimeout(this.bassline);
      if (this.pad) clearTimeout(this.pad);
      if (this.lead) clearTimeout(this.lead);

      // Restart the timers with new BPM
      if (wasRunning) {
        this.startArpeggiator();
        this.startBassline();
        this.startLead();
      }

      // Note: we don't restart pads because they're long duration
      // and will naturally adjust over time
    }
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
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(100, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      40,
      this.context.currentTime + 1.5
    );

    // Configure filter
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, this.context.currentTime);
    filter.frequency.exponentialRampToValueAtTime(
      200,
      this.context.currentTime + 1.5
    );
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
    document.addEventListener("click", () => getAudioContext(), { once: true });
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
    // Stop background music when muted
    this.stopBackgroundMusic();
  }

  public unmute(): void {
    this.isMuted = false;
    // Restart background music if we're in active game
    if (document.getElementById("countdown-timer")) {
      this.startBackgroundMusic();
    }
  }

  public toggleMute(): void {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  // Stop all sound effects but keep background music
  public stopSoundEffects(): void {
    stopAllSounds();
  }

  // Stop absolutely everything including background music
  public stopAllSounds(): void {
    stopAllSounds();
    this.stopBackgroundMusic();
  }

  // Background music methods
  public startBackgroundMusic(): void {
    if (this.isMuted) return;

    // Stop any existing music
    this.stopBackgroundMusic();

    // Reset countdown time
    currentCountdownSeconds = 60;

    // Create and start new music
    backgroundMusicInstance = new BackgroundMusic();
    backgroundMusicInstance.play();
  }

  // Update music based on countdown timer
  public updateMusicWithTimer(secondsRemaining: number): void {
    // Update the tracked countdown seconds
    currentCountdownSeconds = secondsRemaining;

    // Only adjust if music is playing
    if (backgroundMusicInstance && !this.isMuted) {
      // Calculate BPM:
      // - Start at 120 BPM when 60 seconds remain
      // - Increase to 180 BPM when 0 seconds remain
      // - Use exponential curve for more dramatic speedup in final seconds

      // Base BPM range
      const minBPM = 120;
      const maxBPM = 180;

      let progress = 0;

      // Use different scaling for different time ranges
      if (secondsRemaining <= 10) {
        // Exponential speedup in last 10 seconds
        progress = 1 - secondsRemaining / 10;
        progress = Math.pow(progress, 2); // Square it for exponential curve

        // Calculate BPM with more dramatic range in final 10 seconds
        const finalBPM = minBPM + progress * (maxBPM - minBPM);
        backgroundMusicInstance.setBpm(finalBPM);
      } else if (secondsRemaining <= 30) {
        // More gradual speedup between 30-10 seconds
        progress = 1 - (secondsRemaining - 10) / 20;

        // Calculate BPM for middle section (120-140 range)
        const midBPM = minBPM + progress * 20; // 20 BPM increase in middle section
        backgroundMusicInstance.setBpm(midBPM);
      } else {
        // Normal tempo for most of the game (60-30 seconds)
        backgroundMusicInstance.setBpm(minBPM);
      }
    }
  }

  public stopBackgroundMusic(): void {
    if (backgroundMusicInstance) {
      backgroundMusicInstance.stop();
      backgroundMusicInstance = null;
    }
  }
}
