'use client';

import React, { useState, useCallback } from 'react';
import {
  useSignDictionary,
  useSignLookup,
  useRelatedSigns,
} from '@/hooks/useSignDictionary';
import type { SignEntry, SignCategory, SignDifficulty } from '@/lib/dictionary';

/**
 * SignDictionaryBrowser Component
 *
 * A comprehensive UI for browsing, searching, and exploring
 * the sign language dictionary.
 */

// Category labels for display
const CATEGORY_LABELS: Record<SignCategory, string> = {
  alphabet: 'Alphabet',
  numbers: 'Numbers',
  common: 'Common',
  greetings: 'Greetings',
  pronouns: 'Pronouns',
  questions: 'Questions',
  time: 'Time',
  colors: 'Colors',
  family: 'Family',
  food: 'Food',
  animals: 'Animals',
  emotions: 'Emotions',
  actions: 'Actions',
  descriptors: 'Descriptors',
  locations: 'Locations',
  technology: 'Technology',
  academic: 'Academic',
  medical: 'Medical',
  legal: 'Legal',
};

// Difficulty labels and colors
const DIFFICULTY_CONFIG: Record<SignDifficulty, { label: string; color: string }> = {
  beginner: { label: 'Beginner', color: '#22c55e' },
  intermediate: { label: 'Intermediate', color: '#f59e0b' },
  advanced: { label: 'Advanced', color: '#ef4444' },
};

// Sign Entry Card Component
interface SignEntryCardProps {
  entry: SignEntry;
  onClick: (entry: SignEntry) => void;
  isSelected?: boolean;
}

function SignEntryCard({ entry, onClick, isSelected }: SignEntryCardProps) {
  const diffConfig = DIFFICULTY_CONFIG[entry.difficulty];

  return (
    <div
      onClick={() => onClick(entry)}
      className={`
        p-4 rounded-lg border cursor-pointer transition-all
        ${isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
            {entry.gloss}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {entry.englishWord}
            {entry.englishAliases.length > 0 && `, ${entry.englishAliases.join(', ')}`}
          </p>
        </div>
        <span
          className="px-2 py-0.5 text-xs font-medium rounded-full"
          style={{
            backgroundColor: `${diffConfig.color}20`,
            color: diffConfig.color,
          }}
        >
          {diffConfig.label}
        </span>
      </div>

      {/* Category Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
          {CATEGORY_LABELS[entry.category]}
        </span>
        {entry.twoHanded && (
          <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 rounded text-purple-600 dark:text-purple-400">
            Two-Handed
          </span>
        )}
      </div>

      {/* Handshape Preview */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">Handshape:</span>{' '}
        {entry.handshape.dominant}
        {entry.handshape.nonDominant && ` + ${entry.handshape.nonDominant}`}
      </div>
    </div>
  );
}

// Sign Detail Modal Component
interface SignDetailModalProps {
  entry: SignEntry;
  onClose: () => void;
}

function SignDetailModal({ entry, onClose }: SignDetailModalProps) {
  const { relatedSigns, antonyms } = useRelatedSigns(entry.id);
  const diffConfig = DIFFICULTY_CONFIG[entry.difficulty];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-xl shadow-xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {entry.gloss}
            </h2>
            <span
              className="px-3 py-1 text-sm font-medium rounded-full"
              style={{
                backgroundColor: `${diffConfig.color}20`,
                color: diffConfig.color,
              }}
            >
              {diffConfig.label}
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {entry.englishWord}
          </p>
          {entry.englishAliases.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Also: {entry.englishAliases.join(', ')}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Definition */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Definition
            </h3>
            <p className="text-gray-700 dark:text-gray-300">{entry.definition}</p>
          </div>

          {/* Example */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Example
            </h3>
            <p className="text-gray-700 dark:text-gray-300 font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded">
              {entry.example}
            </p>
          </div>

          {/* Handshape Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Handshape
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Dominant Hand</p>
                <p className="font-medium text-gray-900 dark:text-white">{entry.handshape.dominant}</p>
              </div>
              {entry.handshape.nonDominant && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Non-Dominant Hand</p>
                  <p className="font-medium text-gray-900 dark:text-white">{entry.handshape.nonDominant}</p>
                </div>
              )}
            </div>
          </div>

          {/* Movement */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Movement
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Type</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">{entry.movement.type}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Speed</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">{entry.movement.speed}</p>
              </div>
              {entry.movement.repetitions && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Repetitions</p>
                  <p className="font-medium text-gray-900 dark:text-white">{entry.movement.repetitions}</p>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Location
            </h3>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reference</p>
              <p className="font-medium text-gray-900 dark:text-white capitalize">{entry.location.reference}</p>
            </div>
          </div>

          {/* Related Signs */}
          {relatedSigns.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Related Signs
              </h3>
              <div className="flex flex-wrap gap-2">
                {relatedSigns.map((related) => (
                  <span
                    key={related.id}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                  >
                    {related.gloss}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Antonyms */}
          {antonyms.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Antonyms
              </h3>
              <div className="flex flex-wrap gap-2">
                {antonyms.map((antonym) => (
                  <span
                    key={antonym.id}
                    className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm"
                  >
                    {antonym.gloss}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {entry.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Notes
              </h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm italic">
                {entry.notes}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-500">
              <span>Category: {CATEGORY_LABELS[entry.category]}</span>
              <span>Frequency: {entry.frequency}</span>
              {entry.twoHanded && <span>Two-Handed Sign</span>}
              {entry.symmetrical && <span>Symmetrical</span>}
              {entry.regionalVariants && entry.regionalVariants.length > 0 && (
                <span>Regional Variants: {entry.regionalVariants.join(', ')}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Category Filter Button
interface CategoryFilterProps {
  category: SignCategory | undefined;
  selectedCategory: SignCategory | undefined;
  onClick: (category: SignCategory | undefined) => void;
  count?: number;
}

function CategoryFilter({ category, selectedCategory, onClick, count }: CategoryFilterProps) {
  const isSelected = category === selectedCategory;
  const label = category ? CATEGORY_LABELS[category] : 'All';

  return (
    <button
      onClick={() => onClick(category)}
      className={`
        px-3 py-1.5 rounded-full text-sm font-medium transition-colors
        ${isSelected
          ? 'bg-blue-500 text-white'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }
      `}
    >
      {label}
      {count !== undefined && (
        <span className="ml-1 text-xs opacity-70">({count})</span>
      )}
    </button>
  );
}

// Quick Lookup Component
interface QuickLookupProps {
  className?: string;
}

export function QuickLookup({ className = '' }: QuickLookupProps) {
  const { word, setWord, entry, alternatives, found } = useSignLookup();

  return (
    <div className={`p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Quick Lookup
      </h3>
      <input
        type="text"
        value={word}
        onChange={(e) => setWord(e.target.value)}
        placeholder="Type a word..."
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {word && (
        <div className="mt-3">
          {found && entry ? (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="font-medium text-green-800 dark:text-green-400">
                {entry.gloss}
              </p>
              <p className="text-sm text-green-600 dark:text-green-500">
                {entry.englishWord}
              </p>
              {alternatives.length > 0 && (
                <p className="text-xs text-green-500 dark:text-green-600 mt-1">
                  +{alternatives.length} alternative{alternatives.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          ) : (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No sign found for &quot;{word}&quot;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main Browser Component
interface SignDictionaryBrowserProps {
  className?: string;
  initialCategory?: SignCategory;
  showQuickLookup?: boolean;
  onSignSelect?: (entry: SignEntry) => void;
}

export function SignDictionaryBrowser({
  className = '',
  initialCategory,
  showQuickLookup = true,
  onSignSelect,
}: SignDictionaryBrowserProps) {
  const {
    query,
    setQuery,
    category,
    setCategory,
    difficulty,
    setDifficulty,
    results,
    totalResults,
    isLoading,
    page,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    categories,
    entryCount,
  } = useSignDictionary({ initialCategory, pageSize: 12 });

  const [selectedEntry, setSelectedEntry] = useState<SignEntry | null>(null);

  const handleEntryClick = useCallback((entry: SignEntry) => {
    setSelectedEntry(entry);
    onSignSelect?.(entry);
  }, [onSignSelect]);

  const handleCloseModal = useCallback(() => {
    setSelectedEntry(null);
  }, []);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Sign Dictionary
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {entryCount} signs
          </span>
        </div>

        {/* Search Input */}
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search signs..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="space-y-3">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <CategoryFilter
              category={undefined}
              selectedCategory={category}
              onClick={setCategory}
            />
            {categories.map((cat) => (
              <CategoryFilter
                key={cat}
                category={cat}
                selectedCategory={category}
                onClick={setCategory}
              />
            ))}
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Difficulty:</span>
            <select
              value={difficulty || ''}
              onChange={(e) => setDifficulty(e.target.value as SignDifficulty || undefined)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Results Count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {totalResults} result{totalResults !== 1 ? 's' : ''}
              {query && ` for "${query}"`}
            </p>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 14a4 4 0 00-4-4H6a4 4 0 00-4 4v1a2 2 0 002 2h12a2 2 0 002-2v-1a4 4 0 00-4-4h-2a4 4 0 00-4 4"
                />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">No signs found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <>
              {/* Results Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((entry) => (
                  <SignEntryCard
                    key={entry.id}
                    entry={entry}
                    onClick={handleEntryClick}
                    isSelected={selectedEntry?.id === entry.id}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                  <button
                    onClick={prevPage}
                    disabled={!hasPrevPage}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={nextPage}
                    disabled={!hasNextPage}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        {showQuickLookup && (
          <div className="w-72 border-l border-gray-200 dark:border-gray-700 p-4 hidden lg:block">
            <QuickLookup />
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedEntry && (
        <SignDetailModal
          entry={selectedEntry}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export default SignDictionaryBrowser;
