import { syncBus } from '../sync/channel';
import { VoiceTransformer, VoiceConfig, DEFAULT_VOICE_CONFIG } from './voice-transformer';

export class MicEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private timeData: Float32Array<ArrayBuffer> | null = null;
  private cleanGainNode: GainNode | null = null;
  private dspGainNode: GainNode | null = null;
  private masterGainNode: GainNode | null = null;
  private localMonitorGainNode: GainNode | null = null;
  private streamDestinationNode: MediaStreamAudioDestinationNode | null = null;
  private auxInputNode: GainNode | null = null;
  public voiceTransformer: VoiceTransformer | null = null;
  public voiceConfig: VoiceConfig = { ...DEFAULT_VOICE_CONFIG };

  public isArmed: boolean = false;
  public gate: number = 0.012; // Sensitive threshold for normal speech
  public smoothness: number = 0.25;
  public gain: number = 4.5; // Multiplier to comfortably open jaw
  public monitorEnabled: boolean = false; // Local laptop monitor (defaults to false to prevent feedback)

  // Direct Voice Transmission & Master Volume Controls
  public transmissionEnabled: boolean = true; // Voice to Stage/Speakers (enabled by default when armed)
  public isCleanPassthrough: boolean = true;   // True = Direct Mic (Clean / No Change), False = Halloween DSP
  public masterVolume: number = 1.0;          // 0.0 to 2.0 (100% default)

  public rawRms: number = 0;
  public smoothedLevel: number = 0;

  private meterInterval: number | null = null;

  constructor(initialGate: number = 0.012, initialSmoothness: number = 0.25) {
    this.gate = initialGate;
    this.smoothness = initialSmoothness;
  }

  public initContextAndMasterChain(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    if (!this.masterGainNode) {
      this.masterGainNode = this.audioCtx.createGain();
      this.masterGainNode.gain.value = this.transmissionEnabled ? this.masterVolume : 0;

      this.streamDestinationNode = this.audioCtx.createMediaStreamDestination();
      this.masterGainNode.connect(this.streamDestinationNode);

      this.localMonitorGainNode = this.audioCtx.createGain();
      this.localMonitorGainNode.gain.value = this.monitorEnabled ? 1.0 : 0;
      this.masterGainNode.connect(this.localMonitorGainNode);
      this.localMonitorGainNode.connect(this.audioCtx.destination);

      this.auxInputNode = this.audioCtx.createGain();
      this.auxInputNode.gain.value = 1.0;
      this.auxInputNode.connect(this.masterGainNode);
    }
    return this.audioCtx;
  }

  public getAudioContext(): AudioContext {
    return this.initContextAndMasterChain();
  }

  public getAuxInputNode(): GainNode {
    this.initContextAndMasterChain();
    return this.auxInputNode!;
  }

  public async arm(): Promise<boolean> {
    if (this.isArmed && this.audioCtx && this.audioCtx.state === 'running') {
      return true;
    }

    try {
      this.initContextAndMasterChain();

      if (!this.stream) {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: true
          }
        });

        const source = this.audioCtx!.createMediaStreamSource(this.stream);
        this.analyser = this.audioCtx!.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.15;
        this.timeData = new Float32Array(new ArrayBuffer(this.analyser.fftSize * 4));

        source.connect(this.analyser);

        // Path A: Direct Clean Mic Passthrough (Zero DSP, Zero Distortion, No Change)
        this.cleanGainNode = this.audioCtx!.createGain();
        this.cleanGainNode.gain.value = this.isCleanPassthrough ? 1.0 : 0.0;
        source.connect(this.cleanGainNode);
        this.cleanGainNode.connect(this.masterGainNode!);

        // Path B: Halloween Voice Transformer DSP
        this.voiceTransformer = new VoiceTransformer(this.audioCtx!, this.voiceConfig);
        this.dspGainNode = this.audioCtx!.createGain();
        this.dspGainNode.gain.value = this.isCleanPassthrough ? 0.0 : 1.0;
        source.connect(this.voiceTransformer.inputNode);
        this.voiceTransformer.outputNode.connect(this.dspGainNode);
        this.dspGainNode.connect(this.masterGainNode!);

        this.updateRouting();
      }

      this.isArmed = true;

      if (!this.meterInterval) {
        this.meterInterval = window.setInterval(() => {
          this.tick();
          syncBus.send({
            type: 'AUDIO_METER',
            rawRms: this.rawRms,
            smoothed: this.smoothedLevel,
            isArmed: this.isArmed
          });
        }, 33);
      }

      return true;
    } catch (err) {
      console.error('Failed to initialize microphone access:', err);
      this.isArmed = false;
      return false;
    }
  }

  public getOutputStream(): MediaStream | null {
    return this.streamDestinationNode ? this.streamDestinationNode.stream : null;
  }

  public setMonitor(enabled: boolean): void {
    this.monitorEnabled = enabled;
    this.updateRouting();
  }

  public setTransmission(enabled: boolean): void {
    this.transmissionEnabled = enabled;
    this.updateRouting();
    syncBus.send({ type: 'SET_VOICE_TRANSMIT', enabled });
  }

  public setCleanPassthrough(clean: boolean): void {
    this.isCleanPassthrough = clean;
    this.updateRouting();
  }

  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(2.5, vol));
    this.updateRouting();
    syncBus.send({ type: 'SET_VOICE_VOLUME', volume: this.masterVolume });
  }

  private updateRouting(): void {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    const now = this.audioCtx.currentTime;
    const targetMaster = this.transmissionEnabled ? this.masterVolume : 0;
    if (this.masterGainNode) {
      this.masterGainNode.gain.setTargetAtTime(targetMaster, now, 0.02);
    }
    if (this.localMonitorGainNode) {
      this.localMonitorGainNode.gain.setTargetAtTime(this.monitorEnabled ? 1.0 : 0, now, 0.02);
    }

    if (this.cleanGainNode && this.dspGainNode) {
      if (this.isCleanPassthrough) {
        this.cleanGainNode.gain.setTargetAtTime(1.0, now, 0.02);
        this.dspGainNode.gain.setTargetAtTime(0.0, now, 0.02);
      } else {
        this.cleanGainNode.gain.setTargetAtTime(0.0, now, 0.02);
        this.dspGainNode.gain.setTargetAtTime(1.0, now, 0.02);
      }
    }
  }

  public disarm(): void {
    this.isArmed = false;
    this.smoothedLevel = 0;
    this.rawRms = 0;
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.cleanGainNode) {
      try { this.cleanGainNode.disconnect(); } catch (_) {}
      this.cleanGainNode = null;
    }
    if (this.dspGainNode) {
      try { this.dspGainNode.disconnect(); } catch (_) {}
      this.dspGainNode = null;
    }
    this.voiceTransformer = null;
    if (this.meterInterval) {
      clearInterval(this.meterInterval);
      this.meterInterval = null;
    }
  }

  public destroy(): void {
    this.disarm();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.masterGainNode = null;
    this.localMonitorGainNode = null;
    this.streamDestinationNode = null;
    this.auxInputNode = null;
  }

  public setVoicePitch(semitones: number): void {
    this.voiceConfig.pitchSemitones = semitones;
    if (this.voiceTransformer) this.voiceTransformer.setPitch(semitones);
  }

  public setVoiceSubBass(db: number): void {
    this.voiceConfig.subBassDb = db;
    if (this.voiceTransformer) this.voiceTransformer.setSubBass(db);
  }

  public setVoiceGourdResonance(db: number): void {
    this.voiceConfig.gourdResonanceDb = db;
    if (this.voiceTransformer) this.voiceTransformer.setGourdResonance(db);
  }

  public setVoiceDrive(amt: number): void {
    this.voiceConfig.driveAmount = amt;
    if (this.voiceTransformer) this.voiceTransformer.setDrive(amt);
  }

  public setVoiceReverb(amt: number): void {
    this.voiceConfig.reverbAmount = amt;
    if (this.voiceTransformer) this.voiceTransformer.setReverb(amt);
  }

  public applyVoicePreset(key: string): void {
    if (this.voiceTransformer) {
      this.voiceTransformer.applyPreset(key);
      this.voiceConfig = this.voiceTransformer.getConfig();
    }
  }

  public toggle(): Promise<boolean> | void {
    if (this.isArmed) {
      this.disarm();
      syncBus.send({
        type: 'AUDIO_METER',
        rawRms: 0,
        smoothed: 0,
        isArmed: false
      });
      return;
    } else {
      return this.arm();
    }
  }

  public setGate(val: number): void {
    this.gate = Math.max(0, Math.min(1.0, val));
  }

  public setSmoothness(val: number): void {
    this.smoothness = Math.max(0.01, Math.min(0.99, val));
  }

  public tick(): number {
    if (!this.isArmed || !this.analyser || !this.timeData) {
      this.smoothedLevel = 0;
      this.rawRms = 0;
      return 0;
    }

    this.analyser.getFloatTimeDomainData(this.timeData);

    let sum = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      const sample = this.timeData[i];
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / this.timeData.length);
    this.rawRms = rms;

    // Apply noise gate
    let target = 0;
    if (rms > this.gate) {
      const normalized = (rms - this.gate) / Math.max(0.001, (0.08 - this.gate));
      target = Math.min(1.0, normalized * this.gain);
    }

    const alpha = target > this.smoothedLevel ? (1 - this.smoothness * 0.3) : (1 - this.smoothness);
    this.smoothedLevel = this.smoothedLevel + (target - this.smoothedLevel) * Math.max(0.05, alpha);

    if (this.smoothedLevel < 0.005) {
      this.smoothedLevel = 0;
    }
    if (this.smoothedLevel > 1.0) {
      this.smoothedLevel = 1.0;
    }

    return this.smoothedLevel;
  }
}
