'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAudioDevices } from '@/hooks/useAudioDevices';
import { useSignMateStore } from '@/store';
import type { AudioSource, AvatarConfig, DisplayConfig, EventConfig } from '@/types';

/**
 * Quick Start Wizard
 *
 * Guides users through the initial setup process for SignMate.
 * Provides a streamlined experience for configuring audio, avatar, and display.
 */

type WizardStep = 'welcome' | 'audio' | 'avatar' | 'display' | 'review' | 'complete';

interface QuickStartWizardProps {
  onComplete: (config: EventConfig) => void;
  onCancel?: () => void;
  onStartDemo?: () => void;
}

export function QuickStartWizard({
  onComplete,
  onCancel,
  onStartDemo,
}: QuickStartWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const [audioTestLevel, setAudioTestLevel] = useState(0);
  const [audioTestInterval, setAudioTestInterval] = useState<NodeJS.Timeout | null>(null);

  const { avatarConfig, setAvatarConfig } = useSignMateStore();
  const { devices, isLoading: isLoadingDevices, error: deviceError, refresh: refreshDevices } = useAudioDevices();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Derive selected device from ID
  const selectedDevice = devices.find(d => d.id === selectedDeviceId) || null;

  // Form state
  const [eventName, setEventName] = useState('');
  const [venueName, setVenueName] = useState('');
  const [selectedAudioSource, setSelectedAudioSource] = useState<AudioSource | null>(null);
  const [displayMode, setDisplayMode] = useState<'stage' | 'confidence-monitor' | 'livestream-overlay'>('stage');
  const [showCaptions, setShowCaptions] = useState(true);
  const [avatarStyle, setAvatarStyle] = useState<AvatarConfig['style']>('stylized');
  const [skinTone, setSkinTone] = useState('#d4a574');
  const [clothingColor, setClothingColor] = useState('#3b82f6');

  // Audio testing
  const startAudioTest = useCallback(async () => {
    if (!selectedDevice) return;

    setIsTestingAudio(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: selectedDevice.id },
      });

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const interval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioTestLevel(average / 255);
      }, 100);

      setAudioTestInterval(interval);

      // Auto-stop after 10 seconds
      setTimeout(() => {
        stopAudioTest(stream, audioContext, interval);
      }, 10000);
    } catch (error) {
      console.error('Failed to test audio:', error);
      setIsTestingAudio(false);
    }
  }, [selectedDevice]);

  const stopAudioTest = useCallback((stream?: MediaStream, context?: AudioContext, interval?: NodeJS.Timeout) => {
    if (audioTestInterval) {
      clearInterval(audioTestInterval);
      setAudioTestInterval(null);
    }
    if (interval) {
      clearInterval(interval);
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (context) {
      context.close();
    }
    setIsTestingAudio(false);
    setAudioTestLevel(0);
  }, [audioTestInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioTestInterval) {
        clearInterval(audioTestInterval);
      }
    };
  }, [audioTestInterval]);

  // Update selected audio source when device changes
  useEffect(() => {
    if (selectedDevice) {
      setSelectedAudioSource({
        id: selectedDevice.id,
        type: 'microphone',
        name: selectedDevice.name,
        deviceId: selectedDevice.id,
        isActive: true,
      });
    }
  }, [selectedDevice]);

  // Navigation
  const steps: WizardStep[] = ['welcome', 'audio', 'avatar', 'display', 'review', 'complete'];
  const currentStepIndex = steps.indexOf(currentStep);
  const canGoBack = currentStepIndex > 0 && currentStep !== 'complete';
  const canGoForward = currentStepIndex < steps.length - 1;

  const goToStep = (step: WizardStep) => setCurrentStep(step);
  const goNext = () => {
    if (canGoForward) {
      setCurrentStep(steps[currentStepIndex + 1]);
    }
  };
  const goBack = () => {
    if (canGoBack) {
      setCurrentStep(steps[currentStepIndex - 1]);
    }
  };

  // Complete wizard
  const handleComplete = useCallback(() => {
    const config: EventConfig = {
      id: `event-${Date.now()}`,
      name: eventName || 'Untitled Event',
      venue: venueName || 'Unknown Venue',
      startTime: new Date(),
      audioSources: selectedAudioSource ? [selectedAudioSource] : [],
      displays: [
        {
          mode: displayMode,
          width: 1920,
          height: 1080,
          position: { x: 0, y: 0 },
          backgroundColor: '#000000',
          showCaptions,
          captionPosition: 'bottom',
          avatarSize: 'large',
        },
      ],
      avatarConfig: {
        style: avatarStyle,
        skinTone,
        clothingColor,
        showHands: true,
        showFace: true,
        showUpperBody: true,
      },
      isDemo: false,
    };

    // Update global avatar config
    setAvatarConfig({
      style: avatarStyle,
      skinTone,
      clothingColor,
      showHands: true,
      showFace: true,
      showUpperBody: true,
    });

    setCurrentStep('complete');
    setTimeout(() => {
      onComplete(config);
    }, 1500);
  }, [eventName, venueName, selectedAudioSource, displayMode, showCaptions, avatarStyle, skinTone, clothingColor, setAvatarConfig, onComplete]);

  // Step indicators
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.slice(1, -1).map((step, index) => (
        <React.Fragment key={step}>
          <button
            onClick={() => goToStep(step)}
            disabled={steps.indexOf(step) > currentStepIndex}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
              currentStep === step
                ? 'bg-blue-600 text-white'
                : steps.indexOf(step) < currentStepIndex
                ? 'bg-green-500 text-white'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {steps.indexOf(step) < currentStepIndex ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
              </svg>
            ) : (
              index + 1
            )}
          </button>
          {index < steps.length - 3 && (
            <div
              className={`w-12 h-1 rounded ${
                steps.indexOf(step) < currentStepIndex ? 'bg-green-500' : 'bg-gray-700'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // Welcome step
  const renderWelcome = () => (
    <div className="text-center">
      <div className="mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Welcome to SignMate</h1>
        <p className="text-lg text-gray-400 max-w-md mx-auto">
          Real-time AI sign language interpretation for your live events. Let's get you set up in just a few steps.
        </p>
      </div>

      <div className="space-y-4 max-w-sm mx-auto">
        <button
          onClick={goNext}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
        >
          Start Setup
        </button>
        {onStartDemo && (
          <button
            onClick={onStartDemo}
            className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            Try Demo Mode First
          </button>
        )}
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full px-6 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );

  // Audio step
  const renderAudio = () => (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Audio Setup</h2>
      <p className="text-gray-400 mb-6">Select and test your audio input device.</p>

      <div className="space-y-6">
        {/* Device Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Audio Input Device</label>
          {isLoadingDevices ? (
            <div className="p-4 bg-gray-800 rounded-lg text-center text-gray-400">
              Loading devices...
            </div>
          ) : deviceError ? (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400">
              {deviceError?.message || 'Failed to load devices'}
              <button onClick={refreshDevices} className="ml-2 underline">
                Retry
              </button>
            </div>
          ) : (
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a device...</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Audio Test */}
        {selectedDevice && (
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-300">Audio Level Test</span>
              <button
                onClick={isTestingAudio ? () => stopAudioTest() : startAudioTest}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isTestingAudio
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isTestingAudio ? 'Stop Test' : 'Test Audio'}
              </button>
            </div>
            <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-100"
                style={{ width: `${audioTestLevel * 100}%` }}
              />
            </div>
            {isTestingAudio && (
              <p className="mt-2 text-xs text-gray-400">
                Speak into your microphone to test the audio level.
              </p>
            )}
          </div>
        )}

        {/* Event Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Event Name</label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="My Event"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Venue</label>
            <input
              type="text"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="Conference Hall A"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Avatar step
  const renderAvatar = () => (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Avatar Customization</h2>
      <p className="text-gray-400 mb-6">Customize your sign language interpreter avatar.</p>

      <div className="grid grid-cols-2 gap-6">
        {/* Preview */}
        <div className="bg-gray-800 rounded-lg p-6 flex items-center justify-center">
          <div className="w-48 h-48 bg-gradient-to-b from-gray-700 to-gray-800 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-2"
                style={{ backgroundColor: skinTone }}
              />
              <div
                className="w-24 h-12 rounded-lg"
                style={{ backgroundColor: clothingColor }}
              />
              <p className="mt-4 text-xs text-gray-400">Avatar Preview</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Style */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Style</label>
            <div className="grid grid-cols-3 gap-2">
              {(['realistic', 'stylized', 'minimal'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => setAvatarStyle(style)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    avatarStyle === style
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Skin Tone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Skin Tone</label>
            <div className="flex gap-2">
              {['#fce4d6', '#d4a574', '#c68642', '#8d5524', '#5c3317'].map((color) => (
                <button
                  key={color}
                  onClick={() => setSkinTone(color)}
                  className={`w-10 h-10 rounded-full transition-all ${
                    skinTone === color ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Clothing Color */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Clothing Color</label>
            <div className="flex gap-2">
              {['#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f97316', '#64748b'].map((color) => (
                <button
                  key={color}
                  onClick={() => setClothingColor(color)}
                  className={`w-10 h-10 rounded-full transition-all ${
                    clothingColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Display step
  const renderDisplay = () => (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Display Settings</h2>
      <p className="text-gray-400 mb-6">Choose how the interpreter will be displayed.</p>

      <div className="space-y-6">
        {/* Display Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">Display Mode</label>
          <div className="grid grid-cols-3 gap-4">
            {[
              { id: 'stage', name: 'Stage Display', desc: 'Full screen for venue displays' },
              { id: 'confidence-monitor', name: 'Confidence Monitor', desc: 'For operators with live status' },
              { id: 'livestream-overlay', name: 'Livestream Overlay', desc: 'Transparent for streaming' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setDisplayMode(mode.id as typeof displayMode)}
                className={`p-4 rounded-lg text-left transition-all ${
                  displayMode === mode.id
                    ? 'bg-blue-600 border-2 border-blue-400'
                    : 'bg-gray-800 border-2 border-transparent hover:border-gray-600'
                }`}
              >
                <div className="font-medium text-white mb-1">{mode.name}</div>
                <div className="text-xs text-gray-400">{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Caption Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
          <div>
            <div className="font-medium text-white">Show Captions</div>
            <div className="text-sm text-gray-400">Display real-time transcription below avatar</div>
          </div>
          <button
            onClick={() => setShowCaptions(!showCaptions)}
            className={`w-12 h-6 rounded-full transition-colors ${
              showCaptions ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full transition-transform ${
                showCaptions ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );

  // Review step
  const renderReview = () => (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Review Settings</h2>
      <p className="text-gray-400 mb-6">Confirm your configuration before starting.</p>

      <div className="space-y-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Event Details</h3>
          <div className="text-white">
            <div className="font-semibold">{eventName || 'Untitled Event'}</div>
            <div className="text-gray-400">{venueName || 'Unknown Venue'}</div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Audio Source</h3>
          <div className="text-white">
            {selectedDevice?.name || 'No device selected'}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Avatar</h3>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full" style={{ backgroundColor: skinTone }} />
              <div className="w-8 h-8 rounded" style={{ backgroundColor: clothingColor }} />
            </div>
            <span className="text-white capitalize">{avatarStyle} style</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Display</h3>
          <div className="text-white">
            {displayMode.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            {showCaptions && ' • Captions enabled'}
          </div>
        </div>
      </div>

      <button
        onClick={handleComplete}
        className="w-full mt-6 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
      >
        Start Event
      </button>
    </div>
  );

  // Complete step
  const renderComplete = () => (
    <div className="text-center">
      <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Setup Complete!</h2>
      <p className="text-gray-400">Starting your event...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {currentStep !== 'welcome' && currentStep !== 'complete' && <StepIndicator />}

        <div className="bg-gray-900 rounded-2xl p-8">
          {currentStep === 'welcome' && renderWelcome()}
          {currentStep === 'audio' && renderAudio()}
          {currentStep === 'avatar' && renderAvatar()}
          {currentStep === 'display' && renderDisplay()}
          {currentStep === 'review' && renderReview()}
          {currentStep === 'complete' && renderComplete()}

          {/* Navigation */}
          {currentStep !== 'welcome' && currentStep !== 'review' && currentStep !== 'complete' && (
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-800">
              <button
                onClick={goBack}
                disabled={!canGoBack}
                className="px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Back
              </button>
              <button
                onClick={goNext}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {currentStep === 'review' && (
            <div className="mt-8 pt-6 border-t border-gray-800">
              <button
                onClick={goBack}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Back to Edit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
