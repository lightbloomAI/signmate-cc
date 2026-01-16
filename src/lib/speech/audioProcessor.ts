'use client';

/**
 * Audio processor for converting Web Audio API data to Deepgram-compatible format
 * Deepgram expects: linear16 (PCM), 16000 Hz, mono
 */

export interface AudioProcessorConfig {
  targetSampleRate: number;
  bufferSize: number;
  channels: number;
}

const defaultConfig: AudioProcessorConfig = {
  targetSampleRate: 16000,
  bufferSize: 4096,
  channels: 1,
};

export type AudioDataCallback = (data: Int16Array) => void;

export class AudioProcessor {
  private config: AudioProcessorConfig;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private onAudioData: AudioDataCallback | null = null;
  private isProcessing = false;

  // Resampling state
  private resampleBuffer: Float32Array[] = [];
  private resampleRatio = 1;

  constructor(config: Partial<AudioProcessorConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  async start(
    stream: MediaStream,
    onAudioData: AudioDataCallback
  ): Promise<void> {
    if (this.isProcessing) {
      await this.stop();
    }

    this.stream = stream;
    this.onAudioData = onAudioData;

    // Create audio context
    this.audioContext = new AudioContext();

    // Calculate resample ratio
    this.resampleRatio = this.audioContext.sampleRate / this.config.targetSampleRate;

    // Create source from stream
    this.sourceNode = this.audioContext.createMediaStreamSource(stream);

    // Create processor node (using ScriptProcessorNode for compatibility)
    // Note: This is deprecated but has better browser support than AudioWorklet
    this.processorNode = this.audioContext.createScriptProcessor(
      this.config.bufferSize,
      1, // input channels
      1 // output channels
    );

    this.processorNode.onaudioprocess = (event) => {
      if (!this.isProcessing) return;

      const inputData = event.inputBuffer.getChannelData(0);
      const processedData = this.processAudioData(inputData);
      this.onAudioData?.(processedData);
    };

    // Connect nodes
    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);

    this.isProcessing = true;
  }

  private processAudioData(inputData: Float32Array): Int16Array {
    // Resample if necessary
    let resampled: Float32Array;
    if (this.resampleRatio !== 1) {
      resampled = this.resample(inputData);
    } else {
      resampled = inputData;
    }

    // Convert to 16-bit PCM
    return this.floatTo16BitPCM(resampled);
  }

  private resample(inputData: Float32Array): Float32Array {
    const outputLength = Math.ceil(inputData.length / this.resampleRatio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * this.resampleRatio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1);
      const fraction = srcIndex - srcIndexFloor;

      // Linear interpolation
      output[i] =
        inputData[srcIndexFloor] * (1 - fraction) +
        inputData[srcIndexCeil] * fraction;
    }

    return output;
  }

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);

    for (let i = 0; i < input.length; i++) {
      // Clamp to [-1, 1]
      const s = Math.max(-1, Math.min(1, input[i]));
      // Convert to 16-bit integer
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    return output;
  }

  async stop(): Promise<void> {
    this.isProcessing = false;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.stream = null;
    this.onAudioData = null;
  }

  getIsProcessing(): boolean {
    return this.isProcessing;
  }

  getSampleRate(): number {
    return this.audioContext?.sampleRate || 0;
  }

  getTargetSampleRate(): number {
    return this.config.targetSampleRate;
  }
}

// Helper to get audio level for visualization
export function getAudioLevel(data: Int16Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += Math.abs(data[i]);
  }
  const average = sum / data.length;
  // Normalize to 0-1 range
  return average / 32768;
}

// Helper to detect silence
export function isSilent(data: Int16Array, threshold: number = 0.01): boolean {
  return getAudioLevel(data) < threshold;
}
