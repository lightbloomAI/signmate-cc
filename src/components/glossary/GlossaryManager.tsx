'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import {
  getGlossaryEntries,
  getGlossaryStats,
  searchGlossary,
  type GlossaryEntry,
} from '@/lib/asl/glossary';

interface GlossaryManagerProps {
  onSelectSign?: (sign: GlossaryEntry) => void;
  onClose?: () => void;
  compact?: boolean;
}

type ViewMode = 'browse' | 'search' | 'stats';
type SortBy = 'alpha' | 'category' | 'frequency';

const CATEGORIES = [
  'all',
  'greetings',
  'common',
  'questions',
  'pronouns',
  'verbs',
  'adjectives',
  'time',
  'numbers',
  'fingerspelling',
] as const;

type Category = (typeof CATEGORIES)[number];

// Category mapping for glossary entries
const CATEGORY_MAP: Record<string, Category[]> = {
  HELLO: ['greetings'],
  HI: ['greetings'],
  GOODBYE: ['greetings'],
  THANK_YOU: ['greetings', 'common'],
  WELCOME: ['greetings'],
  PLEASE: ['common'],
  SORRY: ['common'],
  YES: ['common'],
  NO: ['common'],
  WHAT: ['questions'],
  WHERE: ['questions'],
  WHEN: ['questions'],
  WHY: ['questions'],
  HOW: ['questions'],
  WHO: ['questions'],
  I: ['pronouns'],
  YOU: ['pronouns'],
  WE: ['pronouns'],
  THEY: ['pronouns'],
  HE: ['pronouns'],
  SHE: ['pronouns'],
  LIKE: ['verbs'],
  WANT: ['verbs'],
  NEED: ['verbs'],
  HELP: ['verbs'],
  KNOW: ['verbs'],
  UNDERSTAND: ['verbs'],
  GOOD: ['adjectives'],
  BAD: ['adjectives'],
  BIG: ['adjectives'],
  SMALL: ['adjectives'],
  HAPPY: ['adjectives'],
  SAD: ['adjectives'],
  LOVE: ['adjectives'],
  TODAY: ['time'],
  TOMORROW: ['time'],
  YESTERDAY: ['time'],
  NOW: ['time'],
  LATER: ['time'],
};

export function GlossaryManager({
  onSelectSign,
  onClose,
  compact = false,
}: GlossaryManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [sortBy, setSortBy] = useState<SortBy>('alpha');
  const [selectedSign, setSelectedSign] = useState<GlossaryEntry | null>(null);

  const stats = useMemo(() => getGlossaryStats(), []);

  // Filter and sort glossary entries
  const filteredSigns = useMemo(() => {
    // Get entries - either search results or all entries
    let entries = searchQuery.trim()
      ? searchGlossary(searchQuery)
      : getGlossaryEntries();

    // Filter by category
    if (selectedCategory !== 'all') {
      entries = entries.filter((entry) => {
        return CATEGORY_MAP[entry.gloss]?.includes(selectedCategory) || false;
      });
    }

    // Sort
    if (sortBy === 'alpha') {
      entries.sort((a, b) => a.gloss.localeCompare(b.gloss));
    } else if (sortBy === 'category') {
      entries.sort((a, b) => {
        const catA = a.handshape.dominant;
        const catB = b.handshape.dominant;
        return catA.localeCompare(catB);
      });
    }

    return entries;
  }, [searchQuery, selectedCategory, sortBy]);

  const handleSignClick = useCallback(
    (sign: GlossaryEntry) => {
      setSelectedSign(sign);
      onSelectSign?.(sign);
    },
    [onSelectSign]
  );

  if (compact) {
    return (
      <div className="glossary-compact">
        <style jsx>{`
          .glossary-compact {
            background: #1f2937;
            border-radius: 8px;
            padding: 12px;
          }
          .search-input {
            width: 100%;
            padding: 8px 12px;
            background: #111827;
            border: 1px solid #374151;
            border-radius: 6px;
            color: #f9fafb;
            font-size: 13px;
            margin-bottom: 8px;
          }
          .search-input:focus {
            outline: none;
            border-color: #2563eb;
          }
          .results-list {
            max-height: 200px;
            overflow-y: auto;
          }
          .result-item {
            padding: 8px 10px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            color: #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .result-item:hover {
            background: #374151;
          }
          .result-duration {
            font-size: 11px;
            color: #6b7280;
          }
          .no-results {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            font-size: 13px;
          }
        `}</style>

        <input
          type="text"
          className="search-input"
          placeholder="Search signs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="results-list">
          {filteredSigns.length === 0 ? (
            <div className="no-results">No signs found</div>
          ) : (
            filteredSigns.slice(0, 10).map((sign) => (
              <div
                key={sign.gloss}
                className="result-item"
                onClick={() => handleSignClick(sign)}
              >
                <span>{sign.gloss}</span>
                <span className="result-duration">{sign.duration}ms</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="glossary-manager">
      <style jsx>{`
        .glossary-manager {
          background: #111827;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
          max-height: 600px;
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

        .view-tabs {
          display: flex;
          gap: 4px;
          padding: 0 20px;
          background: #1f2937;
          border-bottom: 1px solid #374151;
        }

        .tab {
          padding: 10px 16px;
          font-size: 13px;
          color: #9ca3af;
          background: transparent;
          border: none;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
        }

        .tab:hover {
          color: #e5e7eb;
        }

        .tab.active {
          color: #2563eb;
          border-bottom-color: #2563eb;
        }

        .toolbar {
          display: flex;
          gap: 12px;
          padding: 12px 20px;
          border-bottom: 1px solid #374151;
          align-items: center;
        }

        .search-input {
          flex: 1;
          padding: 8px 12px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 6px;
          color: #f9fafb;
          font-size: 13px;
        }

        .search-input:focus {
          outline: none;
          border-color: #2563eb;
        }

        .filter-select {
          padding: 8px 12px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 6px;
          color: #f9fafb;
          font-size: 13px;
          cursor: pointer;
        }

        .filter-select:focus {
          outline: none;
          border-color: #2563eb;
        }

        .content {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
        }

        .sign-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 12px;
        }

        .sign-card {
          padding: 14px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sign-card:hover {
          border-color: #4b5563;
          background: #263445;
        }

        .sign-card.selected {
          border-color: #2563eb;
          background: rgba(37, 99, 235, 0.1);
        }

        .sign-name {
          font-size: 14px;
          font-weight: 600;
          color: #f9fafb;
          margin-bottom: 6px;
        }

        .sign-meta {
          font-size: 11px;
          color: #6b7280;
        }

        .sign-detail {
          padding: 20px;
          background: #1f2937;
          border-radius: 8px;
          margin-top: 16px;
        }

        .detail-title {
          font-size: 20px;
          font-weight: 700;
          color: #f9fafb;
          margin-bottom: 16px;
        }

        .detail-section {
          margin-bottom: 16px;
        }

        .detail-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 6px;
        }

        .detail-value {
          font-size: 14px;
          color: #e5e7eb;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .stat-card {
          padding: 20px;
          background: #1f2937;
          border-radius: 8px;
          text-align: center;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #2563eb;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 13px;
          color: #9ca3af;
        }

        .no-results {
          text-align: center;
          padding: 60px 20px;
          color: #6b7280;
        }
      `}</style>

      <div className="header">
        <h2 className="title">ASL Glossary</h2>
        {onClose && (
          <Button variant="ghost" size="small" onClick={onClose}>
            ×
          </Button>
        )}
      </div>

      <div className="view-tabs">
        <button
          className={`tab ${viewMode === 'browse' ? 'active' : ''}`}
          onClick={() => setViewMode('browse')}
        >
          Browse
        </button>
        <button
          className={`tab ${viewMode === 'search' ? 'active' : ''}`}
          onClick={() => setViewMode('search')}
        >
          Search
        </button>
        <button
          className={`tab ${viewMode === 'stats' ? 'active' : ''}`}
          onClick={() => setViewMode('stats')}
        >
          Statistics
        </button>
      </div>

      {viewMode !== 'stats' && (
        <div className="toolbar">
          <input
            type="text"
            className="search-input"
            placeholder="Search signs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as Category)}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
          >
            <option value="alpha">A-Z</option>
            <option value="category">By Handshape</option>
            <option value="frequency">By Frequency</option>
          </select>
        </div>
      )}

      <div className="content">
        {viewMode === 'stats' ? (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalSigns}</div>
              <div className="stat-label">Total Signs</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.uniqueHandshapes}</div>
              <div className="stat-label">Unique Handshapes</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.averageDuration}ms</div>
              <div className="stat-label">Average Duration</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.movementTypes}</div>
              <div className="stat-label">Movement Types</div>
            </div>
          </div>
        ) : filteredSigns.length === 0 ? (
          <div className="no-results">
            <p>No signs found matching your criteria</p>
          </div>
        ) : (
          <>
            <div className="sign-grid">
              {filteredSigns.map((sign) => (
                <div
                  key={sign.gloss}
                  className={`sign-card ${selectedSign?.gloss === sign.gloss ? 'selected' : ''}`}
                  onClick={() => handleSignClick(sign)}
                >
                  <div className="sign-name">{sign.gloss}</div>
                  <div className="sign-meta">
                    {sign.handshape.dominant} · {sign.duration}ms
                  </div>
                </div>
              ))}
            </div>

            {selectedSign && (
              <div className="sign-detail">
                <h3 className="detail-title">{selectedSign.gloss}</h3>
                <div className="detail-grid">
                  <div className="detail-section">
                    <div className="detail-label">Handshape</div>
                    <div className="detail-value">
                      Dominant: {selectedSign.handshape.dominant}
                      {selectedSign.handshape.nonDominant && (
                        <>, Non-dominant: {selectedSign.handshape.nonDominant}</>
                      )}
                    </div>
                  </div>
                  <div className="detail-section">
                    <div className="detail-label">Location</div>
                    <div className="detail-value">
                      {selectedSign.location.reference} (x:{selectedSign.location.x.toFixed(1)},
                      y:{selectedSign.location.y.toFixed(1)}, z:{selectedSign.location.z.toFixed(1)})
                    </div>
                  </div>
                  <div className="detail-section">
                    <div className="detail-label">Movement</div>
                    <div className="detail-value">
                      {selectedSign.movement.type} · {selectedSign.movement.speed}
                      {selectedSign.movement.repetitions && (
                        <> · {selectedSign.movement.repetitions}x</>
                      )}
                    </div>
                  </div>
                  <div className="detail-section">
                    <div className="detail-label">Duration</div>
                    <div className="detail-value">{selectedSign.duration}ms</div>
                  </div>
                </div>
                {selectedSign.nonManualMarkers.length > 0 && (
                  <div className="detail-section">
                    <div className="detail-label">Non-Manual Markers</div>
                    <div className="detail-value">
                      {selectedSign.nonManualMarkers.map((m, i) => (
                        <span key={i}>
                          {m.type}: {m.expression} ({Math.round(m.intensity * 100)}%)
                          {i < selectedSign.nonManualMarkers.length - 1 && ', '}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
