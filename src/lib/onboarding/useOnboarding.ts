'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getOnboardingManager,
  type Tour,
  type TourStep,
  type HelpArticle,
  type KeyboardShortcut,
  type OnboardingState,
} from './onboardingManager';

/**
 * useOnboarding Hook
 *
 * Main hook for accessing onboarding functionality.
 */
export function useOnboarding() {
  const manager = useMemo(() => getOnboardingManager(), []);
  const [state, setState] = useState<OnboardingState>(manager.getState());

  useEffect(() => {
    const unsubscribe = manager.subscribe(() => {
      setState(manager.getState());
    });
    return unsubscribe;
  }, [manager]);

  const startTour = useCallback(
    (tourId: string) => manager.startTour(tourId),
    [manager]
  );

  const nextStep = useCallback(() => manager.nextStep(), [manager]);
  const prevStep = useCallback(() => manager.prevStep(), [manager]);
  const skipTour = useCallback(() => manager.skipTour(), [manager]);
  const completeTour = useCallback(() => manager.completeTour(), [manager]);

  const isTourComplete = useCallback(
    (tourId: string) => manager.isTourComplete(tourId),
    [manager]
  );

  const markVisited = useCallback(() => manager.markVisited(), [manager]);
  const resetProgress = useCallback(() => manager.resetProgress(), [manager]);

  return {
    // State
    isFirstVisit: state.firstVisit,
    currentTourId: state.currentTour,
    currentStepIndex: state.currentStep,
    completedTours: state.completedTours,

    // Tour control
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    isTourComplete,

    // First visit
    markVisited,
    shouldShowWelcome: manager.shouldShowWelcomeTour(),

    // Reset
    resetProgress,

    // Manager access
    manager,
  };
}

/**
 * useTour Hook
 *
 * Hook for managing a specific tour.
 */
export function useTour(tourId: string) {
  const manager = useMemo(() => getOnboardingManager(), []);
  const [currentStep, setCurrentStep] = useState<TourStep | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const unsubscribe = manager.subscribe(() => {
      const currentTour = manager.getCurrentTour();
      setIsActive(currentTour?.id === tourId);
      setCurrentStep(manager.getCurrentStep());
      setStepIndex(manager.getCurrentStepIndex());
      setTotalSteps(manager.getTotalSteps());
    });
    return unsubscribe;
  }, [manager, tourId]);

  const tour = useMemo(() => manager.getTour(tourId), [manager, tourId]);
  const isComplete = useMemo(
    () => manager.isTourComplete(tourId),
    [manager, tourId]
  );

  const start = useCallback(() => manager.startTour(tourId), [manager, tourId]);
  const next = useCallback(() => manager.nextStep(), [manager]);
  const prev = useCallback(() => manager.prevStep(), [manager]);
  const skip = useCallback(() => manager.skipTour(), [manager]);
  const complete = useCallback(() => manager.completeTour(), [manager]);

  return {
    tour,
    isActive,
    isComplete,
    currentStep,
    stepIndex,
    totalSteps,
    start,
    next,
    prev,
    skip,
    complete,
  };
}

/**
 * useWelcomeTour Hook
 *
 * Specialized hook for the welcome tour.
 */
export function useWelcomeTour() {
  const manager = useMemo(() => getOnboardingManager(), []);
  const [shouldShow, setShouldShow] = useState(manager.shouldShowWelcomeTour());

  useEffect(() => {
    const unsubscribe = manager.subscribe(() => {
      setShouldShow(manager.shouldShowWelcomeTour());
    });
    return unsubscribe;
  }, [manager]);

  const start = useCallback(() => {
    manager.startTour('welcome');
    manager.markVisited();
  }, [manager]);

  const dismiss = useCallback(() => {
    manager.markVisited();
  }, [manager]);

  return {
    shouldShow,
    start,
    dismiss,
  };
}

/**
 * useTooltip Hook
 *
 * Hook for managing dismissible tooltips.
 */
export function useTooltip(tooltipId: string) {
  const manager = useMemo(() => getOnboardingManager(), []);
  const [isDismissed, setIsDismissed] = useState(
    manager.isTooltipDismissed(tooltipId)
  );

  const dismiss = useCallback(() => {
    manager.dismissTooltip(tooltipId);
    setIsDismissed(true);
  }, [manager, tooltipId]);

  return {
    isVisible: !isDismissed,
    dismiss,
  };
}

/**
 * useHelpArticles Hook
 *
 * Hook for searching and browsing help articles.
 */
export function useHelpArticles() {
  const manager = useMemo(() => getOnboardingManager(), []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => manager.getCategories(), [manager]);
  const allArticles = useMemo(() => manager.getAllArticles(), [manager]);

  const articles = useMemo(() => {
    let result = allArticles;

    if (selectedCategory) {
      result = result.filter(a => a.category === selectedCategory);
    }

    if (searchQuery) {
      result = manager.searchArticles(searchQuery);
      if (selectedCategory) {
        result = result.filter(a => a.category === selectedCategory);
      }
    }

    return result;
  }, [manager, allArticles, searchQuery, selectedCategory]);

  const getArticle = useCallback(
    (id: string) => manager.getArticle(id),
    [manager]
  );

  return {
    articles,
    categories,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    getArticle,
  };
}

/**
 * useKeyboardShortcuts Hook
 *
 * Hook for accessing keyboard shortcuts.
 */
export function useKeyboardShortcuts() {
  const manager = useMemo(() => getOnboardingManager(), []);

  const shortcuts = useMemo(() => manager.getShortcuts(), [manager]);
  const shortcutsByCategory = useMemo(
    () => manager.getShortcutsByCategory(),
    [manager]
  );

  const formatShortcut = useCallback((shortcut: KeyboardShortcut): string => {
    return shortcut.keys.join(' + ');
  }, []);

  return {
    shortcuts,
    shortcutsByCategory,
    formatShortcut,
  };
}

/**
 * useTourStepPosition Hook
 *
 * Hook for calculating tour step spotlight position.
 */
export function useTourStepPosition(targetSelector: string | null) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!targetSelector) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const element = document.querySelector(targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        });
      } else {
        setPosition(null);
      }
    };

    updatePosition();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [targetSelector]);

  return position;
}

/**
 * useHelpSearch Hook
 *
 * Hook for quick help search functionality.
 */
export function useHelpSearch() {
  const manager = useMemo(() => getOnboardingManager(), []);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HelpArticle[]>([]);

  useEffect(() => {
    if (query.length >= 2) {
      const searchResults = manager.searchArticles(query);
      setResults(searchResults.slice(0, 5));
    } else {
      setResults([]);
    }
  }, [manager, query]);

  return {
    query,
    setQuery,
    results,
    hasResults: results.length > 0,
  };
}
