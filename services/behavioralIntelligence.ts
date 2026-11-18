
import { AppMode, AppTab } from '../types';

export interface BehavioralState {
  lastInterventionTime: number;
  scrollStartTime: number | null;
  lastTabSwitchTime: number;
  switchCount: number;
  lastInteractionTime: number;
  interactionCount: number;
  hasGreetedToday: boolean;
  morningGreetingShown: boolean;
  nightGreetingShown: boolean;
}

const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes
const EXTREME_COOLDOWN_MS = 5 * 60 * 1000; // Shorter if extreme behavior

export const behavioralSuggestions = {
  scrolling: [
    { text: "Still scrolling? Start focus or continue?", tone: 'gentle' },
    { text: "Endless scrolling detected. Start 5 min focus?", tone: 'assertive' }
  ],
  switching: [
    { text: "Too many switches. Start 5 min focus?", tone: 'gentle' },
    { text: "Scattered rhythm. Pick one priority for 5 mins?", tone: 'assertive' }
  ],
  inactivity: [
    { text: "Focus session active but idle. Revive or end sync?", tone: 'assertive' },
    { text: "Neural momentum stalled. Reset with 5 min focus?", tone: 'gentle' }
  ],
  morning: [
    { text: "Neural uplink ready. Start first 5 min focus?", tone: 'assertive' },
    { text: "Fresh start. Begin your first streak today?", tone: 'gentle' }
  ],
  night: [
    { text: "Winding down. Prepare for tomorrow or close up?", tone: 'assertive' },
    { text: "You did enough. Reflect or rest?", tone: 'gentle' }
  ],
  streak: [
    { text: "3 days strong. Push for 4 or recovery?", tone: 'assertive' },
    { text: "Nice streak! Keep going or take a break?", tone: 'gentle' }
  ]
};

export const getSuggestion = (type: keyof typeof behavioralSuggestions, preferredTone: 'gentle' | 'assertive' = 'gentle') => {
  const suggestions = behavioralSuggestions[type].filter(s => s.tone === preferredTone);
  const pool = suggestions.length > 0 ? suggestions : behavioralSuggestions[type];
  return pool[Math.floor(Math.random() * pool.length)];
};
