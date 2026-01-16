import type { AudioSource, AudioSourceType } from '@/types';

export interface AudioCaptureConfig {
  sampleRate: number;
  channelCount: number;
  bufferSize: number;
}

const defaultConfig: AudioCaptureConfig = {
  sampleRate: 16000, // Optimal for speech recognition
  channelCount: 1, // Mono for speech
  bufferSize: 4096,
};

export class AudioCapture {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private config: AudioCaptureConfig;
  private onAudioData: ((data: Float32Array) => void) | null = null;
  private isCapturing = false;

  constructor(config: Partial<AudioCaptureConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  async startCapture(
    source: AudioSource,
    onAudioData: (data: Float32Array) => void
  ): Promise<void> {
    if (this.isCapturing) {
      await this.stopCapture();
    }

    this.onAudioData = onAudioData;

    try {
      this.mediaStream = await this.getMediaStream(source);
      await this.setupAudioProcessing();
      this.isCapturing = true;
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  private async getMediaStream(source: AudioSource): Promise<MediaStream> {
    switch (source.type) {
      case 'microphone':
        return this.getMicrophoneStream(source.deviceId);
      case 'av-system':
        return this.getAVSystemStream(source.deviceId);
      case 'stream':
        return this.getExternalStream(source.streamUrl);
      default:
        throw new Error(`Unknown audio source type: ${source.type}`);
    }
  }

  private async getMicrophoneStream(deviceId?: string): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        sampleRate: this.config.sampleRate,
        channelCount: this.config.channelCount,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    };

    return navigator.mediaDevices.getUserMedia(constraints);
  }

  private async getAVSystemStream(deviceId?: string): Promise<MediaStream> {
    // AV systems typically use specific audio input devices
    // This attempts to get the specified device without processing
    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        sampleRate: this.config.sampleRate,
        channelCount: this.config.channelCount,
        echoCancellation: false, // AV systems handle their own processing
        noiseSuppression: false,
        autoGainControl: false,
      },
    };

    return navigator.mediaDevices.getUserMedia(constraints);
  }

  private async getExternalStream(streamUrl?: string): Promise<MediaStream> {
    if (!streamUrl) {
      throw new Error('Stream URL is required for stream audio source');
    }

    // For external streams (RTMP, HLS, etc.), we need to use an audio element
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.src = streamUrl;

    await new Promise<void>((resolve, reject) => {
      audio.oncanplay = () => resolve();
      audio.onerror = () => reject(new Error('Failed to load audio stream'));
      audio.load();
    });

    // Create a media stream from the audio element
    const audioContext = new AudioContext({ sampleRate: this.config.sampleRate });
    const source = audioContext.createMediaElementSource(audio);
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);
    audio.play();

    return destination.stream;
  }

  private async setupAudioProcessing(): Promise<void> {
    if (!this.mediaStream) {
      throw new Error('No media stream available');
    }

    this.audioContext = new AudioContext({
      sampleRate: this.config.sampleRate,
    });

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Using ScriptProcessorNode for broad compatibility
    // In production, consider AudioWorklet for better performance
    this.processorNode = this.audioContext.createScriptProcessor(
      this.config.bufferSize,
      this.config.channelCount,
      this.config.channelCount
    );

    this.processorNode.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);
      const audioData = new Float32Array(inputData);
      this.onAudioData?.(audioData);
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);
  }

  async stopCapture(): Promise<void> {
    this.isCapturing = false;
    this.cleanup();
  }

  private cleanup(): void {
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.onAudioData = null;
  }

  getIsCapturing(): boolean {
    return this.isCapturing;
  }

  static async getAvailableDevices(): Promise<AudioSource[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === 'audioinput');

    return audioInputs.map((device, index) => ({
      id: device.deviceId || `device-${index}`,
      type: 'microphone' as AudioSourceType,
      name: device.label || `Microphone ${index + 1}`,
      deviceId: device.deviceId,
      isActive: false,
    }));
  }
}

// Singleton instance for global access
let audioCaptureInstance: AudioCapture | null = null;

export function getAudioCapture(config?: Partial<AudioCaptureConfig>): AudioCapture {
  if (!audioCaptureInstance) {
    audioCaptureInstance = new AudioCapture(config);
  }
  return audioCaptureInstance;
}
