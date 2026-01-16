import '@testing-library/jest-dom';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Web Audio API
class MockAudioContext {
  createMediaStreamSource() {
    return {
      connect: () => {},
      disconnect: () => {},
    };
  }
  createScriptProcessor() {
    return {
      connect: () => {},
      disconnect: () => {},
      onaudioprocess: null,
    };
  }
  createMediaElementSource() {
    return {
      connect: () => {},
    };
  }
  createMediaStreamDestination() {
    return {
      stream: new MediaStream(),
    };
  }
  get destination() {
    return {};
  }
  close() {
    return Promise.resolve();
  }
}

// @ts-expect-error Mock implementation
global.AudioContext = MockAudioContext;
// @ts-expect-error Mock implementation
global.webkitAudioContext = MockAudioContext;

// Mock MediaStream
global.MediaStream = class MockMediaStream {
  getTracks() {
    return [];
  }
} as unknown as typeof MediaStream;

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: () =>
      Promise.resolve({
        getTracks: () => [],
      }),
    enumerateDevices: () =>
      Promise.resolve([
        {
          deviceId: 'default',
          kind: 'audioinput',
          label: 'Default Microphone',
        },
      ]),
  },
});

// Mock SpeechRecognition
class MockSpeechRecognition {
  lang = 'en-US';
  interimResults = true;
  continuous = true;
  maxAlternatives = 1;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;

  start() {}
  stop() {}
  abort() {}
}

// @ts-expect-error Mock implementation
global.SpeechRecognition = MockSpeechRecognition;
// @ts-expect-error Mock implementation
global.webkitSpeechRecognition = MockSpeechRecognition;

// Mock speechSynthesis
Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: {
    speak: () => {},
    cancel: () => {},
    getVoices: () => [],
  },
});

// Mock WebGL context for Three.js
(HTMLCanvasElement.prototype as unknown as { getContext: (type: string) => unknown }).getContext = function (
  contextType: string
): unknown {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return {
      canvas: this,
      getExtension: () => null,
      getParameter: () => [],
      createShader: () => ({}),
      shaderSource: () => {},
      compileShader: () => {},
      createProgram: () => ({}),
      attachShader: () => {},
      linkProgram: () => {},
      useProgram: () => {},
      getShaderParameter: () => true,
      getProgramParameter: () => true,
      createBuffer: () => ({}),
      bindBuffer: () => {},
      bufferData: () => {},
      enable: () => {},
      disable: () => {},
      clear: () => {},
      viewport: () => {},
      drawArrays: () => {},
      drawElements: () => {},
      createTexture: () => ({}),
      bindTexture: () => {},
      texImage2D: () => {},
      texParameteri: () => {},
      createFramebuffer: () => ({}),
      bindFramebuffer: () => {},
      framebufferTexture2D: () => {},
      createRenderbuffer: () => ({}),
      bindRenderbuffer: () => {},
      renderbufferStorage: () => {},
      framebufferRenderbuffer: () => {},
      checkFramebufferStatus: () => 36053,
      getUniformLocation: () => ({}),
      getAttribLocation: () => 0,
      uniform1i: () => {},
      uniform1f: () => {},
      uniform2f: () => {},
      uniform3f: () => {},
      uniform4f: () => {},
      uniformMatrix4fv: () => {},
      vertexAttribPointer: () => {},
      enableVertexAttribArray: () => {},
      pixelStorei: () => {},
      activeTexture: () => {},
      blendFunc: () => {},
      depthFunc: () => {},
      cullFace: () => {},
      frontFace: () => {},
      clearColor: () => {},
      clearDepth: () => {},
      scissor: () => {},
    };
  }
  return null;
};
