'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSignMateStore } from '@/store';
import { Button } from '@/components/ui/Button';
import { HealthCheckDisplay } from '@/components/health';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { MetricsDashboard } from '@/components/dashboard/MetricsDashboard';
import { KeyboardShortcutsOverlay } from '@/components/ui/KeyboardShortcutsOverlay';
import { useSessionRecording } from '@/hooks/useSessionRecording';
import { getSettings } from '@/lib/config/settings';
import type { HealthReport } from '@/lib/health';

type PanelType = 'none' | 'health' | 'settings' | 'metrics' | 'shortcuts';

interface AppShellProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showStatusBar?: boolean;
  eventName?: string;
  onEndEvent?: () => void;
}

export function AppShell({
  children,
  showHeader = true,
  showStatusBar = true,
  eventName,
  onEndEvent,
}: AppShellProps) {
  const [activePanel, setActivePanel] = useState<PanelType>('none');
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'degraded' | 'unhealthy'>('healthy');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { pipelineStatus, isDemoMode, currentEvent } = useSignMateStore();
  const { isRecording, startRecording, stopRecording } = useSessionRecording();
  const settings = getSettings();

  // Derive isLive from having an active event that's not in demo mode
  const isLive = useMemo(() => !!currentEvent && !isDemoMode, [currentEvent, isDemoMode]);

  // Toggle panel
  const togglePanel = useCallback((panel: PanelType) => {
    setActivePanel((current) => (current === panel ? 'none' : panel));
  }, []);

  // Health check complete handler
  const handleHealthCheckComplete = useCallback((report: HealthReport) => {
    setHealthStatus(report.overall);
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!settings.accessibility.keyboardShortcutsEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Global shortcuts
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        togglePanel('shortcuts');
        return;
      }

      if (e.key === 'Escape') {
        setActivePanel('none');
        return;
      }

      if (e.key === 'h' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        togglePanel('health');
        return;
      }

      if (e.key === 's' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        togglePanel('settings');
        return;
      }

      if (e.key === 'm' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        togglePanel('metrics');
        return;
      }

      if (e.key === 'f' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

      if (e.key === 'r' && !e.metaKey && !e.ctrlKey && (isLive || isDemoMode)) {
        e.preventDefault();
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    settings.accessibility.keyboardShortcutsEnabled,
    togglePanel,
    toggleFullscreen,
    isLive,
    isDemoMode,
    isRecording,
    startRecording,
    stopRecording,
  ]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const getStatusColor = () => {
    if (!isLive && !isDemoMode) return '#6b7280';
    if (healthStatus === 'unhealthy') return '#ef4444';
    if (healthStatus === 'degraded') return '#fbbf24';
    return '#22c55e';
  };

  const getStatusText = () => {
    if (!isLive && !isDemoMode) return 'Ready';
    if (isDemoMode) return 'Demo Mode';
    return 'Live';
  };

  return (
    <div ref={containerRef} className="app-shell">
      <style jsx>{`
        .app-shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #0a0a0a;
          color: #f9fafb;
        }

        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: #111827;
          border-bottom: 1px solid #1f2937;
          z-index: 100;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .logo {
          font-size: 20px;
          font-weight: 800;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .event-name {
          font-size: 14px;
          color: #9ca3af;
          padding-left: 16px;
          border-left: 1px solid #374151;
        }

        .header-center {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 6px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${getStatusColor()};
          animation: ${isLive ? 'pulse 2s infinite' : 'none'};
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .status-text {
          font-size: 13px;
          font-weight: 600;
          color: ${getStatusColor()};
        }

        .latency-badge {
          font-size: 12px;
          color: #9ca3af;
          padding: 4px 8px;
          background: #1f2937;
          border-radius: 4px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .icon-button {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid #374151;
          border-radius: 6px;
          color: #9ca3af;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.15s ease;
        }

        .icon-button:hover {
          background: #1f2937;
          color: #f9fafb;
          border-color: #4b5563;
        }

        .icon-button.active {
          background: #2563eb;
          border-color: #2563eb;
          color: white;
        }

        .icon-button.recording {
          background: #dc2626;
          border-color: #dc2626;
          color: white;
          animation: recording-pulse 1.5s infinite;
        }

        @keyframes recording-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
          50% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
        }

        .app-main {
          flex: 1;
          display: flex;
          position: relative;
          overflow: hidden;
        }

        .content-area {
          flex: 1;
          overflow: auto;
        }

        .side-panel {
          width: 400px;
          background: #111827;
          border-left: 1px solid #1f2937;
          overflow-y: auto;
          animation: slideIn 0.2s ease;
        }

        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #1f2937;
        }

        .panel-title {
          font-size: 16px;
          font-weight: 600;
        }

        .panel-close {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: #6b7280;
          cursor: pointer;
          border-radius: 4px;
          font-size: 18px;
        }

        .panel-close:hover {
          background: #1f2937;
          color: #f9fafb;
        }

        .panel-content {
          padding: 20px;
        }

        .status-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 20px;
          background: #111827;
          border-top: 1px solid #1f2937;
          font-size: 12px;
          color: #6b7280;
        }

        .status-bar-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .status-bar-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .shortcut-hint {
          padding: 2px 6px;
          background: #1f2937;
          border-radius: 3px;
          font-family: monospace;
          font-size: 11px;
        }
      `}</style>

      {showHeader && (
        <header className="app-header">
          <div className="header-left">
            <span className="logo">SignMate</span>
            {eventName && <span className="event-name">{eventName}</span>}
          </div>

          <div className="header-center">
            <div className="status-indicator">
              <div className="status-dot" />
              <span className="status-text">{getStatusText()}</span>
            </div>
            {(isLive || isDemoMode) && pipelineStatus.latency > 0 && (
              <span className="latency-badge">{pipelineStatus.latency.toFixed(0)}ms</span>
            )}
          </div>

          <div className="header-right">
            {(isLive || isDemoMode) && (
              <button
                className={`icon-button ${isRecording ? 'recording' : ''}`}
                onClick={() => (isRecording ? stopRecording() : startRecording())}
                title={isRecording ? 'Stop recording (R)' : 'Start recording (R)'}
              >
                ●
              </button>
            )}

            <button
              className={`icon-button ${activePanel === 'health' ? 'active' : ''}`}
              onClick={() => togglePanel('health')}
              title="Health Check (H)"
            >
              ♥
            </button>

            <button
              className={`icon-button ${activePanel === 'metrics' ? 'active' : ''}`}
              onClick={() => togglePanel('metrics')}
              title="Metrics Dashboard (M)"
            >
              ◔
            </button>

            <button
              className={`icon-button ${activePanel === 'settings' ? 'active' : ''}`}
              onClick={() => togglePanel('settings')}
              title="Settings (S)"
            >
              ⚙
            </button>

            <button
              className={`icon-button ${isFullscreen ? 'active' : ''}`}
              onClick={toggleFullscreen}
              title="Toggle Fullscreen (F)"
            >
              {isFullscreen ? '⊟' : '⊞'}
            </button>

            {onEndEvent && (
              <Button variant="danger" size="small" onClick={onEndEvent}>
                End Event
              </Button>
            )}
          </div>
        </header>
      )}

      <div className="app-main">
        <div className="content-area">{children}</div>

        {activePanel !== 'none' && activePanel !== 'shortcuts' && (
          <div className="side-panel">
            <div className="panel-header">
              <span className="panel-title">
                {activePanel === 'health' && 'System Health'}
                {activePanel === 'settings' && 'Settings'}
                {activePanel === 'metrics' && 'Performance Metrics'}
              </span>
              <button className="panel-close" onClick={() => setActivePanel('none')}>
                ×
              </button>
            </div>
            <div className="panel-content">
              {activePanel === 'health' && (
                <HealthCheckDisplay onComplete={handleHealthCheckComplete} />
              )}
              {activePanel === 'settings' && (
                <SettingsPanel isOpen={true} onClose={() => setActivePanel('none')} />
              )}
              {activePanel === 'metrics' && <MetricsDashboard />}
            </div>
          </div>
        )}
      </div>

      {showStatusBar && (
        <div className="status-bar">
          <div className="status-bar-left">
            <span>SignMate v1.0</span>
            {pipelineStatus.latency > 0 && (
              <span>Latency: {pipelineStatus.latency.toFixed(0)}ms</span>
            )}
          </div>
          <div className="status-bar-right">
            <span>Press</span>
            <span className="shortcut-hint">?</span>
            <span>for keyboard shortcuts</span>
          </div>
        </div>
      )}

      {activePanel === 'shortcuts' && (
        <KeyboardShortcutsOverlay isOpen={true} onClose={() => setActivePanel('none')} />
      )}
    </div>
  );
}
