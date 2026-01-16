import type { TranscriptionSegment } from '@/types';

export interface DeepgramConfig {
  apiKey: string;
  language: string;
  model: 'nova-2' | 'nova' | 'enhanced' | 'base';
  punctuate: boolean;
  interimResults: boolean;
  endpointing: number; // ms of silence to end utterance
}

const defaultConfig: Partial<DeepgramConfig> = {
  language: 'en-US',
  model: 'nova-2',
  punctuate: true,
  interimResults: true,
  endpointing: 300, // 300ms for low latency
};

export type DeepgramTranscriptionCallback = (segment: TranscriptionSegment) => void;
export type DeepgramErrorCallback = (error: Error) => void;

export class DeepgramSpeechRecognizer {
  private config: DeepgramConfig;
  private socket: WebSocket | null = null;
  private isConnected = false;
  private onTranscription: DeepgramTranscriptionCallback | null = null;
  private onError: DeepgramErrorCallback | null = null;
  private segmentId = 0;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(config: Partial<DeepgramConfig> & { apiKey: string }) {
    this.config = { ...defaultConfig, ...config } as DeepgramConfig;
  }

  async connect(
    onTranscription: DeepgramTranscriptionCallback,
    onError?: DeepgramErrorCallback
  ): Promise<void> {
    this.onTranscription = onTranscription;
    this.onError = onError || null;

    const params = new URLSearchParams({
      language: this.config.language,
      model: this.config.model,
      punctuate: String(this.config.punctuate),
      interim_results: String(this.config.interimResults),
      endpointing: String(this.config.endpointing),
      encoding: 'linear16',
      sample_rate: '16000',
      channels: '1',
    });

    const url = `wss://api.deepgram.com/v1/listen?${params}`;

    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(url, ['token', this.config.apiKey]);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.socket.onerror = (event) => {
        const error = new Error('Deepgram WebSocket error');
        this.onError?.(error);
        reject(error);
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.handleClose();
      };
    });
  }

  private handleMessage(data: string): void {
    try {
      const response = JSON.parse(data);

      if (response.type === 'Results') {
        const channel = response.channel;
        const alternatives = channel?.alternatives;

        if (alternatives && alternatives.length > 0) {
          const alt = alternatives[0];
          const isFinal = response.is_final;

          const segment: TranscriptionSegment = {
            id: `dg-${this.segmentId}`,
            text: alt.transcript,
            startTime: response.start * 1000,
            endTime: (response.start + response.duration) * 1000,
            confidence: alt.confidence,
            isFinal,
          };

          if (isFinal && alt.transcript.trim()) {
            this.segmentId++;
          }

          if (alt.transcript.trim()) {
            this.onTranscription?.(segment);
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse Deepgram response:', error);
    }
  }

  private handleClose(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

      setTimeout(() => {
        if (this.onTranscription) {
          this.connect(this.onTranscription, this.onError || undefined);
        }
      }, delay);
    } else {
      this.onError?.(new Error('Max reconnect attempts reached'));
    }
  }

  sendAudio(audioData: Float32Array): void {
    if (!this.isConnected || !this.socket) {
      return;
    }

    // Convert Float32Array to Int16Array (linear16)
    const int16Data = new Int16Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      const s = Math.max(-1, Math.min(1, audioData[i]));
      int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    this.socket.send(int16Data.buffer);
  }

  disconnect(): void {
    this.isConnected = false;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection

    if (this.socket) {
      // Send close message to Deepgram
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'CloseStream' }));
      }
      this.socket.close();
      this.socket = null;
    }

    this.onTranscription = null;
    this.onError = null;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }
}
