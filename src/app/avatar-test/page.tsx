"use client";

import React, { useState, useCallback } from "react";
import { AvatarRenderer } from "@/components/avatar/AvatarRenderer";
import type { AvatarConfig, AvatarState, ASLSign } from "@/types";

// Sample ASL signs for testing
const DEMO_SIGNS: Record<string, ASLSign> = {
  HELLO: {
    gloss: "HELLO",
    handshape: { dominant: "flat-hand" },
    location: { x: 0.3, y: 0.4, z: 0.3, reference: "neutral" },
    movement: {
      type: "arc",
      direction: { x: 0.2, y: 0, z: 0 },
      repetitions: 2,
      speed: "normal",
    },
    nonManualMarkers: [{ type: "facial", expression: "smile", intensity: 0.7 }],
    duration: 1200,
  },
  THANK_YOU: {
    gloss: "THANK-YOU",
    handshape: { dominant: "flat-hand" },
    location: { x: 0, y: 0.2, z: 0.4, reference: "face" },
    movement: {
      type: "linear",
      direction: { x: 0, y: 0, z: 0.3 },
      speed: "normal",
    },
    nonManualMarkers: [{ type: "facial", expression: "smile", intensity: 0.5 }],
    duration: 1000,
  },
  YES: {
    gloss: "YES",
    handshape: { dominant: "fist" },
    location: { x: 0.2, y: 0.3, z: 0.2, reference: "neutral" },
    movement: {
      type: "linear",
      direction: { x: 0, y: -0.2, z: 0 },
      repetitions: 2,
      speed: "fast",
    },
    nonManualMarkers: [{ type: "head", expression: "nod", intensity: 0.6 }],
    duration: 800,
  },
  NO: {
    gloss: "NO",
    handshape: { dominant: "point" },
    location: { x: 0.15, y: 0.3, z: 0.3, reference: "neutral" },
    movement: {
      type: "zigzag",
      direction: { x: 0.2, y: 0, z: 0 },
      repetitions: 3,
      speed: "fast",
    },
    nonManualMarkers: [{ type: "head", expression: "shake", intensity: 0.6 }],
    duration: 900,
  },
  LOVE: {
    gloss: "I-LOVE-YOU",
    handshape: { dominant: "letter-y" },
    location: { x: 0, y: 0.1, z: 0.4, reference: "chest" },
    movement: { type: "static", speed: "normal" },
    nonManualMarkers: [{ type: "facial", expression: "smile", intensity: 0.8 }],
    duration: 1500,
  },
};

// Default avatar configuration
const defaultConfig: AvatarConfig = {
  style: "realistic",
  skinTone: "#e8beac",
  clothingColor: "#4a5568",
  showFace: true,
  showHands: true,
  showUpperBody: true,
};

// Default expression state
const defaultExpression = {
  eyebrows: 0,
  eyeOpenness: 1,
  mouthShape: "neutral" as const,
  headTilt: { x: 0, y: 0, z: 0 },
};

export default function AvatarTestPage() {
  const [avatarUrl, setAvatarUrl] = useState(
    "https://models.readyplayer.me/695e6d581c1817592c688b0c.glb?morphTargets=ARKit&textureAtlas=1024",
  );
  const [customUrl, setCustomUrl] = useState("");
  const [useRPM, setUseRPM] = useState(true);
  const [avatarState, setAvatarState] = useState<AvatarState>({
    currentSign: undefined,
    queue: [],
    isAnimating: false,
    expressionState: defaultExpression,
  });

  const playSign = useCallback((signKey: string) => {
    const sign = DEMO_SIGNS[signKey];
    if (!sign) return;

    const expression = { ...defaultExpression };
    if (sign.nonManualMarkers?.[0]) {
      const marker = sign.nonManualMarkers[0];
      if (marker.expression === "smile") {
        expression.eyebrows = 0.3;
      } else if (marker.expression === "headshake") {
        expression.headTilt = { x: 0, y: 0.2, z: 0 };
      } else if (marker.expression === "nod") {
        expression.headTilt = { x: 0.2, y: 0, z: 0 };
      }
    }

    setAvatarState({
      currentSign: sign,
      queue: [],
      isAnimating: true,
      expressionState: expression,
    });
  }, []);

  const onSignComplete = useCallback(() => {
    setAvatarState((prev) => ({
      ...prev,
      currentSign: undefined,
      isAnimating: false,
      expressionState: defaultExpression,
    }));
  }, []);

  const handleApplyCustomUrl = () => {
    if (customUrl.trim()) {
      let url = customUrl.trim();
      if (!url.includes("morphTargets")) {
        url += url.includes("?")
          ? "&morphTargets=ARKit"
          : "?morphTargets=ARKit";
      }
      setAvatarUrl(url);
      setCustomUrl("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Centered Container */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            SignMate Avatar
          </h1>
          <p className="text-purple-300">Test ASL sign animations</p>
        </div>

        {/* Avatar Display - Square aspect ratio */}
        <div className="relative mx-auto mb-8" style={{ maxWidth: "600px" }}>
          <div
            className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-purple-500/20"
            style={{ aspectRatio: "3/4" }}
          >
            <AvatarRenderer
              config={defaultConfig}
              state={avatarState}
              onSignComplete={onSignComplete}
              avatarUrl={useRPM ? avatarUrl : undefined}
            />

            {/* Status Badge */}
            <div className="absolute top-4 left-4">
              {avatarState.isAnimating ? (
                <div className="flex items-center gap-2 bg-green-500/90 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-white font-medium">
                    {avatarState.currentSign?.gloss}
                  </span>
                </div>
              ) : (
                <div className="bg-slate-700/80 px-4 py-2 rounded-full">
                  <span className="text-slate-300">Ready</span>
                </div>
              )}
            </div>

            {/* Avatar Type Badge */}
            <div className="absolute top-4 right-4">
              <div className="bg-purple-600/80 px-3 py-1 rounded-full">
                <span className="text-white text-sm">
                  {useRPM ? "3D Avatar" : "Basic"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sign Buttons - Primary Action */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 text-center">
            Test Signs
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {Object.keys(DEMO_SIGNS).map((key) => (
              <button
                key={key}
                onClick={() => playSign(key)}
                disabled={avatarState.isAnimating}
                className={`px-6 py-3 rounded-xl font-semibold text-lg transition-all transform ${
                  avatarState.isAnimating
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25"
                }`}
              >
                {DEMO_SIGNS[key].gloss}
              </button>
            ))}
          </div>
        </div>

        {/* Settings Panel */}
        <div className="bg-slate-800/50 rounded-2xl p-6 backdrop-blur border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Settings</h2>

          {/* Avatar Type Toggle */}
          <div className="mb-6">
            <label className="text-slate-300 text-sm mb-2 block">
              Avatar Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setUseRPM(true)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                  useRPM
                    ? "bg-purple-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                ReadyPlayerMe
              </button>
              <button
                onClick={() => setUseRPM(false)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                  !useRPM
                    ? "bg-purple-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                Primitive
              </button>
            </div>
          </div>

          {/* Custom Avatar URL */}
          {useRPM && (
            <div>
              <label className="text-slate-300 text-sm mb-2 block">
                Custom Avatar URL{" "}
                <a
                  href="https://readyplayer.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:underline"
                >
                  (create at readyplayer.me)
                </a>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://models.readyplayer.me/[ID].glb"
                  className="flex-1 px-4 py-2 bg-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleApplyCustomUrl}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium text-white transition"
                >
                  Load
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center text-slate-400 text-sm">
          <p>
            Click a sign button to see the animation. Drag to rotate, scroll to
            zoom.
          </p>
        </div>
      </div>
    </div>
  );
}
