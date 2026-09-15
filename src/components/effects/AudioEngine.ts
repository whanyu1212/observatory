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
}

export const soundEffects = new CyberAudioEngine();

$audioEnabled.listen((enabled) => {
  if (!enabled) soundEffects.stopAmbientHum();
});
