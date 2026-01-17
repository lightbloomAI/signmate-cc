'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  getSignDictionary,
  type SignEntry,
  type SignCategory,
  type SignDifficulty,
  type SignSearchOptions,
  type SignSearchResult,
} from '@/lib/dictionary';

/**
 * useSignDictionary Hook
 *
 * React hook for searching and browsing the sign dictionary.
 */

interface UseSignDictionaryOptions {
  initialCategory?: SignCategory;
  initialDifficulty?: SignDifficulty;
  pageSize?: number;
}

interface UseSignDictionaryReturn {
  // Search state
  query: string;
  setQuery: (query: string) => void;
  category: SignCategory | undefined;
  setCategory: (category: SignCategory | undefined) => void;
  difficulty: SignDifficulty | undefined;
  setDifficulty: (difficulty: SignDifficulty | undefined) => void;

  // Results
  results: SignEntry[];
  totalResults: number;
  suggestions: string[];
  isLoading: boolean;

  // Pagination
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: () => void;
  prevPage: () => void;

  // Actions
  search: (options?: Partial<SignSearchOptions>) => void;
  getEntry: (id: string) => SignEntry | undefined;
  getByGloss: (gloss: string) => SignEntry | undefined;
  getByWord: (word: string) => SignEntry[];

  // Metadata
  categories: SignCategory[];
  entryCount: number;
}

export function useSignDictionary(
  options: UseSignDictionaryOptions = {}
): UseSignDictionaryReturn {
  const { initialCategory, initialDifficulty, pageSize = 20 } = options;

  const dictionary = useMemo(() => getSignDictionary(), []);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SignCategory | undefined>(initialCategory);
  const [difficulty, setDifficulty] = useState<SignDifficulty | undefined>(initialDifficulty);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SignSearchResult>({
    entries: [],
    total: 0,
    query: '',
  });

  // Perform search
  const search = useCallback(
    (overrideOptions?: Partial<SignSearchOptions>) => {
      setIsLoading(true);

      const searchOptions: SignSearchOptions = {
        query,
        category,
        difficulty,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        includeAliases: true,
        ...overrideOptions,
      };

      // Simulate async for UX
      requestAnimationFrame(() => {
        const result = dictionary.search(searchOptions);
        setSearchResult(result);
        setIsLoading(false);
      });
    },
    [dictionary, query, category, difficulty, page, pageSize]
  );

  // Auto-search on filter changes
  useEffect(() => {
    search();
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [query, category, difficulty]);

  // Pagination
  const totalPages = Math.ceil(searchResult.total / pageSize);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const nextPage = useCallback(() => {
    if (hasNextPage) setPage(p => p + 1);
  }, [hasNextPage]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) setPage(p => p - 1);
  }, [hasPrevPage]);

  // Entry accessors
  const getEntry = useCallback(
    (id: string) => dictionary.getEntry(id),
    [dictionary]
  );

  const getByGloss = useCallback(
    (gloss: string) => dictionary.getByGloss(gloss),
    [dictionary]
  );

  const getByWord = useCallback(
    (word: string) => dictionary.getByWord(word),
    [dictionary]
  );

  return {
    // Search state
    query,
    setQuery,
    category,
    setCategory,
    difficulty,
    setDifficulty,

    // Results
    results: searchResult.entries,
    totalResults: searchResult.total,
    suggestions: searchResult.suggestions || [],
    isLoading,

    // Pagination
    page,
    setPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,

    // Actions
    search,
    getEntry,
    getByGloss,
    getByWord,

    // Metadata
    categories: dictionary.getCategories(),
    entryCount: dictionary.getEntryCount(),
  };
}

/**
 * useSignLookup Hook
 *
 * Quick lookup hook for finding a single sign.
 */
export function useSignLookup(initialWord?: string) {
  const dictionary = useMemo(() => getSignDictionary(), []);
  const [word, setWord] = useState(initialWord || '');
  const [entry, setEntry] = useState<SignEntry | undefined>();
  const [alternatives, setAlternatives] = useState<SignEntry[]>([]);

  useEffect(() => {
    if (!word) {
      setEntry(undefined);
      setAlternatives([]);
      return;
    }

    // Try exact match first
    const entries = dictionary.getByWord(word);
    if (entries.length > 0) {
      setEntry(entries[0]);
      setAlternatives(entries.slice(1));
    } else {
      // Try gloss match
      const glossMatch = dictionary.getByGloss(word);
      if (glossMatch) {
        setEntry(glossMatch);
        setAlternatives([]);
      } else {
        setEntry(undefined);
        setAlternatives([]);
      }
    }
  }, [dictionary, word]);

  return {
    word,
    setWord,
    entry,
    alternatives,
    found: !!entry,
  };
}

/**
 * useRelatedSigns Hook
 *
 * Get related signs for a given entry.
 */
export function useRelatedSigns(entryId: string | undefined) {
  const dictionary = useMemo(() => getSignDictionary(), []);
  const [relatedSigns, setRelatedSigns] = useState<SignEntry[]>([]);
  const [antonyms, setAntonyms] = useState<SignEntry[]>([]);

  useEffect(() => {
    if (!entryId) {
      setRelatedSigns([]);
      setAntonyms([]);
      return;
    }

    const entry = dictionary.getEntry(entryId);
    if (!entry) {
      setRelatedSigns([]);
      setAntonyms([]);
      return;
    }

    // Get related signs
    const related = (entry.relatedSigns || [])
      .map(id => dictionary.getEntry(id) || dictionary.getByGloss(id))
      .filter((e): e is SignEntry => !!e);
    setRelatedSigns(related);

    // Get antonyms
    const opposites = (entry.antonyms || [])
      .map(id => dictionary.getEntry(id) || dictionary.getByGloss(id))
      .filter((e): e is SignEntry => !!e);
    setAntonyms(opposites);
  }, [dictionary, entryId]);

  return { relatedSigns, antonyms };
}
