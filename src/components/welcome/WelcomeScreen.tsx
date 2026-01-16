'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { HealthCheckDisplay } from '@/components/health';
import type { HealthReport } from '@/lib/health';

interface WelcomeScreenProps {
  onStartSetup: () => void;
  onStartDemo: () => void;
  onSkipToLive?: () => void;
  showHealthCheck?: boolean;
}

type Step = 'welcome' | 'health' | 'ready';

export function WelcomeScreen({
  onStartSetup,
  onStartDemo,
  onSkipToLive,
  showHealthCheck = true,
}: WelcomeScreenProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [animationComplete, setAnimationComplete] = useState(false);

  // Trigger entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setAnimationComplete(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleHealthComplete = useCallback((report: HealthReport) => {
    setHealthReport(report);
    // Auto-advance to ready state if healthy
    if (report.overall === 'healthy') {
      setTimeout(() => setStep('ready'), 500);
    }
  }, []);

  const handleContinue = useCallback(() => {
    if (showHealthCheck && step === 'welcome') {
      setStep('health');
    } else {
      onStartSetup();
    }
  }, [showHealthCheck, step, onStartSetup]);

  const handleProceedAnyway = useCallback(() => {
    setStep('ready');
  }, []);

  return (
    <div className={`welcome-screen ${animationComplete ? 'visible' : ''}`}>
      <style jsx>{`
        .welcome-screen {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%);
          padding: 40px 20px;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.6s ease;
        }

        .welcome-screen.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .logo-section {
          text-align: center;
          margin-bottom: 48px;
        }

        .logo-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 24px;
          margin: 0 auto 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
        }

        .logo-text {
          font-size: 48px;
          font-weight: 800;
          background: linear-gradient(135deg, #667eea 0%, #a78bfa 50%, #f472b6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 12px;
          letter-spacing: -1px;
        }

        .tagline {
          font-size: 20px;
          color: #94a3b8;
          font-weight: 500;
        }

        .content-card {
          background: rgba(30, 41, 59, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 24px;
          padding: 40px;
          max-width: 560px;
          width: 100%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .step-indicator {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 32px;
        }

        .step-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #475569;
          transition: all 0.3s ease;
        }

        .step-dot.active {
          background: #667eea;
          transform: scale(1.25);
        }

        .step-dot.completed {
          background: #22c55e;
        }

        .welcome-title {
          font-size: 28px;
          font-weight: 700;
          color: #f8fafc;
          text-align: center;
          margin-bottom: 16px;
        }

        .welcome-description {
          font-size: 16px;
          color: #94a3b8;
          text-align: center;
          line-height: 1.6;
          margin-bottom: 32px;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background: rgba(15, 23, 42, 0.5);
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.05);
        }

        .feature-icon {
          width: 32px;
          height: 32px;
          background: rgba(102, 126, 234, 0.2);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }

        .feature-text {
          font-size: 14px;
          color: #e2e8f0;
          font-weight: 500;
        }

        .feature-subtext {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
        }

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .primary-action {
          width: 100%;
          padding: 16px 24px;
          font-size: 16px;
          font-weight: 600;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .primary-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
        }

        .primary-action:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .secondary-actions {
          display: flex;
          gap: 12px;
        }

        .secondary-action {
          flex: 1;
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 500;
          background: rgba(100, 116, 139, 0.2);
          color: #e2e8f0;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .secondary-action:hover {
          background: rgba(100, 116, 139, 0.3);
          border-color: rgba(148, 163, 184, 0.3);
        }

        .health-section {
          margin-bottom: 24px;
        }

        .health-status-summary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px;
          background: rgba(15, 23, 42, 0.5);
          border-radius: 12px;
          margin-top: 16px;
        }

        .health-status-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
        }

        .health-status-icon.healthy {
          background: #22c55e;
          color: white;
        }

        .health-status-icon.degraded {
          background: #fbbf24;
          color: #1f2937;
        }

        .health-status-icon.unhealthy {
          background: #ef4444;
          color: white;
        }

        .health-status-text {
          font-size: 15px;
          font-weight: 600;
          color: #e2e8f0;
        }

        .ready-message {
          text-align: center;
          padding: 24px;
          background: rgba(34, 197, 94, 0.1);
          border-radius: 16px;
          border: 1px solid rgba(34, 197, 94, 0.2);
          margin-bottom: 24px;
        }

        .ready-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .ready-title {
          font-size: 24px;
          font-weight: 700;
          color: #22c55e;
          margin-bottom: 8px;
        }

        .ready-subtitle {
          font-size: 14px;
          color: #86efac;
        }

        .version-info {
          text-align: center;
          margin-top: 32px;
          font-size: 12px;
          color: #475569;
        }
      `}</style>

      <div className="logo-section">
        <div className="logo-icon">🤟</div>
        <h1 className="logo-text">SignMate</h1>
        <p className="tagline">Real-time AI Sign Language Interpreter</p>
      </div>

      <div className="content-card">
        {showHealthCheck && (
          <div className="step-indicator">
            <div className={`step-dot ${step === 'welcome' ? 'active' : 'completed'}`} />
            <div className={`step-dot ${step === 'health' ? 'active' : step === 'ready' ? 'completed' : ''}`} />
            <div className={`step-dot ${step === 'ready' ? 'active' : ''}`} />
          </div>
        )}

        {step === 'welcome' && (
          <>
            <h2 className="welcome-title">Welcome to SignMate</h2>
            <p className="welcome-description">
              Provide real-time ASL interpretation for your live events with our AI-powered
              sign language avatar. Perfect for conferences, presentations, and broadcasts.
            </p>

            <div className="features-grid">
              <div className="feature-item">
                <div className="feature-icon">🎤</div>
                <div>
                  <div className="feature-text">Multi-Source Audio</div>
                  <div className="feature-subtext">Mic, AV system, or stream</div>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">⚡</div>
                <div>
                  <div className="feature-text">Low Latency</div>
                  <div className="feature-subtext">Under 500ms end-to-end</div>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🤖</div>
                <div>
                  <div className="feature-text">Expressive Avatar</div>
                  <div className="feature-subtext">Natural signing animation</div>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">📺</div>
                <div>
                  <div className="feature-text">Flexible Display</div>
                  <div className="feature-subtext">Stage, monitor, or overlay</div>
                </div>
              </div>
            </div>

            <div className="action-buttons">
              <button className="primary-action" onClick={handleContinue}>
                {showHealthCheck ? 'Run System Check' : 'Start Event Setup'}
              </button>
              <div className="secondary-actions">
                <button className="secondary-action" onClick={onStartDemo}>
                  Try Demo Mode
                </button>
                {onSkipToLive && (
                  <button className="secondary-action" onClick={onSkipToLive}>
                    Quick Start
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {step === 'health' && (
          <>
            <h2 className="welcome-title">System Check</h2>
            <p className="welcome-description">
              Checking that everything is ready for your event.
            </p>

            <div className="health-section">
              <HealthCheckDisplay onComplete={handleHealthComplete} />

              {healthReport && healthReport.overall !== 'healthy' && (
                <div className="health-status-summary">
                  <div className={`health-status-icon ${healthReport.overall}`}>
                    {healthReport.overall === 'degraded' ? '!' : '×'}
                  </div>
                  <span className="health-status-text">
                    {healthReport.overall === 'degraded'
                      ? 'Some features may be limited'
                      : 'Issues detected - please review'}
                  </span>
                </div>
              )}
            </div>

            <div className="action-buttons">
              {healthReport?.overall === 'healthy' ? (
                <button className="primary-action" onClick={onStartSetup}>
                  Continue to Setup
                </button>
              ) : healthReport ? (
                <>
                  <button className="primary-action" onClick={handleProceedAnyway}>
                    Continue Anyway
                  </button>
                  <div className="secondary-actions">
                    <button
                      className="secondary-action"
                      onClick={() => setStep('welcome')}
                    >
                      Back
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </>
        )}

        {step === 'ready' && (
          <>
            <div className="ready-message">
              <div className="ready-icon">✓</div>
              <h2 className="ready-title">Ready to Go!</h2>
              <p className="ready-subtitle">
                Your system is configured and ready for live interpretation.
              </p>
            </div>

            <div className="action-buttons">
              <button className="primary-action" onClick={onStartSetup}>
                Configure Event
              </button>
              <div className="secondary-actions">
                <button className="secondary-action" onClick={onStartDemo}>
                  Demo Mode
                </button>
                {onSkipToLive && (
                  <button className="secondary-action" onClick={onSkipToLive}>
                    Quick Start
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="version-info">SignMate v1.0 · Powered by AI</div>
    </div>
  );
}
