'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useSignMateStore } from '@/store';
import {
  exportSession,
  exportToJSON,
  exportTranscriptToCSV,
  exportTranslationsToCSV,
  exportToSRT,
  exportToVTT,
  downloadFile,
  getExportFilename,
  ExportOptions,
} from '@/lib/export/dataExporter';
import {
  parseJSONImport,
  parseCSVTranscriptions,
  parseSRTTranscriptions,
  parseVTTTranscriptions,
  readFileAsText,
} from '@/lib/export/dataImporter';

interface ExportImportPanelProps {
  onImportComplete?: () => void;
}

export function ExportImportPanel({ onImportComplete }: ExportImportPanelProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportFormat, setExportFormat] = useState<ExportOptions['format']>('json');
  const [exportType, setExportType] = useState<'session' | 'transcripts' | 'translations'>('session');
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeConfidence, setIncludeConfidence] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'warning' | null; message: string }>({ type: null, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    currentEvent,
    transcriptionSegments,
    translations,
    avatarConfig,
    displayConfigs,
    addTranscriptionSegment,
    clearTranscription,
    setCurrentEvent,
    setAvatarConfig,
  } = useSignMateStore();

  const handleExport = useCallback(() => {
    const options: ExportOptions = {
      format: exportFormat,
      includeTimestamps,
      includeConfidence,
      includeMetadata,
    };

    let content: string;
    let filename: string;
    let mimeType: string;

    try {
      switch (exportType) {
        case 'session':
          const sessionData = exportSession(
            currentEvent,
            transcriptionSegments,
            translations,
            avatarConfig,
            displayConfigs
          );
          content = exportToJSON(sessionData);
          filename = getExportFilename('signmate-session', 'json');
          mimeType = 'application/json';
          break;

        case 'transcripts':
          switch (exportFormat) {
            case 'csv':
              content = exportTranscriptToCSV(transcriptionSegments, options);
              filename = getExportFilename('signmate-transcripts', 'csv');
              mimeType = 'text/csv';
              break;
            case 'srt':
              content = exportToSRT(transcriptionSegments);
              filename = getExportFilename('signmate-transcripts', 'srt');
              mimeType = 'text/srt';
              break;
            case 'vtt':
              content = exportToVTT(transcriptionSegments);
              filename = getExportFilename('signmate-transcripts', 'vtt');
              mimeType = 'text/vtt';
              break;
            default:
              content = JSON.stringify(transcriptionSegments, null, 2);
              filename = getExportFilename('signmate-transcripts', 'json');
              mimeType = 'application/json';
          }
          break;

        case 'translations':
          if (exportFormat === 'csv') {
            content = exportTranslationsToCSV(translations, options);
            filename = getExportFilename('signmate-translations', 'csv');
            mimeType = 'text/csv';
          } else {
            content = JSON.stringify(translations, null, 2);
            filename = getExportFilename('signmate-translations', 'json');
            mimeType = 'application/json';
          }
          break;
      }

      downloadFile(content, filename, mimeType);
      setImportStatus({ type: 'success', message: `Exported ${exportType} successfully` });
    } catch (error) {
      setImportStatus({ type: 'error', message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  }, [exportFormat, exportType, includeTimestamps, includeConfidence, includeMetadata, currentEvent, transcriptionSegments, translations, avatarConfig, displayConfigs]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      const extension = file.name.split('.').pop()?.toLowerCase();

      let result;

      switch (extension) {
        case 'json':
          result = parseJSONImport(content);
          if (result.success && result.data) {
            clearTranscription();
            result.data.transcriptions.forEach(seg => addTranscriptionSegment(seg));
            if (result.data.event) {
              setCurrentEvent(result.data.event);
            }
            if (result.data.avatarConfig) {
              setAvatarConfig(result.data.avatarConfig);
            }
          }
          break;

        case 'csv':
          result = parseCSVTranscriptions(content);
          if (result.success && result.data) {
            clearTranscription();
            result.data.forEach(seg => addTranscriptionSegment(seg));
          }
          break;

        case 'srt':
          result = parseSRTTranscriptions(content);
          if (result.success && result.data) {
            clearTranscription();
            result.data.forEach(seg => addTranscriptionSegment(seg));
          }
          break;

        case 'vtt':
          result = parseVTTTranscriptions(content);
          if (result.success && result.data) {
            clearTranscription();
            result.data.forEach(seg => addTranscriptionSegment(seg));
          }
          break;

        default:
          setImportStatus({ type: 'error', message: 'Unsupported file format' });
          return;
      }

      if (result.success) {
        const warningMsg = result.warnings.length > 0 ? ` (${result.warnings.length} warnings)` : '';
        setImportStatus({ type: 'success', message: `Import successful${warningMsg}` });
        onImportComplete?.();
      } else {
        setImportStatus({ type: 'error', message: result.errors.join(', ') });
      }
    } catch (error) {
      setImportStatus({ type: 'error', message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [clearTranscription, addTranscriptionSegment, setCurrentEvent, setAvatarConfig, onImportComplete]);

  return (
    <div style={{
      backgroundColor: '#1a1a2e',
      borderRadius: '8px',
      padding: '20px',
      color: '#fff',
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Data Export/Import</h3>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('export')}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: activeTab === 'export' ? '#3b82f6' : '#2a2a4e',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: activeTab === 'export' ? 'bold' : 'normal',
          }}
        >
          Export
        </button>
        <button
          onClick={() => setActiveTab('import')}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: activeTab === 'import' ? '#3b82f6' : '#2a2a4e',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: activeTab === 'import' ? 'bold' : 'normal',
          }}
        >
          Import
        </button>
      </div>

      {/* Status Message */}
      {importStatus.type && (
        <div style={{
          padding: '10px',
          marginBottom: '16px',
          borderRadius: '4px',
          backgroundColor: importStatus.type === 'success' ? '#166534' : importStatus.type === 'error' ? '#991b1b' : '#854d0e',
        }}>
          {importStatus.message}
        </div>
      )}

      {activeTab === 'export' ? (
        <div>
          {/* Export Type */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af' }}>Export Type</label>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value as typeof exportType)}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#2a2a4e',
                color: '#fff',
                border: '1px solid #4b5563',
                borderRadius: '4px',
              }}
            >
              <option value="session">Full Session</option>
              <option value="transcripts">Transcripts Only</option>
              <option value="translations">Translations Only</option>
            </select>
          </div>

          {/* Export Format */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af' }}>Format</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as ExportOptions['format'])}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#2a2a4e',
                color: '#fff',
                border: '1px solid #4b5563',
                borderRadius: '4px',
              }}
              disabled={exportType === 'session'}
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              {exportType === 'transcripts' && <option value="srt">SRT (Subtitles)</option>}
              {exportType === 'transcripts' && <option value="vtt">VTT (WebVTT)</option>}
            </select>
          </div>

          {/* Export Options */}
          {exportFormat === 'csv' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={includeTimestamps}
                  onChange={(e) => setIncludeTimestamps(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ color: '#9ca3af' }}>Include Timestamps</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={includeConfidence}
                  onChange={(e) => setIncludeConfidence(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ color: '#9ca3af' }}>Include Confidence Scores</span>
              </label>
            </div>
          )}

          {/* Data Summary */}
          <div style={{
            padding: '12px',
            backgroundColor: '#2a2a4e',
            borderRadius: '4px',
            marginBottom: '16px',
          }}>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>
              <div>Transcription segments: {transcriptionSegments.length}</div>
              <div>Translations: {translations.length}</div>
              {currentEvent && <div>Event: {currentEvent.name}</div>}
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
            disabled={exportType === 'transcripts' && transcriptionSegments.length === 0}
          >
            Export Data
          </button>
        </div>
      ) : (
        <div>
          {/* Import Section */}
          <div style={{
            border: '2px dashed #4b5563',
            borderRadius: '8px',
            padding: '40px 20px',
            textAlign: 'center',
            marginBottom: '16px',
          }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,.srt,.vtt"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="import-file-input"
            />
            <label
              htmlFor="import-file-input"
              style={{
                cursor: 'pointer',
                display: 'block',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📁</div>
              <div style={{ color: '#9ca3af', marginBottom: '8px' }}>
                Click to select a file or drag and drop
              </div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>
                Supported formats: JSON, CSV, SRT, VTT
              </div>
            </label>
          </div>

          {/* Import Info */}
          <div style={{
            padding: '12px',
            backgroundColor: '#2a2a4e',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#9ca3af',
          }}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Import Notes:</div>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>JSON: Full session data with all settings</li>
              <li>CSV: Transcription segments (requires text column)</li>
              <li>SRT/VTT: Subtitle files with timestamps</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
