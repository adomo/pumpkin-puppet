import { syncBus, PuppetSlot, CornerKey, SyncMessage } from '../sync/channel';
import {
  loadConfig,
  saveConfig,
  PuppetTransform,
  MappingProfile,
  DEFAULT_CORNERS,
  DEFAULT_TRANSFORMS,
  FaceStyle,
  ShowMode,
  VideoConfig,
  VideoLayout,
  DEFAULT_VIDEO_CONFIG
} from '../sync/storage';
import { MicEngine } from '../audio/mic';
import { showConductor } from '../show/conductor';

class DeskApp {
  private showMode: ShowMode = 'procedural';
  private videoConfig: VideoConfig;
  private isUserScrubbingVideo: boolean = false;

  private currentFocus: PuppetSlot = 'center';
  private currentGate: number = 0.012;
  private currentSmoothness: number = 0.25;
  private currentDelay: number = 0;
  private currentTransforms: Record<PuppetSlot, PuppetTransform>;
  private profiles: Record<string, MappingProfile>;
  private activeProfileId: string = 'default';
  private mappingModeActive: boolean = false;
  private micEngine: MicEngine;

  // Mode Switcher DOM
  private tabModeProcedural!: HTMLButtonElement;
  private tabModeVideo!: HTMLButtonElement;
  private modeDescText!: HTMLElement;
  private cardAudioVoice!: HTMLElement;
  private cardVideoPlayer!: HTMLElement;
  private cardProceduralActions!: HTMLElement;
  private cardVideoCrops!: HTMLElement;

  // Video Player DOM Elements
  private videoStatusBadge!: HTMLElement;
  private videoDropZone!: HTMLElement;
  private fileVideoInput!: HTMLInputElement;
  private videoCurrentTitle!: HTMLElement;
  private videoUploadProgress!: HTMLElement;
  private videoUploadFill!: HTMLElement;
  private selectServerVideos!: HTMLSelectElement;
  private btnRefreshVideos!: HTMLButtonElement;
  private btnVideoPlay!: HTMLButtonElement;
  private btnVideoPause!: HTMLButtonElement;
  private btnVideoStop!: HTMLButtonElement;
  private chkVideoLoop!: HTMLInputElement;
  private sliderVideoScrub!: HTMLInputElement;
  private valVideoTime!: HTMLElement;
  private sliderVideoVol!: HTMLInputElement;
  private valVideoVol!: HTMLElement;
  private btnVideoMute!: HTMLButtonElement;
  private sliderEdgeFeather!: HTMLInputElement;
  private valEdgeFeather!: HTMLElement;
  private btnVideoToggleGrid!: HTMLButtonElement;
  private btnVideoToggleBlackCard!: HTMLButtonElement;
  private btnVideoBlackout!: HTMLButtonElement;

  // Video Crops DOM Elements
  private selectVideoLayout!: HTMLSelectElement;
  private sliderCropLeftX!: HTMLInputElement;
  private sliderCropLeftW!: HTMLInputElement;
  private valCropLeftX!: HTMLElement;
  private valCropLeftW!: HTMLElement;
  private valCropLeft!: HTMLElement;
  private sliderCropCenterX!: HTMLInputElement;
  private sliderCropCenterW!: HTMLInputElement;
  private valCropCenterX!: HTMLElement;
  private valCropCenterW!: HTMLElement;
  private valCropCenter!: HTMLElement;
  private sliderCropRightX!: HTMLInputElement;
  private sliderCropRightW!: HTMLInputElement;
  private valCropRightX!: HTMLElement;
  private valCropRightW!: HTMLElement;
  private valCropRight!: HTMLElement;
  private btnResetCrops!: HTMLButtonElement;

  // Timeline Conductor DOM
  private selectShowPreset!: HTMLSelectElement;
  private btnTimelinePlay!: HTMLButtonElement;
  private btnTimelineStop!: HTMLButtonElement;
  private chkTimelineLoop!: HTMLInputElement;
  private sliderTimelineScrub!: HTMLInputElement;
  private valTimelineTime!: HTMLElement;
  private timelineSubtitleText!: HTMLElement;
  private timelineStatusBadge!: HTMLElement;
  private isUserScrubbing: boolean = false;

  // DOM Elements - Audio
  private meterLevelEl!: HTMLElement;
  private meterGateMarkerEl!: HTMLElement;
  private meterValTextEl!: HTMLElement;
  private micStatusEl!: HTMLElement;
  private btnArmMic!: HTMLButtonElement;
  private chkMonitor!: HTMLInputElement;
  private sliderGate!: HTMLInputElement;
  private valGateEl!: HTMLElement;
  private sliderSmooth!: HTMLInputElement;
  private valSmoothEl!: HTMLElement;
  private sliderDelay!: HTMLInputElement;
  private valDelayEl!: HTMLElement;

  // Voice DSP DOM Elements
  private selectVoicePreset!: HTMLSelectElement;
  private sliderVoicePitch!: HTMLInputElement;
  private valVoicePitchEl!: HTMLElement;
  private sliderVoiceSub!: HTMLInputElement;
  private valVoiceSubEl!: HTMLElement;
  private sliderVoiceGourd!: HTMLInputElement;
  private valVoiceGourdEl!: HTMLElement;
  private sliderVoiceDrive!: HTMLInputElement;
  private valVoiceDriveEl!: HTMLElement;
  private sliderVoiceReverb!: HTMLInputElement;
  private valVoiceReverbEl!: HTMLElement;

  // DOM Elements - Focus & Mapping
  private focusNameEl!: HTMLElement;
  private btnFocusLeft!: HTMLButtonElement;
  private btnFocusCenter!: HTMLButtonElement;
  private btnFocusRight!: HTMLButtonElement;
  private btnToggleMapping!: HTMLButtonElement;
  private selectFaceStyle!: HTMLSelectElement;

  // Sliders - Position & Dimensions
  private sliderPosX!: HTMLInputElement;
  private valPosXEl!: HTMLElement;
  private sliderPosY!: HTMLInputElement;
  private valPosYEl!: HTMLElement;
  private sliderScaleX!: HTMLInputElement;
  private valScaleXEl!: HTMLElement;
  private sliderScaleY!: HTMLInputElement;
  private valScaleYEl!: HTMLElement;
  private sliderRot!: HTMLInputElement;
  private valRotEl!: HTMLElement;

  // Sliders - Keystone
  private sliderKeystoneV!: HTMLInputElement;
  private sliderKeystoneH!: HTMLInputElement;

  // Corner Number Inputs
  private inpCorners: Record<CornerKey, { x: HTMLInputElement; y: HTMLInputElement }> = {} as any;

  // Interactive Keystone Canvas
  private keystoneCanvas!: HTMLCanvasElement;
  private keystoneCtx!: CanvasRenderingContext2D;
  private draggingCorner: CornerKey | null = null;

  // Profiles
  private selectProfile!: HTMLSelectElement;

  constructor() {
    const config = loadConfig();
    this.showMode = config.showMode || 'procedural';
    this.videoConfig = config.videoConfig || JSON.parse(JSON.stringify(DEFAULT_VIDEO_CONFIG));
    this.currentGate = config.gate;
    this.currentSmoothness = config.smoothness;
    this.currentDelay = config.castDelayMs;
    this.currentTransforms = config.transforms;
    this.profiles = config.profiles;
    this.activeProfileId = config.activeProfileId;
    this.micEngine = new MicEngine(this.currentGate, this.currentSmoothness);

    this.bindDomElements();
    this.initEventListeners();
    this.initVideoShowControls();
    this.initKeystonePad();
    this.populateProfiles();
    this.setupSyncBus();

    this.setMode(this.showMode);
    this.updateVideoUI();
    this.refreshServerVideos();

    syncBus.send({ type: 'SYNC_STATE_REQ' });
    this.updateControlsFromState();
  }

  private bindDomElements(): void {
    // Mode Switcher DOM
    this.tabModeProcedural = document.getElementById('tab-mode-procedural') as HTMLButtonElement;
    this.tabModeVideo = document.getElementById('tab-mode-video') as HTMLButtonElement;
    this.modeDescText = document.getElementById('mode-desc-text')!;
    this.cardAudioVoice = document.getElementById('card-audio-voice')!;
    this.cardVideoPlayer = document.getElementById('card-video-player')!;
    this.cardProceduralActions = document.getElementById('card-procedural-actions')!;
    this.cardVideoCrops = document.getElementById('card-video-crops')!;

    // Audio & Voice DOM
    this.meterLevelEl = document.getElementById('meter-level')!;
    this.meterGateMarkerEl = document.getElementById('meter-gate-marker')!;
    this.meterValTextEl = document.getElementById('meter-val-text')!;
    this.micStatusEl = document.getElementById('mic-status')!;
    this.btnArmMic = document.getElementById('btn-arm-mic') as HTMLButtonElement;
    this.chkMonitor = document.getElementById('chk-monitor') as HTMLInputElement;
    this.sliderGate = document.getElementById('slider-gate') as HTMLInputElement;
    this.valGateEl = document.getElementById('val-gate')!;
    this.sliderSmooth = document.getElementById('slider-smooth') as HTMLInputElement;
    this.valSmoothEl = document.getElementById('val-smooth')!;
    this.sliderDelay = document.getElementById('slider-delay') as HTMLInputElement;
    this.valDelayEl = document.getElementById('val-delay')!;

    // Voice DSP DOM Elements
    this.selectVoicePreset = document.getElementById('select-voice-preset') as HTMLSelectElement;
    this.sliderVoicePitch = document.getElementById('slider-voice-pitch') as HTMLInputElement;
    this.valVoicePitchEl = document.getElementById('val-voice-pitch')!;
    this.sliderVoiceSub = document.getElementById('slider-voice-sub') as HTMLInputElement;
    this.valVoiceSubEl = document.getElementById('val-voice-sub')!;
    this.sliderVoiceGourd = document.getElementById('slider-voice-gourd') as HTMLInputElement;
    this.valVoiceGourdEl = document.getElementById('val-voice-gourd')!;
    this.sliderVoiceDrive = document.getElementById('slider-voice-drive') as HTMLInputElement;
    this.valVoiceDriveEl = document.getElementById('val-voice-drive')!;
    this.sliderVoiceReverb = document.getElementById('slider-voice-reverb') as HTMLInputElement;
    this.valVoiceReverbEl = document.getElementById('val-voice-reverb')!;

    this.focusNameEl = document.getElementById('focus-name')!;
    this.btnFocusLeft = document.getElementById('btn-focus-left') as HTMLButtonElement;
    this.btnFocusCenter = document.getElementById('btn-focus-center') as HTMLButtonElement;
    this.btnFocusRight = document.getElementById('btn-focus-right') as HTMLButtonElement;
    this.btnToggleMapping = document.getElementById('btn-toggle-mapping') as HTMLButtonElement;
    this.selectFaceStyle = document.getElementById('select-face-style') as HTMLSelectElement;

    this.sliderPosX = document.getElementById('slider-pos-x') as HTMLInputElement;
    this.valPosXEl = document.getElementById('val-pos-x')!;
    this.sliderPosY = document.getElementById('slider-pos-y') as HTMLInputElement;
    this.valPosYEl = document.getElementById('val-pos-y')!;
    this.sliderScaleX = document.getElementById('slider-scale-x') as HTMLInputElement;
    this.valScaleXEl = document.getElementById('val-scale-x')!;
    this.sliderScaleY = document.getElementById('slider-scale-y') as HTMLInputElement;
    this.valScaleYEl = document.getElementById('val-scale-y')!;
    this.sliderRot = document.getElementById('slider-rot') as HTMLInputElement;
    this.valRotEl = document.getElementById('val-rot')!;

    this.sliderKeystoneV = document.getElementById('slider-keystone-v') as HTMLInputElement;
    this.sliderKeystoneH = document.getElementById('slider-keystone-h') as HTMLInputElement;

    this.inpCorners = {
      tl: {
        x: document.getElementById('inp-tl-x') as HTMLInputElement,
        y: document.getElementById('inp-tl-y') as HTMLInputElement
      },
      tr: {
        x: document.getElementById('inp-tr-x') as HTMLInputElement,
        y: document.getElementById('inp-tr-y') as HTMLInputElement
      },
      bl: {
        x: document.getElementById('inp-bl-x') as HTMLInputElement,
        y: document.getElementById('inp-bl-y') as HTMLInputElement
      },
      br: {
        x: document.getElementById('inp-br-x') as HTMLInputElement,
        y: document.getElementById('inp-br-y') as HTMLInputElement
      }
    };

    this.keystoneCanvas = document.getElementById('keystone-canvas') as HTMLCanvasElement;
    this.keystoneCtx = this.keystoneCanvas.getContext('2d')!;

    this.selectProfile = document.getElementById('select-profile') as HTMLSelectElement;

    // Timeline Conductor DOM
    this.selectShowPreset = document.getElementById('select-show-preset') as HTMLSelectElement;
    this.btnTimelinePlay = document.getElementById('btn-timeline-play') as HTMLButtonElement;
    this.btnTimelineStop = document.getElementById('btn-timeline-stop') as HTMLButtonElement;
    this.chkTimelineLoop = document.getElementById('chk-timeline-loop') as HTMLInputElement;
    this.sliderTimelineScrub = document.getElementById('slider-timeline-scrub') as HTMLInputElement;
    this.valTimelineTime = document.getElementById('val-timeline-time')!;
    this.timelineSubtitleText = document.getElementById('timeline-subtitle-text')!;
    this.timelineStatusBadge = document.getElementById('timeline-status-badge')!;

    // Video Player DOM Elements
    this.videoStatusBadge = document.getElementById('video-status-badge')!;
    this.videoDropZone = document.getElementById('video-drop-zone')!;
    this.fileVideoInput = document.getElementById('file-video-input') as HTMLInputElement;
    this.videoCurrentTitle = document.getElementById('video-current-title')!;
    this.videoUploadProgress = document.getElementById('video-upload-progress')!;
    this.videoUploadFill = document.getElementById('video-upload-fill')!;
    this.selectServerVideos = document.getElementById('select-server-videos') as HTMLSelectElement;
    this.btnRefreshVideos = document.getElementById('btn-refresh-videos') as HTMLButtonElement;
    this.btnVideoPlay = document.getElementById('btn-video-play') as HTMLButtonElement;
    this.btnVideoPause = document.getElementById('btn-video-pause') as HTMLButtonElement;
    this.btnVideoStop = document.getElementById('btn-video-stop') as HTMLButtonElement;
    this.chkVideoLoop = document.getElementById('chk-video-loop') as HTMLInputElement;
    this.sliderVideoScrub = document.getElementById('slider-video-scrub') as HTMLInputElement;
    this.valVideoTime = document.getElementById('val-video-time')!;
    this.sliderVideoVol = document.getElementById('slider-video-vol') as HTMLInputElement;
    this.valVideoVol = document.getElementById('val-video-vol')!;
    this.btnVideoMute = document.getElementById('btn-video-mute') as HTMLButtonElement;
    this.sliderEdgeFeather = document.getElementById('slider-edge-feather') as HTMLInputElement;
    this.valEdgeFeather = document.getElementById('val-edge-feather')!;
    this.btnVideoToggleGrid = document.getElementById('btn-video-toggle-grid') as HTMLButtonElement;
    this.btnVideoToggleBlackCard = document.getElementById('btn-video-toggle-black-card') as HTMLButtonElement;
    this.btnVideoBlackout = document.getElementById('btn-video-blackout') as HTMLButtonElement;

    // Video Crops DOM Elements
    this.selectVideoLayout = document.getElementById('select-video-layout') as HTMLSelectElement;
    this.sliderCropLeftX = document.getElementById('slider-crop-left-x') as HTMLInputElement;
    this.sliderCropLeftW = document.getElementById('slider-crop-left-w') as HTMLInputElement;
    this.valCropLeftX = document.getElementById('val-crop-left-x')!;
    this.valCropLeftW = document.getElementById('val-crop-left-w')!;
    this.valCropLeft = document.getElementById('val-crop-left')!;

    this.sliderCropCenterX = document.getElementById('slider-crop-center-x') as HTMLInputElement;
    this.sliderCropCenterW = document.getElementById('slider-crop-center-w') as HTMLInputElement;
    this.valCropCenterX = document.getElementById('val-crop-center-x')!;
    this.valCropCenterW = document.getElementById('val-crop-center-w')!;
    this.valCropCenter = document.getElementById('val-crop-center')!;

    this.sliderCropRightX = document.getElementById('slider-crop-right-x') as HTMLInputElement;
    this.sliderCropRightW = document.getElementById('slider-crop-right-w') as HTMLInputElement;
    this.valCropRightX = document.getElementById('val-crop-right-x')!;
    this.valCropRightW = document.getElementById('val-crop-right-w')!;
    this.valCropRight = document.getElementById('val-crop-right')!;

    this.btnResetCrops = document.getElementById('btn-reset-crops') as HTMLButtonElement;

    // Set initial audio sliders
    this.sliderGate.value = this.currentGate.toString();
    this.valGateEl.textContent = this.currentGate.toFixed(3);
    this.meterGateMarkerEl.style.left = `${Math.min(100, (this.currentGate / 0.08) * 100)}%`;

    this.sliderSmooth.value = this.currentSmoothness.toString();
    this.valSmoothEl.textContent = this.currentSmoothness.toFixed(2);

    this.sliderDelay.value = this.currentDelay.toString();
    this.valDelayEl.textContent = `${this.currentDelay} ms`;
  }

  private initEventListeners(): void {
    // Mic Arm
    this.btnArmMic.addEventListener('click', async () => {
      await this.micEngine.toggle();
      this.updateMicStatus(this.micEngine.isArmed);
    });

    // Monitor passthrough
    this.chkMonitor.addEventListener('change', () => {
      this.micEngine.setMonitor(this.chkMonitor.checked);
      syncBus.send({ type: 'SET_MONITOR', enabled: this.chkMonitor.checked });
    });

    // Voice DSP Controls
    this.sliderVoicePitch.addEventListener('input', () => {
      const st = parseInt(this.sliderVoicePitch.value, 10);
      this.micEngine.setVoicePitch(st);
      this.valVoicePitchEl.textContent = `${st > 0 ? '+' : ''}${st} st (${st < 0 ? 'Deeper' : st > 0 ? 'Higher' : 'Normal'})`;
    });

    this.sliderVoiceSub.addEventListener('input', () => {
      const db = parseFloat(this.sliderVoiceSub.value);
      this.micEngine.setVoiceSubBass(db);
      this.valVoiceSubEl.textContent = `+${db} dB (${db > 10 ? 'Heavy Subs' : db > 0 ? 'Warm Bass' : 'Off'})`;
    });

    this.sliderVoiceGourd.addEventListener('input', () => {
      const db = parseFloat(this.sliderVoiceGourd.value);
      this.micEngine.setVoiceGourdResonance(db);
      this.valVoiceGourdEl.textContent = `+${db} dB`;
    });

    this.sliderVoiceDrive.addEventListener('input', () => {
      const pct = parseInt(this.sliderVoiceDrive.value, 10);
      this.micEngine.setVoiceDrive(pct / 100);
      this.valVoiceDriveEl.textContent = `${pct}%`;
    });

    this.sliderVoiceReverb.addEventListener('input', () => {
      const pct = parseInt(this.sliderVoiceReverb.value, 10);
      this.micEngine.setVoiceReverb(pct / 100);
      this.valVoiceReverbEl.textContent = `${pct}%`;
    });

    this.selectVoicePreset.addEventListener('change', () => {
      const key = this.selectVoicePreset.value;
      this.micEngine.applyVoicePreset(key);
      const cfg = this.micEngine.voiceConfig;
      this.sliderVoicePitch.value = cfg.pitchSemitones.toString();
      this.valVoicePitchEl.textContent = `${cfg.pitchSemitones > 0 ? '+' : ''}${cfg.pitchSemitones} st (${cfg.pitchSemitones < 0 ? 'Deeper' : cfg.pitchSemitones > 0 ? 'Higher' : 'Normal'})`;

      this.sliderVoiceSub.value = cfg.subBassDb.toString();
      this.valVoiceSubEl.textContent = `+${cfg.subBassDb} dB (${cfg.subBassDb > 10 ? 'Heavy Subs' : cfg.subBassDb > 0 ? 'Warm Bass' : 'Off'})`;

      this.sliderVoiceGourd.value = cfg.gourdResonanceDb.toString();
      this.valVoiceGourdEl.textContent = `+${cfg.gourdResonanceDb} dB`;

      this.sliderVoiceDrive.value = Math.round(cfg.driveAmount * 100).toString();
      this.valVoiceDriveEl.textContent = `${Math.round(cfg.driveAmount * 100)}%`;

      this.sliderVoiceReverb.value = Math.round(cfg.reverbAmount * 100).toString();
      this.valVoiceReverbEl.textContent = `${Math.round(cfg.reverbAmount * 100)}%`;
    });

    // Gate
    this.sliderGate.addEventListener('input', () => {
      const val = parseFloat(this.sliderGate.value);
      this.currentGate = val;
      this.valGateEl.textContent = val.toFixed(3);
      this.meterGateMarkerEl.style.left = `${Math.min(100, (val / 0.08) * 100)}%`;
      this.micEngine.setGate(val);
      syncBus.send({ type: 'SET_GATE', gate: val });
    });

    // Smoothness
    this.sliderSmooth.addEventListener('input', () => {
      const val = parseFloat(this.sliderSmooth.value);
      this.currentSmoothness = val;
      this.valSmoothEl.textContent = val.toFixed(2);
      this.micEngine.setSmoothness(val);
      syncBus.send({ type: 'SET_SMOOTHNESS', smoothness: val });
    });

    // Cast Delay
    this.sliderDelay.addEventListener('input', () => {
      const val = parseInt(this.sliderDelay.value, 10);
      this.currentDelay = val;
      this.valDelayEl.textContent = `${val} ms`;
      syncBus.send({ type: 'SET_DELAY', castDelayMs: val });
    });

    // Focus Buttons
    this.btnFocusLeft.addEventListener('click', () => this.setFocus('left'));
    this.btnFocusCenter.addEventListener('click', () => this.setFocus('center'));
    this.btnFocusRight.addEventListener('click', () => this.setFocus('right'));

    // Toggle Mapping Mode
    this.btnToggleMapping.addEventListener('click', () => {
      syncBus.send({ type: 'TOGGLE_MAPPING_MODE' });
    });

    // Face Style Selector
    this.selectFaceStyle.addEventListener('change', () => {
      const style = this.selectFaceStyle.value as FaceStyle;
      this.currentTransforms[this.currentFocus].faceStyle = style;
      syncBus.send({
        type: 'SET_FACE_STYLE',
        slot: this.currentFocus,
        style
      });
    });

    // Transform Sliders
    this.sliderPosX.addEventListener('input', () => {
      const val = parseFloat(this.sliderPosX.value);
      this.valPosXEl.textContent = `${Math.round(val)}px`;
      this.currentTransforms[this.currentFocus].x = val;
      this.broadcastTransform();
    });

    this.sliderPosY.addEventListener('input', () => {
      const val = parseFloat(this.sliderPosY.value);
      this.valPosYEl.textContent = `${Math.round(val)}px`;
      this.currentTransforms[this.currentFocus].y = val;
      this.broadcastTransform();
    });

    this.sliderScaleX.addEventListener('input', () => {
      const val = parseFloat(this.sliderScaleX.value);
      this.valScaleXEl.textContent = val.toFixed(2);
      this.currentTransforms[this.currentFocus].scaleX = val;
      this.broadcastTransform();
    });

    this.sliderScaleY.addEventListener('input', () => {
      const val = parseFloat(this.sliderScaleY.value);
      this.valScaleYEl.textContent = val.toFixed(2);
      this.currentTransforms[this.currentFocus].scaleY = val;
      this.broadcastTransform();
    });

    this.sliderRot.addEventListener('input', () => {
      const val = parseFloat(this.sliderRot.value);
      this.valRotEl.textContent = `${Math.round(val)}°`;
      this.currentTransforms[this.currentFocus].rotation = val;
      this.broadcastTransform();
    });

    // Quick Keystone Sliders
    this.sliderKeystoneV.addEventListener('input', () => {
      const taper = parseFloat(this.sliderKeystoneV.value);
      const tf = this.currentTransforms[this.currentFocus];
      tf.corners.tl[0] = -taper;
      tf.corners.tr[0] = taper;
      tf.corners.bl[0] = taper;
      tf.corners.br[0] = -taper;
      this.broadcastTransform();
      this.updateCornerInputs();
      this.drawKeystonePad();
    });

    this.sliderKeystoneH.addEventListener('input', () => {
      const taper = parseFloat(this.sliderKeystoneH.value);
      const tf = this.currentTransforms[this.currentFocus];
      tf.corners.tl[1] = -taper;
      tf.corners.bl[1] = taper;
      tf.corners.tr[1] = taper;
      tf.corners.br[1] = -taper;
      this.broadcastTransform();
      this.updateCornerInputs();
      this.drawKeystonePad();
    });

    // Corner numerical inputs
    const cornerKeys: CornerKey[] = ['tl', 'tr', 'bl', 'br'];
    cornerKeys.forEach((key) => {
      const { x, y } = this.inpCorners[key];
      x.addEventListener('change', () => {
        const val = parseFloat(x.value) || 0;
        this.currentTransforms[this.currentFocus].corners[key][0] = val;
        this.broadcastTransform();
        this.drawKeystonePad();
      });
      y.addEventListener('change', () => {
        const val = parseFloat(y.value) || 0;
        this.currentTransforms[this.currentFocus].corners[key][1] = val;
        this.broadcastTransform();
        this.drawKeystonePad();
      });
    });

    // Resets
    document.getElementById('btn-reset-keystone')?.addEventListener('click', () => {
      this.currentTransforms[this.currentFocus].corners = JSON.parse(JSON.stringify(DEFAULT_CORNERS));
      this.sliderKeystoneV.value = '0';
      this.sliderKeystoneH.value = '0';
      syncBus.send({ type: 'RESET_KEYSTONE', slot: this.currentFocus });
      this.updateControlsFromState();
    });

    document.getElementById('btn-reset-tf')?.addEventListener('click', () => {
      this.currentTransforms[this.currentFocus] = JSON.parse(JSON.stringify(DEFAULT_TRANSFORMS[this.currentFocus]));
      syncBus.send({ type: 'RESET_TRANSFORM', slot: this.currentFocus });
      this.updateControlsFromState();
    });

    // Diagnostics
    document.getElementById('btn-toggle-grid')?.addEventListener('click', () => {
      syncBus.send({ type: 'TOGGLE_DIAGNOSTIC', diag: 'grid' });
    });
    document.getElementById('btn-toggle-black-card')?.addEventListener('click', () => {
      syncBus.send({ type: 'TOGGLE_DIAGNOSTIC', diag: 'black-card' });
    });
    document.getElementById('btn-blackout')?.addEventListener('click', () => {
      syncBus.send({ type: 'TOGGLE_DIAGNOSTIC', diag: 'blackout' });
    });

    // Actions
    document.querySelectorAll('[data-action]').forEach((el) => {
      el.addEventListener('click', (e) => {
        const btn = e.currentTarget as HTMLElement;
        const action = btn.getAttribute('data-action');
        if (action) {
          syncBus.send({ type: 'TRIGGER_ACTION', action });
        }
      });
    });

    // Profiles UI
    this.selectProfile.addEventListener('change', () => {
      const pid = this.selectProfile.value;
      syncBus.send({ type: 'SET_ACTIVE_PROFILE', profileId: pid });
    });

    document.getElementById('btn-save-profile')?.addEventListener('click', () => {
      const name = prompt('Enter a name for this pumpkin mapping profile:', 'Show Profile ' + new Date().toLocaleTimeString());
      if (name && name.trim()) {
        syncBus.send({ type: 'SAVE_NEW_PROFILE', name: name.trim() });
      }
    });

    document.getElementById('btn-export-profile')?.addEventListener('click', () => {
      const jsonStr = JSON.stringify(this.profiles, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pumpkin_mapping_profiles.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    const fileProfileImport = document.getElementById('file-profile-import') as HTMLInputElement;
    fileProfileImport?.addEventListener('change', () => {
      const file = fileProfileImport.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const imported = JSON.parse(e.target?.result as string);
            if (typeof imported === 'object') {
              this.profiles = imported;
              const cfg = loadConfig();
              cfg.profiles = imported;
              saveConfig(cfg);
              this.populateProfiles();
            }
          } catch (err) {
            alert('Invalid profile JSON file: ' + err);
          }
        };
        reader.readAsText(file);
      }
    });

    // Custom SVG Face
    const fileSvg = document.getElementById('file-svg') as HTMLInputElement;
    fileSvg?.addEventListener('change', () => {
      const file = fileSvg.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (content) {
            syncBus.send({ type: 'LOAD_SVG', svgContent: content });
            this.currentTransforms[this.currentFocus].faceStyle = 'custom';
            this.selectFaceStyle.value = 'custom';
            syncBus.send({
              type: 'SET_FACE_STYLE',
              slot: this.currentFocus,
              style: 'custom'
            });
            const nameEl = document.getElementById('svg-name');
            if (nameEl) nameEl.textContent = file.name;
          }
        };
        reader.readAsText(file);
      }
    });

    // Timeline Conductor & Show Setup
    showConductor.loadFromUrl('/shows/jokes.json').catch((err) => {
      console.warn('Could not load default jokes.json:', err);
    });

    showConductor.onTick((time, duration, text) => {
      if (!this.isUserScrubbing) {
        this.sliderTimelineScrub.max = duration.toFixed(2);
        this.sliderTimelineScrub.value = time.toFixed(2);
      }
      this.valTimelineTime.textContent = `${this.formatTime(time)} / ${this.formatTime(duration)}`;
      if (text) {
        this.timelineSubtitleText.textContent = text;
      }
    });

    showConductor.onStateChange((isPlaying) => {
      if (isPlaying) {
        this.btnTimelinePlay.textContent = '⏸ Pause Show';
        this.timelineStatusBadge.textContent = 'Playing';
        this.timelineStatusBadge.style.color = '#10b981';
        this.timelineStatusBadge.style.background = 'rgba(16,185,129,0.15)';
        this.timelineStatusBadge.style.borderColor = 'rgba(16,185,129,0.3)';
      } else {
        this.btnTimelinePlay.textContent = '▶ Play Show';
        this.timelineStatusBadge.textContent = 'Ready / Paused';
        this.timelineStatusBadge.style.color = '#fbbf24';
        this.timelineStatusBadge.style.background = 'rgba(251,191,36,0.15)';
        this.timelineStatusBadge.style.borderColor = 'rgba(251,191,36,0.3)';
      }
    });

    this.btnTimelinePlay.addEventListener('click', () => {
      showConductor.togglePlay();
    });

    this.btnTimelineStop.addEventListener('click', () => {
      showConductor.stop();
      this.timelineSubtitleText.textContent = '— Stopped —';
      this.timelineStatusBadge.textContent = 'Stopped';
    });

    this.chkTimelineLoop.addEventListener('change', () => {
      showConductor.setLoop(this.chkTimelineLoop.checked);
    });

    this.sliderTimelineScrub.addEventListener('mousedown', () => {
      this.isUserScrubbing = true;
    });

    this.sliderTimelineScrub.addEventListener('input', () => {
      const target = parseFloat(this.sliderTimelineScrub.value);
      this.valTimelineTime.textContent = `${this.formatTime(target)} / ${this.formatTime(showConductor.getDuration())}`;
    });

    this.sliderTimelineScrub.addEventListener('change', () => {
      const target = parseFloat(this.sliderTimelineScrub.value);
      showConductor.seek(target);
      this.isUserScrubbing = false;
    });

    this.selectShowPreset.addEventListener('change', () => {
      const val = this.selectShowPreset.value;
      if (val !== 'custom') {
        showConductor.loadFromUrl(val).then((tl) => {
          const nameEl = document.getElementById('timeline-name');
          if (nameEl) nameEl.textContent = val.split('/').pop() || val;
          this.timelineSubtitleText.textContent = `— Loaded ${tl.title} —`;
        }).catch((err) => {
          alert('Failed to load show preset: ' + err);
        });
      }
    });

    // Custom Audio Song Loader
    const fileAudio = document.getElementById('file-audio') as HTMLInputElement;
    const btnClearAudio = document.getElementById('btn-clear-audio') as HTMLButtonElement;
    fileAudio?.addEventListener('change', async () => {
      const file = fileAudio.files?.[0];
      if (file) {
        await showConductor.loadAudioFile(file);
        const nameEl = document.getElementById('audio-name');
        if (nameEl) nameEl.textContent = file.name;
        if (btnClearAudio) btnClearAudio.style.display = 'inline-block';
      }
    });

    btnClearAudio?.addEventListener('click', () => {
      showConductor.clearAudio();
      const nameEl = document.getElementById('audio-name');
      if (nameEl) nameEl.textContent = 'Procedural Synth';
      btnClearAudio.style.display = 'none';
      if (fileAudio) fileAudio.value = '';
    });

    // Custom Timeline JSON Loader
    const fileTimeline = document.getElementById('file-timeline') as HTMLInputElement;
    fileTimeline?.addEventListener('change', () => {
      const file = fileTimeline.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const tl = showConductor.loadFromJsonString(content);
            const nameEl = document.getElementById('timeline-name');
            if (nameEl) nameEl.textContent = file.name;

            // Enable and select custom option in dropdown
            const customOpt = this.selectShowPreset.querySelector('option[value="custom"]') as HTMLOptionElement;
            if (customOpt) {
              customOpt.disabled = false;
              customOpt.textContent = `📂 ${tl.title || file.name}`;
              this.selectShowPreset.value = 'custom';
            }
            this.timelineSubtitleText.textContent = `— Loaded ${tl.title} (${tl.cues.length} cues) —`;
          } catch (err) {
            alert('Error parsing custom timeline JSON: ' + err);
          }
        };
        reader.readAsText(file);
      }
    });
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // --- Video Projection Show Controls & Synchronization ---

  private setMode(mode: ShowMode, broadcast: boolean = true): void {
    if (this.showMode === mode && !broadcast) {
      return;
    }
    const modeChanged = this.showMode !== mode;
    this.showMode = mode;
    this.tabModeProcedural.classList.toggle('active', mode === 'procedural');
    this.tabModeVideo.classList.toggle('active', mode === 'video');

    if (mode === 'procedural') {
      this.modeDescText.textContent = 'Mode: Interactive Puppets (Mic, Synth Voice DSP, Banter Conductor)';
      this.cardAudioVoice.style.display = 'block';
      this.cardVideoPlayer.style.display = 'none';
      this.cardProceduralActions.style.display = 'block';
      this.cardVideoCrops.style.display = 'none';
    } else {
      this.modeDescText.textContent = 'Mode: Video Projection Show (Local Videos Mapped to Pumpkins)';
      this.cardAudioVoice.style.display = 'none';
      this.cardVideoPlayer.style.display = 'block';
      this.cardProceduralActions.style.display = 'none';
      this.cardVideoCrops.style.display = 'block';
    }

    if (broadcast && modeChanged) {
      syncBus.send({ type: 'SET_SHOW_MODE', mode });
    }
  }

  private initVideoShowControls(): void {
    // Mode Switcher Tabs
    this.tabModeProcedural.addEventListener('click', () => this.setMode('procedural'));
    this.tabModeVideo.addEventListener('click', () => this.setMode('video'));

    // Video File Selection & Drop Zone
    this.fileVideoInput.addEventListener('change', () => {
      const file = this.fileVideoInput.files?.[0];
      if (file) {
        this.handleVideoUpload(file);
      }
    });

    const dropZone = this.videoDropZone;
    ['dragenter', 'dragover'].forEach((evt) => {
      dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach((evt) => {
      dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      const files = (e as DragEvent).dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (/\.(mp4|mov|webm|m4v|ogg)$/i.test(file.name) || file.type.startsWith('video/')) {
          this.handleVideoUpload(file);
        } else {
          alert('Please drop a valid video file (.mp4, .mov, .webm)');
        }
      }
    });

    // Server Video Library dropdown
    this.selectServerVideos.addEventListener('change', () => {
      const selectedUrl = this.selectServerVideos.value;
      if (selectedUrl) {
        const opt = this.selectServerVideos.options[this.selectServerVideos.selectedIndex];
        this.videoConfig.url = selectedUrl;
        this.videoConfig.name = opt ? opt.text : selectedUrl;
        this.videoCurrentTitle.textContent = this.videoConfig.name;
        syncBus.send({
          type: 'VIDEO_LOAD',
          config: { url: selectedUrl, name: this.videoConfig.name }
        });
      }
    });

    this.btnRefreshVideos.addEventListener('click', () => {
      this.refreshServerVideos();
    });

    // Playback Controls
    this.btnVideoPlay.addEventListener('click', () => {
      syncBus.send({ type: 'VIDEO_PLAY' });
    });

    this.btnVideoPause.addEventListener('click', () => {
      syncBus.send({ type: 'VIDEO_PAUSE' });
    });

    this.btnVideoStop.addEventListener('click', () => {
      syncBus.send({ type: 'VIDEO_STOP' });
    });

    this.chkVideoLoop.addEventListener('change', () => {
      this.videoConfig.loop = this.chkVideoLoop.checked;
      syncBus.send({ type: 'VIDEO_SET_LOOP', loop: this.chkVideoLoop.checked });
    });

    // Scrubber
    this.sliderVideoScrub.addEventListener('mousedown', () => {
      this.isUserScrubbingVideo = true;
    });
    this.sliderVideoScrub.addEventListener('touchstart', () => {
      this.isUserScrubbingVideo = true;
    });

    this.sliderVideoScrub.addEventListener('input', () => {
      const t = parseFloat(this.sliderVideoScrub.value);
      const dur = parseFloat(this.sliderVideoScrub.max) || 0;
      this.valVideoTime.textContent = `${this.formatTime(t)} / ${this.formatTime(dur)}`;
    });

    this.sliderVideoScrub.addEventListener('change', () => {
      const targetTime = parseFloat(this.sliderVideoScrub.value);
      syncBus.send({ type: 'VIDEO_SEEK', time: targetTime });
      this.isUserScrubbingVideo = false;
    });

    // Volume & Mute
    this.sliderVideoVol.addEventListener('input', () => {
      const vol = parseFloat(this.sliderVideoVol.value);
      this.videoConfig.volume = vol;
      this.valVideoVol.textContent = `${Math.round(vol * 100)}%`;
      syncBus.send({
        type: 'VIDEO_SET_VOLUME',
        volume: vol,
        muted: this.videoConfig.muted
      });
    });

    this.btnVideoMute.addEventListener('click', () => {
      this.videoConfig.muted = !this.videoConfig.muted;
      this.btnVideoMute.textContent = this.videoConfig.muted ? '🔇 Muted' : '🔊 Audio On';
      this.btnVideoMute.classList.toggle('warning', this.videoConfig.muted);
      syncBus.send({
        type: 'VIDEO_SET_VOLUME',
        volume: this.videoConfig.volume,
        muted: this.videoConfig.muted
      });
    });

    // Edge Feathering
    this.sliderEdgeFeather.addEventListener('input', () => {
      const px = parseInt(this.sliderEdgeFeather.value, 10);
      this.videoConfig.edgeFeather = px;
      this.valEdgeFeather.textContent = `${px}px`;
      syncBus.send({ type: 'VIDEO_SET_FEATHER', edgeFeather: px });
    });

    // Video Diagnostics
    this.btnVideoToggleGrid.addEventListener('click', () => {
      syncBus.send({ type: 'TOGGLE_DIAGNOSTIC', diag: 'grid' });
    });
    this.btnVideoToggleBlackCard.addEventListener('click', () => {
      syncBus.send({ type: 'TOGGLE_DIAGNOSTIC', diag: 'black-card' });
    });
    this.btnVideoBlackout.addEventListener('click', () => {
      syncBus.send({ type: 'TOGGLE_DIAGNOSTIC', diag: 'blackout' });
    });

    // Layout Mode
    this.selectVideoLayout.addEventListener('change', () => {
      const layout = this.selectVideoLayout.value as VideoLayout;
      this.videoConfig.layout = layout;
      syncBus.send({ type: 'VIDEO_SET_LAYOUT', layout });
    });

    // Crop Sliders
    const setupCropListeners = (
      slot: PuppetSlot,
      slX: HTMLInputElement,
      slW: HTMLInputElement,
      onUpdate: () => void
    ) => {
      slX.addEventListener('input', () => {
        const x = parseFloat(slX.value);
        this.videoConfig.crops[slot].x = x;
        onUpdate();
        syncBus.send({ type: 'VIDEO_SET_CROP', slot, crop: this.videoConfig.crops[slot] });
      });

      slW.addEventListener('input', () => {
        const w = parseFloat(slW.value);
        this.videoConfig.crops[slot].w = w;
        onUpdate();
        syncBus.send({ type: 'VIDEO_SET_CROP', slot, crop: this.videoConfig.crops[slot] });
      });
    };

    setupCropListeners('left', this.sliderCropLeftX, this.sliderCropLeftW, () => this.updateCropUI());
    setupCropListeners('center', this.sliderCropCenterX, this.sliderCropCenterW, () => this.updateCropUI());
    setupCropListeners('right', this.sliderCropRightX, this.sliderCropRightW, () => this.updateCropUI());

    this.btnResetCrops.addEventListener('click', () => {
      this.videoConfig.crops = {
        left: { x: 0.0, y: 0.0, w: 0.3333, h: 1.0 },
        center: { x: 0.3333, y: 0.0, w: 0.3334, h: 1.0 },
        right: { x: 0.6667, y: 0.0, w: 0.3333, h: 1.0 }
      };
      this.updateCropUI();
      (['left', 'center', 'right'] as PuppetSlot[]).forEach((s) => {
        syncBus.send({ type: 'VIDEO_SET_CROP', slot: s, crop: this.videoConfig.crops[s] });
      });
    });
  }

  private async handleVideoUpload(file: File): Promise<void> {
    const blobUrl = URL.createObjectURL(file);
    this.videoConfig.url = blobUrl;
    this.videoConfig.name = file.name;
    this.videoCurrentTitle.textContent = file.name;

    // Instantly notify stage for immediate local playback
    syncBus.send({
      type: 'VIDEO_LOAD',
      config: { url: blobUrl, name: file.name, loop: this.videoConfig.loop }
    });

    // Background upload to persist into public/videos/
    try {
      this.videoUploadProgress.style.display = 'block';
      this.videoUploadFill.style.width = '35%';

      const res = await fetch(`/api/upload-video?name=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file
      });
      this.videoUploadFill.style.width = '100%';

      setTimeout(() => {
        this.videoUploadProgress.style.display = 'none';
        this.videoUploadFill.style.width = '0%';
      }, 700);

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          this.videoConfig.url = data.url;
          syncBus.send({
            type: 'VIDEO_LOAD',
            config: { url: data.url, name: file.name }
          });
          await this.refreshServerVideos();
          this.selectServerVideos.value = data.url;
        }
      }
    } catch (err) {
      console.warn('Background server video upload failed (local blob playback still active):', err);
      this.videoUploadProgress.style.display = 'none';
    }
  }

  private async refreshServerVideos(): Promise<void> {
    try {
      const res = await fetch('/api/videos');
      if (!res.ok) return;
      const list = (await res.json()) as Array<{ name: string; url: string; size: number }>;

      this.selectServerVideos.innerHTML = '';
      if (list.length === 0) {
        const opt = document.createElement('option');
        opt.value = '/videos/sample-trio.mp4';
        opt.textContent = '🎃 sample-trio.mp4 (Built-in Trio)';
        this.selectServerVideos.appendChild(opt);
      } else {
        list.forEach((v) => {
          const opt = document.createElement('option');
          opt.value = v.url;
          opt.textContent = `🎃 ${v.name} (${(v.size / (1024 * 1024)).toFixed(1)} MB)`;
          this.selectServerVideos.appendChild(opt);
        });
      }

      // Restore selected if in list
      if (this.videoConfig?.url) {
        this.selectServerVideos.value = this.videoConfig.url;
      }
    } catch (err) {
      console.warn('Failed to refresh video list:', err);
    }
  }

  private updateVideoUI(): void {
    if (!this.videoConfig) return;
    this.videoCurrentTitle.textContent = this.videoConfig.name || this.videoConfig.url;
    this.chkVideoLoop.checked = this.videoConfig.loop;
    this.sliderVideoVol.value = this.videoConfig.volume.toString();
    this.valVideoVol.textContent = `${Math.round(this.videoConfig.volume * 100)}%`;
    this.btnVideoMute.textContent = this.videoConfig.muted ? '🔇 Muted' : '🔊 Audio On';
    this.btnVideoMute.classList.toggle('warning', this.videoConfig.muted);
    this.sliderEdgeFeather.value = this.videoConfig.edgeFeather.toString();
    this.valEdgeFeather.textContent = `${this.videoConfig.edgeFeather}px`;
    this.selectVideoLayout.value = this.videoConfig.layout;
    this.updateCropUI();
  }

  private updateCropUI(): void {
    if (!this.videoConfig?.crops) return;
    const { left, center, right } = this.videoConfig.crops;

    this.sliderCropLeftX.value = left.x.toFixed(2);
    this.sliderCropLeftW.value = left.w.toFixed(2);
    this.valCropLeftX.textContent = `${Math.round(left.x * 100)}%`;
    this.valCropLeftW.textContent = `${Math.round(left.w * 100)}%`;
    this.valCropLeft.textContent = `${Math.round(left.x * 100)}% – ${Math.round((left.x + left.w) * 100)}%`;

    this.sliderCropCenterX.value = center.x.toFixed(2);
    this.sliderCropCenterW.value = center.w.toFixed(2);
    this.valCropCenterX.textContent = `${Math.round(center.x * 100)}%`;
    this.valCropCenterW.textContent = `${Math.round(center.w * 100)}%`;
    this.valCropCenter.textContent = `${Math.round(center.x * 100)}% – ${Math.round((center.x + center.w) * 100)}%`;

    this.sliderCropRightX.value = right.x.toFixed(2);
    this.sliderCropRightW.value = right.w.toFixed(2);
    this.valCropRightX.textContent = `${Math.round(right.x * 100)}%`;
    this.valCropRightW.textContent = `${Math.round(right.w * 100)}%`;
    this.valCropRight.textContent = `${Math.round(right.x * 100)}% – ${Math.round((right.x + right.w) * 100)}%`;
  }

  // --- Interactive 2D Keystone Pad Widget ---

  private initKeystonePad(): void {
    const pad = this.keystoneCanvas;

    const getCornerUnderMouse = (mx: number, my: number): CornerKey | null => {
      const corners = this.getPadCornerCoords();
      const keys: CornerKey[] = ['tl', 'tr', 'br', 'bl'];
      for (const k of keys) {
        const pt = corners[k];
        const dist = Math.hypot(mx - pt.x, my - pt.y);
        if (dist <= 14) return k;
      }
      return null;
    };

    pad.addEventListener('mousedown', (e) => {
      const rect = pad.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this.draggingCorner = getCornerUnderMouse(mx, my);
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.draggingCorner) return;
      const rect = pad.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // Base un-keystoned corner positions in pad space (180x180):
      // Center is (90, 90). Base box is 100x100 -> half is 50.
      const baseCoords: Record<CornerKey, { x: number; y: number }> = {
        tl: { x: 40, y: 40 },
        tr: { x: 140, y: 40 },
        br: { x: 140, y: 140 },
        bl: { x: 40, y: 140 }
      };

      const base = baseCoords[this.draggingCorner];
      // Map pad delta (px) to corner offset scale (factor of ~2.5)
      const dx = Math.round((mx - base.x) * 2.2);
      const dy = Math.round((my - base.y) * 2.2);

      this.currentTransforms[this.currentFocus].corners[this.draggingCorner] = [dx, dy];
      this.broadcastTransform();
      this.updateCornerInputs();
      this.drawKeystonePad();
    });

    window.addEventListener('mouseup', () => {
      this.draggingCorner = null;
    });

    this.drawKeystonePad();
  }

  private getPadCornerCoords(): Record<CornerKey, { x: number; y: number }> {
    const tf = this.currentTransforms[this.currentFocus];
    const c = tf.corners;
    // Base box: center (90, 90), size 100x100
    const scale = 1 / 2.2;
    return {
      tl: { x: 40 + c.tl[0] * scale, y: 40 + c.tl[1] * scale },
      tr: { x: 140 + c.tr[0] * scale, y: 40 + c.tr[1] * scale },
      br: { x: 140 + c.br[0] * scale, y: 140 + c.br[1] * scale },
      bl: { x: 40 + c.bl[0] * scale, y: 140 + c.bl[1] * scale }
    };
  }

  private drawKeystonePad(): void {
    const ctx = this.keystoneCtx;
    const w = this.keystoneCanvas.width;
    const h = this.keystoneCanvas.height;

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    // Grid crosshair
    ctx.strokeStyle = '#22222e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Default reference square (unwarped box)
    ctx.strokeStyle = '#28283a';
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(40, 40, 100, 100);
    ctx.setLineDash([]);

    const corners = this.getPadCornerCoords();
    const { tl, tr, br, bl } = corners;

    // Keystone quad fill & outline
    ctx.fillStyle = 'rgba(0, 229, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Corner handle circles
    const keys: CornerKey[] = ['tl', 'tr', 'br', 'bl'];
    for (const key of keys) {
      const pt = corners[key];
      const isDragging = this.draggingCorner === key;

      ctx.fillStyle = isDragging ? '#ff7518' : '#00e5ff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isDragging ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Mini corner label
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#ffffff';
      const offset = key === 'tl' ? [-16, -6] : key === 'tr' ? [8, -6] : key === 'br' ? [8, 12] : [-16, 12];
      ctx.fillText(key.toUpperCase(), pt.x + offset[0], pt.y + offset[1]);
    }
  }

  // --- State & Updates ---

  private setFocus(slot: PuppetSlot): void {
    this.currentFocus = slot;
    this.focusNameEl.textContent = slot.charAt(0).toUpperCase() + slot.slice(1);

    this.btnFocusLeft.classList.toggle('active', slot === 'left');
    this.btnFocusCenter.classList.toggle('active', slot === 'center');
    this.btnFocusRight.classList.toggle('active', slot === 'right');

    syncBus.send({ type: 'SET_FOCUS', slot });
    this.updateControlsFromState();
  }

  private broadcastTransform(): void {
    const tf = this.currentTransforms[this.currentFocus];
    syncBus.send({
      type: 'UPDATE_TRANSFORM',
      slot: this.currentFocus,
      transform: tf
    });
  }

  private updateControlsFromState(): void {
    const tf = this.currentTransforms[this.currentFocus];
    if (!tf) return;

    this.sliderPosX.value = tf.x.toString();
    this.valPosXEl.textContent = `${Math.round(tf.x)}px`;

    this.sliderPosY.value = tf.y.toString();
    this.valPosYEl.textContent = `${Math.round(tf.y)}px`;

    this.sliderScaleX.value = tf.scaleX.toString();
    this.valScaleXEl.textContent = tf.scaleX.toFixed(2);

    this.sliderScaleY.value = tf.scaleY.toString();
    this.valScaleYEl.textContent = tf.scaleY.toFixed(2);

    this.sliderRot.value = tf.rotation.toString();
    this.valRotEl.textContent = `${Math.round(tf.rotation)}°`;

    this.selectFaceStyle.value = tf.faceStyle || 'classic';

    this.updateCornerInputs();
    this.drawKeystonePad();
  }

  private updateCornerInputs(): void {
    const tf = this.currentTransforms[this.currentFocus];
    if (!tf) return;
    const c = tf.corners;

    const keys: CornerKey[] = ['tl', 'tr', 'bl', 'br'];
    keys.forEach((key) => {
      this.inpCorners[key].x.value = Math.round(c[key][0]).toString();
      this.inpCorners[key].y.value = Math.round(c[key][1]).toString();
    });
  }

  private populateProfiles(): void {
    this.selectProfile.innerHTML = '';
    for (const [id, prof] of Object.entries(this.profiles)) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = prof.name;
      if (id === this.activeProfileId) opt.selected = true;
      this.selectProfile.appendChild(opt);
    }
  }

  private setupSyncBus(): void {
    syncBus.on((msg: SyncMessage) => {
      switch (msg.type) {
        case 'AUDIO_METER':
          this.handleAudioMeter(msg.rawRms, msg.smoothed, msg.isArmed);
          break;

        case 'SET_FOCUS':
          this.currentFocus = msg.slot;
          this.focusNameEl.textContent = msg.slot.charAt(0).toUpperCase() + msg.slot.slice(1);
          this.btnFocusLeft.classList.toggle('active', msg.slot === 'left');
          this.btnFocusCenter.classList.toggle('active', msg.slot === 'center');
          this.btnFocusRight.classList.toggle('active', msg.slot === 'right');
          this.updateControlsFromState();
          break;

        case 'SET_GATE':
          this.currentGate = msg.gate;
          this.sliderGate.value = msg.gate.toString();
          this.valGateEl.textContent = msg.gate.toFixed(3);
          this.meterGateMarkerEl.style.left = `${Math.min(100, (msg.gate / 0.08) * 100)}%`;
          break;

        case 'SET_DELAY':
          this.currentDelay = msg.castDelayMs;
          this.sliderDelay.value = msg.castDelayMs.toString();
          this.valDelayEl.textContent = `${msg.castDelayMs} ms`;
          break;

        case 'SET_FACE_STYLE':
          this.currentTransforms[msg.slot].faceStyle = msg.style;
          if (msg.slot === this.currentFocus) {
            this.selectFaceStyle.value = msg.style;
          }
          break;

        case 'UPDATE_TRANSFORM':
          this.currentTransforms[msg.slot] = { ...msg.transform };
          if (msg.slot === this.currentFocus) {
            this.updateControlsFromState();
          }
          break;

        case 'TOGGLE_MAPPING_MODE':
          this.mappingModeActive = msg.active ?? !this.mappingModeActive;
          this.btnToggleMapping.classList.toggle('active', this.mappingModeActive);
          break;

        case 'VIDEO_STATUS':
          if (!this.isUserScrubbingVideo) {
            this.sliderVideoScrub.max = (msg.duration || 1).toFixed(2);
            this.sliderVideoScrub.value = (msg.currentTime || 0).toFixed(2);
            this.valVideoTime.textContent = `${this.formatTime(msg.currentTime)} / ${this.formatTime(msg.duration)}`;
          }
          if (msg.isPlaying) {
            this.videoStatusBadge.textContent = 'Playing';
            this.videoStatusBadge.style.color = '#10b981';
            this.videoStatusBadge.style.background = 'rgba(16,185,129,0.15)';
            this.btnVideoPlay.textContent = '▶ Playing';
            this.btnVideoPlay.classList.add('active');
          } else {
            this.videoStatusBadge.textContent = 'Paused / Ready';
            this.videoStatusBadge.style.color = '#fbbf24';
            this.videoStatusBadge.style.background = 'rgba(251,191,36,0.15)';
            this.btnVideoPlay.textContent = '▶ Play';
            this.btnVideoPlay.classList.remove('active');
          }
          break;

        case 'SYNC_STATE_RESP':
          this.currentFocus = msg.focus;
          this.currentGate = msg.config.gate;
          this.currentSmoothness = msg.config.smoothness;
          this.currentDelay = msg.config.castDelayMs;
          this.currentTransforms = msg.config.transforms;
          this.profiles = msg.config.profiles;
          this.activeProfileId = msg.config.activeProfileId;
          this.mappingModeActive = msg.mappingModeOn;

          if (msg.config.showMode && msg.config.showMode !== this.showMode) {
            this.setMode(msg.config.showMode, false);
          }
          if (msg.config.videoConfig) {
            this.videoConfig = msg.config.videoConfig;
            this.updateVideoUI();
          }

          this.btnToggleMapping.classList.toggle('active', msg.mappingModeOn);
          this.focusNameEl.textContent = msg.focus.charAt(0).toUpperCase() + msg.focus.slice(1);
          this.btnFocusLeft.classList.toggle('active', msg.focus === 'left');
          this.btnFocusCenter.classList.toggle('active', msg.focus === 'center');
          this.btnFocusRight.classList.toggle('active', msg.focus === 'right');

          this.sliderGate.value = this.currentGate.toString();
          this.valGateEl.textContent = this.currentGate.toFixed(3);
          this.meterGateMarkerEl.style.left = `${Math.min(100, (this.currentGate / 0.08) * 100)}%`;

          this.sliderSmooth.value = this.currentSmoothness.toString();
          this.valSmoothEl.textContent = this.currentSmoothness.toFixed(2);

          this.sliderDelay.value = this.currentDelay.toString();
          this.valDelayEl.textContent = `${this.currentDelay} ms`;

          this.populateProfiles();
          this.updateMicStatus(msg.isArmed);
          this.updateControlsFromState();
          break;
      }
    });
  }

  private handleAudioMeter(rawRms: number, smoothed: number, isArmed: boolean): void {
    this.updateMicStatus(isArmed);

    const percent = Math.min(100, Math.round(smoothed * 100));
    this.meterLevelEl.style.width = `${percent}%`;
    this.meterValTextEl.textContent = `${percent}% (RMS: ${rawRms.toFixed(3)})`;
  }

  private updateMicStatus(isArmed: boolean): void {
    if (isArmed) {
      this.micStatusEl.textContent = 'Listening (Armed)';
      this.micStatusEl.style.color = '#10b981';
      this.btnArmMic.textContent = 'Disarm Microphone';
      this.btnArmMic.classList.remove('primary');
      this.btnArmMic.classList.add('danger');
    } else {
      this.micStatusEl.textContent = 'Mic Disarmed';
      this.micStatusEl.style.color = '#8e8e9a';
      this.btnArmMic.textContent = 'Arm Microphone (Talk)';
      this.btnArmMic.classList.remove('danger');
      this.btnArmMic.classList.add('primary');
      this.meterLevelEl.style.width = '0%';
      this.meterValTextEl.textContent = '0%';
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new DeskApp();
});
