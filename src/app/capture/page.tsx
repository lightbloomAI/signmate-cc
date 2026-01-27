"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  FilesetResolver,
  HandLandmarker,
  FaceLandmarker,
  PoseLandmarker,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import type {
  HandLandmarkerResult,
  FaceLandmarkerResult,
  PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import {
  createSession,
  addFrame,
  captureFrame,
  finalizeSession,
  saveMotionLocal,
  loadMotionLocal,
  listSavedMotions,
  deleteMotionLocal,
  downloadMotion,
  type RecordingSession,
} from "@/lib/motion/capture";
import type { SignMotion } from "@/lib/motion/types";

type RecordingState = "idle" | "countdown" | "recording" | "processing";

export default function CapturePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [countdown, setCountdown] = useState(3);
  const [gloss, setGloss] = useState("");
  const [savedMotions, setSavedMotions] = useState<string[]>([]);
  const [stats, setStats] = useState({ fps: 0, frames: 0, duration: 0 });

  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationRef = useRef<number>(0);
  const sessionRef = useRef<RecordingSession | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const fpsCountRef = useRef<number>(0);
  const fpsTimeRef = useRef<number>(0);

  // Initialize MediaPipe
  const initMediaPipe = useCallback(async () => {
    try {
      setError(null);
      console.log("[Capture] Initializing MediaPipe...");

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
      );

      handLandmarkerRef.current = await HandLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        },
      );

      faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: true,
        },
      );

      poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        },
      );

      console.log("[Capture] MediaPipe ready");
      return true;
    } catch (err) {
      console.error("[Capture] Init error:", err);
      setError(`Failed to initialize: ${err}`);
      return false;
    }
  }, []);

  // Start webcam
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        return true;
      }
      return false;
    } catch (err) {
      setError(`Webcam error: ${err}`);
      return false;
    }
  }, []);

  // Detection loop
  const detect = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const handLandmarker = handLandmarkerRef.current;
    const faceLandmarker = faceLandmarkerRef.current;
    const poseLandmarker = poseLandmarkerRef.current;

    if (
      !video ||
      !canvas ||
      !handLandmarker ||
      !faceLandmarker ||
      !poseLandmarker ||
      video.readyState < 2
    ) {
      animationRef.current = requestAnimationFrame(detect);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const timestamp = performance.now();

    // FPS tracking
    fpsCountRef.current++;
    if (timestamp - fpsTimeRef.current >= 1000) {
      setStats((prev) => ({ ...prev, fps: fpsCountRef.current }));
      fpsCountRef.current = 0;
      fpsTimeRef.current = timestamp;
    }

    // Run detection
    const handResult = handLandmarker.detectForVideo(video, timestamp);
    const faceResult = faceLandmarker.detectForVideo(video, timestamp);
    const poseResult = poseLandmarker.detectForVideo(video, timestamp);

    // Draw landmarks
    const drawingUtils = new DrawingUtils(ctx);
    drawLandmarks(drawingUtils, handResult, faceResult, poseResult);

    // Record if active
    if (recordingState === "recording" && sessionRef.current) {
      const frame = captureFrame(handResult, faceResult, poseResult, timestamp);
      addFrame(sessionRef.current, frame);

      const session = sessionRef.current;
      const duration =
        session.frames.length > 0 ? timestamp - session.startTime : 0;
      setStats((prev) => ({
        ...prev,
        frames: session.frames.length,
        duration: Math.round(duration),
      }));
    }

    lastFrameTimeRef.current = timestamp;
    animationRef.current = requestAnimationFrame(detect);
  }, [recordingState]);

  // Draw landmarks helper
  const drawLandmarks = (
    drawingUtils: DrawingUtils,
    handResult: HandLandmarkerResult,
    faceResult: FaceLandmarkerResult,
    poseResult: PoseLandmarkerResult,
  ) => {
    // Hands
    if (handResult.landmarks) {
      handResult.landmarks.forEach((landmarks, idx) => {
        const isLeft =
          handResult.handednesses[idx]?.[0]?.categoryName === "Left";
        drawingUtils.drawLandmarks(landmarks, {
          color: isLeft ? "#FF0000" : "#00FF00",
          lineWidth: 2,
          radius: 3,
        });
        drawingUtils.drawConnectors(
          landmarks,
          HandLandmarker.HAND_CONNECTIONS,
          { color: isLeft ? "#FF6666" : "#66FF66", lineWidth: 2 },
        );
      });
    }

    // Face (minimal - just key points)
    if (faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0) {
      const faceLandmarks = faceResult.faceLandmarks[0];
      // Draw only key face points for less clutter
      const keyPoints = [0, 1, 4, 5, 6, 8, 9, 10]; // Nose, eyes, mouth corners
      keyPoints.forEach((idx) => {
        if (faceLandmarks[idx]) {
          drawingUtils.drawLandmarks([faceLandmarks[idx]], {
            color: "#00FFFF",
            radius: 2,
          });
        }
      });
    }

    // Pose (upper body)
    if (poseResult.landmarks && poseResult.landmarks.length > 0) {
      const poseLandmarks = poseResult.landmarks[0].slice(0, 25);
      drawingUtils.drawLandmarks(poseLandmarks, {
        color: "#FFFF00",
        radius: 2,
      });
    }
  };

  // Start recording with countdown
  const startRecording = async () => {
    if (!gloss.trim()) {
      setError("Please enter a sign gloss name");
      return;
    }

    setRecordingState("countdown");
    setCountdown(3);

    // Countdown
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Start recording
    sessionRef.current = createSession(gloss.trim(), 30);
    setStats({ fps: stats.fps, frames: 0, duration: 0 });
    setRecordingState("recording");
  };

  // Stop recording
  const stopRecording = () => {
    if (!sessionRef.current || sessionRef.current.frames.length === 0) {
      setRecordingState("idle");
      return;
    }

    setRecordingState("processing");

    try {
      const motion = finalizeSession(sessionRef.current);
      saveMotionLocal(motion);
      setSavedMotions(listSavedMotions());
      console.log(
        "[Capture] Saved:",
        motion.gloss,
        motion.frameCount,
        "frames",
      );
    } catch (err) {
      setError(`Failed to save: ${err}`);
    }

    sessionRef.current = null;
    setRecordingState("idle");
  };

  // Load and preview a saved motion
  const previewMotion = (motionGloss: string) => {
    const motion = loadMotionLocal(motionGloss);
    if (motion) {
      console.log("[Capture] Loaded motion:", motion);
      alert(
        `Loaded: ${motion.gloss}\nFrames: ${motion.frameCount}\nDuration: ${motion.durationMs}ms\n\nCheck console for full data.`,
      );
    }
  };

  // Download motion
  const handleDownload = (motionGloss: string) => {
    const motion = loadMotionLocal(motionGloss);
    if (motion) {
      downloadMotion(motion);
    }
  };

  // Delete motion
  const handleDelete = (motionGloss: string) => {
    if (confirm(`Delete "${motionGloss}"?`)) {
      deleteMotionLocal(motionGloss);
      setSavedMotions(listSavedMotions());
    }
  };

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      const mpReady = await initMediaPipe();
      if (!mpReady) return;

      const camReady = await startWebcam();
      if (!camReady) return;

      setIsInitialized(true);
      setSavedMotions(listSavedMotions());
      animationRef.current = requestAnimationFrame(detect);
    };

    init();

    return () => {
      cancelAnimationFrame(animationRef.current);
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [initMediaPipe, startWebcam, detect]);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Sign Capture Tool</h1>
        <p className="text-slate-400 text-sm mb-4">
          Record ASL signs into SignMotion format
        </p>

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 mb-4">
            <p className="text-red-300 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 text-xs underline mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Video Preview */}
          <div className="lg:col-span-3">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video ref={videoRef} className="hidden" playsInline muted />
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
              />

              {/* Recording indicator */}
              {recordingState === "countdown" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="text-8xl font-bold text-white animate-pulse">
                    {countdown}
                  </div>
                </div>
              )}

              {recordingState === "recording" && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  <span className="font-medium">REC</span>
                </div>
              )}

              {!isInitialized && recordingState === "idle" && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
                    <p>Initializing camera...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <input
                type="text"
                value={gloss}
                onChange={(e) => setGloss(e.target.value.toUpperCase())}
                placeholder="SIGN NAME (e.g., HELLO)"
                disabled={recordingState !== "idle"}
                className="px-4 py-2 bg-slate-800 rounded-lg text-white placeholder-slate-500 w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {recordingState === "idle" && (
                <button
                  onClick={startRecording}
                  disabled={!isInitialized}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 rounded-lg font-medium transition"
                >
                  Start Recording
                </button>
              )}

              {recordingState === "recording" && (
                <button
                  onClick={stopRecording}
                  className="px-6 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg font-medium transition"
                >
                  Stop Recording
                </button>
              )}

              {recordingState === "countdown" && (
                <span className="text-yellow-400 font-medium">
                  Get ready...
                </span>
              )}

              {recordingState === "processing" && (
                <span className="text-blue-400 font-medium">Processing...</span>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Stats */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h2 className="font-semibold mb-3">Stats</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">FPS</span>
                  <span
                    className={
                      stats.fps >= 24 ? "text-green-400" : "text-yellow-400"
                    }
                  >
                    {stats.fps}
                  </span>
                </div>
                {recordingState === "recording" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Frames</span>
                      <span>{stats.frames}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Duration</span>
                      <span>{(stats.duration / 1000).toFixed(1)}s</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Saved Motions */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h2 className="font-semibold mb-3">Saved Signs</h2>
              {savedMotions.length === 0 ? (
                <p className="text-slate-500 text-sm">No signs captured yet</p>
              ) : (
                <div className="space-y-2">
                  {savedMotions.map((name) => (
                    <div
                      key={name}
                      className="flex items-center justify-between bg-slate-700 rounded px-3 py-2"
                    >
                      <span className="font-mono text-sm">{name}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => previewMotion(name)}
                          className="text-xs px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded"
                          title="Preview"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDownload(name)}
                          className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded"
                          title="Download"
                        >
                          DL
                        </button>
                        <button
                          onClick={() => handleDelete(name)}
                          className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 rounded"
                          title="Delete"
                        >
                          X
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h2 className="font-semibold mb-2">Tips</h2>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Good lighting improves tracking</li>
                <li>• Keep hands in frame throughout</li>
                <li>• Record 1-3 seconds per sign</li>
                <li>• Name signs in CAPS (HELLO, THANK-YOU)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
