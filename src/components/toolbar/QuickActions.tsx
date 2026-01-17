'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  shortcut?: string;
  action: () => void;
  enabled?: boolean;
  active?: boolean;
  tooltip?: string;
  group?: string;
}

interface QuickActionsProps {
  actions?: QuickAction[];
  orientation?: 'horizontal' | 'vertical';
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
  showShortcuts?: boolean;
  compact?: boolean;
  onActionExecuted?: (actionId: string) => void;
}

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    id: 'play',
    icon: '▶',
    label: 'Start',
    shortcut: 'Space',
    action: () => {},
    tooltip: 'Start/Resume translation',
    group: 'playback',
  },
  {
    id: 'pause',
    icon: '⏸',
    label: 'Pause',
    shortcut: 'Space',
    action: () => {},
    tooltip: 'Pause translation',
    group: 'playback',
  },
  {
    id: 'stop',
    icon: '⏹',
    label: 'Stop',
    shortcut: 'Escape',
    action: () => {},
    tooltip: 'Stop and reset',
    group: 'playback',
  },
  {
    id: 'fullscreen',
    icon: '⛶',
    label: 'Fullscreen',
    shortcut: 'F',
    action: () => {},
    tooltip: 'Toggle fullscreen mode',
    group: 'display',
  },
  {
    id: 'captions',
    icon: 'CC',
    label: 'Captions',
    shortcut: 'C',
    action: () => {},
    tooltip: 'Toggle captions',
    group: 'display',
  },
  {
    id: 'settings',
    icon: '⚙',
    label: 'Settings',
    shortcut: ',',
    action: () => {},
    tooltip: 'Open settings',
    group: 'config',
  },
];

const SIZE_CONFIG = {
  small: { button: 32, icon: 14, label: 10 },
  medium: { button: 40, icon: 18, label: 12 },
  large: { button: 48, icon: 24, label: 14 },
};

export function QuickActions({
  actions = DEFAULT_ACTIONS,
  orientation = 'horizontal',
  size = 'medium',
  showLabels = false,
  showShortcuts = false,
  compact = false,
  onActionExecuted,
}: QuickActionsProps) {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [recentAction, setRecentAction] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleAction = useCallback(
    (action: QuickAction) => {
      if (action.enabled === false) return;

      action.action();
      setRecentAction(action.id);
      onActionExecuted?.(action.id);

      // Clear recent indicator after animation
      setTimeout(() => setRecentAction(null), 300);
    },
    [onActionExecuted]
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      for (const action of actions) {
        if (action.enabled === false) continue;
        if (!action.shortcut) continue;

        const shortcutKey = action.shortcut.toLowerCase();
        const pressedKey = event.key.toLowerCase();

        if (shortcutKey === pressedKey || shortcutKey === event.code.toLowerCase()) {
          event.preventDefault();
          handleAction(action);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, handleAction]);

  const sizeConfig = SIZE_CONFIG[size];

  // Group actions
  const groupedActions = actions.reduce(
    (acc, action) => {
      const group = action.group || 'default';
      if (!acc[group]) acc[group] = [];
      acc[group].push(action);
      return acc;
    },
    {} as Record<string, QuickAction[]>
  );

  const renderAction = (action: QuickAction) => {
    const isHovered = hoveredAction === action.id;
    const isRecent = recentAction === action.id;
    const isDisabled = action.enabled === false;
    const isActive = action.active === true;

    return (
      <div
        key={action.id}
        className={`action-wrapper ${isHovered ? 'hovered' : ''}`}
        onMouseEnter={() => setHoveredAction(action.id)}
        onMouseLeave={() => setHoveredAction(null)}
      >
        <button
          className={`action-btn ${isDisabled ? 'disabled' : ''} ${isActive ? 'active' : ''} ${isRecent ? 'recent' : ''}`}
          onClick={() => handleAction(action)}
          disabled={isDisabled}
          aria-label={action.label}
          title={action.tooltip || action.label}
          style={{
            width: showLabels ? 'auto' : sizeConfig.button,
            height: sizeConfig.button,
            minWidth: sizeConfig.button,
          }}
        >
          <span className="action-icon" style={{ fontSize: sizeConfig.icon }}>
            {action.icon}
          </span>
          {showLabels && (
            <span className="action-label" style={{ fontSize: sizeConfig.label }}>
              {action.label}
            </span>
          )}
        </button>

        {showShortcuts && action.shortcut && isHovered && (
          <div className="shortcut-hint">{action.shortcut}</div>
        )}
      </div>
    );
  };

  if (compact) {
    return (
      <div className="quick-actions-compact">
        <style jsx>{`
          .quick-actions-compact {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px;
            background: #1f2937;
            border-radius: 8px;
          }
          .compact-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: transparent;
            border: none;
            border-radius: 6px;
            color: #9ca3af;
            cursor: pointer;
            transition: all 0.15s ease;
          }
          .compact-btn:hover {
            background: #374151;
            color: #f9fafb;
          }
          .compact-btn.active {
            background: #2563eb;
            color: #fff;
          }
          .compact-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }
        `}</style>

        {actions.map((action) => (
          <button
            key={action.id}
            className={`compact-btn ${action.active ? 'active' : ''}`}
            onClick={() => handleAction(action)}
            disabled={action.enabled === false}
            title={action.tooltip || action.label}
          >
            {action.icon}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={toolbarRef}
      className={`quick-actions ${orientation}`}
      role="toolbar"
      aria-label="Quick actions"
    >
      <style jsx>{`
        .quick-actions {
          display: flex;
          gap: 4px;
          padding: 8px;
          background: #111827;
          border-radius: 12px;
        }

        .quick-actions.vertical {
          flex-direction: column;
        }

        .action-group {
          display: flex;
          gap: 4px;
        }

        .quick-actions.vertical .action-group {
          flex-direction: column;
        }

        .group-divider {
          width: 1px;
          background: #374151;
          margin: 4px 8px;
        }

        .quick-actions.vertical .group-divider {
          width: auto;
          height: 1px;
          margin: 8px 4px;
        }

        .action-wrapper {
          position: relative;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 12px;
          background: #1f2937;
          border: 1px solid transparent;
          border-radius: 8px;
          color: #9ca3af;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .action-btn:hover:not(.disabled) {
          background: #374151;
          color: #f9fafb;
          border-color: #4b5563;
        }

        .action-btn.active {
          background: #2563eb;
          color: #fff;
          border-color: #3b82f6;
        }

        .action-btn.disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .action-btn.recent {
          animation: pulse 0.3s ease;
        }

        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(0.95);
          }
        }

        .action-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .action-label {
          font-weight: 500;
          white-space: nowrap;
        }

        .shortcut-hint {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          padding: 4px 8px;
          background: #374151;
          border-radius: 4px;
          font-size: 11px;
          color: #e5e7eb;
          white-space: nowrap;
          margin-bottom: 4px;
          z-index: 10;
        }

        .shortcut-hint::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 4px solid transparent;
          border-top-color: #374151;
        }
      `}</style>

      {Object.entries(groupedActions).map(([group, groupActions], index) => (
        <div key={group} style={{ display: 'contents' }}>
          {index > 0 && <div className="group-divider" />}
          <div className="action-group">
            {groupActions.map((action) => renderAction(action))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Floating Action Button variant
interface FloatingActionsProps {
  mainAction: QuickAction;
  subActions?: QuickAction[];
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function FloatingActions({
  mainAction,
  subActions = [],
  position = 'bottom-right',
}: FloatingActionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const positionStyles = {
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'top-right': { top: '20px', right: '20px' },
    'top-left': { top: '20px', left: '20px' },
  };

  return (
    <div className="floating-actions" style={positionStyles[position]}>
      <style jsx>{`
        .floating-actions {
          position: fixed;
          z-index: 1000;
          display: flex;
          flex-direction: column-reverse;
          align-items: center;
          gap: 12px;
        }

        .main-fab {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #2563eb;
          border: none;
          color: #fff;
          font-size: 24px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .main-fab:hover {
          background: #1d4ed8;
          transform: scale(1.05);
        }

        .main-fab.expanded {
          background: #374151;
        }

        .sub-actions {
          display: flex;
          flex-direction: column-reverse;
          gap: 8px;
          opacity: 0;
          transform: translateY(10px);
          pointer-events: none;
          transition: all 0.2s ease;
        }

        .sub-actions.visible {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .sub-fab {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #1f2937;
          border: none;
          color: #e5e7eb;
          font-size: 18px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sub-fab:hover {
          background: #374151;
          transform: scale(1.1);
        }

        .sub-fab-label {
          position: absolute;
          right: 56px;
          padding: 4px 10px;
          background: #374151;
          border-radius: 4px;
          font-size: 12px;
          color: #e5e7eb;
          white-space: nowrap;
        }
      `}</style>

      <button
        className={`main-fab ${isExpanded ? 'expanded' : ''}`}
        onClick={() => {
          if (subActions.length > 0) {
            setIsExpanded(!isExpanded);
          } else {
            mainAction.action();
          }
        }}
        aria-label={mainAction.label}
      >
        {isExpanded ? '×' : mainAction.icon}
      </button>

      {subActions.length > 0 && (
        <div className={`sub-actions ${isExpanded ? 'visible' : ''}`}>
          {subActions.map((action) => (
            <div key={action.id} style={{ position: 'relative' }}>
              <button
                className="sub-fab"
                onClick={() => {
                  action.action();
                  setIsExpanded(false);
                }}
                aria-label={action.label}
              >
                {action.icon}
              </button>
              {isExpanded && (
                <span className="sub-fab-label">{action.label}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Context menu variant
interface ContextMenuProps {
  actions: QuickAction[];
  x: number;
  y: number;
  onClose: () => void;
}

export function ContextMenu({ actions, x, y, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        top: y,
        left: x,
        zIndex: 10000,
      }}
    >
      <style jsx>{`
        .context-menu {
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 8px;
          padding: 4px 0;
          min-width: 180px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          color: #e5e7eb;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.1s ease;
        }

        .menu-item:hover {
          background: #374151;
        }

        .menu-item.disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .menu-item-icon {
          width: 16px;
          text-align: center;
        }

        .menu-item-label {
          flex: 1;
        }

        .menu-item-shortcut {
          font-size: 11px;
          color: #6b7280;
        }

        .menu-divider {
          height: 1px;
          background: #374151;
          margin: 4px 0;
        }
      `}</style>

      {actions.map((action, index) => (
        <div key={action.id}>
          {index > 0 && action.group !== actions[index - 1].group && (
            <div className="menu-divider" />
          )}
          <div
            className={`menu-item ${action.enabled === false ? 'disabled' : ''}`}
            onClick={() => {
              if (action.enabled !== false) {
                action.action();
                onClose();
              }
            }}
          >
            <span className="menu-item-icon">{action.icon}</span>
            <span className="menu-item-label">{action.label}</span>
            {action.shortcut && (
              <span className="menu-item-shortcut">{action.shortcut}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export type { QuickAction };
