import { syncBus, SyncMessage } from '../sync/channel';

export type BridgeRole = 'desk' | 'stage';
export type BridgeConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed';

export class AudioStreamBridge {
  private role: BridgeRole;
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private state: BridgeConnectionState = 'idle';

  private onTrackCallback?: (stream: MediaStream) => void;
  private onStateCallback?: (state: BridgeConnectionState) => void;

  private pendingCandidates: RTCIceCandidateInit[] = [];
  private unsubscribeBus?: () => void;

  constructor(role: BridgeRole) {
    this.role = role;
    this.setupSyncBus();

    if (this.role === 'stage') {
      // Stage requests an audio offer from desk if desk is already active
      setTimeout(() => {
        syncBus.send({ type: 'RTC_REQUEST' });
      }, 500);
    }
  }

  public onRemoteStream(fn: (stream: MediaStream) => void): void {
    this.onTrackCallback = fn;
    if (this.remoteStream) {
      fn(this.remoteStream);
    }
  }

  public onStateChange(fn: (state: BridgeConnectionState) => void): void {
    this.onStateCallback = fn;
    fn(this.state);
  }

  public getState(): BridgeConnectionState {
    return this.state;
  }

  private setState(newState: BridgeConnectionState): void {
    this.state = newState;
    if (this.onStateCallback) {
      this.onStateCallback(newState);
    }
  }

  private createPeerConnection(): RTCPeerConnection {
    if (this.pc && this.pc.signalingState !== 'closed') {
      return this.pc;
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        syncBus.send({
          type: 'RTC_ICE',
          candidate: event.candidate.toJSON(),
          role: this.role
        });
      }
    };

    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case 'connected':
          this.setState('connected');
          break;
        case 'connecting':
          this.setState('connecting');
          break;
        case 'disconnected':
          this.setState('disconnected');
          break;
        case 'failed':
          this.setState('failed');
          break;
        case 'closed':
          this.setState('idle');
          break;
      }
    };

    if (this.role === 'stage') {
      pc.ontrack = (event) => {
        const stream = event.streams[0] || new MediaStream([event.track]);
        this.remoteStream = stream;
        if (this.onTrackCallback) {
          this.onTrackCallback(stream);
        }
      };
    }

    this.pc = pc;
    return pc;
  }

  // --- Sender (Desk) API ---

  public async setLocalStream(stream: MediaStream | null): Promise<void> {
    if (this.role !== 'desk') return;
    this.localStream = stream;

    if (!stream) {
      this.close();
      this.setState('idle');
      return;
    }

    const pc = this.createPeerConnection();

    // Replace or add tracks
    const senders = pc.getSenders();
    const audioTrack = stream.getAudioTracks()[0];

    if (!audioTrack) {
      return;
    }

    const existingSender = senders.find((s) => s.track?.kind === 'audio');
    if (existingSender) {
      await existingSender.replaceTrack(audioTrack);
    } else {
      pc.addTrack(audioTrack, stream);
    }

    await this.sendOffer();
  }

  public async sendOffer(): Promise<void> {
    if (this.role !== 'desk') return;
    const pc = this.createPeerConnection();

    try {
      this.setState('connecting');
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      });
      await pc.setLocalDescription(offer);

      syncBus.send({
        type: 'RTC_OFFER',
        sdp: { type: offer.type, sdp: offer.sdp }
      });
    } catch (err) {
      console.warn('Failed to create/send WebRTC offer:', err);
      this.setState('failed');
    }
  }

  // --- Signaling Message Handling ---

  private setupSyncBus(): void {
    this.unsubscribeBus = syncBus.on(async (msg: SyncMessage) => {
      switch (msg.type) {
        case 'RTC_REQUEST':
          if (this.role === 'desk' && this.localStream) {
            await this.sendOffer();
          }
          break;

        case 'RTC_OFFER':
          if (this.role === 'stage') {
            await this.handleOffer(msg.sdp);
          }
          break;

        case 'RTC_ANSWER':
          if (this.role === 'desk') {
            await this.handleAnswer(msg.sdp);
          }
          break;

        case 'RTC_ICE':
          // Only process ICE candidates sent by the opposite role
          if (msg.role !== this.role) {
            await this.handleCandidate(msg.candidate);
          }
          break;
      }
    });
  }

  private async handleOffer(sdp: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.createPeerConnection();
    try {
      this.setState('connecting');
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Flush pending ICE candidates received before remote description
      while (this.pendingCandidates.length > 0) {
        const candidate = this.pendingCandidates.shift()!;
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      syncBus.send({
        type: 'RTC_ANSWER',
        sdp: { type: answer.type, sdp: answer.sdp }
      });
    } catch (err) {
      console.warn('Stage failed to handle WebRTC offer:', err);
      this.setState('failed');
    }
  }

  private async handleAnswer(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) return;
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Flush pending ICE candidates
      while (this.pendingCandidates.length > 0) {
        const candidate = this.pendingCandidates.shift()!;
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.warn('Desk failed to handle WebRTC answer:', err);
    }
  }

  private async handleCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc || !this.pc.remoteDescription) {
      this.pendingCandidates.push(candidate);
      return;
    }
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('Failed to add ICE candidate:', err);
    }
  }

  public close(): void {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.remoteStream = null;
    this.pendingCandidates = [];
  }

  public destroy(): void {
    this.close();
    if (this.unsubscribeBus) {
      this.unsubscribeBus();
      this.unsubscribeBus = undefined;
    }
  }
}
