'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';

interface HelpTopic {
  id: string;
  title: string;
  category: string;
  content: string;
  keywords: string[];
}

interface HelpPanelProps {
  onClose?: () => void;
  compact?: boolean;
  initialTopic?: string;
}

const HELP_TOPICS: HelpTopic[] = [
  // Getting Started
  {
    id: 'getting-started',
    title: 'Getting Started',
    category: 'Basics',
    keywords: ['start', 'begin', 'introduction', 'first', 'setup'],
    content: `
# Getting Started with SignMate

SignMate is a real-time sign language interpretation system for live events. Here's how to get started:

## 1. Configure Your Event
- Click "New Event" to set up your interpretation session
- Enter event name, venue, and expected duration
- Select your audio source (microphone or audio feed)

## 2. Start Interpretation
- Press **Space** or click "Start" to begin
- The system will listen for speech and display signs in real-time
- Monitor the latency indicator to ensure smooth operation

## 3. Monitor Performance
- Watch the status bar for real-time metrics
- Green indicators mean everything is working well
- Yellow or red indicators may require attention
    `.trim(),
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    category: 'Controls',
    keywords: ['keyboard', 'shortcuts', 'keys', 'hotkeys', 'controls'],
    content: `
# Keyboard Shortcuts

Master these shortcuts for efficient operation:

## Pipeline Controls
- **Space** - Start/Stop interpretation
- **P** - Pause/Resume avatar animation
- **C** - Clear sign queue

## Display Controls
- **T** - Toggle captions
- **F** - Toggle fullscreen
- **←/→** - Switch display modes

## Navigation
- **?** - Show this help panel
- **G** - Open glossary
- **Ctrl+,** - Open settings

## Emergency
- **Esc** - Emergency stop (stops all interpretation)
    `.trim(),
  },
  {
    id: 'audio-setup',
    title: 'Audio Configuration',
    category: 'Setup',
    keywords: ['audio', 'microphone', 'sound', 'input', 'feed'],
    content: `
# Audio Configuration

Proper audio setup is crucial for accurate interpretation.

## Microphone Input
- Select your microphone from the audio source dropdown
- Ensure the microphone has clear line-of-sight to speakers
- Avoid placing near speakers to prevent feedback

## Audio Feed Input
- Connect directly to the venue's audio system when possible
- Use a direct line feed for best results
- Adjust input levels to avoid clipping (stay in the green)

## Troubleshooting
- If transcription is inaccurate, check audio levels
- High background noise may require noise reduction
- Test audio before the event starts
    `.trim(),
  },
  {
    id: 'display-modes',
    title: 'Display Modes',
    category: 'Display',
    keywords: ['display', 'screen', 'stage', 'monitor', 'output'],
    content: `
# Display Modes

SignMate offers multiple display configurations:

## Stage Display
- Full-screen avatar for audience viewing
- Optimal for projection on large screens
- Captions optional below avatar

## Confidence Monitor
- Dual view: avatar + operator controls
- See upcoming signs in queue
- Monitor transcription confidence

## Livestream Overlay
- Transparent background for video overlay
- Configurable position and size
- Works with OBS, vMix, etc.

## Split Screen
- Avatar on one side, captions on other
- Good for venues with multiple screens
    `.trim(),
  },
  {
    id: 'sign-glossary',
    title: 'Sign Glossary',
    category: 'Translation',
    keywords: ['glossary', 'signs', 'dictionary', 'words', 'translation'],
    content: `
# Sign Glossary

The glossary contains all supported ASL signs.

## Browsing Signs
- Press **G** to open the glossary
- Browse by category (greetings, questions, etc.)
- Search for specific words

## Sign Details
Each sign entry includes:
- Dominant and non-dominant handshape
- Location relative to body
- Movement type and direction
- Non-manual markers (facial expressions)

## Unmapped Words
- Some words may not have direct sign equivalents
- The system uses fingerspelling for unmapped words
- Check the glossary to see available signs
    `.trim(),
  },
  {
    id: 'recording',
    title: 'Session Recording',
    category: 'Features',
    keywords: ['record', 'session', 'playback', 'save', 'archive'],
    content: `
# Session Recording

Record your interpretation sessions for review or archive.

## Starting a Recording
- Click the record button or use the Session Manager
- Recording captures all transcriptions and sign data
- Add markers during recording for easy navigation

## Adding Markers
- Click "Add Marker" during recording
- Enter a label (e.g., "Important moment")
- Use markers to find key points during playback

## Playback
- Access recordings from Session Manager
- Play at different speeds (0.5x to 2x)
- Jump to markers or scrub through timeline

## Export
- Download recordings as JSON files
- Import recordings for playback on any device
    `.trim(),
  },
  {
    id: 'performance',
    title: 'Performance Monitoring',
    category: 'Operations',
    keywords: ['performance', 'latency', 'speed', 'metrics', 'monitoring'],
    content: `
# Performance Monitoring

Monitor system performance during live events.

## Key Metrics
- **Total Latency**: Time from speech to sign display
- **Target**: Under 500ms for real-time feel
- **Words/min**: Speech processing rate
- **Signs/min**: Sign production rate

## Latency Breakdown
- Audio to Speech: Speech recognition time
- Speech to Translation: Translation processing
- Translation to Render: Avatar animation time

## Troubleshooting Latency
- Check network connection
- Ensure browser is not overloaded
- Close unnecessary tabs and applications
- Try reducing avatar quality in settings
    `.trim(),
  },
  {
    id: 'demo-mode',
    title: 'Demo Mode',
    category: 'Features',
    keywords: ['demo', 'demonstration', 'test', 'preview', 'showcase'],
    content: `
# Demo Mode

Test SignMate without live audio input.

## Using Demo Mode
- Select "Demo Mode" from the main menu
- Choose a pre-built demo script
- Press Play to start the demonstration

## Available Scripts
- **Welcome Demo**: Basic greetings showcase
- **Conference Presentation**: Full presentation simulation
- **Q&A Session**: Question and answer format
- **Quick Demo**: Short showcase for quick demonstrations

## Custom Scripts
- Create custom demo scripts with your own text
- Useful for rehearsing specific content
- Scripts can be saved and reused
    `.trim(),
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    category: 'Support',
    keywords: ['trouble', 'problem', 'error', 'fix', 'help', 'issue'],
    content: `
# Troubleshooting

Common issues and solutions:

## No Transcription
- Check microphone permissions in browser
- Verify audio input is selected correctly
- Ensure audio levels are adequate

## High Latency
- Check internet connection
- Close other browser tabs
- Reduce avatar quality in settings
- Try a different browser (Chrome recommended)

## Avatar Not Displaying
- WebGL must be enabled in browser
- Update graphics drivers
- Try disabling hardware acceleration

## Signs Not Matching Speech
- Some words may not have direct translations
- Check the glossary for available signs
- Report missing signs via feedback

## Connection Issues
- Check network connectivity
- Firewall may be blocking connections
- Try refreshing the page
    `.trim(),
  },
  {
    id: 'accessibility',
    title: 'Accessibility Features',
    category: 'Support',
    keywords: ['accessibility', 'a11y', 'screen reader', 'keyboard', 'contrast'],
    content: `
# Accessibility Features

SignMate is designed with accessibility in mind.

## Keyboard Navigation
- Full keyboard support for all controls
- Press **?** to see all keyboard shortcuts
- Tab navigation through interactive elements

## Screen Reader Support
- ARIA labels on all controls
- Live regions announce status changes
- Focus management for dialogs

## Visual Accessibility
- High contrast mode support
- Respects system dark mode preference
- Respects reduced motion preference

## Captions
- Real-time captions alongside signs
- Configurable caption size and position
- Caption history available
    `.trim(),
  },
];

const CATEGORIES = Array.from(new Set(HELP_TOPICS.map((t) => t.category)));

export function HelpPanel({
  onClose,
  compact = false,
  initialTopic,
}: HelpPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(
    initialTopic
      ? HELP_TOPICS.find((t) => t.id === initialTopic) || null
      : null
  );

  const filteredTopics = useMemo(() => {
    let topics = [...HELP_TOPICS];

    if (selectedCategory) {
      topics = topics.filter((t) => t.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      topics = topics.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.keywords.some((k) => k.includes(query)) ||
          t.content.toLowerCase().includes(query)
      );
    }

    return topics;
  }, [searchQuery, selectedCategory]);

  // Simple markdown-like rendering
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, i) => {
      if (line.startsWith('# ')) {
        elements.push(
          <h2 key={i} className="content-h1">
            {line.slice(2)}
          </h2>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h3 key={i} className="content-h2">
            {line.slice(3)}
          </h3>
        );
      } else if (line.startsWith('- ')) {
        elements.push(
          <li key={i} className="content-li">
            {renderInline(line.slice(2))}
          </li>
        );
      } else if (line.trim() === '') {
        elements.push(<br key={i} />);
      } else {
        elements.push(
          <p key={i} className="content-p">
            {renderInline(line)}
          </p>
        );
      }
    });

    return elements;
  };

  const renderInline = (text: string) => {
    // Handle **bold** syntax
    const parts = text.split(/\*\*(.+?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <kbd key={i} className="kbd">
          {part}
        </kbd>
      ) : (
        part
      )
    );
  };

  if (compact) {
    return (
      <div className="help-compact">
        <style jsx>{`
          .help-compact {
            background: #1f2937;
            border-radius: 8px;
            padding: 12px;
          }
          .quick-links {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .quick-link {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            background: #111827;
            border-radius: 6px;
            color: #e5e7eb;
            font-size: 12px;
            cursor: pointer;
            text-decoration: none;
          }
          .quick-link:hover {
            background: #1f2937;
          }
        `}</style>

        <div className="quick-links">
          <div
            className="quick-link"
            onClick={() => setSelectedTopic(HELP_TOPICS[0])}
          >
            Getting Started
          </div>
          <div
            className="quick-link"
            onClick={() => setSelectedTopic(HELP_TOPICS[1])}
          >
            Keyboard Shortcuts
          </div>
          <div
            className="quick-link"
            onClick={() => setSelectedTopic(HELP_TOPICS[8])}
          >
            Troubleshooting
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="help-panel">
      <style jsx>{`
        .help-panel {
          background: #111827;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
          max-height: 700px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #1f2937;
          border-bottom: 1px solid #374151;
        }

        .title {
          font-size: 18px;
          font-weight: 600;
          color: #f9fafb;
        }

        .search-bar {
          padding: 12px 20px;
          border-bottom: 1px solid #374151;
        }

        .search-input {
          width: 100%;
          padding: 10px 14px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 6px;
          color: #f9fafb;
          font-size: 14px;
        }

        .search-input:focus {
          outline: none;
          border-color: #2563eb;
        }

        .main-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .sidebar {
          width: 200px;
          border-right: 1px solid #374151;
          overflow-y: auto;
          flex-shrink: 0;
        }

        .category-group {
          padding: 12px 0;
        }

        .category-title {
          padding: 8px 16px;
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .topic-list {
          display: flex;
          flex-direction: column;
        }

        .topic-item {
          padding: 10px 16px;
          font-size: 13px;
          color: #9ca3af;
          cursor: pointer;
          border-left: 2px solid transparent;
        }

        .topic-item:hover {
          background: #1f2937;
          color: #e5e7eb;
        }

        .topic-item.active {
          background: rgba(37, 99, 235, 0.1);
          color: #3b82f6;
          border-left-color: #2563eb;
        }

        .content-area {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .no-selection {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #6b7280;
          text-align: center;
        }

        .no-selection-title {
          font-size: 16px;
          font-weight: 600;
          color: #9ca3af;
          margin-bottom: 8px;
        }

        :global(.content-h1) {
          font-size: 20px;
          font-weight: 700;
          color: #f9fafb;
          margin-bottom: 16px;
        }

        :global(.content-h2) {
          font-size: 15px;
          font-weight: 600;
          color: #e5e7eb;
          margin-top: 20px;
          margin-bottom: 12px;
        }

        :global(.content-p) {
          font-size: 14px;
          color: #9ca3af;
          line-height: 1.6;
          margin-bottom: 8px;
        }

        :global(.content-li) {
          font-size: 14px;
          color: #9ca3af;
          line-height: 1.6;
          margin-left: 20px;
          margin-bottom: 6px;
        }

        :global(.kbd) {
          display: inline-block;
          padding: 2px 6px;
          background: #374151;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          color: #f9fafb;
        }

        .empty-results {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }

        @media (max-width: 600px) {
          .sidebar {
            display: none;
          }
        }
      `}</style>

      <div className="header">
        <h2 className="title">Help & Documentation</h2>
        {onClose && (
          <Button variant="ghost" size="small" onClick={onClose}>
            ×
          </Button>
        )}
      </div>

      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search help topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="main-content">
        <div className="sidebar">
          {CATEGORIES.map((category) => {
            const categoryTopics = filteredTopics.filter(
              (t) => t.category === category
            );
            if (categoryTopics.length === 0) return null;

            return (
              <div key={category} className="category-group">
                <div className="category-title">{category}</div>
                <div className="topic-list">
                  {categoryTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className={`topic-item ${selectedTopic?.id === topic.id ? 'active' : ''}`}
                      onClick={() => setSelectedTopic(topic)}
                    >
                      {topic.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredTopics.length === 0 && (
            <div className="empty-results">No topics found</div>
          )}
        </div>

        <div className="content-area">
          {selectedTopic ? (
            <div className="topic-content">
              {renderContent(selectedTopic.content)}
            </div>
          ) : (
            <div className="no-selection">
              <div className="no-selection-title">Select a Topic</div>
              <p>Choose a help topic from the sidebar to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
