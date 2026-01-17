import { NextRequest, NextResponse } from 'next/server';
import type { TranscriptionSegment, ASLTranslation } from '@/types';

export interface SessionData {
  id: string;
  startedAt: string;
  endedAt?: string;
  status: 'active' | 'paused' | 'ended';
  transcriptions: TranscriptionSegment[];
  translations: ASLTranslation[];
  stats: {
    totalSegments: number;
    totalTranslations: number;
    averageLatency: number;
    averageConfidence: number;
  };
}

// In-memory session store
const sessions: Map<string, SessionData> = new Map();
let currentSessionId: string | null = null;

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function calculateStats(session: SessionData): SessionData['stats'] {
  const transcriptions = session.transcriptions;
  const translations = session.translations;

  const avgConfidence = transcriptions.length > 0
    ? transcriptions.reduce((sum, t) => sum + t.confidence, 0) / transcriptions.length
    : 0;

  return {
    totalSegments: transcriptions.length,
    totalTranslations: translations.length,
    averageLatency: 150, // Would be calculated from actual measurements
    averageConfidence: avgConfidence,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('id');

  if (sessionId) {
    const session = sessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    return NextResponse.json(session);
  }

  // Return current session or list of sessions
  if (currentSessionId) {
    const currentSession = sessions.get(currentSessionId);
    return NextResponse.json({
      current: currentSession,
      sessions: Array.from(sessions.values()).map(s => ({
        id: s.id,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        status: s.status,
        stats: s.stats,
      })),
    });
  }

  return NextResponse.json({
    current: null,
    sessions: Array.from(sessions.values()).map(s => ({
      id: s.id,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      status: s.status,
      stats: s.stats,
    })),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action as 'start' | 'pause' | 'resume' | 'end' | 'add-transcription' | 'add-translation';

    switch (action) {
      case 'start': {
        // End any existing active session
        if (currentSessionId) {
          const existingSession = sessions.get(currentSessionId);
          if (existingSession && existingSession.status === 'active') {
            existingSession.status = 'ended';
            existingSession.endedAt = new Date().toISOString();
          }
        }

        const newSession: SessionData = {
          id: generateSessionId(),
          startedAt: new Date().toISOString(),
          status: 'active',
          transcriptions: [],
          translations: [],
          stats: {
            totalSegments: 0,
            totalTranslations: 0,
            averageLatency: 0,
            averageConfidence: 0,
          },
        };

        sessions.set(newSession.id, newSession);
        currentSessionId = newSession.id;

        return NextResponse.json({ success: true, session: newSession });
      }

      case 'pause': {
        if (!currentSessionId) {
          return NextResponse.json({ error: 'No active session' }, { status: 400 });
        }
        const session = sessions.get(currentSessionId);
        if (session) {
          session.status = 'paused';
        }
        return NextResponse.json({ success: true, session });
      }

      case 'resume': {
        if (!currentSessionId) {
          return NextResponse.json({ error: 'No active session' }, { status: 400 });
        }
        const session = sessions.get(currentSessionId);
        if (session) {
          session.status = 'active';
        }
        return NextResponse.json({ success: true, session });
      }

      case 'end': {
        if (!currentSessionId) {
          return NextResponse.json({ error: 'No active session' }, { status: 400 });
        }
        const session = sessions.get(currentSessionId);
        if (session) {
          session.status = 'ended';
          session.endedAt = new Date().toISOString();
          session.stats = calculateStats(session);
        }
        const endedSession = session;
        currentSessionId = null;
        return NextResponse.json({ success: true, session: endedSession });
      }

      case 'add-transcription': {
        if (!currentSessionId) {
          return NextResponse.json({ error: 'No active session' }, { status: 400 });
        }
        const session = sessions.get(currentSessionId);
        if (session && body.transcription) {
          session.transcriptions.push(body.transcription);
          session.stats = calculateStats(session);
        }
        return NextResponse.json({ success: true });
      }

      case 'add-translation': {
        if (!currentSessionId) {
          return NextResponse.json({ error: 'No active session' }, { status: 400 });
        }
        const session = sessions.get(currentSessionId);
        if (session && body.translation) {
          session.translations.push(body.translation);
          session.stats = calculateStats(session);
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }

  if (sessions.has(sessionId)) {
    sessions.delete(sessionId);
    if (currentSessionId === sessionId) {
      currentSessionId = null;
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Session not found' }, { status: 404 });
}
