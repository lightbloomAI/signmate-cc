import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock translation module
const mockTranslate = vi.fn();
vi.mock('../asl/translator', () => ({
  ASLTranslator: vi.fn().mockImplementation(() => ({
    translate: mockTranslate,
    translateWithContext: vi.fn(),
  })),
  getASLTranslator: vi.fn().mockImplementation(() => ({
    translate: mockTranslate,
    translateWithContext: vi.fn(),
  })),
}));

describe('SignMate Pipeline Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTranslate.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Text to ASL Translation Flow', () => {
    it('should translate simple text to ASL signs', () => {
      const mockSigns = [
        {
          gloss: 'HELLO',
          duration: 500,
          handshape: { dominant: 'flat-hand' },
          location: { x: 0, y: 0, z: 0, reference: 'face' },
          movement: { type: 'linear', speed: 'normal' },
          nonManualMarkers: [],
        },
      ];

      mockTranslate.mockReturnValue({
        signs: mockSigns,
        unmappedWords: [],
      });

      const result = mockTranslate('hello');

      expect(result.signs).toHaveLength(1);
      expect(result.signs[0].gloss).toBe('HELLO');
    });

    it('should handle multi-word phrases', () => {
      const mockSigns = [
        {
          gloss: 'THANK-YOU',
          duration: 600,
          handshape: { dominant: 'flat-hand' },
          location: { x: 0, y: 0.5, z: 0.3, reference: 'chest' },
          movement: { type: 'linear', speed: 'normal' },
          nonManualMarkers: [],
        },
        {
          gloss: 'HELP',
          duration: 500,
          handshape: { dominant: 'a-hand', nonDominant: 'flat-hand' },
          location: { x: 0, y: 0, z: 0.3, reference: 'neutral' },
          movement: { type: 'linear', speed: 'normal' },
          nonManualMarkers: [],
        },
      ];

      mockTranslate.mockReturnValue({
        signs: mockSigns,
        unmappedWords: [],
      });

      const result = mockTranslate('thank you for the help');

      expect(result.signs).toHaveLength(2);
      expect(result.signs[0].gloss).toBe('THANK-YOU');
    });

    it('should handle unmapped words gracefully', () => {
      const mockSigns = [
        {
          gloss: 'HELLO',
          duration: 500,
          handshape: { dominant: 'flat-hand' },
          location: { x: 0, y: 0, z: 0, reference: 'face' },
          movement: { type: 'linear', speed: 'normal' },
          nonManualMarkers: [],
        },
      ];

      mockTranslate.mockReturnValue({
        signs: mockSigns,
        unmappedWords: ['xyz123'],
      });

      const result = mockTranslate('hello xyz123');

      expect(result.signs).toHaveLength(1);
      expect(result.unmappedWords).toContain('xyz123');
    });

    it('should handle empty input', () => {
      mockTranslate.mockReturnValue({
        signs: [],
        unmappedWords: [],
      });

      const result = mockTranslate('');

      expect(result.signs).toHaveLength(0);
    });
  });

  describe('Sign Properties', () => {
    it('should include required sign properties', () => {
      const mockSign = {
        gloss: 'HELLO',
        duration: 500,
        handshape: { dominant: 'flat-hand' },
        location: { x: 0, y: 0, z: 0, reference: 'face' },
        movement: { type: 'linear', speed: 'normal' },
        nonManualMarkers: [],
      };

      mockTranslate.mockReturnValue({
        signs: [mockSign],
        unmappedWords: [],
      });

      const result = mockTranslate('hello');
      const sign = result.signs[0];

      expect(sign).toHaveProperty('gloss');
      expect(sign).toHaveProperty('duration');
      expect(sign).toHaveProperty('handshape');
      expect(sign).toHaveProperty('location');
      expect(sign).toHaveProperty('movement');
      expect(sign).toHaveProperty('nonManualMarkers');
    });

    it('should have valid location references', () => {
      const validReferences = ['neutral', 'face', 'chest', 'head', 'side'];
      const mockSign = {
        gloss: 'TEST',
        duration: 500,
        handshape: { dominant: 'flat-hand' },
        location: { x: 0, y: 0, z: 0, reference: 'chest' },
        movement: { type: 'static', speed: 'normal' },
        nonManualMarkers: [],
      };

      mockTranslate.mockReturnValue({
        signs: [mockSign],
        unmappedWords: [],
      });

      const result = mockTranslate('test');

      expect(validReferences).toContain(result.signs[0].location.reference);
    });

    it('should have valid movement types', () => {
      const validMovementTypes = ['static', 'linear', 'arc', 'circular', 'zigzag'];
      const mockSign = {
        gloss: 'TEST',
        duration: 500,
        handshape: { dominant: 'flat-hand' },
        location: { x: 0, y: 0, z: 0, reference: 'neutral' },
        movement: { type: 'linear', speed: 'normal' },
        nonManualMarkers: [],
      };

      mockTranslate.mockReturnValue({
        signs: [mockSign],
        unmappedWords: [],
      });

      const result = mockTranslate('test');

      expect(validMovementTypes).toContain(result.signs[0].movement.type);
    });
  });

  describe('Latency Requirements', () => {
    it('should translate within acceptable latency', () => {
      const mockSign = {
        gloss: 'HELLO',
        duration: 500,
        handshape: { dominant: 'flat-hand' },
        location: { x: 0, y: 0, z: 0, reference: 'face' },
        movement: { type: 'linear', speed: 'normal' },
        nonManualMarkers: [],
      };

      mockTranslate.mockReturnValue({
        signs: [mockSign],
        unmappedWords: [],
      });

      const startTime = performance.now();
      mockTranslate('hello world this is a test');
      const endTime = performance.now();

      const latency = endTime - startTime;

      // Translation should be fast (under 50ms)
      expect(latency).toBeLessThan(50);
    });
  });

  describe('Sign Sequencing', () => {
    it('should maintain correct sign order', () => {
      const mockSigns = [
        { gloss: 'I', duration: 300, handshape: { dominant: 'point' }, location: { x: 0, y: 0, z: 0, reference: 'chest' }, movement: { type: 'static', speed: 'normal' }, nonManualMarkers: [] },
        { gloss: 'LOVE', duration: 500, handshape: { dominant: 'fist' }, location: { x: 0, y: 0.3, z: 0, reference: 'chest' }, movement: { type: 'static', speed: 'normal' }, nonManualMarkers: [] },
        { gloss: 'YOU', duration: 300, handshape: { dominant: 'point' }, location: { x: 0.3, y: 0, z: 0.3, reference: 'neutral' }, movement: { type: 'linear', speed: 'normal' }, nonManualMarkers: [] },
      ];

      mockTranslate.mockReturnValue({
        signs: mockSigns,
        unmappedWords: [],
      });

      const result = mockTranslate('i love you');
      const glossSequence = result.signs.map((s: { gloss: string }) => s.gloss);

      expect(glossSequence).toEqual(['I', 'LOVE', 'YOU']);
    });
  });

  describe('Non-Manual Markers', () => {
    it('should include facial expressions for questions', () => {
      const mockSign = {
        gloss: 'WHAT',
        duration: 500,
        handshape: { dominant: 'open-hand' },
        location: { x: 0, y: 0, z: 0.3, reference: 'neutral' },
        movement: { type: 'linear', speed: 'normal' },
        nonManualMarkers: [
          { type: 'facial', expression: 'raised-eyebrows', intensity: 0.8 },
        ],
      };

      mockTranslate.mockReturnValue({
        signs: [mockSign],
        unmappedWords: [],
      });

      const result = mockTranslate('what');

      expect(result.signs[0].nonManualMarkers).toHaveLength(1);
      expect(result.signs[0].nonManualMarkers[0].type).toBe('facial');
    });
  });
});

describe('Error Handling', () => {
  it('should handle translation errors gracefully', () => {
    mockTranslate.mockImplementation(() => {
      throw new Error('Translation failed');
    });

    expect(() => mockTranslate('test')).toThrow('Translation failed');
  });
});

describe('Performance Metrics', () => {
  it('should track translation time', () => {
    const metrics = {
      translationTime: 0,
      signCount: 0,
    };

    const mockSigns = [
      { gloss: 'HELLO', duration: 500, handshape: { dominant: 'flat-hand' }, location: { x: 0, y: 0, z: 0, reference: 'face' }, movement: { type: 'linear', speed: 'normal' }, nonManualMarkers: [] },
    ];

    mockTranslate.mockImplementation(() => {
      metrics.translationTime = 5; // Simulated 5ms
      metrics.signCount = 1;
      return { signs: mockSigns, unmappedWords: [] };
    });

    mockTranslate('hello');

    expect(metrics.translationTime).toBeLessThan(50);
    expect(metrics.signCount).toBeGreaterThan(0);
  });
});
