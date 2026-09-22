/**
 * Generative ambient soundscape built on the Web Audio API. Nothing is
 * downloaded: a detuned pad, filtered wind and occasional bell tones are
 * synthesised live. The pad retunes per section and opens up while you scroll.
 */

type Listener = () => void;

const PREF_KEY = "sound";

/** Six-note voicings (Hz), low to high. Neighbouring chords share tones so glides stay smooth. */
const CHORDS: Record<string, number[]> = {
  top: [73.42, 110.0, 146.83, 174.61, 220.0, 329.63], // Dm9
  statement: [58.27, 87.31, 146.83, 174.61, 220.0, 261.63], // Bbmaj9
  work: [87.31, 130.81, 174.61, 220.0, 261.63, 329.63], // Fmaj7
  experience: [65.41, 98.0, 164.81, 196.0, 293.66, 329.63], // Cadd9
  skills: [98.0, 146.83, 196.0, 233.08, 293.66, 349.23], // Gm7
  about: [55.0, 82.41, 110.0, 130.81, 164.81, 196.0], // Am7
  contact: [73.42, 110.0, 146.83, 185.0, 220.0, 329.63], // Dadd9
};

/** Brighter major voicings for the water scene. */
const MORNING_CHORDS: Record<string, number[]> = {
  top: [73.42, 110.0, 146.83, 185.0, 220.0, 329.63], // Dadd9
  statement: [98.0, 146.83, 196.0, 246.94, 293.66, 369.99], // Gmaj7
  work: [110.0, 164.81, 220.0, 277.18, 329.63, 493.88], // Aadd9
  experience: [82.41, 123.47, 164.81, 207.65, 246.94, 369.99], // Eadd9
  skills: [98.0, 146.83, 196.0, 220.0, 246.94, 293.66], // Gadd9
  about: [65.41, 98.0, 130.81, 164.81, 196.0, 246.94], // Cmaj7
  contact: [73.42, 110.0, 146.83, 185.0, 277.18, 329.63], // Dmaj9
};

/** The beach song: a laid-back I–V–vi–IV in D, voiced like a ukulele. */
const SONG_CHORDS = [
  { strum: [293.66, 369.99, 440.0, 587.33], bass: 73.42 }, // D
  { strum: [277.18, 329.63, 440.0, 554.37], bass: 55.0 }, // A
  { strum: [293.66, 369.99, 493.88, 587.33], bass: 61.74 }, // Bm
  { strum: [293.66, 392.0, 493.88, 587.33], bass: 49.0 }, // G
];
/** Island strum over eight eighth-notes: down, -, down, up, -, up, down, up. */
const STRUM = ["D", "", "D", "U", "", "U", "D", "U"] as const;
const MELODY = [587.33, 659.25, 739.99, 880.0, 987.77, 1174.66]; // D major pentatonic
const SONG_EIGHTH = 60 / 92 / 2;
/** Matches the visual surf in Sea.tsx: one wave reaches the beach every SPACING / SPEED seconds. */
const WAVE_PERIOD = 24 / 5.5;

type AudioCtor = typeof AudioContext;
type Mood = "sky" | "water";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private padFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private echo: DelayNode | null = null;
  private arpGain: GainNode | null = null;
  private arpTimer: number | undefined;
  private nextNote = 0;
  private step = 0;
  private voices: OscillatorNode[][] = [];
  private bellTimer: number | undefined;
  private suspendTimer: number | undefined;
  private listeners = new Set<Listener>();
  private on = false;
  private section = "top";
  private mood: Mood = "sky";
  private surfGain: GainNode | null = null;
  private padGain: GainNode | null = null;
  private songBus: GainNode | null = null;
  private plucks = new Map<number, AudioBuffer>();
  private crashNoise: AudioBuffer | null = null;
  private songStep = 0;
  private nextSongNote = 0;
  private nextWave = 0;
  private melodyNote = 2;
  private lastBlip = 0;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getEnabled = () => this.on;

  get preferred() {
    try {
      return localStorage.getItem(PREF_KEY) === "on";
    } catch {
      return false;
    }
  }

  /** Must be called from a user gesture (click / key press) the first time. */
  enable() {
    if (this.on) return;
    const Ctor: AudioCtor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return;
    if (!this.ctx) {
      this.ctx = new Ctor();
      this.build(this.ctx);
    }
    window.clearTimeout(this.suspendTimer);
    void this.ctx.resume();
    const now = this.ctx.currentTime;
    this.master?.gain.cancelScheduledValues(now);
    this.master?.gain.setTargetAtTime(0.6, now, 1.4);
    this.retune(0.1);
    this.scheduleBell();
    this.startArpeggio();
    this.on = true;
    this.persist("on");
    this.emit();
  }

  disable() {
    if (!this.on) return;
    this.on = false;
    window.clearTimeout(this.bellTimer);
    window.clearInterval(this.arpTimer);
    if (this.ctx && this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0, now, 0.25);
      this.suspendTimer = window.setTimeout(() => {
        if (!this.on) void this.ctx?.suspend();
      }, 1500);
    }
    this.persist("off");
    this.emit();
  }

  toggle() {
    if (this.on) this.disable();
    else this.enable();
  }

  /** Sky keeps the minor pad, wind and bells; water brightens the harmony and brings surf and gulls. */
  setMood(mood: Mood) {
    if (mood === this.mood) return;
    this.mood = mood;
    if (this.ctx && this.windGain && this.surfGain && this.padGain && this.songBus) {
      const now = this.ctx.currentTime;
      const water = mood === "water";
      this.retune(2.5);
      this.windGain.gain.setTargetAtTime(water ? 0.006 : 0.02, now, 1);
      this.surfGain.gain.setTargetAtTime(water ? 1 : 0, now, 1.2);
      this.padGain.gain.setTargetAtTime(water ? 0 : 0.14, now, 1);
      this.songBus.gain.setTargetAtTime(water ? 0.6 : 0, now, 1.2);
      if (water) this.resetSong();
    }
  }

  private chord() {
    const table = this.mood === "water" ? MORNING_CHORDS : CHORDS;
    return table[this.section] ?? table.top;
  }

  setSection(id: string) {
    if (id === this.section || !CHORDS[id]) return;
    this.section = id;
    if (this.on) this.retune(1.6);
  }

  /** 0 = still, 1 = fast scrolling. */
  setVelocity(v: number) {
    if (!this.on || !this.ctx || !this.padFilter || !this.windGain) return;
    const now = this.ctx.currentTime;
    const level = Math.min(1, Math.max(0, v));
    this.padFilter.frequency.setTargetAtTime(480 + level * 1600, now, 0.35);
    this.windGain.gain.setTargetAtTime(0.02 + level * 0.1, now, 0.3);
    this.arpGain?.gain.setTargetAtTime(0.55 + level * 0.6, now, 0.4);
  }

  /** A single bell tone, played when the visitor ripples the sky. */
  chime() {
    this.bell();
  }

  /** Tiny hover tick for interactive elements. */
  blip() {
    if (!this.on || !this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    if (now - this.lastBlip < 0.06) return;
    this.lastBlip = now;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1320, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.018, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }

  private persist(value: "on" | "off") {
    try {
      localStorage.setItem(PREF_KEY, value);
    } catch {
      // Storage unavailable; the choice still applies to this visit.
    }
  }

  private build(ctx: AudioContext) {
    const master = ctx.createGain();
    master.gain.value = 0;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.ratio.value = 3;
    master.connect(compressor).connect(ctx.destination);

    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(ctx, 5.5, 2.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.75;
    reverb.connect(wet).connect(master);

    // Pad: two detuned oscillators per chord tone through one warm low-pass.
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 480;
    padFilter.Q.value = 0.8;
    const padGain = ctx.createGain();
    padGain.gain.value = this.mood === "water" ? 0 : 0.14;
    padFilter.connect(padGain);
    padGain.connect(master);
    padGain.connect(reverb);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.045;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 160;
    lfo.connect(lfoDepth).connect(padFilter.frequency);
    lfo.start();

    CHORDS.top.forEach((frequency, index) => {
      const low = index < 2;
      const voice = [-7, 7].map((detune) => {
        const osc = ctx.createOscillator();
        osc.type = low ? "sine" : "sawtooth";
        osc.frequency.value = frequency;
        osc.detune.value = detune;
        const gain = ctx.createGain();
        gain.gain.value = low ? 0.45 : 0.1;
        osc.connect(gain).connect(padFilter);
        osc.start();
        return osc;
      });
      this.voices.push(voice);
    });

    // Wind: looping noise through a slowly wandering band-pass.
    const noise = ctx.createBufferSource();
    noise.buffer = this.noise(ctx, 4);
    noise.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.value = 650;
    windFilter.Q.value = 0.9;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.02;
    noise.connect(windFilter).connect(windGain);
    windGain.connect(master);
    windGain.connect(reverb);
    noise.start();

    const windLfo = ctx.createOscillator();
    windLfo.frequency.value = 0.07;
    const windDepth = ctx.createGain();
    windDepth.gain.value = 260;
    windLfo.connect(windDepth).connect(windFilter.frequency);
    windLfo.start();

    // Echo: a filtered feedback delay the arpeggio and bells ring into.
    const echo = ctx.createDelay(2);
    echo.delayTime.value = 0.45;
    const echoTone = ctx.createBiquadFilter();
    echoTone.type = "lowpass";
    echoTone.frequency.value = 2200;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.42;
    echo.connect(echoTone).connect(feedback).connect(echo);
    const echoOut = ctx.createGain();
    echoOut.gain.value = 0.55;
    echoTone.connect(echoOut);
    echoOut.connect(master);
    echoOut.connect(reverb);

    const arpGain = ctx.createGain();
    arpGain.gain.value = 0.55;
    arpGain.connect(master);
    arpGain.connect(echo);
    arpGain.connect(reverb);

    // Surf: low-passed noise whose level rolls in and out like waves on a beach.
    const surfNoise = ctx.createBufferSource();
    surfNoise.buffer = this.noise(ctx, 6);
    surfNoise.loop = true;
    const surfTone = ctx.createBiquadFilter();
    surfTone.type = "lowpass";
    surfTone.frequency.value = 720;
    const surfSwell = ctx.createGain();
    surfSwell.gain.value = 0.05;
    const swell = ctx.createOscillator();
    swell.frequency.value = 0.085;
    const swellDepth = ctx.createGain();
    swellDepth.gain.value = 0.045;
    swell.connect(swellDepth).connect(surfSwell.gain);
    swell.start();
    const surfGain = ctx.createGain();
    surfGain.gain.value = this.mood === "water" ? 1 : 0;
    surfNoise.connect(surfTone).connect(surfSwell).connect(surfGain);
    surfGain.connect(master);
    surfGain.connect(reverb);
    surfNoise.start();
    this.surfGain = surfGain;

    // The beach song plays through its own bus so the scene switch can fade it.
    const songBus = ctx.createGain();
    songBus.gain.value = this.mood === "water" ? 0.6 : 0;
    const songWet = ctx.createGain();
    songWet.gain.value = 0.35;
    songBus.connect(master);
    songBus.connect(songWet).connect(reverb);
    this.songBus = songBus;
    this.padGain = padGain;
    this.crashNoise = this.noise(ctx, 5);

    this.master = master;
    this.reverb = reverb;
    this.echo = echo;
    this.arpGain = arpGain;
    this.padFilter = padFilter;
    this.windGain = windGain;
  }

  private retune(glide: number) {
    if (!this.ctx) return;
    const chord = this.chord();
    const now = this.ctx.currentTime;
    this.voices.forEach((voice, index) =>
      voice.forEach((osc) => osc.frequency.setTargetAtTime(chord[index], now, glide)),
    );
  }

  /** Look-ahead scheduler: a slow, sparse arpeggio over the current chord. */
  private startArpeggio() {
    if (!this.ctx) return;
    window.clearInterval(this.arpTimer);
    this.nextNote = this.ctx.currentTime + 0.4;
    this.resetSong();
    const pattern = [2, 4, 3, 5, 2, 5, 4, 3, 2, 4, 5, 4, 3, 5, 2, 3];
    const interval = 0.3;
    this.arpTimer = window.setInterval(() => {
      const ctx = this.ctx;
      if (!ctx || !this.on || !this.arpGain) return;
      if (this.mood === "water") {
        this.scheduleSong(ctx);
        this.nextNote = ctx.currentTime + 0.2;
        return;
      }
      while (this.nextNote < ctx.currentTime + 0.15) {
        const chord = this.chord();
        const index = pattern[this.step % pattern.length];
        // Rests keep it breathing; every fourth step is always played.
        if (this.step % 4 === 0 || Math.random() < 0.55) {
          const octave = this.step % 8 < 4 ? 2 : 4;
          this.pluck(chord[index] * octave, this.nextNote, this.step % 4 === 0 ? 0.03 : 0.018);
        }
        this.step += 1;
        this.nextNote += interval;
      }
    }, 40);
  }

  private resetSong() {
    if (!this.ctx) return;
    this.songStep = 0;
    this.nextSongNote = this.ctx.currentTime + 0.3;
    this.nextWave = this.ctx.currentTime + 0.5;
  }

  private scheduleSong(ctx: AudioContext) {
    const horizon = ctx.currentTime + 0.2;
    while (this.nextSongNote < horizon) {
      const at = this.nextSongNote;
      const bar = Math.floor(this.songStep / 8);
      const eighth = this.songStep % 8;
      const chord = SONG_CHORDS[bar % SONG_CHORDS.length];
      const stroke = STRUM[eighth];
      // Ukulele strums: down-strokes low to high, lighter up-strokes high to low.
      if (stroke === "D") {
        chord.strum.forEach((f, i) => this.pluckString(f, at + i * 0.012 + Math.random() * 0.004, 0.055));
      } else if (stroke === "U") {
        chord.strum.slice(1).reverse().forEach((f, i) => this.pluckString(f, at + i * 0.01, 0.032));
      }
      if (eighth === 0 || eighth === 4) this.softBass(chord.bass * 2, at, eighth === 0 ? 0.11 : 0.07);
      // A marimba answers every other bar with a short, stepwise phrase.
      if (bar % 2 === 1 && Math.random() < 0.42) {
        this.melodyNote = Math.max(0, Math.min(MELODY.length - 1, this.melodyNote + (Math.random() < 0.5 ? -1 : 1)));
        this.marimba(MELODY[this.melodyNote], at + 0.01, 0.05);
      }
      this.songStep += 1;
      this.nextSongNote += SONG_EIGHTH;
    }
    // Surf breaking on the beach in time with the waves on screen.
    while (this.nextWave < horizon) {
      this.waveCrash(this.nextWave);
      this.nextWave += WAVE_PERIOD * (0.95 + Math.random() * 0.1);
    }
  }

  /** Karplus–Strong plucked string, cached per pitch. */
  private stringBuffer(frequency: number) {
    const cached = this.plucks.get(frequency);
    if (cached || !this.ctx) return cached ?? null;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * 1.4);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const out = buffer.getChannelData(0);
    const period = Math.max(2, Math.round(sampleRate / frequency));
    const ring = new Float32Array(period);
    let soft = 0;
    for (let i = 0; i < period; i++) {
      soft = soft * 0.55 + (Math.random() * 2 - 1) * 0.45;
      ring[i] = soft;
    }
    let index = 0;
    for (let i = 0; i < length; i++) {
      const next = (index + 1) % period;
      const value = ring[index];
      out[i] = value * Math.min(1, (length - i) / (sampleRate * 0.2));
      ring[index] = 0.996 * 0.5 * (value + ring[next]);
      index = next;
    }
    this.plucks.set(frequency, buffer);
    return buffer;
  }

  private pluckString(frequency: number, at: number, level: number) {
    if (!this.ctx || !this.songBus) return;
    const buffer = this.stringBuffer(frequency);
    if (!buffer) return;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = level;
    source.connect(gain).connect(this.songBus);
    source.start(at);
  }

  private marimba(frequency: number, at: number, level: number) {
    if (!this.ctx || !this.songBus) return;
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
    gain.connect(this.songBus);
    [
      [1, 1],
      [4, 0.12],
      [9.9, 0.03],
    ].forEach(([ratio, amount]) => {
      const osc = ctx.createOscillator();
      const partial = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency * ratio;
      partial.gain.value = amount;
      osc.connect(partial).connect(gain);
      osc.start(at);
      osc.stop(at + 1);
    });
  }

  private softBass(frequency: number, at: number, level: number) {
    if (!this.ctx || !this.songBus) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.8);
    osc.connect(gain).connect(this.songBus);
    osc.start(at);
    osc.stop(at + 0.85);
  }

  /** A wave breaking: a swelling rush of noise, then the hiss of water running back. */
  private waveCrash(at: number) {
    if (!this.ctx || !this.surfGain || !this.crashNoise) return;
    const ctx = this.ctx;
    const source = ctx.createBufferSource();
    source.buffer = this.crashNoise;
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.setValueAtTime(300, at);
    tone.frequency.exponentialRampToValueAtTime(2600, at + 0.7);
    tone.frequency.exponentialRampToValueAtTime(900, at + 3.4);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.16, at + 0.55);
    gain.gain.exponentialRampToValueAtTime(0.03, at + 2.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 3.8);
    source.connect(tone).connect(gain).connect(this.surfGain);
    source.start(at, Math.random() * 1.5);
    source.stop(at + 4);
  }

  private pluck(frequency: number, at: number, level: number) {
    if (!this.ctx || !this.arpGain) return;
    const osc = this.ctx.createOscillator();
    const tone = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = frequency;
    tone.type = "lowpass";
    tone.frequency.setValueAtTime(frequency * 6, at);
    tone.frequency.exponentialRampToValueAtTime(frequency * 1.5, at + 0.6);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.1);
    osc.connect(tone).connect(gain).connect(this.arpGain);
    osc.start(at);
    osc.stop(at + 1.2);
  }

  private scheduleBell() {
    window.clearTimeout(this.bellTimer);
    this.bellTimer = window.setTimeout(() => {
      if (this.mood === "water") {
        if (Math.random() < 0.6) this.gulls();
        else this.birdsong();
      } else this.bell();
      if (this.on) this.scheduleBell();
    }, 3500 + Math.random() * 5500);
  }

  private bell() {
    if (!this.on || !this.ctx || !this.master || !this.reverb) return;
    const chord = this.chord();
    const base = chord[2 + Math.floor(Math.random() * 4)];
    const frequency = base * (Math.random() < 0.6 ? 2 : 4);
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.6);
    osc.connect(gain);
    gain.connect(this.reverb);
    gain.connect(this.master);
    if (this.echo) gain.connect(this.echo);
    osc.start(now);
    osc.stop(now + 3.8);
  }

  /** Two or three falling gull cries, far off over the water. */
  private gulls() {
    if (!this.on || !this.ctx || !this.master || !this.reverb) return;
    const ctx = this.ctx;
    let at = ctx.currentTime + 0.05;
    const cries = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < cries; i++) {
      const osc = ctx.createOscillator();
      const tone = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      const top = 1500 + Math.random() * 300;
      osc.frequency.setValueAtTime(top * 0.8, at);
      osc.frequency.linearRampToValueAtTime(top, at + 0.06);
      osc.frequency.exponentialRampToValueAtTime(top * 0.55, at + 0.34);
      tone.type = "bandpass";
      tone.frequency.value = 1800;
      tone.Q.value = 2.5;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.01, at + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.38);
      osc.connect(tone).connect(gain);
      gain.connect(this.master);
      gain.connect(this.reverb);
      osc.start(at);
      osc.stop(at + 0.4);
      at += 0.42 + Math.random() * 0.2;
    }
  }

  /** A short phrase of synthesised chirps. */
  private birdsong() {
    if (!this.on || !this.ctx || !this.master || !this.reverb) return;
    const ctx = this.ctx;
    let at = ctx.currentTime + 0.05;
    const chirps = 2 + Math.floor(Math.random() * 4);
    const base = 2400 + Math.random() * 1400;
    for (let i = 0; i < chirps; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const start = base * (0.9 + Math.random() * 0.25);
      osc.frequency.setValueAtTime(start, at);
      osc.frequency.exponentialRampToValueAtTime(start * (Math.random() < 0.5 ? 1.35 : 0.75), at + 0.07);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.012, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
      osc.connect(gain);
      gain.connect(this.master);
      gain.connect(this.reverb);
      osc.start(at);
      osc.stop(at + 0.1);
      at += 0.09 + Math.random() * 0.06;
    }
  }

  private impulse(ctx: AudioContext, seconds: number, decay: number) {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
    return buffer;
  }

  private noise(ctx: AudioContext, seconds: number) {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      // Leaky integration of white noise gives a softer, brown-ish wind.
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    return buffer;
  }
}

export const sound = new SoundEngine();
