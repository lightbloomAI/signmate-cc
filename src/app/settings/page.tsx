'use client';

import React, { useState } from 'react';
import { PageLayout, PageHeader, PageContent, PageSection, Card } from '@/components/layout';
import { AccessibilitySettings } from '@/components/accessibility';

/**
 * Settings Page
 *
 * Application settings and preferences.
 */

type SettingsTab = 'general' | 'audio' | 'display' | 'accessibility' | 'advanced';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 w-full px-4 py-3 text-left rounded-lg transition-colors
        ${active
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }
      `}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

// General Settings Section
function GeneralSettings() {
  return (
    <div className="space-y-6">
      <Card title="Language & Region">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Interface Language
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sign Language
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option value="asl">American Sign Language (ASL)</option>
              <option value="bsl">British Sign Language (BSL)</option>
              <option value="auslan">Australian Sign Language (Auslan)</option>
            </select>
          </div>
        </div>
      </Card>

      <Card title="Startup Behavior">
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Start in demo mode</span>
            <input type="checkbox" className="w-5 h-5 rounded text-blue-500" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Show welcome tour on first visit</span>
            <input type="checkbox" className="w-5 h-5 rounded text-blue-500" defaultChecked />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Remember last event settings</span>
            <input type="checkbox" className="w-5 h-5 rounded text-blue-500" defaultChecked />
          </label>
        </div>
      </Card>
    </div>
  );
}

// Audio Settings Section
function AudioSettings() {
  return (
    <div className="space-y-6">
      <Card title="Microphone">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Input Device
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option value="default">Default Microphone</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Input Level
            </label>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
              <div className="h-full w-3/4 bg-green-500 rounded-full" />
            </div>
          </div>
          <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
            Test Microphone
          </button>
        </div>
      </Card>

      <Card title="Speech Recognition">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recognition Language
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="es-ES">Spanish (Spain)</option>
            </select>
          </div>
          <label className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Continuous recognition</span>
            <input type="checkbox" className="w-5 h-5 rounded text-blue-500" defaultChecked />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Interim results</span>
            <input type="checkbox" className="w-5 h-5 rounded text-blue-500" defaultChecked />
          </label>
        </div>
      </Card>
    </div>
  );
}

// Display Settings Section
function DisplaySettings() {
  return (
    <div className="space-y-6">
      <Card title="Theme">
        <div className="grid grid-cols-3 gap-3">
          {['Light', 'Dark', 'System'].map((theme) => (
            <button
              key={theme}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg text-center hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <span className="text-gray-900 dark:text-white">{theme}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Avatar Display">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Avatar Size
            </label>
            <input
              type="range"
              min="50"
              max="150"
              defaultValue="100"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Animation Speed
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option value="slow">Slow</option>
              <option value="normal">Normal</option>
              <option value="fast">Fast</option>
            </select>
          </div>
          <label className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Show signing speed indicator</span>
            <input type="checkbox" className="w-5 h-5 rounded text-blue-500" defaultChecked />
          </label>
        </div>
      </Card>

      <Card title="Captions">
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Show captions</span>
            <input type="checkbox" className="w-5 h-5 rounded text-blue-500" defaultChecked />
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Caption Position
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
            </select>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Advanced Settings Section
function AdvancedSettings() {
  return (
    <div className="space-y-6">
      <Card title="Performance">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Render Quality
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option value="low">Low (Better Performance)</option>
              <option value="medium">Medium</option>
              <option value="high">High (Better Quality)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Frame Rate
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option value="30">30 FPS</option>
              <option value="60">60 FPS</option>
            </select>
          </div>
          <label className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Hardware acceleration</span>
            <input type="checkbox" className="w-5 h-5 rounded text-blue-500" defaultChecked />
          </label>
        </div>
      </Card>

      <Card title="Data & Privacy">
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Send anonymous usage data</span>
            <input type="checkbox" className="w-5 h-5 rounded text-blue-500" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Save session recordings locally</span>
            <input type="checkbox" className="w-5 h-5 rounded text-blue-500" defaultChecked />
          </label>
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
              Clear All Data
            </button>
          </div>
        </div>
      </Card>

      <Card title="Debug">
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Show debug overlay</span>
            <input type="checkbox" className="w-5 h-5 rounded text-blue-500" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Verbose console logging</span>
            <input type="checkbox" className="w-5 h-5 rounded text-blue-500" />
          </label>
        </div>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    {
      id: 'general',
      label: 'General',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'audio',
      label: 'Audio',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
    },
    {
      id: 'display',
      label: 'Display',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'accessibility',
      label: 'Accessibility',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
        </svg>
      ),
    },
    {
      id: 'advanced',
      label: 'Advanced',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Settings"
        description="Configure your SignMate preferences"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings' },
        ]}
      />

      <PageContent className="bg-gray-50 dark:bg-gray-950">
        <div className="flex h-full">
          {/* Sidebar */}
          <aside className="w-64 p-4 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <TabButton
                  key={tab.id}
                  active={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  icon={tab.icon}
                  label={tab.label}
                />
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'audio' && <AudioSettings />}
            {activeTab === 'display' && <DisplaySettings />}
            {activeTab === 'accessibility' && <AccessibilitySettings />}
            {activeTab === 'advanced' && <AdvancedSettings />}
          </main>
        </div>
      </PageContent>
    </PageLayout>
  );
}
