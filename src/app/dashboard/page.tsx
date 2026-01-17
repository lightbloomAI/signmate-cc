'use client';

import React from 'react';
import { PageLayout, PageHeader, PageContent, PageSection, Card, Grid } from '@/components/layout';
import { useSignMateStore } from '@/store';
import { useSessionMetrics } from '@/lib/analytics';

/**
 * Dashboard Page
 *
 * Main overview page showing system status and recent activity.
 */

// Quick Stat Card
interface QuickStatProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

function QuickStat({ label, value, change, trend, icon }: QuickStatProps) {
  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-gray-500',
  };

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${trend ? trendColors[trend] : 'text-gray-500'}`}>
              {change}
            </p>
          )}
        </div>
        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-500">
          {icon}
        </div>
      </div>
    </Card>
  );
}

// Status Badge
interface StatusBadgeProps {
  status: 'online' | 'offline' | 'warning';
  label: string;
}

function StatusBadge({ status, label }: StatusBadgeProps) {
  const colors = {
    online: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    offline: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>
      {label}
    </span>
  );
}

// Quick Action Button
interface QuickActionProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function QuickAction({ label, description, icon, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-left w-full"
    >
      <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400">
        {icon}
      </div>
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const { pipelineStatus, isDemoMode, currentEvent } = useSignMateStore();
  const metrics = useSessionMetrics();

  const isRunning = pipelineStatus.audioCapture === 'active' || pipelineStatus.speechRecognition === 'processing';
  const systemStatus = isRunning ? 'online' : 'offline';

  return (
    <PageLayout>
      <PageHeader
        title="Dashboard"
        description="Overview of your SignMate system"
        actions={
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Start New Event
          </button>
        }
      />

      <PageContent className="bg-gray-50 dark:bg-gray-950">
        {/* Quick Stats */}
        <PageSection>
          <Grid cols={4}>
            <QuickStat
              label="Active Sessions"
              value={currentEvent ? 1 : 0}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            <QuickStat
              label="Translations Today"
              value={metrics?.translationsCompleted || 0}
              change="+12% from yesterday"
              trend="up"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              }
            />
            <QuickStat
              label="Words Processed"
              value={metrics?.totalWordsTranslated || 0}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <QuickStat
              label="System Health"
              value="Good"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </Grid>
        </PageSection>

        {/* System Status & Quick Actions */}
        <PageSection>
          <Grid cols={2}>
            {/* System Status */}
            <Card title="System Status">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Pipeline</span>
                  <StatusBadge
                    status={systemStatus}
                    label={isRunning ? 'Running' : 'Stopped'}
                  />
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Speech Recognition</span>
                  <StatusBadge status="online" label="Connected" />
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Avatar Engine</span>
                  <StatusBadge status="online" label="Ready" />
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600 dark:text-gray-400">Mode</span>
                  <StatusBadge
                    status={isDemoMode ? 'warning' : 'online'}
                    label={isDemoMode ? 'Demo' : 'Live'}
                  />
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card title="Quick Actions">
              <div className="space-y-3">
                <QuickAction
                  label="Start Interpretation"
                  description="Begin real-time sign language interpretation"
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  onClick={() => {}}
                />
                <QuickAction
                  label="Browse Dictionary"
                  description="Search and explore ASL signs"
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  }
                  onClick={() => {}}
                />
                <QuickAction
                  label="View Analytics"
                  description="Check performance and usage metrics"
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  }
                  onClick={() => {}}
                />
              </div>
            </Card>
          </Grid>
        </PageSection>

        {/* Recent Activity */}
        <PageSection title="Recent Activity">
          <Card padding="none">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {[
                { time: '2 min ago', action: 'Translation completed', detail: '145 words processed' },
                { time: '15 min ago', action: 'Session started', detail: 'Demo mode enabled' },
                { time: '1 hour ago', action: 'Settings updated', detail: 'Caption size changed' },
                { time: '2 hours ago', action: 'Dictionary searched', detail: '"hello" found' },
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{activity.action}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{activity.detail}</p>
                  </div>
                  <span className="text-sm text-gray-400 dark:text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>
          </Card>
        </PageSection>
      </PageContent>
    </PageLayout>
  );
}
