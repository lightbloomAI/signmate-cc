'use client';

import React, { useState, useCallback } from 'react';
import {
  useHelpArticles,
  useKeyboardShortcuts,
  useOnboarding,
} from '@/lib/onboarding/useOnboarding';
import type { HelpArticle } from '@/lib/onboarding/onboardingManager';

/**
 * HelpCenter Component
 *
 * Comprehensive help center with articles, search, and keyboard shortcuts.
 */

// Tab Button Component
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
        ${active
          ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }
      `}
    >
      {children}
    </button>
  );
}

// Article Preview Card
interface ArticleCardProps {
  article: HelpArticle;
  onClick: () => void;
}

function ArticleCard({ article, onClick }: ArticleCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
    >
      <h4 className="font-medium text-gray-900 dark:text-white mb-1">
        {article.title}
      </h4>
      <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
        {article.category}
      </span>
    </button>
  );
}

// Article View Component
interface ArticleViewProps {
  article: HelpArticle;
  onBack: () => void;
  onNavigate: (id: string) => void;
}

function ArticleView({ article, onBack, onNavigate }: ArticleViewProps) {
  return (
    <div className="h-full overflow-y-auto">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to articles
      </button>

      {/* Article Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {article.title}
        </h2>
        <span className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded">
          {article.category}
        </span>
      </div>

      {/* Article Content */}
      <div className="prose dark:prose-invert max-w-none">
        {article.content.split('\n').map((line, index) => {
          if (line.startsWith('## ')) {
            return (
              <h2 key={index} className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                {line.replace('## ', '')}
              </h2>
            );
          }
          if (line.startsWith('### ')) {
            return (
              <h3 key={index} className="text-lg font-medium text-gray-800 dark:text-gray-200 mt-4 mb-2">
                {line.replace('### ', '')}
              </h3>
            );
          }
          if (line.startsWith('- ')) {
            return (
              <li key={index} className="text-gray-600 dark:text-gray-400 ml-4">
                {line.replace('- ', '')}
              </li>
            );
          }
          if (line.match(/^\d+\./)) {
            return (
              <li key={index} className="text-gray-600 dark:text-gray-400 ml-4 list-decimal">
                {line.replace(/^\d+\.\s*/, '')}
              </li>
            );
          }
          if (line.trim()) {
            return (
              <p key={index} className="text-gray-600 dark:text-gray-400 mb-2">
                {line}
              </p>
            );
          }
          return null;
        })}
      </div>

      {/* Related Articles */}
      {article.relatedArticles && article.relatedArticles.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Related Articles
          </h3>
          <div className="flex flex-wrap gap-2">
            {article.relatedArticles.map((id) => (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {id.replace(/-/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="mt-6 flex flex-wrap gap-2">
        {article.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded"
          >
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
}

// Keyboard Shortcuts Panel
function KeyboardShortcutsPanel() {
  const { shortcutsByCategory, formatShortcut } = useKeyboardShortcuts();

  return (
    <div className="space-y-6">
      {Object.entries(shortcutsByCategory).map(([category, shortcuts]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {category}
          </h3>
          <div className="space-y-2">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.id}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
              >
                <span className="text-gray-700 dark:text-gray-300">
                  {shortcut.description}
                </span>
                <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm font-mono text-gray-900 dark:text-white">
                  {formatShortcut(shortcut)}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Tours Panel
function ToursPanel() {
  const { manager, startTour, isTourComplete } = useOnboarding();
  const tours = manager.getAllTours();

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Take a guided tour to learn about SignMate features.
      </p>

      {tours.map((tour) => (
        <div
          key={tour.id}
          className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                {tour.name}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {tour.description}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                {tour.steps.length} steps
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isTourComplete(tour.id) && (
                <span className="text-green-500 text-sm">Completed</span>
              )}
              <button
                onClick={() => startTour(tour.id)}
                className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
              >
                {isTourComplete(tour.id) ? 'Retake' : 'Start'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Main Help Center Component
interface HelpCenterProps {
  className?: string;
  defaultTab?: 'articles' | 'shortcuts' | 'tours';
  onClose?: () => void;
}

export function HelpCenter({
  className = '',
  defaultTab = 'articles',
  onClose,
}: HelpCenterProps) {
  const [activeTab, setActiveTab] = useState<'articles' | 'shortcuts' | 'tours'>(defaultTab);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

  const {
    articles,
    categories,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    getArticle,
  } = useHelpArticles();

  const handleNavigateToArticle = useCallback(
    (id: string) => {
      const article = getArticle(id);
      if (article) {
        setSelectedArticle(article);
      }
    },
    [getArticle]
  );

  return (
    <div className={`flex flex-col h-full bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Help Center
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          <TabButton
            active={activeTab === 'articles'}
            onClick={() => {
              setActiveTab('articles');
              setSelectedArticle(null);
            }}
          >
            Articles
          </TabButton>
          <TabButton active={activeTab === 'shortcuts'} onClick={() => setActiveTab('shortcuts')}>
            Shortcuts
          </TabButton>
          <TabButton active={activeTab === 'tours'} onClick={() => setActiveTab('tours')}>
            Tours
          </TabButton>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'articles' && (
          <div className="h-full p-4">
            {selectedArticle ? (
              <ArticleView
                article={selectedArticle}
                onBack={() => setSelectedArticle(null)}
                onNavigate={handleNavigateToArticle}
              />
            ) : (
              <div className="h-full flex flex-col">
                {/* Search */}
                <div className="relative mb-4">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search help articles..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      !selectedCategory
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    All
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        selectedCategory === category
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                {/* Articles List */}
                <div className="flex-1 overflow-y-auto space-y-3">
                  {articles.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">
                        No articles found
                      </p>
                    </div>
                  ) : (
                    articles.map((article) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        onClick={() => setSelectedArticle(article)}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'shortcuts' && (
          <div className="h-full overflow-y-auto p-4">
            <KeyboardShortcutsPanel />
          </div>
        )}

        {activeTab === 'tours' && (
          <div className="h-full overflow-y-auto p-4">
            <ToursPanel />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Need more help?{' '}
          <a
            href="mailto:support@signmate.ai"
            className="text-blue-500 hover:underline"
          >
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}

export default HelpCenter;
