import type { ASLSign, ASLTranslation, HandShape, SignLocation, SignMovement, NonManualMarker } from '@/types';

export interface ASLTranslatorConfig {
  useAI: boolean;
  aiApiKey?: string;
  glossaryOnly: boolean;
}

const defaultConfig: ASLTranslatorConfig = {
  useAI: false,
  glossaryOnly: true,
};

// ASL sign database with animation parameters
// This is a simplified glossary - production would use a comprehensive database
const ASL_GLOSSARY: Record<string, Omit<ASLSign, 'gloss'>> = {
  'hello': {
    duration: 800,
    handshape: { dominant: 'flat-hand' },
    location: { x: 0.3, y: 0.8, z: 0.2, reference: 'head' },
    movement: { type: 'arc', direction: { x: 0.3, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'smile', intensity: 0.6 }],
  },
  'thank-you': {
    duration: 600,
    handshape: { dominant: 'flat-hand' },
    location: { x: 0, y: 0.7, z: 0.1, reference: 'face' },
    movement: { type: 'linear', direction: { x: 0, y: -0.2, z: 0.3 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'smile', intensity: 0.5 }],
  },
  'welcome': {
    duration: 700,
    handshape: { dominant: 'open-hand' },
    location: { x: 0.2, y: 0.5, z: 0.3, reference: 'chest' },
    movement: { type: 'arc', direction: { x: -0.3, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'smile', intensity: 0.4 }],
  },
  'yes': {
    duration: 500,
    handshape: { dominant: 's-hand' },
    location: { x: 0.2, y: 0.6, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.1, z: 0 }, repetitions: 2, speed: 'fast' },
    nonManualMarkers: [{ type: 'head', expression: 'nod', intensity: 0.7 }],
  },
  'no': {
    duration: 600,
    handshape: { dominant: 'u-hand', nonDominant: undefined },
    location: { x: 0.2, y: 0.6, z: 0.3, reference: 'neutral' },
    movement: { type: 'static', speed: 'fast' },
    nonManualMarkers: [{ type: 'head', expression: 'shake', intensity: 0.6 }],
  },
  'i': {
    duration: 400,
    handshape: { dominant: 'i-hand' },
    location: { x: 0, y: 0.5, z: 0.2, reference: 'chest' },
    movement: { type: 'static', speed: 'normal' },
    nonManualMarkers: [],
  },
  'you': {
    duration: 400,
    handshape: { dominant: 'point' },
    location: { x: 0, y: 0.5, z: 0.4, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: 0.1 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'we': {
    duration: 500,
    handshape: { dominant: 'point' },
    location: { x: -0.1, y: 0.5, z: 0.2, reference: 'chest' },
    movement: { type: 'arc', direction: { x: 0.2, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'today': {
    duration: 600,
    handshape: { dominant: 'y-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.15, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'now': {
    duration: 500,
    handshape: { dominant: 'bent-hand', nonDominant: 'bent-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.1, z: 0 }, speed: 'fast' },
    nonManualMarkers: [],
  },
  'here': {
    duration: 500,
    handshape: { dominant: 'flat-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.3, z: 0.3, reference: 'neutral' },
    movement: { type: 'circular', direction: { x: 0.1, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'good': {
    duration: 600,
    handshape: { dominant: 'flat-hand' },
    location: { x: 0, y: 0.7, z: 0.1, reference: 'face' },
    movement: { type: 'linear', direction: { x: 0, y: -0.2, z: 0.2 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'smile', intensity: 0.5 }],
  },
  'bad': {
    duration: 600,
    handshape: { dominant: 'flat-hand' },
    location: { x: 0, y: 0.7, z: 0.1, reference: 'face' },
    movement: { type: 'linear', direction: { x: 0, y: -0.2, z: 0.2 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'frown', intensity: 0.5 }],
  },
  'please': {
    duration: 700,
    handshape: { dominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.1, reference: 'chest' },
    movement: { type: 'circular', direction: { x: 0, y: 0.1, z: 0 }, speed: 'slow' },
    nonManualMarkers: [{ type: 'facial', expression: 'polite', intensity: 0.4 }],
  },
  'help': {
    duration: 700,
    handshape: { dominant: 'a-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.2, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0.2, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'name': {
    duration: 600,
    handshape: { dominant: 'h-hand', nonDominant: 'h-hand' },
    location: { x: 0, y: 0.5, z: 0.3, reference: 'neutral' },
    movement: { type: 'static', speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'question', intensity: 0.3 }],
  },
  'what': {
    duration: 500,
    handshape: { dominant: 'open-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'zigzag', direction: { x: 0.2, y: 0, z: 0 }, speed: 'fast' },
    nonManualMarkers: [{ type: 'facial', expression: 'question', intensity: 0.7 }],
  },
  'where': {
    duration: 500,
    handshape: { dominant: 'point' },
    location: { x: 0, y: 0.5, z: 0.3, reference: 'neutral' },
    movement: { type: 'zigzag', direction: { x: 0.15, y: 0, z: 0 }, speed: 'fast' },
    nonManualMarkers: [{ type: 'facial', expression: 'question', intensity: 0.6 }],
  },
  'when': {
    duration: 600,
    handshape: { dominant: 'point', nonDominant: 'point' },
    location: { x: 0, y: 0.5, z: 0.3, reference: 'neutral' },
    movement: { type: 'circular', direction: { x: 0.1, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'question', intensity: 0.6 }],
  },
  'why': {
    duration: 600,
    handshape: { dominant: 'open-hand' },
    location: { x: 0.1, y: 0.8, z: 0.1, reference: 'head' },
    movement: { type: 'linear', direction: { x: 0, y: -0.1, z: 0.1 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'question', intensity: 0.7 }],
  },
  'how': {
    duration: 600,
    handshape: { dominant: 'bent-hand', nonDominant: 'bent-hand' },
    location: { x: 0, y: 0.4, z: 0.2, reference: 'neutral' },
    movement: { type: 'arc', direction: { x: 0, y: 0.2, z: 0.1 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'question', intensity: 0.5 }],
  },
  'understand': {
    duration: 600,
    handshape: { dominant: 'point' },
    location: { x: 0.15, y: 0.85, z: 0.1, reference: 'head' },
    movement: { type: 'linear', direction: { x: 0, y: 0.1, z: 0 }, speed: 'fast' },
    nonManualMarkers: [{ type: 'facial', expression: 'realization', intensity: 0.6 }],
  },
  'know': {
    duration: 500,
    handshape: { dominant: 'flat-hand' },
    location: { x: 0.1, y: 0.85, z: 0.1, reference: 'head' },
    movement: { type: 'static', speed: 'normal' },
    nonManualMarkers: [],
  },
  'think': {
    duration: 600,
    handshape: { dominant: 'point' },
    location: { x: 0.1, y: 0.85, z: 0.1, reference: 'head' },
    movement: { type: 'circular', direction: { x: 0.05, y: 0, z: 0 }, speed: 'slow' },
    nonManualMarkers: [{ type: 'facial', expression: 'thoughtful', intensity: 0.5 }],
  },
  'want': {
    duration: 600,
    handshape: { dominant: 'claw-hand', nonDominant: 'claw-hand' },
    location: { x: 0, y: 0.4, z: 0.4, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: -0.2 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'need': {
    duration: 500,
    handshape: { dominant: 'x-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.15, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'like': {
    duration: 600,
    handshape: { dominant: 'open-hand' },
    location: { x: 0, y: 0.45, z: 0.1, reference: 'chest' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: 0.2 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'pleasant', intensity: 0.4 }],
  },
  'love': {
    duration: 700,
    handshape: { dominant: 'fist', nonDominant: 'fist' },
    location: { x: 0, y: 0.45, z: 0.1, reference: 'chest' },
    movement: { type: 'static', speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'affection', intensity: 0.7 }],
  },
  'work': {
    duration: 600,
    handshape: { dominant: 's-hand', nonDominant: 's-hand' },
    location: { x: 0, y: 0.35, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.1, z: 0 }, repetitions: 2, speed: 'normal' },
    nonManualMarkers: [],
  },
  'learn': {
    duration: 700,
    handshape: { dominant: 'claw-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.2, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0.3, z: -0.1 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'teach': {
    duration: 700,
    handshape: { dominant: 'flat-o', nonDominant: 'flat-o' },
    location: { x: 0, y: 0.6, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: 0.2 }, repetitions: 2, speed: 'normal' },
    nonManualMarkers: [],
  },
  'event': {
    duration: 600,
    handshape: { dominant: 'e-hand' },
    location: { x: 0.2, y: 0.5, z: 0.3, reference: 'neutral' },
    movement: { type: 'arc', direction: { x: 0.2, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'meeting': {
    duration: 700,
    handshape: { dominant: 'open-hand', nonDominant: 'open-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: -0.1 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'presentation': {
    duration: 800,
    handshape: { dominant: 'flat-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.5, z: 0.4, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: 0.2 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'question': {
    duration: 600,
    handshape: { dominant: 'x-hand' },
    location: { x: 0, y: 0.5, z: 0.3, reference: 'neutral' },
    movement: { type: 'zigzag', direction: { x: 0, y: -0.2, z: 0 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'question', intensity: 0.6 }],
  },
  'answer': {
    duration: 600,
    handshape: { dominant: 'point', nonDominant: 'point' },
    location: { x: 0, y: 0.6, z: 0.2, reference: 'face' },
    movement: { type: 'linear', direction: { x: 0, y: -0.2, z: 0.2 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'time': {
    duration: 500,
    handshape: { dominant: 'point', nonDominant: 'fist' },
    location: { x: -0.15, y: 0.4, z: 0.2, reference: 'neutral' },
    movement: { type: 'static', speed: 'normal' },
    nonManualMarkers: [],
  },
  'start': {
    duration: 600,
    handshape: { dominant: 'point', nonDominant: 'open-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0.2, y: 0, z: 0 }, speed: 'fast' },
    nonManualMarkers: [],
  },
  'finish': {
    duration: 600,
    handshape: { dominant: 'open-hand', nonDominant: 'open-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.3, z: 0 }, speed: 'fast' },
    nonManualMarkers: [],
  },
  'wait': {
    duration: 700,
    handshape: { dominant: 'open-hand', nonDominant: 'open-hand' },
    location: { x: 0, y: 0.35, z: 0.3, reference: 'neutral' },
    movement: { type: 'zigzag', direction: { x: 0.05, y: 0.05, z: 0 }, speed: 'slow' },
    nonManualMarkers: [{ type: 'facial', expression: 'patient', intensity: 0.4 }],
  },
  'important': {
    duration: 700,
    handshape: { dominant: 'f-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0.2, z: 0 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'serious', intensity: 0.6 }],
  },
  'sign': {
    duration: 600,
    handshape: { dominant: 'point', nonDominant: 'point' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'circular', direction: { x: 0.1, y: 0.1, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'language': {
    duration: 700,
    handshape: { dominant: 'l-hand', nonDominant: 'l-hand' },
    location: { x: 0, y: 0.5, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0.3, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'interpreter': {
    duration: 800,
    handshape: { dominant: 'f-hand', nonDominant: 'f-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'arc', direction: { x: 0, y: 0, z: 0.1 }, speed: 'normal' },
    nonManualMarkers: [],
  },
};

// Common word mappings to ASL glosses
const WORD_TO_GLOSS: Record<string, string> = {
  'hi': 'hello',
  'hey': 'hello',
  'thanks': 'thank-you',
  'ty': 'thank-you',
  'me': 'i',
  'my': 'i',
  'your': 'you',
  'us': 'we',
  'our': 'we',
  'ok': 'yes',
  'okay': 'yes',
  'yeah': 'yes',
  'nope': 'no',
  'nah': 'no',
  'great': 'good',
  'nice': 'good',
  'excellent': 'good',
  'terrible': 'bad',
  'awful': 'bad',
  'assist': 'help',
  'assistance': 'help',
  'comprehend': 'understand',
  'desire': 'want',
  'require': 'need',
  'enjoy': 'like',
  'adore': 'love',
  'job': 'work',
  'study': 'learn',
  'educate': 'teach',
  'conference': 'meeting',
  'inquiry': 'question',
  'response': 'answer',
  'begin': 'start',
  'end': 'finish',
  'done': 'finish',
  'complete': 'finish',
  'hold': 'wait',
  'crucial': 'important',
  'vital': 'important',
  'asl': 'sign language',
};

export class ASLTranslator {
  private config: ASLTranslatorConfig;
  private translationId = 0;

  constructor(config: Partial<ASLTranslatorConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  async translate(text: string): Promise<ASLTranslation> {
    const startTime = Date.now();

    // Normalize and tokenize text
    const words = this.tokenize(text);

    // Convert words to ASL signs
    const signs = this.wordsToSigns(words);

    const translation: ASLTranslation = {
      id: `translation-${this.translationId++}`,
      sourceText: text,
      signs,
      timestamp: startTime,
    };

    return translation;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s'-]/g, '') // Remove punctuation except apostrophes and hyphens
      .split(/\s+/)
      .filter((word) => word.length > 0);
  }

  private wordsToSigns(words: string[]): ASLSign[] {
    const signs: ASLSign[] = [];

    for (const word of words) {
      // Check for direct gloss mapping
      const mappedWord = WORD_TO_GLOSS[word] || word;

      // Look up in glossary
      const signData = ASL_GLOSSARY[mappedWord];

      if (signData) {
        signs.push({
          gloss: mappedWord.toUpperCase(),
          ...signData,
        });
      } else {
        // Fingerspell unknown words
        const fingerspelledSigns = this.fingerspell(word);
        signs.push(...fingerspelledSigns);
      }
    }

    return signs;
  }

  private fingerspell(word: string): ASLSign[] {
    const letters = word.split('');
    return letters.map((letter, index) => ({
      gloss: `FS:${letter.toUpperCase()}`,
      duration: 250, // Faster for fingerspelling
      handshape: { dominant: `letter-${letter}` } as HandShape,
      location: {
        x: 0.25 + index * 0.02, // Slight movement for each letter
        y: 0.5,
        z: 0.35,
        reference: 'neutral' as const,
      },
      movement: { type: 'static' as const, speed: 'fast' as const },
      nonManualMarkers: [] as NonManualMarker[],
    }));
  }

  getGlossary(): string[] {
    return Object.keys(ASL_GLOSSARY);
  }

  hasSign(word: string): boolean {
    const mappedWord = WORD_TO_GLOSS[word.toLowerCase()] || word.toLowerCase();
    return mappedWord in ASL_GLOSSARY;
  }
}

// Singleton instance
let aslTranslatorInstance: ASLTranslator | null = null;

export function getASLTranslator(config?: Partial<ASLTranslatorConfig>): ASLTranslator {
  if (!aslTranslatorInstance) {
    aslTranslatorInstance = new ASLTranslator(config);
  }
  return aslTranslatorInstance;
}
