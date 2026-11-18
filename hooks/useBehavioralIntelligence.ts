import { useState, useEffect, useRef, useCallback } from 'react';
import { AppMode, AppTab } from '../types';
import { getSuggestion, behavioralSuggestions } from '../services/behavioralIntelligence';

interface BehavioralHookProps {
  activeTab: AppTab;
  currentMode: AppMode;
  showToast: (message: string, type?: 'info' | 'success') => void;
  onNudge: (message: string, type: keyof typeof behavioralSuggestions) => void;
  onPatternDetected: (type: 'distraction' | 'focus_peak' | 'procrastination') => void;
  onAction?: (action: string) => void;
  preferredTone?: 'gentle' | 'assertive';
}

export const useBehavioralIntelligence = ({
  activeTab,
  currentMode,
  showToast,
  onNudge,
  onPatternDetected,
  preferredTone = 'gentle'
}: BehavioralHookProps) => {
  const [lastInterventionTime, setLastInterventionTime] = useState<number>(0);
  const [switchCount, setSwitchCount] = useState<number>(0);
  const [lastTabSwitchTime, setLastTabSwitchTime] = useState<number>(Date.now());
  const [scrollStartTime, setScrollStartTime] = useState<number | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTriggersRef = useRef<{ morning?: string; night?: string }>({});

  const COOLDOWN_MS = 15 * 60 * 1000;
  const EXTREME_SCROLL_MS = 10 * 60 * 1000; // 10 minutes
  const INACTIVITY_MS = 5 * 60 * 1000; // 5 minutes

  const triggerIntervention = useCallback(
    (type: keyof typeof behavioralSuggestions, force: boolean = false) => {
      if (currentMode === AppMode.GHOST) {
        return;
      }
      const now = Date.now();
      if (!force && now - lastInterventionTime < COOLDOWN_MS) {
        return;
      }

      const suggestion = getSuggestion(type, preferredTone);
      if (['scrolling', 'switching', 'inactivity', 'morning'].includes(type)) {
        onNudge(suggestion.text, type);
        onPatternDetected(type === 'inactivity' ? 'procrastination' : 'distraction');
      } else {
        showToast(suggestion.text, 'info');
      }

      setLastInterventionTime(now);
    },
    [currentMode, lastInterventionTime, preferredTone, showToast, onNudge, onPatternDetected]
  );

  // Tab Switch Trigger
  useEffect(() => {
    const now = Date.now();
    if (now - lastTabSwitchTime < 5000) {
      const newCount = switchCount + 1;
      setSwitchCount(newCount);
      if (newCount >= 3) {
        triggerIntervention('switching');
        setSwitchCount(0);
      }
    } else {
      setSwitchCount(1);
    }
    setLastTabSwitchTime(now);
  }, [activeTab]);

  // Scroll Trigger
  useEffect(() => {
    if (activeTab !== AppTab.EXPLORE) {
      setScrollStartTime(null);
      return;
    }

    const handleScroll = () => {
      if (!scrollStartTime) {
        setScrollStartTime(Date.now());
      }

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setScrollStartTime(null);
      }, 10000);

      if (scrollStartTime) {
        const scrollDuration = Date.now() - scrollStartTime;
        if (scrollDuration > EXTREME_SCROLL_MS) {
          const isExtreme = scrollDuration > 25 * 60 * 1000;
          triggerIntervention('scrolling', isExtreme);
          setScrollStartTime(Date.now());
        }
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [activeTab, scrollStartTime, triggerIntervention]);

  // Inactivity during Focus Trigger
  useEffect(() => {
    if (currentMode !== AppMode.FOCUS) return;

    const resetInactivity = () => {
      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
      interactionTimeoutRef.current = setTimeout(() => {
        triggerIntervention('inactivity');
      }, INACTIVITY_MS);
    };

    window.addEventListener('mousemove', resetInactivity);
    window.addEventListener('keydown', resetInactivity);
    window.addEventListener('click', resetInactivity);
    window.addEventListener('touchstart', resetInactivity);

    resetInactivity();

    return () => {
      window.removeEventListener('mousemove', resetInactivity);
      window.removeEventListener('keydown', resetInactivity);
      window.removeEventListener('click', resetInactivity);
      window.removeEventListener('touchstart', resetInactivity);
      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    };
  }, [currentMode, triggerIntervention]);

  // Morning / Night behavioral prompts (in-memory only, Ghost mode skipped)
  useEffect(() => {
    if (currentMode === AppMode.GHOST) return;
    const hours = new Date().getHours();
    const today = new Date().toDateString();

    if (hours >= 5 && hours < 11 && sessionTriggersRef.current.morning !== today) {
      const t = setTimeout(() => {
        triggerIntervention('morning');
        sessionTriggersRef.current.morning = today;
      }, 2000);
      return () => clearTimeout(t);
    } else if ((hours >= 22 || hours < 2) && sessionTriggersRef.current.night !== today) {
      const t = setTimeout(() => {
        triggerIntervention('night');
        sessionTriggersRef.current.night = today;
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [currentMode, triggerIntervention]);

  return {
    triggerIntervention
  };
};
