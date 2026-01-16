'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import type { EventConfig } from '@/types';

interface TimelineEvent {
  id: string;
  name: string;
  venue?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'completed' | 'active' | 'scheduled';
  stats?: {
    totalSigns: number;
    totalWords: number;
    averageLatency: number;
    peakAttendees?: number;
  };
  hasRecording?: boolean;
}

interface EventTimelineProps {
  events?: TimelineEvent[];
  onSelectEvent?: (event: TimelineEvent) => void;
  onPlayRecording?: (eventId: string) => void;
  onDeleteEvent?: (eventId: string) => void;
  onClose?: () => void;
  compact?: boolean;
}

// Storage key for event history
const EVENT_HISTORY_KEY = 'signmate_event_history';

export function EventTimeline({
  events: externalEvents,
  onSelectEvent,
  onPlayRecording,
  onDeleteEvent,
  onClose,
  compact = false,
}: EventTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'scheduled'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [searchQuery, setSearchQuery] = useState('');

  // Load events from localStorage or use external events
  useEffect(() => {
    if (externalEvents) {
      setEvents(externalEvents);
      return;
    }

    try {
      const stored = localStorage.getItem(EVENT_HISTORY_KEY);
      if (stored) {
        setEvents(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load event history:', e);
    }
  }, [externalEvents]);

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let result = [...events];

    // Apply filter
    if (filter !== 'all') {
      result = result.filter((e) => e.status === filter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(query) ||
          e.venue?.toLowerCase().includes(query)
      );
    }

    // Apply sort
    result.sort((a, b) => {
      const timeA = a.startTime;
      const timeB = b.startTime;
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [events, filter, sortOrder, searchQuery]);

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};

    filteredEvents.forEach((event) => {
      const date = new Date(event.startTime).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
    });

    return groups;
  }, [filteredEvents]);

  const handleSelectEvent = useCallback(
    (event: TimelineEvent) => {
      setSelectedEvent(event);
      onSelectEvent?.(event);
    },
    [onSelectEvent]
  );

  const handleDeleteEvent = useCallback(
    (eventId: string) => {
      const newEvents = events.filter((e) => e.id !== eventId);
      setEvents(newEvents);

      try {
        localStorage.setItem(EVENT_HISTORY_KEY, JSON.stringify(newEvents));
      } catch (e) {
        console.error('Failed to save event history:', e);
      }

      onDeleteEvent?.(eventId);

      if (selectedEvent?.id === eventId) {
        setSelectedEvent(null);
      }
    },
    [events, selectedEvent, onDeleteEvent]
  );

  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: TimelineEvent['status']): string => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'completed':
        return '#6b7280';
      case 'scheduled':
        return '#f59e0b';
    }
  };

  if (compact) {
    const recentEvents = filteredEvents.slice(0, 3);

    return (
      <div className="timeline-compact">
        <style jsx>{`
          .timeline-compact {
            background: #1f2937;
            border-radius: 8px;
            padding: 12px;
          }
          .compact-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }
          .compact-title {
            font-size: 13px;
            font-weight: 600;
            color: #e5e7eb;
          }
          .compact-count {
            font-size: 11px;
            color: #9ca3af;
          }
          .compact-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .compact-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            background: #111827;
            border-radius: 6px;
            cursor: pointer;
          }
          .compact-item:hover {
            background: #1f2937;
          }
          .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
          }
          .item-info {
            flex: 1;
            min-width: 0;
          }
          .item-name {
            font-size: 12px;
            color: #f9fafb;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .item-time {
            font-size: 10px;
            color: #6b7280;
          }
          .empty-state {
            text-align: center;
            padding: 16px;
            color: #6b7280;
            font-size: 12px;
          }
        `}</style>

        <div className="compact-header">
          <span className="compact-title">Recent Events</span>
          <span className="compact-count">{events.length} total</span>
        </div>

        {recentEvents.length === 0 ? (
          <div className="empty-state">No events yet</div>
        ) : (
          <div className="compact-list">
            {recentEvents.map((event) => (
              <div
                key={event.id}
                className="compact-item"
                onClick={() => handleSelectEvent(event)}
              >
                <div
                  className="status-dot"
                  style={{ background: getStatusColor(event.status) }}
                />
                <div className="item-info">
                  <div className="item-name">{event.name}</div>
                  <div className="item-time">{formatTime(event.startTime)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="event-timeline">
      <style jsx>{`
        .event-timeline {
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

        .toolbar {
          display: flex;
          gap: 12px;
          padding: 12px 20px;
          border-bottom: 1px solid #374151;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-input {
          flex: 1;
          min-width: 150px;
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

        .filter-group {
          display: flex;
          gap: 4px;
        }

        .filter-btn {
          padding: 6px 12px;
          font-size: 12px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 4px;
          color: #9ca3af;
          cursor: pointer;
        }

        .filter-btn:hover {
          background: #374151;
        }

        .filter-btn.active {
          background: #2563eb;
          border-color: #2563eb;
          color: #fff;
        }

        .content {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
        }

        .date-group {
          margin-bottom: 24px;
        }

        .date-header {
          font-size: 12px;
          font-weight: 600;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #374151;
        }

        .event-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .event-card {
          display: flex;
          gap: 16px;
          padding: 16px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .event-card:hover {
          border-color: #4b5563;
          background: #263445;
        }

        .event-card.selected {
          border-color: #2563eb;
          background: rgba(37, 99, 235, 0.1);
        }

        .timeline-marker {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding-top: 4px;
        }

        .marker-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid;
        }

        .marker-line {
          width: 2px;
          flex: 1;
          background: #374151;
          min-height: 40px;
        }

        .event-content {
          flex: 1;
          min-width: 0;
        }

        .event-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .event-name {
          font-size: 15px;
          font-weight: 600;
          color: #f9fafb;
        }

        .event-status {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
          text-transform: capitalize;
        }

        .event-meta {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
          font-size: 12px;
          color: #9ca3af;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .event-stats {
          display: flex;
          gap: 16px;
          font-size: 12px;
        }

        .stat {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-weight: 600;
          color: #e5e7eb;
        }

        .stat-label {
          color: #6b7280;
        }

        .event-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .action-btn {
          padding: 6px 12px;
          font-size: 11px;
          background: transparent;
          border: 1px solid #374151;
          border-radius: 4px;
          color: #9ca3af;
          cursor: pointer;
        }

        .action-btn:hover {
          background: #374151;
          color: #f9fafb;
        }

        .action-btn.danger:hover {
          background: #7f1d1d;
          border-color: #7f1d1d;
          color: #fecaca;
        }

        .action-btn.primary {
          background: #2563eb;
          border-color: #2563eb;
          color: #fff;
        }

        .action-btn.primary:hover {
          background: #1d4ed8;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #6b7280;
        }

        .empty-title {
          font-size: 16px;
          font-weight: 600;
          color: #9ca3af;
          margin-bottom: 8px;
        }
      `}</style>

      <div className="header">
        <h2 className="title">Event History</h2>
        {onClose && (
          <Button variant="ghost" size="small" onClick={onClose}>
            ×
          </Button>
        )}
      </div>

      <div className="toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="filter-group">
          {(['all', 'completed', 'scheduled'] as const).map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="filter-group">
          <button
            className={`filter-btn ${sortOrder === 'newest' ? 'active' : ''}`}
            onClick={() => setSortOrder('newest')}
          >
            Newest
          </button>
          <button
            className={`filter-btn ${sortOrder === 'oldest' ? 'active' : ''}`}
            onClick={() => setSortOrder('oldest')}
          >
            Oldest
          </button>
        </div>
      </div>

      <div className="content">
        {filteredEvents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">No Events Found</div>
            <p>
              {searchQuery
                ? 'Try adjusting your search or filters'
                : 'Events will appear here after your first interpretation session'}
            </p>
          </div>
        ) : (
          Object.entries(groupedEvents).map(([date, dateEvents]) => (
            <div key={date} className="date-group">
              <div className="date-header">{date}</div>
              <div className="event-list">
                {dateEvents.map((event, index) => (
                  <div
                    key={event.id}
                    className={`event-card ${selectedEvent?.id === event.id ? 'selected' : ''}`}
                    onClick={() => handleSelectEvent(event)}
                  >
                    <div className="timeline-marker">
                      <div
                        className="marker-dot"
                        style={{
                          borderColor: getStatusColor(event.status),
                          background:
                            event.status === 'active'
                              ? getStatusColor(event.status)
                              : 'transparent',
                        }}
                      />
                      {index < dateEvents.length - 1 && (
                        <div className="marker-line" />
                      )}
                    </div>

                    <div className="event-content">
                      <div className="event-header">
                        <span className="event-name">{event.name}</span>
                        <span
                          className="event-status"
                          style={{
                            background: `${getStatusColor(event.status)}20`,
                            color: getStatusColor(event.status),
                          }}
                        >
                          {event.status}
                        </span>
                      </div>

                      <div className="event-meta">
                        <span className="meta-item">
                          {formatTime(event.startTime)}
                          {event.endTime && ` - ${formatTime(event.endTime)}`}
                        </span>
                        {event.venue && (
                          <span className="meta-item">{event.venue}</span>
                        )}
                        {event.duration && (
                          <span className="meta-item">
                            {formatDuration(event.duration)}
                          </span>
                        )}
                      </div>

                      {event.stats && (
                        <div className="event-stats">
                          <div className="stat">
                            <span className="stat-value">
                              {event.stats.totalWords}
                            </span>
                            <span className="stat-label">words</span>
                          </div>
                          <div className="stat">
                            <span className="stat-value">
                              {event.stats.totalSigns}
                            </span>
                            <span className="stat-label">signs</span>
                          </div>
                          <div className="stat">
                            <span className="stat-value">
                              {event.stats.averageLatency}ms
                            </span>
                            <span className="stat-label">avg latency</span>
                          </div>
                        </div>
                      )}

                      <div className="event-actions">
                        {event.hasRecording && onPlayRecording && (
                          <button
                            className="action-btn primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlayRecording(event.id);
                            }}
                          >
                            Play Recording
                          </button>
                        )}
                        {onDeleteEvent && (
                          <button
                            className="action-btn danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEvent(event.id);
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Helper to save an event to history
export function saveEventToHistory(
  event: EventConfig,
  stats?: TimelineEvent['stats']
): void {
  try {
    const stored = localStorage.getItem(EVENT_HISTORY_KEY);
    const history: TimelineEvent[] = stored ? JSON.parse(stored) : [];

    const startTimestamp = event.startTime instanceof Date
      ? event.startTime.getTime()
      : event.startTime;

    const timelineEvent: TimelineEvent = {
      id: event.id,
      name: event.name,
      venue: event.venue,
      startTime: startTimestamp,
      endTime: Date.now(),
      duration: Date.now() - startTimestamp,
      status: 'completed',
      stats,
      hasRecording: false,
    };

    // Add to beginning of history
    const newHistory = [timelineEvent, ...history.filter((e) => e.id !== event.id)].slice(0, 50);
    localStorage.setItem(EVENT_HISTORY_KEY, JSON.stringify(newHistory));
  } catch (e) {
    console.error('Failed to save event to history:', e);
  }
}
