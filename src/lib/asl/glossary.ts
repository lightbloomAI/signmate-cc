/**
 * ASL Glossary Utilities
 * Provides search, stats, and access to the sign glossary
 */

import type { ASLSign, HandShape, SignLocation, SignMovement, NonManualMarker } from '@/types';

export interface GlossaryEntry extends ASLSign {
  gloss: string;
}

export interface GlossaryStats {
  totalSigns: number;
  uniqueHandshapes: number;
  averageDuration: number;
  movementTypes: number;
}

// Simplified glossary for the UI
// This is a subset of the full glossary in translator.ts
const GLOSSARY_DATA: Record<string, Omit<ASLSign, 'gloss'>> = {
  HELLO: {
    duration: 800,
    handshape: { dominant: 'flat-hand' },
    location: { x: 0.3, y: 0.8, z: 0.2, reference: 'head' },
    movement: { type: 'arc', direction: { x: 0.3, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'smile', intensity: 0.6 }],
  },
  THANK_YOU: {
    duration: 600,
    handshape: { dominant: 'flat-hand' },
    location: { x: 0, y: 0.7, z: 0.1, reference: 'face' },
    movement: { type: 'linear', direction: { x: 0, y: -0.2, z: 0.3 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'smile', intensity: 0.5 }],
  },
  WELCOME: {
    duration: 700,
    handshape: { dominant: 'open-hand' },
    location: { x: 0.2, y: 0.5, z: 0.3, reference: 'chest' },
    movement: { type: 'arc', direction: { x: -0.3, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'smile', intensity: 0.4 }],
  },
  YES: {
    duration: 500,
    handshape: { dominant: 's-hand' },
    location: { x: 0.2, y: 0.6, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.1, z: 0 }, repetitions: 2, speed: 'fast' },
    nonManualMarkers: [{ type: 'head', expression: 'nod', intensity: 0.7 }],
  },
  NO: {
    duration: 600,
    handshape: { dominant: 'u-hand' },
    location: { x: 0.2, y: 0.6, z: 0.3, reference: 'neutral' },
    movement: { type: 'static', speed: 'fast' },
    nonManualMarkers: [{ type: 'head', expression: 'shake', intensity: 0.6 }],
  },
  PLEASE: {
    duration: 700,
    handshape: { dominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.1, reference: 'chest' },
    movement: { type: 'circular', direction: { x: 0, y: 0.1, z: 0 }, speed: 'slow' },
    nonManualMarkers: [{ type: 'facial', expression: 'polite', intensity: 0.4 }],
  },
  HELP: {
    duration: 700,
    handshape: { dominant: 'a-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.2, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0.2, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  WHAT: {
    duration: 500,
    handshape: { dominant: 'open-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'zigzag', direction: { x: 0.2, y: 0, z: 0 }, speed: 'fast' },
    nonManualMarkers: [{ type: 'facial', expression: 'question', intensity: 0.7 }],
  },
  WHERE: {
    duration: 500,
    handshape: { dominant: 'point' },
    location: { x: 0, y: 0.5, z: 0.3, reference: 'neutral' },
    movement: { type: 'zigzag', direction: { x: 0.15, y: 0, z: 0 }, speed: 'fast' },
    nonManualMarkers: [{ type: 'facial', expression: 'question', intensity: 0.6 }],
  },
  WHEN: {
    duration: 600,
    handshape: { dominant: 'point', nonDominant: 'point' },
    location: { x: 0, y: 0.5, z: 0.3, reference: 'neutral' },
    movement: { type: 'circular', direction: { x: 0.1, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'question', intensity: 0.6 }],
  },
  WHY: {
    duration: 600,
    handshape: { dominant: 'open-hand' },
    location: { x: 0.1, y: 0.8, z: 0.1, reference: 'head' },
    movement: { type: 'linear', direction: { x: 0, y: -0.1, z: 0.1 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'question', intensity: 0.7 }],
  },
  HOW: {
    duration: 600,
    handshape: { dominant: 'bent-hand', nonDominant: 'bent-hand' },
    location: { x: 0, y: 0.4, z: 0.2, reference: 'neutral' },
    movement: { type: 'arc', direction: { x: 0, y: 0.2, z: 0.1 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'question', intensity: 0.5 }],
  },
  GOOD: {
    duration: 600,
    handshape: { dominant: 'flat-hand' },
    location: { x: 0, y: 0.7, z: 0.1, reference: 'face' },
    movement: { type: 'linear', direction: { x: 0, y: -0.2, z: 0.2 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'smile', intensity: 0.5 }],
  },
  BAD: {
    duration: 600,
    handshape: { dominant: 'flat-hand' },
    location: { x: 0, y: 0.7, z: 0.1, reference: 'face' },
    movement: { type: 'linear', direction: { x: 0, y: -0.2, z: 0.2 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'frown', intensity: 0.5 }],
  },
  UNDERSTAND: {
    duration: 600,
    handshape: { dominant: 'point' },
    location: { x: 0.15, y: 0.85, z: 0.1, reference: 'head' },
    movement: { type: 'linear', direction: { x: 0, y: 0.1, z: 0 }, speed: 'fast' },
    nonManualMarkers: [{ type: 'facial', expression: 'realization', intensity: 0.6 }],
  },
  KNOW: {
    duration: 500,
    handshape: { dominant: 'flat-hand' },
    location: { x: 0.1, y: 0.85, z: 0.1, reference: 'head' },
    movement: { type: 'static', speed: 'normal' },
    nonManualMarkers: [],
  },
  WANT: {
    duration: 600,
    handshape: { dominant: 'claw-hand', nonDominant: 'claw-hand' },
    location: { x: 0, y: 0.4, z: 0.4, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: -0.2 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  NEED: {
    duration: 500,
    handshape: { dominant: 'x-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.15, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  LIKE: {
    duration: 600,
    handshape: { dominant: 'open-hand' },
    location: { x: 0, y: 0.45, z: 0.1, reference: 'chest' },
    movement: { type: 'linear', direction: { x: 0, y: 0, z: 0.2 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'pleasant', intensity: 0.4 }],
  },
  LOVE: {
    duration: 700,
    handshape: { dominant: 'fist', nonDominant: 'fist' },
    location: { x: 0, y: 0.45, z: 0.1, reference: 'chest' },
    movement: { type: 'static', speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'affection', intensity: 0.7 }],
  },
  HAPPY: {
    duration: 600,
    handshape: { dominant: 'flat-hand' },
    location: { x: 0, y: 0.45, z: 0.1, reference: 'chest' },
    movement: { type: 'circular', direction: { x: 0, y: 0.1, z: 0 }, speed: 'normal' },
    nonManualMarkers: [{ type: 'facial', expression: 'smile', intensity: 0.8 }],
  },
  SAD: {
    duration: 700,
    handshape: { dominant: 'open-hand', nonDominant: 'open-hand' },
    location: { x: 0, y: 0.7, z: 0.15, reference: 'face' },
    movement: { type: 'linear', direction: { x: 0, y: -0.2, z: 0 }, speed: 'slow' },
    nonManualMarkers: [{ type: 'facial', expression: 'sad', intensity: 0.7 }],
  },
  TODAY: {
    duration: 600,
    handshape: { dominant: 'y-hand', nonDominant: 'flat-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.15, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  TOMORROW: {
    duration: 600,
    handshape: { dominant: 'a-hand' },
    location: { x: 0.1, y: 0.75, z: 0.1, reference: 'face' },
    movement: { type: 'arc', direction: { x: 0.15, y: 0, z: 0.1 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  YESTERDAY: {
    duration: 600,
    handshape: { dominant: 'y-hand' },
    location: { x: 0.1, y: 0.75, z: 0.1, reference: 'face' },
    movement: { type: 'arc', direction: { x: -0.1, y: 0, z: 0 }, speed: 'normal' },
    nonManualMarkers: [],
  },
  NOW: {
    duration: 500,
    handshape: { dominant: 'bent-hand', nonDominant: 'bent-hand' },
    location: { x: 0, y: 0.4, z: 0.3, reference: 'neutral' },
    movement: { type: 'linear', direction: { x: 0, y: -0.1, z: 0 }, speed: 'fast' },
    nonManualMarkers: [],
  },
};

/**
 * Get all glossary entries
 */
export function getGlossaryEntries(): GlossaryEntry[] {
  return Object.entries(GLOSSARY_DATA).map(([gloss, data]) => ({
    gloss,
    ...data,
  }));
}

/**
 * Search the glossary by gloss name
 */
export function searchGlossary(query: string): GlossaryEntry[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return getGlossaryEntries();

  return getGlossaryEntries().filter((entry) =>
    entry.gloss.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Get glossary statistics
 */
export function getGlossaryStats(): GlossaryStats {
  const entries = getGlossaryEntries();
  const handshapes = new Set<string>();
  const movementTypes = new Set<string>();
  let totalDuration = 0;

  entries.forEach((entry) => {
    handshapes.add(entry.handshape.dominant);
    if (entry.handshape.nonDominant) {
      handshapes.add(entry.handshape.nonDominant);
    }
    movementTypes.add(entry.movement.type);
    totalDuration += entry.duration;
  });

  return {
    totalSigns: entries.length,
    uniqueHandshapes: handshapes.size,
    averageDuration: Math.round(totalDuration / entries.length),
    movementTypes: movementTypes.size,
  };
}

/**
 * Get a specific sign entry by gloss
 */
export function getSignByGloss(gloss: string): GlossaryEntry | undefined {
  const data = GLOSSARY_DATA[gloss.toUpperCase()];
  if (!data) return undefined;
  return { gloss: gloss.toUpperCase(), ...data };
}
