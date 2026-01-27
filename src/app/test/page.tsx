"use client";

import React, { useState, useRef, useEffect } from "react";
import { getASLTranslator } from "@/lib/asl/translator";

/**
 * Speech Recognition Test Page
 *
 * Tests Web Speech API, Aldea API, and local Whisper
 */

type Provider = "whisper" | "webspeech" | "aldea";

// Whisper pipeline - loaded on demand
let whisperPipeline: any = null;

export default function TestPage() {
  const [provider, setProvider] = useState<Provider>("whisper");
  const [status, setStatus] = useState<string>("Ready");
  const [transcript, setTranscript] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [signs, setSigns] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [modelLoading, setModelLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  const recognitionRef = useRef<any>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Load API key from env
    const envKey = process.env.NEXT_PUBLIC_ALDEA_API_KEY;
    if (envKey && envKey !== "your_api_key_here") {
      setApiKey(envKey);
    }

    // Check browser support
    const info: string[] = [];
    info.push(`User Agent: ${navigator.userAgent}`);

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    info.push(
      `Web Speech API: ${SpeechRecognition ? "Supported" : "NOT SUPPORTED"}`,
    );
    info.push(`Secure Context: ${window.isSecureContext ? "Yes" : "No"}`);
    info.push(`Online: ${navigator.onLine ? "Yes" : "No"}`);

    setBrowserInfo(info.join("\n"));

    // Enumerate audio devices
    async function getDevices() {
      try {
        // Request permission first to get device labels
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((d) => d.kind === "audioinput");
        setAudioDevices(audioInputs);
        console.log(
          "[Devices] Found audio inputs:",
          audioInputs.map((d) => d.label),
        );
        if (audioInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.error("[Devices] Error enumerating:", err);
      }
    }
    getDevices();
  }, []);

  const translateToSigns = async (text: string) => {
    if (text.trim()) {
      const translator = getASLTranslator();
      const translation = await translator.translate(text);
      setSigns(translation.signs.map((s) => s.gloss));
    }
  };

  // ============ Web Speech API ============
  const startWebSpeech = async () => {
    setError("");
    setTranscript("");
    setSigns([]);

    try {
      setStatus("Requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setStatus("Microphone access granted");

      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setError("Web Speech API not supported. Use Chrome or Edge.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setStatus("Listening... Speak now!");
        setIsListening(true);
      };

      recognition.onresult = async (event: any) => {
        const result = event.results[event.resultIndex];
        const text = result[0].transcript;
        setTranscript(text);
        setStatus(result.isFinal ? "Got final result!" : "Hearing you...");
        if (result.isFinal) {
          await translateToSigns(text);
        }
      };

      recognition.onerror = (event: any) => {
        setError(`Error: ${event.error}`);
        setStatus("Error occurred");
        setIsListening(false);
      };

      recognition.onend = () => {
        setStatus("Stopped");
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setError(`Error: ${err.message}`);
      setStatus("Failed to start");
    }
  };

  // ============ Aldea API (HTTP-based) ============
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAldea = async () => {
    if (!apiKey) {
      setError("Please enter your Aldea API key");
      return;
    }

    setError("");
    setTranscript("");
    setSigns([]);

    try {
      setStatus("Requesting microphone...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      setStatus("Microphone access granted");

      // Use MediaRecorder to capture audio chunks
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(500); // Collect data every 500ms
      setIsListening(true);
      setStatus("Listening... (speak and pause to transcribe)");

      // Process audio every 2 seconds
      intervalRef.current = setInterval(async () => {
        if (chunksRef.current.length === 0) return;

        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = []; // Clear for next batch

        // Only process if we have meaningful audio (> 1KB)
        if (audioBlob.size < 1000) return;

        try {
          setStatus("Processing...");
          const arrayBuffer = await audioBlob.arrayBuffer();

          const response = await fetch("/api/speech/transcribe", {
            method: "POST",
            headers: {
              "Content-Type": "audio/webm",
              "x-api-key": apiKey,
            },
            body: arrayBuffer,
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error("[Aldea] API Error:", errorData);
            setStatus("Listening...");
            return;
          }

          const data = await response.json();
          console.log("[Aldea] Response:", data);

          // Extract transcript from response
          const text =
            data.results?.channels?.[0]?.alternatives?.[0]?.transcript;
          if (text && text.trim()) {
            setTranscript((prev) => (prev ? `${prev} ${text}` : text));
            setStatus("Got transcript!");
            await translateToSigns(text);
          } else {
            setStatus("Listening...");
          }
        } catch (err) {
          console.error("[Aldea] Request error:", err);
          setStatus("Listening...");
        }
      }, 2000);
    } catch (err: any) {
      setError(`Error: ${err.message}`);
      setStatus("Failed to start");
    }
  };

  const stopListening = () => {
    // Stop Web Speech
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Stop Aldea HTTP approach
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    chunksRef.current = [];

    // Stop old WebSocket approach (cleanup)
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsListening(false);
    setStatus("Stopped");
  };

  // ============ Local Whisper (runs in browser) ============
  const audioBufferRef = useRef<Float32Array[]>([]);

  const startWhisper = async () => {
    setError("");
    setTranscript("");
    setSigns([]);

    try {
      // Load Whisper model if not loaded
      if (!whisperPipeline) {
        setModelLoading(true);
        setStatus("Loading Whisper model (~75MB, first time only)...");

        const { pipeline } = await import("@huggingface/transformers");
        whisperPipeline = await pipeline(
          "automatic-speech-recognition",
          "Xenova/whisper-tiny.en", // Small English-only model for speed
          {
            progress_callback: (progress: any) => {
              if (progress.status === "downloading") {
                const pct = Math.round(
                  (progress.loaded / progress.total) * 100,
                );
                setStatus(`Downloading model: ${pct}%`);
              }
            },
          },
        );

        setModelLoading(false);
        setModelLoaded(true);
        setStatus("Model loaded!");
      }

      setStatus("Requesting microphone...");
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: false, // Disable processing that might cause issues
        noiseSuppression: false,
        autoGainControl: false,
      };
      // Use selected device if specified
      if (selectedDeviceId) {
        audioConstraints.deviceId = { exact: selectedDeviceId };
      }
      console.log(
        "[Whisper] Requesting mic with constraints:",
        audioConstraints,
      );

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });
      streamRef.current = stream;

      // Log which device we got
      const track = stream.getAudioTracks()[0];
      console.log(
        "[Whisper] Got audio track:",
        track.label,
        track.getSettings(),
      );
      setStatus(`Mic: ${track.label}`);

      // Use Web Audio API to capture raw PCM directly
      // Note: Browser may not support 16kHz, so we'll resample if needed
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      console.log(
        "[Whisper] AudioContext sample rate:",
        audioContext.sampleRate,
      );

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      audioBufferRef.current = [];
      let sampleCount = 0;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Copy the data since the buffer gets reused
        audioBufferRef.current.push(new Float32Array(inputData));
        sampleCount += inputData.length;

        // Calculate audio level (RMS)
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const dbLevel = 20 * Math.log10(rms + 0.0001);

        // Log every ~1 second with audio level
        if (sampleCount % audioContext.sampleRate < 4096) {
          console.log(
            "[Whisper] Audio chunks:",
            audioBufferRef.current.length,
            "samples:",
            sampleCount,
            "level:",
            dbLevel.toFixed(1),
            "dB",
          );
          // Update status with audio level indicator
          if (dbLevel > -30) {
            setStatus(
              `Listening... (Audio detected! ${dbLevel.toFixed(0)} dB)`,
            );
          } else {
            setStatus(
              `Listening... (Very quiet: ${dbLevel.toFixed(0)} dB - speak louder or check mic)`,
            );
          }
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsListening(true);
      setStatus("Listening... (speak, then wait 3 sec for transcript)");
      console.log(
        "[Whisper] Started listening, interval will fire every 3 seconds",
      );

      // Process audio every 3 seconds
      intervalRef.current = setInterval(async () => {
        console.log(
          "[Whisper] Interval fired, chunks:",
          audioBufferRef.current.length,
          "pipeline:",
          !!whisperPipeline,
        );

        if (audioBufferRef.current.length === 0 || !whisperPipeline) {
          console.log("[Whisper] Skipping - no audio or no pipeline");
          return;
        }

        // Combine all audio chunks
        const chunks = audioBufferRef.current;
        audioBufferRef.current = []; // Clear for next batch

        const totalLength = chunks.reduce(
          (acc, chunk) => acc + chunk.length,
          0,
        );
        console.log("[Whisper] Total samples:", totalLength);

        // Only process if we have at least 0.5 second of audio
        if (totalLength < 8000) {
          console.log("[Whisper] Not enough audio, skipping");
          return;
        }

        let audioData = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          audioData.set(chunk, offset);
          offset += chunk.length;
        }

        // Resample to 16kHz if needed (Whisper expects 16kHz)
        const sourceSampleRate = audioContextRef.current?.sampleRate || 48000;
        if (sourceSampleRate !== 16000) {
          const resampleRatio = 16000 / sourceSampleRate;
          const newLength = Math.floor(audioData.length * resampleRatio);
          const resampledData = new Float32Array(newLength);
          for (let i = 0; i < newLength; i++) {
            const srcIndex = Math.floor(i / resampleRatio);
            resampledData[i] = audioData[srcIndex];
          }
          audioData = resampledData;
          console.log(
            "[Whisper] Resampled from",
            sourceSampleRate,
            "to 16kHz, new length:",
            audioData.length,
          );
        }

        try {
          setStatus("Processing with Whisper...");
          console.log(
            "[Whisper] Running inference on",
            audioData.length,
            "samples",
          );

          // Run Whisper
          const result = await whisperPipeline(audioData, {
            chunk_length_s: 30,
            stride_length_s: 5,
          });
          console.log("[Whisper] Result:", result);

          const text = result.text?.trim();
          if (text && text.length > 0 && !text.includes("[BLANK_AUDIO]")) {
            setTranscript((prev) => (prev ? `${prev} ${text}` : text));
            setStatus("Got transcript!");
            await translateToSigns(text);
          } else {
            setStatus("Listening...");
          }
        } catch (err) {
          console.error("[Whisper] Error:", err);
          setStatus("Listening...");
        }
      }, 3000);
    } catch (err: any) {
      setError(`Error: ${err.message}`);
      setStatus("Failed to start");
      setModelLoading(false);
    }
  };

  const startListening = () => {
    if (provider === "whisper") {
      startWhisper();
    } else if (provider === "webspeech") {
      startWebSpeech();
    } else {
      startAldea();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Speech Recognition Test</h1>

      {/* Provider Selection */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Provider</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setProvider("whisper")}
            className={`px-4 py-2 rounded-lg font-medium ${
              provider === "whisper"
                ? "bg-green-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Whisper (Free, Local) {modelLoaded && "✓"}
          </button>
          <button
            onClick={() => setProvider("webspeech")}
            className={`px-4 py-2 rounded-lg font-medium ${
              provider === "webspeech"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Web Speech API
          </button>
          <button
            onClick={() => setProvider("aldea")}
            className={`px-4 py-2 rounded-lg font-medium ${
              provider === "aldea"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Aldea AI (100h free)
          </button>
        </div>
        {provider === "whisper" && (
          <p className="text-sm text-gray-400 mt-2">
            Runs entirely in your browser. First load downloads ~75MB model
            (cached after).
          </p>
        )}
      </div>

      {/* Aldea API Key */}
      {provider === "aldea" && (
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Aldea API Key</h2>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Aldea API key (org_...)"
            className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-400 mt-2">
            Get free API key at{" "}
            <a
              href="https://platform.aldea.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              platform.aldea.ai
            </a>{" "}
            (100 hours free)
          </p>
        </div>
      )}

      {/* Microphone Selection */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Microphone</h2>
        {audioDevices.length > 0 ? (
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {audioDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-gray-400">
            No microphones found. Grant permission first.
          </p>
        )}
      </div>

      {/* Browser Info */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Browser Info</h2>
        <pre className="text-sm text-gray-400 whitespace-pre-wrap">
          {browserInfo}
        </pre>
      </div>

      {/* Status */}
      <div className="mb-6">
        <p className="text-lg mb-2">
          Status: <span className="font-semibold text-blue-400">{status}</span>
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex gap-4">
        {!isListening ? (
          <button
            onClick={startListening}
            disabled={modelLoading}
            className={`px-6 py-3 rounded-lg font-semibold text-lg ${
              modelLoading
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {modelLoading ? "Loading Model..." : "Start Listening"}
          </button>
        ) : (
          <button
            onClick={stopListening}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-lg"
          >
            Stop Listening
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg">
          <h2 className="text-xl font-semibold mb-2 text-red-400">Error</h2>
          <pre className="text-sm whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {/* Transcript */}
      {transcript && (
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Transcript</h2>
          <p className="text-2xl">{transcript}</p>
        </div>
      )}

      {/* ASL Signs */}
      {signs.length > 0 && (
        <div className="mb-6 p-4 bg-blue-900/50 border border-blue-500 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">ASL Signs</h2>
          <div className="flex flex-wrap gap-2">
            {signs.map((sign, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-blue-600 rounded-full text-sm"
              >
                {sign}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Troubleshooting */}
      <div className="mt-8 p-4 bg-gray-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Troubleshooting</h2>
        <ul className="list-disc list-inside text-gray-400 space-y-1">
          <li>
            <strong>Whisper (Recommended)</strong>: Free, runs locally, no
            internet needed after model download
          </li>
          <li>
            <strong>Web Speech API</strong>: Free but requires Chrome/Edge +
            internet (uses Google servers)
          </li>
          <li>
            <strong>Aldea AI</strong>: 100 hours free but has CORS issues from
            browser
          </li>
          <li>
            Allow <strong>microphone permission</strong> when prompted
          </li>
          <li>
            Speak clearly, pause briefly, then transcript appears (3 sec delay
            for Whisper)
          </li>
        </ul>
      </div>
    </div>
  );
}
