/**
 * Onboarding Manager
 *
 * Manages user onboarding tours, help tooltips, and contextual guidance.
 */

// Tour step definition
export interface TourStep {
  id: string;
  target: string; // CSS selector for the target element
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  spotlightPadding?: number;
  disableInteraction?: boolean;
  beforeShow?: () => void | Promise<void>;
  afterShow?: () => void | Promise<void>;
  onSkip?: () => void;
}

// Tour definition
export interface Tour {
  id: string;
  name: string;
  description: string;
  steps: TourStep[];
  showOnFirstVisit?: boolean;
  completionRequired?: boolean;
}

// Onboarding state
export interface OnboardingState {
  completedTours: string[];
  dismissedTooltips: string[];
  firstVisit: boolean;
  currentTour: string | null;
  currentStep: number;
}

// Help article
export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  relatedArticles?: string[];
}

// Keyboard shortcut
export interface KeyboardShortcut {
  id: string;
  keys: string[];
  description: string;
  category: string;
  action?: () => void;
}

// Default tours
const DEFAULT_TOURS: Tour[] = [
  {
    id: 'welcome',
    name: 'Welcome to SignMate',
    description: 'Get started with the basics of SignMate',
    showOnFirstVisit: true,
    steps: [
      {
        id: 'welcome-intro',
        target: 'body',
        title: 'Welcome to SignMate!',
        content: 'SignMate is a real-time AI sign language interpreter for live events. Let us show you around.',
        placement: 'center',
      },
      {
        id: 'welcome-controls',
        target: '[data-tour="controls"]',
        title: 'Main Controls',
        content: 'These are the main controls for starting and stopping interpretation.',
        placement: 'bottom',
      },
      {
        id: 'welcome-avatar',
        target: '[data-tour="avatar"]',
        title: 'Sign Language Avatar',
        content: 'The avatar displays sign language in real-time as speech is translated.',
        placement: 'left',
      },
      {
        id: 'welcome-captions',
        target: '[data-tour="captions"]',
        title: 'Live Captions',
        content: 'Captions show the spoken text being interpreted.',
        placement: 'top',
      },
    ],
  },
  {
    id: 'operator-basics',
    name: 'Operator Guide',
    description: 'Learn how to operate SignMate during a live event',
    steps: [
      {
        id: 'op-start',
        target: '[data-tour="start-button"]',
        title: 'Start Interpretation',
        content: 'Click this button or press Ctrl+Space to start real-time interpretation.',
        placement: 'bottom',
      },
      {
        id: 'op-monitor',
        target: '[data-tour="monitor"]',
        title: 'Status Monitor',
        content: 'Keep an eye on the status indicators to ensure everything is working properly.',
        placement: 'left',
      },
      {
        id: 'op-settings',
        target: '[data-tour="settings"]',
        title: 'Quick Settings',
        content: 'Access audio, display, and performance settings here.',
        placement: 'bottom',
      },
    ],
  },
  {
    id: 'dictionary-tour',
    name: 'Sign Dictionary',
    description: 'Learn how to use the sign dictionary',
    steps: [
      {
        id: 'dict-search',
        target: '[data-tour="dict-search"]',
        title: 'Search Signs',
        content: 'Search for signs by English word or ASL gloss.',
        placement: 'bottom',
      },
      {
        id: 'dict-filters',
        target: '[data-tour="dict-filters"]',
        title: 'Filter by Category',
        content: 'Filter signs by category like greetings, questions, or actions.',
        placement: 'bottom',
      },
      {
        id: 'dict-details',
        target: '[data-tour="dict-entry"]',
        title: 'Sign Details',
        content: 'Click on a sign to see detailed information about handshape, movement, and usage.',
        placement: 'right',
      },
    ],
  },
];

// Default keyboard shortcuts
const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: 'toggle-interpretation',
    keys: ['Ctrl', 'Space'],
    description: 'Start/stop interpretation',
    category: 'General',
  },
  {
    id: 'toggle-fullscreen',
    keys: ['Ctrl', 'F'],
    description: 'Toggle fullscreen mode',
    category: 'Display',
  },
  {
    id: 'view-operator',
    keys: ['Ctrl', '1'],
    description: 'Switch to operator view',
    category: 'Views',
  },
  {
    id: 'view-stage',
    keys: ['Ctrl', '2'],
    description: 'Switch to stage view',
    category: 'Views',
  },
  {
    id: 'view-monitor',
    keys: ['Ctrl', '3'],
    description: 'Switch to monitor view',
    category: 'Views',
  },
  {
    id: 'view-minimal',
    keys: ['Ctrl', '4'],
    description: 'Switch to minimal view',
    category: 'Views',
  },
  {
    id: 'open-settings',
    keys: ['Ctrl', ','],
    description: 'Open settings',
    category: 'General',
  },
  {
    id: 'open-help',
    keys: ['F1'],
    description: 'Open help center',
    category: 'General',
  },
  {
    id: 'toggle-captions',
    keys: ['C'],
    description: 'Toggle captions',
    category: 'Display',
  },
  {
    id: 'increase-avatar-size',
    keys: ['Ctrl', '+'],
    description: 'Increase avatar size',
    category: 'Avatar',
  },
  {
    id: 'decrease-avatar-size',
    keys: ['Ctrl', '-'],
    description: 'Decrease avatar size',
    category: 'Avatar',
  },
  {
    id: 'reset-avatar-position',
    keys: ['Ctrl', '0'],
    description: 'Reset avatar position',
    category: 'Avatar',
  },
];

// Default help articles
const DEFAULT_ARTICLES: HelpArticle[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with SignMate',
    category: 'Basics',
    content: `
## Welcome to SignMate

SignMate is a real-time AI-powered sign language interpreter designed for live events.

### Quick Start
1. Connect your microphone
2. Click "Start" or press Ctrl+Space
3. Speak naturally and watch the avatar sign in real-time

### Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Working microphone
- Stable internet connection
    `,
    tags: ['getting started', 'basics', 'introduction'],
  },
  {
    id: 'audio-setup',
    title: 'Setting Up Audio',
    category: 'Setup',
    content: `
## Audio Configuration

Good audio quality is essential for accurate interpretation.

### Selecting a Microphone
1. Open Settings > Audio
2. Select your preferred microphone
3. Test the audio levels

### Tips for Best Results
- Use a dedicated microphone when possible
- Reduce background noise
- Speak clearly and at a moderate pace
- Position the microphone 6-12 inches from your mouth
    `,
    tags: ['audio', 'microphone', 'setup'],
    relatedArticles: ['getting-started'],
  },
  {
    id: 'live-event-tips',
    title: 'Tips for Live Events',
    category: 'Best Practices',
    content: `
## Running SignMate at Live Events

### Before the Event
- Test all equipment at the venue
- Confirm microphone placement
- Run a practice session
- Set up backup equipment

### During the Event
- Monitor the status indicators
- Have an operator dedicated to SignMate
- Be ready to switch to manual captions if needed

### Troubleshooting
- If interpretation stops, check the audio connection
- Refresh the page if you see errors
- Contact support for persistent issues
    `,
    tags: ['live events', 'tips', 'best practices'],
    relatedArticles: ['audio-setup', 'troubleshooting'],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting Common Issues',
    category: 'Support',
    content: `
## Common Issues and Solutions

### No Audio Detected
- Check microphone permissions in browser
- Verify microphone is connected
- Try a different microphone

### Avatar Not Moving
- Check internet connection
- Refresh the page
- Clear browser cache

### High Latency
- Close other browser tabs
- Check internet speed
- Reduce video quality settings

### Interpretation Errors
- Speak more clearly
- Reduce background noise
- Check microphone positioning
    `,
    tags: ['troubleshooting', 'support', 'issues'],
  },
  {
    id: 'accessibility',
    title: 'Accessibility Features',
    category: 'Accessibility',
    content: `
## Accessibility Options

SignMate is designed to be accessible to all users.

### Visual Accessibility
- High contrast mode
- Large text option
- Color blind friendly palettes

### Audio Accessibility
- Visual alerts for audio events
- Captions always available

### Keyboard Navigation
- Full keyboard support
- Customizable shortcuts
- Focus indicators

### Screen Readers
- ARIA labels throughout
- Live region announcements
- Optimized content structure
    `,
    tags: ['accessibility', 'a11y', 'inclusive'],
  },
];

// Storage key
const STORAGE_KEY = 'signmate:onboarding';

/**
 * OnboardingManager Class
 */
export class OnboardingManager {
  private state: OnboardingState;
  private tours: Map<string, Tour> = new Map();
  private articles: Map<string, HelpArticle> = new Map();
  private shortcuts: KeyboardShortcut[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.loadState();
    this.initializeDefaults();
  }

  private loadState(): OnboardingState {
    if (typeof window === 'undefined') {
      return {
        completedTours: [],
        dismissedTooltips: [],
        firstVisit: true,
        currentTour: null,
        currentStep: 0,
      };
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore errors
    }

    return {
      completedTours: [],
      dismissedTooltips: [],
      firstVisit: true,
      currentTour: null,
      currentStep: 0,
    };
  }

  private saveState(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Ignore errors
    }
  }

  private initializeDefaults(): void {
    DEFAULT_TOURS.forEach(tour => this.tours.set(tour.id, tour));
    DEFAULT_ARTICLES.forEach(article => this.articles.set(article.id, article));
    this.shortcuts = [...DEFAULT_SHORTCUTS];
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // State subscription
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Tour management
  getTour(id: string): Tour | undefined {
    return this.tours.get(id);
  }

  getAllTours(): Tour[] {
    return Array.from(this.tours.values());
  }

  registerTour(tour: Tour): void {
    this.tours.set(tour.id, tour);
  }

  startTour(tourId: string): boolean {
    const tour = this.tours.get(tourId);
    if (!tour || tour.steps.length === 0) return false;

    this.state.currentTour = tourId;
    this.state.currentStep = 0;
    this.saveState();
    this.notifyListeners();
    return true;
  }

  nextStep(): boolean {
    if (!this.state.currentTour) return false;

    const tour = this.tours.get(this.state.currentTour);
    if (!tour) return false;

    if (this.state.currentStep < tour.steps.length - 1) {
      this.state.currentStep++;
      this.saveState();
      this.notifyListeners();
      return true;
    }

    // Tour complete
    this.completeTour();
    return false;
  }

  prevStep(): boolean {
    if (!this.state.currentTour || this.state.currentStep === 0) return false;

    this.state.currentStep--;
    this.saveState();
    this.notifyListeners();
    return true;
  }

  skipTour(): void {
    if (!this.state.currentTour) return;

    const tour = this.tours.get(this.state.currentTour);
    const step = tour?.steps[this.state.currentStep];
    step?.onSkip?.();

    this.state.currentTour = null;
    this.state.currentStep = 0;
    this.saveState();
    this.notifyListeners();
  }

  completeTour(): void {
    if (!this.state.currentTour) return;

    if (!this.state.completedTours.includes(this.state.currentTour)) {
      this.state.completedTours.push(this.state.currentTour);
    }

    this.state.currentTour = null;
    this.state.currentStep = 0;
    this.saveState();
    this.notifyListeners();
  }

  isTourComplete(tourId: string): boolean {
    return this.state.completedTours.includes(tourId);
  }

  getCurrentTour(): Tour | null {
    return this.state.currentTour ? this.tours.get(this.state.currentTour) || null : null;
  }

  getCurrentStep(): TourStep | null {
    const tour = this.getCurrentTour();
    return tour?.steps[this.state.currentStep] || null;
  }

  getCurrentStepIndex(): number {
    return this.state.currentStep;
  }

  getTotalSteps(): number {
    const tour = this.getCurrentTour();
    return tour?.steps.length || 0;
  }

  // Tooltip management
  dismissTooltip(tooltipId: string): void {
    if (!this.state.dismissedTooltips.includes(tooltipId)) {
      this.state.dismissedTooltips.push(tooltipId);
      this.saveState();
    }
  }

  isTooltipDismissed(tooltipId: string): boolean {
    return this.state.dismissedTooltips.includes(tooltipId);
  }

  resetTooltips(): void {
    this.state.dismissedTooltips = [];
    this.saveState();
    this.notifyListeners();
  }

  // First visit handling
  isFirstVisit(): boolean {
    return this.state.firstVisit;
  }

  markVisited(): void {
    this.state.firstVisit = false;
    this.saveState();
  }

  shouldShowWelcomeTour(): boolean {
    return this.state.firstVisit && !this.isTourComplete('welcome');
  }

  // Help articles
  getArticle(id: string): HelpArticle | undefined {
    return this.articles.get(id);
  }

  getAllArticles(): HelpArticle[] {
    return Array.from(this.articles.values());
  }

  getArticlesByCategory(category: string): HelpArticle[] {
    return this.getAllArticles().filter(a => a.category === category);
  }

  searchArticles(query: string): HelpArticle[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllArticles().filter(article =>
      article.title.toLowerCase().includes(lowerQuery) ||
      article.content.toLowerCase().includes(lowerQuery) ||
      article.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    this.getAllArticles().forEach(a => categories.add(a.category));
    return Array.from(categories);
  }

  // Keyboard shortcuts
  getShortcuts(): KeyboardShortcut[] {
    return [...this.shortcuts];
  }

  getShortcutsByCategory(): Record<string, KeyboardShortcut[]> {
    const grouped: Record<string, KeyboardShortcut[]> = {};
    this.shortcuts.forEach(shortcut => {
      if (!grouped[shortcut.category]) {
        grouped[shortcut.category] = [];
      }
      grouped[shortcut.category].push(shortcut);
    });
    return grouped;
  }

  registerShortcut(shortcut: KeyboardShortcut): void {
    this.shortcuts.push(shortcut);
  }

  // Reset
  resetProgress(): void {
    this.state = {
      completedTours: [],
      dismissedTooltips: [],
      firstVisit: true,
      currentTour: null,
      currentStep: 0,
    };
    this.saveState();
    this.notifyListeners();
  }

  getState(): OnboardingState {
    return { ...this.state };
  }
}

// Singleton
let onboardingInstance: OnboardingManager | null = null;

export function getOnboardingManager(): OnboardingManager {
  if (!onboardingInstance) {
    onboardingInstance = new OnboardingManager();
  }
  return onboardingInstance;
}
