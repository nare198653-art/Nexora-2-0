
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  AppTab,
  AppMode,
  Post,
  UserProfile,
  UserInteraction,
  SocialSubTab,
  ActiveSession,
  Task,
  ChatMessage,
  DirectMessage,
  SupportedLanguage,
  AiActionDispatcher,
  AiActionResult,
  AiPendingAction,
  FocusSessionRecord,
  DailyDebriefRecord
} from './types';
import { useLanguage, useTranslation } from './localization/LanguageContext';
import { geminiService } from './services/geminiService';
import { behavioralSuggestions } from './services/behavioralIntelligence';
import { runJourneyEngine } from './services/journeyEngine';
import Sidebar from './components/Sidebar';
import HomeView from './components/HomeView';
import ExploreView from './components/ExploreView';
import ModesView from './components/ModesView';
import AIBrainView from './components/AIBrainView';
import ProfileView from './components/ProfileView';
import { CreatorView } from './components/CreatorView';
import OnboardingView from './components/OnboardingView';
import CalibrationView from './components/CalibrationView';
import { useBehavioralIntelligence } from './hooks/useBehavioralIntelligence';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ChevronDown, Check, Zap, Target, Coffee, Ghost, Palette, ShieldCheck, Music, X as CloseIcon, Volume2, Square, Search, Cpu, Send, ChevronLeft, Radio, Clock, Signal, Users2, Globe, Activity, ExternalLink, Layers, Plus } from 'lucide-react';
import PopoutWindowManager, { PoppedOutWindowConfig } from './components/PopoutWindowManager';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { DailyDebriefModal } from './components/DailyDebriefModal';
import { getWorkspaceUid } from './firebase';
import { nexoraFirestoreService } from './services/nexoraFirestoreService';

const INITIAL_POSTS: Post[] = [
  { 
    id: 'v-1', 
    creator: 'NeuralSync Studios', 
    avatar: 'https://i.pravatar.cc/150?u=neural', 
    content: 'Watch how we architected the Nexora Core. The future of neural super-apps is built on latency-free intelligence.', 
    image: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=800',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 
    likes: 8900, 
    hasLiked: false, 
    comments: [], 
    shares: 1200, 
    tags: ['tech', 'engineering', 'nexora'], 
    type: 'growth',
    contentType: 'video',
    visibility: 'public',
    relevanceReason: 'Directly related to your interest in software architecture and high-performance systems.',
    isFollowing: true
  },
  { 
    id: '1', 
    creator: 'MindsetMastery', 
    avatar: 'https://i.pravatar.cc/150?u=mindset', 
    content: 'Discipline is the bridge between goals and accomplishment. Most people fail because they quit right before the breakthrough.', 
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800', 
    likes: 1240, 
    hasLiked: false, 
    comments: [], 
    shares: 45, 
    tags: ['mindset', 'growth'], 
    type: 'growth',
    contentType: 'video',
    visibility: 'public',
    relevanceReason: 'Highly aligned with your "Mental Fortitude" goal and recent interest in Stoic philosophy (98% match).',
    isFollowing: true
  },
  { 
    id: 'course-1', 
    creator: 'Nexora Academy', 
    avatar: 'https://i.pravatar.cc/150?u=nexacademy', 
    content: 'MASTERCLASS: Building Autonomous Agents with Gemini. Learn how to architect systems that think, plan, and execute.', 
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800', 
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    likes: 5600, 
    hasLiked: false, 
    comments: [], 
    shares: 890, 
    tags: ['courses', 'ai', 'dev'], 
    type: 'educational',
    contentType: 'video',
    visibility: 'public',
    price: 9.99,
    relevanceReason: 'Critical learning path for your project "Autonomous Dashboard".',
    isFollowing: false,
    courseTitle: 'Masterclass: Building Autonomous Agents',
    courseProviderType: 'company',
    courseDuration: '6 Weeks',
    courseTimeRequirement: '4 hours/week',
    courseDescription: 'An intensive, hands-on syllabus walking you through semantic memory nodes, multi-agent frameworks, tool usage protocols, and state authorization pipelines using the Gemini API.',
    courseSyllabus: [
      'Chapter 1: Agent Architecture & Foundations',
      'Chapter 2: Semantic Memory & RAG Systems',
      'Chapter 3: Autonomous Action Pipelines & Tool-use',
      'Chapter 4: Advanced Multi-Agent Collaboration',
      'Chapter 5: Guardrails, Evaluation & Production Ops'
    ],
    courseRating: 4.9
  },
  { 
    id: 'course-2', 
    creator: 'GrowthOS', 
    avatar: 'https://i.pravatar.cc/150?u=growthos', 
    content: 'The 10-Day Stoic Leadership Intensive. A practical course on applying ancient wisdom to modern high-stakes environments.', 
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=800', 
    likes: 2100, 
    hasLiked: false, 
    comments: [], 
    shares: 150, 
    tags: ['courses', 'stoicism', 'leadership'], 
    type: 'educational',
    contentType: 'video',
    visibility: 'public',
    price: 4.50,
    relevanceReason: 'Recommended based on your leadership profile and "Stoic Pioneer" badge (85% relevance).',
    isFollowing: true,
    courseTitle: '10-Day Stoic Leadership Intensive',
    courseProviderType: 'company',
    courseDuration: '10 Days',
    courseTimeRequirement: '45 mins/day',
    courseDescription: 'Ancient wisdom tailored directly for contemporary founders and executives working in high-stress, rapid scale environments. Learn the daily practices of Marcus Aurelius, Seneca, and Epictetus to optimize your decisiveness.',
    courseSyllabus: [
      'Day 1: Demystifying Control (The Dichotomy of Control)',
      'Day 2: Mastering the Inner Citadel',
      'Day 3: Amor Fati & Embracing Uncertainty',
      'Day 4: View From Above (Broadening Perspective)',
      'Day 5: Premeditatio Malorum (Negative Visualization)',
      'Day 6: Voluntary Discomfort Exercises',
      'Day 7: The Art of Rational Empathy',
      'Day 8: Indifferent Preferred vs. Non-preferred',
      'Day 9: Crafting Marcus Aurelius\'s Journaling Routine',
      'Day 10: Integrating Into Your Daily Flow'
    ],
    courseRating: 4.8
  },
  { 
    id: 'm-1', 
    creator: 'ZenDaily', 
    avatar: 'https://i.pravatar.cc/150?u=zen', 
    content: 'Morning mindfulness session. Resetting the neural baseline.',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800', 
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    likes: 12400, 
    hasLiked: false, 
    comments: [], 
    shares: 12, 
    tags: ['peace', 'meditation'], 
    type: 'motivational',
    contentType: 'reel',
    visibility: 'public',
    relevanceReason: 'Suggested to optimize cortisol levels after high cognitive load detected.',
    isFollowing: false
  },
  { 
    id: 'm-2', 
    creator: 'BioForge', 
    avatar: 'https://i.pravatar.cc/150?u=bioforge', 
    content: 'Deep sleep optimization is the highest ROI hack.',
    image: 'https://images.unsplash.com/photo-1511174511562-5f7f18b874f8?w=800', 
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    likes: 8200, 
    hasLiked: false, 
    comments: [], 
    shares: 410, 
    tags: ['biohacking', 'health'], 
    type: 'educational',
    contentType: 'reel',
    visibility: 'public',
    relevanceReason: 'Synced with your wearable data showing disrupted REM sleep patterns this week.',
    isFollowing: false
  },
  { 
    id: 'm-3', 
    creator: 'MindsetMastery', 
    avatar: 'https://i.pravatar.cc/150?u=mindset', 
    content: 'The Stoic approach to market volatility.',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800', 
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    likes: 22100, 
    hasLiked: false, 
    comments: [], 
    shares: 2100, 
    tags: ['stoicism', 'growth'], 
    type: 'growth',
    contentType: 'reel',
    visibility: 'public',
    relevanceReason: 'Directly supports your goal: "Build my first business".',
    isFollowing: true
  }
];

const INITIAL_USER_PROFILE: UserProfile = {
  name: '',
  username: '',
  email: '',
  bio: '',
  avatar: 'https://i.pravatar.cc/300?u=neural_new',
  interests: [],
  goals: [],
  interactions: [],
  profileBanner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
  customMilestones: [
    { id: 'm1', title: 'Achieve your first high-intensity Focus Target', completed: false, category: 'Focus' },
    { id: 'm2', title: 'Maintain a 5-day cognitive routine stream', completed: false, category: 'Streak' },
    { id: 'm3', title: 'Configure AI custom context parameters in Brain', completed: false, category: 'AI Brain' }
  ],
  xp: 0,
  level: 1,
  streak: 0,
  sessionsCompleted: 0,
  onboardingCompleted: false,
  memory: {
    patterns: [],
    effectivenessScore: {},
  },
  language: 'en'
};

const INITIAL_TASKS: Task[] = [];

const getAdaptiveDuration = (message: string): number => {
  const len = message.length;
  if (len <= 25) {
    return 4000; // Very short
  } else if (len <= 60) {
    return 5500; // Medium (5-6 seconds)
  } else {
    return Math.min(10000, 7500 + (len - 60) * 50); // Long, max 10s
  }
};

const getMessagePriority = (message: string, type: 'info' | 'success'): number => {
  const msg = message.toLowerCase();
  if (
    msg.includes("achievement unlocked") || 
    msg.includes("level up") || 
    msg.includes("access denied") || 
    msg.includes("failed") || 
    msg.includes("unauthorized")
  ) {
    return 4; // Critical
  }
  if (
    msg.includes("saved") || 
    msg.includes("complete") || 
    msg.includes("check-in") || 
    msg.includes("activated") ||
    msg.includes("active") ||
    type === 'success'
  ) {
    return 3; // High
  }
  if (
    msg.includes("navigation") || 
    msg.includes("glide up") || 
    msg.includes("hidden") ||
    msg.includes("minimized")
  ) {
    return 1; // Low
  }
  return 2; // Normal
};

const App: React.FC = () => {
  const uid = useMemo(() => getWorkspaceUid(), []);

  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.HOME);
  const [activeSubTab, setActiveSubTab] = useState<SocialSubTab>('circles');
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.NORMAL);
  const [activeLayout, setActiveLayout] = useState<'Classic Cards' | 'Neural Wheel'>('Classic Cards');
  const [isRailOpen, setIsRailOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);

  const [tasks, setTasksRaw] = useState<Task[]>(INITIAL_TASKS);
  const tasksRef = useRef<Task[]>(tasks);
  tasksRef.current = tasks;

  const [focusSessions, setFocusSessions] = useState<FocusSessionRecord[]>([]);
  const [dailyDebriefs, setDailyDebriefs] = useState<DailyDebriefRecord[]>([]);
  const [followedUserIds, setFollowedUserIds] = useState<string[]>([]);
  const [autonomousActionsSynced, setAutonomousActionsSynced] = useState<string[]>([]);

  const [externalFocusTrigger, setExternalFocusTrigger] = useState<{
    taskId?: string;
    taskTitle: string;
    durationMinutes: number;
    mode?: 'focus' | 'grind';
    nonce: number;
  } | null>(null);

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [activeNudge, setActiveNudge] = useState<{ message: string, type: string } | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [onboardingCache, setOnboardingCache] = useState<Partial<UserProfile> | null>(null);

  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);
  const [hasLoadedPrefs, setHasLoadedPrefs] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => ({
    ...INITIAL_USER_PROFILE,
    userId: uid
  }));

  const { language, setLanguage, t } = useLanguage();

  // Keep userProfile.language and LanguageContext synchronized
  useEffect(() => {
    if (userProfile.language && userProfile.language !== language && typeof setLanguage === 'function') {
      setLanguage(userProfile.language);
    }
  }, [userProfile.language, language, setLanguage]);

  useEffect(() => {
    if (language && userProfile.language !== language) {
      setUserProfile(prev => ({ ...prev, language }));
    }
  }, [language, userProfile.language]);

  const [toast, setToast] = useState<{message: string, type: 'info' | 'success'} | null>(null);
  const toastQueueRef = useRef<{
    id: string;
    message: string;
    type: 'info' | 'success';
    priority: number;
    timestamp: number;
  }[]>([]);
  const recentToastsRef = useRef<{ message: string; timestamp: number }[]>([]);
  const lastInteractionTimeRef = useRef<number>(0);
  const currentToastActiveRef = useRef<boolean>(false);
  const toastDismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processQueueTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  
  const [isGhostAuthed, setIsGhostAuthed] = useState(false);
  const [ghostPassword, setGhostPassword] = useState('');
  const [pendingTab, setPendingTab] = useState<AppTab | null>(null);
  const [isExitingGhost, setIsExitingGhost] = useState(false);
  
  // Ghost Session Data (Temporary)
  const [ghostTasks, setGhostTasks] = useState<Task[]>([]);
  const [ghostUserProfile, setGhostUserProfile] = useState<UserProfile | null>(null);
  const [ghostMessages, setGhostMessages] = useState<ChatMessage[]>([]);
  const [ghostDMs, setGhostDMs] = useState<DirectMessage[]>([]);
  const [isGhostLocked, setIsGhostLocked] = useState(true);
  const ghostTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const effectiveProfile = currentMode === AppMode.GHOST ? (ghostUserProfile || userProfile) : userProfile;
  const effectiveTasks = currentMode === AppMode.GHOST ? ghostTasks : tasks;

  const [latency, setLatency] = useState<number>(14);

  // Music Suggestion State
  const [showMusicSuggestion, setShowMusicSuggestion] = useState(false);
  const [hasShownChillMusic, setHasShownChillMusic] = useState(false);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [isMusicBarHiddenByGlide, setIsMusicBarHiddenByGlide] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Gesture Tracking Refs
  const touchStartY = useRef(0);
  const pointerStartX = useRef(0);
  const pointerStartY = useRef(0);
  const isPointerDownRef = useRef(false);
  
  const musicBarDragY = useRef(0);
  const isDraggingMusicBar = useRef(false);

  // Saved/Purchased Posts State (hydrated from Firestore)
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [purchasedPostIds, setPurchasedPostIds] = useState<Set<string>>(new Set());

  // Lifted joinedGroupIds state (hydrated from Firestore preferences)
  const [joinedGroupIds, setJoinedGroupIds] = useState<string[]>([]);
  const [activeSignalGroupId, setActiveSignalGroupId] = useState<string | null>(null);

  // Pop-Out Window System State (hydrated from Firestore preferences)
  const [poppedWindows, setPoppedWindows] = useState<PoppedOutWindowConfig[]>([]);
  const [isPopoutMenuOpen, setIsPopoutMenuOpen] = useState(false);
  const popoutMenuRef = useRef<HTMLDivElement>(null);

  // Command Palette State & Global Keyboard Shortcuts
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isDebriefOpen, setIsDebriefOpen] = useState(false);

  // Loop guards for Firestore bi-directional subscriptions
  const lastSyncedProfileJsonRef = useRef<string>('');
  const lastSyncedPrefsJsonRef = useRef<string>('');
  const isRemotePrefsHydratingRef = useRef<boolean>(false);

  // Diff-based Task setter that syncs directly to Firestore (disabled in Ghost Mode)
  const handleTasksChange: React.Dispatch<React.SetStateAction<Task[]>> = useCallback(
    (updater) => {
      const prevTasks = tasksRef.current;
      const nextTasks = typeof updater === 'function' ? updater(prevTasks) : updater;
      tasksRef.current = nextTasks;
      setTasksRaw(nextTasks);

      if (!uid || currentMode === AppMode.GHOST) return;

      const prevMap = new Map(prevTasks.map((t) => [t.id, t]));
      const nextMap = new Map(nextTasks.map((t) => [t.id, t]));

      const added: Task[] = [];
      const updated: Task[] = [];
      const deletedIds: string[] = [];

      nextTasks.forEach((t) => {
        const old = prevMap.get(t.id);
        if (!old) {
          added.push(t);
        } else if (
          old.title !== t.title ||
          old.category !== t.category ||
          old.completed !== t.completed ||
          old.timeEstimate !== t.timeEstimate ||
          old.priority !== t.priority ||
          old.scheduledFor !== t.scheduledFor ||
          old.scheduledTime !== t.scheduledTime ||
          old.notes !== t.notes ||
          old.reminderAt !== t.reminderAt ||
          old.completedAt !== t.completedAt
        ) {
          updated.push(t);
        }
      });

      prevTasks.forEach((t) => {
        if (!nextMap.has(t.id)) {
          deletedIds.push(t.id);
        }
      });

      if (added.length > 0) {
        nexoraFirestoreService.createTasksBatch(uid, added).catch((err) => {
          console.warn('Firestore createTasksBatch failed:', err);
        });
      }
      updated.forEach((t) => {
        nexoraFirestoreService.updateTask(uid, t.id, t).catch((err) => {
          console.warn('Firestore updateTask failed:', err);
        });
      });
      deletedIds.forEach((id) => {
        nexoraFirestoreService.deleteTask(uid, id).catch((err) => {
          console.warn('Firestore deleteTask failed:', err);
        });
      });
    },
    [uid, currentMode]
  );

  // Hydrate all user & public Firestore collections
  useEffect(() => {
    if (!uid) return;

    nexoraFirestoreService.seedInitialPostsIfEmpty(INITIAL_POSTS).catch(() => {});

    const unsubProfile = nexoraFirestoreService.subscribeUserProfile(
      uid,
      (remoteProfile) => {
        if (remoteProfile) {
          const merged: UserProfile = {
            ...INITIAL_USER_PROFILE,
            ...remoteProfile,
            userId: uid,
            memory: remoteProfile.memory || { ...INITIAL_USER_PROFILE.memory },
            customMilestones: remoteProfile.customMilestones || [...INITIAL_USER_PROFILE.customMilestones!],
            language: remoteProfile.language || 'en'
          };
          lastSyncedProfileJsonRef.current = JSON.stringify(merged);
          setUserProfile(merged);
        }
        setHasLoadedProfile(true);
      },
      () => setHasLoadedProfile(true)
    );

    const unsubPrefs = nexoraFirestoreService.subscribeUserPreferences(
      uid,
      (prefs) => {
        if (prefs) {
          isRemotePrefsHydratingRef.current = true;
          lastSyncedPrefsJsonRef.current = JSON.stringify({
            language: prefs.language || 'en',
            layout: prefs.layout || 'Classic Cards',
            currentMode: prefs.currentMode || AppMode.NORMAL,
            joinedGroupIds: prefs.joinedGroupIds || [],
            poppedWindows: prefs.poppedWindows || [],
            autonomousActions: prefs.autonomousActions || []
          });
          if (prefs.layout) setActiveLayout(prefs.layout);
          if (prefs.joinedGroupIds) setJoinedGroupIds(prefs.joinedGroupIds);
          if (prefs.poppedWindows) setPoppedWindows(prefs.poppedWindows);
          if (prefs.autonomousActions) setAutonomousActionsSynced(prefs.autonomousActions);
          if (prefs.currentMode && prefs.currentMode !== AppMode.GHOST) {
            setCurrentMode(prefs.currentMode);
          }
          if (prefs.language && typeof setLanguage === 'function') {
            setLanguage(prefs.language);
          }
          setTimeout(() => {
            isRemotePrefsHydratingRef.current = false;
          }, 0);
        }
        setHasLoadedPrefs(true);
      },
      () => setHasLoadedPrefs(true)
    );

    const unsubTasks = nexoraFirestoreService.subscribeTasks(
      uid,
      (remoteTasks) => {
        tasksRef.current = remoteTasks;
        setTasksRaw(remoteTasks);
      },
      () => {}
    );

    const unsubFocus = nexoraFirestoreService.subscribeFocusSessions(
      uid,
      (sessions) => setFocusSessions(sessions),
      () => {}
    );

    const unsubDebriefs = nexoraFirestoreService.subscribeDailyDebriefs(
      uid,
      (debriefs) => setDailyDebriefs(debriefs),
      () => {}
    );

    const unsubFollows = nexoraFirestoreService.subscribeFollows(
      uid,
      (items) => setFollowedUserIds(items.map((i) => i.id)),
      () => {}
    );

    const unsubSaved = nexoraFirestoreService.subscribeUserSavedAndPurchased(
      uid,
      (savedIds, purchasedIds) => {
        setSavedPostIds(new Set(savedIds));
        setPurchasedPostIds(new Set(purchasedIds));
      },
      () => {}
    );

    const unsubPosts = nexoraFirestoreService.subscribePosts(
      uid,
      async (remotePosts) => {
        const list = remotePosts.length > 0 ? remotePosts : INITIAL_POSTS;
        const likedIds = await nexoraFirestoreService.getUserLikedPostIds(
          uid,
          list.map((p) => p.id)
        );
        setPosts(
          list.map((p) => ({
            ...p,
            hasLiked: likedIds.has(p.id)
          }))
        );
      },
      () => {}
    );

    return () => {
      unsubProfile();
      unsubPrefs();
      unsubTasks();
      unsubFocus();
      unsubDebriefs();
      unsubFollows();
      unsubSaved();
      unsubPosts();
    };
  }, [uid]);

  useEffect(() => {
    const handleTriggerDebrief = () => setIsDebriefOpen(true);
    window.addEventListener('trigger-daily-debrief', handleTriggerDebrief as EventListener);
    return () => window.removeEventListener('trigger-daily-debrief', handleTriggerDebrief as EventListener);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K -> Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      // ⌘1 .. ⌘7 -> Instant Navigation
      if ((e.metaKey || e.ctrlKey) && !isNaN(Number(e.key))) {
        const num = Number(e.key);
        if (num === 1) { e.preventDefault(); handleTabChange(AppTab.HOME); }
        if (num === 2) { e.preventDefault(); handleTabChange(AppTab.EXPLORE, 'messages'); }
        if (num === 4) { e.preventDefault(); handleTabChange(AppTab.CREATOR); }
        if (num === 5) { e.preventDefault(); handleTabChange(AppTab.MODES); }
        if (num === 6) { e.preventDefault(); handleTabChange(AppTab.BRAIN); }
        if (num === 7) { e.preventDefault(); handleTabChange(AppTab.PROFILE); }
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen]);

  // Standalone Popout View Detection (when URL hash starts with #popout=)
  const [standalonePopoutTab, setStandalonePopoutTab] = useState<{ tab: AppTab; subTab?: SocialSubTab } | null>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.startsWith('#popout=')) {
        const val = hash.replace('#popout=', '');
        if (val === 'messages') return { tab: AppTab.EXPLORE, subTab: 'messages' };
        if (val === 'brain') return { tab: AppTab.BRAIN };
        if (val === 'modes') return { tab: AppTab.MODES };
        if (val === 'creator') return { tab: AppTab.CREATOR };
        if (val === 'profile') return { tab: AppTab.PROFILE };
        if (val === 'explore') return { tab: AppTab.EXPLORE, subTab: 'circles' };
        if (val === 'home') return { tab: AppTab.HOME };
      }
    }
    return null;
  });

  const modeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(event.target as Node)) {
        setIsModeMenuOpen(false);
      }
      if (popoutMenuRef.current && !popoutMenuRef.current.contains(event.target as Node)) {
        setIsPopoutMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(prev => {
        const jitter = Math.floor(Math.random() * 5) - 2;
        const next = Math.max(8, Math.min(25, prev + jitter));
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentMode === AppMode.GHOST) {
      // Only set to locked if not already authenticated
      if (!isGhostAuthed) {
        setIsGhostLocked(true);
      }
      setPendingTab(activeTab);
      // Initialize ghost profile if not exists
      if (!ghostUserProfile) {
        setGhostUserProfile({
          ...userProfile,
          name: 'Ghost User',
          username: 'ghost',
          bio: 'Temporary session active. No data traces persisted.',
          xp: 0,
          interactions: [],
          memory: { patterns: [], effectivenessScore: {} }
        });
      }
      if (ghostTasks.length === 0) {
        setGhostTasks([
          { id: 'ghost-1', title: 'Complete private objective', category: 'Privacy', completed: false, timeEstimate: '5m' }
        ]);
      }
    } else {
      // Wipe ghost data when exiting Ghost Mode
      setGhostUserProfile(null);
      setGhostTasks([]);
      setGhostMessages([]);
      setGhostDMs([]);
      setIsGhostAuthed(false);
      setIsExitingGhost(false);
      setIsGhostLocked(false);
      if (ghostTimeoutRef.current) clearTimeout(ghostTimeoutRef.current);
    }
  }, [currentMode]);

  useEffect(() => {
    // Mode-specific Music Logic
    if (currentMode === AppMode.CHILL) {
      setShowMusicSuggestion(true);
      setIsMusicBarHiddenByGlide(false);
      setHasShownChillMusic(true);
      // Automatically play atmospheric music when entering Chill Mode
      if (!isPlayingMusic) {
        playMusic();
      }
    } else {
      setShowMusicSuggestion(false);
      setIsMusicBarHiddenByGlide(false);
      // Auto-stop music if leaving special modes to maintain mode-specific atmosphere
      stopMusic();
    }
  }, [currentMode]);

  // Ghost Mode Inactivity Timeout (5 minutes)
  useEffect(() => {
    if (currentMode !== AppMode.GHOST || !isGhostAuthed || isGhostLocked) return;

    const resetTimeout = () => {
      if (ghostTimeoutRef.current) clearTimeout(ghostTimeoutRef.current);
      ghostTimeoutRef.current = setTimeout(() => {
        setIsGhostLocked(true);
        showGlobalToast("Session locked due to inactivity", "info");
      }, 5 * 60 * 1000); // 5 minutes
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(name => document.addEventListener(name, resetTimeout));
    resetTimeout();

    return () => {
      events.forEach(name => document.removeEventListener(name, resetTimeout));
      if (ghostTimeoutRef.current) clearTimeout(ghostTimeoutRef.current);
    };
  }, [currentMode, isGhostAuthed, isGhostLocked]);

  // AI Personalization Effect
  useEffect(() => {
    const personalize = async () => {
      if (userProfile.interactions.length > 0 || userProfile.interests.length > 0) {
        // Use current posts instead of INITIAL_POSTS to preserve like/follow states
        const personalized = await geminiService.personalizeFeed(posts, userProfile);
        setPosts(personalized);
      }
    };

    // Debounce personalization to avoid hitting rate limits on frequent updates
    const timer = setTimeout(() => {
      personalize();
    }, 2000); // Wait 2 seconds of inactivity before calling Gemini

    return () => clearTimeout(timer);
  }, [userProfile.interactions.length, userProfile.interests.length]);

  const trackInteraction = (postId: string, type: UserInteraction['type']) => {
    const post = posts.find(p => p.id === postId);
    let xpGain = 0;
    
    // Default XP based on type
    if (type === 'like') xpGain = 10;
    if (type === 'share') xpGain = 25;
    if (type === 'purchase') xpGain = 100;
    if (type === 'view') xpGain = 2;

    if (post) {
      // Multiplier based on post type
      if (post.type === 'growth' || post.type === 'educational') xpGain *= 2;
      if (post.type === 'noise') xpGain = 0;
    } else if (postId.startsWith('task-')) {
      xpGain = 1; // Explicit user request: +1 XP for task completed
    }

    if (xpGain === 0 && !post && !postId.startsWith('task-')) {
       // Fallback for other non-post interactions if they didn't get default XP
       return;
    }

    if (currentMode === AppMode.GHOST) {
      // In Ghost Mode, we don't save permanent XP or interactions
      // But we can update the temporary ghost profile for the session feel
      setGhostUserProfile(prev => {
        if (!prev) return null;
        const newXp = prev.xp + xpGain;
        const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
        return {
          ...prev,
          interactions: [...prev.interactions, { postId, type, timestamp: new Date() }],
          xp: newXp,
          level: newLevel
        };
      });
      return;
    }

    setUserProfile(prev => {
      const newXp = prev.xp + xpGain;
      const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
      
      if (newLevel > prev.level) {
        setTimeout(() => showGlobalToast(`LEVEL UP! You are now Level ${newLevel}`, 'success'), 500);
      }

      return {
        ...prev,
        interactions: [...prev.interactions, { postId, type, timestamp: new Date() }],
        xp: newXp,
        level: newLevel
      };
    });
  };

  const handleToggleLike = (postId: string) => {
    let becomingLiked = false;
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        becomingLiked = !p.hasLiked;
        return {
          ...p,
          hasLiked: becomingLiked,
          likes: becomingLiked ? p.likes + 1 : Math.max(0, p.likes - 1)
        };
      }
      return p;
    }));
    if (uid && currentMode !== AppMode.GHOST) {
      nexoraFirestoreService.togglePostLikeBatch(uid, postId).catch(() => {});
    }
    trackInteraction(postId, 'like');
  };

  const handleToggleFollow = (creatorName: string) => {
    let shouldFollow = true;
    setPosts(prev => prev.map(p => {
      if (p.creator.toLowerCase() === creatorName.toLowerCase()) {
        shouldFollow = !p.isFollowing;
        return {
          ...p,
          isFollowing: shouldFollow
        };
      }
      return p;
    }));
    if (uid && currentMode !== AppMode.GHOST) {
      const targetKey = `creator_${creatorName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`;
      nexoraFirestoreService.setFollowState(uid, targetKey, creatorName, shouldFollow).catch(() => {});
    }
    trackInteraction(`follow-${creatorName}`, 'view');
  };

  const handleToggleFollowUser = useCallback(
    (targetUserId: string, targetUserName: string, shouldFollow: boolean) => {
      setFollowedUserIds((prev) =>
        shouldFollow
          ? Array.from(new Set([...prev, targetUserId]))
          : prev.filter((id) => id !== targetUserId)
      );
      if (uid && currentMode !== AppMode.GHOST) {
        nexoraFirestoreService.setFollowState(uid, targetUserId, targetUserName, shouldFollow).catch(() => {});
      }
    },
    [uid, currentMode]
  );

  const handleManualDismiss = () => {
    dismissCurrentToast();
  };

  function dismissCurrentToast() {
    if (toastDismissTimeoutRef.current) {
      clearTimeout(toastDismissTimeoutRef.current);
      toastDismissTimeoutRef.current = null;
    }
    currentToastActiveRef.current = false;
    setToast(null);
    setTimeout(() => {
      processToastQueue();
    }, 300);
  }

  function processToastQueue() {
    if (currentToastActiveRef.current) {
      return;
    }
    
    if (toastQueueRef.current.length === 0) {
      return;
    }
    
    // Sort queue: Higher-priority messages first (priority descending).
    // For same priority, preserve FIFO (timestamp ascending).
    toastQueueRef.current.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp - b.timestamp;
    });
    
    const nextToast = toastQueueRef.current[0];
    
    // Smart Delay: If user is actively interacting and next toast is not critical (priority < 4)
    const isInteracting = Date.now() - lastInteractionTimeRef.current < 2000;
    if (isInteracting && nextToast.priority < 4) {
      if (processQueueTimeoutRef.current) clearTimeout(processQueueTimeoutRef.current);
      processQueueTimeoutRef.current = setTimeout(processToastQueue, 500);
      return;
    }
    
    // Dequeue
    toastQueueRef.current.shift();
    
    currentToastActiveRef.current = true;
    setToast({ message: nextToast.message, type: nextToast.type });
    
    const duration = getAdaptiveDuration(nextToast.message);
    
    if (toastDismissTimeoutRef.current) clearTimeout(toastDismissTimeoutRef.current);
    toastDismissTimeoutRef.current = setTimeout(() => {
      dismissCurrentToast();
    }, duration);
  }

  const showGlobalToast = (message: string, type: 'info' | 'success' = 'info') => {
    const timestamp = Date.now();
    
    // Duplicate Prevention: merge duplicates into single display
    recentToastsRef.current = recentToastsRef.current.filter(r => timestamp - r.timestamp < 5000);
    
    const isDuplicate = recentToastsRef.current.some(r => r.message === message) ||
                        toastQueueRef.current.some(q => q.message === message) ||
                        (currentToastActiveRef.current && toast?.message === message);
                        
    if (isDuplicate) {
      const existing = recentToastsRef.current.find(r => r.message === message);
      if (existing) {
        existing.timestamp = timestamp;
      } else {
        recentToastsRef.current.push({ message, timestamp });
      }
      return;
    }
    
    recentToastsRef.current.push({ message, timestamp });
    
    const priority = getMessagePriority(message, type);
    
    const id = 'toast_' + Math.random().toString(36).substring(2, 11);
    toastQueueRef.current.push({ id, message, type, priority, timestamp });
    
    processToastQueue();
  };

  // Capture user interactions globally for smart delay of non-critical feedback
  useEffect(() => {
    const handleInteraction = () => {
      lastInteractionTimeRef.current = Date.now();
    };
    window.addEventListener('mousedown', handleInteraction, { passive: true });
    window.addEventListener('keydown', handleInteraction, { passive: true });
    window.addEventListener('touchstart', handleInteraction, { passive: true });
    window.addEventListener('pointerdown', handleInteraction, { passive: true });
    window.addEventListener('scroll', handleInteraction, { passive: true });
    
    return () => {
      window.removeEventListener('mousedown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('scroll', handleInteraction);
      
      if (toastDismissTimeoutRef.current) clearTimeout(toastDismissTimeoutRef.current);
      if (processQueueTimeoutRef.current) clearTimeout(processQueueTimeoutRef.current);
    };
  }, []);

  // Sync URL HashRouter for poppedWindows
  useEffect(() => {
    try {
      if (poppedWindows.length > 0) {
        const keys = poppedWindows.map(w => w.subTab === 'messages' ? 'messages' : w.tab.toLowerCase()).join(',');
        window.history.replaceState(null, '', `#popout=${keys}`);
      } else if (window.location.hash.startsWith('#popout=')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (_) {}
  }, [poppedWindows]);

  const handlePopoutModule = useCallback((tab: AppTab, subTab?: SocialSubTab, titleOverride?: string) => {
    const winId = subTab ? `win-${tab}-${subTab}` : `win-${tab}`;
    const defaultTitle = 
      subTab === 'messages' ? 'Direct Chat & Transmissions' :
      tab === AppTab.BRAIN ? 'Neural AI OS' :
      tab === AppTab.MODES ? 'Mood & Environment' :
      tab === AppTab.CREATOR ? 'Creator Studio' :
      tab === AppTab.PROFILE ? 'User Passport' :
      tab === AppTab.EXPLORE ? 'Explore & Circles' : 'Feed & Momentum';

    const title = titleOverride || defaultTitle;

    setPoppedWindows(prev => {
      const existing = prev.find(w => w.id === winId);
      if (existing) {
        const maxZ = Math.max(...prev.map(w => w.zIndex), 100);
        return prev.map(w => w.id === winId ? { ...w, isMinimized: false, zIndex: maxZ + 1 } : w);
      }

      const count = prev.length;
      const offsetX = 40 + (count % 5) * 35;
      const offsetY = 70 + (count % 5) * 35;
      const maxZ = Math.max(...prev.map(w => w.zIndex), 100);

      const newWin: PoppedOutWindowConfig = {
        id: winId,
        tab,
        subTab,
        title,
        x: offsetX,
        y: offsetY,
        width: 520,
        height: 640,
        isMinimized: false,
        isMaximized: false,
        zIndex: maxZ + 1
      };

      return [...prev, newWin];
    });

    if (showGlobalToast) {
      showGlobalToast(`Popped out ${title} into floating window`, 'success');
    }
  }, [showGlobalToast]);

  const handleClosePoppedWindow = (id: string) => {
    setPoppedWindows(prev => prev.filter(w => w.id !== id));
    showGlobalToast('Window closed', 'info');
  };

  const handleMinimizePoppedWindow = (id: string) => {
    setPoppedWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: !w.isMinimized } : w));
  };

  const handleMaximizePoppedWindow = (id: string) => {
    setPoppedWindows(prev => prev.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w));
  };

  const handleFocusPoppedWindow = (id: string) => {
    setPoppedWindows(prev => {
      const maxZ = Math.max(...prev.map(w => w.zIndex), 100);
      return prev.map(w => w.id === id ? { ...w, zIndex: maxZ + 1 } : w);
    });
  };

  const handleUpdateWindowPosition = (id: string, x: number, y: number) => {
    setPoppedWindows(prev => prev.map(w => w.id === id ? { ...w, x, y } : w));
  };

  const handleUpdateWindowSize = (id: string, width: number, height: number) => {
    setPoppedWindows(prev => prev.map(w => w.id === id ? { ...w, width, height } : w));
  };

  const handleOpenStandaloneBrowserWindow = (tab: AppTab, subTab?: SocialSubTab) => {
    const key = subTab === 'messages' ? 'messages' : tab.toLowerCase();
    const url = `${window.location.origin}${window.location.pathname}#popout=${key}`;
    window.open(url, `Nexora_${key}`, 'width=580,height=720,resizable=yes,scrollbars=yes');
    showGlobalToast('Opened in standalone browser window', 'info');
  };

  const runMomentumAnalysisRef = useRef<() => void>();

  const handleNudge = (message: string, type: string) => {
    setActiveNudge({ message, type });
    if (runMomentumAnalysisRef.current) {
      runMomentumAnalysisRef.current();
    }
  };

  const startNudgeFocus = () => {
    // Feedback loop: Increment effectiveness
    if (activeNudge) {
      setUserProfile(prev => {
        const memory = prev.memory || { patterns: [], effectivenessScore: {} };
        const scores = { ...(memory.effectivenessScore || {}) };
        scores[activeNudge.type] = (scores[activeNudge.type] || 0) + 1;
        return { ...prev, memory: { ...memory, effectivenessScore: scores } };
      });
    }

    if (currentMode === AppMode.NORMAL) {
      setCurrentMode(AppMode.FOCUS);
    }

    setActiveTab(AppTab.EXPLORE);
    setActiveSubTab('signals');
    setActiveSession({
      type: 'focus',
      timeLeft: 300,
      participants: 12,
      totalTime: 300,
      joinedAt: Date.now(),
      isSyncSession: true
    });
    setActiveNudge(null);
    showGlobalToast("Focus started", "success");
  };

  const ignoreNudge = () => {
    // Feedback loop: Decrement effectiveness
    if (activeNudge) {
      setUserProfile(prev => {
        const memory = prev.memory || { patterns: [], effectivenessScore: {} };
        const scores = { ...(memory.effectivenessScore || {}) };
        scores[activeNudge.type] = (scores[activeNudge.type] || 0) - 0.5;
        return { ...prev, memory: { ...memory, effectivenessScore: scores } };
      });
    }
    setActiveNudge(null);
  };

  const handlePrepareTomorrow = (plan: string) => {
    const newTask: Task = {
      id: `task_${Date.now()}`,
      title: plan,
      category: 'Focus',
      completed: false,
      timeEstimate: '1h',
      priority: 'high'
    };
    handleTasksChange(prev => [newTask, ...prev]);
    showGlobalToast("Tomorrow's mission secured.", "success");
  };

  const handleSaveDailyDebrief = useCallback(
    (debrief: Omit<DailyDebriefRecord, 'id' | 'userId'>) => {
      if (!uid || currentMode === AppMode.GHOST) return;
      nexoraFirestoreService.saveDailyDebrief(uid, debrief).catch((err) => {
        console.warn('Failed saving daily debrief:', err);
      });
    },
    [uid, currentMode]
  );

  const handleCompleteRescueMission = async () => {
    try {
      const isStarted = userProfile.momentumRescue?.currentMission?.status === 'started';
      const actionToTake = isStarted ? 'complete' : 'start';

      const response = await fetch('/api/momentum-rescue/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userProfile, tasks, action: actionToTake })
      });
      if (response.ok) {
        const data = await response.json();
        
        if (actionToTake === 'start') {
          setUserProfile(prev => ({
            ...prev,
            momentumRescue: data.momentumRescueState
          }));
          showGlobalToast("⚡ Micro Action Initiated!", "success");
        } else {
          setUserProfile(prev => {
            const newXp = prev.xp + (data.xpEarned || 15);
            const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
            
            if (newLevel > prev.level) {
              setTimeout(() => {
                showGlobalToast(`⚡ LEVEL UP: Advanced Node Authority ${newLevel} Secured!`, 'success');
              }, 900);
            }

            const updatedProfile = {
              ...prev,
              momentumRescue: data.momentumRescueState,
              xp: newXp,
              level: newLevel
            };

            if (data.updatedGoals) {
              updatedProfile.goals = data.updatedGoals;
            }

            return updatedProfile;
          });

          if (data.updatedTasks) {
            handleTasksChange(data.updatedTasks);
          }

          setActiveNudge(null);
          showGlobalToast(`🛡️ Momentum Saved! +${data.xpEarned || 15} XP`, 'success');
          if (data.reflection) {
            setTimeout(() => {
              showGlobalToast(`💭 Nexora: "${data.reflection}"`, 'info');
            }, 1500);
          }
        }
      }
    } catch (err) {
      console.error("Error completing rescue mission:", err);
      showGlobalToast("Failed to complete rescue mission", "info");
    }
  };

  const handleIgnoreRescueMission = async () => {
    try {
      const response = await fetch('/api/momentum-rescue/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userProfile, action: 'ignore' })
      });
      if (response.ok) {
        const data = await response.json();
        setUserProfile(prev => ({
          ...prev,
          momentumRescue: data.momentumRescueState
        }));
        setActiveNudge(null);
        showGlobalToast("Mission deferred. Nexora is recalibrating...", "info");
      }
    } catch (err) {
      console.error("Error ignoring rescue mission:", err);
      setActiveNudge(null);
    }
  };

  useEffect(() => {
    let timer: any;
    if (activeSession && activeSession.timeLeft > 0) {
      timer = setInterval(() => {
        setActiveSession(prev => {
          if (!prev) return null;
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    } else if (activeSession && activeSession.timeLeft === 0) {
      // Session completion logic
      if (!activeSession.hasRewarded) {
        if (activeSession.isSyncSession && activeSession.type === 'focus') {
          completeFocusSession();
          showGlobalToast("Session complete. Streak +1.", "success");
        }
        setActiveSession(prev => prev ? { ...prev, hasRewarded: true } : null);
      }
    }
    return () => clearInterval(timer);
  }, [activeSession?.timeLeft, activeSession?.type]);

  const handlePatternDetected = (type: 'distraction' | 'focus_peak' | 'procrastination') => {
    setUserProfile(prev => {
      // Safety check for memory
      const memory = prev.memory || { patterns: [], effectivenessScore: {} };
      const patterns = [...(memory.patterns || [])];
      const existing = patterns.find(p => p.type === type);
      if (existing) {
        existing.frequency += 1;
        existing.lastDetected = Date.now();
      } else {
        patterns.push({
          id: `pattern-${Date.now()}`,
          type,
          frequency: 1,
          lastDetected: Date.now()
        });
      }
      return {
        ...prev,
        memory: {
          ...memory,
          patterns
        }
      };
    });
  };

  // Daily Streak Progression and Check-in logic (only after Firestore profile hydration)
  useEffect(() => {
    if (!hasLoadedProfile || currentMode === AppMode.GHOST || !userProfile.onboardingCompleted) return;

    const todayDateStr = new Date().toDateString();
    const lastActive = userProfile.lastActiveDate;

    if (!lastActive) {
      setUserProfile(prev => ({
        ...prev,
        lastActiveDate: todayDateStr,
        streak: prev.streak === 0 ? 1 : prev.streak
      }));
    } else if (lastActive !== todayDateStr) {
      setUserProfile(prev => {
        const currentStreak = prev.streak || 0;
        const newStreak = currentStreak + 1;
        
        setTimeout(() => {
          showGlobalToast(`🔥 Daily Check-in complete! Neural Streak is now ${newStreak} days!`, 'success');
        }, 1500);

        return {
          ...prev,
          streak: newStreak,
          lastActiveDate: todayDateStr
        };
      });
    }
  }, [hasLoadedProfile, currentMode, userProfile.onboardingCompleted, userProfile.lastActiveDate]);

  const [autonomousActivities, setAutonomousActivities] = useState<string[]>([]);

  // Agentic Autonomous Executor (backed by Firestore preferences, after hydration)
  useEffect(() => {
    if (!hasLoadedProfile || !hasLoadedPrefs || !userProfile.onboardingCompleted || currentMode === AppMode.GHOST) return;
    const hours = new Date().getHours();
    const today = new Date().toDateString();
    const autonomousKey = `autonomous_action_${today}`;
    
    // Proactive Activity: Morning Plan
    if (hours >= 5 && hours < 11 && !autonomousActionsSynced.includes(autonomousKey)) {
      const agentTask: Task = {
        id: `agent-task-${Date.now()}`,
        title: 'Morning Focus: Strategy & Alignment',
        category: 'Focus',
        completed: false,
        timeEstimate: '15m',
        isAutoGenerated: true,
        priority: 'high'
      };
      
      handleTasksChange(prev => [agentTask, ...prev]);
      showGlobalToast("Nexora: Morning strategy target deployed.", "success");
      setAutonomousActivities(prev => [...prev, 'morning_plan']);
      setAutonomousActionsSynced(prev => Array.from(new Set([...prev, autonomousKey])));
    }
  }, [hasLoadedProfile, hasLoadedPrefs, userProfile.onboardingCompleted, currentMode, autonomousActionsSynced, handleTasksChange]);

  const { triggerIntervention } = useBehavioralIntelligence({
    activeTab,
    currentMode,
    showToast: showGlobalToast,
    onNudge: handleNudge,
    onPatternDetected: handlePatternDetected
  });

  const isAnalyzingRef = useRef<boolean>(false);

  const runMomentumAnalysis = useCallback(async () => {
    if (currentMode === AppMode.GHOST || !userProfile.onboardingCompleted) return;
    if (isAnalyzingRef.current) return;

    try {
      isAnalyzingRef.current = true;

      const localHour = new Date().getHours();
      const response = await fetch('/api/momentum-rescue/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          tasks,
          localHour,
          streak: userProfile.streak || 0,
          xp: userProfile.xp || 0
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.momentumRescueState) {
          setUserProfile(prev => ({
            ...prev,
            momentumRescue: data.momentumRescueState
          }));
        }

        if (data.shouldNudge && data.nudgeMessage) {
          setActiveNudge({
            message: data.nudgeMessage,
            type: 'momentum_rescue'
          });
        }
      }
    } catch (err) {
      console.warn("Momentum analysis failed:", err);
    } finally {
      isAnalyzingRef.current = false;
    }
  }, [tasks, userProfile.streak, userProfile.xp, currentMode, userProfile.onboardingCompleted]);

  useEffect(() => {
    runMomentumAnalysisRef.current = runMomentumAnalysis;
  }, [runMomentumAnalysis]);

  // Silent Affinity Engine & Trust Score Engine Profile Sync
  useEffect(() => {
    if (!userProfile?.name || currentMode === AppMode.GHOST) return;
    const controller = new AbortController();
    const userIdVal = userProfile.userId || uid;
    
    fetch('/api/affinity-engine/sync-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userIdVal,
        name: userProfile.name,
        interests: userProfile.interests || [],
        skills: userProfile.customMilestones?.map(m => m.title) || ['React', 'TypeScript', 'Node.js'],
        learningAreas: userProfile.interests?.slice(1, 4) || [],
        communities: userProfile.goals || [],
        goals: userProfile.goals || []
      }),
      signal: controller.signal
    }).catch(err => {
      if (err.name !== 'AbortError') {
        console.warn("Affinity Engine profile sync failed:", err);
      }
    });

    fetch('/api/trust-engine/sync-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userIdVal,
        name: userProfile.name
      }),
      signal: controller.signal
    }).catch(err => {
      if (err.name !== 'AbortError') {
        console.warn("Trust Score Engine profile sync failed:", err);
      }
    });

    return () => controller.abort();
  }, [userProfile.interests, userProfile.goals, userProfile.name, userProfile.userId, uid, currentMode]);

  // Auto-lock Ghost Mode when app is minimized or focus lost
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only lock if document is really hidden (app minimized/background)
      if (document.hidden && currentMode === AppMode.GHOST) {
        setIsGhostLocked(true);
      }
    };

    const handleBlur = () => {
      // Avoid locking on minor blur events (internal UI shifts)
      // Only lock if we are in ghost mode and not already locked
      // We also check activeElement to see if we've genuinely lost focus
      if (currentMode === AppMode.GHOST && !isGhostLocked && document.activeElement === document.body) {
        // Optional: you could add a small delay here to ensure it's a real blur
        // but for high-security we'll keep it prompt but more specific
        setIsGhostLocked(true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [currentMode]);

  // Bottom Music Bar Drag-to-Hide Handlers
  const handleMusicBarPointerDown = (e: React.PointerEvent) => {
    musicBarDragY.current = e.clientY;
    isDraggingMusicBar.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleMusicBarPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingMusicBar.current) return;
    const diffY = e.clientY - musicBarDragY.current; // positive when dragging DOWN
    if (diffY > 50) {
      setIsMusicBarHiddenByGlide(true);
      isDraggingMusicBar.current = false;
      showGlobalToast("Atmospheric Sync minimized. Glide up to restore.", "info");
    }
  };

  const handleMusicBarPointerUp = (e: React.PointerEvent) => {
    isDraggingMusicBar.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const toggleMusic = () => {
    if (isPlayingMusic) {
      stopMusic();
    } else {
      playMusic();
    }
  };

  const playMusic = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => {
        console.error("Playback failed", err);
        showGlobalToast("Interaction required for audio", "info");
      });
      setIsPlayingMusic(true);
      showGlobalToast("Atmospheric Sync Active", "success");
    }
  };

  const stopMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingMusic(false);
    }
  };

  const handleTabChange = (tab: AppTab, subTab?: SocialSubTab) => {
    if (currentMode === AppMode.FOCUS && tab !== AppTab.HOME && tab !== AppTab.MODES && tab !== AppTab.EXPLORE) {
      showGlobalToast("Focus Mode: Navigation Restricted", "info");
      return;
    }
    if (currentMode === AppMode.FOCUS && tab === AppTab.EXPLORE) {
      setActiveSubTab('signals');
    } else if (subTab && tab === AppTab.EXPLORE) {
      setActiveSubTab(subTab);
    }
    if (currentMode === AppMode.GHOST && !isGhostAuthed) {
      setPendingTab(tab);
      showGlobalToast("Ghost Mode: Authorization Required", "info");
      return;
    }
    setActiveTab(tab);
    setIsRailOpen(false);
  };

  const handleSetActiveSubTab = (subTab: SocialSubTab) => {
    if (currentMode === AppMode.FOCUS && subTab !== 'signals') {
      showGlobalToast("Focus Mode: Only Signal stream permitted", "info");
      return;
    }
    setActiveSubTab(subTab);
  };

  const switchMode = (mode: AppMode) => {
    setCurrentMode(mode);
    showGlobalToast(`${mode} Mode Activated`, 'success');
    setIsModeMenuOpen(false);
  };

  const toggleGhostMode = () => {
    if (currentMode === AppMode.GHOST) {
      setCurrentMode(AppMode.NORMAL);
      showGlobalToast("Ghost Mode Deactivated", "info");
    } else {
      setCurrentMode(AppMode.GHOST);
      showGlobalToast("Ghost Mode Activated", "success");
    }
  };

  const toggleFocusMode = () => {
    if (currentMode === AppMode.FOCUS) {
      setCurrentMode(AppMode.NORMAL);
      showGlobalToast("Focus Mode Deactivated", "info");
    } else {
      setCurrentMode(AppMode.FOCUS);
      setActiveTab(AppTab.EXPLORE);
      setActiveSubTab('signals');
      showGlobalToast("Focus Mode Activated", "success");
    }
  };

  const toggleSavePost = (postId: string) => {
    let nextSaved = false;
    setSavedPostIds(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
        nextSaved = false;
        showGlobalToast("Asset Removed from Saved", "info");
      } else {
        next.add(postId);
        nextSaved = true;
        showGlobalToast("Asset Saved for Later", "success");
      }
      return next;
    });
    if (uid && currentMode !== AppMode.GHOST) {
      nexoraFirestoreService.setSavedOrPurchased(uid, postId, { saved: nextSaved }).catch(() => {});
    }
  };

  const buyPost = (postId: string) => {
    setPurchasedPostIds(prev => {
      const next = new Set(prev);
      next.add(postId);
      showGlobalToast("Asset Purchased Successfully!", "success");
      return next;
    });
    if (uid && currentMode !== AppMode.GHOST) {
      nexoraFirestoreService.setSavedOrPurchased(uid, postId, { purchased: true }).catch(() => {});
    }
  };

  const addPost = (newPost: Post) => {
    setPosts(prev => [newPost, ...prev]);
    if (uid && currentMode !== AppMode.GHOST) {
      nexoraFirestoreService.createPost(uid, newPost).catch(err => {
        console.warn("Failed persisting post to Firestore:", err);
      });
    }
    showGlobalToast("Memory Uplinked to Social Feed", "success");
  };

  const handleLayoutChange = useCallback((layout: 'Classic Cards' | 'Neural Wheel') => {
    setActiveLayout(layout);
    if (uid && currentMode !== AppMode.GHOST) {
      nexoraFirestoreService.saveUserPreferences(uid, { layout }).catch(() => {});
    }
  }, [uid, currentMode]);

  const handleFocusSessionStart = useCallback(
    (session: {
      id: string;
      taskId?: string;
      taskTitle: string;
      mode: 'focus' | 'grind' | 'chill' | 'break';
      durationSeconds: number;
    }) => {
      if (!uid || currentMode === AppMode.GHOST) return;
      nexoraFirestoreService
        .createFocusSession(uid, {
          id: session.id,
          userId: uid,
          taskId: session.taskId,
          taskTitle: session.taskTitle,
          mode: session.mode,
          durationSeconds: session.durationSeconds,
          elapsedSeconds: 0,
          status: 'active',
          startedAt: Date.now()
        })
        .catch((err: unknown) => console.warn('Failed starting focus session record:', err));
    },
    [uid, currentMode]
  );

  const handleFocusSessionComplete = useCallback(
    (sessionId: string, elapsedSeconds: number) => {
      if (uid && currentMode !== AppMode.GHOST) {
        nexoraFirestoreService
          .updateFocusSession(uid, sessionId, {
            status: 'completed',
            elapsedSeconds,
            endedAt: Date.now(),
            xpAwarded: 50
          })
          .catch((err) => console.warn('Failed completing focus session record:', err));
      }
      completeFocusSession();
    },
    [uid, currentMode]
  );

  const handleFocusReflectionSave = useCallback(
    (sessionId: string, reflection: string) => {
      if (!uid || currentMode === AppMode.GHOST || !reflection.trim()) return;
      nexoraFirestoreService
        .updateFocusSession(uid, sessionId, { reflection })
        .catch((err) => console.warn('Failed saving focus reflection:', err));
    },
    [uid, currentMode]
  );

  // Journey Engine background algorithm sync
  useEffect(() => {
    if (userProfile && userProfile.onboardingCompleted && currentMode !== AppMode.GHOST) {
      const updatedProfile = runJourneyEngine(userProfile, tasks, posts);
      if (updatedProfile !== userProfile) {
        setUserProfile(updatedProfile);
      }
    }
  }, [
    userProfile.sessionsCompleted,
    userProfile.xp,
    userProfile.streak,
    JSON.stringify((userProfile.customMilestones || []).map(m => m.completed)),
    userProfile.interactions.length,
    tasks.filter(t => t.completed).length,
    JSON.stringify(userProfile.interests),
    JSON.stringify(userProfile.goals),
    currentMode
  ]);

  // Persist userProfile changes to Firestore (with diff guard to avoid snapshot echo loops)
  useEffect(() => {
    if (!uid || !hasLoadedProfile || currentMode === AppMode.GHOST) return;
    const serialized = JSON.stringify(userProfile);
    if (serialized === lastSyncedProfileJsonRef.current) return;
    lastSyncedProfileJsonRef.current = serialized;
    nexoraFirestoreService.saveUserProfile(uid, userProfile).catch((err) => {
      console.warn('Failed saving user profile to Firestore:', err);
    });
  }, [uid, hasLoadedProfile, currentMode, userProfile]);

  // Persist userPreferences changes to Firestore
  useEffect(() => {
    if (!uid || !hasLoadedPrefs || currentMode === AppMode.GHOST || isRemotePrefsHydratingRef.current) return;
    const prefsPayload = {
      language: userProfile.language || language || 'en',
      layout: activeLayout,
      currentMode,
      joinedGroupIds,
      poppedWindows,
      autonomousActions: autonomousActionsSynced
    };
    const serialized = JSON.stringify(prefsPayload);
    if (serialized === lastSyncedPrefsJsonRef.current) return;
    lastSyncedPrefsJsonRef.current = serialized;
    nexoraFirestoreService.saveUserPreferences(uid, prefsPayload).catch((err) => {
      console.warn('Failed saving user preferences to Firestore:', err);
    });
  }, [
    uid,
    hasLoadedPrefs,
    currentMode,
    userProfile.language,
    language,
    activeLayout,
    joinedGroupIds,
    poppedWindows,
    autonomousActionsSynced
  ]);

  // Dynamic achievement auto-unlocker
  useEffect(() => {
    if (currentMode === AppMode.GHOST) return;

    const completedMilestonesCount = (userProfile.customMilestones || []).filter(m => m.completed).length;
    const currentUnlockedIds: string[] = [];

    if (userProfile.onboardingCompleted) {
      currentUnlockedIds.push('early_adopter');
    }
    if (completedMilestonesCount >= 1) {
      currentUnlockedIds.push('early_riser');
    }
    if ((userProfile.sessionsCompleted || 0) >= 5) {
      currentUnlockedIds.push('deep_focus_master');
    }
    if (completedMilestonesCount >= 3) {
      currentUnlockedIds.push('stoic_pioneer');
    }
    if ((userProfile.streak || 0) >= 3) {
      currentUnlockedIds.push('grind_master');
    }
    if (purchasedPostIds.size >= 1) {
      currentUnlockedIds.push('catalogue_curator');
    }
    if (savedPostIds.size >= 2) {
      currentUnlockedIds.push('knowledge_archivist');
    }
    if ((userProfile.level || 1) >= 3) {
      currentUnlockedIds.push('level_elite');
    }
    if ((userProfile.momentumRescue?.history?.missionsCompleted || 0) >= 1) {
      currentUnlockedIds.push('momentum_rescued');
    }

    const alreadyAwarded = userProfile.unlockedAchievements || [];
    const absoluteNewUnlocks = currentUnlockedIds.filter(id => !alreadyAwarded.includes(id));

    if (absoluteNewUnlocks.length > 0) {
      setUserProfile(prev => {
        const updatedAwarded = [...(prev.unlockedAchievements || []), ...absoluteNewUnlocks];
        
        const ACHIEVEMENTS_XPS: Record<string, number> = {
          early_adopter: 100,
          early_riser: 150,
          deep_focus_master: 250,
          stoic_pioneer: 200,
          grind_master: 300,
          catalogue_curator: 150,
          knowledge_archivist: 100,
          level_elite: 500,
          momentum_rescued: 150
        };

        const ACHIEVEMENTS_TITLES: Record<string, string> = {
          early_adopter: 'Early Adopter',
          early_riser: 'Early Riser',
          deep_focus_master: 'Deep Focus Master',
          stoic_pioneer: 'Stoic Pioneer',
          grind_master: 'Grind Master',
          catalogue_curator: 'Catalogue Curator',
          knowledge_archivist: 'Knowledge Archivist',
          level_elite: 'Level Elite',
          momentum_rescued: 'Momentum Rescued'
        };

        let addedXp = 0;
        absoluteNewUnlocks.forEach(id => {
          const xpVal = ACHIEVEMENTS_XPS[id] || 0;
          addedXp += xpVal;
          const titleVal = ACHIEVEMENTS_TITLES[id] || id;
          setTimeout(() => {
            showGlobalToast(`🏆 ACHIEVEMENT UNLOCKED: ${titleVal}! (+${xpVal} XP)`, 'success');
          }, 400);
        });

        const newXp = prev.xp + addedXp;
        const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;

        if (newLevel > prev.level) {
          setTimeout(() => {
            showGlobalToast(`⚡ LEVEL UP: Advanced Node Authority ${newLevel} Secured!`, 'success');
          }, 900);
        }

        return {
          ...prev,
          unlockedAchievements: updatedAwarded,
          xp: newXp,
          level: newLevel
        };
      });
    }
  }, [
    userProfile.onboardingCompleted,
    userProfile.sessionsCompleted,
    userProfile.streak,
    userProfile.level,
    JSON.stringify((userProfile.customMilestones || []).map(m => m.completed)),
    savedPostIds.size,
    purchasedPostIds.size,
    currentMode
  ]);

  const completeFocusSession = () => {
    setUserProfile(prev => {
      const newSessions = prev.sessionsCompleted + 1;
      const newStreak = prev.streak + 1;
      const xpGain = 50; // Bonus for completion
      const newXp = prev.xp + xpGain;
      const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;

      return {
        ...prev,
        sessionsCompleted: newSessions,
        streak: newStreak,
        xp: newXp,
        level: newLevel
      };
    });

    // Silent Affinity Engine trigger
    if (currentMode !== AppMode.GHOST) {
      fetch('/api/affinity-engine/record-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile?.userId || uid,
          activityType: 'focus_session_completed'
        })
      }).catch(err => console.warn("Affinity Engine silent activity record failed:", err));
    }

    if (tasks.length > 0 && tasks.filter(t => !t.isBonus).every(t => t.completed)) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('trigger-daily-debrief'));
      }, 2000);
    }
  };

  const handleGhostUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    // Default PIN 1234 or optional fingerprint simulation
    if (ghostPassword === '1234' || ghostPassword === '9999') {
      setIsGhostLocked(false);
      setIsGhostAuthed(true);
      if (pendingTab) setActiveTab(pendingTab);
      setGhostPassword('');
      showGlobalToast("Identity Verified", "success");
    } else {
      showGlobalToast("Access Denied", "info");
      setGhostPassword('');
    }
  };

  const handleOnboardingComplete = (onboardingData: Partial<UserProfile>) => {
    setOnboardingCache(onboardingData);
    setIsCalibrating(true);
  };

  const handleCalibrationComplete = () => {
    if (onboardingCache) {
      const finalizedProfile: UserProfile = {
        ...userProfile,
        ...onboardingCache,
        userId: uid || userProfile.userId,
        onboardingCompleted: true
      };
      setUserProfile(finalizedProfile);
      if (uid && currentMode !== AppMode.GHOST) {
        lastSyncedProfileJsonRef.current = JSON.stringify(finalizedProfile);
        nexoraFirestoreService.saveUserProfile(uid, finalizedProfile).catch(() => {});
      }
      setOnboardingCache(null);
      setIsCalibrating(false);
      showGlobalToast("Neural Identity Deployed", "success");
    }
  };

  // AI Brain Action Intelligence Dispatcher
  const findTaskMatch = useCallback(
    (taskIdOrTitle: string): Task | undefined => {
      const list = currentMode === AppMode.GHOST ? ghostTasks : tasksRef.current;
      const needle = String(taskIdOrTitle || '').trim();
      if (!needle) return undefined;
      const byId = list.find((t) => t.id === needle);
      if (byId) return byId;
      const lower = needle.toLowerCase();
      const exactTitle = list.find((t) => t.title.toLowerCase() === lower);
      if (exactTitle) return exactTitle;
      return list.find((t) => t.title.toLowerCase().includes(lower));
    },
    [currentMode, ghostTasks]
  );

  const aiActionDispatcher: AiActionDispatcher = useMemo(() => {
    const activeSetter = currentMode === AppMode.GHOST ? setGhostTasks : handleTasksChange;

    const createTask = async (input: Partial<Task> & { title: string }): Promise<Task> => {
      const task: Task = {
        id: input.id || `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: uid,
        title: input.title,
        category: input.category || 'Focus',
        completed: Boolean(input.completed),
        timeEstimate: input.timeEstimate || '25m',
        priority: input.priority || 'medium',
        scheduledFor: input.scheduledFor,
        scheduledTime: input.scheduledTime,
        notes: input.notes,
        isAutoGenerated: input.isAutoGenerated ?? true
      };
      activeSetter((prev) => [task, ...prev]);
      return task;
    };

    const createTasksBatch = async (inputs: Array<Partial<Task> & { title: string }>): Promise<Task[]> => {
      const now = Date.now();
      const created: Task[] = inputs.map((input, idx) => ({
        id: input.id || `task_${now}_${idx}_${Math.random().toString(36).slice(2, 5)}`,
        userId: uid,
        title: input.title,
        category: input.category || 'Focus',
        completed: Boolean(input.completed),
        timeEstimate: input.timeEstimate || '25m',
        priority: input.priority || 'medium',
        scheduledFor: input.scheduledFor,
        scheduledTime: input.scheduledTime,
        notes: input.notes,
        isAutoGenerated: input.isAutoGenerated ?? true
      }));
      activeSetter((prev) => [...created, ...prev]);
      return created;
    };

    const updateTask = async (taskIdOrTitle: string, updates: Partial<Task>): Promise<Task | null> => {
      const target = findTaskMatch(taskIdOrTitle);
      if (!target) return null;
      const merged: Task = { ...target, ...updates };
      activeSetter((prev) => prev.map((t) => (t.id === target.id ? merged : t)));
      return merged;
    };

    const deleteTask = async (taskIdOrTitle: string): Promise<boolean> => {
      const target = findTaskMatch(taskIdOrTitle);
      if (!target) return false;
      activeSetter((prev) => prev.filter((t) => t.id !== target.id));
      return true;
    };

    const getTasks = (filter?: { status?: 'all' | 'pending' | 'completed'; category?: string; scheduledFor?: string }): Task[] => {
      const list = currentMode === AppMode.GHOST ? ghostTasks : tasksRef.current;
      return list.filter((t) => {
        if (filter?.status === 'pending' && t.completed) return false;
        if (filter?.status === 'completed' && !t.completed) return false;
        if (filter?.category && t.category.toLowerCase() !== filter.category.toLowerCase()) return false;
        if (filter?.scheduledFor && t.scheduledFor !== filter.scheduledFor) return false;
        return true;
      });
    };

    const completeTask = async (taskIdOrTitle: string): Promise<Task | null> => {
      return updateTask(taskIdOrTitle, { completed: true, completedAt: Date.now() });
    };

    const scheduleTask = async (taskIdOrTitle: string, scheduledFor: string, scheduledTime?: string): Promise<Task | null> => {
      return updateTask(taskIdOrTitle, { scheduledFor, scheduledTime });
    };

    const rescheduleTask = async (taskIdOrTitle: string, scheduledFor: string, scheduledTime?: string): Promise<Task | null> => {
      return updateTask(taskIdOrTitle, { scheduledFor, scheduledTime });
    };

    const prioritizeTask = async (taskIdOrTitle: string, priority: 'low' | 'medium' | 'high'): Promise<Task | null> => {
      return updateTask(taskIdOrTitle, { priority });
    };

    const getDailyProgress = () => {
      const list = currentMode === AppMode.GHOST ? ghostTasks : tasksRef.current;
      const completed = list.filter((t) => t.completed).length;
      const total = list.length;
      const todayKey = new Date().toISOString().split('T')[0];
      const todaySessions = focusSessions.filter((s) => {
        if (s.status !== 'completed') return false;
        return new Date(s.startedAt).toISOString().split('T')[0] === todayKey;
      });
      const deepWorkMinutesToday = todaySessions.reduce((acc, s) => acc + Math.round((s.elapsedSeconds || s.durationSeconds) / 60), 0);
      return {
        totalTasks: total,
        completedTasks: completed,
        pendingTasks: Math.max(0, total - completed),
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        focusSessionsCompleted: effectiveProfile.sessionsCompleted || 0,
        deepWorkMinutesToday,
        streak: effectiveProfile.streak || 0,
        xp: effectiveProfile.xp || 0,
        level: effectiveProfile.level || 1
      };
    };

    const getWeeklyProgress = () => {
      const weekCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const list = currentMode === AppMode.GHOST ? ghostTasks : tasksRef.current;
      const weekSessions = focusSessions.filter((s) => s.startedAt >= weekCutoff);
      const completedSessions = weekSessions.filter((s) => s.status === 'completed');
      const deepWorkMinutesThisWeek = completedSessions.reduce((acc, s) => acc + Math.round((s.elapsedSeconds || s.durationSeconds) / 60), 0);
      return {
        tasksCompletedThisWeek: list.filter((t) => t.completed).length,
        totalTasksTracked: list.length,
        focusSessionsThisWeek: completedSessions.length,
        deepWorkMinutesThisWeek,
        streak: effectiveProfile.streak || 0,
        recentSessions: weekSessions.slice(0, 10).map((s) => ({
          taskTitle: s.taskTitle,
          durationMinutes: Math.round((s.elapsedSeconds || s.durationSeconds) / 60),
          status: s.status,
          startedAt: s.startedAt
        }))
      };
    };

    const startFocusSession = async (opts: { taskId?: string; taskTitle: string; durationMinutes: number; mode?: 'focus' | 'grind' }) => {
      const matched = opts.taskId ? findTaskMatch(opts.taskId) : findTaskMatch(opts.taskTitle);
      setExternalFocusTrigger({
        taskId: matched?.id || opts.taskId,
        taskTitle: matched?.title || opts.taskTitle || 'Focus Session',
        durationMinutes: Math.max(1, opts.durationMinutes || 25),
        mode: opts.mode || 'focus',
        nonce: Date.now()
      });
      setActiveTab(AppTab.HOME);
    };

    const executePendingAction = async (action: AiPendingAction): Promise<AiActionResult> => {
      try {
        if (uid && currentMode !== AppMode.GHOST && action.idempotencyKey) {
          const already = await nexoraFirestoreService.hasExecutedActionLog(uid, action.idempotencyKey);
          if (already) {
            return { success: true, message: 'This action was already applied.' };
          }
        }

        if (action.kind === 'focus_start' && action.focusSession) {
          await startFocusSession(action.focusSession);
          if (uid && currentMode !== AppMode.GHOST) {
            await nexoraFirestoreService.logAiAction(uid, action.idempotencyKey, {
              actionType: action.kind,
              summary: action.summary,
              status: 'executed'
            });
          }
          showGlobalToast(`Focus started: ${action.focusSession.taskTitle}`, 'success');
          return {
            success: true,
            message: `Started ${action.focusSession.durationMinutes}-minute Focus timer for "${action.focusSession.taskTitle}".`,
            startedFocus: true
          };
        }

        const ops = action.taskOps || [];
        const affectedTaskIds: string[] = [];
        const toCreate: Array<Partial<Task> & { title: string }> = [];

        for (const op of ops) {
          if (op.op === 'create' && op.title) {
            toCreate.push({
              title: op.title,
              category: op.category || 'Focus',
              timeEstimate: op.timeEstimate || '25m',
              priority: op.priority || 'medium',
              scheduledFor: op.scheduledFor,
              scheduledTime: op.scheduledTime,
              notes: op.notes
            });
          } else if (op.op === 'update') {
            const targetKey = op.taskId || op.matchTitle || op.title || '';
            const res = await updateTask(targetKey, {
              ...(op.title ? { title: op.title } : {}),
              ...(op.category ? { category: op.category } : {}),
              ...(op.timeEstimate ? { timeEstimate: op.timeEstimate } : {}),
              ...(op.priority ? { priority: op.priority } : {}),
              ...(op.scheduledFor ? { scheduledFor: op.scheduledFor } : {}),
              ...(op.scheduledTime ? { scheduledTime: op.scheduledTime } : {}),
              ...(op.notes ? { notes: op.notes } : {})
            });
            if (res) affectedTaskIds.push(res.id);
          } else if (op.op === 'complete') {
            const res = await completeTask(op.taskId || op.matchTitle || op.title || '');
            if (res) affectedTaskIds.push(res.id);
          } else if (op.op === 'schedule' || op.op === 'reschedule') {
            const dateStr = op.scheduledFor || new Date().toISOString().split('T')[0];
            const res = await scheduleTask(op.taskId || op.matchTitle || op.title || '', dateStr, op.scheduledTime);
            if (res) affectedTaskIds.push(res.id);
          } else if (op.op === 'prioritize') {
            const res = await prioritizeTask(op.taskId || op.matchTitle || op.title || '', op.priority || 'high');
            if (res) affectedTaskIds.push(res.id);
          } else if (op.op === 'delete') {
            const key = op.taskId || op.matchTitle || op.title || '';
            const matched = findTaskMatch(key);
            if (matched && (await deleteTask(matched.id))) {
              affectedTaskIds.push(matched.id);
            }
          }
        }

        if (toCreate.length > 0) {
          const created = await createTasksBatch(toCreate);
          created.forEach((c) => affectedTaskIds.push(c.id));
        }

        if (uid && currentMode !== AppMode.GHOST) {
          await nexoraFirestoreService.logAiAction(uid, action.idempotencyKey, {
            actionType: action.kind,
            summary: action.summary,
            status: 'executed',
            targetIds: affectedTaskIds
          });
        }

        showGlobalToast(action.summary || 'Workspace updated', 'success');
        return {
          success: true,
          message: action.summary || `Updated ${affectedTaskIds.length} task(s).`,
          affectedTaskIds
        };
      } catch (err: any) {
        console.warn('AI Action execution failed:', err);
        if (uid && currentMode !== AppMode.GHOST && action.idempotencyKey) {
          await nexoraFirestoreService.logAiAction(uid, action.idempotencyKey, {
            actionType: action.kind,
            summary: action.summary,
            status: 'failed'
          }).catch(() => {});
        }
        return {
          success: false,
          message: err?.message || 'Failed executing requested action.'
        };
      }
    };

    return {
      createTask,
      createTasksBatch,
      updateTask,
      deleteTask,
      getTasks,
      completeTask,
      scheduleTask,
      rescheduleTask,
      prioritizeTask,
      getDailyProgress,
      getWeeklyProgress,
      startFocusSession,
      executePendingAction
    };
  }, [uid, currentMode, ghostTasks, handleTasksChange, findTaskMatch, focusSessions, effectiveProfile]);

  const renderContent = () => {
    if (!hasLoadedProfile && currentMode !== AppMode.GHOST) {
      return (
        <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-100 font-sans">
          Synchronizing Workspace...
        </div>
      );
    }

    if (!userProfile.onboardingCompleted) {
      if (isCalibrating && onboardingCache) {
        return <CalibrationView profileData={onboardingCache} onFinished={handleCalibrationComplete} />;
      }
      return <OnboardingView onComplete={handleOnboardingComplete} />;
    }

    if (currentMode === AppMode.GHOST && (isGhostLocked || isExitingGhost)) {
      return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-160px)] px-6 bg-slate-950 transition-all duration-1000">
          <div className="bg-slate-900/40 backdrop-blur-3xl p-10 rounded-[50px] border border-white/5 shadow-2xl flex flex-col items-center max-w-sm w-full relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-50" />
            
            <div className="relative z-10 flex flex-col items-center w-full">
              <div className="w-20 h-20 bg-slate-950 rounded-3xl flex items-center justify-center border border-white/10 mb-8 shadow-inner group-hover:scale-110 transition-transform duration-500">
                <Ghost size={32} className="text-slate-400 group-hover:text-indigo-400 transition-colors animate-pulse" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-[0.2em] font-outfit">Ghost Link</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-10 text-center px-4">
                Session isolation active. Identity verification required.
              </p>
              
              <form onSubmit={handleGhostUnlock} className="w-full space-y-6">
                <div className="relative">
                  <input 
                    type="password" 
                    value={ghostPassword} 
                    onChange={(e) => setGhostPassword(e.target.value)} 
                    placeholder="ENTER PIN" 
                    maxLength={4} 
                    className="w-full bg-slate-950 border border-white/5 rounded-2xl p-5 text-center text-2xl text-white outline-none focus:border-indigo-500/30 focus:bg-slate-900 transition-all font-mono tracking-widest placeholder:text-slate-800" 
                    autoFocus 
                  />
                </div>
                <button type="submit" className="w-full bg-white text-slate-950 py-5 rounded-2xl font-bold uppercase tracking-[0.3em] text-[10px] hover:bg-indigo-50 active:scale-95 transition-all shadow-xl">
                  Decrypt Session
                </button>
              </form>
              
              <div className="mt-12 pt-8 border-t border-white/5 w-full text-center">
                 <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest leading-relaxed">
                   Ghost sessions are temporary and disappear after exit.
                 </p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setCurrentMode(AppMode.NORMAL)}
            className="mt-10 text-[9px] font-bold text-slate-500 hover:text-white uppercase tracking-[0.3em] transition-colors border-b border-transparent hover:border-white/20 pb-1"
          >
            Exit Terminal
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case AppTab.HOME: return (
        <HomeView 
          showToast={showGlobalToast} 
          mode={currentMode} 
          userProfile={effectiveProfile} 
          onUpdateProfile={currentMode === AppMode.GHOST ? setGhostUserProfile : setUserProfile} 
          onInteraction={trackInteraction} 
          tasks={effectiveTasks} 
          setTasks={currentMode === AppMode.GHOST ? setGhostTasks : handleTasksChange} 
          setActiveTab={setActiveTab}
          setActiveSubTab={handleSetActiveSubTab}
          joinedGroupIds={joinedGroupIds}
          setJoinedGroupIds={setJoinedGroupIds}
          activeSignalGroupId={activeSignalGroupId}
          setActiveSignalGroupId={setActiveSignalGroupId}
          onModeChange={switchMode}
          externalFocusTrigger={externalFocusTrigger}
          onClearExternalFocusTrigger={() => setExternalFocusTrigger(null)}
          onFocusSessionStart={handleFocusSessionStart}
          onFocusSessionComplete={handleFocusSessionComplete}
          onFocusReflectionSave={handleFocusReflectionSave}
          followedUserIds={followedUserIds}
          onToggleFollowUser={handleToggleFollowUser}
          onActiveSessionChange={(session) => {
            setActiveSession(session);
            if (session && session.type === 'focus' && currentMode === AppMode.NORMAL) {
              setCurrentMode(AppMode.FOCUS);
              showGlobalToast("Focus Mode Activated", "success");
            }
          }}
        />
      );
      case AppTab.EXPLORE: return (
        <ExploreView 
          mode={currentMode} 
          posts={posts} 
          savedPostIds={savedPostIds} 
          purchasedPostIds={purchasedPostIds}
          onToggleSave={toggleSavePost} 
          onBuy={buyPost}
          onToggleLike={handleToggleLike}
          onToggleFollow={handleToggleFollow}
          onInteraction={trackInteraction}
          activeSession={activeSession}
          onActiveSessionChange={(session) => {
            setActiveSession(session);
            if (session && session.type === 'focus' && currentMode === AppMode.NORMAL) {
              setCurrentMode(AppMode.FOCUS);
              showGlobalToast("Focus Mode Activated", "success");
            }
          }}
          onCompleteSession={completeFocusSession}
          showToast={showGlobalToast}
          userProfile={effectiveProfile}
          activeSubTab={activeSubTab}
          setActiveSubTab={handleSetActiveSubTab}
          joinedGroupIds={joinedGroupIds}
          setJoinedGroupIds={setJoinedGroupIds}
          activeSignalGroupId={activeSignalGroupId}
          setActiveSignalGroupId={setActiveSignalGroupId}
        />
      );
      case AppTab.CREATOR: return (
        <CreatorView 
          showToast={showGlobalToast} 
          mode={currentMode} 
          userProfile={effectiveProfile}
          onAddPost={addPost}
          onPublishSuccess={() => {
            setActiveTab(AppTab.EXPLORE);
            setActiveSubTab('circles');
          }}
        />
      );
      case AppTab.MODES: return (
        <ModesView
          currentMode={currentMode}
          setMode={switchMode}
          activeLayout={activeLayout}
          onLayoutChange={handleLayoutChange}
        />
      );
      case AppTab.BRAIN: return (
        <AIBrainView 
          userProfile={effectiveProfile} 
          onInteraction={trackInteraction} 
          tasks={effectiveTasks} 
          autonomousActivities={autonomousActivities}
          mode={currentMode}
          ghostMessages={ghostMessages}
          setGhostMessages={setGhostMessages}
          aiActionDispatcher={aiActionDispatcher}
          focusSessions={focusSessions}
          dailyDebriefs={dailyDebriefs}
        />
      );
      case AppTab.PROFILE: return (
        <ProfileView 
          savedPostIds={savedPostIds} 
          purchasedPostIds={purchasedPostIds}
          allPosts={posts} 
          userProfile={effectiveProfile}
          onUpdateProfile={currentMode === AppMode.GHOST ? setGhostUserProfile : setUserProfile}
          showToast={showGlobalToast}
          followingCount={followedUserIds.length}
        />
      );
      default: return (
        <HomeView 
          showToast={showGlobalToast} 
          mode={currentMode} 
          userProfile={effectiveProfile} 
          onUpdateProfile={currentMode === AppMode.GHOST ? setGhostUserProfile : setUserProfile}
          tasks={effectiveTasks} 
          setTasks={currentMode === AppMode.GHOST ? setGhostTasks : handleTasksChange} 
          setActiveTab={setActiveTab}
          setActiveSubTab={handleSetActiveSubTab}
          joinedGroupIds={joinedGroupIds}
          setJoinedGroupIds={setJoinedGroupIds}
          onModeChange={switchMode}
          externalFocusTrigger={externalFocusTrigger}
          onClearExternalFocusTrigger={() => setExternalFocusTrigger(null)}
          onFocusSessionStart={handleFocusSessionStart}
          onFocusSessionComplete={handleFocusSessionComplete}
          onFocusReflectionSave={handleFocusReflectionSave}
          followedUserIds={followedUserIds}
          onToggleFollowUser={handleToggleFollowUser}
          onActiveSessionChange={(session) => {
            setActiveSession(session);
            if (session && session.type === 'focus' && currentMode === AppMode.NORMAL) {
              setCurrentMode(AppMode.FOCUS);
              showGlobalToast("Focus Mode Activated", "success");
            }
          }}
        />
      );
    }
  };

  const modesConfig = [
    { mode: AppMode.NORMAL, icon: ShieldCheck, color: 'text-indigo-400' },
    { mode: AppMode.FOCUS, icon: Target, color: 'text-indigo-400' },
    { mode: AppMode.GRIND, icon: Zap, color: 'text-orange-400' },
    { mode: AppMode.CHILL, icon: Coffee, color: 'text-emerald-400' },
    { mode: AppMode.GHOST, icon: Ghost, color: 'text-slate-300' },
    { mode: AppMode.VIBE, icon: Palette, color: 'text-fuchsia-400' },
  ];

  const suggestionColors = 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400';
  const suggestionIconColors = 'bg-emerald-500 shadow-emerald-500/20';
  const suggestionButtonColors = 'bg-emerald-500 hover:bg-emerald-400';

  const NavRail = () => {
    const allTabs = [
      { id: 'search', icon: Search, label: 'Search', color: 'text-white' },
      { id: 'circles', icon: Radio, label: 'Circles', color: 'text-indigo-400' },
      { id: 'moments', icon: Clock, label: 'Moments', color: 'text-rose-400' },
      { id: 'signals', icon: Signal, label: 'Signals', color: 'text-emerald-400' },
      { id: 'people', icon: Cpu, label: 'Similar Minds', color: 'text-amber-400' },
      { id: 'messages', icon: Send, label: 'Chat', color: 'text-blue-400' }
    ];

    const visibleTabs = currentMode === AppMode.FOCUS 
      ? allTabs.filter(t => t.id === 'signals') 
      : allTabs;

    return (
      <>
        <div className="fixed right-0 top-0 bottom-0 w-6 z-[70]" onMouseEnter={() => setIsRailOpen(true)} />
        <div className={`fixed right-0 top-1/2 -translate-y-1/2 z-[80] flex flex-col transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) transform ${isRailOpen ? 'translate-x-0' : 'translate-x-[100%]'} bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-l-[32px] overflow-hidden shadow-[20px_0_50px_rgba(0,0,0,0.5)]`} onMouseLeave={() => setIsRailOpen(false)}>
          <div className="flex flex-col">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(AppTab.EXPLORE);
                  handleSetActiveSubTab(tab.id as SocialSubTab);
                  setIsRailOpen(false);
                }}
                className={`p-5 flex flex-col items-center gap-1.5 transition-all hover:bg-white/5 relative group ${activeTab === AppTab.EXPLORE && activeSubTab === tab.id ? 'bg-indigo-600/10' : ''}`}
              >
                <tab.icon size={20} className={`${activeTab === AppTab.EXPLORE && activeSubTab === tab.id ? tab.color : 'text-slate-500'} group-hover:scale-110 transition-transform`} />
                <span className={`text-[7px] font-bold uppercase tracking-widest ${activeTab === AppTab.EXPLORE && activeSubTab === tab.id ? 'text-white' : 'text-slate-600'}`}>{tab.label}</span>
                {activeTab === AppTab.EXPLORE && activeSubTab === tab.id && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-l-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </>
    );
  };

  const touchStartX = useRef(0);

  const handlePagePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    // Don't intercept on active inputs, textareas, sliders, or button items
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }
    pointerStartX.current = e.clientX;
    pointerStartY.current = e.clientY;
    isPointerDownRef.current = true;
  };

  const handlePagePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    const diffX = pointerStartX.current - e.clientX;
    const diffY = pointerStartY.current - e.clientY; // positive = dragged UP

    // Horizontal rail swipe
    if (activeTab === AppTab.EXPLORE) {
      if (diffX > 80 && !isRailOpen) {
        setIsRailOpen(true);
        isPointerDownRef.current = false;
      }
      if (diffX < -80 && isRailOpen) {
        setIsRailOpen(false);
        isPointerDownRef.current = false;
      }
    }

    // Vertical glide (Chill Mode Only)
    if (currentMode === AppMode.CHILL) {
      if (diffY > 60) {
        if (isMusicBarHiddenByGlide) {
          setIsMusicBarHiddenByGlide(false);
          showGlobalToast("Atmospheric Sync restored", "success");
        }
        isPointerDownRef.current = false;
      } else if (diffY < -60) {
        if (!isMusicBarHiddenByGlide && showMusicSuggestion) {
          setIsMusicBarHiddenByGlide(true);
          showGlobalToast("Atmospheric bar hidden. Glide up to restore.", "info");
        }
        isPointerDownRef.current = false;
      }
    }
  };

  const handlePagePointerUp = () => {
    isPointerDownRef.current = false;
  };

  // If running as a standalone popped-out window via URL hash (e.g. #popout=messages)
  if (standalonePopoutTab) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans">
        <header className="h-11 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5 font-outfit font-bold text-xs tracking-wider">
            <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center text-[10px] text-white">N</div>
            <span>NEXORA STANDALONE MODULE</span>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-mono uppercase font-bold">
              {standalonePopoutTab.subTab || standalonePopoutTab.tab}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.hash = '';
              setStandalonePopoutTab(null);
            }}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold rounded-lg transition-colors text-slate-300 hover:text-white"
          >
            Exit Standalone Window
          </button>
        </header>
        <main className="flex-1 overflow-y-auto">
          {standalonePopoutTab.tab === AppTab.EXPLORE && (
            <ExploreView
              mode={currentMode}
              posts={posts}
              savedPostIds={savedPostIds}
              purchasedPostIds={purchasedPostIds}
              onToggleSave={toggleSavePost}
              onBuy={buyPost}
              onToggleLike={handleToggleLike}
              onToggleFollow={handleToggleFollow}
              onInteraction={trackInteraction}
              activeSession={activeSession}
              onActiveSessionChange={(session) => {
                setActiveSession(session);
                if (session && session.type === 'focus' && currentMode === AppMode.NORMAL) {
                  switchMode(AppMode.FOCUS);
                }
              }}
              onCompleteSession={completeFocusSession}
              showToast={showGlobalToast}
              userProfile={effectiveProfile}
              activeSubTab={standalonePopoutTab.subTab || 'circles'}
              setActiveSubTab={() => {}}
              joinedGroupIds={joinedGroupIds}
              setJoinedGroupIds={setJoinedGroupIds}
              activeSignalGroupId={activeSignalGroupId}
              setActiveSignalGroupId={setActiveSignalGroupId}
            />
          )}
          {standalonePopoutTab.tab === AppTab.BRAIN && (
            <AIBrainView
              userProfile={effectiveProfile}
              onInteraction={trackInteraction}
              tasks={effectiveTasks}
              autonomousActivities={autonomousActivities}
              mode={currentMode}
              ghostMessages={ghostMessages}
              setGhostMessages={setGhostMessages}
              aiActionDispatcher={aiActionDispatcher}
              focusSessions={focusSessions}
              dailyDebriefs={dailyDebriefs}
            />
          )}
          {standalonePopoutTab.tab === AppTab.HOME && (
            <HomeView
              showToast={showGlobalToast}
              mode={currentMode}
              userProfile={effectiveProfile}
              onUpdateProfile={currentMode === AppMode.GHOST ? setGhostUserProfile : setUserProfile}
              onInteraction={trackInteraction}
              tasks={effectiveTasks}
              setTasks={currentMode === AppMode.GHOST ? setGhostTasks : handleTasksChange}
              setActiveTab={setActiveTab}
              setActiveSubTab={handleSetActiveSubTab}
              joinedGroupIds={joinedGroupIds}
              setJoinedGroupIds={setJoinedGroupIds}
              activeSignalGroupId={activeSignalGroupId}
              setActiveSignalGroupId={setActiveSignalGroupId}
              onModeChange={switchMode}
              externalFocusTrigger={externalFocusTrigger}
              onClearExternalFocusTrigger={() => setExternalFocusTrigger(null)}
              onFocusSessionStart={handleFocusSessionStart}
              onFocusSessionComplete={handleFocusSessionComplete}
              onFocusReflectionSave={handleFocusReflectionSave}
              followedUserIds={followedUserIds}
              onToggleFollowUser={handleToggleFollowUser}
              onActiveSessionChange={setActiveSession}
            />
          )}
          {standalonePopoutTab.tab === AppTab.MODES && (
            <ModesView
              currentMode={currentMode}
              setMode={switchMode}
              activeLayout={activeLayout}
              onLayoutChange={handleLayoutChange}
            />
          )}
          {standalonePopoutTab.tab === AppTab.CREATOR && (
            <CreatorView
              showToast={showGlobalToast}
              mode={currentMode}
              userProfile={effectiveProfile}
              onAddPost={addPost}
              onPublishSuccess={() => {}}
            />
          )}
          {standalonePopoutTab.tab === AppTab.PROFILE && (
            <ProfileView
              savedPostIds={savedPostIds}
              purchasedPostIds={purchasedPostIds}
              allPosts={posts}
              userProfile={effectiveProfile}
              onUpdateProfile={currentMode === AppMode.GHOST ? setGhostUserProfile : setUserProfile}
              showToast={showGlobalToast}
              followingCount={followedUserIds.length}
            />
          )}
        </main>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen text-slate-50 transition-all duration-1000 nexora-app-shell ${userProfile.onboardingCompleted ? 'md:pl-64' : ''} ${
        currentMode === AppMode.CHILL ? 'bg-[#000d0d]' : 
        currentMode === AppMode.VIBE ? 'bg-[#0d000d]' : 
        currentMode === AppMode.GHOST ? 'bg-[#050508]' :
        'bg-slate-950'
      }`}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
      }}
      onTouchMove={(e) => {
        const diffX = touchStartX.current - e.touches[0].clientX;
        const diffY = touchStartY.current - e.touches[0].clientY; // positive = swipe touch UP

        if (activeTab === AppTab.EXPLORE) {
          if (diffX > 80 && !isRailOpen) setIsRailOpen(true);
          if (diffX < -80 && isRailOpen) setIsRailOpen(false);
        }

        if (currentMode === AppMode.CHILL) {
          if (diffY > 60) {
            if (isMusicBarHiddenByGlide) {
              setIsMusicBarHiddenByGlide(false);
              showGlobalToast("Atmospheric Sync restored", "success");
            }
          } else if (diffY < -60) {
            if (!isMusicBarHiddenByGlide && showMusicSuggestion) {
              setIsMusicBarHiddenByGlide(true);
              showGlobalToast("Atmospheric bar hidden. Glide up to restore.", "info");
            }
          }
        }
      }}
      onPointerDown={handlePagePointerDown}
      onPointerMove={handlePagePointerMove}
      onPointerUp={handlePagePointerUp}
    >
      {activeTab === AppTab.EXPLORE && <NavRail />}
      
      {/* Hidden audio element for atmospheric light music */}
      <audio 
        ref={audioRef} 
        src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" 
        loop 
        preload="auto"
      />

      {toast && (
        <div 
          onClick={handleManualDismiss}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-2.5 bg-slate-900 border border-slate-800 rounded-full animate-in slide-in-from-top-4 duration-300 font-bold uppercase tracking-widest text-[9px] shadow-2xl cursor-pointer select-none hover:bg-slate-800 transition-colors"
          title="Click to dismiss"
        >
          {toast.message}
        </div>
      )}

      {/* Music Suggestion Bottom Bar */}
      {showMusicSuggestion && (
        <div 
          className={`fixed left-6 right-6 z-[60] transition-all duration-500 ease-in-out ${
            isMusicBarHiddenByGlide ? 'bottom-[-150px] opacity-0 pointer-events-none' : 'bottom-24 opacity-100'
          }`}
          onPointerDown={handleMusicBarPointerDown}
          onPointerMove={handleMusicBarPointerMove}
          onPointerUp={handleMusicBarPointerUp}
        >
           <div className={`${suggestionColors} backdrop-blur-2xl border rounded-[28px] p-4 flex flex-col items-center gap-2 shadow-2xl transition-all relative select-none ${isPlayingMusic ? 'ring-2 ring-current opacity-90' : ''}`}>
              {/* Sleek Glide Touch Handle */}
              <div className="w-12 h-1.5 bg-emerald-500/30 rounded-full cursor-ns-resize hover:bg-emerald-500/50 transition-colors mb-1" title="Glide down to hide" />
              
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className={`w-10 h-10 ${suggestionIconColors} rounded-2xl flex items-center justify-center text-slate-950 shadow-lg transition-all ${isPlayingMusic ? 'animate-bounce' : ''}`}>
                      <Music size={20} />
                   </div>
                   <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5">{t('atmospheric_sync', 'Atmospheric Sync')}</p>
                      <p className="text-xs font-medium text-white">{isPlayingMusic ? 'Now Streaming: Light Ambient 🎶' : 'Would you like to play light music? 🎶'}</p>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <button 
                    onClick={toggleMusic}
                    className={`px-5 py-2 flex items-center gap-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg ${isPlayingMusic ? 'bg-rose-500 text-white hover:bg-rose-400' : `${suggestionButtonColors} text-slate-950`}`}
                   >
                      {isPlayingMusic ? <><Square size={12} fill="currentColor" /> Stop</> : t('play', 'Play')}
                   </button>
                   <button onClick={() => { stopMusic(); setShowMusicSuggestion(false); }} className="p-2 opacity-60 hover:opacity-100 transition-colors">
                      <CloseIcon size={18} />
                   </button>
                </div>
              </div>
           </div>
        </div>
      )}

      {userProfile.onboardingCompleted && (
        <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-900 px-4 sm:px-6 py-3.5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile Branding Logo */}
            <div className="flex items-center gap-3 cursor-pointer font-outfit font-bold tracking-[0.25em] group md:hidden shrink-0" onClick={() => handleTabChange(AppTab.HOME)}>
              <div className="w-7 h-7 bg-white text-slate-950 rounded-lg flex items-center justify-center text-[12px] group-hover:rotate-12 transition-transform shadow-lg font-extrabold">N</div>
              <span className="text-[12px]">NEXORA</span>
            </div>

            {/* Desktop Quick Search Trigger */}
            <div className="hidden md:flex items-center gap-3 flex-1 max-w-md">
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="w-full flex items-center justify-between px-4 py-2 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/40 text-slate-400 hover:text-white rounded-2xl transition-all shadow-sm text-xs cursor-pointer group"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Search size={14} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span>{t('search_placeholder', 'Search features, chats or commands...')}</span>
                </span>
                <kbd className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-400 text-[9px] font-mono rounded-lg font-bold group-hover:border-indigo-500/30 group-hover:text-indigo-300">⌘K</kbd>
              </button>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              {/* Latency Monitor */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-full">
                <Signal size={10} className={latency < 15 ? "text-emerald-400" : "text-amber-400"} />
                <span className="text-[8px] font-mono text-slate-500 font-bold uppercase tracking-widest">
                  {t('app_speed', 'App Speed')}: <span className={latency < 15 ? "text-emerald-400" : "text-amber-400"}>{latency < 15 ? t('speed_fast', 'Fast') : t('speed_normal', 'Normal')}</span>
                </span>
              </div>

              {/* Pop-Out Floating Windows Dropdown Menu */}
              <div className="relative" ref={popoutMenuRef}>
                <button
                  onClick={() => setIsPopoutMenuOpen(!isPopoutMenuOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all hover:bg-white/5 active:scale-95 cursor-pointer ${
                    poppedWindows.length > 0
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 shadow-md shadow-indigo-500/20'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                  title="Pop out modules into floating draggable windows"
                >
                  <ExternalLink size={12} className={poppedWindows.length > 0 ? 'text-indigo-400 animate-pulse' : ''} />
                  <span className="hidden sm:inline font-outfit">{t('pop_out', 'Pop Out')}</span>
                  {poppedWindows.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white font-mono text-[8px] flex items-center justify-center font-bold">
                      {poppedWindows.length}
                    </span>
                  )}
                  <ChevronDown size={10} className={`transition-transform duration-300 ${isPopoutMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isPopoutMenuOpen && (
                  <div className="absolute top-full mt-3 right-0 w-64 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-2 animate-in zoom-in-95 duration-200 origin-top-right z-50 backdrop-blur-xl">
                    <div className="px-3 py-2 border-b border-slate-800/80 mb-1 flex items-center justify-between">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                        {t('pop_out_window', 'Pop Out Window')}
                      </p>
                      {poppedWindows.length > 0 && (
                        <button
                          onClick={() => setPoppedWindows([])}
                          className="text-[8px] text-rose-400 hover:underline uppercase font-bold"
                        >
                          {t('close_all', 'Close All')}
                        </button>
                      )}
                    </div>

                    <div className="space-y-1">
                      {/* Current Active Tab Quick Popout */}
                      <button
                        onClick={() => {
                          handlePopoutModule(activeTab, activeSubTab);
                          setIsPopoutMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 bg-indigo-950/60 border border-indigo-500/30 rounded-xl text-indigo-300 hover:bg-indigo-900/80 text-[10px] font-bold uppercase tracking-wider transition-all"
                      >
                        <span className="flex items-center gap-2">
                          <Layers size={13} /> {t('pop_out', 'Pop Out')} ({activeTab})
                        </span>
                        <Plus size={12} />
                      </button>

                      <div className="h-px bg-slate-800 my-1" />

                      {/* Module Options */}
                      {[
                        { tab: AppTab.EXPLORE, subTab: 'messages' as SocialSubTab, label: '💬 Messages & Chat', desc: 'Direct Transmissions' },
                        { tab: AppTab.BRAIN, label: '🧠 AI Neural OS', desc: 'Cognitive Brain View' },
                        { tab: AppTab.MODES, label: '⚡ Mood & Environments', desc: 'Atmospheric Modes' },
                        { tab: AppTab.CREATOR, label: '🎨 Creator Studio', desc: 'Content Creation Engine' },
                        { tab: AppTab.PROFILE, label: '👤 Identity Passport', desc: 'User Profile & Security' },
                        { tab: AppTab.EXPLORE, subTab: 'circles' as SocialSubTab, label: '🌐 Circles & Feed', desc: 'Social Circles' },
                        { tab: AppTab.HOME, label: '⚡ Home Momentum', desc: 'Focus & Feed Matrix' },
                      ].map((item) => {
                        const winKey = item.subTab ? `win-${item.tab}-${item.subTab}` : `win-${item.tab}`;
                        const isOpen = poppedWindows.some(w => w.id === winKey);

                        return (
                          <button
                            key={winKey}
                            onClick={() => {
                              handlePopoutModule(item.tab, item.subTab, item.label.replace(/^[^\s]+\s/, ''));
                              setIsPopoutMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-bold transition-all ${
                              isOpen
                                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <div className="text-left">
                              <p className="font-outfit">{item.label}</p>
                              <p className="text-[8px] text-slate-500 font-normal">{item.desc}</p>
                            </div>
                            {isOpen ? (
                              <span className="text-[8px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                                ACTIVE
                              </span>
                            ) : (
                              <ExternalLink size={12} className="text-slate-500" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" ref={modeMenuRef}>
                <button 
                  onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
                  className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all hover:bg-white/5 active:scale-95 ${
                    currentMode === AppMode.NORMAL ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${currentMode === AppMode.NORMAL ? 'bg-indigo-500' : 'bg-indigo-400 animate-pulse'}`} />
                  {currentMode === AppMode.NORMAL ? t('mode_normal') :
                   currentMode === AppMode.FOCUS ? t('mode_focus') :
                   currentMode === AppMode.GRIND ? t('mode_grind') :
                   currentMode === AppMode.CHILL ? t('mode_chill') :
                   currentMode === AppMode.GHOST ? t('mode_ghost') :
                   currentMode === AppMode.VIBE ? t('mode_vibe') : currentMode}
                  <ChevronDown size={10} className={`transition-transform duration-300 ${isModeMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isModeMenuOpen && (
                  <div className="absolute top-full mt-3 right-0 w-52 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-1.5 animate-in zoom-in-95 duration-200 origin-top-right z-50">
                    <div className="px-3 py-2 border-b border-slate-800/50 mb-1">
                       <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{t('change_mood', 'Change Mood')}</p>
                    </div>
                    {modesConfig.map((cfg) => {
                      const modeLabel = 
                        cfg.mode === AppMode.NORMAL ? t('mode_normal') :
                        cfg.mode === AppMode.FOCUS ? t('mode_focus') :
                        cfg.mode === AppMode.GRIND ? t('mode_grind') :
                        cfg.mode === AppMode.CHILL ? t('mode_chill') :
                        cfg.mode === AppMode.GHOST ? t('mode_ghost') :
                        cfg.mode === AppMode.VIBE ? t('mode_vibe') : cfg.mode;

                      return (
                        <button
                          key={cfg.mode}
                          onClick={() => switchMode(cfg.mode)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest group ${
                            currentMode === cfg.mode 
                              ? 'bg-indigo-600/10 text-indigo-400' 
                              : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <cfg.icon size={14} className={currentMode === cfg.mode ? 'text-indigo-400' : cfg.color} />
                            <span>{modeLabel}</span>
                          </div>
                          {currentMode === cfg.mode && <Check size={12} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="w-8 h-8 rounded-xl bg-slate-900 overflow-hidden border border-slate-800 shadow-inner group cursor-pointer" onClick={() => handleTabChange(AppTab.PROFILE)}>
                <img src={currentMode === AppMode.GHOST ? "https://i.pravatar.cc/150?u=ghost" : (userProfile.avatar || "https://i.pravatar.cc/150?u=alex")} className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all" alt="User Profile" />
              </div>
            </div>
          </div>

        </header>
      )}

      <main className={userProfile.onboardingCompleted ? "pb-24" : ""}>{renderContent()}</main>

      {/* Behavioral Nudge Overlay */}
      {activeNudge && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 mx-auto ${activeNudge.type === 'momentum_rescue' ? 'bg-rose-500/10 text-rose-400' : 'bg-indigo-600/20 text-indigo-400'}`}>
                {activeNudge.type === 'momentum_rescue' ? <Activity size={24} /> : <Target size={24} />}
             </div>
             <h3 className="text-xl font-bold text-white text-center mb-2 uppercase tracking-tight font-outfit">
               {activeNudge.type === 'momentum_rescue' ? t('momentum_shield', 'Momentum Shield') : t('neural_signal', 'Neural Signal')}
             </h3>
             <p className="text-sm text-slate-400 text-center mb-8 leading-relaxed px-2 whitespace-pre-line">
                {activeNudge.type === 'momentum_rescue' && userProfile.momentumRescue?.currentMission?.status === 'started'
                  ? `🎯 For: ${userProfile.momentumRescue.currentMission.parentGoal}\n\n⚡ Action: ${userProfile.momentumRescue.currentMission.description}`
                  : activeNudge.message}
             </p>
             {activeNudge.type === 'momentum_rescue' ? (
               <div className="space-y-3">
                 <button 
                   onClick={handleCompleteRescueMission}
                   className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-2xl text-[11px] font-extrabold uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                 >
                    {userProfile.momentumRescue?.currentMission?.status === 'started' 
                      ? 'Complete 2-Minute Mission' 
                      : 'Start 2-Minute Mission'}
                 </button>
                 <button 
                   onClick={handleIgnoreRescueMission}
                   className="w-full py-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] active:scale-95 transition-all"
                 >
                    {t('maybe_later', 'Maybe Later')}
                 </button>
                 <button 
                   onClick={() => setActiveNudge(null)}
                   className="w-full py-3 bg-transparent text-slate-500 hover:text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] active:scale-95 transition-all block text-center"
                 >
                    {t('close', 'Close')} (✕)
                 </button>
               </div>
             ) : (
               <div className="space-y-3">
                 <button 
                   onClick={startNudgeFocus}
                   className="w-full py-4 bg-white text-slate-950 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all hover:bg-emerald-50"
                 >
                    {t('start_focus', 'Start Focus')}
                 </button>
                 <button 
                   onClick={ignoreNudge}
                   className="w-full py-4 bg-slate-800 border border-slate-700 text-slate-400 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] active:scale-95 transition-all"
                 >
                    {t('ignore', 'Ignore')}
                 </button>
               </div>
             )}
          </div>
        </div>
      )}



      {/* Pop-Out Window Manager Overlay Layer */}
      {userProfile.onboardingCompleted && (
        <PopoutWindowManager
          windows={poppedWindows}
          onClose={handleClosePoppedWindow}
          onMinimize={handleMinimizePoppedWindow}
          onMaximize={handleMaximizePoppedWindow}
          onFocus={handleFocusPoppedWindow}
          onUpdatePosition={handleUpdateWindowPosition}
          onUpdateSize={handleUpdateWindowSize}
          onOpenStandalone={handleOpenStandaloneBrowserWindow}
          showGlobalToast={showGlobalToast}
          currentMode={currentMode}
          userProfile={effectiveProfile}
          setUserProfile={currentMode === AppMode.GHOST ? setGhostUserProfile : setUserProfile}
          posts={posts}
          savedPostIds={savedPostIds}
          purchasedPostIds={purchasedPostIds}
          toggleSavePost={toggleSavePost}
          buyPost={buyPost}
          handleToggleLike={handleToggleLike}
          handleToggleFollow={handleToggleFollow}
          trackInteraction={trackInteraction}
          activeSession={activeSession}
          setActiveSession={setActiveSession}
          completeFocusSession={completeFocusSession}
          tasks={effectiveTasks}
          setTasks={currentMode === AppMode.GHOST ? setGhostTasks : handleTasksChange}
          joinedGroupIds={joinedGroupIds}
          setJoinedGroupIds={setJoinedGroupIds}
          activeSignalGroupId={activeSignalGroupId}
          setActiveSignalGroupId={setActiveSignalGroupId}
          switchMode={switchMode}
          addPost={addPost}
          autonomousActivities={autonomousActivities}
          ghostMessages={ghostMessages}
          setGhostMessages={setGhostMessages}
          aiActionDispatcher={aiActionDispatcher}
          focusSessions={focusSessions}
          dailyDebriefs={dailyDebriefs}
          externalFocusTrigger={externalFocusTrigger}
          onClearExternalFocusTrigger={() => setExternalFocusTrigger(null)}
          onFocusSessionStart={handleFocusSessionStart}
          onFocusSessionComplete={handleFocusSessionComplete}
          onFocusReflectionSave={handleFocusReflectionSave}
          followedUserIds={followedUserIds}
          onToggleFollowUser={handleToggleFollowUser}
          activeLayout={activeLayout}
          onLayoutChange={handleLayoutChange}
          followingCount={followedUserIds.length}
        />
      )}

      {userProfile.onboardingCompleted && (
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={handleTabChange} 
          showToast={showGlobalToast} 
          currentMode={currentMode} 
          onToggleGhost={toggleGhostMode}
          onToggleFocus={toggleFocusMode}
          onOpenCommandSearch={() => setIsCommandPaletteOpen(true)}
          userProfile={effectiveProfile}
        />
      )}

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTab={handleTabChange}
        onSwitchMode={switchMode}
        onPopoutModule={handlePopoutModule}
      />

      <DailyDebriefModal
        isOpen={isDebriefOpen}
        onClose={() => setIsDebriefOpen(false)}
        userProfile={effectiveProfile}
        tasks={effectiveTasks}
        onPrepareTomorrow={handlePrepareTomorrow}
        onSaveDebrief={handleSaveDailyDebrief}
      />
    </div>
  );
};

export default App;
