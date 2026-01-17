/**
 * Sign Dictionary
 *
 * A comprehensive dictionary of ASL signs with metadata,
 * descriptions, and usage information.
 */

import type { HandShape, SignLocation, SignMovement } from '@/types';

// Sign categories
export type SignCategory =
  | 'alphabet'
  | 'numbers'
  | 'common'
  | 'greetings'
  | 'pronouns'
  | 'questions'
  | 'time'
  | 'colors'
  | 'family'
  | 'food'
  | 'animals'
  | 'emotions'
  | 'actions'
  | 'descriptors'
  | 'locations'
  | 'technology'
  | 'academic'
  | 'medical'
  | 'legal';

// Difficulty levels
export type SignDifficulty = 'beginner' | 'intermediate' | 'advanced';

// Sign entry in the dictionary
export interface SignEntry {
  id: string;
  gloss: string;
  englishWord: string;
  englishAliases: string[];
  definition: string;
  example: string;
  category: SignCategory;
  subcategory?: string;
  difficulty: SignDifficulty;

  // Visual representation
  handshape: HandShape;
  location: SignLocation;
  movement: SignMovement;
  twoHanded: boolean;
  symmetrical?: boolean;

  // Additional info
  notes?: string;
  regionalVariants?: string[];
  relatedSigns?: string[];
  antonyms?: string[];

  // Usage
  frequency: 'common' | 'moderate' | 'rare';
  registerFormal?: boolean;
  contextHints?: string[];

  // Multimedia
  videoUrl?: string;
  imageUrl?: string;
  animationData?: unknown;
}

// Dictionary search options
export interface SignSearchOptions {
  query?: string;
  category?: SignCategory;
  difficulty?: SignDifficulty;
  twoHandedOnly?: boolean;
  includeAliases?: boolean;
  limit?: number;
  offset?: number;
}

// Search result
export interface SignSearchResult {
  entries: SignEntry[];
  total: number;
  query: string;
  suggestions?: string[];
}

// Base dictionary with common ASL signs
const BASE_DICTIONARY: SignEntry[] = [
  // Greetings
  {
    id: 'hello',
    gloss: 'HELLO',
    englishWord: 'hello',
    englishAliases: ['hi', 'hey', 'greetings'],
    definition: 'A greeting used to acknowledge someone.',
    example: 'HELLO MY NAME WHAT?',
    category: 'greetings',
    difficulty: 'beginner',
    handshape: { dominant: 'flat-hand' },
    location: { x: 0.3, y: 0.8, z: 0.3, reference: 'head' },
    movement: { type: 'arc', direction: { x: 0.5, y: 0, z: 0.3 }, speed: 'normal' },
    twoHanded: false,
    frequency: 'common',
    notes: 'Wave outward from forehead',
    relatedSigns: ['goodbye', 'welcome'],
  },
  {
    id: 'goodbye',
    gloss: 'GOODBYE',
    englishWord: 'goodbye',
    englishAliases: ['bye', 'see you', 'farewell'],
    definition: 'A farewell expression.',
    example: 'GOODBYE SEE YOU TOMORROW',
    category: 'greetings',
    difficulty: 'beginner',
    handshape: { dominant: 'open-hand' },
    location: { x: 0, y: 0.5, z: 0.5, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0.3, z: 0 }, repetitions: 2, speed: 'normal' },
    twoHanded: false,
    frequency: 'common',
    relatedSigns: ['hello', 'later'],
  },
  {
    id: 'thank-you',
    gloss: 'THANK-YOU',
    englishWord: 'thank you',
    englishAliases: ['thanks', 'grateful'],
    definition: 'Expression of gratitude.',
    example: 'THANK-YOU FOR HELP',
    category: 'greetings',
    difficulty: 'beginner',
    handshape: { dominant: 'flat-hand' },
    location: { x: 0, y: 0.5, z: 0.3, reference: 'face' },
    movement: { type: 'arc', direction: { x: 0, y: -0.3, z: 0.5 }, speed: 'normal' },
    twoHanded: false,
    frequency: 'common',
  },

  // Pronouns
  {
    id: 'i-me',
    gloss: 'I/ME',
    englishWord: 'I',
    englishAliases: ['me', 'myself'],
    definition: 'First person singular pronoun.',
    example: 'I WANT COFFEE',
    category: 'pronouns',
    difficulty: 'beginner',
    handshape: { dominant: 'point' },
    location: { x: 0, y: 0, z: 0.2, reference: 'chest' },
    movement: { type: 'static', speed: 'normal' },
    twoHanded: false,
    frequency: 'common',
    relatedSigns: ['you', 'we', 'they'],
  },
  {
    id: 'you',
    gloss: 'YOU',
    englishWord: 'you',
    englishAliases: ['yourself'],
    definition: 'Second person pronoun.',
    example: 'YOU UNDERSTAND?',
    category: 'pronouns',
    difficulty: 'beginner',
    handshape: { dominant: 'point' },
    location: { x: 0, y: 0, z: 0.5, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: 0.3 }, speed: 'normal' },
    twoHanded: false,
    frequency: 'common',
    relatedSigns: ['i-me', 'we', 'they'],
  },

  // Questions
  {
    id: 'what',
    gloss: 'WHAT',
    englishWord: 'what',
    englishAliases: [],
    definition: 'Question word asking for information.',
    example: 'WHAT YOUR NAME?',
    category: 'questions',
    difficulty: 'beginner',
    handshape: { dominant: 'open-hand', nonDominant: 'open-hand' },
    location: { x: 0, y: 0, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0.5, y: 0, z: 0 }, speed: 'normal' },
    twoHanded: true,
    symmetrical: true,
    frequency: 'common',
    notes: 'Palms up, shake hands slightly side to side',
    relatedSigns: ['who', 'where', 'when', 'why', 'how'],
  },
  {
    id: 'where',
    gloss: 'WHERE',
    englishWord: 'where',
    englishAliases: [],
    definition: 'Question word asking for location.',
    example: 'WHERE BATHROOM?',
    category: 'questions',
    difficulty: 'beginner',
    handshape: { dominant: 'point' },
    location: { x: 0, y: 0.3, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0.3, y: 0, z: 0 }, repetitions: 2, speed: 'fast' },
    twoHanded: false,
    frequency: 'common',
    notes: 'Index finger wags side to side',
    relatedSigns: ['what', 'who', 'when', 'why', 'how'],
  },

  // Common words
  {
    id: 'yes',
    gloss: 'YES',
    englishWord: 'yes',
    englishAliases: ['yeah', 'correct', 'right'],
    definition: 'Affirmative response.',
    example: 'YES I UNDERSTAND',
    category: 'common',
    difficulty: 'beginner',
    handshape: { dominant: 's-hand' },
    location: { x: 0, y: 0.3, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.2, z: 0 }, repetitions: 2, speed: 'normal' },
    twoHanded: false,
    frequency: 'common',
    notes: 'S-hand nods like a nodding head',
    relatedSigns: ['no', 'maybe'],
  },
  {
    id: 'no',
    gloss: 'NO',
    englishWord: 'no',
    englishAliases: ['not', 'nope'],
    definition: 'Negative response.',
    example: 'NO THANK-YOU',
    category: 'common',
    difficulty: 'beginner',
    handshape: { dominant: 'u-hand' },
    location: { x: 0, y: 0.3, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: -0.1 }, speed: 'fast' },
    twoHanded: false,
    frequency: 'common',
    notes: 'Index and middle finger snap together with thumb',
    relatedSigns: ['yes', 'maybe', 'not'],
  },
  {
    id: 'please',
    gloss: 'PLEASE',
    englishWord: 'please',
    englishAliases: [],
    definition: 'Polite request modifier.',
    example: 'HELP PLEASE',
    category: 'common',
    difficulty: 'beginner',
    handshape: { dominant: 'flat-hand' },
    location: { x: 0, y: 0, z: 0.1, reference: 'chest' },
    movement: { type: 'circular', speed: 'slow' },
    twoHanded: false,
    frequency: 'common',
    notes: 'Flat hand circles on chest',
  },

  // Time
  {
    id: 'now',
    gloss: 'NOW',
    englishWord: 'now',
    englishAliases: ['today', 'current'],
    definition: 'Present time.',
    example: 'NOW WE START',
    category: 'time',
    difficulty: 'beginner',
    handshape: { dominant: 'bent-hand', nonDominant: 'bent-hand' },
    location: { x: 0, y: 0, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.2, z: 0 }, speed: 'normal' },
    twoHanded: true,
    symmetrical: true,
    frequency: 'common',
    relatedSigns: ['later', 'before', 'after'],
  },

  // Actions
  {
    id: 'help',
    gloss: 'HELP',
    englishWord: 'help',
    englishAliases: ['assist', 'aid'],
    definition: 'To give assistance.',
    example: 'I HELP YOU',
    category: 'actions',
    difficulty: 'beginner',
    handshape: { dominant: 'a-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0.3, z: 0 }, speed: 'normal' },
    twoHanded: true,
    frequency: 'common',
    notes: 'A-hand on flat palm, lift up together',
  },
  {
    id: 'understand',
    gloss: 'UNDERSTAND',
    englishWord: 'understand',
    englishAliases: ['comprehend', 'get it'],
    definition: 'To comprehend or grasp.',
    example: 'I UNDERSTAND NOW',
    category: 'actions',
    difficulty: 'beginner',
    handshape: { dominant: 'point' },
    location: { x: 0.2, y: 0.7, z: 0.3, reference: 'head' },
    movement: { type: 'linear', direction: { x: 0, y: 0.2, z: 0 }, speed: 'normal' },
    twoHanded: false,
    frequency: 'common',
    notes: 'Finger flicks up near forehead',
    relatedSigns: ['know', 'learn', 'think'],
  },

  // Descriptors
  {
    id: 'good',
    gloss: 'GOOD',
    englishWord: 'good',
    englishAliases: ['great', 'fine', 'well'],
    definition: 'Positive quality.',
    example: 'YOU GOOD?',
    category: 'descriptors',
    difficulty: 'beginner',
    handshape: { dominant: 'flat-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'face' },
    movement: { type: 'arc', direction: { x: 0, y: -0.3, z: 0.3 }, speed: 'normal' },
    twoHanded: true,
    frequency: 'common',
    notes: 'Dominant hand moves from chin to rest on non-dominant palm',
    relatedSigns: ['bad', 'better', 'best'],
    antonyms: ['bad'],
  },
  {
    id: 'bad',
    gloss: 'BAD',
    englishWord: 'bad',
    englishAliases: ['terrible', 'awful'],
    definition: 'Negative quality.',
    example: 'WEATHER BAD TODAY',
    category: 'descriptors',
    difficulty: 'beginner',
    handshape: { dominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'face' },
    movement: { type: 'arc', direction: { x: 0, y: -0.3, z: 0.3 }, speed: 'normal' },
    twoHanded: false,
    frequency: 'common',
    notes: 'Flat hand from chin moves down with palm turning down',
    relatedSigns: ['good', 'worse', 'worst'],
    antonyms: ['good'],
  },
];

// Sign Dictionary class
export class SignDictionary {
  private entries: Map<string, SignEntry> = new Map();
  private glossIndex: Map<string, string> = new Map();
  private wordIndex: Map<string, string[]> = new Map();
  private categoryIndex: Map<SignCategory, string[]> = new Map();

  constructor() {
    this.loadBaseDictionary();
  }

  private loadBaseDictionary(): void {
    BASE_DICTIONARY.forEach(entry => {
      this.addEntry(entry);
    });
  }

  addEntry(entry: SignEntry): void {
    this.entries.set(entry.id, entry);

    // Index by gloss
    this.glossIndex.set(entry.gloss.toLowerCase(), entry.id);

    // Index by English word and aliases
    const words = [entry.englishWord.toLowerCase(), ...entry.englishAliases.map(a => a.toLowerCase())];
    words.forEach(word => {
      const existing = this.wordIndex.get(word) || [];
      if (!existing.includes(entry.id)) {
        existing.push(entry.id);
        this.wordIndex.set(word, existing);
      }
    });

    // Index by category
    const categoryEntries = this.categoryIndex.get(entry.category) || [];
    if (!categoryEntries.includes(entry.id)) {
      categoryEntries.push(entry.id);
      this.categoryIndex.set(entry.category, categoryEntries);
    }
  }

  getEntry(id: string): SignEntry | undefined {
    return this.entries.get(id);
  }

  getByGloss(gloss: string): SignEntry | undefined {
    const id = this.glossIndex.get(gloss.toLowerCase());
    return id ? this.entries.get(id) : undefined;
  }

  getByWord(word: string): SignEntry[] {
    const ids = this.wordIndex.get(word.toLowerCase()) || [];
    return ids.map(id => this.entries.get(id)!).filter(Boolean);
  }

  getByCategory(category: SignCategory): SignEntry[] {
    const ids = this.categoryIndex.get(category) || [];
    return ids.map(id => this.entries.get(id)!).filter(Boolean);
  }

  search(options: SignSearchOptions): SignSearchResult {
    let results: SignEntry[] = Array.from(this.entries.values());
    const query = options.query?.toLowerCase() || '';

    // Filter by query
    if (query) {
      results = results.filter(entry => {
        const matchesGloss = entry.gloss.toLowerCase().includes(query);
        const matchesWord = entry.englishWord.toLowerCase().includes(query);
        const matchesAliases = options.includeAliases !== false &&
          entry.englishAliases.some(a => a.toLowerCase().includes(query));
        const matchesDefinition = entry.definition.toLowerCase().includes(query);
        return matchesGloss || matchesWord || matchesAliases || matchesDefinition;
      });
    }

    // Filter by category
    if (options.category) {
      results = results.filter(entry => entry.category === options.category);
    }

    // Filter by difficulty
    if (options.difficulty) {
      results = results.filter(entry => entry.difficulty === options.difficulty);
    }

    // Filter by two-handed
    if (options.twoHandedOnly) {
      results = results.filter(entry => entry.twoHanded);
    }

    // Sort by relevance (exact matches first)
    if (query) {
      results.sort((a, b) => {
        const aExact = a.englishWord.toLowerCase() === query || a.gloss.toLowerCase() === query;
        const bExact = b.englishWord.toLowerCase() === query || b.gloss.toLowerCase() === query;
        if (aExact && !bExact) return -1;
        if (bExact && !aExact) return 1;
        return a.englishWord.localeCompare(b.englishWord);
      });
    }

    const total = results.length;

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    results = results.slice(offset, offset + limit);

    // Generate suggestions for no results
    const suggestions = total === 0 && query ? this.generateSuggestions(query) : undefined;

    return {
      entries: results,
      total,
      query: options.query || '',
      suggestions,
    };
  }

  private generateSuggestions(query: string): string[] {
    // Simple suggestion based on partial matches
    const suggestions: string[] = [];
    const lowerQuery = query.toLowerCase();

    this.entries.forEach(entry => {
      if (entry.englishWord.toLowerCase().startsWith(lowerQuery[0])) {
        suggestions.push(entry.englishWord);
      }
    });

    return suggestions.slice(0, 5);
  }

  getCategories(): SignCategory[] {
    return Array.from(this.categoryIndex.keys());
  }

  getEntryCount(): number {
    return this.entries.size;
  }

  getAllEntries(): SignEntry[] {
    return Array.from(this.entries.values());
  }
}

// Singleton instance
let dictionaryInstance: SignDictionary | null = null;

export function getSignDictionary(): SignDictionary {
  if (!dictionaryInstance) {
    dictionaryInstance = new SignDictionary();
  }
  return dictionaryInstance;
}
