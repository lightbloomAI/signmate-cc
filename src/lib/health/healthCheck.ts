/**
 * System health check for SignMate
 * Validates all components are working before going live
 */

export interface HealthCheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: string;
  duration?: number;
}

export interface HealthReport {
  timestamp: number;
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheckResult[];
  passCount: number;
  warnCount: number;
  failCount: number;
  totalDuration: number;
}

type HealthCheck = () => Promise<HealthCheckResult>;

// Individual health checks
const checks: Record<string, HealthCheck> = {
  // Browser capabilities
  async browserCapabilities(): Promise<HealthCheckResult> {
    const start = performance.now();
    const issues: string[] = [];

    // Check for WebGL
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        issues.push('WebGL not supported');
      }
    } catch {
      issues.push('WebGL check failed');
    }

    // Check for Web Audio API
    if (typeof AudioContext === 'undefined' && typeof (window as unknown as { webkitAudioContext: unknown }).webkitAudioContext === 'undefined') {
      issues.push('Web Audio API not supported');
    }

    // Check for getUserMedia
    if (!navigator.mediaDevices?.getUserMedia) {
      issues.push('getUserMedia not supported');
    }

    // Check for WebSocket
    if (typeof WebSocket === 'undefined') {
      issues.push('WebSocket not supported');
    }

    // Check for localStorage
    try {
      localStorage.setItem('__health_test__', '1');
      localStorage.removeItem('__health_test__');
    } catch {
      issues.push('localStorage not available');
    }

    const duration = performance.now() - start;

    if (issues.length === 0) {
      return {
        name: 'Browser Capabilities',
        status: 'pass',
        message: 'All required browser features available',
        duration,
      };
    } else if (issues.length <= 2) {
      return {
        name: 'Browser Capabilities',
        status: 'warn',
        message: `Some features limited: ${issues.join(', ')}`,
        details: issues.join('\n'),
        duration,
      };
    }

    return {
      name: 'Browser Capabilities',
      status: 'fail',
      message: 'Critical browser features missing',
      details: issues.join('\n'),
      duration,
    };
  },

  // Audio devices
  async audioDevices(): Promise<HealthCheckResult> {
    const start = performance.now();

    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        return {
          name: 'Audio Devices',
          status: 'fail',
          message: 'Cannot enumerate audio devices',
          duration: performance.now() - start,
        };
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');

      if (audioInputs.length === 0) {
        return {
          name: 'Audio Devices',
          status: 'fail',
          message: 'No audio input devices found',
          duration: performance.now() - start,
        };
      }

      return {
        name: 'Audio Devices',
        status: 'pass',
        message: `Found ${audioInputs.length} audio input device(s)`,
        details: audioInputs.map((d) => d.label || 'Unnamed device').join(', '),
        duration: performance.now() - start,
      };
    } catch (error) {
      return {
        name: 'Audio Devices',
        status: 'fail',
        message: 'Failed to enumerate audio devices',
        details: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - start,
      };
    }
  },

  // Microphone permission
  async microphonePermission(): Promise<HealthCheckResult> {
    const start = performance.now();

    try {
      const permissionStatus = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      });

      const duration = performance.now() - start;

      if (permissionStatus.state === 'granted') {
        return {
          name: 'Microphone Permission',
          status: 'pass',
          message: 'Microphone access granted',
          duration,
        };
      } else if (permissionStatus.state === 'prompt') {
        return {
          name: 'Microphone Permission',
          status: 'warn',
          message: 'Microphone permission not yet requested',
          details: 'User will be prompted when starting',
          duration,
        };
      }

      return {
        name: 'Microphone Permission',
        status: 'fail',
        message: 'Microphone access denied',
        details: 'Check browser settings to allow microphone access',
        duration,
      };
    } catch {
      // Some browsers don't support permissions API
      return {
        name: 'Microphone Permission',
        status: 'warn',
        message: 'Cannot check microphone permission',
        details: 'Permission will be requested when needed',
        duration: performance.now() - start,
      };
    }
  },

  // Speech recognition
  async speechRecognition(): Promise<HealthCheckResult> {
    const start = performance.now();

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    const duration = performance.now() - start;

    if (SpeechRecognition) {
      return {
        name: 'Speech Recognition',
        status: 'pass',
        message: 'Browser speech recognition available',
        duration,
      };
    }

    return {
      name: 'Speech Recognition',
      status: 'warn',
      message: 'Browser speech recognition not available',
      details: 'Use Deepgram for speech recognition instead',
      duration,
    };
  },

  // WebGL rendering
  async webGLRendering(): Promise<HealthCheckResult> {
    const start = performance.now();

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

      if (!gl) {
        return {
          name: 'WebGL Rendering',
          status: 'fail',
          message: 'WebGL not available',
          details: 'Enable hardware acceleration in browser settings',
          duration: performance.now() - start,
        };
      }

      // Check for WebGL2
      const isWebGL2 = !!canvas.getContext('webgl2');

      // Get renderer info
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      let renderer = 'Unknown';
      if (debugInfo) {
        renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
      }

      const duration = performance.now() - start;

      return {
        name: 'WebGL Rendering',
        status: 'pass',
        message: `WebGL${isWebGL2 ? '2' : ''} available`,
        details: `Renderer: ${renderer}`,
        duration,
      };
    } catch (error) {
      return {
        name: 'WebGL Rendering',
        status: 'fail',
        message: 'WebGL check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - start,
      };
    }
  },

  // Memory availability
  async memoryAvailability(): Promise<HealthCheckResult> {
    const start = performance.now();

    // @ts-expect-error - memory property may not be available
    if (!performance.memory) {
      return {
        name: 'Memory Availability',
        status: 'warn',
        message: 'Cannot check memory usage',
        details: 'Memory API not available in this browser',
        duration: performance.now() - start,
      };
    }

    // @ts-expect-error - memory property may not be available
    const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
    const usedMB = usedJSHeapSize / (1024 * 1024);
    const limitMB = jsHeapSizeLimit / (1024 * 1024);
    const percentUsed = (usedJSHeapSize / jsHeapSizeLimit) * 100;

    const duration = performance.now() - start;

    if (percentUsed > 80) {
      return {
        name: 'Memory Availability',
        status: 'fail',
        message: 'Memory usage critical',
        details: `Using ${usedMB.toFixed(0)}MB of ${limitMB.toFixed(0)}MB (${percentUsed.toFixed(0)}%)`,
        duration,
      };
    } else if (percentUsed > 60) {
      return {
        name: 'Memory Availability',
        status: 'warn',
        message: 'Memory usage elevated',
        details: `Using ${usedMB.toFixed(0)}MB of ${limitMB.toFixed(0)}MB (${percentUsed.toFixed(0)}%)`,
        duration,
      };
    }

    return {
      name: 'Memory Availability',
      status: 'pass',
      message: 'Memory usage normal',
      details: `Using ${usedMB.toFixed(0)}MB of ${limitMB.toFixed(0)}MB (${percentUsed.toFixed(0)}%)`,
      duration,
    };
  },

  // Network connectivity
  async networkConnectivity(): Promise<HealthCheckResult> {
    const start = performance.now();

    if (!navigator.onLine) {
      return {
        name: 'Network Connectivity',
        status: 'fail',
        message: 'No network connection',
        duration: performance.now() - start,
      };
    }

    // Check connection quality if available
    const connection = (navigator as unknown as { connection?: { effectiveType?: string; downlink?: number } }).connection;
    let details = 'Online';

    if (connection) {
      const { effectiveType, downlink } = connection;
      details = `Connection: ${effectiveType || 'unknown'}`;
      if (downlink) {
        details += `, ~${downlink}Mbps`;
      }
    }

    const duration = performance.now() - start;

    return {
      name: 'Network Connectivity',
      status: 'pass',
      message: 'Network connected',
      details,
      duration,
    };
  },

  // Settings loaded
  async settingsLoaded(): Promise<HealthCheckResult> {
    const start = performance.now();

    try {
      const stored = localStorage.getItem('signmate-settings');

      if (stored) {
        JSON.parse(stored); // Validate JSON
        return {
          name: 'Settings',
          status: 'pass',
          message: 'Settings loaded successfully',
          duration: performance.now() - start,
        };
      }

      return {
        name: 'Settings',
        status: 'pass',
        message: 'Using default settings',
        details: 'No saved settings found',
        duration: performance.now() - start,
      };
    } catch (error) {
      return {
        name: 'Settings',
        status: 'warn',
        message: 'Settings corrupted, using defaults',
        details: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - start,
      };
    }
  },
};

// Run all health checks
export async function runHealthCheck(): Promise<HealthReport> {
  const startTime = performance.now();
  const results: HealthCheckResult[] = [];

  for (const [, check] of Object.entries(checks)) {
    try {
      const result = await check();
      results.push(result);
    } catch (error) {
      results.push({
        name: 'Unknown Check',
        status: 'fail',
        message: 'Check threw an error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const passCount = results.filter((r) => r.status === 'pass').length;
  const warnCount = results.filter((r) => r.status === 'warn').length;
  const failCount = results.filter((r) => r.status === 'fail').length;

  let overall: 'healthy' | 'degraded' | 'unhealthy';
  if (failCount > 0) {
    overall = 'unhealthy';
  } else if (warnCount > 0) {
    overall = 'degraded';
  } else {
    overall = 'healthy';
  }

  return {
    timestamp: Date.now(),
    overall,
    checks: results,
    passCount,
    warnCount,
    failCount,
    totalDuration: performance.now() - startTime,
  };
}

// Run a single check
export async function runSingleCheck(checkName: string): Promise<HealthCheckResult | null> {
  const check = checks[checkName];
  if (!check) return null;

  try {
    return await check();
  } catch (error) {
    return {
      name: checkName,
      status: 'fail',
      message: 'Check threw an error',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Get list of available checks
export function getAvailableChecks(): string[] {
  return Object.keys(checks);
}
