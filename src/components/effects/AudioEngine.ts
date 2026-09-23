import { $audioEnabled } from '@/stores/osStore';

class CyberAudioEngine {
  private ctx: AudioContext | null = null;
  private ambient: {
    osc: OscillatorNode;
    subOsc: OscillatorNode;
    lfo: OscillatorNode;
    lfoGain: GainNode;
    filter: BiquadFilterNode;
    gain: GainNode;
  } | null = null;
  private humListenerAttached = false;
  private world: { master: GainNode; voices: GainNode[]; sources: AudioScheduledSourceNode[] } | null = null;
  private comet: { gain: GainNode; panner: StereoPannerNode; shimmer: OscillatorNode; sources: AudioScheduledSourceNode[] } | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  // Low-frequency ambient drone (starts on first user gesture, respects audio toggle)
  startAmbientHum() {
    if (!$audioEnabled.get()) return;
    try {
      this.initCtx();
      if (!this.ctx || this.ambient) return;

      const ctx = this.ctx;

      // Two soft sine tones form a stable fifth without the buzz of a sawtooth drone.
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(65.41, ctx.currentTime); // C2

      const subOsc = ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(98, ctx.currentTime); // G2

      // Barely perceptible pitch movement keeps the pad from feeling mechanical.
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.08, ctx.currentTime);

      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.35, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, ctx.currentTime);
      filter.Q.setValueAtTime(0.45, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.011, ctx.currentTime + 4);

      osc.connect(filter);
      subOsc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      subOsc.start();
      lfo.start();

      this.ambient = { osc, subOsc, lfo, lfoGain, filter, gain };
    } catch {
      // Audio catch
    }
  }

  stopAmbientHum() {
    const ambient = this.ambient;
    const ctx = this.ctx;
    this.ambient = null;

    if (!ambient || !ctx) return;

    try {
      ambient.gain.gain.cancelScheduledValues(ctx.currentTime);
      ambient.gain.gain.setValueAtTime(ambient.gain.gain.value, ctx.currentTime);
      ambient.gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.25);

      window.setTimeout(() => {
        try {
          ambient.osc.stop();
          ambient.subOsc.stop();
          ambient.lfo.stop();
        } catch {
          // Nodes may already have stopped if the page lifecycle interrupted playback.
        }

        ambient.osc.disconnect();
        ambient.subOsc.disconnect();
        ambient.lfo.disconnect();
        ambient.lfoGain.disconnect();
        ambient.filter.disconnect();
        ambient.gain.disconnect();
      }, 300);
    } catch {
      // noop
    }
  }

  // Attach a one-time pointerdown listener so autoplay policies allow the hum
  attachAmbientOnFirstInteraction() {
    if (this.humListenerAttached || typeof window === 'undefined') return;
    this.humListenerAttached = true;

    const start = () => {
      if ($audioEnabled.get()) {
        this.startAmbientHum();
      }
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
      this.humListenerAttached = false;
    };

    window.addEventListener('pointerdown', start, { once: false });
    window.addEventListener('keydown', start, { once: false });
  }

  // Quick high-tech beep on hover or button click
  playBlip(freq = 880, duration = 0.04) {
    if (!$audioEnabled.get()) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio autoplay policy catch
    }
  }

  // Window open / engage hum
  playEngage() {
    if (!$audioEnabled.get()) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(560, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch {
      // Audio catch
    }
  }

  // Window close / disengage soft hiss
  playDisengage() {
    if (!$audioEnabled.get()) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.025, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch {
      // Audio catch
    }
  }

  // Keyboard terminal keystroke
  playKeyClick() {
    if (!$audioEnabled.get()) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      const randomFreq = 600 + Math.random() * 400;
      osc.frequency.setValueAtTime(randomFreq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.015, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.02);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.02);
    } catch {
      // Audio catch
    }
  }

  /** True once a user gesture has unlocked audio. The world never unlocks it on its own. */
  get running() {
    return this.ctx?.state === 'running';
  }

  /**
   * One quiet voice per island, silent until the explorer comes near. Flying
   * between islands crossfades their notes into slowly shifting chords.
   */
  startWorld(frequencies: number[]) {
    if (this.world || !$audioEnabled.get() || !this.ctx || this.ctx.state !== 'running') return;
    try {
      const ctx = this.ctx;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.9, ctx.currentTime);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, ctx.currentTime);
      filter.connect(master);
      master.connect(ctx.destination);
      // A very slow swell keeps the chord breathing rather than droning.
      const swell = ctx.createOscillator();
      swell.frequency.setValueAtTime(0.11, ctx.currentTime);
      const swellDepth = ctx.createGain();
      swellDepth.gain.setValueAtTime(0.25, ctx.currentTime);
      swell.connect(swellDepth);
      swellDepth.connect(master.gain);
      swell.start();
      const sources: AudioScheduledSourceNode[] = [swell];
      const voices = frequencies.map(frequency => {
        const voice = ctx.createGain();
        voice.gain.setValueAtTime(0, ctx.currentTime);
        voice.connect(filter);
        // A sine with a faint octave above reads as a soft bell rather than a test tone.
        [[frequency, 'sine', 1], [frequency * 2.003, 'triangle', 0.18]].forEach(([pitch, type, level]) => {
          const oscillator = ctx.createOscillator();
          oscillator.type = type as OscillatorType;
          oscillator.frequency.setValueAtTime(pitch as number, ctx.currentTime);
          const partial = ctx.createGain();
          partial.gain.setValueAtTime(level as number, ctx.currentTime);
          oscillator.connect(partial);
          partial.connect(voice);
          oscillator.start();
          sources.push(oscillator);
        });
        return voice;
      });
      this.world = { master, voices, sources };
    } catch {
      // Audio unavailable; the world stays silent.
    }
  }

  /** Levels from 0 to 1, one per island, eased so notes swell rather than switch. */
  setWorldLevels(levels: number[]) {
    const world = this.world;
    if (!world || !this.ctx) return;
    const now = this.ctx.currentTime;
    levels.forEach((level, index) => world.voices[index]?.gain.setTargetAtTime(level * 0.016, now, 0.35));
  }

  stopWorld() {
    const world = this.world;
    const ctx = this.ctx;
    this.world = null;
    if (!world || !ctx) return;
    try {
      world.master.gain.cancelScheduledValues(ctx.currentTime);
      world.master.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
      window.setTimeout(() => {
        world.sources.forEach(source => { try { source.stop(); } catch { /* already stopped */ } });
        world.master.disconnect();
      }, 600);
    } catch {
      // noop
    }
  }

  /** A soft rush of air as the explorer boosts. */
  playWhoosh() {
    if (!$audioEnabled.get() || !this.ctx || this.ctx.state !== 'running') return;
    try {
      const ctx = this.ctx;
      const length = Math.floor(ctx.sampleRate * 0.7);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < length; index++) data[index] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.Q.setValueAtTime(0.9, ctx.currentTime);
      band.frequency.setValueAtTime(320, ctx.currentTime);
      band.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.45);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.65);
      noise.connect(band);
      band.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      noise.stop(ctx.currentTime + 0.7);
    } catch {
      // noop
    }
  }

  /** A high, soft shimmer that follows a comet across the stereo field. */
  startComet() {
    if (this.comet || !$audioEnabled.get() || !this.ctx || this.ctx.state !== 'running') return;
    try {
      const ctx = this.ctx;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      const panner = ctx.createStereoPanner();
      gain.connect(panner);
      panner.connect(ctx.destination);
      const sources: AudioScheduledSourceNode[] = [];
      let shimmer: OscillatorNode | null = null;
      [1318.5, 1975.5].forEach((frequency, index) => {
        const oscillator = ctx.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
        const partial = ctx.createGain();
        partial.gain.setValueAtTime(index ? 0.35 : 1, ctx.currentTime);
        oscillator.connect(partial);
        partial.connect(gain);
        oscillator.start();
        sources.push(oscillator);
        shimmer ??= oscillator;
      });
      // A fast flutter makes it sparkle rather than whistle.
      const flutter = ctx.createOscillator();
      flutter.frequency.setValueAtTime(7, ctx.currentTime);
      const flutterDepth = ctx.createGain();
      flutterDepth.gain.setValueAtTime(0.004, ctx.currentTime);
      flutter.connect(flutterDepth);
      flutterDepth.connect(gain.gain);
      flutter.start();
      sources.push(flutter);
      this.comet = { gain, panner, shimmer: shimmer!, sources };
    } catch {
      // noop
    }
  }

  /** Pan from -1 (left) to 1 (right); nearness from 0 to 1 raises the level and pitch. */
  setComet(pan: number, level: number, nearness: number) {
    const comet = this.comet;
    if (!comet || !this.ctx) return;
    const now = this.ctx.currentTime;
    comet.panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), now, 0.1);
    comet.gain.gain.setTargetAtTime(level * (0.006 + nearness * 0.012), now, 0.15);
    comet.shimmer.detune.setTargetAtTime(nearness * 500, now, 0.15);
  }

  stopComet() {
    const comet = this.comet;
    const ctx = this.ctx;
    this.comet = null;
    if (!comet || !ctx) return;
    try {
      comet.gain.gain.cancelScheduledValues(ctx.currentTime);
      comet.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      window.setTimeout(() => {
        comet.sources.forEach(source => { try { source.stop(); } catch { /* already stopped */ } });
        comet.panner.disconnect();
      }, 500);
    } catch {
      // noop
    }
  }

  /** A bright rising run up the pentatonic scale for a caught comet. */
  playCatch() {
    if (!$audioEnabled.get() || !this.ctx || this.ctx.state !== 'running') return;
    try {
      const ctx = this.ctx;
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((frequency, index) => {
        const start = ctx.currentTime + index * 0.07;
        const oscillator = ctx.createOscillator();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequency, start);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.03, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.75);
      });
    } catch {
      // noop
    }
  }

  /** A short rising phrase on an island's own note: root, fifth, octave. */
  playArrival(root: number) {
    if (!$audioEnabled.get() || !this.ctx || this.ctx.state !== 'running') return;
    try {
      const ctx = this.ctx;
      [1, 1.5, 2].forEach((ratio, index) => {
        const start = ctx.currentTime + index * 0.11;
        const oscillator = ctx.createOscillator();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(root * ratio, start);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.035, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.65);
      });
    } catch {
      // noop
    }
  }
}

export const soundEffects = new CyberAudioEngine();

$audioEnabled.listen((enabled) => {
  if (!enabled) {
    soundEffects.stopAmbientHum();
    soundEffects.stopWorld();
    soundEffects.stopComet();
  }
});
