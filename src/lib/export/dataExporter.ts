// Data Export functionality for SignMate
import type {
  EventConfig,
  TranscriptionSegment,
  ASLTranslation,
  AvatarConfig,
  DisplayConfig,
} from '@/types';

export interface ExportOptions {
  format: 'json' | 'csv' | 'srt' | 'vtt';
  includeTimestamps: boolean;
  includeConfidence: boolean;
  includeMetadata: boolean;
}

export interface SessionExportData {
  version: string;
  exportedAt: string;
  event: EventConfig | null;
  transcriptions: TranscriptionSegment[];
  translations: ASLTranslation[];
  avatarConfig: AvatarConfig;
  displayConfigs: DisplayConfig[];
  metadata: {
    duration: number;
    segmentCount: number;
    translationCount: number;
  };
}

export interface TranscriptExportData {
  segments: TranscriptionSegment[];
  fullText: string;
  metadata: {
    startTime: number;
    endTime: number;
    segmentCount: number;
    averageConfidence: number;
  };
}

export function formatTimestamp(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

export function formatVTTTimestamp(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

export function exportToJSON(data: SessionExportData): string {
  return JSON.stringify(data, null, 2);
}

export function exportTranscriptToCSV(
  segments: TranscriptionSegment[],
  options: ExportOptions
): string {
  const headers = ['id', 'text'];
  if (options.includeTimestamps) {
    headers.push('startTime', 'endTime');
  }
  if (options.includeConfidence) {
    headers.push('confidence');
  }
  headers.push('isFinal');

  const rows = segments.map(segment => {
    const row = [
      escapeCSV(segment.id),
      escapeCSV(segment.text),
    ];
    if (options.includeTimestamps) {
      row.push(segment.startTime.toString(), segment.endTime.toString());
    }
    if (options.includeConfidence) {
      row.push(segment.confidence.toString());
    }
    row.push(segment.isFinal.toString());
    return row.join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function exportTranslationsToCSV(
  translations: ASLTranslation[],
  options: ExportOptions
): string {
  const headers = ['id', 'sourceText', 'signs'];
  if (options.includeTimestamps) {
    headers.push('timestamp');
  }

  const rows = translations.map(translation => {
    const signsStr = translation.signs.map(s => s.gloss).join('; ');
    const row = [
      escapeCSV(translation.id),
      escapeCSV(translation.sourceText),
      escapeCSV(signsStr),
    ];
    if (options.includeTimestamps) {
      row.push(translation.timestamp.toString());
    }
    return row.join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function exportToSRT(segments: TranscriptionSegment[]): string {
  return segments
    .filter(s => s.isFinal)
    .map((segment, index) => {
      const start = formatTimestamp(segment.startTime);
      const end = formatTimestamp(segment.endTime);
      return `${index + 1}\n${start} --> ${end}\n${segment.text}\n`;
    })
    .join('\n');
}

export function exportToVTT(segments: TranscriptionSegment[]): string {
  const header = 'WEBVTT\n\n';
  const cues = segments
    .filter(s => s.isFinal)
    .map((segment) => {
      const start = formatVTTTimestamp(segment.startTime);
      const end = formatVTTTimestamp(segment.endTime);
      return `${start} --> ${end}\n${segment.text}\n`;
    })
    .join('\n');

  return header + cues;
}

export function exportSession(
  event: EventConfig | null,
  transcriptions: TranscriptionSegment[],
  translations: ASLTranslation[],
  avatarConfig: AvatarConfig,
  displayConfigs: DisplayConfig[]
): SessionExportData {
  const startTime = transcriptions.length > 0 ? transcriptions[0].startTime : 0;
  const endTime = transcriptions.length > 0
    ? transcriptions[transcriptions.length - 1].endTime
    : 0;

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    event,
    transcriptions,
    translations,
    avatarConfig,
    displayConfigs,
    metadata: {
      duration: endTime - startTime,
      segmentCount: transcriptions.length,
      translationCount: translations.length,
    },
  };
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getExportFilename(baseName: string, format: ExportOptions['format']): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const extensions: Record<ExportOptions['format'], string> = {
    json: 'json',
    csv: 'csv',
    srt: 'srt',
    vtt: 'vtt',
  };
  return `${baseName}_${timestamp}.${extensions[format]}`;
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
