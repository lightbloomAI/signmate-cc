"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  FilesetResolver,
  HandLandmarker,
  FaceLandmarker,
  PoseLandmarker,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

interface TrackingStats {
  handsDetected: number;
  faceDetected: boolean;
  poseDetected: boolean;
  fps: number;
  handConfidence: number[];
  landmarks: {
    leftHand: number;
    rightHand: number;
    face: number;
    pose: number;
  };
}

export default function MediaPipeSpikeTest() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TrackingStats>({
    handsDetected: 0,
    faceDetected: false,
    poseDetected: false,
    fps: 0,
    handConfidence: [],
    landmarks: { leftHand: 0, rightHand: 0, face: 0, pose: 0 },
  });

  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  // Initialize MediaPipe
  const initMediaPipe = useCallback(async () => {
    try {
      setError(null);
      console.log("[MediaPipe] Initializing...");

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
      );

      // Hand Landmarker
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
      console.log("[MediaPipe] Hand landmarker ready");

      // Face Landmarker
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
      console.log("[MediaPipe] Face landmarker ready");

      // Pose Landmarker
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
      console.log("[MediaPipe] Pose landmarker ready");

      return true;
    } catch (err) {
      console.error("[MediaPipe] Init error:", err);
      setError(`Failed to initialize MediaPipe: ${err}`);
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
        console.log("[Webcam] Started");
        return true;
      }
      return false;
    } catch (err) {
      console.error("[Webcam] Error:", err);
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
      !poseLandmarker
    ) {
      animationRef.current = requestAnimationFrame(detect);
      return;
    }

    if (video.readyState < 2) {
      animationRef.current = requestAnimationFrame(detect);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas to video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0);

    const timestamp = performance.now();

    // FPS calculation
    frameCountRef.current++;
    if (timestamp - lastTimeRef.current >= 1000) {
      setStats((prev) => ({ ...prev, fps: frameCountRef.current }));
      frameCountRef.current = 0;
      lastTimeRef.current = timestamp;
    }

    // Run detection
    const handResults = handLandmarker.detectForVideo(video, timestamp);
    const faceResults = faceLandmarker.detectForVideo(video, timestamp);
    const poseResults = poseLandmarker.detectForVideo(video, timestamp);

    const drawingUtils = new DrawingUtils(ctx);

    // Draw hands
    let leftHandLandmarks = 0;
    let rightHandLandmarks = 0;
    const handConfidences: number[] = [];

    if (handResults.landmarks) {
      handResults.landmarks.forEach((landmarks, idx) => {
        const handedness = handResults.handednesses[idx]?.[0];
        const isLeft = handedness?.categoryName === "Left";
        const confidence = handedness?.score || 0;
        handConfidences.push(confidence);

        if (isLeft) {
          leftHandLandmarks = landmarks.length;
        } else {
          rightHandLandmarks = landmarks.length;
        }

        // Draw landmarks
        drawingUtils.drawLandmarks(landmarks, {
          color: isLeft ? "#FF0000" : "#00FF00",
          lineWidth: 2,
          radius: 3,
        });
        drawingUtils.drawConnectors(
          landmarks,
          HandLandmarker.HAND_CONNECTIONS,
          {
            color: isLeft ? "#FF6666" : "#66FF66",
            lineWidth: 2,
          },
        );
      });
    }

    // Draw face
    let faceLandmarkCount = 0;
    if (faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
      const faceLandmarks = faceResults.faceLandmarks[0];
      faceLandmarkCount = faceLandmarks.length;

      drawingUtils.drawLandmarks(faceLandmarks, {
        color: "#00FFFF",
        lineWidth: 1,
        radius: 1,
      });
    }

    // Draw pose (upper body only)
    let poseLandmarkCount = 0;
    if (poseResults.landmarks && poseResults.landmarks.length > 0) {
      const poseLandmarks = poseResults.landmarks[0];
      poseLandmarkCount = poseLandmarks.length;

      // Only draw upper body (indices 0-22 roughly)
      const upperBodyLandmarks = poseLandmarks.slice(0, 25);
      drawingUtils.drawLandmarks(upperBodyLandmarks, {
        color: "#FFFF00",
        lineWidth: 1,
        radius: 2,
      });
    }

    // Log blendshapes periodically
    if (
      faceResults.faceBlendshapes &&
      faceResults.faceBlendshapes.length > 0 &&
      frameCountRef.current === 1
    ) {
      const blendshapes = faceResults.faceBlendshapes[0].categories;
      console.log(
        "[Face] Blendshapes:",
        blendshapes
          .slice(0, 5)
          .map((b) => `${b.categoryName}: ${b.score.toFixed(2)}`),
      );
    }

    // Update stats
    setStats({
      handsDetected: handResults.landmarks?.length || 0,
      faceDetected: (faceResults.faceLandmarks?.length || 0) > 0,
      poseDetected: (poseResults.landmarks?.length || 0) > 0,
      fps: stats.fps,
      handConfidence: handConfidences,
      landmarks: {
        leftHand: leftHandLandmarks,
        rightHand: rightHandLandmarks,
        face: faceLandmarkCount,
        pose: poseLandmarkCount,
      },
    });

    animationRef.current = requestAnimationFrame(detect);
  }, [stats.fps]);

  // Start/Stop
  const handleStart = async () => {
    const mpReady = await initMediaPipe();
    if (!mpReady) return;

    const camReady = await startWebcam();
    if (!camReady) return;

    setIsRunning(true);
    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(detect);
  };

  const handleStop = () => {
    setIsRunning(false);
    cancelAnimationFrame(animationRef.current);

    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">MediaPipe Spike Test</h1>
        <p className="text-slate-400 mb-6">
          Testing hand, face, and pose tracking quality
        </p>

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video/Canvas */}
          <div className="lg:col-span-2">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video ref={videoRef} className="hidden" playsInline muted />
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
              />

              {!isRunning && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80">
                  <button
                    onClick={handleStart}
                    className="px-8 py-4 bg-green-600 hover:bg-green-700 rounded-xl font-semibold text-lg transition"
                  >
                    Start Camera
                  </button>
                </div>
              )}
            </div>

            {isRunning && (
              <button
                onClick={handleStop}
                className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition"
              >
                Stop
              </button>
            )}
          </div>

          {/* Stats Panel */}
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Tracking Stats</h2>

            <div className="space-y-4">
              {/* FPS */}
              <div className="flex justify-between items-center">
                <span className="text-slate-400">FPS</span>
                <span
                  className={`font-mono text-lg ${stats.fps >= 24 ? "text-green-400" : "text-yellow-400"}`}
                >
                  {stats.fps}
                </span>
              </div>

              <hr className="border-slate-700" />

              {/* Hands */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400">Hands Detected</span>
                  <span className="font-mono">{stats.handsDetected}/2</span>
                </div>
                <div className="text-sm text-slate-500">
                  <div>Left: {stats.landmarks.leftHand} landmarks</div>
                  <div>Right: {stats.landmarks.rightHand} landmarks</div>
                  {stats.handConfidence.length > 0 && (
                    <div>
                      Confidence:{" "}
                      {stats.handConfidence
                        .map((c) => `${(c * 100).toFixed(0)}%`)
                        .join(", ")}
                    </div>
                  )}
                </div>
              </div>

              <hr className="border-slate-700" />

              {/* Face */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400">Face</span>
                  <span
                    className={
                      stats.faceDetected ? "text-green-400" : "text-red-400"
                    }
                  >
                    {stats.faceDetected ? "Detected" : "Not detected"}
                  </span>
                </div>
                <div className="text-sm text-slate-500">
                  {stats.landmarks.face} landmarks (478 expected)
                </div>
              </div>

              <hr className="border-slate-700" />

              {/* Pose */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400">Pose</span>
                  <span
                    className={
                      stats.poseDetected ? "text-green-400" : "text-red-400"
                    }
                  >
                    {stats.poseDetected ? "Detected" : "Not detected"}
                  </span>
                </div>
                <div className="text-sm text-slate-500">
                  {stats.landmarks.pose} landmarks (33 expected)
                </div>
              </div>

              <hr className="border-slate-700" />

              {/* Legend */}
              <div className="text-sm">
                <div className="font-medium mb-2">Color Legend:</div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-slate-400">Left hand</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-slate-400">Right hand</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-400" />
                  <span className="text-slate-400">Face</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <span className="text-slate-400">Pose</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Evaluation Notes */}
        <div className="mt-8 bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Evaluation Checklist</h2>
          <ul className="space-y-2 text-slate-300">
            <li>
              <strong>Finger tracking:</strong> Move fingers individually — do
              all 21 landmarks follow?
            </li>
            <li>
              <strong>Hand occlusion:</strong> Cross hands — does tracking
              recover?
            </li>
            <li>
              <strong>Speed:</strong> Sign quickly — does it keep up?
            </li>
            <li>
              <strong>Face blendshapes:</strong> Raise eyebrows, smile — check
              console for blendshape values
            </li>
            <li>
              <strong>Distance:</strong> Move closer/farther — where does it
              lose tracking?
            </li>
            <li>
              <strong>Lighting:</strong> Works in current lighting? Try
              dimmer/brighter
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
