import { describe, it, expect, beforeEach } from 'vitest';
import { ASLTranslator } from './translator';

describe('ASLTranslator', () => {
  let translator: ASLTranslator;

  beforeEach(() => {
    translator = new ASLTranslator();
  });

  describe('translate', () => {
    it('should translate simple text to ASL signs', async () => {
      const result = await translator.translate('hello');

      expect(result.sourceText).toBe('hello');
      expect(result.signs).toHaveLength(1);
      expect(result.signs[0].gloss).toBe('HELLO');
    });

    it('should translate multiple words', async () => {
      const result = await translator.translate('hello yes');

      expect(result.signs).toHaveLength(2);
      expect(result.signs[0].gloss).toBe('HELLO');
      expect(result.signs[1].gloss).toBe('YES');
    });

    it('should handle word mappings', async () => {
      const result = await translator.translate('hi thanks');

      expect(result.signs).toHaveLength(2);
      expect(result.signs[0].gloss).toBe('HELLO'); // 'hi' maps to 'hello'
      expect(result.signs[1].gloss).toBe('THANK-YOU'); // 'thanks' maps to 'thank-you'
    });

    it('should fingerspell unknown words', async () => {
      const result = await translator.translate('xyz');

      expect(result.signs).toHaveLength(3); // One sign per letter
      expect(result.signs[0].gloss).toBe('FS:X');
      expect(result.signs[1].gloss).toBe('FS:Y');
      expect(result.signs[2].gloss).toBe('FS:Z');
    });

    it('should handle mixed known and unknown words', async () => {
      const result = await translator.translate('hello xyz');

      expect(result.signs.length).toBeGreaterThan(1);
      expect(result.signs[0].gloss).toBe('HELLO');
      // Remaining signs should be fingerspelled
    });

    it('should remove punctuation from text', async () => {
      const result = await translator.translate('Hello, how are you?');

      // Should not throw and should produce signs
      expect(result.signs.length).toBeGreaterThan(0);
    });

    it('should handle empty text', async () => {
      const result = await translator.translate('');

      expect(result.signs).toHaveLength(0);
    });

    it('should include correct animation data for signs', async () => {
      const result = await translator.translate('yes');

      expect(result.signs).toHaveLength(1);
      const sign = result.signs[0];

      expect(sign.duration).toBeGreaterThan(0);
      expect(sign.handshape).toBeDefined();
      expect(sign.handshape.dominant).toBeDefined();
      expect(sign.location).toBeDefined();
      expect(sign.movement).toBeDefined();
      expect(sign.movement.type).toBeDefined();
    });

    it('should generate unique translation IDs', async () => {
      const result1 = await translator.translate('hello');
      const result2 = await translator.translate('hello');

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('hasSign', () => {
    it('should return true for known signs', () => {
      expect(translator.hasSign('hello')).toBe(true);
      expect(translator.hasSign('thank-you')).toBe(true);
      expect(translator.hasSign('yes')).toBe(true);
    });

    it('should return true for mapped words', () => {
      expect(translator.hasSign('hi')).toBe(true); // Maps to hello
      expect(translator.hasSign('thanks')).toBe(true); // Maps to thank-you
    });

    it('should return false for unknown words', () => {
      expect(translator.hasSign('xyzabc')).toBe(false);
      expect(translator.hasSign('qwerty')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(translator.hasSign('HELLO')).toBe(true);
      expect(translator.hasSign('Hello')).toBe(true);
    });
  });

  describe('getGlossary', () => {
    it('should return a list of available signs', () => {
      const glossary = translator.getGlossary();

      expect(Array.isArray(glossary)).toBe(true);
      expect(glossary.length).toBeGreaterThan(0);
      expect(glossary).toContain('hello');
      expect(glossary).toContain('thank-you');
    });
  });
});
