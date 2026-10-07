// Real-Time Halloween Voice DSP & Sub-Bass Transformer for Web Audio

export interface VoiceConfig {
  pitchSemitones: number;   // -12 to +12 semitones (default: -6)
  subBassDb: number;        // 0 to +18 dB @ 80Hz (subwoofer drive)
  gourdResonanceDb: number; // 0 to +10 dB @ 240Hz (hollow pumpkin body)
  boxCutFreq: number;       // 2500 to 8000 Hz (removes human nasal sibilance)
  driveAmount: number;      // 0 to 1.0 (analog tube saturation / growl)
  reverbAmount: number;     // 0 to 1.0 (cavernous gourd echo wet level)
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  pitchSemitones: -6,
  subBassDb: 14,
  gourdResonanceDb: 6,
  boxCutFreq: 4200,
  driveAmount: 0.28,
  reverbAmount: 0.25
};

export const VOICE_PRESETS: Record<string, { name: string; config: VoiceConfig }> = {
  deep_jack: {
    name: '🎃 Deep Jack-o\'-Lantern (Default)',
    config: {
      pitchSemitones: -6,
      subBassDb: 14,
      gourdResonanceDb: 6,
      boxCutFreq: 4200,
      driveAmount: 0.28,
      reverbAmount: 0.25
    }
  },
  demon: {
    name: '😈 Demonic Fiend (Sub Growl & Heavy Rumble)',
    config: {
      pitchSemitones: -9,
      subBassDb: 18,
      gourdResonanceDb: 8,
      boxCutFreq: 3400,
      driveAmount: 0.55,
      reverbAmount: 0.35
    }
  },
  phantom: {
    name: '👻 Ethereal Hollow Spirit',
    config: {
      pitchSemitones: -4,
      subBassDb: 6,
      gourdResonanceDb: 4,
      boxCutFreq: 5500,
      driveAmount: 0.1,
      reverbAmount: 0.65
    }
  },
  goblin: {
    name: '🤪 High Goblin / Imp',
    config: {
      pitchSemitones: 4,
      subBassDb: 4,
      gourdResonanceDb: 2,
      boxCutFreq: 6000,
      driveAmount: 0.2,
      reverbAmount: 0.15
    }
  },
  clean: {
    name: '🎙️ Clean Passthrough',
    config: {
      pitchSemitones: 0,
      subBassDb: 0,
      gourdResonanceDb: 0,
      boxCutFreq: 12000,
      driveAmount: 0,
      reverbAmount: 0
    }
  }
};

export class VoiceTransformer {
  private ctx: AudioContext;
  public inputNode: GainNode;
  public outputNode: GainNode;

  // DSP Nodes
  private processorNode: ScriptProcessorNode;
  private subBassFilter: BiquadFilterNode;
  private subPeakFilter: BiquadFilterNode;
  private gourdFilter: BiquadFilterNode;
  private boxCutFilter: BiquadFilterNode;
  private waveShaper: WaveShaperNode;
  private dryGain: GainNode;
  private wetGain: GainNode;

  // Cavern Reverb Nodes
  private delayL: DelayNode;
  private delayR: DelayNode;
  private delayFeedbackL: GainNode;
  private delayFeedbackR: GainNode;
  private delayDampFilter: BiquadFilterNode;

  // Pitch Shift Engine State
  private config: VoiceConfig;
  private readonly BUFFER_SIZE = 8192;
  private readonly GRAIN_SIZE = 1024;
  private grainBuffer: Float32Array;
  private writeIndex: number = 0;
  private phase: number = 0;
  private anchor1: number = 0;
  private anchor2: number = 0;

  constructor(ctx: AudioContext, initialConfig: VoiceConfig = DEFAULT_VOICE_CONFIG) {
    this.ctx = ctx;
    this.config = { ...initialConfig };

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. ScriptProcessor for Granular Pitch Shifting
    this.grainBuffer = new Float32Array(this.BUFFER_SIZE);
    this.processorNode = ctx.createScriptProcessor(1024, 1, 1);
    this.processorNode.onaudioprocess = (e) => this.processAudio(e);

    // 2. Sub-Bass Shelf Filter (Boosts < 90Hz for heavy subwoofers)
    this.subBassFilter = ctx.createBiquadFilter();
    this.subBassFilter.type = 'lowshelf';
    this.subBassFilter.frequency.value = 85;
    this.subBassFilter.gain.value = this.config.subBassDb;

    // Sub harmonic resonance peak at 60Hz
    this.subPeakFilter = ctx.createBiquadFilter();
    this.subPeakFilter.type = 'peaking';
    this.subPeakFilter.frequency.value = 60;
    this.subPeakFilter.Q.value = 2.0;
    this.subPeakFilter.gain.value = Math.min(12, this.config.subBassDb * 0.7);

    // 3. Gourd Body Resonator (240Hz wooden/pumpkin cavity resonance)
    this.gourdFilter = ctx.createBiquadFilter();
    this.gourdFilter.type = 'peaking';
    this.gourdFilter.frequency.value = 240;
    this.gourdFilter.Q.value = 1.4;
    this.gourdFilter.gain.value = this.config.gourdResonanceDb;

    // 4. Box / High-Cut Filter (Cuts human nasal sibilance > 4200Hz)
    this.boxCutFilter = ctx.createBiquadFilter();
    this.boxCutFilter.type = 'lowpass';
    this.boxCutFilter.frequency.value = this.config.boxCutFreq;

    // 5. Analog Tube Saturation / Growl WaveShaper
    this.waveShaper = ctx.createWaveShaper();
    this.updateDriveCurve(this.config.driveAmount);

    // 6. Cavernous Hollow Reverb Network (Dual cross-delay with high damp)
    this.delayL = ctx.createDelay(1.0);
    this.delayR = ctx.createDelay(1.0);
    this.delayL.delayTime.value = 0.045; // 45ms
    this.delayR.delayTime.value = 0.065; // 65ms

    this.delayFeedbackL = ctx.createGain();
    this.delayFeedbackR = ctx.createGain();
    this.delayFeedbackL.gain.value = 0.35;
    this.delayFeedbackR.gain.value = 0.35;

    this.delayDampFilter = ctx.createBiquadFilter();
    this.delayDampFilter.type = 'lowpass';
    this.delayDampFilter.frequency.value = 1800;

    this.delayL.connect(this.delayDampFilter);
    this.delayR.connect(this.delayDampFilter);
    this.delayDampFilter.connect(this.delayFeedbackL);
    this.delayDampFilter.connect(this.delayFeedbackR);
    this.delayFeedbackL.connect(this.delayR);
    this.delayFeedbackR.connect(this.delayL);

    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.dryGain.gain.value = 1.0;
    this.wetGain.gain.value = this.config.reverbAmount * 0.7;

    this.delayDampFilter.connect(this.wetGain);

    // Chain:
    // inputNode -> processorNode -> waveShaper -> subBassFilter -> subPeakFilter -> gourdFilter -> boxCutFilter
    // -> dryGain & delayL/R
    // dryGain + wetGain -> outputNode
    this.inputNode.connect(this.processorNode);
    this.processorNode.connect(this.waveShaper);
    this.waveShaper.connect(this.subBassFilter);
    this.subBassFilter.connect(this.subPeakFilter);
    this.subPeakFilter.connect(this.gourdFilter);
    this.gourdFilter.connect(this.boxCutFilter);

    this.boxCutFilter.connect(this.dryGain);
    this.boxCutFilter.connect(this.delayL);
    this.boxCutFilter.connect(this.delayR);

    this.dryGain.connect(this.outputNode);
    this.wetGain.connect(this.outputNode);
  }

  private processAudio(e: AudioProcessingEvent): void {
    const input = e.inputBuffer.getChannelData(0);
    const output = e.outputBuffer.getChannelData(0);

    const semitones = this.config.pitchSemitones;
    // Frequency ratio: r = 2^(semitones / 12)
    const r = Math.pow(2, semitones / 12);

    const N = this.BUFFER_SIZE;
    const G = this.GRAIN_SIZE;
    const buffer = this.grainBuffer;

    for (let i = 0; i < input.length; i++) {
      buffer[this.writeIndex] = input[i];
      this.writeIndex = (this.writeIndex + 1) % N;

      const tau1 = this.phase;
      const tau2 = (this.phase + G / 2) % G;

      if (tau1 === 0) {
        this.anchor1 = (this.writeIndex - G + N) % N;
      }
      if (tau2 === 0) {
        this.anchor2 = (this.writeIndex - G + N) % N;
      }

      // Hanning window envelopes
      const w1 = 0.5 * (1 - Math.cos((2 * Math.PI * tau1) / G));
      const w2 = 0.5 * (1 - Math.cos((2 * Math.PI * tau2) / G));

      // Grain 1 with fractional linear interpolation
      const readPos1 = (this.anchor1 + tau1 * r + N) % N;
      const i1 = Math.floor(readPos1);
      const f1 = readPos1 - i1;
      const s1 = buffer[i1] * (1 - f1) + buffer[(i1 + 1) % N] * f1;

      // Grain 2 with fractional linear interpolation
      const readPos2 = (this.anchor2 + tau2 * r + N) % N;
      const i2 = Math.floor(readPos2);
      const f2 = readPos2 - i2;
      const s2 = buffer[i2] * (1 - f2) + buffer[(i2 + 1) % N] * f2;

      output[i] = s1 * w1 + s2 * w2;

      this.phase = (this.phase + 1) % G;
    }
  }

  public setPitch(semitones: number): void {
    this.config.pitchSemitones = Math.max(-12, Math.min(12, semitones));
  }

  public setSubBass(db: number): void {
    this.config.subBassDb = Math.max(0, Math.min(22, db));
    const now = this.ctx.currentTime;
    this.subBassFilter.gain.setTargetAtTime(this.config.subBassDb, now, 0.05);
    this.subPeakFilter.gain.setTargetAtTime(Math.min(14, this.config.subBassDb * 0.7), now, 0.05);
  }

  public setGourdResonance(db: number): void {
    this.config.gourdResonanceDb = Math.max(0, Math.min(14, db));
    this.gourdFilter.gain.setTargetAtTime(this.config.gourdResonanceDb, this.ctx.currentTime, 0.05);
  }

  public setDrive(amount: number): void {
    this.config.driveAmount = Math.max(0, Math.min(1.0, amount));
    this.updateDriveCurve(this.config.driveAmount);
  }

  public setReverb(amount: number): void {
    this.config.reverbAmount = Math.max(0, Math.min(1.0, amount));
    this.wetGain.gain.setTargetAtTime(this.config.reverbAmount * 0.7, this.ctx.currentTime, 0.05);
  }

  public applyPreset(presetKey: string): void {
    const p = VOICE_PRESETS[presetKey];
    if (p) {
      this.config = { ...p.config };
      const now = this.ctx.currentTime;
      this.subBassFilter.gain.setTargetAtTime(this.config.subBassDb, now, 0.05);
      this.subPeakFilter.gain.setTargetAtTime(Math.min(14, this.config.subBassDb * 0.7), now, 0.05);
      this.gourdFilter.gain.setTargetAtTime(this.config.gourdResonanceDb, now, 0.05);
      this.boxCutFilter.frequency.setTargetAtTime(this.config.boxCutFreq, now, 0.05);
      this.wetGain.gain.setTargetAtTime(this.config.reverbAmount * 0.7, now, 0.05);
      this.updateDriveCurve(this.config.driveAmount);
    }
  }

  public getConfig(): VoiceConfig {
    return { ...this.config };
  }

  private updateDriveCurve(drive: number): void {
    const n = 256;
    const curve = new Float32Array(n);
    const k = drive * 24; // drive intensity

    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      if (k === 0) {
        curve[i] = x;
      } else {
        // Soft clipping sigmoid curve
        curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
      }
    }
    this.waveShaper.curve = curve;
  }
}
