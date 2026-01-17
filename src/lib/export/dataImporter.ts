// Data Import functionality for SignMate
import type {
  EventConfig,
  TranscriptionSegment,
  ASLTranslation,
  AvatarConfig,
  DisplayConfig,
} from '@/types';
import { SessionExportData } from './dataExporter';

export interface ImportResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
}

export interface ImportedSession {
  event: EventConfig | null;
  transcriptions: TranscriptionSegment[];
  translations: ASLTranslation[];
  avatarConfig: AvatarConfig;
  displayConfigs: DisplayConfig[];
}

export function validateSessionExport(data: unknown): ImportResult<SessionExportData> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    return { success: false, errors: ['Invalid data format'], warnings };
  }

  const obj = data as Record<string, unknown>;

  // Validate version
  if (!obj.version || typeof obj.version !== 'string') {
    errors.push('Missing or invalid version field');
  }

  // Validate transcriptions
  if (!Array.isArray(obj.transcriptions)) {
    errors.push('Missing or invalid transcriptions array');
  } else {
    obj.transcriptions.forEach((segment: unknown, index: number) => {
      const segmentErrors = validateTranscriptionSegment(segment);
      if (segmentErrors.length > 0) {
        errors.push(`Transcription segment ${index}: ${segmentErrors.join(', ')}`);
      }
    });
  }

  // Validate translations
  if (!Array.isArray(obj.translations)) {
    errors.push('Missing or invalid translations array');
  } else {
    obj.translations.forEach((translation: unknown, index: number) => {
      const translationErrors = validateTranslation(translation);
      if (translationErrors.length > 0) {
        errors.push(`Translation ${index}: ${translationErrors.join(', ')}`);
      }
    });
  }

  // Validate avatar config (optional)
  if (obj.avatarConfig && typeof obj.avatarConfig !== 'object') {
    warnings.push('Invalid avatarConfig, will use defaults');
  }

  // Validate display configs (optional)
  if (obj.displayConfigs && !Array.isArray(obj.displayConfigs)) {
    warnings.push('Invalid displayConfigs, will use defaults');
  }

  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }

  return {
    success: true,
    data: data as SessionExportData,
    errors,
    warnings
  };
}

function validateTranscriptionSegment(segment: unknown): string[] {
  const errors: string[] = [];

  if (!segment || typeof segment !== 'object') {
    return ['Invalid segment format'];
  }

  const obj = segment as Record<string, unknown>;

  if (typeof obj.id !== 'string') errors.push('missing id');
  if (typeof obj.text !== 'string') errors.push('missing text');
  if (typeof obj.startTime !== 'number') errors.push('invalid startTime');
  if (typeof obj.endTime !== 'number') errors.push('invalid endTime');
  if (typeof obj.confidence !== 'number') errors.push('invalid confidence');
  if (typeof obj.isFinal !== 'boolean') errors.push('invalid isFinal');

  return errors;
}

function validateTranslation(translation: unknown): string[] {
  const errors: string[] = [];

  if (!translation || typeof translation !== 'object') {
    return ['Invalid translation format'];
  }

  const obj = translation as Record<string, unknown>;

  if (typeof obj.id !== 'string') errors.push('missing id');
  if (typeof obj.sourceText !== 'string') errors.push('missing sourceText');
  if (!Array.isArray(obj.signs)) errors.push('invalid signs array');
  if (typeof obj.timestamp !== 'number') errors.push('invalid timestamp');

  return errors;
}

export function parseJSONImport(jsonString: string): ImportResult<SessionExportData> {
  try {
    const data = JSON.parse(jsonString);
    return validateSessionExport(data);
  } catch (e) {
    return {
      success: false,
      errors: [`JSON parse error: ${e instanceof Error ? e.message : 'Unknown error'}`],
      warnings: []
    };
  }
}

export function parseCSVTranscriptions(csvString: string): ImportResult<TranscriptionSegment[]> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const segments: TranscriptionSegment[] = [];

  const lines = csvString.trim().split('\n');
  if (lines.length < 2) {
    return { success: false, errors: ['CSV must have header and at least one data row'], warnings };
  }

  const headers = parseCSVRow(lines[0]);
  const idIndex = headers.indexOf('id');
  const textIndex = headers.indexOf('text');
  const startTimeIndex = headers.indexOf('startTime');
  const endTimeIndex = headers.indexOf('endTime');
  const confidenceIndex = headers.indexOf('confidence');
  const isFinalIndex = headers.indexOf('isFinal');

  if (textIndex === -1) {
    return { success: false, errors: ['CSV must have a "text" column'], warnings };
  }

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVRow(lines[i]);
    if (row.length === 0) continue;

    const segment: TranscriptionSegment = {
      id: idIndex >= 0 ? row[idIndex] : `imported-${i}`,
      text: row[textIndex] || '',
      startTime: startTimeIndex >= 0 ? parseFloat(row[startTimeIndex]) || 0 : i * 1000,
      endTime: endTimeIndex >= 0 ? parseFloat(row[endTimeIndex]) || 0 : (i + 1) * 1000,
      confidence: confidenceIndex >= 0 ? parseFloat(row[confidenceIndex]) || 1 : 1,
      isFinal: isFinalIndex >= 0 ? row[isFinalIndex] === 'true' : true,
    };

    segments.push(segment);
  }

  return { success: true, data: segments, errors, warnings };
}

export function parseSRTTranscriptions(srtString: string): ImportResult<TranscriptionSegment[]> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const segments: TranscriptionSegment[] = [];

  const blocks = srtString.trim().split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) {
      warnings.push(`Skipping malformed SRT block`);
      continue;
    }

    const timeLine = lines[1];
    const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);

    if (!timeMatch) {
      warnings.push(`Skipping block with invalid timestamp`);
      continue;
    }

    const startTime =
      parseInt(timeMatch[1]) * 3600000 +
      parseInt(timeMatch[2]) * 60000 +
      parseInt(timeMatch[3]) * 1000 +
      parseInt(timeMatch[4]);

    const endTime =
      parseInt(timeMatch[5]) * 3600000 +
      parseInt(timeMatch[6]) * 60000 +
      parseInt(timeMatch[7]) * 1000 +
      parseInt(timeMatch[8]);

    const text = lines.slice(2).join('\n');

    segments.push({
      id: `srt-${segments.length + 1}`,
      text,
      startTime,
      endTime,
      confidence: 1,
      isFinal: true,
    });
  }

  return { success: true, data: segments, errors, warnings };
}

export function parseVTTTranscriptions(vttString: string): ImportResult<TranscriptionSegment[]> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const segments: TranscriptionSegment[] = [];

  // Remove WEBVTT header
  const content = vttString.replace(/^WEBVTT[^\n]*\n/, '').trim();
  const blocks = content.split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) {
      continue;
    }

    // Find the timing line
    let timeLineIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIndex = i;
        break;
      }
    }

    const timeLine = lines[timeLineIndex];
    const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);

    if (!timeMatch) {
      warnings.push(`Skipping block with invalid timestamp`);
      continue;
    }

    const startTime =
      parseInt(timeMatch[1]) * 3600000 +
      parseInt(timeMatch[2]) * 60000 +
      parseInt(timeMatch[3]) * 1000 +
      parseInt(timeMatch[4]);

    const endTime =
      parseInt(timeMatch[5]) * 3600000 +
      parseInt(timeMatch[6]) * 60000 +
      parseInt(timeMatch[7]) * 1000 +
      parseInt(timeMatch[8]);

    const text = lines.slice(timeLineIndex + 1).join('\n');

    segments.push({
      id: `vtt-${segments.length + 1}`,
      text,
      startTime,
      endTime,
      confidence: 1,
      isFinal: true,
    });
  }

  return { success: true, data: segments, errors, warnings };
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];

    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}
