'use client';

import { useEffect, useRef } from 'react';
import {
  DEFAULT_SHORTCUTS,
  formatKeyCombo,
  trapFocus,
  type KeyboardShortcut,
} from '@/lib/accessibility';

interface KeyboardShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  customShortcuts?: KeyboardShortcut[];
}

export function KeyboardShortcutsOverlay({
  isOpen,
  onClose,
  customShortcuts,
}: KeyboardShortcutsOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const shortcuts = customShortcuts || DEFAULT_SHORTCUTS;

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<string, KeyboardShortcut[]>
  );

  const categoryLabels: Record<string, string> = {
    pipeline: 'Pipeline Controls',
    display: 'Display Controls',
    navigation: 'Navigation',
    emergency: 'Emergency',
  };

  // Handle escape key and focus trap
  useEffect(() => {
    if (!isOpen || !overlayRef.current) return;

    const cleanup = trapFocus(overlayRef.current);

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      cleanup();
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <style jsx>{`
        .shortcuts-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(4px);
        }
        .shortcuts-modal {
          background: #1f2937;
          border-radius: 16px;
          padding: 24px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #374151;
        }
        .modal-title {
          font-size: 20px;
          font-weight: 700;
          color: #f9fafb;
        }
        .close-btn {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          font-size: 24px;
          padding: 4px;
          line-height: 1;
          border-radius: 4px;
        }
        .close-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.1);
        }
        .close-btn:focus {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
        }
        .shortcuts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        @media (max-width: 500px) {
          .shortcuts-grid {
            grid-template-columns: 1fr;
          }
        }
        .category {
          margin-bottom: 8px;
        }
        .category-title {
          font-size: 12px;
          font-weight: 600;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }
        .category.emergency .category-title {
          color: #fca5a5;
        }
        .shortcut-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .shortcut-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .shortcut-description {
          font-size: 13px;
          color: #e5e7eb;
          flex: 1;
        }
        .shortcut-keys {
          display: flex;
          gap: 4px;
        }
        .key {
          background: #374151;
          color: #f9fafb;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-family: monospace;
          font-weight: 600;
          border: 1px solid #4b5563;
          min-width: 28px;
          text-align: center;
        }
        .category.emergency .key {
          background: #7f1d1d;
          border-color: #991b1b;
        }
        .footer {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #374151;
          text-align: center;
          color: #6b7280;
          font-size: 12px;
        }
      `}</style>

      <div
        ref={overlayRef}
        className="shortcuts-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <div className="modal-header">
          <h2 id="shortcuts-title" className="modal-title">
            Keyboard Shortcuts
          </h2>
          <button
            className="close-btn"
            onClick={onClose}
            aria-label="Close shortcuts"
          >
            ×
          </button>
        </div>

        <div className="shortcuts-grid">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className={`category ${category}`}>
              <h3 className="category-title">{categoryLabels[category] || category}</h3>
              <div className="shortcut-list">
                {categoryShortcuts
                  .filter((s) => s.enabled)
                  .map((shortcut) => (
                    <div key={shortcut.id} className="shortcut-item">
                      <span className="shortcut-description">{shortcut.description}</span>
                      <div className="shortcut-keys">
                        {shortcut.keys.map((key, i) => (
                          <span key={i} className="key">
                            {formatKeyCombo([key])}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="footer">
          Press <span className="key" style={{ display: 'inline-block' }}>?</span> anytime to show this overlay
        </div>
      </div>
    </div>
  );
}
