
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { geminiService } from '../services/geminiService';
import { nextStepService, BonusChallenge } from '../services/nextStepService';
import { CheckCircle2, Circle, Clock, Flame, BookOpen, Heart, DollarSign, Target, Trophy, Medal, Crown, Quote, Sparkles, Timer, Play, Pause, RotateCcw, Wind, Zap, ArrowRight, Shield, ShieldCheck, X, TrendingUp, Brain, Cpu, Bell, Ghost, Activity, Rocket, Wrench, Moon, Users, Plus, Award, ChevronLeft, ChevronRight, Compass, AlertCircle, UserPlus, MoreHorizontal, Layers, LayoutGrid, SlidersHorizontal, ArrowUp, ArrowDown, Eye, EyeOff, RotateCcw as ResetIcon, Sparkles as AiIcon, ClipboardList, Palette, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Task, LeaderboardUser, AppMode, UserProfile, AppTab, SocialSubTab, ActiveSession, UserPublicProfile } from '../types';
import { nexoraFirestoreService } from '../services/nexoraFirestoreService';

const productivityData = [
  { name: 'Mon', score: 28 }, { name: 'Tue', score: 42 }, { name: 'Wed', score: 35 },
  { name: 'Thu', score: 68 }, { name: 'Fri', score: 55 }, { name: 'Sat', score: 85 }, { name: 'Sun', score: 48 },
];

const OTHER_USERS: LeaderboardUser[] = [
  { id: '1', name: 'Sarah J.', avatar: 'https://i.pravatar.cc/150?u=sarah', score: 982, tasksCompleted: 42, rank: 1, streak: 24, globalBurn: '96%', neuralAward: 'Grind Master' },
  { id: '3', name: 'Kira L.', avatar: 'https://i.pravatar.cc/150?u=kira', score: 910, tasksCompleted: 35, rank: 3, streak: 18, globalBurn: '89%', neuralAward: 'Neural Architect' },
  { id: '4', name: 'Marcus D.', avatar: 'https://i.pravatar.cc/150?u=marcus', score: 880, tasksCompleted: 31, rank: 4, streak: 8, globalBurn: '75%', neuralAward: 'Stoic Explorer' },
  { id: '5', name: 'Elena V.', avatar: 'https://i.pravatar.cc/150?u=elena', score: 865, tasksCompleted: 29, rank: 5, streak: 5, globalBurn: '82%', neuralAward: 'Quantum Scholar' },
];

const RECOMMENDED_POOL = [
  {
    id: 'rayan',
    name: 'Rayan K.',
    avatar: 'https://i.pravatar.cc/150?u=rayan',
    score: 850,
    tasksCompleted: 26,
    rank: 6,
    streak: 12,
    globalBurn: '81%',
    focusHabits: 'Deep Work',
    neuralAward: 'Cognitive Ranger',
    interests: ['Advanced Coding', 'Stoic Philosophy', 'Deep Work'],
    signalGroups: ['deep-work', 'startup-builders']
  },
  {
    id: 'sienna',
    name: 'Sienna M.',
    avatar: 'https://i.pravatar.cc/150?u=sienna',
    score: 920,
    tasksCompleted: 34,
    rank: 2,
    streak: 15,
    globalBurn: '91%',
    focusHabits: 'Biohacking',
    neuralAward: 'Flow Master',
    interests: ['Biohacking', 'Human Longevity', 'Growth Marketing'],
    signalGroups: ['growth-circle']
  },
  {
    id: 'leo',
    name: 'Leo T.',
    avatar: 'https://i.pravatar.cc/150?u=leo',
    score: 790,
    tasksCompleted: 22,
    rank: 7,
    streak: 6,
    globalBurn: '72%',
    focusHabits: 'SaaS Entrepreneurship',
    interests: ['SaaS Entrepreneurship', 'Venture Capital', 'Digital Nomadism'],
    signalGroups: ['startup-builders']
  }
];

export const SIGNAL_GROUPS_LIST = [
  {
    id: 'deep-work',
    name: 'Deep Work Warriors',
    icon: '🧠',
    baseMembers: 124,
    description: 'Focused deep-work community. Daily focus sessions and accountability.'
  },
  {
    id: 'startup-builders',
    name: 'Startup Builders',
    icon: '🚀',
    baseMembers: 86,
    description: 'Ambitious operators building scalable technology products.'
  },
  {
    id: 'growth-circle',
    name: 'Growth Circle',
    icon: '📚',
    baseMembers: 41,
    description: 'Continuous learning and high-leverage personal expansion.'
  }
];

const MOTIVATIONAL_QUOTES = [
  { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "Escape competition through authenticity.", author: "Naval Ravikant" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Wealth is not about having a lot of money; it's about having a lot of options.", author: "Chris Rock" }
];

const STREAK_CATEGORIES = [
  { id: 'discipline', title: 'Build Discipline', icon: Flame, desc: 'Stay consistent daily.', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.35)]' },
  { id: 'learn', title: 'Learn Something New', icon: Brain, desc: 'Grow your knowledge every day.', glow: 'shadow-[0_0_15px_rgba(99,102,241,0.35)]' },
  { id: 'health', title: 'Health & Energy', icon: Heart, desc: 'Improve physical and mental wellness.', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.35)]' },
  { id: 'create', title: 'Create & Build', icon: Rocket, desc: 'Work on projects, business, or ideas.', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.35)]' },
  { id: 'mindfulness', title: 'Mindfulness', icon: Moon, desc: 'Stay mentally clear and calm.', glow: 'shadow-[0_0_15px_rgba(139,92,246,0.35)]' },
  { id: 'productivity', title: 'Productivity', icon: Target, desc: 'Complete meaningful daily tasks.', glow: 'shadow-[0_0_15px_rgba(234,179,8,0.35)]' },
  { id: 'social', title: 'Social Connection', icon: Users, desc: 'Build stronger relationships.', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.35)]' },
  { id: 'custom', title: 'Custom Streak', icon: Plus, desc: 'Create your own streak.', glow: 'shadow-[0_0_15px_rgba(100,116,139,0.35)]' }
];

const STREAK_MOTIVATIONS = [
  "Day 1 initiated.",
  "Momentum detected.",
  "Consistency protocol activated.",
  "Neural growth has begun."
];

const TASK_CATEGORY_OPTIONS = ['Focus', 'Admin', 'Creative', 'Skills', 'Health', 'Study', 'Money'] as const;

const getCategoryVisuals = (category: string) => {
  switch (category) {
    case 'Focus':
      return {
        icon: Zap,
        badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
        iconBoxClass: 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400',
      };
    case 'Admin':
      return {
        icon: ClipboardList,
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        iconBoxClass: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
      };
    case 'Creative':
      return {
        icon: Palette,
        badgeClass: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30',
        iconBoxClass: 'bg-fuchsia-500/10 border-fuchsia-500/25 text-fuchsia-400',
      };
    case 'Skills':
      return {
        icon: Clock,
        badgeClass: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
        iconBoxClass: 'bg-violet-500/10 border-violet-500/25 text-violet-400',
      };
    case 'Health':
      return {
        icon: Heart,
        badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        iconBoxClass: 'bg-rose-500/10 border-rose-500/25 text-rose-400',
      };
    case 'Study':
      return {
        icon: BookOpen,
        badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
        iconBoxClass: 'bg-sky-500/10 border-sky-500/25 text-sky-400',
      };
    case 'Money':
      return {
        icon: DollarSign,
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        iconBoxClass: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
      };
    default:
      return {
        icon: Target,
        badgeClass: 'bg-slate-800/80 text-slate-300 border-slate-700',
        iconBoxClass: 'bg-slate-950 border-slate-800 text-indigo-400',
      };
  }
};

const playSynthSound = (type: 'click' | 'success') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'success') {
      const now = ctx.currentTime;
      [523.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        
        gain.gain.setValueAtTime(0.12, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = freq;
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.4);
      });
    }
  } catch (e) {
    console.warn("AudioContext standard fallback:", e);
  }
};

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
}

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const AMPM = ['AM', 'PM'] as const;
const REPEAT_OPTIONS = ['Once', 'Daily', 'Weekdays', 'Custom'] as const;

interface ScrollColumnProps {
  items: string[];
  current: string;
  onChange: (val: string) => void;
  label: string;
}

const ScrollColumn: React.FC<ScrollColumnProps> = ({ items, current, onChange, label }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<any>(null);

  // Sync scroll position with the central element
  useEffect(() => {
    if (isScrollingRef.current) return;
    const container = containerRef.current;
    if (!container) return;
    
    const index = items.indexOf(current);
    if (index !== -1) {
      const itemHeight = 36; // h-9 is 36px
      container.scrollTop = index * itemHeight;
    }
  }, [current, items]);

  // Bind an active wheel listener to support mouse scrolling with zero interruption
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    const handleW = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const direction = e.deltaY > 0 ? 1 : -1;
      const currentIndex = items.indexOf(current);
      let targetIndex = currentIndex + direction;
      
      if (targetIndex < 0) targetIndex = 0;
      if (targetIndex >= items.length) targetIndex = items.length - 1;
      
      const newValue = items[targetIndex];
      if (newValue !== current) {
        onChange(newValue);
        playSynthSound('click');
      }
    };
    
    el.addEventListener('wheel', handleW, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleW);
    };
  }, [current, items, onChange]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    isScrollingRef.current = true;
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      const itemHeight = 36;
      const scrolledIndex = Math.round(container.scrollTop / itemHeight);
      
      if (scrolledIndex >= 0 && scrolledIndex < items.length) {
        const newValue = items[scrolledIndex];
        if (newValue !== current) {
          onChange(newValue);
          playSynthSound('click');
        }
      }
    }, 85);
  };

  return (
    <div className="flex flex-col items-center">
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[108px] w-14 overflow-y-scroll snap-y snap-mandatory no-scrollbar py-[36px] bg-slate-950/60 rounded-xl border border-slate-800/40 shadow-inner flex flex-col"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item) => (
          <div
            key={item}
            onClick={() => {
              onChange(item);
              playSynthSound('click');
            }}
            className={`h-9 min-h-[36px] snap-center flex items-center justify-center font-mono text-xs font-bold cursor-pointer transition-all duration-200 select-none ${
              item === current 
                ? 'text-sky-400 font-extrabold text-[15px] scale-110 bg-sky-500/10 border-y border-sky-400/20' 
                : 'text-slate-500 opacity-40 hover:opacity-80'
            }`}
          >
            {item}
          </div>
        ))}
      </div>
      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-1">{label}</span>
    </div>
  );
};


interface ReportData {
  id: string;
  label: string;
  title: string;
  desc: string;
  spendNexora: string;
  spendProductivity: string;
  spendGrowth: string;
  nexoraPercent: string;
  productivityPercent: string;
  growthPercent: string;
  avgFocus: string;
  peakFlow: string;
  focusBars: { day: string; val: string }[];
}

const REPORTS_DATA: Record<string, ReportData> = {
  week: {
    id: 'week',
    label: 'Week',
    title: 'Weekly Epoch Synthesis',
    desc: 'Level Up credentials, cognitive load, and goal relays',
    spendNexora: '14.8 hrs',
    spendProductivity: '9.2 hrs',
    spendGrowth: '5.6 hrs',
    nexoraPercent: '100%',
    productivityPercent: '62%',
    growthPercent: '38%',
    avgFocus: '89.2%',
    peakFlow: 'Alpha State Active',
    focusBars: [
      { day: 'M', val: '65%' },
      { day: 'T', val: '82%' },
      { day: 'W', val: '74%' },
      { day: 'T', val: '91%' },
      { day: 'F', val: '86%' },
      { day: 'S', val: '95%' },
      { day: 'S', val: '80%' }
    ]
  },
  month: {
    id: 'month',
    label: 'Month',
    title: 'Monthly Epoch Synthesis',
    desc: 'Macro trends, sustained cognitive endurance, and system calibration',
    spendNexora: '64.5 hrs',
    spendProductivity: '41.2 hrs',
    spendGrowth: '23.3 hrs',
    nexoraPercent: '100%',
    productivityPercent: '64%',
    growthPercent: '36%',
    avgFocus: '88.5%',
    peakFlow: 'Deep Flow Achieved',
    focusBars: [
      { day: 'W1', val: '82%' },
      { day: 'W2', val: '89%' },
      { day: 'W3', val: '85%' },
      { day: 'W4', val: '91%' }
    ]
  },
  '4 months': {
    id: '4 months',
    label: '4 Months',
    title: 'Quadrimester Epoch Synthesis',
    desc: 'Extended skill mastery, neuroplastic development, and habit architecture',
    spendNexora: '254.0 hrs',
    spendProductivity: '162.5 hrs',
    spendGrowth: '91.5 hrs',
    nexoraPercent: '100%',
    productivityPercent: '64%',
    growthPercent: '36%',
    avgFocus: '87.9%',
    peakFlow: 'Neuro-Sustained State',
    focusBars: [
      { day: 'M1', val: '84%' },
      { day: 'M2', val: '88%' },
      { day: 'M3', val: '86%' },
      { day: 'M4', val: '91%' }
    ]
  },
  '6 months': {
    id: '6 months',
    label: '6 Months',
    title: 'Bi-Annual Epoch Synthesis',
    desc: 'Deep evolutionary analysis, foundational streak tracking, and life alignment',
    spendNexora: '385.2 hrs',
    spendProductivity: '246.0 hrs',
    spendGrowth: '139.2 hrs',
    nexoraPercent: '100%',
    productivityPercent: '64%',
    growthPercent: '36%',
    avgFocus: '89.0%',
    peakFlow: 'Sublime Synthesis Level',
    focusBars: [
      { day: 'M1', val: '83%' },
      { day: 'M2', val: '86%' },
      { day: 'M3', val: '88%' },
      { day: 'M4', val: '92%' },
      { day: 'M5', val: '89%' },
      { day: 'M6', val: '94%' }
    ]
  },
  year: {
    id: 'year',
    label: 'Year',
    title: 'Annual Epoch Synthesis',
    desc: 'Ultimate character leveling, legacy goal achievement, and pure mental transcendence',
    spendNexora: '784.0 hrs',
    spendProductivity: '492.2 hrs',
    spendGrowth: '291.8 hrs',
    nexoraPercent: '100%',
    productivityPercent: '63%',
    growthPercent: '37%',
    avgFocus: '89.5%',
    peakFlow: 'Transcendent Evolution Complete',
    focusBars: [
      { day: 'Q1', val: '86%' },
      { day: 'Q2', val: '89%' },
      { day: 'Q3', val: '91%' },
      { day: 'Q4', val: '92%' }
    ]
  }
};


interface HomeViewProps {
  showToast: (msg: string, type?: 'info' | 'success') => void;
  mode?: AppMode;
  userProfile?: UserProfile;
  onUpdateProfile?: React.Dispatch<React.SetStateAction<UserProfile>>;
  onInteraction?: (postId: string, type: 'like' | 'share' | 'purchase' | 'view') => void;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setActiveTab?: (tab: AppTab) => void;
  setActiveSubTab?: (tab: SocialSubTab) => void;
  joinedGroupIds: string[];
  setJoinedGroupIds: React.Dispatch<React.SetStateAction<string[]>>;
  activeSignalGroupId?: string | null;
  setActiveSignalGroupId?: (groupId: string | null) => void;
  onModeChange?: (mode: AppMode) => void;
  onActiveSessionChange?: (session: ActiveSession | null) => void;
  externalFocusTrigger?: {
    taskId?: string;
    taskTitle: string;
    durationMinutes: number;
    mode?: 'focus' | 'grind';
    nonce: number;
  } | null;
  onClearExternalFocusTrigger?: () => void;
  onFocusSessionStart?: (session: {
    id: string;
    taskId?: string;
    taskTitle: string;
    mode: 'focus' | 'grind' | 'chill' | 'break';
    durationSeconds: number;
  }) => void;
  onFocusSessionComplete?: (sessionId: string, elapsedSeconds: number) => void;
  onFocusReflectionSave?: (sessionId: string, reflection: string) => void;
  followedUserIds?: string[];
  onToggleFollowUser?: (userId: string, userName: string, shouldFollow: boolean) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ 
  showToast, 
  mode = AppMode.NORMAL, 
  userProfile, 
  onUpdateProfile, 
  onInteraction, 
  tasks, 
  setTasks,
  setActiveTab,
  setActiveSubTab,
  joinedGroupIds,
  setJoinedGroupIds,
  activeSignalGroupId,
  setActiveSignalGroupId,
  onModeChange,
  onActiveSessionChange,
  externalFocusTrigger,
  onClearExternalFocusTrigger,
  onFocusSessionStart,
  onFocusSessionComplete,
  onFocusReflectionSave,
  followedUserIds: externalFollowedUserIds,
  onToggleFollowUser
}) => {
  const isGhost = mode === AppMode.GHOST;
  const isFocus = mode === AppMode.FOCUS;
  
  // Next Meaningful Step feature states
  const [completedBonusCountToday, setCompletedBonusCountToday] = useState<number>(0);
  const [showBonusStepNotification, setShowBonusStepNotification] = useState(false);
  const [nextBonusStep, setNextBonusStep] = useState<BonusChallenge | null>(null);
  const [isGeneratingNextStep, setIsGeneratingNextStep] = useState(false);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [justCompletedBonus, setJustCompletedBonus] = useState<BonusChallenge | null>(null);

  // Suspicious Completion Detection States
  const [showSuspiciousModal, setShowSuspiciousModal] = useState(false);
  const [suspiciousTasks, setSuspiciousTasks] = useState<Task[]>([]);
  const [pendingRewards, setPendingRewards] = useState<string[]>([]);
  const [showReviewList, setShowReviewList] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const completionTimestampsRef = useRef<{ id: string; timestamp: number }[]>([]);
  const grantedRewardsRef = useRef<Set<string>>(new Set());

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isCategorizingTask, setIsCategorizingTask] = useState(false);
  const [isAnalyzingCategory, setIsAnalyzingCategory] = useState(false);
  const [selectedCategoryOverride, setSelectedCategoryOverride] = useState<string>('Auto');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');
  const [autoCategoryPreview, setAutoCategoryPreview] = useState<{
    title: string;
    category: string;
    timeEstimate: string;
    reason: string;
    source?: 'gemini' | 'fallback';
  } | null>(null);
  const latestTaskQueryRef = useRef<string>('');

  useEffect(() => {
    const trimmed = newTaskTitle.trim();
    latestTaskQueryRef.current = trimmed;

    if (!isAddingTask || selectedCategoryOverride !== 'Auto' || trimmed.length < 3) {
      setIsAnalyzingCategory(false);
      if (trimmed.length < 3) {
        setAutoCategoryPreview(null);
      }
      return;
    }

    const controller = new AbortController();
    setIsAnalyzingCategory(true);

    const timer = window.setTimeout(async () => {
      try {
        const result = await geminiService.categorizeTask(trimmed, controller.signal);
        if (latestTaskQueryRef.current === trimmed) {
          setAutoCategoryPreview({
            title: trimmed,
            category: result.category,
            timeEstimate: result.timeEstimate,
            reason: result.reason,
            source: result.source
          });
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('Live task categorization preview error:', err);
        }
      } finally {
        if (latestTaskQueryRef.current === trimmed) {
          setIsAnalyzingCategory(false);
        }
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [newTaskTitle, isAddingTask, selectedCategoryOverride]);
  const [quoteIdx] = useState(() => Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length));
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [burstingTaskId, setBurstingTaskId] = useState<string | null>(null);
  const [particles, setParticles] = useState<any[]>([]);
  const [isBreakingDown, setIsBreakingDown] = useState<string | null>(null);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<LeaderboardUser | null>(null);
  const [slideDirection, setSlideDirection] = useState<number>(1);
  const leaderboardRef = useRef<HTMLDivElement>(null);

  // Tracking user's social upgrades
  const [profileViewsCount, setProfileViewsCount] = useState<number>(0);
  const [followActionsCount, setFollowActionsCount] = useState<number>(0);
  const [internalFollowedUserIds, setInternalFollowedUserIds] = useState<string[]>([]);
  const followedUserIds = externalFollowedUserIds ?? internalFollowedUserIds;

  const [publicProfiles, setPublicProfiles] = useState<UserPublicProfile[]>([]);
  useEffect(() => {
    if (isGhost || !userProfile?.userId) return;
    const unsub = nexoraFirestoreService.subscribePublicProfiles(
      (profiles) => setPublicProfiles(profiles),
      () => {}
    );
    return () => unsub();
  }, [isGhost, userProfile?.userId]);

  // State to trigger show custom modal after following
  const [showPostFollowModal, setShowPostFollowModal] = useState(false);
  const [lastFollowedUser, setLastFollowedUser] = useState<any>(null);

  const handleToggleJoinGroup = (groupId: string, groupName: string) => {
    const isJoined = joinedGroupIds.includes(groupId);
    if (!isJoined) {
      setJoinedGroupIds(prev => [...prev, groupId]);
      playSynthSound('success');
      showToast(`Sync established with ${groupName}! +100 XP gained.`, 'success');
      
      if (onUpdateProfile) {
        onUpdateProfile(prev => {
          const newXp = prev.xp + 100;
          const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
          
          if (newLevel > prev.level) {
            setTimeout(() => {
              showToast(`⚡ LEVEL UP: Advanced Node Authority ${newLevel} Secured!`, 'success');
            }, 900);
          }
          return {
            ...prev,
            xp: newXp,
            level: newLevel
          };
        });
      }

      if (setActiveSignalGroupId) {
        setActiveSignalGroupId(groupId);
      }
      
      // Auto open signal tab under explore
      if (setActiveTab) {
        setActiveTab(AppTab.EXPLORE);
      }
      if (setActiveSubTab) {
        setActiveSubTab('signals');
      }

      // Automatically launch focus session
      if (onActiveSessionChange) {
        onActiveSessionChange({
          type: 'focus',
          timeLeft: 600,
          participants: 4,
          totalTime: 600,
          joinedAt: Date.now(),
          isSyncSession: true
        });
      }
    } else {
      setJoinedGroupIds(prev => prev.filter(id => id !== groupId));
      playSynthSound('click');
      showToast(`Disconnected from ${groupName}`, 'info');
      if (activeSignalGroupId === groupId && setActiveSignalGroupId) {
        setActiveSignalGroupId(null);
      }
    }
  };

  const handleFollowClick = (userId: string, userName: string) => {
    const isFollowed = followedUserIds.includes(userId);
    if (onToggleFollowUser) {
      onToggleFollowUser(userId, userName, !isFollowed);
    } else {
      setInternalFollowedUserIds(prev => isFollowed ? prev.filter(id => id !== userId) : [...prev, userId]);
    }
    if (!isFollowed) {
      setFollowActionsCount(bc => bc + 1);
      playSynthSound('success');
      
      if (onUpdateProfile) {
        onUpdateProfile(prev => {
          const newXp = prev.xp + 50;
          const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
          
          if (newLevel > prev.level) {
            setTimeout(() => {
              showToast(`⚡ LEVEL UP: Advanced Node Authority ${newLevel} Secured!`, 'success');
            }, 900);
          }
          return {
            ...prev,
            xp: newXp,
            level: newLevel
          };
        });
      }
      showToast(`Connected to ${userName}! +50 XP gained.`, 'success');

      setTimeout(() => {
        setLastFollowedUser(selectedUserForProfile || { id: userId, name: userName });
        setShowPostFollowModal(true);
      }, 500);
    } else {
      playSynthSound('click');
      showToast(`Disconnected from ${userName}`, 'info');
    }
  };

  const handleViewUserProfile = (user: LeaderboardUser) => {
    setSlideDirection(1);
    setSelectedUserForProfile(user);
    setProfileViewsCount(prev => prev + 1);
    playSynthSound('click');
  };

  const getSelectedUserSocialStats = (userId: string) => {
    const isFollowed = followedUserIds.includes(userId);
    const baseFollowersMap: Record<string, number> = {
      '1': 412,
      '3': 284,
      '4': 156,
      '5': 220,
      'rayan': 189,
      'sienna': 245,
      'leo': 112
    };
    const defaultFollowingMap: Record<string, number> = {
      '1': 98,
      '3': 61,
      '4': 82,
      '5': 75,
      'rayan': 54,
      'sienna': 92,
      'leo': 38
    };
    const defaultGroupsMap: Record<string, number> = {
      '1': 2,
      '3': 3,
      '4': 1,
      '5': 2,
      'rayan': 2,
      'sienna': 1,
      'leo': 1
    };

    const baseFollowers = baseFollowersMap[userId] || 150;
    const following = defaultFollowingMap[userId] || 50;
    const groups = defaultGroupsMap[userId] || 2;

    return {
      followers: baseFollowers + (isFollowed ? 1 : 0),
      following: following,
      groups: groups
    };
  };

  const getPeopleYouMayFollow = () => {
    const userInterests = userProfile?.interests || [];
    const userXp = userProfile?.xp || 500;
    
    const candidates = [
       ...OTHER_USERS.filter(u => u.name !== (userProfile?.name || 'Alex M.')),
       ...RECOMMENDED_POOL
    ];
    
    const scored = candidates.map(candidate => {
      let score = 0;
      const candidateXp = candidate.score;
      const xpDiff = Math.abs(userXp - candidateXp);
      if (xpDiff <= 300) score += 4;
      else if (xpDiff <= 600) score += 2;
      
      let candInterests: string[] = [];
      if ('interests' in candidate) {
        candInterests = (candidate as any).interests;
      } else {
        if (candidate.neuralAward === 'Grind Master') candInterests = ['Deep Work', 'Stoic Philosophy', 'Advanced Coding'];
        if (candidate.neuralAward === 'Neural Architect') candInterests = ['Neural Architecture', 'Biohacking', 'AI Ethics'];
        if (candidate.neuralAward === 'Stoic Explorer') candInterests = ['Stoic Philosophy', 'Financial Freedom', 'Deep Work'];
        if (candidate.neuralAward === 'Quantum Scholar') candInterests = ['Quantum Computing', 'Advanced Coding', 'Web3'];
      }
      
      const intersection = userInterests.filter(x => candInterests.includes(x));
      score += intersection.length * 3;
      
      let candGroups: string[] = [];
      if ('signalGroups' in candidate) {
        candGroups = (candidate as any).signalGroups;
      } else {
        if (candidate.id === '1') candGroups = ['deep-work', 'growth-circle'];
        if (candidate.id === '3') candGroups = ['deep-work', 'startup-builders', 'growth-circle'];
        if (candidate.id === '4') candGroups = ['startup-builders'];
        if (candidate.id === '5') candGroups = ['deep-work', 'growth-circle'];
      }
      
      const groupIntersection = joinedGroupIds.filter(g => candGroups.includes(g));
      score += groupIntersection.length * 5;
      
      const pct = Math.min(98, Math.max(65, 65 + score * 4));
      
      let matchReason = "Similar focus profile";
      if (groupIntersection.length > 0) {
        matchReason = "Shared Signal Groups";
      } else if (intersection.length > 0) {
        matchReason = `Match in: ${intersection[0]}`;
      } else if (xpDiff <= 300) {
        matchReason = "Aligned Cognitive Intensity";
      }
      
      return {
        ...candidate,
        matchPercent: pct,
        matchReason: matchReason,
        candGroups: candGroups
      };
    });

    const unfollowed = scored.filter(c => !followedUserIds.includes(c.id));
    return unfollowed.sort((a, b) => b.matchPercent - a.matchPercent);
  };

  const getRecommendationReasons = (userNameOrId: string): string[] => {
    const userInterests = userProfile?.interests || [];
    const nameLower = userNameOrId.toLowerCase();
    
    // Dynamic lists based on candidate
    let candInterests: string[] = [];
    let candGroups: string[] = [];
    let habits = "";
    
    if (nameLower.includes('sarah') || nameLower === '1') {
      candInterests = ['Deep Work', 'Stoic Philosophy', 'Advanced Coding'];
      candGroups = ['deep-work'];
      habits = 'Early morning power focus blocks';
    } else if (nameLower.includes('kira') || nameLower === '3') {
      candInterests = ['Neural Architecture', 'Biohacking', 'AI Ethics'];
      candGroups = ['startup-builders', 'deep-work'];
      habits = 'Midday creative building sprints';
    } else if (nameLower.includes('marcus') || nameLower === '4') {
      candInterests = ['Stoic Philosophy', 'Financial Freedom', 'Deep Work'];
      candGroups = ['startup-builders'];
      habits = 'Consistent afternoon reading and focus';
    } else if (nameLower.includes('elena') || nameLower === '5') {
      candInterests = ['Quantum Computing', 'Advanced Coding', 'Web3', 'Fitness'];
      candGroups = ['deep-work', 'growth-circle'];
      habits = 'High HRV alignment sessions';
    } else if (nameLower.includes('rayan')) {
      candInterests = ['Advanced Coding', 'Stoic Philosophy', 'Deep Work'];
      candGroups = ['deep-work', 'startup-builders'];
      habits = 'Late night development cycles';
    } else if (nameLower.includes('sienna')) {
      candInterests = ['Biohacking', 'Human Longevity', 'Growth Marketing'];
      candGroups = ['growth-circle'];
      habits = 'Coherent diaphragmatic flow sessions';
    } else if (nameLower.includes('leo')) {
      candInterests = ['SaaS Entrepreneurship', 'Venture Capital', 'Digital Nomadism'];
      candGroups = ['startup-builders'];
      habits = 'Continuous remote building blocks';
    } else {
      candInterests = ['Deep Work', 'AI'];
      candGroups = ['growth-circle'];
      habits = 'General focus syncing';
    }
    
    const reasons: string[] = [];
    const commonInterests = userInterests.filter(i => candInterests.includes(i));
    if (commonInterests.length > 0) {
      reasons.push(`Alphasync: Common learning topics in ${commonInterests.join(' & ')}`);
    } else {
      reasons.push(`Targeted interest overlap in ${candInterests.slice(0, 2).join(' & ')}`);
    }
    
    const sharedGroups = joinedGroupIds.filter(g => candGroups.some(cg => cg.toLowerCase().includes(g) || g.toLowerCase().includes(cg)));
    if (sharedGroups.length > 0) {
      const groupNames = sharedGroups.map(id => SIGNAL_GROUPS_LIST.find(g => g.id === id)?.name || id);
      reasons.push(`Shared synchronized focus in ${groupNames.join(' & ')}`);
    } else {
      const mainGroupName = SIGNAL_GROUPS_LIST.find(g => g.id === candGroups[0])?.name || 'Growth Circle';
      reasons.push(`Active in community group: ${mainGroupName}`);
    }
    
    if (habits) {
      reasons.push(`Complementary focus behavior: ${habits}`);
    }
    
    reasons.push("Aligned neural-cognitive bandwidth thresholds (>85% matching indices)");
    
    return reasons;
  };

  // Streak Interactive Mode States
  const [isStreakOpen, setIsStreakOpen] = useState(false);
  const [selectedStreakCategory, setSelectedStreakCategory] = useState<number>(0);
  const [streakParticles, setStreakParticles] = useState<any[]>([]);
  const [particlesActive, setParticlesActive] = useState(false);
  const [isFlameAnimating, setIsFlameAnimating] = useState(false);
  const [customStreakTitle, setCustomStreakTitle] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isStreakSuccess, setIsStreakSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleBreakdown = async (e: React.MouseEvent, taskId: string, title: string) => {
    e.stopPropagation();
    if (isBreakingDown) return;
    
    setIsBreakingDown(taskId);
    showToast("Nexora: Architecting sub-task strategy...", "info");
    
    try {
      const prompt = `Break down the goal "${title}" into 3 actionable, concise sub-tasks. Return exactly a JSON array of strings. Max 6 words per string.`;
      const response = await geminiService.generateContent(prompt, 'gemini-3.5-flash', 'Return only raw JSON array of strings.', {
        userProfile,
        tasks,
        currentMode: mode
      });
      const cleaned = response.replace(/```json|```/g, '').trim();
      const subTasks: string[] = JSON.parse(cleaned);
      
      const parentCategory = tasks.find(t => t.id === taskId)?.category || 'Focus';
      const newTasks: Task[] = subTasks.map((t, i) => ({
        id: `sub-${taskId}-${Date.now()}-${i}`,
        title: t,
        category: parentCategory,
        completed: false,
        timeEstimate: '10m',
        isAutoGenerated: true
      }));

      setTasks(prev => {
        const index = prev.findIndex(t => t.id === taskId);
        const updated = [...prev];
        updated.splice(index + 1, 0, ...newTasks);
        return updated;
      });
      
      showToast("Nexora: Goal decomposed into actionable steps.", "success");
    } catch (err) {
      console.error(err);
      showToast("Neural sync interrupted.", "info");
    } finally {
      setIsBreakingDown(null);
    }
  };
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [reminders, setReminders] = useState<Set<string>>(new Set());
  
  // Grind Mode Pomodoro State
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [initialTime, setInitialTime] = useState(30 * 60);
  const [isActive, setIsActive] = useState(false);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionInput, setReflectionInput] = useState('');
  const timerRef = useRef<number | null>(null);
  const activeFocusRecordIdRef = useRef<string | null>(null);
  const focusSessionStartTimeRef = useRef<number>(0);
  const lastExternalFocusNonceRef = useRef<number>(0);
  const trustScoreRef = useRef<number>(1.0);
  const suspiciousLogRef = useRef<string[]>([]);
  const recentBonusTitlesRef = useRef<string[]>([]);

  // Handle AI Brain external Focus trigger cleanly with existing countdown state
  useEffect(() => {
    if (!externalFocusTrigger || externalFocusTrigger.nonce === lastExternalFocusNonceRef.current) return;
    lastExternalFocusNonceRef.current = externalFocusTrigger.nonce;

    const secs = Math.max(60, Math.round((externalFocusTrigger.durationMinutes || 25) * 60));
    const focusRecId = `focus_${Date.now()}`;
    activeFocusRecordIdRef.current = focusRecId;
    focusSessionStartTimeRef.current = Date.now();

    if (externalFocusTrigger.taskId) {
      setFocusedTaskId(externalFocusTrigger.taskId);
    } else {
      setFocusedTaskId(null);
    }
    setTimeLeft(secs);
    setInitialTime(secs);
    setIsActive(true);

    if (onFocusSessionStart) {
      onFocusSessionStart({
        id: focusRecId,
        taskId: externalFocusTrigger.taskId,
        taskTitle: externalFocusTrigger.taskTitle || 'Focus Session',
        mode: externalFocusTrigger.mode || 'focus',
        durationSeconds: secs
      });
    }

    showToast(`Commencing focus countdown on: ${externalFocusTrigger.taskTitle} (${externalFocusTrigger.durationMinutes} mins)`, 'success');
    onClearExternalFocusTrigger?.();
  }, [externalFocusTrigger, onFocusSessionStart, onClearExternalFocusTrigger, showToast]);

  // Stable Pomodoro and Focus Ticker Effect
  useEffect(() => {
    let intervalId: any = null;
    if (isActive) {
      intervalId = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalId);
            // Defer completion to prevent React render-phase state update warnings
            setTimeout(() => {
              handleTimerComplete();
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isActive, focusedTaskId, tasks]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    if (focusedTaskId) {
      const task = tasks.find(t => t.id === focusedTaskId);
      let minutes = 25;
      if (task && task.timeEstimate) {
        const num = parseInt(task.timeEstimate.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > 0) {
          minutes = task.timeEstimate.toLowerCase().includes('h') ? num * 60 : num;
        }
      }
      setTimeLeft(minutes * 60);
      setInitialTime(minutes * 60);
    } else {
      setTimeLeft(30 * 60);
      setInitialTime(30 * 60);
    }
  };

  const { completedCount, totalCount, progressPercentage } = useMemo(() => {
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    return { completedCount: completed, totalCount: total, progressPercentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [tasks]);

  const leaderboard = useMemo(() => {
    const userScore = 940 + (completedCount * 15);
    const userObj: LeaderboardUser = { 
      id: userProfile?.userId || '2', 
      name: userProfile?.name || 'Alex M.', 
      avatar: userProfile?.avatar || 'https://i.pravatar.cc/150?u=alex', 
      score: userScore, 
      tasksCompleted: (userProfile?.sessionsCompleted || 0) + completedCount, 
      rank: 0, 
      streak: userProfile?.streak || 0,
      globalBurn: '88%',
      neuralAward: 'Pioneer Catalyst'
    };
    const publicLeaderboardEntries: LeaderboardUser[] = publicProfiles
      .filter(p => p.userId && p.userId !== userProfile?.userId)
      .map(p => ({
        id: p.userId,
        name: p.name || p.username || 'Nexoran',
        avatar: p.avatar || `https://i.pravatar.cc/150?u=${p.userId}`,
        score: Math.max(500, p.xp || 500),
        tasksCompleted: p.sessionsCompleted || 0,
        rank: 0,
        streak: p.streak || 0,
        globalBurn: '85%',
        neuralAward: `Level ${p.level || 1}`
      }));
    const existingNames = new Set(publicLeaderboardEntries.map(u => u.name.toLowerCase()));
    const combined = [
      ...publicLeaderboardEntries,
      ...OTHER_USERS.filter(u => !existingNames.has(u.name.toLowerCase())),
      userObj
    ].sort((a, b) => b.score - a.score);
    return combined.map((u, i) => ({ ...u, rank: i + 1 }));
  }, [completedCount, userProfile, publicProfiles]);

  const triggerBurst = (taskId: string) => {
    setBurstingTaskId(taskId);
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];
    const newParticles = Array.from({ length: 12 }).map((_, i) => ({
      id: Math.random(),
      x: (Math.random() - 0.5) * 100,
      y: (Math.random() - 0.5) * 100,
      color: colors[i % colors.length]
    }));
    setParticles(newParticles);
    
    setTimeout(() => {
      setBurstingTaskId(null);
      setParticles([]);
    }, 800);
  };

  const getRapidThreshold = () => {
    const trust = trustScoreRef.current;
    if (trust >= 1.0) return 2000;
    if (trust >= 0.8) return 3000;
    if (trust >= 0.6) return 4000;
    return 5000;
  };

  const logSuspiciousDay = () => {
    const todayStr = new Date().toDateString();
    const log = suspiciousLogRef.current;
    if (!log.includes(todayStr)) {
      log.push(todayStr);
      if (log.length >= 2) {
        trustScoreRef.current = Math.max(0.4, trustScoreRef.current - 0.2);
      }
    }
  };

  const triggerTaskReward = (task: Task) => {
    // Reward XP for task completion
    if (onInteraction) {
      onInteraction(`task-${task.id}`, 'like'); // Using 'like' as a standard interaction for XP
    }

    if (task.isBonus) {
      handleBonusTaskCompleted(task);
    } else {
      // Check if all standard (non-bonus) tasks are now completed
      const otherStandardTasks = tasks.filter(t => t.id !== task.id && !t.isBonus);
      const allStandardCompleted = otherStandardTasks.every(t => t.completed);
      const hasStandardTasks = tasks.filter(t => !t.isBonus).length > 0;
      
      if (allStandardCompleted && hasStandardTasks) {
        triggerNextMeaningfulStep();
      }
    }
  };

  const handleConfirmSuspiciousCompletions = () => {
    playSynthSound('success');
    
    // Reward all pending task rewards that are still completed in state
    pendingRewards.forEach(taskId => {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.completed && !grantedRewardsRef.current.has(taskId)) {
        grantedRewardsRef.current.add(taskId);
        triggerTaskReward(task);
      }
    });

    setIsVerified(true);
    showToast("Completions Verified • Rewards Integrated", "success");

    setTimeout(() => {
      setPendingRewards([]);
      setSuspiciousTasks([]);
      setShowSuspiciousModal(false);
      setIsVerified(false);
    }, 2500);
  };

  const triggerNextMeaningfulStep = async () => {
    setIsGeneratingNextStep(true);
    setShowBonusStepNotification(true);
    
    try {
      const recentTitles = recentBonusTitlesRef.current;
      const challenge = await nextStepService.generateNextStep(
        userProfile,
        completedBonusCountToday,
        recentTitles
      );
      
      setNextBonusStep(challenge);
      recentBonusTitlesRef.current = [challenge.title, ...recentTitles].slice(0, 5);
    } catch (e) {
      console.error("Failed to generate bonus challenge:", e);
    } finally {
      setIsGeneratingNextStep(false);
    }
  };

  const handleBonusTaskCompleted = (task: Task) => {
    const nextCount = completedBonusCountToday + 1;
    setCompletedBonusCountToday(nextCount);

    const xpReward = task.xpReward || 100;
    
    // Reward user profile
    if (onUpdateProfile) {
      onUpdateProfile(prev => {
        const newXp = prev.xp + xpReward;
        const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
        if (newLevel > prev.level) {
          setTimeout(() => showToast(`LEVEL UP! You are now Level ${newLevel}`, 'success'), 500);
        }
        return {
          ...prev,
          xp: newXp,
          level: newLevel
        };
      });
    }

    setJustCompletedBonus({
      id: task.id,
      title: task.title,
      category: task.category,
      explanation: task.title,
      xpReward: xpReward,
      badgeProgress: task.badgeProgress || 25,
      rankProgress: task.rankProgress || 10,
      momentumProgress: task.momentumProgress || 50,
      isBonus: true
    });
    
    setShowRewardsModal(true);
    playSynthSound('success');
  };

  const handleAcceptBonusChallenge = () => {
    if (!nextBonusStep) return;
    playSynthSound('click');
    
    const newBonusTask: Task = {
      id: nextBonusStep.id,
      title: nextBonusStep.title,
      category: nextBonusStep.category,
      completed: false,
      timeEstimate: '15m',
      isBonus: true,
      xpReward: nextBonusStep.xpReward,
      badgeProgress: nextBonusStep.badgeProgress,
      rankProgress: nextBonusStep.rankProgress,
      momentumProgress: nextBonusStep.momentumProgress,
    };
    
    setTasks(prev => [...prev, newBonusTask]);
    setShowBonusStepNotification(false);
    setNextBonusStep(null);
    showToast("Bonus Challenge Accepted • Sync Commenced", "success");
  };

  const toggleTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const becomingComplete = !task.completed;
    
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: becomingComplete, completedAt: becomingComplete ? Date.now() : undefined } : t));
    
    if (becomingComplete) {
      triggerBurst(taskId);
      
      // Clear reminder if task is completed
      setReminders(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });

      // Clear scheduled reminder if task is completed
      setReminderSchedules(prev => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });

      // Suspicious Completion Detection
      const now = Date.now();
      completionTimestampsRef.current.push({ id: taskId, timestamp: now });
      
      // Keep only completions from the last 10 seconds to avoid memory bloat
      completionTimestampsRef.current = completionTimestampsRef.current.filter(c => now - c.timestamp < 10000);
      
      const threshold = getRapidThreshold();
      const recentCompletions = completionTimestampsRef.current;
      
      // Check if this task was completed within threshold of ANY other task completed recently
      const hasRecentRapidNeighbor = recentCompletions.some(
        c => c.id !== taskId && Math.abs(c.timestamp - now) < threshold
      );

      if (hasRecentRapidNeighbor) {
        // Flag as suspicious rapid completion!
        logSuspiciousDay();
        
        // Put in pending rewards
        setPendingRewards(prev => [...new Set([...prev, taskId])]);
        
        // Identify all tasks in the rapid burst
        const flaggedTaskIds = recentCompletions
          .filter(c => recentCompletions.some(other => other.id !== c.id && Math.abs(other.timestamp - c.timestamp) < threshold))
          .map(c => c.id);
        
        // Get full tasks objects, ensuring we have completed: true representation for the review modal
        const flaggedTasks = tasks.map(t => t.id === taskId ? { ...t, completed: true } : t)
          .filter(t => flaggedTaskIds.includes(t.id));
        
        setSuspiciousTasks(flaggedTasks);
        setIsVerified(false);
        setShowSuspiciousModal(true);
        
        showToast("Rate anomaly detected • Verification required", "info");
      } else {
        // Normal completion
        showToast("Task Completed • +XP Awarded", "success");
        grantedRewardsRef.current.add(taskId);
        triggerTaskReward(task);
      }
    } else {
      showToast("Index Reopened", "info");
      // Clean up tracking if task is unchecked
      grantedRewardsRef.current.delete(taskId);
      completionTimestampsRef.current = completionTimestampsRef.current.filter(c => c.id !== taskId);
      setPendingRewards(prev => prev.filter(id => id !== taskId));
    }
  };

  const handleSnoozeTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        // Appending ' (Snoozed)' or extending time estimate for postponing
        const currentEst = parseInt(t.timeEstimate) || 25;
        const newEst = currentEst + 30; // postpone by adding 30 mins
        return {
          ...t,
          timeEstimate: `${newEst}m`,
          priority: 'low'
        };
      }
      return t;
    }));
    
    showToast(`Task Snoozed • Postponed for Later`, "info");
  };

  const handleTimerComplete = () => {
    setIsActive(false);
    const completedSessionId = activeFocusRecordIdRef.current;
    const elapsedSeconds = focusSessionStartTimeRef.current
      ? Math.max(1, Math.round((Date.now() - focusSessionStartTimeRef.current) / 1000))
      : initialTime;
    if (completedSessionId && onFocusSessionComplete) {
      onFocusSessionComplete(completedSessionId, Math.min(elapsedSeconds, initialTime));
    }

    if (focusedTaskId) {
      const task = tasks.find(t => t.id === focusedTaskId);
      if (task) {
        showToast(`Focus session complete for: ${task.title}! Goal achieved.`, "success");
        // Mark task complete
        toggleTask(focusedTaskId);
      } else {
        showToast("Session Complete! Take a break.", "success");
      }
      setFocusedTaskId(null);
    } else {
      showToast("Session Complete! Take a break.", "success");
    }

    setShowCelebration(true);
    setTimeout(() => {
      setShowCelebration(false);
      setShowReflection(true);
    }, 3000);
    
    // Reward XP for completing a deep work session
    if (onInteraction) {
      onInteraction('deep-work-session', 'purchase'); // Using 'purchase' as a high-value interaction for XP
    }
  };

  const handleStartGoalTimer = (taskId: string, title: string, timeEstimate: string) => {
    let minutes = 25; // default pomodoro
    if (timeEstimate) {
      const num = parseInt(timeEstimate.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > 0) {
        if (timeEstimate.toLowerCase().includes('h')) {
          minutes = num * 60;
        } else {
          minutes = num;
        }
      }
    }

    if (focusedTaskId === taskId) {
      // Toggle play/pause for the current active goal
      setIsActive(prev => !prev);
    } else {
      // Set to a new focus goal and start countdown!
      const focusRecId = `focus_${Date.now()}`;
      activeFocusRecordIdRef.current = focusRecId;
      focusSessionStartTimeRef.current = Date.now();
      if (onFocusSessionStart) {
        onFocusSessionStart({
          id: focusRecId,
          taskId,
          taskTitle: title,
          mode: mode === AppMode.GRIND ? 'grind' : 'focus',
          durationSeconds: minutes * 60
        });
      }
      setFocusedTaskId(taskId);
      setTimeLeft(minutes * 60);
      setInitialTime(minutes * 60);
      setIsActive(true);
      showToast(`Commencing focus countdown on: ${title} (${minutes} mins)`, "info");
    }
  };

  const addTask = async () => {
    const trimmedTitle = newTaskTitle.trim();
    if (!trimmedTitle || isCategorizingTask) return;

    let resolvedCategory = selectedCategoryOverride;
    let resolvedTimeEstimate = autoCategoryPreview?.timeEstimate || '25m';

    if (selectedCategoryOverride === 'Auto') {
      if (autoCategoryPreview && autoCategoryPreview.title === trimmedTitle) {
        resolvedCategory = autoCategoryPreview.category;
        resolvedTimeEstimate = autoCategoryPreview.timeEstimate;
      } else {
        setIsCategorizingTask(true);
        try {
          const classification = await geminiService.categorizeTask(trimmedTitle);
          resolvedCategory = classification.category || 'Focus';
          resolvedTimeEstimate = classification.timeEstimate || '25m';
        } finally {
          setIsCategorizingTask(false);
        }
      }
    }

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: trimmedTitle,
      category: resolvedCategory,
      completed: false,
      timeEstimate: resolvedTimeEstimate,
    };

    setTasks(prev => [...prev, newTask]);
    setNewTaskTitle('');
    setAutoCategoryPreview(null);
    setSelectedCategoryOverride('Auto');
    setIsAddingTask(false);
    playSynthSound('success');
    showToast(`Target Distributed · Category: ${resolvedCategory}`, "success");
  };

  // Automated & Custom interactive reminder states
  interface ReminderSchedule {
    taskId: string;
    taskTitle: string;
    time: string; // e.g., "07:30"
    amPm: 'AM' | 'PM';
    repeat: 'Once' | 'Daily' | 'Weekdays' | 'Custom';
  }

  const [reminderSchedules, setReminderSchedules] = useState<Record<string, ReminderSchedule>>({});
  const [selectedReminderTask, setSelectedReminderTask] = useState<{ id: string; title: string } | null>(null);
  const [isWeeklyReportOpen, setIsWeeklyReportOpen] = useState(false);
  const [weeklyReportSlideIndex, setWeeklyReportSlideIndex] = useState(0);
  const [selectedReportTimeframe, setSelectedReportTimeframe] = useState<'week' | 'month' | '4 months' | '6 months' | 'year'>('week');
  const [reportSelectorLayout, setReportSelectorLayout] = useState<'Classic Cards' | 'Neural Wheel'>('Classic Cards');

  useEffect(() => {
    if (isWeeklyReportOpen) {
      setWeeklyReportSlideIndex(0);
    }
  }, [isWeeklyReportOpen]);

  // Picker choices for our Setup Modal
  const [pickerHour, setPickerHour] = useState('07');
  const [pickerMinute, setPickerMinute] = useState('30');
  const [pickerAmPm, setPickerAmPm] = useState<'AM' | 'PM'>('PM');
  const [pickerRepeat, setPickerRepeat] = useState<'Once' | 'Daily' | 'Weekdays' | 'Custom'>('Once');

  // Multi-tap debounce & sequence detectors
  const lastReminderClick = useRef<Record<string, number>>({});
  const clickTimeoutRefs = useRef<Record<string, any>>({});

  const quickToggleReminder = (taskId: string, taskTitle: string) => {
    const isAdding = !reminders.has(taskId);
    
    setReminders(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });

    // Also clear any custom automated schedules for this task on disable
    setReminderSchedules(prev => {
      const next = { ...prev };
      if (next[taskId]) {
        delete next[taskId];
      }
      return next;
    });

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, reminderAt: isAdding ? Date.now() + 8000 : undefined } : t));

    if (isAdding) {
      showToast(`Neural reminder set: ${taskTitle}`, "success");
      setTimeout(() => {
        showToast(`REMINDER: ${taskTitle}`, "info");
      }, 8000);
    } else {
      showToast(`Reminder cleared: ${taskTitle}`, "info");
    }
  };

  const handleReminderClick = (e: React.MouseEvent, taskId: string, taskTitle: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    const now = Date.now();
    const lastClick = lastReminderClick.current[taskId] || 0;
    
    if (now - lastClick < 300) {
      // Double tap! Cancel any standard tap fires immediately
      if (clickTimeoutRefs.current[taskId]) {
        clearTimeout(clickTimeoutRefs.current[taskId]);
        delete clickTimeoutRefs.current[taskId];
      }
      lastReminderClick.current[taskId] = 0; // Reset
      
      // Load current schedule config or set intelligent defaults
      const existing = reminderSchedules[taskId];
      if (existing) {
        setPickerHour(existing.time.split(':')[0]);
        setPickerMinute(existing.time.split(':')[1]);
        setPickerAmPm(existing.amPm);
        setPickerRepeat(existing.repeat);
      } else {
        setPickerHour('07');
        setPickerMinute('30');
        setPickerAmPm('PM');
        setPickerRepeat('Once');
      }
      
      setSelectedReminderTask({ id: taskId, title: taskTitle });
    } else {
      // Standard click debounce
      lastReminderClick.current[taskId] = now;
      if (clickTimeoutRefs.current[taskId]) {
        clearTimeout(clickTimeoutRefs.current[taskId]);
      }
      
      clickTimeoutRefs.current[taskId] = setTimeout(() => {
        delete clickTimeoutRefs.current[taskId];
        quickToggleReminder(taskId, taskTitle);
      }, 250);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const xpProgress = useMemo(() => {
    if (!userProfile) return 0;
    const nextLevelXp = userProfile.level * userProfile.level * 100;
    return Math.round((userProfile.xp / nextLevelXp) * 100);
  }, [userProfile]);

  const isNewUser = !userProfile?.name || (userProfile?.sessionsCompleted === 0 && userProfile?.streak === 0);

  return (
    <div className={`p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-1000 pb-12 ${isGhost ? 'opacity-90 grayscale-[0.2]' : ''}`}>
      {isGhost && (
        <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 mb-4 animate-in slide-in-from-top-2 duration-700">
           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 text-center justify-center">
             <Shield size={12} className="text-indigo-950" /> Ghost sessions are temporary and disappear after exit.
           </p>
        </div>
      )}
      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-orange-500/20 blur-[100px] animate-pulse" />
            <div className="relative flex flex-col items-center gap-6">
              <div className="w-24 h-24 bg-orange-600 rounded-[32px] flex items-center justify-center text-white shadow-[0_0_50px_rgba(234,88,12,0.4)] animate-bounce">
                <Flame size={48} fill="currentColor" />
              </div>
              <h2 className="text-4xl md:text-6xl font-bold text-white font-outfit uppercase tracking-tighter text-center">
                🔥 30 minutes protected.
              </h2>
              <p className="text-orange-500 font-bold uppercase tracking-[0.4em] text-xs animate-pulse">Neural focus threshold achieved</p>
            </div>
          </div>
        </div>
      )}

      {/* Reflection Modal */}
      {showReflection && (
        <div className="fixed inset-0 z-[110] bg-slate-950 flex items-center justify-center p-6 animate-in fade-in duration-700">
          <div className="max-w-2xl w-full space-y-12 text-center">
            <div className="space-y-4">
              <div className="flex justify-center mb-8">
                <Shield size={32} className="text-slate-700" />
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white font-outfit tracking-tight leading-tight">
                Imagine doing this daily.<br />
                <span className="text-slate-500">Who are you becoming?</span>
              </h2>
            </div>

            <div className="relative group">
              <input 
                type="text"
                value={reflectionInput}
                onChange={(e) => setReflectionInput(e.target.value)}
                autoFocus
                placeholder="Type your commitment..."
                className="w-full bg-transparent border-b-2 border-slate-800 py-6 text-xl md:text-2xl text-white outline-none focus:border-white transition-all text-center font-medium placeholder:text-slate-800"
              />
              <div className="absolute bottom-0 left-0 h-0.5 bg-white w-0 group-focus-within:w-full transition-all duration-1000" />
            </div>

            <button 
              onClick={() => {
                if (reflectionInput.trim()) {
                  if (activeFocusRecordIdRef.current && onFocusReflectionSave) {
                    onFocusReflectionSave(activeFocusRecordIdRef.current, reflectionInput.trim());
                  }
                  showToast("Commitment Indexed", "success");
                  setShowReflection(false);
                  setReflectionInput('');
                }
              }}
              className="group flex items-center gap-4 mx-auto px-12 py-5 bg-white text-slate-950 rounded-full font-bold uppercase tracking-[0.3em] text-xs hover:bg-slate-200 transition-all active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
            >
              Continue <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {mode === AppMode.GRIND && (
        <div className="bg-orange-600/10 border border-orange-500/20 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500 shadow-lg shadow-orange-950/10">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-600/20 shrink-0 animate-pulse" style={{ animationPlayState: isActive ? 'running' : 'paused' }}>
              <Timer size={24} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white uppercase tracking-tight truncate">
                {focusedTaskId ? (tasks.find(t => t.id === focusedTaskId)?.title || 'Grind Session') : 'Grind Session'}
              </h2>
              <p className="text-xs text-orange-500/80 font-bold uppercase tracking-widest mt-0.5">
                {focusedTaskId ? 'Active Goal Focus' : 'Pomodoro 1/4'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-8 shrink-0">
            <div className="text-4xl font-mono font-bold text-white tracking-tighter">
              {formatTime(timeLeft)}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={toggleTimer} 
                className="w-12 h-12 bg-white text-slate-900 rounded-xl flex items-center justify-center hover:scale-105 transition-transform active:scale-95 shadow-xl"
                title={isActive ? "Pause" : "Play"}
              >
                {isActive ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button 
                onClick={resetTimer} 
                className="w-12 h-12 bg-slate-800 text-white rounded-xl flex items-center justify-center hover:bg-slate-700 transition-colors"
                title="Reset Timer"
              >
                <RotateCcw size={20} />
              </button>
              {focusedTaskId && (
                <button 
                  onClick={() => {
                    setIsActive(false);
                    setFocusedTaskId(null);
                  }} 
                  className="w-12 h-12 bg-slate-900/40 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-rose-450 rounded-xl flex items-center justify-center transition-colors"
                  title="Clear Active Goal"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {mode === AppMode.CHILL && (
        <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-[40px] p-8 flex flex-col items-center text-center animate-in fade-in zoom-in duration-700">
           <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
             <Wind size={40} className="text-emerald-400" />
           </div>
           <h2 className="text-2xl font-bold text-white font-outfit uppercase tracking-widest mb-2">Breath Work</h2>
           <p className="text-emerald-400/60 text-xs font-bold uppercase tracking-[0.2em] mb-8">Nexora Recovery Engine Active</p>
           <div className="flex gap-4">
             {['Inhale', 'Hold', 'Exhale'].map(step => (
               <div key={step} className="px-6 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{step}</div>
             ))}
           </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className={`text-4xl font-bold font-outfit text-white mb-2 transition-all duration-700 ${isGhost ? 'opacity-60' : ''}`}>
            {isGhost ? 'Ghost Terminal' : `What do you want to accomplish today, ${userProfile?.name.split(' ')[0] || 'Operator'}?`}
          </h1>
          <p className="text-slate-400 font-medium font-sans">
            {isGhost ? 'Your session is isolated and encrypted.' : (
              <>Your life is <button onClick={() => setShowProgressModal(true)} className="text-emerald-400 hover:text-emerald-300 underline decoration-emerald-500/30 underline-offset-4 transition-colors font-bold">1% better</button> today. Every completed mission updates your brain context.</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {!isGhost && tasks.length > 0 && tasks.filter(t => !t.isBonus).every(t => t.completed) && (
            <button 
              onClick={() => {
                // @ts-ignore - Trigger global debrief event
                window.dispatchEvent(new CustomEvent('trigger-daily-debrief'));
              }}
              className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all animate-pulse"
            >
              Start AI Debrief
            </button>
          )}

          <div className={`p-3 rounded-2xl flex items-center gap-3 border shadow-lg group relative transition-all duration-700 ${isGhost ? 'bg-slate-900/20 border-white/5 opacity-50' : 'bg-slate-800 border-slate-700'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs ${isGhost ? 'bg-slate-900' : 'bg-indigo-600'}`}>
              Lvl {userProfile?.level || 1}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Neural XP</span>
              <span className="text-xs font-mono font-bold text-white">{isGhost ? '---' : (userProfile?.xp || 0)} XP</span>
            </div>
          </div>

          {!isGhost && (
            <div 
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(15);
                playSynthSound('click');
                setIsStreakOpen(!isStreakOpen);
              }}
              className={`p-3 rounded-2xl flex items-center gap-3 border shadow-lg cursor-pointer transition-all duration-300 active:scale-95 group relative select-none ${
                isStreakOpen 
                  ? 'bg-purple-950/40 border-purple-500/80 scale-105 shadow-[0_0_20px_rgba(168,85,247,0.5)] text-purple-200' 
                  : 'bg-slate-800 border-slate-700 hover:border-purple-500/30'
              }`}
            >
              <Flame 
                className={`text-orange-500 transition-all duration-500 ${isFlameAnimating || isStreakOpen ? 'text-purple-400 scale-110 drop-shadow-[0_0_8px_rgba(168,85,247,0.85)]' : 'group-hover:scale-110 animate-pulse'}`} 
                fill="currentColor" 
                size={20} 
              />
              <span className="font-bold text-white uppercase tracking-widest text-xs">
                {userProfile?.streak || 0} Day Streak
              </span>
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-105 transition-opacity border border-slate-700 pointer-events-none z-20">
                {userProfile?.streak === 0 ? 'Start your first streak!' : "Don't break the chain!"}
              </div>
            </div>
          )}


        </div>
      </header>

      {mode === AppMode.NORMAL && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Quote size={80} className="text-white" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-yellow-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Mindset of the Day</span>
            </div>
            <p className="text-xl md:text-2xl font-outfit italic text-slate-200 leading-relaxed max-w-3xl">
              "{MOTIVATIONAL_QUOTES[quoteIdx].text}"
            </p>
            <p className="mt-4 text-sm font-bold text-indigo-400 uppercase tracking-widest">— {MOTIVATIONAL_QUOTES[quoteIdx].author}</p>
          </div>
        </div>
      )}

      {mode !== AppMode.CHILL && mode !== AppMode.GHOST && !isFocus && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Target size={120} className="text-indigo-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 font-outfit uppercase tracking-tight">Focus Analysis</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={productivityData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis hide />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#818cf8' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className={`rounded-3xl p-6 shadow-xl text-white flex flex-col justify-between relative overflow-hidden ${mode === AppMode.GRIND ? 'bg-orange-600 shadow-orange-600/20' : 'bg-indigo-600 shadow-indigo-600/20'}`}>
            <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
            <div>
              <h3 className="text-2xl font-bold mb-2 font-outfit uppercase tracking-tight">Level Up</h3>
              <p className="opacity-80 text-xs font-bold uppercase tracking-widest">Level {userProfile?.level || 1} · {userProfile?.xp || 0} XP</p>
            </div>
            <div className="py-6 flex justify-center">
              <div className="relative w-32 h-32">
                 <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="opacity-20" />
                  <circle 
                    cx="64" cy="64" r="58" 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    fill="transparent" 
                    strokeDasharray={364} 
                    strokeDashoffset={364 - (xpProgress / 100) * 364} 
                    className="transition-all duration-1000 ease-out" 
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold font-outfit">{xpProgress}%</div>
              </div>
            </div>
            <button 
              onClick={() => {
                playSynthSound('click');
                setIsWeeklyReportOpen(true);
              }}
              className="w-full bg-white/10 hover:bg-white/20 transition-colors py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] border border-white/20 z-10 active:scale-95"
            >
              View Weekly Report
            </button>
          </div>
        </div>
      )}

      {mode !== AppMode.CHILL && mode !== AppMode.GHOST && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div className="xl:col-span-3 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-white flex items-center gap-3 font-outfit uppercase tracking-tight">
                <CheckCircle2 size={20} className="text-indigo-500" /> Active Goals
              </h3>
              <div className="flex flex-wrap items-center gap-1.5">
                {['All', ...Array.from(new Set(['Focus', 'Admin', 'Creative', ...tasks.filter(t => !t.completed).map(t => t.category)]))].map(cat => {
                  const activeCount = cat === 'All'
                    ? tasks.filter(t => !t.completed).length
                    : tasks.filter(t => !t.completed && t.category === cat).length;
                  if (cat !== 'All' && activeCount === 0 && !['Focus', 'Admin', 'Creative'].includes(cat)) {
                    return null;
                  }
                  const isSelected = activeCategoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-300 shadow-sm'
                          : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {cat} {activeCount > 0 ? `(${activeCount})` : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Streak Routine Progress Bar */}
            {userProfile?.activeStreak && !userProfile.activeStreak.completed && (
              <div className="bg-purple-950/20 border border-purple-500/30 rounded-[28px] p-5 flex flex-col md:flex-row items-center justify-between gap-5 animate-in slide-in-from-top-4 duration-500 shadow-xl shadow-purple-950/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                  <Flame size={80} className="text-purple-500" fill="currentColor" />
                </div>
                <div className="flex items-center gap-4 min-w-0 flex-1 relative z-10 animate-pulse" style={{ animationDuration: '4s' }}>
                  <div className="w-11 h-11 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
                    <Flame size={20} fill="currentColor" className="animate-bounce" style={{ animationDuration: '2s' }} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                      Streak Challenge In Progress
                    </h4>
                    <p className="text-sm font-semibold text-white truncate max-w-md mt-0.5 uppercase tracking-wide">
                      {userProfile.activeStreak.title}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 relative z-10 w-full md:w-auto">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (navigator.vibrate) navigator.vibrate(50);
                      playSynthSound('success');
                      
                      const newStreakValue = (userProfile.streak || 0) + 1;
                      if (onUpdateProfile) {
                        onUpdateProfile(prev => {
                          const newStreak = (prev.streak || 0) + 1;
                          const newXp = prev.xp + 40; // reward points for completion
                          const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
                          return {
                            ...prev,
                            streak: newStreak,
                            xp: newXp,
                            level: newLevel,
                            activeStreak: null // routine done!
                          };
                        });
                      }
                      
                      setIsStreakSuccess(true);
                      showToast(`Routine complete! Day count: ${newStreakValue} 🔥`, "success");
                    }} 
                    className="flex-1 md:flex-none px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_15px_rgba(236,72,153,0.3)] flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                    title="Complete & Lock In Day"
                  >
                    <CheckCircle2 size={13} /> Complete Routine
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onUpdateProfile) {
                        onUpdateProfile(prev => ({ ...prev, activeStreak: null }));
                      }
                      showToast("Active streak protocol cancelled", "info");
                    }} 
                    className="w-11 h-11 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-450 hover:text-rose-450 rounded-xl flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                    title="Cancel Routine"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* Active Goal Focus Session Bar for non-Grind modes */}
            {focusedTaskId && mode !== AppMode.GRIND && (
              <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-[28px] p-5 flex flex-col md:flex-row items-center justify-between gap-5 animate-in slide-in-from-top-4 duration-500 shadow-xl shadow-indigo-950/20">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
                    <Timer size={20} className={isActive ? "animate-pulse" : ""} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Focus Session in Goal</h4>
                    <p className="text-sm font-semibold text-white truncate max-w-md mt-0.5">
                      {tasks.find(t => t.id === focusedTaskId)?.title || 'Goal Deep Work'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-3xl font-mono font-bold text-orange-450 tracking-tighter">
                    {formatTime(timeLeft)}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleTimer(); }} 
                      className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center hover:scale-105 transition-transform active:scale-95 shadow-md"
                      title={isActive ? "Pause" : "Start"}
                    >
                      {isActive ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); resetTimer(); }} 
                      className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl flex items-center justify-center transition-colors"
                      title="Reset Timer"
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsActive(false);
                        setFocusedTaskId(null);
                      }} 
                      className="w-10 h-10 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-rose-450 rounded-xl flex items-center justify-center transition-colors"
                      title="End Focus Session"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {tasks
                .filter(t => (!t.completed || t.id === burstingTaskId) && (activeCategoryFilter === 'All' || t.category === activeCategoryFilter))
                .map((task) => (
                <SwipeableTaskCard
                  key={task.id}
                  task={task}
                  burstingTaskId={burstingTaskId}
                  particles={particles}
                  toggleTask={toggleTask}
                  onSnooze={handleSnoozeTask}
                  focusedTaskId={focusedTaskId}
                  isActive={isActive}
                  handleStartGoalTimer={handleStartGoalTimer}
                  handleBreakdown={handleBreakdown}
                  isBreakingDown={isBreakingDown}
                  handleReminderClick={handleReminderClick}
                  reminderSchedules={reminderSchedules}
                  reminders={reminders}
                  formatTime={formatTime}
                  timeLeft={timeLeft}
                />
              ))}

              {/* Add Task Card */}
              {isAddingTask ? (
                <div className="bg-slate-900 border border-indigo-500/50 rounded-[28px] p-6 shadow-xl animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-3">
                     <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                       <Sparkles size={12} /> New Target
                     </span>
                     <button
                       onClick={() => {
                         setIsAddingTask(false);
                         setAutoCategoryPreview(null);
                         setSelectedCategoryOverride('Auto');
                       }}
                       className="text-slate-500 hover:text-white"
                     >
                        <X size={16} />
                     </button>
                  </div>
                  <input 
                    type="text" 
                    autoFocus
                    disabled={isCategorizingTask}
                    placeholder="Describe your next win..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTask()}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-650 outline-none focus:border-indigo-500 transition-all mb-3 disabled:opacity-60"
                  />

                  {/* Gemini Auto-Categorization Preview & Override */}
                  <div className="mb-3 rounded-xl bg-slate-950/80 border border-slate-800/90 p-2.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <Brain size={11} className="text-indigo-400" />
                        {selectedCategoryOverride === 'Auto' ? 'Gemini Auto-Category' : 'Manual Override'}
                      </span>
                      {selectedCategoryOverride === 'Auto' ? (
                        isAnalyzingCategory ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-300">
                            <Loader2 size={11} className="animate-spin" /> Analyzing...
                          </span>
                        ) : autoCategoryPreview && autoCategoryPreview.title === newTaskTitle.trim() ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${getCategoryVisuals(autoCategoryPreview.category).badgeClass}`}>
                            {React.createElement(getCategoryVisuals(autoCategoryPreview.category).icon, { size: 10 })}
                            {autoCategoryPreview.category} · {autoCategoryPreview.timeEstimate}
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium text-slate-500">
                            {newTaskTitle.trim().length < 3 ? 'Type to detect...' : 'Ready on deploy'}
                          </span>
                        )
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${getCategoryVisuals(selectedCategoryOverride).badgeClass}`}>
                          {React.createElement(getCategoryVisuals(selectedCategoryOverride).icon, { size: 10 })}
                          {selectedCategoryOverride}
                        </span>
                      )}
                    </div>

                    {selectedCategoryOverride === 'Auto' && autoCategoryPreview && autoCategoryPreview.title === newTaskTitle.trim() && autoCategoryPreview.reason && (
                      <p className="text-[10px] text-slate-400 leading-tight truncate" title={autoCategoryPreview.reason}>
                        {autoCategoryPreview.reason}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {['Auto', ...TASK_CATEGORY_OPTIONS].map((opt) => {
                        const active = selectedCategoryOverride === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setSelectedCategoryOverride(opt)}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                              active
                                ? 'bg-indigo-600/30 border-indigo-400/70 text-indigo-200'
                                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            {opt === 'Auto' ? 'Auto AI' : opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button 
                    onClick={addTask}
                    disabled={!newTaskTitle.trim() || isCategorizingTask}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl uppercase tracking-widest text-[10px] transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isCategorizingTask ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        Categorizing & Deploying...
                      </>
                    ) : (
                      'Deploy Parameter'
                    )}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingTask(true)}
                  className="bg-slate-900/50 border border-dashed border-slate-700 rounded-[28px] p-6 flex flex-col items-center justify-center gap-3 hover:bg-slate-900 hover:border-indigo-500/50 transition-all group group-active:scale-95 shadow-xl"
                >
                  <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 transition-all">
                    <Zap size={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-500 group-hover:text-white uppercase tracking-widest">Add Focus Target</span>
                </button>
              )}
            </div>
          </div>
          
          {mode === AppMode.NORMAL && (
             <div className="space-y-6">
               <h3 className="text-xl font-bold text-white flex items-center gap-3 font-outfit uppercase tracking-tight">
                 <Trophy size={20} className="text-yellow-500" /> Top Rank
               </h3>
               <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-5 shadow-2xl space-y-4">
                 {leaderboard.map(user => (
                   <div key={user.id} onClick={() => handleViewUserProfile(user)} className={`flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer hover:scale-[1.01] ${user.name === (userProfile?.name || 'Alex M.') ? 'bg-indigo-600/10 border border-indigo-500/20' : 'hover:bg-white/5 border border-transparent'}`}>
                     <div className="relative flex-shrink-0">
                       <img src={user.avatar} className="w-10 h-10 rounded-xl border border-slate-800 object-cover" />
                       <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-bold shadow-lg ${
                         user.rank === 1 ? 'bg-yellow-500 text-slate-900' : 'bg-slate-850 text-white'
                       }`}>
                         {user.rank}
                       </div>
                     </div>
                     <div className="flex-1 text-left">
                       <p className="text-xs font-bold text-white">{user.name}</p>
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{user.tasksCompleted} Completed</p>
                     </div>
                     <span className={`text-xs font-mono font-bold ${user.name === (userProfile?.name || 'Alex M.') ? 'text-indigo-400' : 'text-slate-400'}`}>{user.score} XP</span>
                   </div>
                 ))}
               </div>
               
               

               <div className="bg-gradient-to-br from-indigo-900/20 to-slate-900 border border-indigo-500/20 rounded-[32px] p-6">
                  
                  <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Zap size={14} /> Weekly Insight
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                    Your Skill output is up <span className="text-emerald-400 font-bold">12%</span>. Maintaining this velocity will complete your React module 3 days ahead of schedule.
                  </p>
               </div>
             </div>
          )}
        </div>
      )}

      {/* Another User Profile Modal */}
      <AnimatePresence>
        {selectedUserForProfile && (() => {
          const currentIndex = leaderboard.findIndex(u => u.id === selectedUserForProfile.id);
          const hasPrev = currentIndex > 0;
          const hasNext = currentIndex !== -1 && currentIndex < leaderboard.length - 1;
          return (
            <motion.div 
              onClick={() => setSelectedUserForProfile(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[160] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 cursor-pointer"
            >
              <div className="relative w-full max-w-md flex items-center justify-center animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                {/* Floating Navigation Controls next to profile card */}
                {hasPrev && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSlideDirection(-1);
                      setSelectedUserForProfile(leaderboard[currentIndex - 1]);
                    }}
                    className="absolute -left-16 hidden md:flex p-3 bg-slate-900/90 border border-slate-800 hover:bg-slate-800 text-white rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer z-50 items-center justify-center"
                    title="Previous Profile (Drag Right)"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}

                {hasNext && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSlideDirection(1);
                      setSelectedUserForProfile(leaderboard[currentIndex + 1]);
                    }}
                    className="absolute -right-16 hidden md:flex p-3 bg-slate-900/90 border border-slate-800 hover:bg-slate-800 text-white rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer z-50 items-center justify-center"
                    title="Next Profile (Drag Left)"
                  >
                    <ChevronRight size={20} />
                  </button>
                )}

                <AnimatePresence initial={false} custom={slideDirection} mode="wait">
                  <motion.div 
                    key={selectedUserForProfile.id}
                    custom={slideDirection}
                    variants={{
                      enter: (dir: number) => ({
                        x: dir > 0 ? 300 : -300,
                        opacity: 0,
                        scale: 0.95
                      }),
                      center: {
                        x: 0,
                        opacity: 1,
                        scale: 1,
                        transition: {
                          x: { type: "spring", stiffness: 300, damping: 28 },
                          opacity: { duration: 0.2 },
                          scale: { duration: 0.2 }
                        }
                      },
                      exit: (dir: number) => ({
                        x: dir > 0 ? -300 : 300,
                        opacity: 0,
                        scale: 0.95,
                        transition: {
                          x: { type: "spring", stiffness: 300, damping: 28 },
                          opacity: { duration: 0.15 },
                          scale: { duration: 0.15 }
                        }
                      })
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.65}
                    onDragEnd={(e, info) => {
                      const swipeThreshold = 50; // px
                      if (info.offset.x < -swipeThreshold && hasNext) {
                        setSlideDirection(1);
                        setSelectedUserForProfile(leaderboard[currentIndex + 1]);
                      } else if (info.offset.x > swipeThreshold && hasPrev) {
                        setSlideDirection(-1);
                        setSelectedUserForProfile(leaderboard[currentIndex - 1]);
                      }
                    }}
                    className="bg-slate-900 border border-slate-800 rounded-[40px] w-full shadow-2xl relative overflow-hidden cursor-grab active:cursor-grabbing"
                  >
                    {/* Sliding Navigation in Header for Smaller Screens */}
                    <div className="absolute top-6 left-6 flex items-center gap-1.5 z-30 font-sans">
                      <button
                        disabled={!hasPrev}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasPrev) {
                            setSlideDirection(-1);
                            setSelectedUserForProfile(leaderboard[currentIndex - 1]);
                          }
                        }}
                        className={`p-2 bg-slate-800/95 border border-slate-755 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center ${
                          hasPrev ? 'text-white hover:bg-slate-700 cursor-pointer' : 'text-slate-650 cursor-not-allowed opacity-40'
                        }`}
                        title="Previous Profile"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        disabled={!hasNext}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasNext) {
                            setSlideDirection(1);
                            setSelectedUserForProfile(leaderboard[currentIndex + 1]);
                          }
                        }}
                        className={`p-2 bg-slate-800/95 border border-slate-755 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center ${
                          hasNext ? 'text-white hover:bg-slate-700 cursor-pointer' : 'text-slate-650 cursor-not-allowed opacity-40'
                        }`}
                        title="Next Profile"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    {/* Close Button */}
                    <button 
                      onClick={() => setSelectedUserForProfile(null)}
                      className="absolute top-6 right-6 p-2.5 bg-slate-800/95 border border-slate-750 hover:bg-slate-700 text-white rounded-xl shadow-lg transition-all z-30 hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
                      title="Close Profile"
                    >
                      <X size={16} className="text-white" />
                    </button>

                    {/* Decorative Header Art */}
                    <div className="h-28 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-indigo-950/40 relative">
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
                    </div>

                    {/* User Identity Section */}
                    <div className="px-6 pb-6 relative">
                      <div className="flex flex-col items-center -mt-12 mb-5 text-center">
                        <div className="relative mb-3">
                          <div className="w-24 h-24 rounded-[24px] overflow-hidden border-4 border-slate-900 shadow-2xl relative z-10 transition-transform duration-500 hover:scale-105">
                            <img src={selectedUserForProfile.avatar} className="w-full h-full object-cover" alt={selectedUserForProfile.name} />
                          </div>
                          <div className="absolute -bottom-1 -right-1 bg-indigo-600 rounded-xl p-1.5 border-2 border-slate-900 shadow-lg z-20">
                            <Shield size={12} className="text-white" />
                          </div>
                        </div>

                        <h3 className="text-xl font-bold text-white font-outfit uppercase tracking-tight">{selectedUserForProfile.name}</h3>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">RANK #{selectedUserForProfile.rank} • LEADERBOARD NODE</p>
                        
                        {/* Social stats horizontal box */}
                        <div className="flex items-center justify-center gap-6 mt-4 text-center">
                          <div>
                            <p className="text-sm font-bold text-white font-mono">{getSelectedUserSocialStats(selectedUserForProfile.id).followers}</p>
                            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Followers</p>
                          </div>
                          <div className="h-4 w-[1px] bg-slate-800" />
                          <div>
                            <p className="text-sm font-bold text-white font-mono">{getSelectedUserSocialStats(selectedUserForProfile.id).following}</p>
                            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Following</p>
                          </div>
                          <div className="h-4 w-[1px] bg-slate-800" />
                          <div>
                            <p className="text-sm font-bold text-white font-mono">{getSelectedUserSocialStats(selectedUserForProfile.id).groups}</p>
                            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Signal Groups</p>
                          </div>
                        </div>

                        {/* Primary CTA FOLLOW Button */}
                        <div className="w-full mt-4">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFollowClick(selectedUserForProfile.id, selectedUserForProfile.name);
                            }}
                            className={`w-full py-2.5 px-4 rounded-xl text-[9px] font-bold uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              followedUserIds.includes(selectedUserForProfile.id)
                              ? 'bg-slate-950 border border-slate-800 text-indigo-400 hover:text-indigo-300'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.25)]'
                            }`}
                          >
                            {followedUserIds.includes(selectedUserForProfile.id) ? (
                              <>
                                <CheckCircle2 size={12} className="text-indigo-400" />
                                <span>Following</span>
                              </>
                            ) : (
                              <>
                                <Plus size={12} />
                                <span>Follow</span>
                              </>
                            )}
                          </motion.button>
                        </div>
                      </div>

                      {/* Sub-grid of Stats */}
                      <div className="grid grid-cols-2 gap-3.5 mb-5 select-none">
                        {/* Streak Card */}
                        <div className="bg-slate-950/50 border border-slate-850 rounded-[20px] p-4 hover:border-orange-500/30 transition-all flex flex-col justify-between">
                          <div className="flex items-center gap-1.5 text-orange-450 mb-2">
                            <Flame size={14} className="text-orange-450" />
                            <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Streak</span>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-white">{selectedUserForProfile.streak} <span className="text-xs text-orange-400 font-bold">Days</span></p>
                            <p className="text-[7px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">Consistent focus</p>
                          </div>
                        </div>

                        {/* XP Card */}
                        <div className="bg-slate-950/50 border border-slate-850 rounded-[20px] p-4 hover:border-indigo-500/30 transition-all flex flex-col justify-between">
                          <div className="flex items-center gap-1.5 text-indigo-400 mb-2">
                            <Zap size={14} />
                            <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Total XP</span>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-white">{selectedUserForProfile.score} <span className="text-xs text-indigo-400 font-bold">XP</span></p>
                            <p className="text-[7px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">{selectedUserForProfile.tasksCompleted} Tasks complete</p>
                          </div>
                        </div>

                        {/* Global Burn Card */}
                        <div className="bg-slate-950/50 border border-slate-850 rounded-[20px] p-4 hover:border-emerald-500/30 transition-all flex flex-col justify-between">
                          <div className="flex items-center gap-1.5 text-emerald-400 mb-2">
                            <Activity size={14} />
                            <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Global Burn</span>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-white">{selectedUserForProfile.globalBurn || '85%'}</p>
                            <p className="text-[7px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">Focus burn intensity</p>
                          </div>
                        </div>

                        {/* Neural Award Card */}
                        <div className="bg-slate-950/50 border border-slate-850 rounded-[20px] p-4 hover:border-yellow-500/30 transition-all flex flex-col justify-between">
                          <div className="flex items-center gap-1.5 text-yellow-500 mb-2">
                            <Award size={14} />
                            <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Neural Award</span>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-yellow-400 truncate mt-0.5">{selectedUserForProfile.neuralAward || 'Pioneer Scholar'}</p>
                            <p className="text-[7px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">Highest cognitive honor</p>
                          </div>
                        </div>
                      </div>

                      {/* SIGNAL GROUPS SECTION */}
                      <div className="border-t border-slate-800 pt-4 mt-5">
                        <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                          <span>Signal Groups</span>
                          <span className="text-[8px] font-mono font-normal text-indigo-400 tracking-normal text-right">Direct Join</span>
                        </h4>
                        
                        <div className="space-y-2.5">
                          {SIGNAL_GROUPS_LIST.map(group => {
                            const isJoined = joinedGroupIds.includes(group.id);
                            const membersCount = group.baseMembers + (isJoined ? 1 : 0);
                            return (
                              <div key={group.id} className="flex items-center justify-between p-2.5 bg-slate-950/45 border border-slate-850 rounded-2xl hover:border-slate-800 transition-all select-none">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-lg leading-none">{group.icon}</span>
                                  <div className="text-left">
                                    <h5 className="text-[11px] font-bold text-white tracking-tight leading-none">{group.name}</h5>
                                    <p className="text-[8px] text-slate-555 font-bold uppercase tracking-widest mt-1">{membersCount} Members</p>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleJoinGroup(group.id, group.name);
                                  }}
                                  className={`py-1.5 px-3 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                                    isJoined 
                                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                                    : 'bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400'
                                  }`}
                                >
                                  {isJoined ? 'Joined' : 'Join'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Slide indicator dots */}
                      <div className="flex items-center justify-center gap-1.5 mt-5">
                        {leaderboard.map((user, idx) => (
                          <button 
                            key={`dot-${user.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (idx > currentIndex) {
                                setSlideDirection(1);
                              } else if (idx < currentIndex) {
                                setSlideDirection(-1);
                              }
                              setSelectedUserForProfile(user);
                            }}
                            className={`h-1.5 rounded-full transition-all cursor-pointer ${
                              idx === currentIndex ? 'w-5 bg-indigo-500' : 'w-1.5 bg-slate-800 hover:bg-indigo-505/30'
                            }`}
                            title={`Go to ${user.name}`}
                          />
                        ))}
                      </div>

                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })()}      </AnimatePresence>

      {/* Connection Established Modal */}
      <AnimatePresence>
        {showPostFollowModal && lastFollowedUser && (
          <div className="fixed inset-0 z-[170] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-slate-900 border border-slate-800 rounded-[36px] w-full max-w-sm shadow-[0_0_50px_rgba(99,102,241,0.15)] relative overflow-hidden p-6"
            >
              {/* Outer Glow Line */}
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
              
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-indigo-600/10 border border-indigo-500/25 rounded-2xl flex items-center justify-center text-indigo-400 mx-auto text-xl shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                  ✨
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white font-outfit uppercase tracking-tight">Connection Established</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                    You are now following <span className="text-white font-bold">{lastFollowedUser.name}</span>. {lastFollowedUser.name} actively participates in multiple Signal Groups. Join their communities and focus together.
                  </p>
                </div>

                {/* Display Public Groups Info */}
                <div className="space-y-2.5 py-3 text-left">
                  {SIGNAL_GROUPS_LIST.map(group => {
                    const isJoined = joinedGroupIds.includes(group.id);
                    const count = group.baseMembers + (isJoined ? 1 : 0);
                    return (
                      <div key={group.id} className="flex items-center justify-between p-2.5 bg-slate-950/45 border border-slate-850 rounded-2xl">
                        <div className="flex items-center gap-2">
                          <span className="text-sm leading-none">{group.icon}</span>
                          <div>
                            <p className="text-[10px] font-bold text-white leading-none">{group.name}</p>
                            <p className="text-[8px] text-slate-500 uppercase tracking-widest mt-0.5">{count} Members</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleJoinGroup(group.id, group.name)}
                          className={`text-[8px] font-bold uppercase tracking-wider px-2.5 py-1 rounded transition-all cursor-pointer ${
                            isJoined 
                            ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' 
                            : 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-600/20 border border-indigo-500/20'
                          }`}
                        >
                          {isJoined ? 'Synced' : 'Join'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Modal Buttons */}
                <div className="space-y-2.5 pt-2">
                  <button 
                    onClick={() => {
                      setShowPostFollowModal(false);
                      // Auto-join all recommended groups that are not yet joined
                      const groupsToJoin = SIGNAL_GROUPS_LIST.filter(g => !joinedGroupIds.includes(g.id));
                      if (groupsToJoin.length > 0) {
                        setJoinedGroupIds(prev => {
                          const next = [...prev];
                          groupsToJoin.forEach(g => {
                            if (!next.includes(g.id)) next.push(g.id);
                          });
                          return next;
                        });
                        showToast(`Joined recommended communities! +100 XP gained.`, 'success');
                        
                        if (onUpdateProfile) {
                          onUpdateProfile(prev => {
                            const newXp = prev.xp + 100;
                            const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
                            
                            if (newLevel > prev.level) {
                              setTimeout(() => {
                                showToast(`⚡ LEVEL UP: Advanced Node Authority ${newLevel} Secured!`, 'success');
                              }, 900);
                            }
                            return {
                              ...prev,
                              xp: newXp,
                              level: newLevel
                            };
                          });
                        }
                      }
                      
                      playSynthSound('success');
                      
                      if (setActiveSignalGroupId) {
                        setActiveSignalGroupId(null);
                      }
                      
                      // Open Signals Tab
                      if (setActiveTab) {
                        setActiveTab(AppTab.EXPLORE);
                      }
                      if (setActiveSubTab) {
                        setActiveSubTab('signals');
                      }
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-550 text-white py-3 rounded-2xl text-[9px] font-bold uppercase tracking-[0.18em] shadow-[0_0_20px_rgba(99,102,241,0.25)] transition-all cursor-pointer active:scale-98 animate-pulse"
                  >
                    Join Groups
                  </button>
                  <button 
                    onClick={() => {
                      setShowPostFollowModal(false);
                      playSynthSound('click');
                    }}
                    className="w-full bg-transparent hover:bg-white/5 text-slate-450 hover:text-white py-2.5 rounded-2xl text-[9px] font-bold uppercase tracking-[0.18em] transition-all cursor-pointer"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Progress Insights Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 z-[150] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl relative">
            <button 
              onClick={() => setShowProgressModal(false)}
              className="absolute top-6 right-6 p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl transition-all z-10"
            >
              <X size={20} />
            </button>

            <div className="p-8 md:p-12 space-y-12">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                    <TrendingUp size={16} />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.3em]">Neural Growth Report</span>
                </div>
                <h2 className="text-4xl font-bold text-white font-outfit tracking-tight">The Nexora Evolution</h2>
                <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-2xl">
                  You've been consistently optimizing your focus trajectories. Here's how your neural network has expanded through Nexora's signal feed.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-4">
                  <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-400">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-white font-outfit">{completedCount}</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Targets Secured Today</p>
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-4">
                  <div className="w-10 h-10 bg-emerald-600/10 rounded-xl flex items-center justify-center text-emerald-400">
                    <Flame size={20} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-white font-outfit">12 Days</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Continuous Velocity</p>
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl space-y-4">
                  <div className="w-10 h-10 bg-amber-600/10 rounded-xl flex items-center justify-center text-amber-400">
                    <Brain size={20} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-white font-outfit">84%</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cognitive Retention</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white font-outfit uppercase tracking-tight flex items-center gap-3">
                  <Cpu size={20} className="text-indigo-500" /> Knowledge Indexed
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(userProfile?.interests || []).map((interest, idx) => (
                    <div key={idx} className="bg-slate-950/50 border border-white/5 p-5 rounded-2xl flex items-start gap-4 hover:border-indigo-500/30 transition-all">
                      <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 shrink-0">
                        <Sparkles size={14} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white uppercase tracking-widest mb-1">{interest}</h5>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          {idx === 0 && "Mastered core concepts of neural architecture and high-velocity systems."}
                          {idx === 1 && "Explored advanced methodologies for biological and cognitive optimization."}
                          {idx === 2 && "Analyzed market signals for scalable micro-SaaS deployment strategies."}
                          {idx > 2 && "Expanding knowledge base through high-signal content streams."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-[32px] flex flex-col md:flex-row items-center gap-8">
                <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-indigo-600/20 shrink-0">
                  <Medal size={40} />
                </div>
                <div className="space-y-2 text-center md:text-left">
                  <h4 className="text-lg font-bold text-white font-outfit uppercase tracking-tight">Neural Milestone Reached</h4>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    By engaging with Nexora's signal feed, you've processed over <span className="text-indigo-400 font-bold">42 high-signal nodes</span> this week. Your cognitive trajectory is currently <span className="text-emerald-400 font-bold">14% steeper</span> than the average node in your network.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {isGhost && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-white flex items-center gap-3 font-outfit uppercase tracking-tight">
            <CheckCircle2 size={20} className="text-slate-600" /> Private Objectives
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {tasks.map((task) => (
              <div 
                key={task.id} 
                onClick={() => toggleTask(task.id)} 
                className={`bg-slate-900/40 backdrop-blur-2xl border rounded-[28px] p-8 transition-all cursor-pointer group select-none shadow-2xl relative overflow-hidden ${task.completed ? 'border-indigo-500/10 opacity-40' : 'border-white/5 hover:border-indigo-500/20'}`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 rounded-2xl bg-slate-950 border border-white/5 text-slate-500">
                    <Ghost size={20} />
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-slate-800 flex items-center justify-center group-hover:border-indigo-500 transition-colors">
                      {task.completed ? <CheckCircle2 className="text-indigo-400" size={24} /> : <Circle className="text-transparent" size={24} />}
                  </div>
                </div>
                <h4 className={`text-lg font-bold text-slate-300 group-hover:text-white transition-colors tracking-tight ${task.completed ? 'line-through opacity-50' : ''}`}>
                  {task.title}
                </h4>
                <div className="mt-4 flex items-center justify-between opacity-40">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Isolated Task</span>
                  <span className="text-[10px] font-mono font-bold tracking-widest">Purgeable</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {isStreakOpen && (
        <div className="fixed inset-0 z-[140] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/10 via-slate-950/10 to-indigo-900/10 pointer-events-none" />
          <div className="absolute inset-0" onClick={() => { playSynthSound('click'); setIsStreakOpen(false); }} />
          
          <div className="bg-slate-900/90 backdrop-blur-3xl border border-purple-500/20 rounded-[40px] w-full max-w-2xl overflow-y-auto max-h-[90vh] shadow-[0_0_50px_rgba(168,85,247,0.15)] relative z-10 p-6 md:p-10 text-center space-y-8 animate-in zoom-in-95 duration-500">
            <button 
              onClick={() => { playSynthSound('click'); setIsStreakOpen(false); }}
              className="absolute top-6 right-6 p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
            >
              <X size={18} />
            </button>

            {userProfile?.activeStreak && !userProfile.activeStreak.completed ? (
              <div className="space-y-6">
                <div className="w-20 h-20 bg-gradient-to-tr from-purple-600/20 to-pink-500/20 rounded-[32px] flex items-center justify-center text-purple-400 border border-purple-500/40 mx-auto shadow-xl shadow-purple-900/10 relative">
                  <Flame size={36} fill="currentColor" className="animate-bounce" style={{ animationDuration: '2.5s' }} />
                </div>

                <div className="space-y-2.5">
                  <h3 className="text-2xl font-black text-white uppercase tracking-wider font-outfit">
                    ACTIVE ROUTINE DETECTED
                  </h3>
                  <p className="text-xs text-purple-400 font-bold max-w-md mx-auto uppercase tracking-widest text-center leading-relaxed">
                    CURRENT PROTOCOL: "{userProfile.activeStreak.title}"
                  </p>
                  <p className="text-[10px] text-slate-500 leading-relaxed max-w-sm mx-auto uppercase tracking-wide">
                    Finish doing this daily routine check-in to lock in your daily streak level!
                  </p>
                </div>

                <div className="bg-slate-950/50 rounded-3xl p-6 border border-slate-800 space-y-4 max-w-md mx-auto">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">
                    <span>Started:</span>
                    <span className="text-white bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg">
                      {new Date(userProfile.activeStreak.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">
                    <span>Focus Segment:</span>
                    <span className="text-purple-400">{userProfile.activeStreak.category}</span>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <button
                    onClick={() => {
                      if (onUpdateProfile) {
                        onUpdateProfile(prev => ({ ...prev, activeStreak: null }));
                      }
                      showToast("Active streak protocol cancelled", "info");
                    }}
                    className="flex-1 py-4 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-500 hover:text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all"
                  >
                    Abort Active Routine
                  </button>
                  <button
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(50);
                      playSynthSound('success');
                      
                      const newStreakValue = (userProfile.streak || 0) + 1;
                      if (onUpdateProfile) {
                        onUpdateProfile(prev => {
                          const newStreak = (prev.streak || 0) + 1;
                          const newXp = prev.xp + 40;
                          const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
                          return {
                            ...prev,
                            streak: newStreak,
                            xp: newXp,
                            level: newLevel,
                            activeStreak: null
                          };
                        });
                      }
                      
                      setIsStreakSuccess(true);
                      showToast(`Routine complete! Day count: ${newStreakValue} 🔥`, "success");
                      setIsStreakOpen(false);
                    }}
                    className="flex-1 py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={14} /> Complete & Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-purple-500/15 rounded-3xl flex items-center justify-center text-purple-400 border border-purple-500/30 mx-auto animate-pulse">
                  <Flame size={28} fill="currentColor" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white uppercase tracking-widest font-outfit bg-gradient-to-r from-purple-400 via-indigo-200 to-purple-400 bg-clip-text text-transparent">
                    START YOUR STREAK
                  </h3>
                  <p className="text-xs text-slate-400 font-bold max-w-md mx-auto leading-relaxed tracking-wider uppercase">
                    Select your routine pathway to lock in your alignment.
                  </p>
                </div>

                {/* 2x3 Adaptive Categories Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  {STREAK_CATEGORIES.map((cat, i) => {
                    const IconComponent = cat.icon;
                    const isSelected = selectedStreakCategory === i;
                    return (
                      <div
                        key={cat.id}
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate(10);
                          playSynthSound('click');
                          setSelectedStreakCategory(i);
                          if (cat.id === 'custom') {
                            setShowCustomInput(true);
                          } else {
                            setShowCustomInput(false);
                          }
                        }}
                        className={`p-5 rounded-[24px] border cursor-pointer select-none transition-all duration-300 active:scale-95 flex items-start gap-4 relative overflow-hidden group ${
                          isSelected 
                            ? `bg-purple-950/40 border-purple-500/70 shadow-[0_0_25px_rgba(168,85,247,0.25)] text-white` 
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl transition-all ${
                          isSelected ? 'bg-purple-500/30 text-purple-300 scale-110' : 'bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-purple-400'
                        }`}>
                          <IconComponent size={20} />
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-xs uppercase tracking-wider">{cat.title}</p>
                          <p className="text-[10px] opacity-75 leading-normal">{cat.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom input drawer */}
                {(showCustomInput || STREAK_CATEGORIES[selectedStreakCategory].id === 'custom') && (
                  <div className="animate-in slide-in-from-top-4 duration-300 pt-2">
                    <input
                      type="text"
                      maxLength={30}
                      value={customStreakTitle}
                      onChange={(e) => setCustomStreakTitle(e.target.value)}
                      placeholder="Enter custom streak protocol name..."
                      className="w-full bg-slate-950/60 border border-purple-500/20 focus:border-purple-500/50 outline-none p-4 rounded-2xl text-xs text-white font-bold leading-normal text-center placeholder-slate-600 font-sans tracking-wide transition-colors uppercase"
                    />
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      playSynthSound('click');
                      const customIdx = STREAK_CATEGORIES.findIndex(cat => cat.id === 'custom');
                      setSelectedStreakCategory(customIdx);
                      setShowCustomInput(true);
                    }}
                    className="flex-1 py-4 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all"
                  >
                    Create Custom Streak
                  </button>
                  <button
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(20);
                      playSynthSound('success');
                      
                      const selectedCat = STREAK_CATEGORIES[selectedStreakCategory];
                      const finalTitle = (selectedCat.id === 'custom' && customStreakTitle) ? customStreakTitle : selectedCat.title;
                      
                      if (onUpdateProfile) {
                        onUpdateProfile(prev => {
                          const newXp = prev.xp + 15;
                          const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
                          return {
                            ...prev,
                            xp: newXp,
                            level: newLevel,
                            activeStreak: {
                              title: finalTitle,
                              startedAt: Date.now(),
                              completed: false,
                              category: selectedCat.desc || 'Routine Protocol'
                            }
                          };
                        });
                      }
                      
                      showToast(`Streak initiated: ${finalTitle}. Complete it next!`, "success");
                      setIsStreakOpen(false);
                    }}
                    className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                  >
                    <Flame size={14} fill="currentColor" /> Start Streak
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Legacy/Floating particles background system */}
      {streakParticles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: particlesActive 
              ? `translate(${p.dx}px, ${p.dy}px) scale(0)` 
              : 'translate(0px, 0px) scale(1)',
            opacity: particlesActive ? 0 : 0.9,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            boxShadow: `0 0 12px ${p.color}`,
            borderRadius: '50%',
            transition: 'transform 1.2s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 1.2s ease-out',
            pointerEvents: 'none',
            zIndex: 155
          }}
        />
      ))}

      {/* Custom floating "Reminder Setup" modal with glassmorphism & soft electric blue border glow */}
      <AnimatePresence>
        {selectedReminderTask && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            {/* Dark glass backdrop with blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReminderTask(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.45, bounce: 0.1 }}
              className="relative w-full max-w-sm rounded-[32px] bg-slate-900/90 border border-sky-500/30 p-6 shadow-[0_0_50px_rgba(56,189,248,0.2)] backdrop-blur-2xl overflow-hidden z-10"
            >
              {/* Radial background ambient glows */}
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="space-y-5">
                {/* Header */}
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-white uppercase tracking-widest flex items-center justify-center gap-2 font-outfit">
                    <Bell size={16} className="text-sky-400 animate-pulse" /> Set Reminder
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Choose when Nexora should remind you.
                  </p>
                </div>

                {/* Cylindrical Dial Wheel Pickers with Scroll/Swipe/Wheel Support */}
                <div className="flex items-center justify-center gap-4 py-4 bg-slate-950/40 rounded-2xl border border-slate-900 shadow-inner">
                  {/* Hour Scroller */}
                  <ScrollColumn 
                    items={HOURS} 
                    current={pickerHour} 
                    onChange={setPickerHour} 
                    label="HR" 
                  />

                  <div className="text-sky-500/50 font-mono text-lg font-bold pb-4">:</div>

                  {/* Minute Scroller */}
                  <ScrollColumn 
                    items={MINUTES} 
                    current={pickerMinute} 
                    onChange={setPickerMinute} 
                    label="MIN" 
                  />

                  <div className="w-1" />

                  {/* AM / PM Scroller */}
                  <ScrollColumn 
                    items={AMPM as any} 
                    current={pickerAmPm} 
                    onChange={setPickerAmPm as any} 
                    label="ZONE" 
                  />
                </div>

                {/* Repeat Controls */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest pl-1">Repeat Settings</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {REPEAT_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setPickerRepeat(opt)}
                        className={`py-2 px-1 rounded-xl text-[9px] font-extrabold uppercase tracking-wide transition-all border ${
                          pickerRepeat === opt 
                            ? 'bg-sky-500/20 border-sky-400 text-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.15)]' 
                            : 'bg-slate-950 border-slate-900 text-slate-500 hover:border-slate-800'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Passive Silent Reminder Profile Info (Requirement #5) */}
                <div className="bg-slate-950/70 border border-slate-900 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-mono tracking-wider font-extrabold">
                    <span className="text-slate-500 uppercase">REMINDER DISPATCH METHOD</span>
                    <span className="text-sky-400 uppercase">PASSIVE INTEGRATION</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-slate-950 border border-slate-900 rounded-xl p-2.5 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 text-[10px] font-bold">✓</div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-white uppercase tracking-wider">Silent Only</span>
                        <span className="text-[7.5px] font-mono text-slate-500">No sounds/alarms</span>
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-slate-900 rounded-xl p-2.5 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 text-[10px] font-bold">✓</div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-white uppercase tracking-wider">Zero Noise</span>
                        <span className="text-[7.5px] font-mono text-slate-500">No haptics or vibration</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Custom Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedReminderTask(null)}
                    className="flex-1 py-3 border border-slate-800 hover:border-slate-700 bg-slate-950/50 hover:bg-slate-950 text-slate-400 hover:text-white rounded-2xl text-[10px] font-extrabold uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedReminderTask) return;
                      // Update schedule state
                      setReminderSchedules(prev => ({
                        ...prev,
                        [selectedReminderTask.id]: {
                          taskId: selectedReminderTask.id,
                          taskTitle: selectedReminderTask.title,
                          time: `${pickerHour}:${pickerMinute}`,
                          amPm: pickerAmPm,
                          repeat: pickerRepeat
                        }
                      }));
                      // Make sure standard reminders set has it enabled
                      setReminders(prev => {
                        const next = new Set(prev);
                        next.add(selectedReminderTask.id);
                        return next;
                      });
                      const hourNum = (parseInt(pickerHour, 10) % 12) + (pickerAmPm === 'PM' ? 12 : 0);
                      const minNum = parseInt(pickerMinute, 10) || 0;
                      const scheduledDate = new Date();
                      scheduledDate.setHours(hourNum, minNum, 0, 0);
                      if (scheduledDate.getTime() < Date.now()) {
                        scheduledDate.setDate(scheduledDate.getDate() + 1);
                      }
                      const reminderEpoch = scheduledDate.getTime();
                      const reminderTaskId = selectedReminderTask.id;
                      setTasks(prev => prev.map(t => t.id === reminderTaskId ? { ...t, reminderAt: reminderEpoch } : t));
                      
                      showToast(`Nexora: Silent reminder scheduled for ${pickerHour}:${pickerMinute} ${pickerAmPm}.`, "success");
                      setSelectedReminderTask(null);
                    }}
                    className="flex-1 py-3 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white rounded-2xl text-[10px] font-extrabold uppercase tracking-widest shadow-[0_0_20px_rgba(56,189,248,0.25)] hover:shadow-[0_0_25px_rgba(56,189,248,0.4)] active:scale-95 transition-all"
                  >
                    Save Reminder
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}



        {isWeeklyReportOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            {/* Dark glass backdrop with blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWeeklyReportOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
              className="relative w-full max-w-2xl rounded-[36px] bg-slate-900/95 border border-indigo-500/30 p-6 md:p-8 shadow-[0_0_50px_rgba(99,102,241,0.25)] backdrop-blur-2xl overflow-hidden z-10 text-white"
            >
              {/* Radial ambient background glows */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Close Button */}
              <button 
                onClick={() => { playSynthSound('click'); setIsWeeklyReportOpen(false); }}
                className="absolute top-6 right-6 p-2 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-950/80 transition-all active:scale-95 z-20"
              >
                <X size={16} />
              </button>

              <div className="space-y-6">
                {/* Header with Dynamic Title & Layout Selector */}
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl text-white shadow-[0_4px_15px_rgba(168,85,247,0.3)]">
                      <Award size={24} className="animate-bounce" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-bold font-outfit uppercase tracking-tight flex items-center gap-2">
                        {REPORTS_DATA[selectedReportTimeframe].title}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">
                        {REPORTS_DATA[selectedReportTimeframe].desc}
                      </p>
                    </div>
                  </div>

                  {/* Selector Layout Switcher Button */}
                  <button 
                    onClick={() => {
                      playSynthSound('click');
                      setReportSelectorLayout(prev => prev === 'Classic Cards' ? 'Neural Wheel' : 'Classic Cards');
                    }}
                    className="p-2.5 bg-slate-950/40 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all active:scale-90 cursor-pointer flex items-center gap-2 shadow-inner"
                    title={`Switch timeframe picker to ${reportSelectorLayout === 'Classic Cards' ? 'Neural Wheel' : 'Classic Cards'}`}
                  >
                    {reportSelectorLayout === 'Classic Cards' ? <Layers size={14} /> : <LayoutGrid size={14} />}
                    <span className="text-[8px] font-bold font-mono tracking-wider uppercase hidden sm:inline">{reportSelectorLayout === 'Classic Cards' ? 'Neural Wheel' : 'Classic Cards'}</span>
                  </button>
                </div>

                {/* Interactive Timeframe Selection Area */}
                <div className="py-2">
                  {reportSelectorLayout === 'Classic Cards' ? (
                    /* Classic Cards Layout for Timeframe Selector */
                    <div className="grid grid-cols-5 gap-2.5 animate-in fade-in duration-300">
                      {Object.values(REPORTS_DATA).map((report) => {
                        const isSelected = selectedReportTimeframe === report.id;
                        const IconComponent = report.id === 'week' ? Clock 
                                            : report.id === 'month' ? Compass 
                                            : report.id === '4 months' ? Brain 
                                            : report.id === '6 months' ? Target 
                                            : Award;
                        return (
                          <button
                            key={report.id}
                            onClick={() => {
                              playSynthSound('click');
                              setSelectedReportTimeframe(report.id as any);
                            }}
                            className={`text-center p-3 rounded-2xl border transition-all duration-300 relative flex flex-col items-center justify-center gap-1.5 min-h-[84px] cursor-pointer ${
                              isSelected 
                                ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.25)] scale-[1.03]' 
                                : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/60'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-600' : 'bg-slate-800'} text-white shadow-md`}>
                              <IconComponent size={14} />
                            </div>
                            <span className="text-[9px] font-bold text-white uppercase tracking-wider">{report.label}</span>
                            <span className="text-[7px] text-slate-500 font-mono font-bold">{report.avgFocus} focus</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Neural Wheel Layout for Timeframe Selector */
                    <div className="flex flex-col items-center justify-center py-4 relative animate-in fade-in duration-500 min-h-[230px]">
                      <div className="relative w-[210px] h-[210px] md:w-[240px] md:h-[240px] flex items-center justify-center">
                        {/* Center Hub */}
                        <div className="absolute z-20 w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-950 border-2 border-indigo-500/50 flex flex-col items-center justify-center shadow-[0_0_35px_rgba(99,102,241,0.25)] text-center">
                           {(() => {
                              const activeReport = REPORTS_DATA[selectedReportTimeframe];
                              const Icon = selectedReportTimeframe === 'week' ? Clock 
                                         : selectedReportTimeframe === 'month' ? Compass 
                                         : selectedReportTimeframe === '4 months' ? Brain 
                                         : selectedReportTimeframe === '6 months' ? Target 
                                         : Award;
                              return (
                                <>
                                  <Icon size={18} className="text-white mb-0.5 animate-in zoom-in duration-300" />
                                  <span className="text-[8px] font-extrabold text-white uppercase tracking-wider">{activeReport.label}</span>
                                  <span className="text-[7px] text-indigo-400 font-mono font-bold mt-0.5">{activeReport.avgFocus}</span>
                                </>
                              );
                           })()}
                        </div>

                        {/* Radial Timeframes */}
                        {Object.values(REPORTS_DATA).map((report, i) => {
                          const angle = (i * (360 / 5) - 90) * (Math.PI / 180); // Start from top
                          const radius = window.innerWidth < 768 ? 75 : 95;
                          const x = Math.cos(angle) * radius;
                          const y = Math.sin(angle) * radius;

                          const isSelected = selectedReportTimeframe === report.id;
                          const Icon = report.id === 'week' ? Clock 
                                     : report.id === 'month' ? Compass 
                                     : report.id === '4 months' ? Brain 
                                     : report.id === '6 months' ? Target 
                                     : Award;

                          return (
                            <button
                              key={report.id}
                              onClick={() => {
                                playSynthSound('click');
                                setSelectedReportTimeframe(report.id as any);
                              }}
                              style={{
                                transform: `translate(${x}px, ${y}px)`,
                              }}
                              className={`absolute w-11 h-11 rounded-[16px] flex flex-col items-center justify-center transition-all duration-500 hover:scale-110 active:scale-95 group cursor-pointer z-10 ${
                                isSelected 
                                  ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] scale-110 border border-white/20' 
                                  : 'bg-slate-950 text-slate-500 border border-slate-800 hover:border-indigo-500/40 hover:text-white'
                              }`}
                              title={`${report.label} Report`}
                            >
                              <Icon size={14} />
                              <span className="text-[7px] font-bold uppercase tracking-tight mt-0.5">{report.label}</span>
                            </button>
                          );
                        })}

                        {/* Orbit Lines */}
                        <div className="absolute inset-3 rounded-full border border-white/5 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Sliding Content Container */}
                <div className="relative overflow-hidden min-h-[300px] flex flex-col justify-between">
                  <AnimatePresence mode="wait">
                    {weeklyReportSlideIndex === 0 && (
                      <motion.div
                        key={`slide-time-${selectedReportTimeframe}`}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-5"
                      >
                        <div className="bg-slate-950/40 border border-slate-800/80 p-6 rounded-3xl space-y-4">
                          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={12} className="text-indigo-400" /> Time Investment Synthesis
                          </h4>
                          
                          <div className="space-y-4">
                            {/* Time on Nexora */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                                  <Zap size={11} className="text-sky-400" /> Spend on Nexora
                                </span>
                                <span className="font-mono font-bold text-white">{REPORTS_DATA[selectedReportTimeframe].spendNexora}</span>
                              </div>
                              <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900/60 p-[1px]">
                                <motion.div 
                                  key={`nexora-${selectedReportTimeframe}`}
                                  initial={{ width: 0 }}
                                  animate={{ width: REPORTS_DATA[selectedReportTimeframe].nexoraPercent }}
                                  transition={{ duration: 1.2, ease: "easeOut" }}
                                  className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full"
                                />
                              </div>
                            </div>

                            {/* Productivity Time */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                                  <Target size={11} className="text-yellow-400" /> Spend on Productivity
                                </span>
                                <span className="font-mono font-bold text-white">{REPORTS_DATA[selectedReportTimeframe].spendProductivity}</span>
                              </div>
                              <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900/60 p-[1px]">
                                <motion.div 
                                  key={`prod-${selectedReportTimeframe}`}
                                  initial={{ width: 0 }}
                                  animate={{ width: REPORTS_DATA[selectedReportTimeframe].productivityPercent }}
                                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
                                  className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
                                />
                              </div>
                            </div>

                            {/* Growth Time */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                                  <Brain size={11} className="text-purple-400" /> Spend on Growth
                                </span>
                                <span className="font-mono font-bold text-white">{REPORTS_DATA[selectedReportTimeframe].spendGrowth}</span>
                              </div>
                              <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900/60 p-[1px]">
                                <motion.div 
                                  key={`growth-${selectedReportTimeframe}`}
                                  initial={{ width: 0 }}
                                  animate={{ width: REPORTS_DATA[selectedReportTimeframe].growthPercent }}
                                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {weeklyReportSlideIndex === 1 && (
                      <motion.div
                        key={`slide-focus-${selectedReportTimeframe}`}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-5"
                      >
                        {/* Focus Stats Analysis */}
                        <div className="bg-slate-950/40 border border-slate-800/80 p-6 rounded-3xl space-y-4">
                          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Activity size={12} className="text-rose-400" /> {REPORTS_DATA[selectedReportTimeframe].label} Focus Intensity
                          </h4>
                          <div className="flex justify-between items-center">
                            <div className="space-y-0.5">
                              <p className="text-xs text-slate-400 font-semibold">Average Focus</p>
                              <p className="text-xl font-bold font-outfit text-white">{REPORTS_DATA[selectedReportTimeframe].avgFocus}</p>
                            </div>
                            <div className="text-right space-y-0.5">
                              <p className="text-xs text-slate-400 font-semibold">Peak Flow State</p>
                              <p className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/10 uppercase tracking-wider">{REPORTS_DATA[selectedReportTimeframe].peakFlow}</p>
                            </div>
                          </div>
                          
                          {/* Focus Day Bars */}
                          <div className="flex items-end justify-between pt-2.5 h-24 px-4 bg-slate-950/50 rounded-2xl border border-slate-900 shadow-inner">
                            {REPORTS_DATA[selectedReportTimeframe].focusBars.map((d, index) => (
                              <div key={index} className="flex flex-col items-center flex-1 gap-1">
                                <div className="w-3 bg-slate-800 rounded-t-full h-14 relative overflow-hidden">
                                  <motion.div 
                                    key={`${selectedReportTimeframe}-${index}`}
                                    initial={{ height: 0 }}
                                    animate={{ height: d.val }}
                                    transition={{ duration: 1.2, ease: "easeOut", delay: index * 0.08 }}
                                    className="absolute bottom-0 w-full bg-gradient-to-t from-indigo-500 to-pink-500"
                                  />
                                </div>
                                <span className="text-[10px] font-extrabold text-slate-500 font-mono">{d.day}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {weeklyReportSlideIndex === 2 && (
                      <motion.div
                        key={`slide-completed-${selectedReportTimeframe}`}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-4"
                      >
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <CheckCircle2 size={12} className="text-emerald-400" /> Completed Active Goals
                          </span>
                          <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            {tasks.filter(t => t.completed).length} Achieved
                          </span>
                        </h4>

                        {/* Dynamic completed goals list */}
                        {tasks.filter(t => t.completed).length > 0 ? (
                          <div className="space-y-3 overflow-y-auto max-h-[195px] pr-1.5 scrollbar-thin">
                            {tasks.filter(t => t.completed).map((task) => (
                              <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                key={task.id} 
                                className="p-4 bg-slate-950/60 border border-emerald-500/15 rounded-3xl flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl">
                                    <CheckCircle2 size={14} />
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-white tracking-wide truncate max-w-[420px]">{task.title}</p>
                                    <span className="text-[9px] font-mono font-extrabold text-slate-500 uppercase tracking-wider">{task.category}</span>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <div className="h-[190px] flex flex-col justify-center items-center text-center p-6 bg-slate-950/40 border border-slate-800/60 rounded-[32px] space-y-3.5">
                            <AlertCircle size={24} className="text-amber-500/80 animate-pulse" />
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Active Goals Pending</p>
                              <p className="text-[10px] text-slate-500 font-medium leading-relaxed px-2">
                                Check off goals on your daily dashboard workspace to populate your completion log here.
                              </p>
                            </div>
                            <button 
                              onClick={() => { playSynthSound('click'); setIsWeeklyReportOpen(false); }}
                              className="px-5 py-2.5 bg-indigo-500/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-white rounded-2xl text-[9px] font-bold uppercase tracking-widest border border-indigo-500/20 transition-all active:scale-95"
                            >
                              Access Workspace Channels
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {weeklyReportSlideIndex === 3 && (
                      <motion.div
                        key={`slide-momentum-${selectedReportTimeframe}`}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-4"
                      >
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Activity size={12} className="text-rose-400" /> Momentum Rescue Diagnostics
                          </span>
                          <span className="text-[9px] font-mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                            Score: {userProfile?.momentumRescue?.momentumScore ?? 100}%
                          </span>
                        </h4>

                        <div className="bg-slate-950/40 border border-slate-800/80 p-5 rounded-[24px] space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-900/50 p-3 border border-slate-800/50 rounded-2xl space-y-1">
                              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest block font-mono">Missions Saved</span>
                              <span className="text-sm font-black font-mono text-emerald-400">{userProfile?.momentumRescue?.history?.missionsCompleted ?? 0}</span>
                            </div>
                            <div className="bg-slate-900/50 p-3 border border-slate-800/50 rounded-2xl space-y-1">
                              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest block font-mono">Success Rate</span>
                              <span className="text-sm font-black font-mono text-white">{(userProfile?.momentumRescue?.history?.recoverySuccessRate) ?? 100}%</span>
                            </div>
                            <div className="bg-slate-900/50 p-3 border border-slate-800/50 rounded-2xl space-y-1">
                              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest block font-mono font-sans">Streak Recovery</span>
                              <span className="text-sm font-black font-mono text-purple-400">{userProfile?.momentumRescue?.history?.recoveryStreak ?? 0} days</span>
                            </div>
                            <div className="bg-slate-900/50 p-3 border border-slate-800/50 rounded-2xl space-y-1">
                              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest block font-mono">Days Saved</span>
                              <span className="text-sm font-black font-mono text-rose-400">{userProfile?.momentumRescue?.history?.daysSaved ?? 0} total</span>
                            </div>
                          </div>

                          <div className="p-3 bg-slate-900/30 border border-slate-800/50 rounded-2xl space-y-2">
                            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest block font-mono">Circadian Rhythm & Productivity Peak</span>
                            <div className="flex flex-wrap gap-2 text-[10px] font-mono font-medium text-slate-400">
                              <span className="bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-900/80">🌅 Wakeup: {userProfile?.momentumRescue?.behaviorProfile?.wakeUpTime || "07:30"}</span>
                              <span className="bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-900/80">🌌 Sleep: {userProfile?.momentumRescue?.behaviorProfile?.sleepTime || "23:00"}</span>
                              {userProfile?.momentumRescue?.behaviorProfile?.weeklyConsistencyPattern ? (
                                <p className="text-[9px] text-slate-400 italic mt-1 leading-normal w-full">{userProfile.momentumRescue.behaviorProfile.weeklyConsistencyPattern}</p>
                              ) : (
                                <p className="text-[9px] text-slate-500 italic mt-1 leading-normal w-full">Synthesizing behavioral patterns from focus logs...</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer and Slide Controls */}
                <div className="border-t border-slate-800/60 pt-5 flex items-center justify-between">
                  {/* Left / Back Button */}
                  <div className="w-[100px]">
                    {weeklyReportSlideIndex > 0 ? (
                      <button
                        onClick={() => { playSynthSound('click'); setWeeklyReportSlideIndex(prev => prev - 1); }}
                        className="px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/80 text-slate-300 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        <ChevronLeft size={12} /> Back
                      </button>
                    ) : null}
                  </div>

                  {/* Dots Indicators */}
                  <div className="flex gap-2.5">
                    {[0, 1, 2, 3].map((idx) => (
                      <button
                        key={idx}
                        onClick={() => { playSynthSound('click'); setWeeklyReportSlideIndex(idx); }}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${weeklyReportSlideIndex === idx ? 'bg-gradient-to-r from-purple-500 to-indigo-500 scale-125 shadow-[0_0_10px_rgba(168,85,247,0.6)]' : 'bg-slate-800 hover:bg-slate-700'}`}
                        title={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>

                  {/* Right / Next Indicator */}
                  <div className="w-[140px] flex justify-end">
                    {weeklyReportSlideIndex < 3 ? (
                      <button
                        onClick={() => { playSynthSound('click'); setWeeklyReportSlideIndex(prev => prev + 1); }}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 shadow-lg shadow-indigo-600/15"
                      >
                        Next <ChevronRight size={12} />
                      </button>
                    ) : (
                      <button
                        onClick={() => { playSynthSound('click'); setIsWeeklyReportOpen(false); }}
                        className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                      >
                        Accept Epoch
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Next Meaningful Step Suggestion Popup */}
      <AnimatePresence>
        {showBonusStepNotification && (
          <div className="fixed inset-0 z-[150] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/5 via-slate-950/10 to-indigo-500/5 pointer-events-none" />
            <div 
              className="absolute inset-0" 
              onClick={() => {
                if (!isGeneratingNextStep) {
                  playSynthSound('click');
                  setShowBonusStepNotification(false);
                  setNextBonusStep(null);
                }
              }} 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-slate-900/95 backdrop-blur-2xl border border-yellow-500/20 rounded-[40px] w-full max-w-xl overflow-y-auto max-h-[90vh] shadow-[0_0_55px_rgba(234,179,8,0.12)] relative z-10 p-6 md:p-10 space-y-6"
            >
              {isGeneratingNextStep ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-yellow-500/10" />
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="absolute inset-0 rounded-full border-4 border-t-yellow-500 border-r-transparent border-b-transparent border-l-transparent"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Brain size={24} className="text-yellow-400 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-white uppercase tracking-widest font-outfit">Synchronizing Neural Pathway</h4>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Querying Gemini Cognitive Cluster...</p>
                  </div>
                </div>
              ) : nextBonusStep ? (
                <>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-2xl flex items-center justify-center">
                        <Sparkles size={18} className="animate-pulse" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-mono font-black text-yellow-400 uppercase tracking-widest font-mono">Cognitive Uplink</span>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Extra Mile Recommendation</h3>
                      </div>
                    </div>
                    <button 
                      onClick={() => { playSynthSound('click'); setShowBonusStepNotification(false); setNextBonusStep(null); }}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-xl font-black text-white uppercase tracking-wide font-outfit">🎉 Today's mission is complete.</h2>
                      <p className="text-sm text-slate-400 font-medium">Most people stop here.</p>
                      <p className="text-xs text-indigo-400 font-semibold leading-relaxed">
                        Based on your momentum, AI found one more meaningful step to help you grow.
                      </p>
                    </div>

                    <div className="p-6 bg-slate-950/60 border border-yellow-500/10 rounded-[28px] space-y-3 shadow-inner relative overflow-hidden text-left">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 blur-xl rounded-full" />
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 text-[8px] font-black font-mono text-yellow-400 rounded uppercase tracking-widest">
                          {nextBonusStep.category}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-white uppercase tracking-wide font-outfit">{nextBonusStep.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans font-medium">{nextBonusStep.explanation}</p>
                    </div>

                    {/* Reward Panel */}
                    <div className="space-y-3 text-left">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Bonus Rewards</span>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-2xl text-center space-y-1">
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block font-mono">XP Gain</span>
                          <span className="text-xs font-black font-mono text-white">+{nextBonusStep.xpReward} XP</span>
                        </div>
                        <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-2xl text-center space-y-1">
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Badge Progress</span>
                          <span className="text-xs font-black font-mono text-white">+{nextBonusStep.badgeProgress}%</span>
                        </div>
                        <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-2xl text-center space-y-1">
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Rank Progress</span>
                          <span className="text-xs font-black font-mono text-white">+{nextBonusStep.rankProgress}%</span>
                        </div>
                        <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-2xl text-center space-y-1">
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Momentum</span>
                          <span className="text-xs font-black font-mono text-white">+{nextBonusStep.momentumProgress}%</span>
                        </div>
                      </div>
                      {completedBonusCountToday > 0 && (
                        <p className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider text-center italic">
                          * Rewards slightly scaled down due to multiple daily bonus completions to prevent farming.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleAcceptBonusChallenge}
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-yellow-500/10 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Rocket size={14} /> Continue Building
                    </button>
                    <button
                      onClick={() => {
                        playSynthSound('click');
                        setShowBonusStepNotification(false);
                        setNextBonusStep(null);
                        showToast("Momentum locked. Recharge for tomorrow.", "info");
                      }}
                      className="px-6 py-4 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/30 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all cursor-pointer flex items-center justify-center"
                    >
                      Rest for Today
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center space-y-3">
                  <AlertCircle size={24} className="text-rose-500 mx-auto" />
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Uplink generation failed.</p>
                  <button 
                    onClick={() => { playSynthSound('click'); setShowBonusStepNotification(false); }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-widest"
                  >
                    Acknowledge
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Next Meaningful Step Celebration & Rewards Modal */}
      <AnimatePresence>
        {showRewardsModal && justCompletedBonus && (
          <div className="fixed inset-0 z-[160] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-slate-950/10 to-indigo-500/5 pointer-events-none" />
            <div 
              className="absolute inset-0" 
              onClick={() => {
                playSynthSound('click');
                setShowRewardsModal(false);
                setJustCompletedBonus(null);
              }} 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-slate-900/95 backdrop-blur-2xl border border-emerald-500/20 rounded-[40px] w-full max-w-md overflow-y-auto max-h-[90vh] shadow-[0_0_55px_rgba(16,185,129,0.12)] relative z-10 p-6 md:p-10 text-center space-y-6"
            >
              <div className="w-16 h-16 bg-gradient-to-tr from-emerald-600/20 to-teal-500/20 rounded-[24px] flex items-center justify-center text-emerald-400 border border-emerald-500/40 mx-auto shadow-xl relative animate-bounce" style={{ animationDuration: '3s' }}>
                <Trophy size={28} />
                <div className="absolute inset-0 bg-emerald-400/20 rounded-[24px] blur-md animate-ping pointer-events-none opacity-40" />
              </div>

              <div className="space-y-2">
                <span className="text-[9px] font-mono font-black text-emerald-400 uppercase tracking-widest">Protocol Succeeded</span>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider font-outfit">BONUS STEP ACHIEVED</h2>
                <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-widest max-w-xs mx-auto">
                  You completed the extra mile task. Your growth metrics have been updated instantly.
                </p>
              </div>

              <div className="p-5 bg-slate-950/50 rounded-3xl border border-slate-800/80 text-left space-y-4">
                {/* Reward XP */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-slate-400 font-mono">
                    <span>Neural XP Granted</span>
                    <span className="text-white">+{justCompletedBonus.xpReward} XP</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                    />
                  </div>
                </div>

                {/* Badge progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-slate-400 font-mono">
                    <span>Badge Progression</span>
                    <span className="text-white">+{justCompletedBonus.badgeProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${justCompletedBonus.badgeProgress * 4}%` }}
                      transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    />
                  </div>
                </div>

                {/* Rank progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-slate-400 font-mono">
                    <span>Rank Progression</span>
                    <span className="text-white">+{justCompletedBonus.rankProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${justCompletedBonus.rankProgress * 6}%` }}
                      transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
                      className="h-full bg-gradient-to-r from-blue-500 to-sky-400 rounded-full"
                    />
                  </div>
                </div>

                {/* Momentum */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-slate-400 font-mono">
                    <span>Momentum Integration</span>
                    <span className="text-white">+{justCompletedBonus.momentumProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: "95%" }}
                      transition={{ duration: 1.5, ease: "easeOut", delay: 0.6 }}
                      className="h-full bg-gradient-to-r from-yellow-500 to-orange-400 rounded-full"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  playSynthSound('click');
                  setShowRewardsModal(false);
                  setJustCompletedBonus(null);
                }}
                className="w-full px-6 py-4 bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-[0.98] cursor-pointer"
              >
                Acknowledge Reward
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Suspicious Rapid Completion Verification Modal */}
      <AnimatePresence>
        {showSuspiciousModal && (
          <div className="fixed inset-0 z-[180] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
            <div className={`absolute inset-0 transition-opacity duration-1000 ${
              isVerified 
                ? 'bg-gradient-to-tr from-emerald-500/10 via-slate-950/20 to-teal-500/10 pointer-events-none' 
                : 'bg-gradient-to-tr from-yellow-500/5 via-slate-950/10 to-rose-500/5 pointer-events-none'
            }`} />
            <div 
              className="absolute inset-0" 
              onClick={() => {
                playSynthSound('click');
              }} 
            />
            
            <motion.div 
              key={isVerified ? "verified" : "unverified"}
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.5 }}
              className={`bg-slate-900/95 backdrop-blur-2xl rounded-[40px] w-full max-w-md overflow-y-auto max-h-[90vh] relative z-10 p-6 md:p-10 text-center space-y-6 transition-all duration-500 ${
                isVerified 
                  ? 'border border-emerald-500/30 shadow-[0_0_55px_rgba(16,185,129,0.15)] bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/20' 
                  : 'border border-yellow-500/20 shadow-[0_0_55px_rgba(234,179,8,0.12)]'
              }`}
            >
              {isVerified ? (
                <>
                  <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 bg-emerald-500/10 rounded-[28px] blur-xl"
                    />
                    
                    <motion.div 
                      initial={{ rotate: -90, scale: 0.8, opacity: 0 }}
                      animate={{ rotate: 0, scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 100, damping: 15 }}
                      className="w-16 h-16 bg-gradient-to-tr from-emerald-600/20 to-teal-500/20 rounded-[24px] flex items-center justify-center text-emerald-400 border border-emerald-500/40 relative"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 150, damping: 10 }}
                      >
                        <CheckCircle2 size={32} strokeWidth={2.5} className="text-emerald-400" />
                      </motion.div>
                    </motion.div>
                  </div>

                  <div className="space-y-4">
                    <span className="text-[9px] font-mono font-black text-emerald-400 uppercase tracking-widest block">System Integrity Verified</span>
                    <h2 className="text-2xl font-black text-white uppercase tracking-wider font-outfit">Verification Complete</h2>
                    <div className="space-y-3 text-sm text-slate-400 leading-relaxed font-sans font-medium max-w-sm mx-auto">
                      <p>Trust is earned through consistency.</p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Thank you for keeping Nexora meaningful.
                      </p>
                      <p className="text-xs text-emerald-400/80 font-bold uppercase tracking-wider">
                        Your Progress, XP, Rank, and Badges have been updated successfully.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="w-24 h-1 bg-slate-950 rounded-full mx-auto overflow-hidden">
                      <motion.div 
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: 2.5, ease: "linear" }}
                        className="h-full bg-emerald-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-gradient-to-tr from-yellow-600/20 to-amber-500/20 rounded-[24px] flex items-center justify-center text-yellow-400 border border-yellow-500/40 mx-auto shadow-xl relative animate-bounce" style={{ animationDuration: '3s' }}>
                    <AlertCircle size={28} className="animate-pulse" />
                    <div className="absolute inset-0 bg-yellow-400/20 rounded-[24px] blur-md pointer-events-none opacity-40" />
                  </div>

                  <div className="space-y-3">
                    <span className="text-[9px] font-mono font-black text-yellow-400 uppercase tracking-widest block">System Integrity Uplink</span>
                    <h2 className="text-xl font-black text-white uppercase tracking-wider font-outfit">⚠️ That was unusually fast.</h2>
                    <div className="space-y-2 text-sm text-slate-400 leading-relaxed font-sans font-medium max-w-xs mx-auto">
                      <p>It looks like multiple goals were completed almost instantly.</p>
                      <p className="text-xs text-slate-500 mt-1">
                        To keep Progress, XP, Rank, and Badges meaningful for everyone, please confirm these tasks were genuinely completed.
                      </p>
                    </div>
                  </div>

                  {/* Review Tasks Dropdown Section */}
                  {showReviewList && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="p-4 bg-slate-950/60 rounded-3xl border border-slate-800 text-left space-y-3 max-h-[180px] overflow-y-auto"
                    >
                      <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500 block font-mono">Tasks flag-tagged:</span>
                      <div className="space-y-2">
                        {suspiciousTasks.map((task) => (
                          <div key={task.id} className="flex items-center justify-between p-2.5 bg-slate-900/50 rounded-xl border border-slate-800/60">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-slate-500">{task.category}</span>
                              <span className={`text-xs font-semibold text-slate-200 ${!task.completed ? 'line-through text-slate-600' : ''}`}>
                                {task.title}
                              </span>
                            </div>
                            <button 
                              onClick={() => {
                                playSynthSound('click');
                                toggleTask(task.id);
                                setSuspiciousTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
                              }}
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                                task.completed 
                                  ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400' 
                                  : 'border-slate-800 text-transparent'
                              }`}
                            >
                              <CheckCircle2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-2 pt-2">
                    <button
                      onClick={handleConfirmSuspiciousCompletions}
                      className="w-full px-6 py-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/10"
                    >
                      <CheckCircle2 size={14} /> Confirm Completion
                    </button>
                    
                    <button
                      onClick={() => {
                        playSynthSound('click');
                        setShowReviewList(!showReviewList);
                      }}
                      className="w-full px-6 py-3 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/30 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all cursor-pointer"
                    >
                      {showReviewList ? "Hide Review List" : "Review Tasks"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface SwipeableTaskCardProps {
  task: Task;
  burstingTaskId: string | null;
  particles: any[];
  toggleTask: (taskId: string) => void;
  onSnooze: (taskId: string) => void;
  focusedTaskId: string | null;
  isActive: boolean;
  handleStartGoalTimer: (id: string, title: string, estimate: string) => void;
  handleBreakdown: (e: any, id: string, title: string) => void;
  isBreakingDown: string | null;
  handleReminderClick: (e: any, id: string, title: string) => void;
  reminderSchedules: Record<string, any>;
  reminders: Set<string>;
  formatTime: (time: number) => string;
  timeLeft: number;
}

const SwipeableTaskCard: React.FC<SwipeableTaskCardProps> = ({
  task,
  burstingTaskId,
  particles,
  toggleTask,
  onSnooze,
  focusedTaskId,
  isActive,
  handleStartGoalTimer,
  handleBreakdown,
  isBreakingDown,
  handleReminderClick,
  reminderSchedules,
  reminders,
  formatTime,
  timeLeft
}) => {
  const x = useMotionValue(0);
  
  // Transform x position into opacity values for visual reveal effects
  const completeOpacity = useTransform(x, [0, 110], [0, 1]);
  const snoozeOpacity = useTransform(x, [0, -110], [0, 1]);
  
  // Transform x position into minor rotation or scale of icons for premium feedback as the user swiping
  const checkScale = useTransform(x, [0, 110], [0.8, 1.25]);
  const snoozeScale = useTransform(x, [0, -110], [0.8, 1.25]);

  const isBursting = burstingTaskId === task.id;

  return (
    <div className="relative overflow-visible group select-none">
      {/* Background Action Underlap */}
      <div className="absolute inset-0 rounded-[28px] overflow-hidden pointer-events-none z-0">
        
        {/* Swipe Right Background Indicator (Complete) */}
        <motion.div 
          style={{ opacity: completeOpacity }}
          className="absolute inset-y-0 left-0 right-0 bg-emerald-500/15 border border-emerald-500/25 flex items-center pl-8 rounded-[28px]"
        >
          <div className="flex items-center gap-2.5">
            <motion.div style={{ scale: checkScale }}>
              <CheckCircle2 className="text-emerald-400 stroke-[2.5]" size={22} />
            </motion.div>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest font-sans">
              Release to Complete
            </span>
          </div>
        </motion.div>

        {/* Swipe Left Background Indicator (Snooze) */}
        <motion.div 
          style={{ opacity: snoozeOpacity }}
          className="absolute inset-y-0 left-0 right-0 bg-amber-500/10 border border-amber-500/20 flex items-center justify-end pr-8 rounded-[28px]"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest font-sans">
              Release to Snooze
            </span>
            <motion.div style={{ scale: snoozeScale }}>
              <Clock className="text-amber-500 stroke-[2.5]" size={22} />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Main Draggable Task Card Foreground */}
      <motion.div 
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.5, right: 0.5 }}
        style={{ x }}
        onDragEnd={(event, info) => {
          const offset = info.offset.x;
          if (offset > 110) {
            playSynthSound('success');
            toggleTask(task.id);
          } else if (offset < -110) {
            playSynthSound('click');
            onSnooze(task.id);
          }
        }}
        className={`bg-slate-900 border rounded-[28px] p-6 transition-all duration-300 cursor-grab active:cursor-grabbing shadow-xl relative overflow-visible z-10 ${
          task.completed 
            ? 'border-emerald-500/30 opacity-60' 
            : task.isBonus
              ? 'border-yellow-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-yellow-950/10 shadow-[0_0_30px_rgba(234,179,8,0.1)] hover:border-yellow-400'
              : 'border-slate-800 hover:border-indigo-500/50'
        }`}
      >
        {/* Next Meaningful Step floating tag */}
        {task.isBonus && (
          <div className="absolute -top-3 left-6 px-3 py-1 bg-yellow-500 text-slate-950 text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1.5 animate-bounce" style={{ animationDuration: '3s' }}>
            <Sparkles size={10} fill="currentColor" /> AI BONUS STEP
          </div>
        )}

        {/* Burst Particles */}
        {isBursting && particles.map(p => (
          <div 
            key={p.id}
            className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full pointer-events-none z-30 animate-particle-burst"
            style={{
              backgroundColor: p.color,
              '--tw-translate-x': `${p.x}px`,
              '--tw-translate-y': `${p.y}px`
            } as React.CSSProperties}
          />
        ))}

        <div className="flex justify-between items-start mb-4">
          {(() => {
            const visuals = getCategoryVisuals(task.category);
            const CategoryIcon = visuals.icon;
            return (
              <div className={`p-2.5 rounded-xl border group-hover:scale-110 transition-transform ${task.isBonus ? 'bg-slate-950 border-slate-800 text-yellow-400' : visuals.iconBoxClass}`}>
                {task.isBonus ? <Rocket size={18} className="text-yellow-400 animate-pulse" /> : <CategoryIcon size={18} />}
              </div>
            );
          })()}
          
          <div className="flex items-center gap-2">
            {!task.completed && (
              <>
                {/* Focus Timer Trigger Button */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartGoalTimer(task.id, task.title, task.timeEstimate);
                  }}
                  className={`p-2 rounded-lg border transition-all ${
                    focusedTaskId === task.id && isActive 
                      ? 'bg-orange-655/20 border-orange-500/50 text-orange-400 animate-pulse' 
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-orange-400 hover:border-orange-500/30'
                  }`}
                  title={focusedTaskId === task.id && isActive ? "Pause Focus Timer" : "Start Focus Timer"}
                >
                  {focusedTaskId === task.id && isActive ? <Pause size={14} className="text-orange-400" /> : <Play size={14} />}
                </button>

                <button 
                  onClick={(e) => handleBreakdown(e, task.id, task.title)}
                  className={`p-2 rounded-lg border transition-all ${
                    isBreakingDown === task.id 
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400 animate-pulse' 
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30'
                  }`}
                  title="Nexora Strategy Breakdown"
                  disabled={!!isBreakingDown}
                >
                  <Sparkles size={14} className={isBreakingDown === task.id ? 'animate-spin' : ''} />
                </button>
                <div className="flex flex-col items-end gap-1 select-none">
                  <button 
                    onClick={(e) => handleReminderClick(e, task.id, task.title)}
                    className={`p-2 rounded-lg border transition-all ${
                      reminderSchedules[task.id] 
                        ? 'bg-sky-500/10 border-sky-450 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]' 
                        : reminders.has(task.id) 
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' 
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30'
                    }`}
                    title="Set Neural Reminder (Double tap for custom schedule)"
                  >
                    <Bell 
                      size={14} 
                      className={
                        reminderSchedules[task.id] 
                          ? 'animate-pulse text-sky-400' 
                          : reminders.has(task.id) 
                            ? 'animate-bounce' 
                            : ''
                      } 
                    />
                  </button>
                  {reminderSchedules[task.id] && (
                    <span className="text-[8px] font-mono font-bold text-sky-450 whitespace-nowrap tracking-tight leading-none mt-0.5">
                      {reminderSchedules[task.id].time} {reminderSchedules[task.id].amPm}
                    </span>
                  )}
                </div>
              </>
            )}
            <div className="relative">
               <button 
                 onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
                 className="w-7 h-7 rounded-full border-2 border-slate-800 flex items-center justify-center group-hover:border-indigo-500 transition-colors cursor-pointer"
               >
                  {task.completed ? (
                     <CheckCircle2 className="text-emerald-500" size={20} />
                  ) : (
                     <Circle className="text-transparent" size={20} />
                  )}
               </button>
               {isBursting && (
                 <div className="absolute inset-0 bg-emerald-400 rounded-full blur-md animate-ping opacity-50 pointer-events-none" />
               )}
            </div>
          </div>
        </div>
        
        <h4 
          onClick={() => toggleTask(task.id)}
          className={`font-bold text-sm text-white group-hover:text-indigo-400 transition-colors tracking-tight cursor-pointer ${
            task.completed ? 'line-through text-slate-500 font-medium' : ''
          }`}
        >
          {task.title}
        </h4>
        <div className="mt-3 flex items-center justify-between">
          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${getCategoryVisuals(task.category).badgeClass}`}>
            {task.category}
          </span>
          {task.completed ? null : focusedTaskId === task.id ? (
            <span className="text-[10px] font-mono font-bold text-orange-400 animate-pulse bg-orange-950/40 border border-orange-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 select-none">
              <Timer size={10} className={isActive ? "animate-spin" : ""} style={{ animationDuration: '3s' }} />
              {formatTime(timeLeft)}
            </span>
          ) : (
            <span className="text-[9px] font-mono font-bold text-slate-500">{task.timeEstimate}</span>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default HomeView;
