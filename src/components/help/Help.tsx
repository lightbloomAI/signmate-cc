'use client';

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';

// Tooltip Component
interface TooltipProps {
  content: string | React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  children: React.ReactElement;
}

export function Tooltip({
  content,
  position = 'top',
  delay = 200,
  children,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        let x = 0, y = 0;

        switch (position) {
          case 'top':
            x = rect.left + rect.width / 2;
            y = rect.top - 8;
            break;
          case 'bottom':
            x = rect.left + rect.width / 2;
            y = rect.bottom + 8;
            break;
          case 'left':
            x = rect.left - 8;
            y = rect.top + rect.height / 2;
            break;
          case 'right':
            x = rect.right + 8;
            y = rect.top + rect.height / 2;
            break;
        }

        setCoords({ x, y });
        setIsVisible(true);
      }
    }, delay);
  }, [position, delay]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        style={{ display: 'inline-block' }}
      >
        {children}
      </div>
      {isVisible && (
        <TooltipPortal content={content} position={position} coords={coords} />
      )}
    </>
  );
}

interface TooltipPortalProps {
  content: string | React.ReactNode;
  position: 'top' | 'bottom' | 'left' | 'right';
  coords: { x: number; y: number };
}

function TooltipPortal({ content, position, coords }: TooltipPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  const getTransform = () => {
    switch (position) {
      case 'top':
        return 'translate(-50%, -100%)';
      case 'bottom':
        return 'translate(-50%, 0)';
      case 'left':
        return 'translate(-100%, -50%)';
      case 'right':
        return 'translate(0, -50%)';
    }
  };

  return createPortal(
    <div
      className="tooltip"
      style={{
        position: 'fixed',
        left: coords.x,
        top: coords.y,
        transform: getTransform(),
        zIndex: 10002,
      }}
      role="tooltip"
    >
      <style jsx>{`
        .tooltip {
          padding: 8px 12px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 6px;
          font-size: 12px;
          color: #e5e7eb;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          max-width: 250px;
          animation: fadeIn 0.15s ease;
          pointer-events: none;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
      {content}
    </div>,
    document.body
  );
}

// Keyboard Shortcuts
interface KeyboardShortcut {
  id: string;
  keys: string[];
  description: string;
  category?: string;
}

interface KeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[];
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcuts({ shortcuts, isOpen, onClose }: KeyboardShortcutsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  // Group shortcuts by category
  const categories = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return createPortal(
    <div className="shortcuts-overlay" onClick={onClose}>
      <style jsx>{`
        .shortcuts-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .shortcuts-panel {
          width: 100%;
          max-width: 600px;
          max-height: 80vh;
          background: #111827;
          border-radius: 12px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          animation: slideIn 0.2s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .shortcuts-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: #1f2937;
          border-bottom: 1px solid #374151;
        }

        .shortcuts-title {
          font-size: 16px;
          font-weight: 600;
          color: #f9fafb;
          margin: 0;
        }

        .close-button {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: #9ca3af;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .close-button:hover {
          background: #374151;
          color: #f9fafb;
        }

        .shortcuts-body {
          padding: 20px;
          overflow-y: auto;
          max-height: calc(80vh - 65px);
        }

        .category {
          margin-bottom: 24px;
        }

        .category:last-child {
          margin-bottom: 0;
        }

        .category-title {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 12px 0;
        }

        .shortcut-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .shortcut-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: #1f2937;
          border-radius: 8px;
        }

        .shortcut-description {
          font-size: 13px;
          color: #e5e7eb;
        }

        .shortcut-keys {
          display: flex;
          gap: 4px;
        }

        .key {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          padding: 0 6px;
          background: #374151;
          border: 1px solid #4b5563;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          color: #e5e7eb;
        }

        .key-separator {
          display: flex;
          align-items: center;
          font-size: 10px;
          color: #6b7280;
        }
      `}</style>

      <div className="shortcuts-panel" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h2 className="shortcuts-title">Keyboard Shortcuts</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="shortcuts-body">
          {Object.entries(categories).map(([category, items]) => (
            <div key={category} className="category">
              <h3 className="category-title">{category}</h3>
              <div className="shortcut-list">
                {items.map((shortcut) => (
                  <div key={shortcut.id} className="shortcut-item">
                    <span className="shortcut-description">{shortcut.description}</span>
                    <div className="shortcut-keys">
                      {shortcut.keys.map((key, i) => (
                        <span key={i}>
                          {i > 0 && <span className="key-separator">+</span>}
                          <span className="key">{key}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Onboarding Tour
interface TourStep {
  id: string;
  target: string; // CSS selector
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingContextType {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  start: (steps: TourStep[]) => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  complete: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

interface OnboardingProviderProps {
  children: React.ReactNode;
  onComplete?: () => void;
}

export function OnboardingProvider({ children, onComplete }: OnboardingProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>([]);

  const start = useCallback((tourSteps: TourStep[]) => {
    setSteps(tourSteps);
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const next = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      complete();
    }
  }, [currentStep, steps.length]);

  const prev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const skip = useCallback(() => {
    setIsActive(false);
    setSteps([]);
    setCurrentStep(0);
  }, []);

  const complete = useCallback(() => {
    setIsActive(false);
    setSteps([]);
    setCurrentStep(0);
    onComplete?.();
  }, [onComplete]);

  return (
    <OnboardingContext.Provider
      value={{ isActive, currentStep, steps, start, next, prev, skip, complete }}
    >
      {children}
      {isActive && steps.length > 0 && (
        <TourOverlay
          step={steps[currentStep]}
          stepNumber={currentStep + 1}
          totalSteps={steps.length}
          onNext={next}
          onPrev={prev}
          onSkip={skip}
        />
      )}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

interface TourOverlayProps {
  step: TourStep;
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

function TourOverlay({ step, stepNumber, totalSteps, onNext, onPrev, onSkip }: TourOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const target = document.querySelector(step.target);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetRect(rect);

      // Calculate tooltip position
      const position = step.position || 'bottom';
      let x = rect.left + rect.width / 2;
      let y = position === 'top' ? rect.top - 12 : rect.bottom + 12;

      if (position === 'left') {
        x = rect.left - 12;
        y = rect.top + rect.height / 2;
      } else if (position === 'right') {
        x = rect.right + 12;
        y = rect.top + rect.height / 2;
      }

      setTooltipPosition({ x, y });

      // Scroll target into view
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [step]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        onNext();
      } else if (e.key === 'ArrowLeft') {
        onPrev();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onSkip]);

  if (!mounted) return null;

  const getTooltipTransform = () => {
    switch (step.position) {
      case 'top':
        return 'translate(-50%, -100%)';
      case 'left':
        return 'translate(-100%, -50%)';
      case 'right':
        return 'translate(0, -50%)';
      default:
        return 'translate(-50%, 0)';
    }
  };

  return createPortal(
    <div className="tour-overlay">
      <style jsx>{`
        .tour-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          pointer-events: none;
        }

        .tour-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          pointer-events: auto;
        }

        .tour-highlight {
          position: absolute;
          border: 2px solid #2563eb;
          border-radius: 8px;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.3);
          pointer-events: none;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.3);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.1);
          }
        }

        .tour-tooltip {
          position: absolute;
          width: 320px;
          background: #1f2937;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          pointer-events: auto;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .tooltip-content {
          padding: 20px;
        }

        .tooltip-title {
          font-size: 16px;
          font-weight: 600;
          color: #f9fafb;
          margin: 0 0 8px 0;
        }

        .tooltip-text {
          font-size: 14px;
          color: #9ca3af;
          line-height: 1.6;
          margin: 0;
        }

        .tooltip-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background: #111827;
          border-top: 1px solid #374151;
          border-radius: 0 0 12px 12px;
        }

        .step-indicator {
          font-size: 12px;
          color: #6b7280;
        }

        .tooltip-actions {
          display: flex;
          gap: 8px;
        }

        .btn {
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-secondary {
          background: transparent;
          border: 1px solid #374151;
          color: #9ca3af;
        }

        .btn-secondary:hover {
          background: #374151;
          color: #f9fafb;
        }

        .btn-primary {
          background: #2563eb;
          border: none;
          color: white;
        }

        .btn-primary:hover {
          background: #1d4ed8;
        }

        .skip-link {
          position: absolute;
          top: 16px;
          right: 16px;
          padding: 8px 16px;
          font-size: 13px;
          color: #9ca3af;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 6px;
          cursor: pointer;
          pointer-events: auto;
          transition: all 0.2s ease;
        }

        .skip-link:hover {
          background: #374151;
          color: #f9fafb;
        }
      `}</style>

      <div className="tour-backdrop" onClick={onSkip} />

      {targetRect && (
        <div
          className="tour-highlight"
          style={{
            left: targetRect.left - 4,
            top: targetRect.top - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      <div
        className="tour-tooltip"
        style={{
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          transform: getTooltipTransform(),
        }}
      >
        <div className="tooltip-content">
          <h3 className="tooltip-title">{step.title}</h3>
          <p className="tooltip-text">{step.content}</p>
        </div>

        <div className="tooltip-footer">
          <span className="step-indicator">
            Step {stepNumber} of {totalSteps}
          </span>

          <div className="tooltip-actions">
            {stepNumber > 1 && (
              <button className="btn btn-secondary" onClick={onPrev}>
                Back
              </button>
            )}
            <button className="btn btn-primary" onClick={onNext}>
              {stepNumber === totalSteps ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      <button className="skip-link" onClick={onSkip}>
        Skip Tour
      </button>
    </div>,
    document.body
  );
}

// Help Panel
interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category?: string;
}

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  articles: HelpArticle[];
}

export function HelpPanel({ isOpen, onClose, articles }: HelpPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedArticle) {
          setSelectedArticle(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedArticle, onClose]);

  if (!mounted || !isOpen) return null;

  const filteredArticles = articles.filter(
    (article) =>
      article.title.toLowerCase().includes(search.toLowerCase()) ||
      article.content.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category
  const categories = filteredArticles.reduce((acc, article) => {
    const category = article.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(article);
    return acc;
  }, {} as Record<string, HelpArticle[]>);

  return createPortal(
    <div className="help-overlay" onClick={onClose}>
      <style jsx>{`
        .help-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          justify-content: flex-end;
          background: rgba(0, 0, 0, 0.5);
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .help-panel {
          width: 100%;
          max-width: 450px;
          height: 100%;
          background: #111827;
          box-shadow: -10px 0 40px rgba(0, 0, 0, 0.3);
          animation: slideIn 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .help-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: #1f2937;
          border-bottom: 1px solid #374151;
        }

        .help-title {
          font-size: 16px;
          font-weight: 600;
          color: #f9fafb;
          margin: 0;
        }

        .close-button {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: #9ca3af;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .close-button:hover {
          background: #374151;
          color: #f9fafb;
        }

        .help-search {
          padding: 16px 20px;
          border-bottom: 1px solid #374151;
        }

        .search-input {
          width: 100%;
          padding: 10px 14px;
          font-size: 14px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 8px;
          color: #f9fafb;
          outline: none;
          transition: all 0.2s ease;
        }

        .search-input:focus {
          border-color: #2563eb;
        }

        .search-input::placeholder {
          color: #6b7280;
        }

        .help-body {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }

        .category {
          margin-bottom: 24px;
        }

        .category:last-child {
          margin-bottom: 0;
        }

        .category-title {
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 12px 0;
        }

        .article-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .article-item {
          display: block;
          width: 100%;
          padding: 12px 14px;
          background: #1f2937;
          border: none;
          border-radius: 8px;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .article-item:hover {
          background: #374151;
        }

        .article-title {
          font-size: 14px;
          font-weight: 500;
          color: #f9fafb;
          margin: 0 0 4px 0;
        }

        .article-preview {
          font-size: 12px;
          color: #9ca3af;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .article-view {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .article-header {
          padding: 16px 20px;
          border-bottom: 1px solid #374151;
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0;
          background: none;
          border: none;
          font-size: 13px;
          color: #2563eb;
          cursor: pointer;
          margin-bottom: 8px;
        }

        .back-button:hover {
          text-decoration: underline;
        }

        .article-full-title {
          font-size: 20px;
          font-weight: 600;
          color: #f9fafb;
          margin: 0;
        }

        .article-content {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          font-size: 14px;
          color: #d1d5db;
          line-height: 1.7;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
        }
      `}</style>

      <div className="help-panel" onClick={(e) => e.stopPropagation()}>
        {selectedArticle ? (
          <div className="article-view">
            <div className="article-header">
              <button className="back-button" onClick={() => setSelectedArticle(null)}>
                ← Back to Help
              </button>
              <h2 className="article-full-title">{selectedArticle.title}</h2>
            </div>
            <div className="article-content">
              {selectedArticle.content}
            </div>
          </div>
        ) : (
          <>
            <div className="help-header">
              <h2 className="help-title">Help Center</h2>
              <button className="close-button" onClick={onClose} aria-label="Close">
                ×
              </button>
            </div>

            <div className="help-search">
              <input
                type="text"
                className="search-input"
                placeholder="Search help articles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="help-body">
              {Object.keys(categories).length === 0 ? (
                <div className="empty-state">
                  No articles found matching your search.
                </div>
              ) : (
                Object.entries(categories).map(([category, categoryArticles]) => (
                  <div key={category} className="category">
                    <h3 className="category-title">{category}</h3>
                    <div className="article-list">
                      {categoryArticles.map((article) => (
                        <button
                          key={article.id}
                          className="article-item"
                          onClick={() => setSelectedArticle(article)}
                        >
                          <h4 className="article-title">{article.title}</h4>
                          <p className="article-preview">
                            {article.content.substring(0, 80)}...
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

// Default SignMate help articles
export const SIGNMATE_HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with SignMate',
    category: 'Basics',
    content: 'SignMate is a real-time AI sign language interpreter for live events. Connect your audio source, select your target sign language, and SignMate will automatically translate spoken content to sign language using our AI avatar.',
  },
  {
    id: 'audio-setup',
    title: 'Setting Up Audio Input',
    category: 'Basics',
    content: 'To set up audio input, click on the Audio Settings panel and select your input source. You can use a microphone, line-in, or system audio. Make sure the audio levels are showing activity before starting translation.',
  },
  {
    id: 'display-modes',
    title: 'Understanding Display Modes',
    category: 'Display',
    content: 'SignMate offers three display modes: Stage View for live events with a large avatar, Confidence Monitor for speakers to see the translation, and Livestream Overlay for OBS integration with transparent background.',
  },
  {
    id: 'avatar-customization',
    title: 'Customizing the Avatar',
    category: 'Display',
    content: 'You can customize the avatar appearance including skin tone, clothing, signing speed, and position on screen. Access these settings from the Avatar Customization panel in Settings.',
  },
  {
    id: 'latency-optimization',
    title: 'Optimizing for Low Latency',
    category: 'Performance',
    content: 'For real-time events, latency is critical. SignMate is optimized for sub-500ms delay. To achieve the best results, ensure a stable internet connection, use wired audio when possible, and close unnecessary applications.',
  },
  {
    id: 'demo-mode',
    title: 'Using Demo Mode',
    category: 'Testing',
    content: 'Demo Mode allows you to test SignMate without live audio. It plays sample phrases and demonstrates the translation pipeline. This is useful for testing your setup before a live event.',
  },
];

// Default SignMate keyboard shortcuts
export const SIGNMATE_SHORTCUTS: KeyboardShortcut[] = [
  { id: 'start-stop', keys: ['Space'], description: 'Start/Stop translation', category: 'Playback' },
  { id: 'toggle-audio', keys: ['M'], description: 'Toggle audio mute', category: 'Playback' },
  { id: 'demo-mode', keys: ['D'], description: 'Toggle demo mode', category: 'Playback' },
  { id: 'display-mode', keys: ['1', '2', '3'], description: 'Switch display mode', category: 'Display' },
  { id: 'toggle-captions', keys: ['C'], description: 'Toggle captions', category: 'Display' },
  { id: 'fullscreen', keys: ['F'], description: 'Toggle fullscreen', category: 'Display' },
  { id: 'settings', keys: ['Cmd', ','], description: 'Open settings', category: 'Navigation' },
  { id: 'help', keys: ['?'], description: 'Open keyboard shortcuts', category: 'Navigation' },
  { id: 'escape', keys: ['Esc'], description: 'Close dialogs', category: 'Navigation' },
];
