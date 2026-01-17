import { NextRequest, NextResponse } from 'next/server';
import type { EventConfig, AvatarConfig, DisplayConfig } from '@/types';

export interface AppConfig {
  event: EventConfig | null;
  avatar: AvatarConfig;
  displays: DisplayConfig[];
  settings: {
    autoStartPipeline: boolean;
    showConfidenceScores: boolean;
    captionDelay: number;
    maxQueueSize: number;
  };
}

// In-memory store (would be replaced with proper persistence)
let currentConfig: AppConfig = {
  event: null,
  avatar: {
    style: 'stylized',
    skinTone: '#E0B0A0',
    clothingColor: '#2563EB',
    showHands: true,
    showFace: true,
    showUpperBody: true,
  },
  displays: [],
  settings: {
    autoStartPipeline: false,
    showConfidenceScores: true,
    captionDelay: 0,
    maxQueueSize: 50,
  },
};

export async function GET() {
  return NextResponse.json(currentConfig);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.event !== undefined) {
      currentConfig.event = body.event;
    }
    if (body.avatar !== undefined) {
      currentConfig.avatar = { ...currentConfig.avatar, ...body.avatar };
    }
    if (body.displays !== undefined) {
      currentConfig.displays = body.displays;
    }
    if (body.settings !== undefined) {
      currentConfig.settings = { ...currentConfig.settings, ...body.settings };
    }

    return NextResponse.json({ success: true, config: currentConfig });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    currentConfig = {
      ...currentConfig,
      ...body,
      avatar: body.avatar ? { ...currentConfig.avatar, ...body.avatar } : currentConfig.avatar,
      settings: body.settings ? { ...currentConfig.settings, ...body.settings } : currentConfig.settings,
    };

    return NextResponse.json({ success: true, config: currentConfig });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
