'use client';

import React, { useState, useRef, useEffect } from 'react';
import { getASLTranslator } from '@/lib/asl/translator';

/**
 * Speech Recognition Test Page
 *
 * Simple diagnostic page to test if speech recognition works
 */

export default function TestPage() {
  const [status, setStatus] = useState<string>('Ready');
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [signs, setSigns] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<string>('');

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check browser support
    const info: string[] = [];
    info.push(`User Agent: ${navigator.userAgent}`);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    info.push(`SpeechRecognition API: ${SpeechRecognition ? 'Supported' : 'NOT SUPPORTED'}`);
    info.push(`Secure Context: ${window.isSecureContext ? 'Yes' : 'No'}`);
    info.push(`Online: ${navigator.onLine ? 'Yes' : 'No'}`);

    setBrowserInfo(info.join('\n'));
  }, []);

  const startListening = async () => {
    setError('');
    setTranscript('');
    setSigns([]);

    try {
      // First request microphone permission
      setStatus('Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStatus('Microphone access granted');

      // Stop the stream since we just needed permission
      stream.getTracks().forEach(track => track.stop());

      // Initialize speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setError('Speech Recognition API not supported in this browser. Use Chrome or Edge.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setStatus('Listening... Speak now!');
        setIsListening(true);
      };

      recognition.onresult = async (event: any) => {
        const result = event.results[event.resultIndex];
        const text = result[0].transcript;
        const isFinal = result.isFinal;

        setTranscript(text);
        setStatus(isFinal ? 'Got final result!' : 'Hearing you...');

        if (isFinal && text.trim()) {
          // Translate to ASL
          const translator = getASLTranslator();
          const translation = await translator.translate(text);
          setSigns(translation.signs.map(s => s.gloss));
        }
      };

      recognition.onerror = (event: any) => {
        setError(`Speech recognition error: ${event.error}\n\nPossible causes:\n- No internet connection\n- Microphone not working\n- Browser doesn't support this feature\n- Try using Chrome or Edge`);
        setStatus('Error occurred');
        setIsListening(false);
      };

      recognition.onend = () => {
        setStatus('Stopped listening');
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (err: any) {
      setError(`Error: ${err.message}`);
      setStatus('Failed to start');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setStatus('Stopped');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Speech Recognition Test</h1>

      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Browser Info</h2>
        <pre className="text-sm text-gray-400 whitespace-pre-wrap">{browserInfo}</pre>
      </div>

      <div className="mb-6">
        <p className="text-lg mb-2">Status: <span className="font-semibold text-blue-400">{status}</span></p>
      </div>

      <div className="mb-6 flex gap-4">
        {!isListening ? (
          <button
            onClick={startListening}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-lg"
          >
            Start Listening
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

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg">
          <h2 className="text-xl font-semibold mb-2 text-red-400">Error</h2>
          <pre className="text-sm whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {transcript && (
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Transcript</h2>
          <p className="text-2xl">{transcript}</p>
        </div>
      )}

      {signs.length > 0 && (
        <div className="mb-6 p-4 bg-blue-900/50 border border-blue-500 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">ASL Signs</h2>
          <div className="flex flex-wrap gap-2">
            {signs.map((sign, i) => (
              <span key={i} className="px-3 py-1 bg-blue-600 rounded-full text-sm">
                {sign}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Troubleshooting</h2>
        <ul className="list-disc list-inside text-gray-400 space-y-1">
          <li>Use <strong>Chrome</strong> or <strong>Edge</strong> browser (Safari/Firefox have limited support)</li>
          <li>Make sure you have an <strong>internet connection</strong> (Web Speech API uses cloud services)</li>
          <li>Allow <strong>microphone permission</strong> when prompted</li>
          <li>Speak clearly and wait for the transcript to appear</li>
        </ul>
      </div>
    </div>
  );
}
