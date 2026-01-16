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
  // Numbers
  'one': {
    duration: 400,
    handshape: { dominant: 'point' },
    location: { x: 0.2, y: 0.5, z: 0.3, reference: 'neutral' },
    movement: { type: 'static', speed: 'normal' },
    nonManualMarkers: [],
  },
  'two': {
    duration: 400,
    handshape: { dominant: 'v-hand' },
    location: { x: 0.2, y: 0.5, z: 0.3, reference: 'neutral' },
    movement: { type: 'static', speed: 'normal' },
    nonManualMarkers: [],
  },
  'three': {
    duration: 400,
    handshape: { dominant: 'three-hand' },
    location: { x: 0.2, y: 0.5, z: 0.3, reference: 'neutral' },
    movement: { type: 'static', speed: 'normal' },
    nonManualMarkers: [],
  },
  'four': {
    duration: 400,
    handshape: { dominant: 'four-hand' },
    location: { x: 0.2, y: 0.5, z: 0.3, reference: 'neutral' },
    movement: { type: 'static', speed: 'normal' },
    nonManualMarkers: [],
  },
  'five': {
    duration: 400,
    handshape: { dominant: 'open-hand' },
    location: { x: 0.2, y: 0.5, z: 0.3, reference: 'neutral' },
    movement: { type: 'static', speed: 'normal' },
    nonManualMarkers: [],
  },
  // People
  'person': {
    duration: 600,
    handshape: { dominant: 'p-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.2, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'people': {
    duration: 700,
    handshape: { dominant: 'p-hand' },
    location: { x: -0.1, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'circular', direction: { x: 0.2, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'man': {
    duration: 600,
    handshape: { dominant: 'open-hand' },
    location: { x: 0, y: 0.8, z: 0.1, reference: 'head' },
    movement: { type: 'linear', direction: { x: 0, y: -0.2, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'woman': {
    duration: 600,
    handshape: { dominant: 'open-hand' },
    location: { x: 0, y: 0.75, z: 0.1, reference: 'face' },
    movement: { type: 'linear', direction: { x: 0, y: -0.15, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'child': {
    duration: 500,
    handshape: { dominant: 'flat-hand' },
    location: { x: 0.2, y: 0.3, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.1, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'friend': {
    duration: 700,
    handshape: { dominant: 'x-hand', nonDominant: 'x-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'arc', direction: { x: 0.1, y: 0.1, z: 0 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'smile', intensity: 0.4 }],
  },
  'family': {
    duration: 700,
    handshape: { dominant: 'f-hand', nonDominant: 'f-hand' },
    location: { x: 0, y: 0.5, z: 0.3, reference: 'neutral' },
    movement: { type: 'circular', direction: { x: 0.15, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  // Common verbs
  'go': {
    duration: 500,
    handshape: { dominant: 'point' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'arc', direction: { x: 0, y: 0, z: 0.3 }, speed: 'fast' },
    nonManualMarkers: [],
  },
  'come': {
    duration: 500,
    handshape: { dominant: 'point' },
    location: { x: 0, y: 0.4, z: 0.5, reference: 'neutral' },
    movement: { type: 'arc', direction: { x: 0, y: 0, z: -0.3 }, speed: 'fast' },
    nonManualMarkers: [],
  },
  'see': {
    duration: 500,
    handshape: { dominant: 'v-hand' },
    location: { x: 0, y: 0.75, z: 0.15, reference: 'face' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: 0.2 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'look': {
    duration: 600,
    handshape: { dominant: 'v-hand' },
    location: { x: 0, y: 0.75, z: 0.15, reference: 'face' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: 0.25 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'hear': {
    duration: 500,
    handshape: { dominant: 'point' },
    location: { x: 0.15, y: 0.75, z: 0.1, reference: 'head' },
    movement: { type: 'static', speed: 'normal' },
    nonManualMarkers: [],
  },
  'say': {
    duration: 500,
    handshape: { dominant: 'point' },
    location: { x: 0, y: 0.65, z: 0.15, reference: 'face' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: 0.15 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'tell': {
    duration: 600,
    handshape: { dominant: 'point' },
    location: { x: 0, y: 0.65, z: 0.15, reference: 'face' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: 0.2 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'ask': {
    duration: 600,
    handshape: { dominant: 'x-hand' },
    location: { x: 0, y: 0.5, z: 0.4, reference: 'neutral' },
    movement: { type: 'arc', direction: { x: 0, y: -0.1, z: 0.1 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'question', intensity: 0.4 }],
  },
  'give': {
    duration: 600,
    handshape: { dominant: 'flat-o', nonDominant: 'flat-o' },
    location: { x: 0, y: 0.4, z: 0.2, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: 0.3 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'take': {
    duration: 600,
    handshape: { dominant: 'claw-hand' },
    location: { x: 0, y: 0.4, z: 0.4, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: -0.2 }, speed: 'fast' },
    nonManualMarkers: [],
  },
  'make': {
    duration: 600,
    handshape: { dominant: 's-hand', nonDominant: 's-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.1, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'get': {
    duration: 500,
    handshape: { dominant: 'claw-hand', nonDominant: 'claw-hand' },
    location: { x: 0, y: 0.4, z: 0.4, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: -0.15 }, speed: 'fast' },
    nonManualMarkers: [],
  },
  'have': {
    duration: 500,
    handshape: { dominant: 'bent-hand' },
    location: { x: 0, y: 0.45, z: 0.15, reference: 'chest' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: -0.1 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'do': {
    duration: 600,
    handshape: { dominant: 'c-hand', nonDominant: 'c-hand' },
    location: { x: 0, y: 0.35, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0.1, y: 0, z: 0 }, repetitions: 2, speed: 'normal' },
    nonManualMarkers: [],
  },
  'can': {
    duration: 500,
    handshape: { dominant: 's-hand', nonDominant: 's-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.15, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'will': {
    duration: 500,
    handshape: { dominant: 'flat-hand' },
    location: { x: 0.1, y: 0.7, z: 0.15, reference: 'face' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: 0.2 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'try': {
    duration: 600,
    handshape: { dominant: 't-hand', nonDominant: 't-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'arc', direction: { x: 0, y: 0, z: 0.2 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'effort', intensity: 0.5 }],
  },
  'use': {
    duration: 600,
    handshape: { dominant: 'u-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'circular', direction: { x: 0.1, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'find': {
    duration: 600,
    handshape: { dominant: 'f-hand' },
    location: { x: 0, y: 0.35, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0.15, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'show': {
    duration: 600,
    handshape: { dominant: 'point', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.2, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: 0.2 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  // Time words
  'tomorrow': {
    duration: 600,
    handshape: { dominant: 'a-hand' },
    location: { x: 0.1, y: 0.75, z: 0.1, reference: 'face' },
    movement: { type: 'arc', direction: { x: 0.15, y: 0, z: 0.1 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'yesterday': {
    duration: 600,
    handshape: { dominant: 'y-hand' },
    location: { x: 0.1, y: 0.75, z: 0.1, reference: 'face' },
    movement: { type: 'arc', direction: { x: -0.1, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'week': {
    duration: 600,
    handshape: { dominant: 'point', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0.2, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'month': {
    duration: 600,
    handshape: { dominant: 'point', nonDominant: 'point' },
    location: { x: 0, y: 0.5, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.2, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'year': {
    duration: 700,
    handshape: { dominant: 's-hand', nonDominant: 's-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'circular', direction: { x: 0, y: 0, z: 0.15 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'before': {
    duration: 600,
    handshape: { dominant: 'flat-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.4, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: -0.15 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'after': {
    duration: 600,
    handshape: { dominant: 'flat-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.25, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: 0.15 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'morning': {
    duration: 600,
    handshape: { dominant: 'flat-hand', nonDominant: 'flat-hand' },
    location: { x: -0.2, y: 0.3, z: 0.2, reference: 'neutral' },
    movement: { type: 'arc', direction: { x: 0.2, y: 0.15, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'afternoon': {
    duration: 600,
    handshape: { dominant: 'flat-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.5, z: 0.3, reference: 'neutral' },
    movement: { type: 'arc', direction: { x: 0.15, y: -0.1, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'evening': {
    duration: 600,
    handshape: { dominant: 'flat-hand', nonDominant: 'flat-hand' },
    location: { x: 0.2, y: 0.5, z: 0.3, reference: 'neutral' },
    movement: { type: 'arc', direction: { x: 0, y: -0.15, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'night': {
    duration: 600,
    handshape: { dominant: 'bent-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.1, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  // Places and things
  'home': {
    duration: 600,
    handshape: { dominant: 'flat-o' },
    location: { x: 0, y: 0.7, z: 0.1, reference: 'face' },
    movement: { type: 'arc', direction: { x: 0.1, y: -0.1, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'school': {
    duration: 600,
    handshape: { dominant: 'flat-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.1, z: 0 }, repetitions: 2, speed: 'normal' },
    nonManualMarkers: [],
  },
  'office': {
    duration: 700,
    handshape: { dominant: 'o-hand', nonDominant: 'o-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0.2, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'room': {
    duration: 700,
    handshape: { dominant: 'flat-hand', nonDominant: 'flat-hand' },
    location: { x: -0.15, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0.3, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'door': {
    duration: 600,
    handshape: { dominant: 'b-hand', nonDominant: 'b-hand' },
    location: { x: 0, y: 0.5, z: 0.3, reference: 'neutral' },
    movement: { type: 'arc', direction: { x: 0.15, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'table': {
    duration: 600,
    handshape: { dominant: 'flat-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.35, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0.2, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'chair': {
    duration: 600,
    handshape: { dominant: 'u-hand', nonDominant: 'u-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.1, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'computer': {
    duration: 700,
    handshape: { dominant: 'c-hand' },
    location: { x: -0.15, y: 0.4, z: 0.2, reference: 'neutral' },
    movement: { type: 'arc', direction: { x: 0.3, y: 0.1, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'phone': {
    duration: 600,
    handshape: { dominant: 'y-hand' },
    location: { x: 0.1, y: 0.7, z: 0.1, reference: 'face' },
    movement: { type: 'static', speed: 'normal' },
    nonManualMarkers: [],
  },
  'book': {
    duration: 600,
    handshape: { dominant: 'flat-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'arc', direction: { x: 0, y: 0, z: 0.1 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'paper': {
    duration: 500,
    handshape: { dominant: 'flat-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0.15, y: 0, z: 0 }, repetitions: 2, speed: 'fast' },
    nonManualMarkers: [],
  },
  // Feelings and states
  'happy': {
    duration: 600,
    handshape: { dominant: 'flat-hand' },
    location: { x: 0, y: 0.45, z: 0.1, reference: 'chest' },
    movement: { type: 'circular', direction: { x: 0, y: 0.1, z: 0 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'smile', intensity: 0.8 }],
  },
  'sad': {
    duration: 700,
    handshape: { dominant: 'open-hand', nonDominant: 'open-hand' },
    location: { x: 0, y: 0.7, z: 0.15, reference: 'face' },
    movement: { type: 'linear', direction: { x: 0, y: -0.2, z: 0 }, speed: 'slow' },
    nonManualMarkers: [{ type: 'facial', expression: 'sad', intensity: 0.7 }],
  },
  'angry': {
    duration: 600,
    handshape: { dominant: 'claw-hand' },
    location: { x: 0, y: 0.7, z: 0.15, reference: 'face' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: 0.1 }, speed: 'fast' },
    nonManualMarkers: [{ type: 'facial', expression: 'angry', intensity: 0.7 }],
  },
  'tired': {
    duration: 700,
    handshape: { dominant: 'bent-hand', nonDominant: 'bent-hand' },
    location: { x: 0, y: 0.45, z: 0.1, reference: 'chest' },
    movement: { type: 'linear', direction: { x: 0, y: -0.1, z: 0 }, speed: 'slow' },
    nonManualMarkers: [{ type: 'facial', expression: 'tired', intensity: 0.6 }],
  },
  'hungry': {
    duration: 600,
    handshape: { dominant: 'c-hand' },
    location: { x: 0, y: 0.45, z: 0.1, reference: 'chest' },
    movement: { type: 'linear', direction: { x: 0, y: -0.15, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'sick': {
    duration: 600,
    handshape: { dominant: 'bent-hand', nonDominant: 'bent-hand' },
    location: { x: 0, y: 0.8, z: 0.1, reference: 'head' },
    movement: { type: 'static', speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'uncomfortable', intensity: 0.5 }],
  },
  'excited': {
    duration: 700,
    handshape: { dominant: 'bent-hand', nonDominant: 'bent-hand' },
    location: { x: 0, y: 0.45, z: 0.15, reference: 'chest' },
    movement: { type: 'circular', direction: { x: 0, y: 0.1, z: 0 }, speed: 'fast' },
    nonManualMarkers: [{ type: 'facial', expression: 'excited', intensity: 0.8 }],
  },
  'nervous': {
    duration: 700,
    handshape: { dominant: 'open-hand', nonDominant: 'open-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'zigzag', direction: { x: 0.05, y: 0, z: 0 }, speed: 'fast' },
    nonManualMarkers: [{ type: 'facial', expression: 'nervous', intensity: 0.6 }],
  },
  'sorry': {
    duration: 700,
    handshape: { dominant: 'a-hand' },
    location: { x: 0, y: 0.45, z: 0.1, reference: 'chest' },
    movement: { type: 'circular', direction: { x: 0, y: 0.1, z: 0 }, speed: 'slow' },
    nonManualMarkers: [{ type: 'facial', expression: 'apologetic', intensity: 0.6 }],
  },
  // Common adjectives
  'big': {
    duration: 600,
    handshape: { dominant: 'l-hand', nonDominant: 'l-hand' },
    location: { x: 0, y: 0.45, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0.3, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'small': {
    duration: 600,
    handshape: { dominant: 'flat-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.45, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: -0.1 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'new': {
    duration: 500,
    handshape: { dominant: 'bent-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'arc', direction: { x: 0.15, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'old': {
    duration: 600,
    handshape: { dominant: 'c-hand' },
    location: { x: 0, y: 0.65, z: 0.15, reference: 'face' },
    movement: { type: 'linear', direction: { x: 0, y: -0.15, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'easy': {
    duration: 600,
    handshape: { dominant: 'bent-hand', nonDominant: 'bent-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0.1, z: 0 }, repetitions: 2, speed: 'normal' },
    nonManualMarkers: [],
  },
  'hard': {
    duration: 600,
    handshape: { dominant: 'bent-hand', nonDominant: 'bent-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.1, z: 0 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'effort', intensity: 0.5 }],
  },
  'fast': {
    duration: 500,
    handshape: { dominant: 'l-hand', nonDominant: 'l-hand' },
    location: { x: 0, y: 0.45, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0.2, y: 0, z: 0 }, speed: 'fast' },
    nonManualMarkers: [],
  },
  'slow': {
    duration: 800,
    handshape: { dominant: 'flat-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.35, z: 0.25, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0.15, y: 0.1, z: 0 }, speed: 'slow' },
    nonManualMarkers: [],
  },
  'right': {
    duration: 500,
    handshape: { dominant: 'r-hand' },
    location: { x: 0.15, y: 0.5, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0.1, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'wrong': {
    duration: 600,
    handshape: { dominant: 'y-hand' },
    location: { x: 0, y: 0.65, z: 0.15, reference: 'face' },
    movement: { type: 'static', speed: 'normal' },
    nonManualMarkers: [{ type: 'head', expression: 'shake', intensity: 0.4 }],
  },
  'same': {
    duration: 600,
    handshape: { dominant: 'y-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0.2, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'different': {
    duration: 600,
    handshape: { dominant: 'point', nonDominant: 'point' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0.25, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  // Accessibility and event terms
  'deaf': {
    duration: 600,
    handshape: { dominant: 'point' },
    location: { x: 0.1, y: 0.75, z: 0.1, reference: 'head' },
    movement: { type: 'arc', direction: { x: 0, y: -0.1, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'hearing': {
    duration: 500,
    handshape: { dominant: 'point' },
    location: { x: 0, y: 0.65, z: 0.15, reference: 'face' },
    movement: { type: 'circular', direction: { x: 0.05, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'access': {
    duration: 600,
    handshape: { dominant: 'a-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: 0.15 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'available': {
    duration: 600,
    handshape: { dominant: 'a-hand', nonDominant: 'a-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: 0.15 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'program': {
    duration: 700,
    handshape: { dominant: 'p-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.15, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'service': {
    duration: 700,
    handshape: { dominant: 'flat-hand', nonDominant: 'flat-hand' },
    location: { x: -0.1, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0.2, y: 0, z: 0 }, repetitions: 2, speed: 'normal' },
    nonManualMarkers: [],
  },
  'support': {
    duration: 600,
    handshape: { dominant: 's-hand', nonDominant: 's-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0.15, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'technology': {
    duration: 700,
    handshape: { dominant: 'bent-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0.15, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'live': {
    duration: 600,
    handshape: { dominant: 'l-hand', nonDominant: 'l-hand' },
    location: { x: 0, y: 0.45, z: 0.15, reference: 'chest' },
    movement: { type: 'linear', direction: { x: 0, y: 0.15, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'real': {
    duration: 500,
    handshape: { dominant: 'point' },
    location: { x: 0, y: 0.65, z: 0.15, reference: 'face' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: 0.15 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'world': {
    duration: 700,
    handshape: { dominant: 'w-hand', nonDominant: 'w-hand' },
    location: { x: 0, y: 0.45, z: 0.3, reference: 'neutral' },
    movement: { type: 'circular', direction: { x: 0.1, y: 0, z: 0.1 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'everyone': {
    duration: 700,
    handshape: { dominant: 'a-hand' },
    location: { x: -0.1, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'arc', direction: { x: 0.2, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'everything': {
    duration: 700,
    handshape: { dominant: 'a-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'circular', direction: { x: 0.15, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  'information': {
    duration: 700,
    handshape: { dominant: 'flat-o', nonDominant: 'flat-o' },
    location: { x: 0, y: 0.8, z: 0.1, reference: 'head' },
    movement: { type: 'linear', direction: { x: 0, y: -0.2, z: 0.2 }, speed: 'normal' },
    nonManualMarkers: [],
  },
};

// Common word mappings to ASL glosses
const WORD_TO_GLOSS: Record<string, string> = {
  // Greetings
  'hi': 'hello',
  'hey': 'hello',
  'greetings': 'hello',
  'thanks': 'thank-you',
  'ty': 'thank-you',
  'thankyou': 'thank-you',
  // Pronouns
  'me': 'i',
  'my': 'i',
  'mine': 'i',
  'myself': 'i',
  'your': 'you',
  'yours': 'you',
  'yourself': 'you',
  'us': 'we',
  'our': 'we',
  'ours': 'we',
  'ourselves': 'we',
  // Affirmatives/Negatives
  'ok': 'yes',
  'okay': 'yes',
  'yeah': 'yes',
  'yep': 'yes',
  'sure': 'yes',
  'correct': 'yes',
  'nope': 'no',
  'nah': 'no',
  'not': 'no',
  // Quality words
  'great': 'good',
  'nice': 'good',
  'excellent': 'good',
  'wonderful': 'good',
  'awesome': 'good',
  'fine': 'good',
  'perfect': 'good',
  'terrible': 'bad',
  'awful': 'bad',
  'horrible': 'bad',
  'poor': 'bad',
  // Help synonyms
  'assist': 'help',
  'assistance': 'help',
  'aid': 'help',
  'support': 'help',
  // Understanding
  'comprehend': 'understand',
  'get': 'understand',
  'realize': 'understand',
  // Desire/Need
  'desire': 'want',
  'wish': 'want',
  'require': 'need',
  'must': 'need',
  // Feelings
  'enjoy': 'like',
  'prefer': 'like',
  'adore': 'love',
  'mad': 'angry',
  'upset': 'angry',
  'joyful': 'happy',
  'glad': 'happy',
  'unhappy': 'sad',
  'depressed': 'sad',
  'exhausted': 'tired',
  'sleepy': 'tired',
  'ill': 'sick',
  'unwell': 'sick',
  'thrilled': 'excited',
  'eager': 'excited',
  'anxious': 'nervous',
  'worried': 'nervous',
  'apologize': 'sorry',
  // Work/Study
  'job': 'work',
  'employment': 'work',
  'study': 'learn',
  'educate': 'teach',
  'instruct': 'teach',
  // Events/Meetings
  'conference': 'meeting',
  'gathering': 'meeting',
  'session': 'meeting',
  'speech': 'presentation',
  // Communication
  'inquiry': 'question',
  'query': 'question',
  'response': 'answer',
  'reply': 'answer',
  'speak': 'say',
  'talk': 'say',
  'inform': 'tell',
  // Time
  'begin': 'start',
  'commence': 'start',
  'end': 'finish',
  'done': 'finish',
  'complete': 'finish',
  'completed': 'finish',
  'over': 'finish',
  'hold': 'wait',
  'pause': 'wait',
  // Importance
  'crucial': 'important',
  'vital': 'important',
  'essential': 'important',
  'significant': 'important',
  // Size/Comparison
  'large': 'big',
  'huge': 'big',
  'giant': 'big',
  'little': 'small',
  'tiny': 'small',
  'quick': 'fast',
  'rapid': 'fast',
  'speedy': 'fast',
  // Correctness
  'accurate': 'right',
  'incorrect': 'wrong',
  'mistaken': 'wrong',
  'similar': 'same',
  'identical': 'same',
  // Movement
  'leave': 'go',
  'depart': 'go',
  'arrive': 'come',
  'approach': 'come',
  'watch': 'see',
  'observe': 'look',
  'listen': 'hear',
  // Actions
  'create': 'make',
  'build': 'make',
  'receive': 'get',
  'obtain': 'get',
  'own': 'have',
  'possess': 'have',
  'attempt': 'try',
  'utilize': 'use',
  'discover': 'find',
  'locate': 'find',
  'display': 'show',
  'demonstrate': 'show',
  // People
  'guy': 'man',
  'male': 'man',
  'lady': 'woman',
  'female': 'woman',
  'kid': 'child',
  'children': 'child',
  'buddy': 'friend',
  'pal': 'friend',
  // Time periods
  'currently': 'now',
  'presently': 'now',
  'daily': 'today',
  // Places
  'house': 'home',
  'residence': 'home',
  'workplace': 'office',
  // Accessibility
  'asl': 'sign language',
  'accessibility': 'access',
  'info': 'information',
  'data': 'information',
  'tech': 'technology',
  'everybody': 'everyone',
  'all': 'everyone',
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
