
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Sparkles, Search, X, 
  Info, Cpu, Zap, Users, TrendingUp, UserPlus, Check, ShieldCheck, ShoppingBag, 
  EyeOff, Filter, ArrowUpRight, Send, ArrowLeft, Camera, Phone, Video as VideoIcon, 
  ImageIcon, UserCheck, Radio, Signal, Users2, Clock, ChevronLeft, 
  Volume2, Play, Globe, ChevronDown, Edit3, Loader2, MapPin, ExternalLink, 
  Pause, Trash2, Link, History, Flag, VolumeX, Download, Grid, MessageSquare, MessageSquareShare, 
  CheckCheck, Mic, MicOff, VideoOff, PhoneOff, User as UserIcon, Smile, AlertCircle, Coffee, Star, BookOpen, Building,
  Facebook, Mail, MessageCircle as WhatsApp, Cloud as Drive, CloudLightning, CheckCircle2, Square,
  Activity, ZapOff, Ghost, Flame, Moon, Sun, Wind, Palette, Brain, Rocket, Lightbulb, HelpCircle, Pin, Calendar, RefreshCw,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Post, AppMode, DirectMessage, Message, MessageStatus, MessageIntent, UserInteraction, UserProfile, SocialSubTab, ActiveSession, PinnedMessageRecord } from '../types';
import { geminiService } from '../services/geminiService';
import { nexoraFirestoreService } from '../services/nexoraFirestoreService';
import { SIGNAL_GROUPS_LIST } from './HomeView';
import { 
  GroupCreationModal, 
  GroupInfoDrawer, 
  GROUP_CONTACTS, 
  Contact 
} from './GroupChatModal';

interface FlyingHeart {
  id: number;
  postId: string;
  left: number;
  size: number;
  duration: number;
  delay: number;
}

interface ExploreViewProps { 
  mode?: AppMode; 
  posts: Post[];
  savedPostIds: Set<string>;
  purchasedPostIds: Set<string>;
  onToggleSave: (postId: string) => void;
  onBuy: (postId: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleFollow?: (creatorName: string) => void;
  onInteraction?: (postId: string, type: UserInteraction['type']) => void;
  onCompleteSession?: () => void;
  activeSession: ActiveSession | null;
  onActiveSessionChange: (session: ActiveSession | null) => void;
  showToast?: (msg: string, type?: 'info' | 'success') => void;
  userProfile?: UserProfile;
  activeSubTab: SocialSubTab;
  setActiveSubTab: (tab: SocialSubTab) => void;
  ghostDMs?: DirectMessage[];
  setGhostDMs?: React.Dispatch<React.SetStateAction<DirectMessage[]>>;
  activeSpaceId?: string;
  joinedGroupIds?: string[];
  setJoinedGroupIds?: React.Dispatch<React.SetStateAction<string[]>>;
  activeSignalGroupId?: string | null;
  setActiveSignalGroupId?: (groupId: string | null) => void;
}

const INTENTS: { id: MessageIntent, icon: any, label: string, color: string }[] = [
  { id: 'inform', icon: Info, label: 'Inform', color: 'text-blue-400' },
  { id: 'joke', icon: Smile, label: 'Joke', color: 'text-yellow-400' },
  { id: 'urgent', icon: AlertCircle, label: 'Urgent', color: 'text-rose-400' },
  { id: 'casual', icon: Coffee, label: 'Casual', color: 'text-emerald-400' },
];

const INITIAL_DMS: DirectMessage[] = [
  {
    id: 'dm-1',
    sender: 'MindsetMastery',
    avatar: 'https://i.pravatar.cc/150?u=mindset',
    lastMessage: 'The Stoic module is ready for review.',
    time: '2m',
    unread: true,
    messages: [
      { id: 'm1', text: 'Hey Alex, how is the project going?', fromMe: false, time: '10:00 AM', status: 'seen' },
      { id: 'm2', text: 'Going great! Just finished the core engine.', fromMe: true, time: '10:05 AM', status: 'seen', intent: 'inform' },
      { id: 'm3', text: 'Excellent. The Stoic module is ready for review.', fromMe: false, time: '10:30 AM', status: 'seen' },
    ]
  },
  {
    id: 'dm-2',
    sender: 'Sarah J.',
    avatar: 'https://i.pravatar.cc/150?u=sarah',
    lastMessage: 'Check out this new React pattern!',
    time: '1h',
    messages: [
      { id: 'm4', text: 'Have you seen the latest Gemini update?', fromMe: false, time: 'Yesterday', status: 'seen' },
      { id: 'm5', text: 'Yes, it is incredible for reasoning.', fromMe: true, time: 'Yesterday', status: 'seen', intent: 'casual' },
      { id: 'm6', text: 'Check out this new React pattern!', fromMe: false, time: '9:00 AM', status: 'seen', intent: 'inform' },
    ]
  }
];

const INITIAL_STORIES = [
  { id: 1, name: 'Neural Sync', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', viewed: false, isAi: true },
  { id: 2, name: 'GrowthLab', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150', viewed: false },
  { id: 3, name: 'Alex M.', avatar: 'https://i.pravatar.cc/150?u=alex', viewed: true },
  { id: 4, name: 'StartupOS', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', viewed: true },
  { id: 5, name: 'DeepWork', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150', viewed: false },
];

const INTEREST_CHIPS = ['All', 'Courses', 'Assets', 'Growth', 'Biohacking', 'SaaS', 'Stoicism'];

const getCourseDetails = (post: any) => {
  const displayTitle = post.courseTitle || post.title || post.content.split('.')[0] || 'Premium Masterclass';
  
  const creatorLower = (post.creator || '').toLowerCase();
  const isCompany = post.courseProviderType === 'company' || 
    creatorLower.includes('academy') || 
    creatorLower.includes('os') || 
    creatorLower.includes('labs') || 
    creatorLower.includes('solutions') || 
    creatorLower.includes('corp') || 
    creatorLower.includes('agency') || 
    creatorLower.includes('school') ||
    creatorLower.includes('inc');
    
  const providerType = post.courseProviderType || (isCompany ? 'company' : 'person');
  const duration = post.courseDuration || '4 Weeks';
  const timeReq = post.courseTimeRequirement || '2.5 hours/week';
  const rating = post.courseRating || (4.5 + ((post.creator || '').length % 5) * 0.1);
  const description = post.courseDescription || post.content;
  
  let syllabus = post.courseSyllabus;
  if (!syllabus) {
    syllabus = [
      'Unit 1: Fundamental Concepts & Setup',
      'Unit 2: Designing Sustainable Workflows',
      'Unit 3: Advanced Optimization & Metrics Scaling',
      'Unit 4: Capstone Execution & Cognitive Assessment'
    ];
    if (post.tags && post.tags.length > 0) {
      const primaryTag = post.tags[0].toUpperCase();
      syllabus = [
        `Module 1: Introduction to ${primaryTag}`,
        `Module 2: Designing Sustainable ${primaryTag} Workflows`,
        `Module 3: Advanced ${primaryTag} Scaling & Neural Optimization`,
        `Module 4: Industry Capstone: Implementing ${primaryTag} in Production`
      ];
    }
  }
  
  return {
    title: displayTitle,
    providerType,
    duration,
    timeReq,
    rating,
    description,
    syllabus,
    price: post.price !== undefined ? post.price : 9.99
  };
};

const getInstructorDetails = (creatorName: string) => {
  const name = creatorName;
  const avatar = `https://i.pravatar.cc/150?u=${encodeURIComponent(creatorName)}`;
  
  let bio = `Expert compiler of neural training modules specializing in cognitive workflow systems and next-generation frameworks.`;
  let expertise = 'Neural Optimization';
  
  const lower = (creatorName || '').toLowerCase();
  if (lower.includes('nexora')) {
    bio = 'The premier educational repository of Nexora Systems. Pioneering multi-agent state authorization mechanisms, semantic index scaling, and generative pipeline models.';
    expertise = 'Core AI & Multi-Agent Systems';
  } else if (lower.includes('mindset') || lower.includes('stoic')) {
    bio = 'Architect of elite psychological frameworks. Combining telemetry assessments with Hellenistic logic protocols to stabilize executive focus vectors.';
    expertise = 'Executive Stoicism & Mental Fortitude';
  } else if (lower.includes('growth')) {
    bio = 'Iterative scaling protocol developer. Formulates high-frequency feedback pipelines, conversion node triggers, and automated telemetry dashboard infrastructure.';
    expertise = 'Conversion Tuning & Velocity Operations';
  } else if (lower.includes('neural')) {
    bio = 'Principal researcher at the Neural Coherence Institute. Modeling real-time neuro-plastic recovery loops, alpha-state induction, and deep focus metrics.';
    expertise = 'Neuro-Analytics & Human Optimization';
  } else if (lower.includes('forge') || lower.includes('bio')) {
    bio = 'Bio-integrative development network. Specialized in cellular restoration routines, circadian realignment pathways, and sensory calibration telemetry.';
    expertise = 'Biotechnic Flow Alignment';
  }
  
  return { name, avatar, bio, expertise };
};

interface ThreadedReply {
  id: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  timestamp: number;
  likes: number;
  hasLiked?: boolean;
  replies?: ThreadedReply[];
}

interface ThreadedDiscussion {
  id: string;
  groupId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  timestamp: number;
  likes: number;
  hasLiked?: boolean;
  replies: ThreadedReply[];
  category: 'Questions' | 'Ideas' | 'Knowledge' | 'Updates' | 'Resources' | 'Discussions';
}

const INITIAL_DISCUSSIONS: ThreadedDiscussion[] = [
  {
    id: 'disc-dw-1',
    groupId: 'deep-work',
    authorName: 'Rahul K.',
    authorAvatar: 'https://i.pravatar.cc/150?u=rahul',
    text: "Has anyone tried running 90-minute focus sprints instead of standard Pomodoro? Finding it takes me at least 20 minutes just to get into the zone, so 25 minutes feels too short.",
    timestamp: Date.now() - 3600000 * 4,
    likes: 42,
    hasLiked: false,
    category: 'Questions',
    replies: [
      {
        id: 'reply-dw-1-1',
        authorName: 'Kira L.',
        authorAvatar: 'https://i.pravatar.cc/150?u=kira',
        text: "Absolutely! Standard Pomodoro is great for shallow/administrative tasks, but deep work requires ultradian cycles (90-120 mins) to align with cognitive wavelengths.",
        timestamp: Date.now() - 3600000 * 3,
        likes: 15,
        hasLiked: false,
        replies: [
          {
            id: 'reply-dw-1-1-1',
            authorName: 'Rahul K.',
            authorAvatar: 'https://i.pravatar.cc/150?u=rahul',
            text: "That makes perfect sense. I will schedule a 90m co-sync session in our group tomorrow morning.",
            timestamp: Date.now() - 3600000 * 2,
            likes: 4,
            hasLiked: false,
            replies: []
          }
        ]
      },
      {
        id: 'reply-dw-1-2',
        authorName: 'Sophia K.',
        authorAvatar: 'https://i.pravatar.cc/150?u=sophia',
        text: "I do this too. Nexora's active focus session lets you customize block length. 90 mins with ambient noise blocked out is legendary.",
        timestamp: Date.now() - 3600000 * 2.5,
        likes: 9,
        hasLiked: false,
        replies: []
      }
    ]
  },
  {
    id: 'disc-sb-1',
    groupId: 'startup-builders',
    authorName: 'Sophia K.',
    authorAvatar: 'https://i.pravatar.cc/150?u=sophia',
    text: "Just shipped our MVP landing page built with React/Vite. The goal is to collect 100 early waitlist signups this week before writing more code. What's the best channels for early user validation?",
    timestamp: Date.now() - 3600000 * 6,
    likes: 58,
    hasLiked: false,
    category: 'Ideas',
    replies: [
      {
        id: 'reply-sb-1-1',
        authorName: 'Rahul K.',
        authorAvatar: 'https://i.pravatar.cc/150?u=rahul',
        text: "Try cold outreach on LinkedIn with extremely specific questions about their pain points. Don't pitch, just learn.",
        timestamp: Date.now() - 3600000 * 5,
        likes: 21,
        hasLiked: false,
        replies: [
          {
            id: 'reply-sb-1-1-1',
            authorName: 'Sophia K.',
            authorAvatar: 'https://i.pravatar.cc/150?u=sophia',
            text: "Cold outreach has always felt salesy, but asking about pain points sounds much better. Will draft some questions.",
            timestamp: Date.now() - 3600000 * 4,
            likes: 7,
            hasLiked: false,
            replies: []
          }
        ]
      },
      {
        id: 'reply-sb-1-2',
        authorName: 'Marcus T.',
        authorAvatar: 'https://i.pravatar.cc/150?u=marcus_t',
        text: "Submit to directory lists and product hunt ship page. It takes 10 mins and gives solid initial SEO.",
        timestamp: Date.now() - 3600000 * 4.5,
        likes: 12,
        hasLiked: false,
        replies: []
      }
    ]
  },
  {
    id: 'disc-gc-1',
    groupId: 'growth-circle',
    authorName: 'Kira L.',
    authorAvatar: 'https://i.pravatar.cc/150?u=kira',
    text: "How do you organize your second brain? I've been experimenting with building a semantic graph, but it gets cluttered easily.",
    timestamp: Date.now() - 3600000 * 8,
    likes: 35,
    hasLiked: false,
    category: 'Knowledge',
    replies: [
      {
        id: 'reply-gc-1-1',
        authorName: 'Elena R.',
        authorAvatar: 'https://i.pravatar.cc/150?u=elena_r',
        text: "I use a flat structure with strong tagging instead of nested folders. The tags represent functional domains like #builder, #biohacking, etc.",
        timestamp: Date.now() - 3600000 * 7,
        likes: 14,
        hasLiked: false,
        replies: [
          {
            id: 'reply-gc-1-1-1',
            authorName: 'Kira L.',
            authorAvatar: 'https://i.pravatar.cc/150?u=kira',
            text: "Flat tags sound super clean. What app do you use to sync them?",
            timestamp: Date.now() - 3600000 * 6,
            likes: 3,
            hasLiked: false,
            replies: []
          }
        ]
      }
    ]
  }
];

const ExploreView: React.FC<ExploreViewProps> = ({ 
  mode = AppMode.NORMAL, 
  posts, 
  savedPostIds, 
  purchasedPostIds, 
  onToggleSave, 
  onBuy, 
  onToggleLike,
  onToggleFollow,
  onInteraction, 
  onCompleteSession,
  activeSession,
  onActiveSessionChange,
  showToast, 
  userProfile,
  activeSubTab,
  setActiveSubTab,
  ghostDMs,
  setGhostDMs,
  activeSpaceId = 'business',
  joinedGroupIds = [],
  setJoinedGroupIds,
  activeSignalGroupId = null,
  setActiveSignalGroupId
}) => {
  const [viewMode, setViewMode] = useState<'feed' | 'messages' | 'channel-profile'>('feed');
  const activeSenderId = userProfile?.userId || userProfile?.username || 'alex_m.synapse';
  
  const [activeDiscussionId, setActiveDiscussionId] = useState<string | null>(null);
  const [discussions, setDiscussions] = useState<ThreadedDiscussion[]>(INITIAL_DISCUSSIONS);

  // Subscribe to Firestore discussions in non-Ghost mode
  useEffect(() => {
    if (mode === AppMode.GHOST || !userProfile?.userId) return;
    const unsub = nexoraFirestoreService.subscribeDiscussions(
      (records) => {
        setDiscussions((prev) => {
          const prevMap = new Map(prev.map((d) => [d.id, d]));
          const mapped: ThreadedDiscussion[] = records.map((r) => {
            const existing = prevMap.get(r.id);
            const tsVal = r.createdAt?.toMillis
              ? r.createdAt.toMillis()
              : (typeof r.createdAt === 'number' ? r.createdAt : Date.now());
            return {
              id: r.id,
              groupId: r.groupId,
              authorName: r.authorName,
              authorAvatar: r.authorAvatar || `https://i.pravatar.cc/150?u=${r.authorId}`,
              text: r.content,
              timestamp: tsVal,
              likes: r.upvotes ?? existing?.likes ?? 0,
              hasLiked: existing?.hasLiked ?? false,
              replies: existing?.replies || [],
              category: (r.category as any) || 'Discussions'
            };
          });
          const seenIds = new Set(mapped.map((m) => m.id));
          return [...mapped, ...INITIAL_DISCUSSIONS.filter((d) => !seenIds.has(d.id))];
        });
      },
      () => {}
    );
    return () => unsub();
  }, [mode, userProfile?.userId]);

  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyingToAuthor, setReplyingToAuthor] = useState<string | null>(null);
  const [newDiscussionText, setNewDiscussionText] = useState('');
  const [newDiscussionCategory, setNewDiscussionCategory] = useState<'Questions' | 'Ideas' | 'Knowledge' | 'Updates' | 'Resources' | 'Discussions'>('Discussions');
  const [newReplyText, setNewReplyText] = useState('');
  const [discussionFilter, setDiscussionFilter] = useState<'All' | 'Questions' | 'Ideas' | 'Knowledge' | 'Updates' | 'Resources' | 'Discussions'>('All');
  const [qualityOnlyFilter, setQualityOnlyFilter] = useState<boolean>(false);

  const findAndModifyReply = useCallback((
    replies: ThreadedReply[],
    replyId: string,
    modifier: (reply: ThreadedReply) => ThreadedReply
  ): ThreadedReply[] => {
    return replies.map(r => {
      if (r.id === replyId) {
        return modifier(r);
      }
      if (r.replies && r.replies.length > 0) {
        return {
          ...r,
          replies: findAndModifyReply(r.replies, replyId, modifier)
        };
      }
      return r;
    });
  }, []);

  // Discussion Rank Algorithm
  const getDiscussionRankScore = useCallback((disc: ThreadedDiscussion) => {
    let score = 0;
    
    // 1. Engagement (but balanced)
    const likesCount = disc.likes || 0;
    const repliesCount = disc.replies?.length || 0;
    score += likesCount * 1.5;
    score += repliesCount * 2.5;

    // 2. Recency (Recent activity)
    const hoursAgo = (Date.now() - disc.timestamp) / (1000 * 60 * 60);
    const recencyBoost = Math.max(0, 50 - hoursAgo * 2);
    score += recencyBoost;

    // 3. AI Quality Signals (helpful details, constructive length)
    const wordCount = disc.text.split(/\s+/).length;
    if (wordCount > 30) {
      score += 15;
    }
    if (wordCount > 10) {
      score += 10;
    }

    // 4. Community Value & Relevance
    const userInterests = userProfile?.interests || [];
    const lowercaseText = disc.text.toLowerCase();
    userInterests.forEach(interest => {
      if (lowercaseText.includes(interest.toLowerCase())) {
        score += 20;
      }
    });

    if (disc.category === 'Knowledge' || disc.category === 'Resources') {
      score += 15;
    }

    return score;
  }, [userProfile]);

  const handleLikeDiscussion = useCallback((discussionId: string) => {
    let delta: 1 | -1 = 1;
    setDiscussions(prev => prev.map(d => {
      if (d.id === discussionId) {
        const hasLiked = !d.hasLiked;
        delta = hasLiked ? 1 : -1;
        return {
          ...d,
          hasLiked,
          likes: d.likes + delta
        };
      }
      return d;
    }));
    if (mode !== AppMode.GHOST && userProfile?.userId && !discussionId.startsWith('disc-dw-') && !discussionId.startsWith('disc-sb-') && !discussionId.startsWith('disc-gc-')) {
      nexoraFirestoreService.toggleDiscussionUpvote(discussionId, delta).catch(() => {});
    }
  }, [mode, userProfile?.userId]);

  const handleLikeReply = useCallback((discussionId: string, replyId: string) => {
    setDiscussions(prev => prev.map(d => {
      if (d.id === discussionId) {
        return {
          ...d,
          replies: findAndModifyReply(d.replies, replyId, r => {
            const hasLiked = !r.hasLiked;
            return {
              ...r,
              hasLiked,
              likes: r.likes + (hasLiked ? 1 : -1)
            };
          })
        };
      }
      return d;
    }));
  }, [findAndModifyReply]);

  const handlePostDiscussion = useCallback(() => {
    if (!newDiscussionText.trim() || !activeSignalGroupId) return;

    const discId = `disc_${Date.now()}`;
    const newDisc: ThreadedDiscussion = {
      id: discId,
      groupId: activeSignalGroupId,
      authorName: userProfile?.name || 'You',
      authorAvatar: userProfile?.avatar || 'https://i.pravatar.cc/150?u=you',
      text: newDiscussionText,
      timestamp: Date.now(),
      likes: 0,
      hasLiked: false,
      replies: [],
      category: newDiscussionCategory
    };

    setDiscussions(prev => [newDisc, ...prev]);
    const textCopy = newDiscussionText;
    setNewDiscussionText('');

    if (mode !== AppMode.GHOST && userProfile?.userId) {
      nexoraFirestoreService.createDiscussion(userProfile.userId, {
        id: discId,
        groupId: activeSignalGroupId,
        authorName: userProfile?.name || 'You',
        authorAvatar: userProfile?.avatar,
        title: textCopy.slice(0, 120),
        content: textCopy,
        category: newDiscussionCategory,
        upvotes: 0,
        repliesCount: 0
      }).catch(err => console.warn('Failed saving discussion to Firestore:', err));
    }

    if (showToast) showToast('Discussion posted! Neural chain synchronizing...', 'success');
  }, [newDiscussionText, activeSignalGroupId, newDiscussionCategory, userProfile, mode, showToast]);

  const handlePostReply = useCallback((discussionId: string) => {
    if (!newReplyText.trim()) return;

    const newReply: ThreadedReply = {
      id: `reply-user-${Date.now()}`,
      authorName: userProfile?.name || 'You',
      authorAvatar: userProfile?.avatar || 'https://i.pravatar.cc/150?u=you',
      text: newReplyText,
      timestamp: Date.now(),
      likes: 0,
      hasLiked: false,
      replies: []
    };

    setDiscussions(prev => prev.map(d => {
      if (d.id === discussionId) {
        if (replyingToId) {
          // Add nested/threaded reply
          return {
            ...d,
            replies: findAndModifyReply(d.replies, replyingToId, r => {
              return {
                ...r,
                replies: [...(r.replies || []), newReply]
              };
            })
          };
        } else {
          // Add top-level reply
          return {
            ...d,
            replies: [...d.replies, newReply]
          };
        }
      }
      return d;
    }));

    setNewReplyText('');
    setReplyingToId(null);
    setReplyingToAuthor(null);
    if (showToast) showToast('Reply synchronized with secure thread!', 'success');
  }, [newReplyText, replyingToId, findAndModifyReply, userProfile, showToast]);
  
  // Space specific search history terms
  const searchHistory = useMemo(() => {
    if (activeSpaceId === 'business') return ['Autonomous agents', 'Stripe API integration', 'latency optimization'];
    if (activeSpaceId === 'study') return ['Neuroscience of focus', 'Stoicism journal', 'React concurrent mode'];
    if (activeSpaceId === 'gaming') return ['Cyberpunk UI', 'physics engines', 'metaverse latency'];
    if (activeSpaceId === 'personal') return ['Daily mindfulness', 'wellness check', 'healthy habits'];
    return ['General focus', 'Nexora protocols', 'Active node synchronization'];
  }, [activeSpaceId]);

  const [activeTab, setActiveTab] = useState<'For You' | 'Following'>('For You');
  const [activeChip, setActiveChip] = useState('All');
  const [followingSearch, setFollowingSearch] = useState('');
  const [followedCreators, setFollowedCreators] = useState([
    {
      id: 'c-2',
      name: 'MindsetMastery',
      avatar: 'https://i.pravatar.cc/150?u=mindset',
      status: '🟢 DEEP WORK: Mastering Stoic Leadership Intensive',
      timeLeft: 'Active now',
      syncScore: 95,
      streak: 42,
      isLive: true,
      category: 'Stoicism & Growth',
      recentPostId: '1',
      xpShared: 850
    },
    {
      id: 'c-3',
      name: 'GrowthOS',
      avatar: 'https://i.pravatar.cc/150?u=growthos',
      status: '🟢 REFLEX PROTOCOL: Monitoring Habit telemetry',
      timeLeft: 'Active now',
      syncScore: 91,
      streak: 15,
      isLive: true,
      category: 'Biohacking & Habits',
      recentPostId: 'course-2',
      xpShared: 310
    },
    {
      id: 'c-4',
      name: 'Nexora Academy',
      avatar: 'https://i.pravatar.cc/150?u=nexacademy',
      status: '💤 BUFFER ACTIVE: Neural Refresh Mode',
      timeLeft: 'Idle for 1h',
      syncScore: 88,
      streak: 9,
      isLive: false,
      category: 'AI & Development',
      recentPostId: 'course-1',
      xpShared: 150
    },
  ]);

  // Similar Minds Candidates Pool
  const SIMILAR_MINDS_POOL = useMemo(() => [
    { id: 'kira', name: 'Kira L.', avatar: 'https://i.pravatar.cc/150?u=kira', matchPercent: 89, tags: ['Builder', 'Focused', 'Startup'], bio: 'Daily focus sessions and architecture', interests: ['Neural Architecture', 'Biohacking', 'AI Ethics'] },
    { id: 'rahul', name: 'Rahul K.', avatar: 'https://i.pravatar.cc/150?u=rahul', matchPercent: 84, tags: ['AI', 'Deep Work', 'Learning'], bio: 'AI optimization and deep flow', interests: ['Quantum Computing', 'Advanced Coding', 'Web3'] },
    { id: 'sophia', name: 'Sophia K.', avatar: 'https://i.pravatar.cc/150?u=sophia', matchPercent: 92, tags: ['Coding', 'Startup', 'Deep Work'], bio: 'Full stack architecture and growth', interests: ['SaaS Entrepreneurship', 'Venture Capital', 'Digital Nomadism'] },
    { id: 'marcus_t', name: 'Marcus T.', avatar: 'https://i.pravatar.cc/150?u=marcus_t', matchPercent: 78, tags: ['JEE', 'Productivity', 'Builder'], bio: 'High leverage study routine', interests: ['Stoic Philosophy', 'Financial Freedom', 'Deep Work'] },
    { id: 'elena_r', name: 'Elena R.', avatar: 'https://i.pravatar.cc/150?u=elena_r', matchPercent: 86, tags: ['Fitness', 'Deep Work', 'Productivity'], bio: 'Biohacking and focus optimization', interests: ['Biohacking', 'Human Longevity', 'Growth Marketing'] },
  ], []);

  const getRecommendationReasonsForExplore = (name: string): string[] => {
    const list: string[] = [];
    const nameLower = name.toLowerCase();
    if (nameLower.includes('zen') || nameLower.includes('mindset')) {
      list.push("Alphasync: Common learning topics in Stoicism & Mindset");
      list.push("Joined synchronized focus in Deep Work Warriors");
      list.push("Complementary focus behavior: Daily morning calibration blocks");
    } else if (nameLower.includes('bio') || nameLower.includes('growth')) {
      list.push("Alphasync: Common learning topics in Biohacking");
      list.push("Joined synchronized focus in Growth Circle");
      list.push("Complementary focus behavior: Coherent diaphragmatic breathing");
    } else if (nameLower.includes('academy') || nameLower.includes('nexora')) {
      list.push("Alphasync: Master-level alignment in AI Development");
      list.push("Joined synchronized focus in Startup Builders");
      list.push("Complementary focus behavior: Continuous remote building blocks");
    } else if (nameLower.includes('kira')) {
      list.push("Alphasync: Shared interests in AI Ethics & Coding");
      list.push("Joined synchronized focus in Deep Work Warriors & Startup Builders");
      list.push("Complementary focus behavior: High HRV alignment sessions");
    } else if (nameLower.includes('rahul')) {
      list.push("Alphasync: Aligned cognitive intensity in Deep Work");
      list.push("Joined synchronized focus in Deep Work Warriors");
      list.push("Complementary focus behavior: Late night concentration sprints");
    } else if (nameLower.includes('sophia')) {
      list.push("Alphasync: Targeted interest overlap in Advanced Coding & SaaS");
      list.push("Joined synchronized focus in Startup Builders");
      list.push("Complementary focus behavior: Midnight building sprints");
    } else if (nameLower.includes('marcus')) {
      list.push("Alphasync: Common learning topics in Stoic Philosophy");
      list.push("Joined synchronized focus in Startup Builders");
      list.push("Complementary focus behavior: Afternoon reading blocks");
    } else if (nameLower.includes('elena')) {
      list.push("Alphasync: Shared interests in Sleep Science & Productivity");
      list.push("Joined synchronized focus in Growth Circle & Deep Work Warriors");
      list.push("Complementary focus behavior: Morning focus alignments");
    } else {
      list.push("Aligned neural-cognitive bandwidth thresholds (>85% matching indices)");
      list.push("Active in community streams with similar knowledge vectors");
    }
    return list;
  };

  const [showExploreFollowModal, setShowExploreFollowModal] = useState(false);
  const [exploreFollowedUser, setExploreFollowedUser] = useState<any>(null);

  const [suggestedCreators, setSuggestedCreators] = useState([
    {
      id: 's-1',
      name: 'ZenDaily',
      avatar: 'https://i.pravatar.cc/150?u=zen',
      status: '⚡ COHERENT MIND: Daily Diaphragmatic Breathwork',
      timeLeft: 'Starts in 5m',
      syncScore: 84,
      streak: 31,
      isLive: true,
      category: 'Mindfulness'
    },
    {
      id: 's-2',
      name: 'BioForge',
      avatar: 'https://i.pravatar.cc/150?u=bioforge',
      status: '💤 SLEEP SIGNAL: Sleep Bio-Syncing',
      timeLeft: 'Offline',
      syncScore: 78,
      streak: 18,
      isLive: false,
      category: 'Biohacking'
    }
  ]);
  // Humanized Behavioral System
  const getHumanizedMessage = (type: 'focus-complete' | 'break-start' | 'break-nudge' | 'greeting' | 'social') => {
    const hour = new Date().getHours();
    const isNewUser = !userProfile?.name || (userProfile?.sessionsCompleted === 0 && userProfile?.streak === 0);
    
    if (type === 'greeting') {
      if (isNewUser) return "Start your first focus session";
      if (hour >= 5 && hour < 12) return "Start simple or plan your day?";
      if (hour >= 18 || hour < 5) return "You did enough. Reflect or rest?";
      return "Continue or take a short reset?";
    }

    const messages = {
      'focus-complete': [
        "Nice work. You showed up today.",
        "Good consistency. Keep building.",
        "That was solid. Continue or rest?",
        "You didn't quit. That matters."
      ],
      'break-start': [
        "Stretch for a minute or relax?",
        "Drink water or just breathe?",
        "Take a moment. You earned it.",
        "Neural reboot: just exist for a bit."
      ],
      'break-nudge': [
        "Ready to return or extend break?",
        "Feeling refreshed? No rush.",
        "Neural baseline reset. Ready?"
      ],
      'social': [
        "You kept up with the group. Nice.",
        "Sync complete. Solidarity in focus.",
        "You stayed till the end. Strong."
      ]
    };

    const pool = messages[type] || ["Balanced focus achieved."];
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const [activeFlyingHearts, setActiveFlyingHearts] = useState<FlyingHeart[]>([]);

  const [sessionStats, setSessionStats] = useState<{
    completed: number;
    leftEarly: number;
  }>({ completed: 0, leftEarly: 0 });

  const [isFocusDroppedInReal, setIsFocusDroppedInReal] = useState<boolean>(false);

  const setFocusDropped = (val: boolean) => {
    setIsFocusDroppedInReal(val);
  };

  useEffect(() => {
    if (!activeSession || activeSession.type !== 'focus' || activeSession.timeLeft <= 0) return;

    const handleWindowBlur = () => {
      // Document is genuinely blurred/lost focus while we have an active focus session!
      if (document.activeElement === document.body || !document.hasFocus()) {
        setFocusDropped(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setFocusDropped(true);
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeSession]);

  // Reactions state (keep local for visual flair)
  const [activeReactions, setActiveReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSignalAction = (choice: string) => {
    switch (choice) {
      case 'Join Sync':
        setFocusDropped(false);
        const participants = 3 + Math.floor(Math.random() * 5);
        onActiveSessionChange({ 
          type: 'focus', 
          timeLeft: 600, 
          participants, 
          totalTime: 600,
          joinedAt: Date.now(),
          isSyncSession: true
        });
        setSessionStats({ completed: 0, leftEarly: 0 });
        if (showToast) showToast(`You joined ${participants} others. Stay focused.`, "success");
        if (onInteraction) onInteraction('signal-join-sync', 'view'); // XP gain for joining
        break;
      case 'Next Task':
        setFocusDropped(false);
        onActiveSessionChange({ type: 'focus', timeLeft: 1500, participants: 1, totalTime: 1500, joinedAt: Date.now() });
        if (showToast) showToast("Neural Focus: Next Task Engaged", "success");
        if (onInteraction) onInteraction('signal-next-task', 'view');
        break;
      case 'Break':
        setFocusDropped(false);
        onActiveSessionChange({ type: 'break', timeLeft: 300, participants: Math.floor(Math.random() * 50) + 10, totalTime: 300, joinedAt: Date.now() });
        const breakSuggestion = getHumanizedMessage('break-start');
        if (showToast) showToast(breakSuggestion, "info");
        if (onInteraction) onInteraction('signal-break', 'view');
        break;
      case 'Resume':
        setFocusDropped(false);
        onActiveSessionChange({ type: 'focus', timeLeft: 1200, participants: Math.floor(Math.random() * 10), totalTime: 1200, joinedAt: Date.now() });
        if (showToast) showToast("Resuming Neural Sequence", "info");
        if (onInteraction) onInteraction('signal-resume', 'view');
        break;
      case 'Ignore':
      case 'Reset':
        if (activeSession && activeSession.type === 'focus' && activeSession.timeLeft > 0) {
          setFocusDropped(true);
        }
        onActiveSessionChange(null);
        if (showToast) showToast(choice === 'Reset' ? "Focus Session Reset" : "Signal Dismissed", "info");
        break;
      case 'Continue':
        setFocusDropped(false);
        onActiveSessionChange({ 
          type: 'focus', 
          timeLeft: activeSession?.totalTime || 1500, 
          participants: 1, 
          totalTime: activeSession?.totalTime || 1500,
          joinedAt: Date.now()
        });
        if (showToast) showToast("Continuing Neural Focus", "success");
        if (onInteraction) onInteraction('signal-continue', 'view');
        break;
      case 'Exit':
        if (activeSession && activeSession.type === 'focus' && activeSession.timeLeft > 0) {
          setFocusDropped(true);
        }
        onActiveSessionChange(null);
        if (showToast) showToast("Exiting Focus Session", "info");
        break;
      default:
        if (showToast) showToast(`${choice} confirmed. Action deployed.`, "success");
    }
  };

  const [isAiFilteringEnabled, setIsAiFilteringEnabled] = useState(true);
  const [expandedReasonId, setExpandedReasonId] = useState<string | null>(null);
  const [activeSharePost, setActiveSharePost] = useState<Post | any | null>(null);
  const [activePostMenuId, setActivePostMenuId] = useState<string | null>(null);
  
  const [conversations, setConversations] = useState<DirectMessage[]>(INITIAL_DMS);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/conversations');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setConversations(data);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations from database:', err);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 3000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const isGhost = mode === AppMode.GHOST;
  // Effective conversations based on mode
  const currentConversations = isGhost ? (ghostDMs || []) : conversations;
  const setCurrentConversations = (newConvs: React.SetStateAction<DirectMessage[]>) => {
    if (isGhost && setGhostDMs) {
      setGhostDMs(newConvs);
    } else {
      setConversations(newConvs);
    }
  };

  useEffect(() => {
    if (isGhost && ghostDMs && ghostDMs.length === 0 && setGhostDMs) {
      setGhostDMs([
        {
          id: 'ghost-dm-sys',
          sender: 'Neural Ghost',
          avatar: 'https://i.pravatar.cc/150?u=ghostnode',
          lastMessage: 'Session isolated. No data persisted.',
          time: 'now',
          messages: [{ id: 'gm1', text: 'This conversation is isolated to your current Ghost session. It will be purged upon exit.', fromMe: false, time: 'now', status: 'seen' }]
        }
      ]);
    }
  }, [isGhost, ghostDMs?.length, setGhostDMs]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  
  // Group Chat specific states
  const [isGroupCreateOpen, setIsGroupCreateOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [isJoinGroupOpen, setIsJoinGroupOpen] = useState(false);
  const [joinInviteCode, setJoinInviteCode] = useState('');
  
  const [chatCustomizations, setChatCustomizations] = useState<Record<string, {
    muted?: boolean;
    notificationsSilent?: boolean;
    accentColor?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'purple' | 'cyan';
    aiPersonality?: 'balanced' | 'stoic' | 'hyper-casual' | 'visionary';
  }>>({});
  const [mediaViewerUrl, setMediaViewerUrl] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [selectedCoursePost, setSelectedCoursePost] = useState<Post | null>(null);
  const [selectedInstructorName, setSelectedInstructorName] = useState<string | null>(null);

  const playLocalSynth = (type: 'tap' | 'success' | 'delete' | 'toggle') => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      if (type === 'tap') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'toggle') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.setValueAtTime(400, now + 0.05);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554, now + 0.06);
        osc.frequency.setValueAtTime(659, now + 0.125);
        osc.frequency.setValueAtTime(880, now + 0.187);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'delete') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {
      // Ignored
    }
  };

  const handleSendFocusComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!focusCommentInput.trim()) return;
    
    const newComment = {
      id: `user-${Date.now()}`,
      authorName: 'You',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
      type: selectedCommentType,
      text: focusCommentInput.trim(),
      timestamp: Date.now()
    };
    
    setFocusComments(prev => [newComment, ...prev]);
    setFocusCommentInput('');
    playLocalSynth('success');
    
    if (showToast) {
      const typeLabels = {
        comment: 'Comment posted',
        talk: 'Shared talking point',
        idea: 'Idea broadcasted 💡',
        ask: 'Question asked ❓'
      };
      showToast(typeLabels[selectedCommentType], 'success');
    }
  };

  const handleSendPresetComment = (text: string, type: 'comment' | 'talk' | 'idea' | 'ask') => {
    const newComment = {
      id: `user-${Date.now()}`,
      authorName: 'You',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
      type,
      text: text,
      timestamp: Date.now()
    };
    
    setFocusComments(prev => [newComment, ...prev]);
    playLocalSynth('success');
    
    if (showToast) {
      const typeLabels = {
        comment: 'Comment posted',
        talk: 'Shared talking point',
        idea: 'Idea broadcasted 💡',
        ask: 'Question asked ❓'
      };
      showToast(typeLabels[type], 'success');
    }
  };

  const [selectedChannel, setSelectedChannel] = useState<{name: string, avatar: string} | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [selectedIntent, setSelectedIntent] = useState<MessageIntent | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  // Live Signal States
  const [livePulse, setLivePulse] = useState(7);
  const [socialEvents, setSocialEvents] = useState<{id: string, text: string, type: 'join' | 'complete' | 'state'}[]>([
    { id: 'ev1', text: 'Aryan entered focus', type: 'join' },
    { id: 'ev2', text: '3 people are still locked in', type: 'state' }
  ]);

  // Focus Session Comments State
  const [selectedCommentType, setSelectedCommentType] = useState<'comment' | 'talk' | 'idea' | 'ask'>('comment');
  const [focusCommentInput, setFocusCommentInput] = useState('');
  const [focusComments, setFocusComments] = useState<{
    id: string;
    authorName: string;
    authorAvatar: string;
    type: 'comment' | 'talk' | 'idea' | 'ask';
    text: string;
    timestamp: number;
  }[]>([
    {
      id: 'fc-1',
      authorName: 'Aryan',
      authorAvatar: 'https://i.pravatar.cc/50?u=aryan',
      type: 'talk',
      text: "Entering deep focus session. Let's finish the sprint!",
      timestamp: Date.now() - 120000
    },
    {
      id: 'fc-2',
      authorName: 'Kabir',
      authorAvatar: 'https://i.pravatar.cc/50?u=kabir',
      type: 'idea',
      text: 'Using the high-leverage 50-10 focus strategy today 💡',
      timestamp: Date.now() - 60000
    },
    {
      id: 'fc-3',
      authorName: 'Zoya',
      authorAvatar: 'https://i.pravatar.cc/50?u=zoya',
      type: 'ask',
      text: 'What music are you guys listening to while building?',
      timestamp: Date.now() - 10000
    }
  ]);

  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      const names = ['Ishaan', 'Meera', 'Rohan', 'Kabir', 'Zoya'];
      const avatars = [
        'https://i.pravatar.cc/50?u=ishaan',
        'https://i.pravatar.cc/50?u=meera',
        'https://i.pravatar.cc/50?u=rohan',
        'https://i.pravatar.cc/50?u=kabir',
        'https://i.pravatar.cc/50?u=zoya'
      ];
      const items: { type: 'comment' | 'talk' | 'idea' | 'ask'; texts: string[] }[] = [
        { type: 'comment', texts: ['Flow state activated 🌊', 'Zero distractions today!', 'Time to build.'] },
        { type: 'talk', texts: ['Listening to deep ambient synths', 'We got this guys!', 'Session is passing so fast'] },
        { type: 'idea', texts: ['Try blocking social apps during sessions', 'Take a 2 min stretch every 30 mins', 'A quiet room doubles output'] },
        { type: 'ask', texts: ['What are you guys building today?', 'Anyone using the multi-sensory track?', 'How many hours of focus today?'] }
      ];
      
      const randomItem = items[Math.floor(Math.random() * items.length)];
      const idx = Math.floor(Math.random() * names.length);
      const newComment = {
        id: `sim-${Date.now()}`,
        authorName: names[idx],
        authorAvatar: avatars[idx],
        type: randomItem.type,
        text: randomItem.texts[Math.floor(Math.random() * randomItem.texts.length)],
        timestamp: Date.now()
      };
      setFocusComments(prev => [newComment, ...prev]);
    }, 15000);

    return () => clearInterval(interval);
  }, [activeSession]);

  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setLivePulse(prev => Math.max(2, prev + (Math.random() > 0.5 ? 1 : -1)));
    }, 5000);

    const eventInterval = setInterval(() => {
      const names = ['Kabir', 'Zoya', 'Ishaan', 'Meera', 'Rohan'];
      const actions = [
        'is staying locked',
        'reached flow state',
        'completed 45m',
        'synced with your circle'
      ];
      const newEvent = {
        id: Date.now().toString(),
        text: `${names[Math.floor(Math.random() * names.length)]} ${actions[Math.floor(Math.random() * actions.length)]}`,
        type: (['join', 'complete', 'state'] as const)[Math.floor(Math.random() * 3)]
      };
      setSocialEvents(prev => [newEvent, ...prev.slice(0, 2)]);
    }, 12000);

    return () => {
      clearInterval(pulseInterval);
      clearInterval(eventInterval);
    };
  }, []);

  useEffect(() => {
    if (activeSignalGroupId && activeSession && scrollContainerRef.current) {
      setTimeout(() => {
        const el = document.getElementById('active-discussion-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 400);
    }
  }, [activeSignalGroupId, activeSession]);

  const [personalizedPosts, setPersonalizedPosts] = useState<Post[]>([]);
  const [isPersonalizing, setIsPersonalizing] = useState(false);

  const xpProgress = useMemo(() => {
    if (!userProfile) return 0;
    const currentLevelXp = (userProfile.level - 1) * (userProfile.level - 1) * 100;
    const nextLevelXp = userProfile.level * userProfile.level * 100;
    const progress = ((userProfile.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
    return Math.min(100, Math.max(0, progress));
  }, [userProfile]);

  // Advanced Chat States
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);
  const [isCalling, setIsCalling] = useState<'voice' | 'video' | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const longPressTimer = useRef<number | null>(null);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [showMap, setShowMap] = useState(false);
  const [mapResults, setMapResults] = useState<any[]>([]);
  const [isMapLoading, setIsMapLoading] = useState(false);

  // 🧠 Save to AI Brain & Semantic Storage States
  const [savedBrainMessageIds, setSavedBrainMessageIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/chat/savedBrainMessages')
      .then(res => res.json())
      .then(data => {
        if (data.savedMessages) {
          setSavedBrainMessageIds(new Set(data.savedMessages.map((m: any) => m.messageId || m.id)));
        }
      })
      .catch(err => console.warn('Saved brain messages fetch error:', err));
  }, []);

  const handleToggleSaveToBrain = async (m: Message) => {
    if (!selectedChatId) return;
    const selectedChat = conversations.find(c => c.id === selectedChatId);
    const isSaved = savedBrainMessageIds.has(m.id) || m.isSavedToBrain;

    if (isSaved) {
      setSavedBrainMessageIds(prev => {
        const next = new Set(prev);
        next.delete(m.id);
        return next;
      });
      setConversations(prev => prev.map(c => c.id === selectedChatId ? {
        ...c,
        messages: c.messages.map(msg => msg.id === m.id ? { ...msg, isSavedToBrain: false } : msg)
      } : c));

      try {
        await fetch('/api/chat/unsaveFromBrain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId: m.id, chatId: selectedChatId })
        });
        if (showToast) showToast('Removed from AI Brain', 'info');
        playLocalSynth('delete');
      } catch (e) {
        console.error('Failed to unsave from brain:', e);
      }
    } else {
      setSavedBrainMessageIds(prev => new Set(prev).add(m.id));
      setConversations(prev => prev.map(c => c.id === selectedChatId ? {
        ...c,
        messages: c.messages.map(msg => msg.id === m.id ? { ...msg, isSavedToBrain: true } : msg)
      } : c));

      try {
        await fetch('/api/chat/saveToBrain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: m.id,
            chatId: selectedChatId,
            senderId: m.senderId || activeSenderId,
            senderName: m.senderName || (m.fromMe ? (userProfile?.name || 'You') : selectedChat?.sender),
            text: m.text || '',
            attachments: {
              image: m.image,
              videoUrl: m.videoUrl,
              documentName: m.documentName,
              audioUrl: m.audioUrl
            },
            timestamp: m.time,
            sourceConversation: selectedChat?.sender || 'Direct Transmission'
          })
        });
        if (showToast) showToast('Saved to AI Brain • Semantic Vector Indexed 🧠', 'success');
        playLocalSynth('success');
      } catch (e) {
        console.error('Failed to save to brain:', e);
      }
    }
  };

  // 🔍 Semantic Search States
  const [isSemanticSearchOpen, setIsSemanticSearchOpen] = useState(false);
  const [semanticQuery, setSemanticQuery] = useState('');
  const [semanticResults, setSemanticResults] = useState<any[]>([]);
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);
  const [semanticFilters, setSemanticFilters] = useState<{
    type: 'all' | 'dm' | 'group';
    mediaType: 'all' | 'text' | 'image' | 'video' | 'document' | 'audio';
    dateRange: 'all' | 'today' | '7days' | '30days';
  }>({ type: 'all', mediaType: 'all', dateRange: 'all' });

  const handleExecuteSemanticSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!semanticQuery.trim()) return;

    setIsSearchingSemantic(true);
    try {
      const res = await fetch('/api/chat/semanticSearch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: semanticQuery.trim(),
          chatId: selectedChatId || undefined,
          ...semanticFilters
        })
      });
      const data = await res.json();
      setSemanticResults(data.results || []);
    } catch (err) {
      console.error('Semantic search error:', err);
      if (showToast) showToast('Semantic search offline mode activated', 'info');
      const q = semanticQuery.toLowerCase();
      const localMatches: any[] = [];
      conversations.forEach(c => {
        (c.messages || []).forEach(m => {
          if (m.text && m.text.toLowerCase().includes(q)) {
            localMatches.push({
              message: m,
              chatId: c.id,
              conversationName: c.sender,
              conversationAvatar: c.avatar,
              similarity: 0.85,
              matchScore: 85
            });
          }
        });
      });
      setSemanticResults(localMatches);
    } finally {
      setIsSearchingSemantic(false);
    }
  };

  // ⚡ Offline Message Queue States
  const [offlineQueue, setOfflineQueue] = useState<Array<{ id: string; chatId: string; message: Message }>>([]);

  const processOfflineQueue = useCallback(async () => {
    if (!navigator.onLine || offlineQueue.length === 0) return;
    const itemsToSync = [...offlineQueue];
    let synced = 0;

    for (const item of itemsToSync) {
      try {
        const res = await fetch('/api/chat/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId: item.chatId, message: { ...item.message, status: 'sent' } })
        });
        if (res.ok) {
          synced++;
          setConversations(prev => prev.map(c => c.id === item.chatId ? {
            ...c,
            messages: c.messages.map(m => m.id === item.id ? { ...m, status: 'sent' as MessageStatus } : m)
          } : c));
        }
      } catch (err) {
        console.warn('Offline queue item sync error:', err);
      }
    }

    if (synced > 0) {
      setOfflineQueue(prev => prev.filter(q => !itemsToSync.slice(0, synced).some(i => i.id === q.id)));
      if (showToast) showToast(`${synced} offline transmissions synchronized`, 'success');
      playLocalSynth('success');
    }
  }, [offlineQueue, showToast]);

  useEffect(() => {
    const handleOnline = () => processOfflineQueue();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [processOfflineQueue]);

  // 📡 Multi-Device Sync States
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const syncChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('nexora_chat_sync_channel');
      syncChannelRef.current = bc;
      bc.onmessage = (event) => {
        if (event.data?.type === 'CHAT_STATE_UPDATE') {
          fetchConversations();
        }
      };
      return () => bc.close();
    }
  }, [fetchConversations]);

  const triggerMultiDeviceBroadcast = () => {
    if (syncChannelRef.current) {
      syncChannelRef.current.postMessage({ type: 'CHAT_STATE_UPDATE', timestamp: Date.now() });
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) {
        setSyncStatus('syncing');
        fetch('/api/chat/syncState', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientLastSyncTimestamp: Date.now() - 30000 })
        })
        .then(res => res.json())
        .then(data => {
          if (data.savedBrainMessageIds) {
            setSavedBrainMessageIds(new Set(data.savedBrainMessageIds));
          }
          if (data.scheduledMessages) {
            setScheduledMessages(data.scheduledMessages);
          }
          setSyncStatus('synced');
        })
        .catch(() => setSyncStatus(navigator.onLine ? 'synced' : 'offline'));
      } else {
        setSyncStatus('offline');
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // ⏰ Send Later & Scheduled Message States
  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [isSendLaterOpen, setIsSendLaterOpen] = useState(false);
  const [sendLaterDate, setSendLaterDate] = useState('');
  const [sendLaterTime, setSendLaterTime] = useState('');
  const [sendLaterRepeat, setSendLaterRepeat] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [editingScheduledId, setEditingScheduledId] = useState<string | null>(null);
  const [aiSuggestedTime, setAiSuggestedTime] = useState<{ label: string; date: string; time: string; timestamp: number } | null>(null);

  // Fetch scheduled messages for current active conversation
  const fetchScheduledMessages = useCallback(async () => {
    if (!selectedChatId) return;
    try {
      const res = await fetch(`/api/chat/scheduledMessages?senderId=${userProfile?.userId || 'alex_m.synapse'}&chatId=${selectedChatId}`);
      if (res.ok) {
        const data = await res.json();
        setScheduledMessages(data.scheduledMessages || []);
      }
    } catch (err) {
      console.error('Error fetching scheduled messages:', err);
    }
  }, [selectedChatId, userProfile?.userId]);

  useEffect(() => {
    if (selectedChatId) {
      fetchScheduledMessages();
      const interval = setInterval(fetchScheduledMessages, 6000);
      return () => clearInterval(interval);
    }
  }, [selectedChatId, fetchScheduledMessages]);

  // AI Natural Language Scheduling Detection
  useEffect(() => {
    if (!messageInput.trim() || messageInput.trim().length < 4) {
      setAiSuggestedTime(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/chat/parseScheduledTime', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: messageInput })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.parsed && data.parsed.isMatch) {
            setAiSuggestedTime({
              label: data.parsed.label,
              date: data.parsed.detectedDate,
              time: data.parsed.detectedTime,
              timestamp: data.parsed.detectedTimestamp
            });
          } else {
            setAiSuggestedTime(null);
          }
        }
      } catch (e) {
        // ignore
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [messageInput]);

  const handleOpenSendLaterModal = (presetDate?: string, presetTime?: string) => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    now.setHours(now.getHours() + 1);
    const hPad = String(now.getHours()).padStart(2, '0');
    const mPad = String(now.getMinutes()).padStart(2, '0');

    setSendLaterDate(presetDate || `${yyyy}-${mm}-${dd}`);
    setSendLaterTime(presetTime || `${hPad}:${mPad}`);
    setSendLaterRepeat('once');
    setEditingScheduledId(null);
    setIsSendLaterOpen(true);
  };

  const applyAiTimeSuggestion = () => {
    if (!aiSuggestedTime) return;
    setSendLaterDate(aiSuggestedTime.date);
    setSendLaterTime(aiSuggestedTime.time);
    setIsSendLaterOpen(true);
  };

  const handleScheduleMessageSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!messageInput.trim() && !selectedImage) || !selectedChatId) {
      if (showToast) showToast('Please enter a message to schedule.', 'info');
      return;
    }
    if (!sendLaterDate || !sendLaterTime) {
      if (showToast) showToast('Please select date and time.', 'info');
      return;
    }

    const [year, month, day] = sendLaterDate.split('-').map(Number);
    const [hours, mins] = sendLaterTime.split(':').map(Number);
    const scheduledTimestamp = new Date(year, month - 1, day, hours, mins).getTime();

    if (scheduledTimestamp <= Date.now()) {
      if (showToast) showToast('Scheduled time must be in the future.', 'info');
      return;
    }

    const payloadText = messageInput.trim();

    try {
      if (editingScheduledId) {
        const res = await fetch('/api/chat/updateScheduledMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: editingScheduledId,
            senderId: userProfile?.userId || 'alex_m.synapse',
            text: payloadText,
            chatId: selectedChatId,
            scheduledDate: sendLaterDate,
            scheduledTime: sendLaterTime,
            scheduledTimestamp,
            repeat: sendLaterRepeat
          })
        });

        if (res.ok) {
          if (showToast) showToast('Scheduled message updated!', 'success');
          playLocalSynth('success');
        }
      } else {
        const res = await fetch('/api/chat/scheduleMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: userProfile?.userId || 'alex_m.synapse',
            senderName: userProfile?.name || 'You',
            senderAvatar: userProfile?.avatar || 'https://i.pravatar.cc/150?u=you',
            chatId: selectedChatId,
            text: payloadText,
            scheduledDate: sendLaterDate,
            scheduledTime: sendLaterTime,
            scheduledTimestamp,
            repeat: sendLaterRepeat,
            attachments: selectedImage ? { image: selectedImage } : undefined
          })
        });

        if (res.ok) {
          if (showToast) showToast('Message scheduled successfully!', 'success');
          playLocalSynth('success');
        }
      }

      setMessageInput('');
      setSelectedImage(null);
      setIsSendLaterOpen(false);
      setEditingScheduledId(null);
      setAiSuggestedTime(null);
      fetchScheduledMessages();

    } catch (err) {
      console.error('Failed to schedule message:', err);
      if (showToast) showToast('Failed to schedule message.', 'info');
    }
  };

  const handleSendScheduledImmediately = async (messageId: string) => {
    try {
      const res = await fetch('/api/chat/sendScheduledImmediately', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          senderId: userProfile?.userId || 'alex_m.synapse'
        })
      });

      if (res.ok) {
        if (showToast) showToast('Scheduled message delivered immediately!', 'success');
        playLocalSynth('success');
        fetchScheduledMessages();
        const chatRes = await fetch('/api/chat/conversations');
        if (chatRes.ok) {
          const data = await chatRes.json();
          if (Array.isArray(data)) setConversations(data);
        }
      }
    } catch (err) {
      console.error('Error sending scheduled message immediately:', err);
    }
  };

  const handleCancelScheduledMessage = async (messageId: string) => {
    try {
      const res = await fetch('/api/chat/cancelScheduledMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          senderId: userProfile?.userId || 'alex_m.synapse'
        })
      });

      if (res.ok) {
        if (showToast) showToast('Scheduled message cancelled.', 'info');
        playLocalSynth('delete');
        fetchScheduledMessages();
      }
    } catch (err) {
      console.error('Error cancelling scheduled message:', err);
    }
  };

  const handleDeleteScheduledMessage = async (messageId: string) => {
    try {
      const res = await fetch('/api/chat/deleteScheduledMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          senderId: userProfile?.userId || 'alex_m.synapse'
        })
      });

      if (res.ok) {
        if (showToast) showToast('Scheduled message deleted.', 'info');
        playLocalSynth('delete');
        fetchScheduledMessages();
      }
    } catch (err) {
      console.error('Error deleting scheduled message:', err);
    }
  };

  const handleEditScheduledMessage = (sm: any) => {
    setMessageInput(sm.text || '');
    setSendLaterDate(sm.scheduledDate);
    setSendLaterTime(sm.scheduledTime);
    setSendLaterRepeat(sm.repeat || 'once');
    setEditingScheduledId(sm.messageId);
    setIsSendLaterOpen(true);
  };

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const postMenuRef = useRef<HTMLDivElement>(null);
  const messageMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) setActiveSharePost(null);
      if (postMenuRef.current && !postMenuRef.current.contains(event.target as Node)) setActivePostMenuId(null);
      if (messageMenuRef.current && !messageMenuRef.current.contains(event.target as Node)) setActiveMessageMenuId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (viewMode === 'messages' && selectedChatId && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [viewMode, selectedChatId, conversations]);

  // Simulated Typing & Response Engine for Group Chats
  useEffect(() => {
    if (viewMode !== 'messages' || !selectedChatId) return;
    const chat = conversations.find(c => c.id === selectedChatId);
    if (!chat || !chat.isGroup) return;

    let isMounted = true;

    // Phase 1: After 4 seconds, show a member typing
    const typingTimer1 = setTimeout(() => {
      if (!isMounted) return;
      setConversations(prev => prev.map(c => c.id === selectedChatId ? {
        ...c,
        typingUsers: ['Sarah J.']
      } : c));
    }, 4000);

    // Phase 2: After 7 seconds, show multiple members typing
    const typingTimer2 = setTimeout(() => {
      if (!isMounted) return;
      setConversations(prev => prev.map(c => c.id === selectedChatId ? {
        ...c,
        typingUsers: ['Sarah J.', 'Kabir Zen']
      } : c));
    }, 7000);

    // Phase 3: After 10 seconds, one member sends a message, typing clears
    const responseTimer = setTimeout(() => {
      if (!isMounted) return;
      
      const mockReplies = [
        { text: "Agreed. We should push the latency threshold under 4ms.", name: "Sarah J.", avatar: "https://i.pravatar.cc/150?u=sarah", id: "u7" },
        { text: "Have you guys looked at the quantum key specs? Highly resilient.", name: "Kabir Zen", avatar: "https://i.pravatar.cc/150?u=kabir", id: "u1" },
        { text: "Let's coordinate a sync lock. Focus starts in 5 minutes.", name: "Aryan Builder", avatar: "https://i.pravatar.cc/150?u=aryan", id: "u3" },
        { text: "Sent the updated documentation draft to our secure channel node.", name: "Zoya Code", avatar: "https://i.pravatar.cc/150?u=zoya", id: "u2" }
      ];
      
      const reply = mockReplies[Math.floor(Math.random() * mockReplies.length)];
      const replyMessage: Message = {
        id: `m-reply-${Date.now()}`,
        text: reply.text,
        fromMe: false,
        senderId: reply.id,
        senderName: reply.name,
        senderAvatar: reply.avatar,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'seen'
      };

      setConversations(prev => prev.map(c => {
        if (c.id !== selectedChatId) return c;
        return {
          ...c,
          typingUsers: [],
          lastMessage: reply.text,
          messages: [...c.messages, replyMessage]
        };
      }));
      
      playLocalSynth('success');
    }, 11000);

    return () => {
      isMounted = false;
      clearTimeout(typingTimer1);
      clearTimeout(typingTimer2);
      clearTimeout(responseTimer);
      
      // Reset typing state on leave
      setConversations(prev => prev.map(c => c.id === selectedChatId ? {
        ...c,
        typingUsers: []
      } : c));
    };
  }, [selectedChatId, viewMode]);

  // AI Personalization Effect
  useEffect(() => {
    let isMounted = true;
    const runPersonalization = async () => {
      if (!isAiFilteringEnabled || !userProfile) {
        if (isMounted) setPersonalizedPosts([]);
        return;
      }

      setIsPersonalizing(true);
      try {
        const result = await geminiService.personalizeFeed(posts, userProfile);
        if (isMounted) setPersonalizedPosts(result);
      } catch (error) {
        console.warn("Using local intelligence sorting trace:", error);
      } finally {
        if (isMounted) setIsPersonalizing(false);
      }
    };

    // Debounce personalization to avoid excessive API calls
    const timer = setTimeout(runPersonalization, 1000);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isAiFilteringEnabled, JSON.stringify(userProfile?.interests || []), JSON.stringify(userProfile?.goals || []), posts.length]);

  const { filteredPosts, noiseCount, reelPosts, videoPosts } = useMemo(() => {
    let base = isAiFilteringEnabled && personalizedPosts.length > 0 ? personalizedPosts : posts;
    
    if (activeTab === 'Following') base = base.filter(p => p.isFollowing);
    
    // Personalization: Filter by interests if AI filtering is enabled and we don't have AI rankings yet
    if (isAiFilteringEnabled && personalizedPosts.length === 0 && userProfile?.interests && userProfile.interests.length > 0) {
      const interests = userProfile.interests.map(i => i.toLowerCase());
      base = base.filter(p => 
        p.tags.some(t => interests.includes(t.toLowerCase())) || 
        interests.includes(p.type.toLowerCase()) ||
        p.content.toLowerCase().split(' ').some(word => interests.includes(word))
      );
    }

    let currentNoise = base.filter(p => p.type === 'noise').length;
    if (isAiFilteringEnabled) base = base.filter(p => p.type !== 'noise');
    
    const reelPosts = base.filter(p => p.contentType === 'reel');
    const videoPosts = base.filter(p => p.contentType === 'video' || p.contentType === 'text' || p.contentType === 'image');

    if (activeChip !== 'All') {
      const q = activeChip.toLowerCase();
      base = base.filter(p => p.tags.some(t => t.toLowerCase().includes(q)) || p.type.toLowerCase().includes(q));
    }
    
    // Re-filter videoPosts for the Circles tab specifically if an interest chip is selected
    const filteredVideoPosts = activeChip !== 'All' 
      ? videoPosts.filter(p => p.tags.some(t => t.toLowerCase().includes(activeChip.toLowerCase())) || p.type.toLowerCase().includes(activeChip.toLowerCase()))
      : videoPosts;

    return { filteredPosts: base, noiseCount: isAiFilteringEnabled ? currentNoise : 0, reelPosts, videoPosts: filteredVideoPosts };
  }, [posts, personalizedPosts, activeTab, isAiFilteringEnabled, activeChip, userProfile]);

  const handleLike = useCallback((postId: string) => {
    onToggleLike(postId);
    
    // Find if it's currently NOT liked to trigger the animation
    const post = posts.find(p => p.id === postId);
    if (post && !post.hasLiked) {
      const newHearts = Array.from({ length: 4 }).map(() => ({ 
        id: Math.random(), postId, left: (Math.random() * 40) - 20, size: 14 + Math.random() * 10, duration: 1.2, delay: Math.random() * 0.2 
      }));
      setActiveFlyingHearts(prevH => [...prevH, ...newHearts]);
      setTimeout(() => setActiveFlyingHearts(prevH => prevH.filter(h => !newHearts.some(nh => nh.id === h.id))), 1500);
    }
  }, [onToggleLike, posts]);

  const handleFollow = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    const nextIsFollowing = !post.isFollowing;
    
    if (onToggleFollow) {
      onToggleFollow(post.creator);
    }
    
    if (showToast) {
      showToast(
        nextIsFollowing
          ? `Stabilized connection with ${post.creator}`
          : `Relay signal with ${post.creator} decoupled`,
        nextIsFollowing ? 'success' : 'info'
      );
    }
    
    if (nextIsFollowing) {
      setFollowedCreators(prev => {
        if (prev.some(c => c.name.toLowerCase() === post.creator.toLowerCase())) return prev;
        return [
          ...prev,
          {
            id: `c-followed-${Date.now()}`,
            name: post.creator,
            avatar: post.avatar || 'https://i.pravatar.cc/150?u=' + encodeURIComponent(post.creator),
            status: '🟢 ONLINE: Neural telemetry linked',
            timeLeft: 'Active now',
            syncScore: 85 + Math.floor(Math.random() * 15),
            streak: 5 + Math.floor(Math.random() * 10),
            isLive: Math.random() > 0.4,
            category: post.tags && post.tags.length > 0 ? post.tags[0].toUpperCase() : 'Creator Tech',
            recentPostId: post.id,
            xpShared: 150 + Math.floor(Math.random() * 300)
          }
        ];
      });
      setSuggestedCreators(prev => prev.filter(c => c.name.toLowerCase() !== post.creator.toLowerCase()));
    } else {
      setFollowedCreators(prev => prev.filter(c => c.name.toLowerCase() !== post.creator.toLowerCase()));
    }

    if (onInteraction) onInteraction(postId, 'view');
  };

  const handleRecommendedFollow = (name: string, avatar: string, bio: string) => {
    const isFollowed = followedCreators.some(c => c.name.toLowerCase() === name.toLowerCase());
    
    if (onToggleFollow) {
      onToggleFollow(name);
    }
    
    if (showToast) {
      showToast(
        !isFollowed
          ? `Stabilized connection with ${name}`
          : `Relay signal with ${name} decoupled`,
        !isFollowed ? 'success' : 'info'
      );
    }
    
    if (!isFollowed) {
      setFollowedCreators(prev => {
        if (prev.some(c => c.name.toLowerCase() === name.toLowerCase())) return prev;
        return [
          ...prev,
          {
            id: `c-followed-${Date.now()}`,
            name: name,
            avatar: avatar,
            status: `🟢 ONLINE: ${bio}`,
            timeLeft: 'Active now',
            syncScore: 85 + Math.floor(Math.random() * 15),
            text: bio,
            streak: 3 + Math.floor(Math.random() * 10),
            isLive: Math.random() > 0.4,
            category: 'Expert Node',
            recentPostId: 'rec',
            xpShared: 50 + Math.floor(Math.random() * 100)
          }
        ];
      });
      setTimeout(() => {
        setExploreFollowedUser({ name, avatar });
        setShowExploreFollowModal(true);
      }, 500);
    } else {
      setFollowedCreators(prev => prev.filter(c => c.name.toLowerCase() !== name.toLowerCase()));
    }
  };

  const handleShareToStory = (post: Post) => {
    if (onInteraction) onInteraction(post.id, 'share');
    if (showToast) showToast("Post shared to your Nexora Story!", "success");
    setActiveSharePost(null);
  };

  const handleCopyLink = () => {
    if (showToast) showToast("Neural Link copied to clipboard", "info");
    setActiveSharePost(null);
    setActivePostMenuId(null);
  };

  const handleReport = (postId: string) => {
    if (showToast) showToast("Neural violation report sent for review", "info");
    setActivePostMenuId(null);
  };

  const handleMute = (creator: string) => {
    if (showToast) showToast(`Signals from ${creator} muted`, "info");
    setActivePostMenuId(null);
  };

  const handleCall = (type: 'voice' | 'video') => {
    setIsCalling(type);
    setIsVideoOn(type === 'video');
  };

  const handleEndCall = () => {
    setIsCalling(null);
    if (showToast) showToast("Neural Link Terminated", "info");
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const openChannelProfile = (name: string, avatar: string) => {
    setSelectedChannel({ name, avatar });
    setViewMode('channel-profile');
  };

  const openChat = (nodeName: string) => {
    let targetId = '';
    const existing = conversations.find(c => c.sender === nodeName);
    if (existing) {
      targetId = existing.id;
    } else {
      const newDm: DirectMessage = {
        id: `dm-${nodeName}-${Date.now()}`,
        sender: nodeName,
        avatar: `https://i.pravatar.cc/150?u=${nodeName}`,
        lastMessage: 'Neural link established.',
        time: 'now',
        messages: [{ id: `m-${Date.now()}`, text: `Connection established with ${nodeName}. Awaiting signal.`, fromMe: false, time: 'now', status: 'seen' }]
      };
      setConversations(prev => [newDm, ...prev]);
      targetId = newDm.id;
    }
    setSelectedChatId(targetId);
    setViewMode('messages');
  };

  const handleCreateGroup = async (groupName: string, selectedMembers: string[], description: string, photo: string) => {
    const groupId = `group-${Date.now()}`;
    const newGroup: DirectMessage = {
      id: groupId,
      sender: groupName,
      avatar: photo,
      lastMessage: 'Group Node established.',
      time: 'now',
      unread: false,
      isGroup: true,
      groupDetails: {
        id: groupId,
        name: groupName,
        description,
        photo,
        creationDate: new Date().toLocaleDateString(),
        ownerId: activeSenderId,
        adminIds: [],
        memberIds: [...selectedMembers],
        memberCount: selectedMembers.length + 1,
        inviteLink: `https://nexora.app/join/${groupId}`,
        inviteCode: `NEX-${Math.floor(1000 + Math.random() * 9000)}`,
        pinnedMessageIds: [],
        historySetting: 'entire',
        isEncrypted: true
      },
      messages: [
        {
          id: `m-sys-${Date.now()}`,
          text: `System: Group node established by You.`,
          fromMe: false,
          senderName: 'System',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'seen'
        }
      ]
    };

    try {
      await fetch('/api/chat/group/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group: newGroup })
      });
    } catch (e) {
      console.error('Failed to persist group creation:', e);
    }

    setConversations(prev => [newGroup, ...prev]);
    setSelectedChatId(groupId);
    setViewMode('messages');
    if (showToast) showToast(`Group "${groupName}" Created`, 'success');
  };

  const handleUpdateGroupDetails = async (groupId: string, name: string, description: string, photo: string) => {
    const systemMsg = {
      id: `m-sys-${Date.now()}`,
      text: `System: Group configurations updated by Admin.`,
      fromMe: false,
      senderName: 'System',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'seen' as MessageStatus
    };

    try {
      await fetch('/api/chat/group/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: groupId,
          name,
          description,
          photo,
          systemMessage: systemMsg
        })
      });
    } catch (e) {
      console.error('Failed to update group details:', e);
    }

    setConversations(prev => prev.map(c => {
      if (c.id !== groupId || !c.groupDetails) return c;
      return {
        ...c,
        sender: name,
        avatar: photo,
        groupDetails: {
          ...c.groupDetails,
          name,
          description,
          photo
        },
        messages: [
          ...c.messages,
          systemMsg
        ]
      };
    }));
  };

  const handleAddMembers = async (groupId: string, memberIds: string[]) => {
    const existingGroup = conversations.find(c => c.id === groupId);
    const updatedMembers = Array.from(new Set([...(existingGroup?.groupDetails?.memberIds || []), ...memberIds]));
    const names = memberIds.map(mId => GROUP_CONTACTS.find(co => co.id === mId)?.name || mId).join(', ');
    const systemMsg = {
      id: `m-sys-${Date.now()}`,
      text: `System: ${names} added to the group.`,
      fromMe: false,
      senderName: 'System',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'seen' as MessageStatus
    };

    try {
      await fetch('/api/chat/group/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: groupId,
          memberIds: updatedMembers,
          memberCount: updatedMembers.length + 1,
          systemMessage: systemMsg
        })
      });
    } catch (e) {
      console.error('Failed to add members:', e);
    }

    setConversations(prev => prev.map(c => {
      if (c.id !== groupId || !c.groupDetails) return c;
      return {
        ...c,
        groupDetails: {
          ...c.groupDetails,
          memberIds: updatedMembers,
          memberCount: updatedMembers.length + 1
        },
        messages: [
          ...c.messages,
          systemMsg
        ]
      };
    }));
  };

  const handleKickMember = async (groupId: string, memberId: string) => {
    const group = conversations.find(c => c.id === groupId);
    if (!group || !group.groupDetails) return;
    const updatedMembers = group.groupDetails.memberIds.filter(id => id !== memberId);
    const updatedAdmins = group.groupDetails.adminIds.filter(id => id !== memberId);
    const name = GROUP_CONTACTS.find(co => co.id === memberId)?.name || 'Member';
    const systemMsg = {
      id: `m-sys-${Date.now()}`,
      text: `System: ${name} was disconnected from this node.`,
      fromMe: false,
      senderName: 'System',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'seen' as MessageStatus
    };

    try {
      await fetch('/api/chat/group/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: groupId,
          memberIds: updatedMembers,
          memberCount: updatedMembers.length + 1,
          adminIds: updatedAdmins,
          systemMessage: systemMsg
        })
      });
    } catch (e) {
      console.error('Failed to kick member:', e);
    }

    setConversations(prev => prev.map(c => {
      if (c.id !== groupId || !c.groupDetails) return c;
      return {
        ...c,
        groupDetails: {
          ...c.groupDetails,
          memberIds: updatedMembers,
          memberCount: updatedMembers.length + 1,
          adminIds: updatedAdmins
        },
        messages: [
          ...c.messages,
          systemMsg
        ]
      };
    }));
  };

  const handlePromoteAdmin = async (groupId: string, memberId: string) => {
    const group = conversations.find(c => c.id === groupId);
    if (!group || !group.groupDetails) return;
    const updatedAdmins = Array.from(new Set([...group.groupDetails.adminIds, memberId]));
    const name = GROUP_CONTACTS.find(co => co.id === memberId)?.name || 'Member';
    const systemMsg = {
      id: `m-sys-${Date.now()}`,
      text: `System: ${name} promoted to Admin.`,
      fromMe: false,
      senderName: 'System',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'seen' as MessageStatus
    };

    try {
      await fetch('/api/chat/group/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: groupId,
          adminIds: updatedAdmins,
          systemMessage: systemMsg
        })
      });
    } catch (e) {
      console.error('Failed to promote admin:', e);
    }

    setConversations(prev => prev.map(c => {
      if (c.id !== groupId || !c.groupDetails) return c;
      return {
        ...c,
        groupDetails: {
          ...c.groupDetails,
          adminIds: updatedAdmins
        },
        messages: [
          ...c.messages,
          systemMsg
        ]
      };
    }));
  };

  const handleDemoteAdmin = async (groupId: string, memberId: string) => {
    const group = conversations.find(c => c.id === groupId);
    if (!group || !group.groupDetails) return;
    const updatedAdmins = group.groupDetails.adminIds.filter(id => id !== memberId);
    const name = GROUP_CONTACTS.find(co => co.id === memberId)?.name || 'Member';
    const systemMsg = {
      id: `m-sys-${Date.now()}`,
      text: `System: ${name} demoted from Admin privileges.`,
      fromMe: false,
      senderName: 'System',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'seen' as MessageStatus
    };

    try {
      await fetch('/api/chat/group/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: groupId,
          adminIds: updatedAdmins,
          systemMessage: systemMsg
        })
      });
    } catch (e) {
      console.error('Failed to demote admin:', e);
    }

    setConversations(prev => prev.map(c => {
      if (c.id !== groupId || !c.groupDetails) return c;
      return {
        ...c,
        groupDetails: {
          ...c.groupDetails,
          adminIds: updatedAdmins
        },
        messages: [
          ...c.messages,
          systemMsg
        ]
      };
    }));
  };

  const handleTransferOwnership = async (groupId: string, memberId: string) => {
    const group = conversations.find(c => c.id === groupId);
    if (!group || !group.groupDetails) return;
    const updatedAdmins = Array.from(new Set([...group.groupDetails.adminIds, memberId]));
    const name = GROUP_CONTACTS.find(co => co.id === memberId)?.name || 'Member';
    const systemMsg = {
      id: `m-sys-${Date.now()}`,
      text: `System: Ownership transferred to ${name}.`,
      fromMe: false,
      senderName: 'System',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'seen' as MessageStatus
    };

    try {
      await fetch('/api/chat/group/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: groupId,
          ownerId: memberId,
          adminIds: updatedAdmins,
          systemMessage: systemMsg
        })
      });
    } catch (e) {
      console.error('Failed to transfer ownership:', e);
    }

    setConversations(prev => prev.map(c => {
      if (c.id !== groupId || !c.groupDetails) return c;
      return {
        ...c,
        groupDetails: {
          ...c.groupDetails,
          ownerId: memberId,
          adminIds: updatedAdmins
        },
        messages: [
          ...c.messages,
          systemMsg
        ]
      };
    }));
  };

  const handleLeaveGroup = async (groupId: string) => {
    const group = conversations.find(c => c.id === groupId);
    if (group && group.groupDetails) {
      const updatedMembers = group.groupDetails.memberIds.filter(id => id !== activeSenderId && id !== 'alex_m.synapse');
      const updatedAdmins = group.groupDetails.adminIds.filter(id => id !== activeSenderId && id !== 'alex_m.synapse');
      const systemMsg = {
        id: `m-sys-${Date.now()}`,
        text: `System: Alex M. left the group.`,
        fromMe: false,
        senderName: 'System',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'seen' as MessageStatus
      };

      try {
        await fetch('/api/chat/group/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: groupId,
            memberIds: updatedMembers,
            memberCount: updatedMembers.length + 1,
            adminIds: updatedAdmins,
            systemMessage: systemMsg
          })
        });
      } catch (e) {
        console.error('Failed to leave group:', e);
      }
    }

    setConversations(prev => prev.filter(c => c.id !== groupId));
    setSelectedChatId(null);
    if (showToast) showToast("You left the group channel", "info");
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await fetch('/api/chat/group/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: groupId })
      });
    } catch (e) {
      console.error('Failed to delete group:', e);
    }

    setConversations(prev => prev.filter(c => c.id !== groupId));
    setSelectedChatId(null);
    if (showToast) showToast("Group channel deleted permanently", "success");
  };

  const [currentPinnedIndex, setCurrentPinnedIndex] = useState<number>(0);

  const handlePinMessage = async (chatId: string, msgId: string, senderName?: string) => {
    const currentChat = currentConversations.find(c => c.id === chatId);
    const msg = currentChat?.messages?.find(m => m.id === msgId);
    const originalSender = senderName || msg?.senderName || (msg?.fromMe ? (userProfile?.name || 'You') : currentChat?.sender) || 'Anonymous';
    const pinnedBy = userProfile?.name || 'You';

    setCurrentConversations(prev => prev.map(c => {
      if (c.id !== chatId) return c;
      const existingPins = c.pinnedMessages || [];
      if (existingPins.some(p => p.messageId === msgId)) return c;
      const newRecord: PinnedMessageRecord = {
        messageId: msgId,
        chatId,
        pinnedBy,
        pinnedAt: Date.now(),
        originalSender,
        pinHistory: [{ action: 'pin', userId: pinnedBy, timestamp: Date.now() }]
      };
      const updatedPins = [...existingPins, newRecord];
      const groupDetails = c.groupDetails ? { ...c.groupDetails, pinnedMessageIds: updatedPins.map(p => p.messageId) } : undefined;
      return { ...c, pinnedMessages: updatedPins, groupDetails };
    }));

    try {
      const res = await fetch('/api/chat/pinMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          messageId: msgId,
          pinnedBy,
          originalSender
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.pinnedMessages) {
          setCurrentConversations(prev => prev.map(c => c.id === chatId ? {
            ...c,
            pinnedMessages: data.pinnedMessages,
            groupDetails: c.groupDetails ? { ...c.groupDetails, pinnedMessageIds: data.pinnedMessageIds } : undefined
          } : c));
        }
      }
    } catch (e) {
      console.error('Failed to pin message:', e);
    }
    playLocalSynth('toggle');
    if (showToast) showToast('Message pinned to conversation', 'success');
  };

  const handleUnpinMessage = async (chatId: string, msgId: string) => {
    const unpinnedBy = userProfile?.name || 'You';

    setCurrentConversations(prev => prev.map(c => {
      if (c.id !== chatId) return c;
      const existingPins = c.pinnedMessages || [];
      const updatedPins = existingPins.filter(p => p.messageId !== msgId);
      const groupDetails = c.groupDetails ? { ...c.groupDetails, pinnedMessageIds: updatedPins.map(p => p.messageId) } : undefined;
      return { ...c, pinnedMessages: updatedPins, groupDetails };
    }));

    try {
      const res = await fetch('/api/chat/unpinMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          messageId: msgId,
          unpinnedBy
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.pinnedMessages) {
          setCurrentConversations(prev => prev.map(c => c.id === chatId ? {
            ...c,
            pinnedMessages: data.pinnedMessages,
            groupDetails: c.groupDetails ? { ...c.groupDetails, pinnedMessageIds: data.pinnedMessageIds } : undefined
          } : c));
        }
      }
    } catch (e) {
      console.error('Failed to unpin message:', e);
    }
    playLocalSynth('toggle');
    if (showToast) showToast('Message unpinned', 'info');
  };

  const handleTogglePinMessage = async (chatId: string, msgId: string, senderName?: string) => {
    const currentChat = currentConversations.find(c => c.id === chatId);
    const isPinned = (currentChat?.pinnedMessages && currentChat.pinnedMessages.some(p => p.messageId === msgId)) ||
      (currentChat?.groupDetails?.pinnedMessageIds?.includes(msgId));
    if (isPinned) {
      await handleUnpinMessage(chatId, msgId);
    } else {
      await handlePinMessage(chatId, msgId, senderName);
    }
  };

  const handleUpdateHistorySetting = async (groupId: string, setting: 'entire' | '30days' | 'joining') => {
    try {
      await fetch('/api/chat/group/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: groupId,
          historySetting: setting
        })
      });
    } catch (e) {
      console.error('Failed to update history setting:', e);
    }

    setConversations(prev => prev.map(c => {
      if (c.id !== groupId || !c.groupDetails) return c;
      return {
        ...c,
        groupDetails: {
          ...c.groupDetails,
          historySetting: setting
        }
      };
    }));
  };

  const handleToggleReaction = async (msgId: string, emoji: string) => {
    if (!selectedChatId) return;

    try {
      await fetch('/api/chat/reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: selectedChatId,
          messageId: msgId,
          userId: activeSenderId,
          emoji: emoji
        })
      });
    } catch (e) {
      console.error('Failed to toggle reaction:', e);
    }

    setConversations(prev => prev.map(c => {
      if (c.id !== selectedChatId) return c;
      return {
        ...c,
        messages: c.messages.map(m => {
          if (m.id !== msgId) return m;
          const reactions = { ...(m.reactions || {}) };
          if (reactions[activeSenderId] === emoji) {
            delete reactions[activeSenderId];
          } else {
            reactions[activeSenderId] = emoji;
          }
          return { ...m, reactions };
        })
      };
    }));
    playLocalSynth('tap');
  };

  const renderMessageText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@\w+(?:\.\w+)?)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1 py-0.5 rounded-md font-bold text-[11px] mx-0.5 shadow-sm inline-block">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleJoinGroupWithCode = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;
    
    const existing = conversations.find(c => c.groupDetails?.inviteCode === cleanCode || c.groupDetails?.inviteLink.includes(cleanCode));
    if (existing) {
      setConversations(prev => prev.map(c => {
        if (c.id !== existing.id || !c.groupDetails) return c;
        if (c.groupDetails.memberIds.includes(activeSenderId)) return c;
        return {
          ...c,
          groupDetails: {
            ...c.groupDetails,
            memberIds: [...c.groupDetails.memberIds],
            memberCount: c.groupDetails.memberCount
          },
          messages: [
            ...c.messages,
            {
              id: `m-sys-${Date.now()}`,
              text: `System: You joined the group using invitation credentials.`,
              fromMe: false,
              senderName: 'System',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'seen'
            }
          ]
        };
      }));
      setSelectedChatId(existing.id);
      setViewMode('messages');
      if (showToast) showToast("Synced with Group Node", "success");
    } else {
      const mockNames = ['Alpha Collective', 'Synergy Core', 'Quantum Thinkers', 'Productivity Nexus', 'Biohacking Clan'];
      const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
      const mockPhotos = [
        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
        'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=150',
        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=150',
        'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=150'
      ];
      const randomPhoto = mockPhotos[Math.floor(Math.random() * mockPhotos.length)];
      
      const groupId = `group-${Date.now()}`;
      const newGroup: DirectMessage = {
        id: groupId,
        sender: randomName,
        avatar: randomPhoto,
        lastMessage: 'Linked to invitation node.',
        time: 'now',
        isGroup: true,
        groupDetails: {
          id: groupId,
          name: randomName,
          description: 'A shared neural group assembled via secure transmission codes.',
          photo: randomPhoto,
          creationDate: new Date().toLocaleDateString(),
          ownerId: 'u1',
          adminIds: ['u1', 'u2'],
          memberIds: ['u1', 'u2', 'u3'],
          memberCount: 4,
          inviteLink: `https://nexora.app/join/${groupId}`,
          inviteCode: cleanCode,
          pinnedMessageIds: [],
          historySetting: 'entire',
          isEncrypted: true
        },
        messages: [
          {
            id: `m-sys-1`,
            text: `System: Channel created by @kabir.zen`,
            fromMe: false,
            senderName: 'System',
            time: '10:00 AM',
            status: 'seen'
          },
          {
            id: `m-p-1`,
            text: `Welcome to ${randomName}! Enter your thoughts here.`,
            fromMe: false,
            senderId: 'u1',
            senderName: 'Kabir Zen',
            senderAvatar: 'https://i.pravatar.cc/150?u=kabir',
            time: '10:05 AM',
            status: 'seen'
          },
          {
            id: `m-sys-${Date.now()}`,
            text: `System: You joined the channel via credentials code "${cleanCode}".`,
            fromMe: false,
            senderName: 'System',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'seen'
          }
        ]
      };
      
      setConversations(prev => [newGroup, ...prev]);
      setSelectedChatId(groupId);
      setViewMode('messages');
      if (showToast) showToast(`Successfully joined "${randomName}"!`, "success");
    }
    setJoinInviteCode('');
    setIsJoinGroupOpen(false);
  };

  const handleSendAttachment = async (type: 'video' | 'doc' | 'audio') => {
    if (!selectedChatId) return;
    
    let newMessage: Message;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (type === 'video') {
      newMessage = {
        id: `m-self-${Date.now()}`,
        fromMe: true,
        senderId: activeSenderId,
        senderName: 'You',
        senderAvatar: 'https://i.pravatar.cc/150?u=alex',
        time: timeStr,
        status: 'sent',
        videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        text: 'Shared a visual stream packet.'
      };
    } else if (type === 'doc') {
      newMessage = {
        id: `m-self-${Date.now()}`,
        fromMe: true,
        senderId: activeSenderId,
        senderName: 'You',
        senderAvatar: 'https://i.pravatar.cc/150?u=alex',
        time: timeStr,
        status: 'sent',
        documentName: 'nexora_architecture_spec.pdf',
        documentSize: '8.4 MB',
        text: 'Shared a documentation file.'
      };
    } else {
      newMessage = {
        id: `m-self-${Date.now()}`,
        fromMe: true,
        senderId: activeSenderId,
        senderName: 'You',
        senderAvatar: 'https://i.pravatar.cc/150?u=alex',
        time: timeStr,
        status: 'sent',
        audioUrl: 'simulated-voice-note',
        voiceNoteDuration: 12,
        text: 'Voice note packet (12s).'
      };
    }
    
    try {
      await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: selectedChatId, message: newMessage })
      });
    } catch (e) {
      console.error('Failed to save message to database:', e);
    }

    setConversations(prev => prev.map(c => c.id === selectedChatId ? {
      ...c,
      messages: [...c.messages, newMessage],
      lastMessage: type === 'video' ? 'Sent a video' : type === 'doc' ? 'Sent a document' : 'Sent a voice note'
    } : c));

    playLocalSynth('success');
    
    const selectedChat = conversations.find(c => c.id === selectedChatId);
    if (selectedChat?.isGroup) {
      setTimeout(async () => {
        try {
          await fetch('/api/chat/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: selectedChatId, messageId: newMessage.id, readerName: 'Zoya Code' })
          });
        } catch (e) { console.error(e); }
        setConversations(prev => prev.map(c => c.id === selectedChatId ? {
          ...c,
          messages: c.messages.map(m => m.id === newMessage.id ? { ...m, seenBy: ['Zoya Code'] } : m)
        } : c));
      }, 1000);
      setTimeout(async () => {
        try {
          await fetch('/api/chat/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: selectedChatId, messageId: newMessage.id, readerName: 'Kabir Zen' })
          });
        } catch (e) { console.error(e); }
        setConversations(prev => prev.map(c => c.id === selectedChatId ? {
          ...c,
          messages: c.messages.map(m => m.id === newMessage.id ? { ...m, seenBy: ['Zoya Code', 'Kabir Zen'] } : m)
        } : c));
      }, 2000);
      setTimeout(async () => {
        try {
          await fetch('/api/chat/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: selectedChatId, messageId: newMessage.id, readerName: 'Sarah J.' })
          });
        } catch (e) { console.error(e); }
        setConversations(prev => prev.map(c => c.id === selectedChatId ? {
          ...c,
          messages: c.messages.map(m => m.id === newMessage.id ? { ...m, seenBy: ['Zoya Code', 'Kabir Zen', 'Sarah J.'], status: 'seen' as MessageStatus } : m)
        } : c));
      }, 3000);
    } else {
      setTimeout(async () => {
        try {
          await fetch('/api/chat/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: selectedChatId, messageId: newMessage.id, readerName: selectedChat?.sender || 'Partner' })
          });
        } catch (e) { console.error(e); }
        setConversations(prev => prev.map(c => c.id === selectedChatId ? {
          ...c,
          messages: c.messages.map(m => m.id === newMessage.id ? { ...m, status: 'seen' as MessageStatus } : m)
        } : c));
      }, 1500);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!messageInput.trim() && !selectedImage) || !selectedChatId) return;

    if (editingMessageId) {
      const selectedChat = conversations.find(c => c.id === selectedChatId);
      const msgToEdit = selectedChat?.messages?.find(m => m.id === editingMessageId);

      if (msgToEdit) {
        if (!canEditMessage(msgToEdit)) {
          if (showToast) showToast("Editing locked: Message has already been seen or opened by recipient", "error");
          setEditingMessageId(null);
          setMessageInput('');
          return;
        }

        const newText = messageInput.trim();
        const editId = editingMessageId;

        // Optimistic local UI update preserving message id, timestamp, attachments, reactions, pins
        setConversations(prev => prev.map(c => c.id === selectedChatId ? {
          ...c,
          messages: c.messages.map(m => m.id === editId ? { ...m, text: newText, isEdited: true } : m),
          lastMessage: c.messages[c.messages.length - 1]?.id === editId ? newText : c.lastMessage
        } : c));

        setEditingMessageId(null);
        setMessageInput('');
        setSelectedIntent(null);

        // Real-time backend sync & verification
        try {
          const res = await fetch('/api/chat/editMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId: selectedChatId,
              messageId: editId,
              newText,
              senderId: userProfile?.userId || 'alex_m.synapse'
            })
          });

          if (!res.ok) {
            const errData = await res.json();
            if (showToast) showToast(errData.error || "Editing locked by recipient read status", "error");
            playLocalSynth('delete');
            // Revert edit by re-fetching conversations
            fetchConversations();
          } else {
            if (showToast) showToast("Message content updated", "success");
            playLocalSynth('success');
          }
        } catch (err) {
          console.error('Failed to update message on backend:', err);
        }
        return;
      }
    }

    const isOffline = !navigator.onLine;
    const newMessage: Message = { 
      id: `m-self-${Date.now()}`,
      text: messageInput.trim() || undefined, 
      image: selectedImage || undefined,
      fromMe: true, 
      senderId: activeSenderId,
      senderName: 'You',
      senderAvatar: 'https://i.pravatar.cc/150?u=you',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: (isOffline ? 'offline-queued' : 'sent') as MessageStatus,
      intent: selectedIntent || undefined,
      replyToMessageId: replyingToMessage?.id || undefined,
      replyToMessageText: replyingToMessage ? (replyingToMessage.text || 'Photo Transmission') : undefined
    };
    
    if (isOffline) {
      setOfflineQueue(prev => [...prev, { id: newMessage.id, chatId: selectedChatId, message: newMessage }]);
      if (showToast) showToast('Queued offline transmission ⚡', 'info');
    } else {
      try {
        await fetch('/api/chat/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId: selectedChatId, message: newMessage })
        });
        triggerMultiDeviceBroadcast();
      } catch (e) {
        console.error('Failed to save message to database:', e);
        setOfflineQueue(prev => [...prev, { id: newMessage.id, chatId: selectedChatId, message: newMessage }]);
      }
    }

    setConversations(prev => prev.map(c => c.id === selectedChatId ? { 
      ...c, 
      messages: [...c.messages, newMessage], 
      lastMessage: selectedImage ? 'Sent a photo' : messageInput 
    } : c));

    setReplyingToMessage(null); // Reset reply

    // Silent Affinity Engine trigger
    if (messageInput.trim() && selectedChatId) {
      fetch('/api/affinity-engine/record-interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAId: activeSenderId,
          userBId: selectedChatId,
          interactionType: 'chat_message_sent',
          meta: { text: messageInput.trim() }
        })
      }).catch(err => console.warn("Affinity silent record failed:", err));
    }
    
    const selectedChat = conversations.find(c => c.id === selectedChatId);
    if (selectedChat?.isGroup) {
      setTimeout(async () => {
        try {
          await fetch('/api/chat/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: selectedChatId, messageId: newMessage.id, readerName: 'Zoya Code' })
          });
        } catch (e) { console.error(e); }
        setConversations(prev => prev.map(c => c.id === selectedChatId ? {
          ...c,
          messages: c.messages.map(m => m.id === newMessage.id ? { ...m, seenBy: ['Zoya Code'] } : m)
        } : c));
      }, 1000);
      setTimeout(async () => {
        try {
          await fetch('/api/chat/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: selectedChatId, messageId: newMessage.id, readerName: 'Kabir Zen' })
          });
        } catch (e) { console.error(e); }
        setConversations(prev => prev.map(c => c.id === selectedChatId ? {
          ...c,
          messages: c.messages.map(m => m.id === newMessage.id ? { ...m, seenBy: ['Zoya Code', 'Kabir Zen'] } : m)
        } : c));
      }, 2000);
      setTimeout(async () => {
        try {
          await fetch('/api/chat/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: selectedChatId, messageId: newMessage.id, readerName: 'Sarah J.' })
          });
        } catch (e) { console.error(e); }
        setConversations(prev => prev.map(c => c.id === selectedChatId ? {
          ...c,
          messages: c.messages.map(m => m.id === newMessage.id ? { ...m, seenBy: ['Zoya Code', 'Kabir Zen', 'Sarah J.'], status: 'seen' as MessageStatus } : m)
        } : c));
      }, 3000);
    } else {
      setTimeout(async () => {
        try {
          await fetch('/api/chat/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: selectedChatId, messageId: newMessage.id, readerName: selectedChat?.sender || 'Partner' })
          });
        } catch (e) { console.error(e); }
        setConversations(prev => prev.map(c => c.id === selectedChatId ? {
          ...c,
          messages: c.messages.map(m => m.id === newMessage.id ? { ...m, status: 'seen' as MessageStatus } : m)
        } : c));
      }, 1500);
    }

    setMessageInput('');
    setSelectedImage(null);
    setSelectedIntent(null);
  };

  const longPressAutoPinTimer = useRef<number | null>(null);

  const handleMessageLongPressStart = (msgId: string, senderName?: string) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (longPressAutoPinTimer.current) clearTimeout(longPressAutoPinTimer.current);

    // Initial 500ms long-press: open context menu + haptic feedback
    longPressTimer.current = window.setTimeout(() => {
      setActiveMessageMenuId(msgId);
      if (navigator.vibrate) navigator.vibrate(40);
      playLocalSynth('tap');

      // Extended 2s long-press: automatically toggle pin on message
      longPressAutoPinTimer.current = window.setTimeout(() => {
        if (selectedChatId) {
          handleTogglePinMessage(selectedChatId, msgId, senderName);
          setActiveMessageMenuId(null);
          if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
        }
      }, 1500); // 500ms + 1500ms = 2.0s total press duration
    }, 500);
  };

  const handleMessageLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (longPressAutoPinTimer.current) {
      clearTimeout(longPressAutoPinTimer.current);
      longPressAutoPinTimer.current = null;
    }
  };

  const canEditMessage = (msg: Message): boolean => {
    if (!msg.fromMe) return false;
    if (msg.status === 'seen' || msg.status === 'read') return false;
    if (msg.seenBy && msg.seenBy.some(reader => reader !== 'You' && reader !== msg.senderName && reader !== userProfile?.name)) return false;
    return true;
  };

  const initiateEdit = (msgId: string, text: string) => {
    const selectedChat = conversations.find(c => c.id === selectedChatId);
    const msg = selectedChat?.messages?.find(m => m.id === msgId);
    if (msg && !canEditMessage(msg)) {
      if (showToast) showToast("Editing locked: Recipient has already seen or opened this message.", "error");
      playLocalSynth('delete');
      setActiveMessageMenuId(null);
      return;
    }
    setEditingMessageId(msgId);
    setMessageInput(text || '');
    setActiveMessageMenuId(null);
    playLocalSynth('tap');
  };

  const renderSubTabContent = () => {
    if (showMap) {
      return (
        <div className="flex-1 flex flex-col bg-slate-950 p-6 animate-in slide-in-from-bottom-4 duration-500 overflow-y-auto">
          <header className="flex items-center justify-between mb-8">
            <button onClick={() => setShowMap(false)} className="p-2 hover:bg-slate-900 rounded-full text-slate-400 transition-all"><ArrowLeft size={24} /></button>
            <h2 className="text-xl font-bold text-white font-outfit uppercase tracking-tight">Neural Map</h2>
            <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400"><MapPin size={20} /></div>
          </header>
          <div className="space-y-6">
            {isMapLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-indigo-500" size={40} />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scanning local nodes...</p>
              </div>
            ) : (
              mapResults.map((chunk, i) => (
                <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-[32px] p-6 group hover:border-indigo-500/30 transition-all shadow-xl">
                  <h3 className="text-lg font-bold text-white mb-2">{chunk.maps?.title || "Growth Node"}</h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mb-4">Located in your vicinity. Potential high-value connection point.</p>
                  <a href={chunk.maps?.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-2.5 bg-white text-slate-950 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all w-fit">Open in Maps <ExternalLink size={14} /></a>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    const renderRepliesTree = (repliesList: ThreadedReply[] = [], depth = 0, discussionId: string): React.ReactNode => {
      if (repliesList.length === 0) return null;
      
      return (
        <div className={`space-y-4 ${depth > 0 ? 'ml-6 pl-4 border-l border-white/5 mt-3' : ''}`}>
          {repliesList.map(reply => (
            <div key={reply.id} className="p-4 bg-slate-900/30 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img src={reply.authorAvatar} alt={reply.authorName} className="w-6 h-6 rounded-full object-cover border border-white/10" referrerPolicy="no-referrer" />
                  <span className="text-[11px] font-bold text-slate-200">{reply.authorName}</span>
                  <span className="text-[9px] font-mono text-slate-500">
                    {new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <button 
                  onClick={() => handleLikeReply(discussionId, reply.id)}
                  className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-xl transition-all cursor-pointer ${
                    reply.hasLiked ? 'text-rose-400 bg-rose-500/10' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Heart size={10} className={reply.hasLiked ? 'fill-rose-400' : ''} />
                  {reply.likes}
                </button>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-semibold">{reply.text}</p>
              
              {depth < 1 && (
                <div className="flex items-center gap-4 pt-1">
                  <button 
                    onClick={() => {
                      setReplyingToId(reply.id);
                      setReplyingToAuthor(reply.authorName);
                      const el = document.getElementById('reply-input-box');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider flex items-center gap-1"
                  >
                    <MessageSquare size={10} /> Reply Thread
                  </button>
                </div>
              )}
              
              {reply.replies && reply.replies.length > 0 && renderRepliesTree(reply.replies, depth + 1, discussionId)}
            </div>
          ))}
        </div>
      );
    };

    switch (activeSubTab) {
      case 'search':
        const searchResults = posts.filter(p => 
          p.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
          p.creator.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        return (
          <div className="flex-1 overflow-y-auto p-6 space-y-8 animate-in fade-in duration-500 pb-32 custom-scrollbar">
            <div className="relative group">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                <Search size={20} />
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users, circles, or neural content..." 
                className="w-full bg-slate-900/60 border border-slate-800 rounded-[32px] py-6 pl-16 pr-8 text-sm text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-600 font-medium shadow-2xl"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-6 flex items-center text-slate-500 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              )}
            </div>

            {searchQuery ? (
              <div className="space-y-6">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] ml-2">Neural Hits ({searchResults.length})</h4>
                {searchResults.length > 0 ? (
                  <div className="space-y-4">
                    {searchResults.map(post => (
                      <div key={post.id} onClick={() => { setActiveSubTab('circles'); /* In a real app we'd scroll to it */ }} className="bg-slate-900/40 border border-slate-800 p-5 rounded-[28px] hover:bg-slate-900 transition-all cursor-pointer group">
                        <div className="flex items-center gap-4 mb-3">
                          <img src={post.avatar} className="w-8 h-8 rounded-lg object-cover" />
                          <span className="text-[10px] font-bold text-white uppercase tracking-widest">{post.creator}</span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{post.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center space-y-4">
                    <Cpu size={40} className="mx-auto text-slate-800" />
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No matching neural nodes found</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-4 font-sans bg-indigo-950/15 border border-indigo-500/10 p-6 rounded-[28px] text-left">
                  <div className="flex items-center gap-2">
                    <History size={13} className="text-indigo-400 stroke-[2.5]" />
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em] font-outfit">Neural Search History</h4>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {searchHistory.map((term, i) => (
                      <button 
                        key={i} 
                        onClick={() => setSearchQuery(term)} 
                        className="px-4 py-2 bg-slate-900 hover:bg-indigo-600/15 border border-slate-850 hover:border-indigo-500/20 rounded-2xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer transition-all active:scale-95 text-left flex items-center gap-2 font-sans"
                      >
                        <span className="text-slate-600">#</span> {term}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] ml-2">Trending Neural Nodes</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: '#StoicGrowth', count: '12.4k active' },
                      { label: '#BiohackSync', count: '8.2k active' },
                      { label: '#NeuralArt', count: '15.1k active' },
                      { label: '#FocusFlow', count: '22k active' },
                    ].map((tag, i) => (
                      <button key={i} onClick={() => setSearchQuery(tag.label)} className="bg-slate-900/40 border border-slate-800 p-6 rounded-[28px] text-left hover:border-indigo-500/30 transition-all hover:bg-slate-900 group">
                        <p className="text-white font-bold text-sm mb-1 group-hover:text-indigo-400 transition-colors">{tag.label}</p>
                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{tag.count}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] ml-2">Recommended Entities</h4>
                  <div className="space-y-4">
                    {[
                      { name: 'Dr. Neural', bio: 'AI Safety & Neural Optimization', avatar: 'https://i.pravatar.cc/150?u=drneural' },
                      { name: 'Growth Engine', bio: 'Scaling your output 10x', avatar: 'https://i.pravatar.cc/150?u=growth' },
                    ].map((user, i) => {
                      const isUserFollowed = followedCreators.some(c => c.name.toLowerCase() === user.name.toLowerCase());
                      return (
                        <div key={i} className="bg-slate-900/40 border border-slate-800 p-4 rounded-[32px] flex items-center justify-between hover:bg-slate-900/60 transition-all cursor-pointer group" onClick={() => openChannelProfile(user.name, user.avatar)}>
                          <div className="flex items-center gap-4">
                            <img src={user.avatar} className="w-12 h-12 rounded-2xl object-cover border border-slate-800" />
                            <div>
                              <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{user.name}</p>
                              <p className="text-[10px] text-slate-500 font-medium">{user.bio}</p>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRecommendedFollow(user.name, user.avatar, user.bio);
                            }}
                            className={`px-5 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all border ${
                              isUserFollowed 
                                ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400 font-bold' 
                                : 'bg-white text-slate-950 hover:bg-indigo-50 border-white'
                            }`}
                          >
                            {isUserFollowed ? 'Synced' : 'Sync'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        );
      case 'circles':
        return (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="bg-slate-950 p-4 pb-0 space-y-4">
              {activeTab === 'For You' && (
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
                  {INITIAL_STORIES.map(story => (
                    <div key={story.id} className="flex flex-col items-center gap-2 min-w-[72px] cursor-pointer group" onClick={() => openChannelProfile(story.name, story.avatar)}>
                      <div className={`p-[2px] rounded-2xl ${story.viewed ? 'bg-slate-800' : 'bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500'}`}><div className="p-[2px] bg-slate-950 rounded-[14px]"><img src={story.avatar} className="w-14 h-14 rounded-xl object-cover border border-slate-800" /></div></div>
                      <span className="text-[10px] font-bold text-slate-500 truncate w-full text-center uppercase tracking-tight">{story.name}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-center gap-12 border-t border-slate-900 pt-2 pb-4">
                {(['For You', 'Following'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`text-[10px] font-bold uppercase tracking-[0.2em] relative py-2 transition-all ${activeTab === tab ? 'text-white' : 'text-slate-600 hover:text-slate-400'}`}>{tab}{activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-full" />}</button>
                ))}
              </div>
               {activeTab === 'Following' ? (
              <div className="p-4 pt-0 space-y-6 pb-32 animate-in fade-in duration-500">
                {/* Uplinks List */}
                <div className="space-y-4">
                  {followedCreators.length === 0 ? (
                    <div className="bg-slate-900/30 border border-slate-900 rounded-[32px] p-8 text-center space-y-4">
                      <div className="w-16 h-16 bg-slate-800/40 rounded-full flex items-center justify-center text-slate-500 mx-auto border border-slate-800">
                        <Activity size={24} className="opacity-60" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white uppercase tracking-wider">No active telemetry found</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-tighter max-w-xs mx-auto leading-normal">
                          All connection relays have been deactivated. Re-sync in the main feed.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setFollowingSearch('');
                          setActiveTab('For You');
                        }}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-[9px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-md mt-2"
                      >
                        Scan For You Feed
                      </button>
                    </div>
                  ) : (
                    followedCreators
                      .map(creator => (
                        <div 
                           key={creator.id}
                           className="bg-slate-900/40 backdrop-blur-xl border border-slate-900 rounded-[32px] p-5 hover:border-slate-800 transition-all duration-500 group relative flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl"
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            {/* Avatar with Glow status */}
                            <div className="relative cursor-pointer" onClick={() => openChannelProfile(creator.name, creator.avatar)}>
                              <div className={`p-[2px] rounded-2xl ${creator.isLive ? 'bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-slate-800'}`}>
                                <div className="p-[2.5px] bg-slate-950 rounded-[14px]">
                                  <img src={creator.avatar} className="w-12 h-12 rounded-xl object-cover border border-slate-800" />
                                </div>
                              </div>
                              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-950 ${
                                creator.isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                              }`} />
                            </div>

                            {/* Creator Metadata */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2.5">
                                <h3 
                                  onClick={() => openChannelProfile(creator.name, creator.avatar)}
                                  className="font-bold text-sm text-white hover:text-indigo-400 transition-colors uppercase tracking-tight"
                                >
                                  {creator.name}
                                </h3>
                                <span className="text-[8px] text-slate-500 font-bold uppercase font-mono px-2 py-0.5 bg-slate-950 rounded-md border border-slate-900">
                                  {creator.category}
                                </span>
                              </div>
                              {!creator.status.toLowerCase().includes('architect') && (
                                <p className="text-xs text-slate-300 font-medium tracking-tight">
                                  {creator.status}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Hub */}
                          <div className="flex items-center gap-3 self-end md:self-center pr-2">
                            <button
                              onClick={() => openChat(creator.name)}
                              className="p-3 bg-slate-950 hover:bg-indigo-600/10 border border-slate-800 text-slate-400 hover:text-indigo-400 rounded-2xl active:scale-95 transition-all"
                              title="Send Message"
                            >
                              <MessageSquare size={16} />
                            </button>

                            <button
                              onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(10);
                                if (showToast) showToast(`Relay signal with ${creator.name} decoupled`, "info");
                                
                                if (onToggleFollow) {
                                  onToggleFollow(creator.name);
                                }

                                setFollowedCreators(prev => prev.filter(c => c.name.toLowerCase() !== creator.name.toLowerCase()));
                                setSuggestedCreators(prev => [
                                  ...prev,
                                  {
                                    id: creator.id,
                                    name: creator.name,
                                    avatar: creator.avatar,
                                    status: creator.status,
                                    timeLeft: creator.timeLeft,
                                    syncScore: creator.syncScore,
                                    streak: creator.streak,
                                    isLive: creator.isLive,
                                    category: creator.category
                                  }
                                ]);
                              }}
                              className="p-3 bg-slate-950/20 hover:bg-rose-500/10 border border-slate-900 text-slate-500 hover:text-rose-400 rounded-2xl active:scale-95 transition-all"
                              title="Disconnect Link"
                            >
                              <UserCheck size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                {/* End of Uplinks List */}
              </div>
            ) : (
              <div className="p-4 pt-0 space-y-6 pb-32">
                <div className="bg-indigo-600/5 border border-indigo-500/10 rounded-[28px] p-5 flex flex-col gap-4 mb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-400">
                        {isPersonalizing ? <Loader2 className="animate-spin" size={18} /> : <Filter size={18} />}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-white uppercase tracking-widest">
                          {isPersonalizing ? 'Sorting Feed...' : 'Smart Filter On'}
                        </p>
                        <p className="text-[9px] text-slate-500 mt-0.5 uppercase tracking-tighter">
                          {isPersonalizing ? 'Finding the best posts for you...' : 'Showing your favorite topics first.'}
                        </p>
                      </div>
                    </div>
                    {noiseCount > 0 && <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-full flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest"><EyeOff size={10} /> {noiseCount} Hidden</div>}
                  </div>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">{INTEREST_CHIPS.map(chip => (<button key={chip} onClick={() => setActiveChip(chip)} className={`px-5 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all border whitespace-nowrap ${activeChip === chip ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}>{chip}</button>))}</div>
                </div>

                {videoPosts.map(post => {
                  const isSaved = savedPostIds.has(post.id);
                  const isPurchased = purchasedPostIds.has(post.id);
                  const isCourse = post.type === 'educational' && post.price !== undefined;
                  const isVideo = !!post.videoUrl;
                  return (
                    <article key={post.id} className={`${post.gradientClass || 'bg-slate-900/40'} border border-slate-900 rounded-[32px] overflow-hidden group hover:border-slate-800 transition-all duration-500 shadow-xl relative`}>
                      <div className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative cursor-pointer" onClick={() => openChannelProfile(post.creator, post.avatar)}>
                            <img src={post.avatar} className="w-10 h-10 rounded-xl object-cover border border-slate-800" />
                            <div className="absolute -top-1 -right-1 bg-emerald-500 w-2.5 h-2.5 rounded-full border-2 border-slate-950" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => openChannelProfile(post.creator, post.avatar)} className="font-bold text-sm text-white hover:text-indigo-400 transition-colors">{post.creator}</button>
                              <button onClick={() => handleFollow(post.id)} className={`p-1 rounded-full transition-all flex items-center justify-center ${post.isFollowing ? 'text-indigo-400 bg-indigo-400/10' : 'text-slate-500 hover:text-white'}`}>{post.isFollowing ? <UserCheck size={12} /> : <UserPlus size={12} />}</button>
                            </div>
                            <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{post.type} • 2h ago</div>
                          </div>
                        </div>
                        <div className="relative">
                          <button onClick={() => setActivePostMenuId(activePostMenuId === post.id ? null : post.id)} className={`text-slate-600 hover:text-white p-2 rounded-full transition-all ${activePostMenuId === post.id ? 'bg-slate-800 text-white' : ''}`}><MoreHorizontal size={20} /></button>
                          {activePostMenuId === post.id && (
                            <div ref={postMenuRef} className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in zoom-in-95 duration-200">
                               <button onClick={() => handleCopyLink()} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-all group"><Link size={14} className="text-slate-500 group-hover:text-indigo-400" /><span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Copy Neural Link</span></button>
                               <button onClick={() => { if(showToast) showToast("Asset saved to local node", "success"); setActivePostMenuId(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-all group"><Download size={14} className="text-slate-500 group-hover:text-emerald-400" /><span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Download Asset</span></button>
                               <button onClick={() => handleMute(post.creator)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-all group"><VolumeX size={14} className="text-slate-500 group-hover:text-amber-400" /><span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Mute Signal</span></button>
                               <div className="h-px bg-slate-800 my-1 mx-2" />
                               <button onClick={() => handleReport(post.id)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-rose-500/10 rounded-xl transition-all group text-rose-500"><Flag size={14} /><span className="text-[10px] font-bold uppercase tracking-widest">Report Node</span></button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-5 pb-4">
                        <p className="text-sm text-slate-200 leading-relaxed mb-4 font-medium">{post.content}</p>
                        {(post.image || post.videoUrl) && (
                          <div className={`aspect-[16/9] relative rounded-[24px] overflow-hidden border border-slate-800 bg-black group/video`} onDoubleClick={() => handleLike(post.id)}>
                            {activeFlyingHearts.filter(h => h.postId === post.id).map(h => (
                              <div 
                                key={h.id}
                                className="absolute bottom-10 left-1/2 -translate-x-1/2 text-rose-500 pointer-events-none z-50 animate-fly-up"
                                style={{ 
                                  left: `calc(50% + ${h.left}px)`,
                                  fontSize: `${h.size}px`,
                                  animationDuration: `${h.duration}s`,
                                  animationDelay: `${h.delay}s`
                                } as React.CSSProperties}
                              >
                                <Heart fill="currentColor" />
                              </div>
                            ))}
                            {isVideo ? (
                              <div className="w-full h-full relative">
                                <video src={post.videoUrl} poster={post.image} className="w-full h-full object-cover" controls={playingVideoId === post.id} onPlay={() => setPlayingVideoId(post.id)} onPause={() => setPlayingVideoId(null)} />
                                {playingVideoId !== post.id && (
                                  <div onClick={() => setPlayingVideoId(post.id)} className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer opacity-0 group-hover/video:opacity-100 transition-opacity z-10">
                                    <div className="w-16 h-16 bg-white/20 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-white scale-90 group-hover/video:scale-100 transition-transform shadow-2xl"><Play fill="currentColor" size={32} className="ml-1" /></div>
                                  </div>
                                )}
                              </div>
                            ) : (<img src={post.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />)}
                            {isCourse && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playLocalSynth('tap');
                                  setSelectedCoursePost(post);
                                }}
                                title="View Course Details"
                                className="absolute top-4 right-4 bg-slate-950/90 backdrop-blur-md hover:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800 hover:border-slate-700 text-[10px] font-bold text-white uppercase tracking-widest shadow-2xl flex items-center gap-2 z-20 transition-all cursor-pointer group/badge"
                              >
                                <Zap size={10} className="text-orange-400 group-hover/badge:scale-125 transition-transform" /> Course Asset
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="px-5 pb-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <button onClick={() => handleLike(post.id)} className={`flex items-center gap-1.5 transition-all p-2 rounded-xl ${post.hasLiked ? 'text-rose-500 bg-rose-500/5' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-500/5'}`}><Heart size={20} fill={post.hasLiked ? 'currentColor' : 'none'} /><span className="text-[11px] font-mono font-bold">{post.likes}</span></button>
                            <button onClick={() => openChat(post.creator)} className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-400 p-2 rounded-xl hover:bg-indigo-500/5 transition-all"><MessageCircle size={20} /><span className="text-[11px] font-mono font-bold">12</span></button>
                            <div className="relative">
                              <button onClick={() => setActiveSharePost(post)} className={`flex items-center gap-1.5 text-slate-400 hover:text-white p-2 rounded-xl transition-all ${activeSharePost?.id === post.id ? 'bg-indigo-600/10 text-indigo-400' : ''}`}><Share2 size={20} /></button>
                            </div>
                            <button onClick={() => onToggleSave(post.id)} className={`flex items-center gap-1.5 p-2 rounded-xl transition-all ${isSaved ? 'text-amber-500 bg-amber-500/5' : 'text-slate-400 hover:text-amber-400'}`}><Bookmark size={20} fill={isSaved ? 'currentColor' : 'none'} /></button>
                          </div>
                          <button onClick={() => { if (onInteraction) onInteraction(post.id, 'view'); setExpandedReasonId(expandedReasonId === post.id ? null : post.id); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[9px] font-bold uppercase tracking-widest ${expandedReasonId === post.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-200'}`}><Cpu size={12} />Why Me?</button>
                        </div>
                        {expandedReasonId === post.id && <div className="mt-4 p-5 bg-slate-950 border border-indigo-500/20 rounded-3xl animate-in zoom-in-95 duration-200"><h5 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2"><ArrowUpRight size={14} /> Relevance</h5><p className="text-[11px] text-slate-300 font-medium leading-relaxed italic pr-8">"{post.relevanceReason || "Our AI thinks this matches your goals."}"</p></div>}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}            </div>
          </div>
        );
      case 'moments':
        return (
          <div className="flex-1 overflow-y-auto snap-y snap-mandatory custom-scrollbar h-full bg-black">
            {reelPosts.map(reel => (
              <div key={reel.id} className="h-full w-full snap-start relative flex flex-col justify-end p-6 min-h-[500px]">
                <img src={reel.image} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                
                {reel.videoUrl && (
                  <video 
                    src={reel.videoUrl} 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="absolute inset-0 w-full h-full object-cover opacity-90"
                  />
                )}

                <div className="relative z-10 space-y-4 mb-20 max-w-sm">
                  <div className="flex items-center gap-3">
                    <img src={reel.avatar} className="w-10 h-10 rounded-xl border border-white/20 cursor-pointer" onClick={() => openChannelProfile(reel.creator, reel.avatar)} />
                    <span className="text-sm font-bold text-white tracking-tight cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => openChannelProfile(reel.creator, reel.avatar)}>{reel.creator}</span>
                    <button onClick={() => openChannelProfile(reel.creator, reel.avatar)} className="px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/20 transition-all">Connect</button>
                  </div>
                  <p className="text-sm text-slate-200 font-medium leading-relaxed">{reel.content}</p>
                </div>
                <div className="absolute right-4 bottom-32 flex flex-col gap-8 items-center text-white">
                  <button onClick={() => handleLike(reel.id)} className="flex flex-col items-center gap-1 group">
                    <div className={`p-3 rounded-full backdrop-blur-md border transition-all ${reel.hasLiked ? 'bg-rose-500 text-white border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]' : 'bg-white/5 border-white/10 group-hover:bg-rose-500 group-hover:text-white'}`}>
                      <Heart size={24} fill={reel.hasLiked ? 'currentColor' : 'none'} />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${reel.hasLiked ? 'text-rose-500' : 'text-white'}`}>{reel.likes}</span>
                  </button>
                  <button className="flex flex-col items-center gap-1 group" onClick={() => openChat(reel.creator)}><div className="p-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 group-hover:bg-indigo-500 transition-all"><MessageCircle size={24} /></div><span className="text-[10px] font-bold uppercase tracking-widest">124</span></button>
                  <button className="flex flex-col items-center gap-1 group" onClick={() => setActiveSharePost(reel)}><div className="p-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 group-hover:bg-slate-700 transition-all"><Share2 size={24} /></div></button>
                  <div className="w-10 h-10 rounded-xl border-2 border-white/20 overflow-hidden animate-[spin_10s_linear_infinite] mt-4 cursor-pointer" onClick={() => openChannelProfile(reel.creator, reel.avatar)}><img src={reel.avatar} className="w-full h-full object-cover" /></div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'signals':
        if (activeSession) {
          const isComplete = activeSession.timeLeft === 0;

          if (activeSignalGroupId) {
            // BOTH are active! Let's render the Focus Session card AND the Discussion feed below it.
            const currentGroup = SIGNAL_GROUPS_LIST.find(g => g.id === activeSignalGroupId);
            
            const isDeepWork = currentGroup?.id === 'deep-work';
            const isStartup = currentGroup?.id === 'startup-builders';
            
            const aiEngineTopics = isDeepWork 
              ? ["Ultradian 90-Min Focus Cycles", "Sound Wave Blockouts", "HRV Coherent Breathing"]
              : isStartup 
              ? ["Early Waitlist Channel Validation", "Fast Landing MVP Sprints", "Co-Founder Sourcing Dynamics"]
              : ["Second Brain Semantic Systems", "Flat Domain Tagging Models", "Stoicism Practice Integration"];

            const aiEngineTrends = isDeepWork
              ? "Cognitive Velocity in active focus cycles increased by +14% this week. Popular focus intervals shift from standard Pomodoro (25m) towards Ultradian integration."
              : isStartup
              ? "Customer interaction mapping holds +22% higher engagement than pure building updates. Direct LinkedIn qualitative feedback is yielding highest value signals."
              : "Topic maps using non-nested structures are solving clutter issues. Common interest overlaps include AI ethics and decentralized scaling models.";

            const aiEngineResources = isDeepWork
              ? ["Focus wave generator settings", "90/20 pacing schedule sheet"]
              : isStartup
              ? ["Landing page Waitlist copy playbook", "Qualitative Outreach template"]
              : ["Flat tag metadata architecture cheatsheet", "Digital garden templates"];

            const groupDiscussions = discussions
              .filter(d => d.groupId === activeSignalGroupId)
              .filter(d => discussionFilter === 'All' || d.category === discussionFilter)
              .sort((a, b) => getDiscussionRankScore(b) - getDiscussionRankScore(a));

            return (
              <div className="h-full flex flex-col p-4 animate-in zoom-in-95 duration-700 overflow-hidden w-full relative">
                {/* 1. Particles / Ambient Aura Background */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-indigo-400 rounded-full"
                      initial={{ x: Math.random() * 100 + '%', y: '110%', opacity: 0 }}
                      animate={{ 
                        y: '-10%', 
                        opacity: [0, 1, 1, 0],
                        x: (Math.random() * 100 + (Math.sin(i) * 10)) + '%'
                      }}
                      transition={{ 
                        duration: 10 + Math.random() * 20, 
                        repeat: Infinity, 
                        delay: Math.random() * 10,
                        ease: "linear"
                      }}
                    />
                  ))}
                </div>

                {/* Header Section */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3 shrink-0">
                  <button 
                    onClick={() => setActiveSignalGroupId?.(null)}
                    className="flex items-center gap-2 text-[9px] font-bold text-indigo-400 uppercase tracking-widest bg-slate-900/60 border border-white/5 px-4 py-2 rounded-2xl hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <ChevronLeft size={12} /> Back to Signals
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-slate-950/50 border border-white/5 rounded-lg shrink-0">{currentGroup?.icon}</span>
                    <span className="text-xs font-bold text-white tracking-tight">{currentGroup?.name} Feed</span>
                  </div>
                </div>

                {/* Side-by-Side Flex Layout */}
                <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden min-h-0">
                  
                  {/* Left Column: Focus Card */}
                  <div className="w-full md:w-[260px] shrink-0 flex flex-col min-h-0">
                    <div className="flex-1 bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[32px] p-5 flex flex-col items-center justify-between text-center shadow-[0_0_80px_rgba(99,102,241,0.05)] relative overflow-hidden group min-h-0">
                       {/* Atmosphere Glow */}
                       <div className={`absolute -top-20 -left-20 w-40 h-40 rounded-full blur-[80px] transition-colors duration-1000 ${activeSession.type === 'focus' ? 'bg-indigo-500/20' : 'bg-emerald-500/20'}`} />
                       
                       {/* Floating Reactions Layer */}
                       <div className="absolute inset-0 pointer-events-none">
                          <AnimatePresence>
                            {activeReactions.map(r => (
                              <motion.div 
                                key={r.id}
                                initial={{ y: 0, opacity: 0, x: r.x + '%' }}
                                animate={{ y: -200, opacity: [0, 1, 1, 0] }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 2, ease: "easeOut" }}
                                className="absolute bottom-10"
                              >
                                <span className="text-3xl drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{r.emoji}</span>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                       </div>

                       <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="relative shrink-0"
                       >
                          <div className={`w-32 h-32 rounded-full border-2 transition-all duration-1000 ${activeSession.type === 'focus' ? 'border-indigo-500/10 shadow-[0_0_40px_rgba(99,102,241,0.1)]' : 'border-emerald-500/10 shadow-[0_0_40px_rgba(52,211,153,0.1)]'} flex items-center justify-center`}>
                             <motion.div 
                              animate={{ scale: [1, 1.05, 1] }} 
                              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                              className={`text-4xl font-medium font-mono tracking-tight ${activeSession.type === 'focus' ? 'text-white' : 'text-emerald-400'}`}
                             >
                                {formatTime(activeSession.timeLeft)}
                             </motion.div>
                          </div>
                          {activeSession.timeLeft > 0 && (
                             <svg className="absolute inset-0 w-32 h-32 -rotate-90">
                                <motion.circle 
                                  cx="64" cy="64" r="61" 
                                  fill="none" stroke="currentColor" strokeWidth="2" 
                                  className={activeSession.type === 'focus' ? 'text-indigo-500' : 'text-emerald-500'}
                                  initial={{ strokeDasharray: 383, strokeDashoffset: 383 }}
                                  animate={{ strokeDashoffset: 383 * (1 - activeSession.timeLeft / activeSession.totalTime) }}
                                  transition={{ duration: 1, ease: "linear" }}
                                  strokeLinecap="round"
                                />
                             </svg>
                          )}
                       </motion.div>

                       <div className="space-y-2.5 relative z-10 w-full flex-1 flex flex-col justify-center">
                          <h3 className={`text-lg font-bold tracking-tight font-outfit transition-all duration-1000 ${isComplete ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]' : 'text-white'}`}>
                             {isComplete ? (activeSession.type === 'focus' ? 'Neural Link Optimized' : 'Rest Complete') : activeSession.type === 'focus' ? 'Neural Focus Active' : 'Neural Reboot'}
                          </h3>
                          
                          <div className="flex flex-col items-center gap-1.5">
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-1.5">
                               <span className="relative flex h-1.5 w-1.5">
                                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                 <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                               </span>
                               {activeSession.participants + (Math.floor(Math.random() * 3))} agents synced
                            </p>

                            <div className="flex -space-x-1.5 overflow-hidden opacity-60">
                              {[1, 2, 3, 4].map(i => (
                                <img key={i} className="inline-block h-5 w-5 rounded-full ring-1 ring-slate-900 object-cover" src={`https://i.pravatar.cc/50?u=sync${i}`} alt="" />
                              ))}
                            </div>
                          </div>

                          {isComplete ? (
                            <motion.div 
                              initial={{ y: 5, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              className="space-y-1 mt-1"
                            >
                              <p className="text-[10px] text-emerald-400/90 font-medium leading-tight px-2">
                                 {activeSession.type === 'focus' 
                                   ? getHumanizedMessage(activeSession.isSyncSession ? 'social' : 'focus-complete')
                                   : "Deep recovery achieved. Ready?"}
                              </p>
                            </motion.div>
                          ) : (
                            <div className="mt-1 space-y-1">
                               <AnimatePresence mode="wait">
                                 <motion.p 
                                  key={socialEvents[0]?.id}
                                  initial={{ opacity: 0, y: 3 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -3 }}
                                  className="text-[8px] text-indigo-400/60 font-bold uppercase tracking-widest"
                                 >
                                    {socialEvents[0]?.text || 'Syncing neural patterns...'}
                                 </motion.p>
                               </AnimatePresence>
                            </div>
                          )}
                       </div>

                       <div className="w-full space-y-3 mt-2 shrink-0">
                          {!isComplete && (
                            <div className="flex justify-center gap-4">
                              {['🔥', '⚡', '🌊'].map(emoji => (
                                <button 
                                  key={emoji}
                                  onClick={() => {
                                    const newReaction = { id: `u-${Date.now()}`, emoji, x: 30 + Math.random() * 40 };
                                    setActiveReactions(r => [...r, newReaction]);
                                    setTimeout(() => setActiveReactions(r => r.filter(react => react.id !== newReaction.id)), 2000);
                                  }}
                                  className="bg-white/5 hover:bg-white/10 active:scale-95 transition-all w-10 h-10 rounded-xl flex items-center justify-center text-lg border border-white/5"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="w-full flex flex-col gap-2">
                             {isComplete ? (
                                <>
                                   <button 
                                     onClick={() => handleSignalAction('Continue')}
                                     className="w-full py-3.5 bg-white text-slate-950 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all hover:bg-white/90"
                                   >
                                      Continue Flow
                                   </button>
                                   <button 
                                     onClick={() => handleSignalAction('Break')}
                                     className="w-full py-3.5 bg-slate-950/40 border border-white/5 text-slate-400 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] active:scale-95 transition-all hover:text-white"
                                   >
                                      Enter Recovery
                                   </button>
                                </>
                             ) : (
                                <button 
                                  onClick={() => handleSignalAction('Reset')}
                                  className="w-full py-2.5 text-slate-600 hover:text-rose-500/80 rounded-xl text-[9px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                                >
                                   Disconnect
                                </button>
                             )}
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Right Column: AI summary, filter chips, discussions feed & comment box */}
                  <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
                    
                    {/* AI Discussion Engine Card */}
                    <div className="p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-[24px] space-y-2 relative overflow-hidden shrink-0">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-indigo-400 animate-pulse shrink-0" />
                        <h4 className="text-[9px] font-bold text-indigo-300 uppercase tracking-[0.2em] text-left">Nexora AI Discussion Engine</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Frequently Discussed Topics</p>
                          <div className="flex flex-wrap gap-1">
                            {aiEngineTopics.map(topic => (
                              <span key={topic} className="text-[7.5px] font-bold text-white bg-slate-950/40 border border-white/5 px-1.5 py-0.5 rounded">{topic}</span>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Helpful Resources Shared</p>
                          <div className="flex flex-wrap gap-1">
                            {aiEngineResources.map(res => (
                              <span key={res} className="text-[7.5px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">✦ {res}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="p-2 bg-slate-950/30 rounded-xl border border-white/5 text-left space-y-0.5">
                        <p className="text-[7.5px] font-bold text-indigo-400 uppercase tracking-widest leading-none">Emerging Trend Summary</p>
                        <p className="text-[9px] text-slate-300 leading-normal font-semibold">{aiEngineTrends}</p>
                      </div>
                    </div>

                    {/* Filter chips */}
                    <div className="flex items-center justify-between gap-2 bg-slate-900/20 p-2 rounded-2xl border border-white/5 shrink-0 overflow-x-auto no-scrollbar">
                      <div className="flex gap-1 overflow-x-auto no-scrollbar">
                        {(['All', 'Questions', 'Ideas', 'Knowledge', 'Updates', 'Resources', 'Discussions'] as const).map(cat => (
                          <button
                            key={cat}
                            onClick={() => setDiscussionFilter(cat)}
                            className={`px-2.5 py-1 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all border shrink-0 whitespace-nowrap cursor-pointer ${
                              discussionFilter === cat 
                              ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' 
                              : 'bg-slate-950/40 border-white/5 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          const next = !qualityOnlyFilter;
                          setQualityOnlyFilter(next);
                          if (showToast) showToast(next ? 'AI Quality Optimization Enabled' : 'Standard Feed Enabled', 'info');
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[8px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          qualityOnlyFilter 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 animate-pulse shrink-0' 
                          : 'bg-slate-950/40 border-white/5 text-slate-500 hover:text-slate-300 shrink-0'
                        }`}
                      >
                        <Sparkles size={10} /> Sorting
                      </button>
                    </div>

                    {/* Thread list - ONLY this section scrolls vertically! */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 min-h-0 pr-1">
                      {groupDiscussions.length === 0 ? (
                        <div className="text-center p-8 bg-slate-900/10 border border-dashed border-white/5 rounded-[24px]">
                          <p className="text-[10px] text-slate-500 font-semibold">No discussions match this filter. Be the first to start the synchrony!</p>
                        </div>
                      ) : (
                        groupDiscussions.map(disc => {
                          const snippet = disc.text.length > 120 ? `${disc.text.substring(0, 120)}...` : disc.text;
                          const rankScore = getDiscussionRankScore(disc).toFixed(0);

                          return (
                            <div 
                              key={disc.id}
                              onClick={() => {
                                setActiveDiscussionId(disc.id);
                                setReplyingToId(null);
                              }}
                              className="p-4 bg-slate-900/30 hover:bg-slate-900/50 border border-white/5 hover:border-indigo-500/20 rounded-2xl transition-all duration-300 cursor-pointer space-y-2 relative group"
                            >
                              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                                <span className="text-[7px] font-mono uppercase px-1.5 py-0.5 bg-slate-950/60 text-indigo-400 border border-white/5 rounded flex items-center gap-0.5 font-bold">
                                  Resonance: {rankScore}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <img src={disc.authorAvatar} alt={disc.authorName} className="w-6 h-6 rounded-lg object-cover border border-white/10" referrerPolicy="no-referrer" />
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-200">{disc.authorName}</span>
                                    <span className="text-[7px] font-mono uppercase tracking-widest px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded font-bold">
                                      {disc.category}
                                    </span>
                                  </div>
                                  <span className="text-[7px] font-mono text-slate-500">
                                    {new Date(disc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>

                              <p className="text-[10px] text-slate-300 leading-relaxed font-semibold">{snippet}</p>

                              <div className="flex items-center gap-3 pt-0.5 text-[9px] font-mono text-slate-500">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLikeDiscussion(disc.id);
                                  }}
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all cursor-pointer ${
                                    disc.hasLiked ? 'text-rose-400 bg-rose-500/10' : 'hover:text-slate-300'
                                  }`}
                                >
                                  <Heart size={10} className={disc.hasLiked ? 'fill-rose-400' : ''} />
                                  {disc.likes}
                                </button>
                                <span className="flex items-center gap-1">
                                  <MessageSquare size={10} />
                                  {disc.replies.length}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Comment composer box - locked to bottom of column, always visible */}
                    <div className="bg-slate-950/60 border border-white/5 rounded-3xl p-3 space-y-2 shrink-0">
                       <div className="flex bg-slate-950/40 p-0.5 rounded-xl border border-white/5 gap-1 max-w-sm mx-auto w-full">
                         {(['comment', 'talk', 'idea', 'ask'] as const).map((type) => {
                           const typeLabels = {
                             comment: 'Comment',
                             talk: 'Talk',
                             idea: 'Idea',
                             ask: 'Ask'
                           };
                           return (
                             <button
                               key={type}
                               type="button"
                               onClick={() => {
                                 setSelectedCommentType(type);
                                 playLocalSynth('tap');
                                }}
                               className={`flex-1 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                 selectedCommentType === type 
                                   ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 shadow' 
                                   : 'text-slate-500 hover:text-slate-300'
                               }`}
                             >
                               {typeLabels[type]}
                             </button>
                           );
                         })}
                       </div>

                       <form onSubmit={handleSendFocusComment} className="relative flex items-center max-w-md mx-auto w-full font-sans">
                         <input 
                           type="text"
                           placeholder={`Broadcast a ${selectedCommentType} to group live...`}
                           value={focusCommentInput}
                           onChange={(e) => setFocusCommentInput(e.target.value)}
                           className="w-full bg-slate-900 border border-white/5 rounded-xl py-2.5 pl-3 pr-8 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/20 transition-all font-sans"
                         />
                         <button 
                           type="submit"
                           className="absolute right-1.5 p-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500 hover:text-white active:scale-95 transition-all cursor-pointer"
                         >
                           <Send size={10} />
                         </button>
                       </form>

                       {/* Preset Presets row */}
                       <div className="flex items-center gap-1.5 max-w-md mx-auto w-full">
                         <span className="text-[7.5px] font-bold font-mono text-slate-500 uppercase tracking-wider shrink-0">
                           Presets:
                         </span>
                         <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                           {(() => {
                             const presets = {
                               comment: ['Focused! 🎯', 'In the flow 🌊', 'Crushing it 🚀'],
                               talk: ['Deep focus active', 'Quiet zone here', 'Ambient loops on'],
                               idea: ['Pomodoro rule 💡', 'Mute all alerts', 'Posture check!'],
                               ask: ['Any developers here?', 'How is output?', 'Time to hydrate?']
                             };
                             return presets[selectedCommentType].map((presetText) => (
                               <button
                                 key={presetText}
                                 type="button"
                                 onClick={() => handleSendPresetComment(presetText, selectedCommentType)}
                                 className="px-2 py-1 bg-slate-950/60 border border-white/5 hover:border-indigo-500/20 hover:text-indigo-300 active:scale-95 transition-all rounded-lg text-[8px] font-mono text-slate-400 whitespace-nowrap cursor-pointer shadow-inner animate-none"
                               >
                                 {presetText}
                               </button>
                             ));
                           })()}
                         </div>
                       </div>
                    </div>

                  </div>

                </div>
              </div>
            );
          }

          return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in zoom-in-95 duration-700 pb-40">
              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-indigo-400 rounded-full"
                    initial={{ x: Math.random() * 100 + '%', y: '110%', opacity: 0 }}
                    animate={{ 
                      y: '-10%', 
                      opacity: [0, 1, 1, 0],
                      x: (Math.random() * 100 + (Math.sin(i) * 10)) + '%'
                    }}
                    transition={{ 
                      duration: 10 + Math.random() * 20, 
                      repeat: Infinity, 
                      delay: Math.random() * 10,
                      ease: "linear"
                    }}
                  />
                ))}
              </div>

              <div className="w-full max-w-sm bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[48px] p-6 flex flex-col items-center text-center space-y-6 shadow-[0_0_80px_rgba(99,102,241,0.05)] relative overflow-hidden group">
                 {/* Atmosphere Glow */}
                 <div className={`absolute -top-20 -left-20 w-40 h-40 rounded-full blur-[80px] transition-colors duration-1000 ${activeSession.type === 'focus' ? 'bg-indigo-500/20' : 'bg-emerald-500/20'}`} />
                 
                 {/* Floating Reactions Layer */}
                 <div className="absolute inset-0 pointer-events-none">
                    <AnimatePresence>
                      {activeReactions.map(r => (
                        <motion.div 
                          key={r.id}
                          initial={{ y: 0, opacity: 0, x: r.x + '%' }}
                          animate={{ y: -200, opacity: [0, 1, 1, 0] }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 2, ease: "easeOut" }}
                          className="absolute bottom-10"
                        >
                          <span className="text-3xl drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{r.emoji}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                 </div>

                 <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative"
                 >
                    <div className={`w-40 h-40 rounded-full border-2 transition-all duration-1000 ${activeSession.type === 'focus' ? 'border-indigo-500/10 shadow-[0_0_40px_rgba(99,102,241,0.1)]' : 'border-emerald-500/10 shadow-[0_0_40px_rgba(52,211,153,0.1)]'} flex items-center justify-center`}>
                       <motion.div 
                        animate={{ scale: [1, 1.05, 1] }} 
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className={`text-5xl font-medium font-mono tracking-tight ${activeSession.type === 'focus' ? 'text-white' : 'text-emerald-400'}`}
                       >
                          {formatTime(activeSession.timeLeft)}
                       </motion.div>
                    </div>
                    {activeSession.timeLeft > 0 && (
                       <svg className="absolute inset-0 w-40 h-40 -rotate-90">
                          <motion.circle 
                            cx="80" cy="80" r="76" 
                            fill="none" stroke="currentColor" strokeWidth="2" 
                            className={activeSession.type === 'focus' ? 'text-indigo-500' : 'text-emerald-500'}
                            initial={{ strokeDasharray: 477, strokeDashoffset: 477 }}
                            animate={{ strokeDashoffset: 477 * (1 - activeSession.timeLeft / activeSession.totalTime) }}
                            transition={{ duration: 1, ease: "linear" }}
                            strokeLinecap="round"
                          />
                       </svg>
                    )}
                 </motion.div>

                 <div className="space-y-3 relative z-10 w-full">
                    <h3 className={`text-2xl font-bold tracking-tight font-outfit transition-all duration-1000 ${isComplete ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]' : 'text-white'}`}>
                       {isComplete ? (activeSession.type === 'focus' ? 'Neural Link Optimized' : 'Rest Complete') : activeSession.type === 'focus' ? 'Neural Focus Active' : 'Neural Reboot'}
                    </h3>
                    
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                         <span className="relative flex h-2 w-2">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                         </span>
                         {activeSession.participants + (Math.floor(Math.random() * 3))} agents synced now
                      </p>

                      <div className="flex -space-x-2 overflow-hidden opacity-60">
                        {[1, 2, 3, 4].map(i => (
                          <img key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 object-cover" src={`https://i.pravatar.cc/50?u=sync${i}`} alt="" />
                        ))}
                      </div>
                    </div>

                    {isComplete ? (
                      <motion.div 
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="space-y-2 mt-4"
                      >
                        <p className="text-[11px] text-emerald-400/90 font-medium leading-relaxed px-4">
                           {activeSession.type === 'focus' 
                             ? getHumanizedMessage(activeSession.isSyncSession ? 'social' : 'focus-complete')
                             : "Deep recovery achieved. Ready?"}
                        </p>
                      </motion.div>
                    ) : (
                      <div className="mt-4 space-y-2">
                         <AnimatePresence mode="wait">
                           <motion.p 
                            key={socialEvents[0]?.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-[9px] text-indigo-400/60 font-bold uppercase tracking-widest"
                           >
                              {socialEvents[0]?.text || 'Syncing neural patterns...'}
                           </motion.p>
                         </AnimatePresence>
                      </div>
                    )}
                 </div>

                 <div className="w-full space-y-6">
                    {!isComplete && (
                      <div className="flex justify-center gap-6">
                        {['🔥', '⚡', '🌊'].map(emoji => (
                          <button 
                            key={emoji}
                            onClick={() => {
                              const newReaction = { id: `u-${Date.now()}`, emoji, x: 30 + Math.random() * 40 };
                              setActiveReactions(r => [...r, newReaction]);
                              setTimeout(() => setActiveReactions(r => r.filter(react => react.id !== newReaction.id)), 2000);
                            }}
                            className="bg-white/5 hover:bg-white/10 active:scale-95 transition-all w-12 h-12 rounded-2xl flex items-center justify-center text-xl border border-white/5"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Neural Synaptic Keyboard & Composer */}
                    <div className="w-full space-y-3 pt-2 border-t border-white/5 text-left">
                       <div className="flex bg-slate-950/40 p-1 rounded-2xl border border-white/5 gap-1">
                         {(['comment', 'talk', 'idea', 'ask'] as const).map((type) => {
                           const typeLabels = {
                             comment: 'Comment',
                             talk: 'Talk',
                             idea: 'Idea',
                             ask: 'Ask'
                           };
                           return (
                             <button
                               key={type}
                               type="button"
                               onClick={() => {
                                 setSelectedCommentType(type);
                                 playLocalSynth('tap');
                               }}
                               className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                 selectedCommentType === type 
                                   ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 shadow' 
                                   : 'text-slate-500 hover:text-slate-300'
                               }`}
                             >
                               {typeLabels[type]}
                             </button>
                           );
                         })}
                       </div>

                       <form onSubmit={handleSendFocusComment} className="relative flex items-center">
                         <input 
                           type="text"
                           placeholder={`Broadcast a ${selectedCommentType}...`}
                           value={focusCommentInput}
                           onChange={(e) => setFocusCommentInput(e.target.value)}
                           className="w-full bg-slate-950/40 border border-white/5 rounded-2xl py-3 pl-4 pr-10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/20 transition-all font-sans"
                         />
                         <button 
                           type="submit"
                           className="absolute right-2 p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500 hover:text-white active:scale-95 transition-all cursor-pointer"
                         >
                           <Send size={11} />
                         </button>
                       </form>

                       {/* Quick Synaptic Keys (Mechanical Style Keypad) */}
                       <div className="space-y-1.5">
                         <div className="text-[8px] font-bold font-mono text-slate-500 uppercase tracking-wider">
                           Synaptic Presets:
                         </div>
                         <div className="grid grid-cols-3 gap-1.5">
                           {(() => {
                             const presets = {
                               comment: ['Focused! 🎯', 'In the flow 🌊', 'Crushing it 🚀'],
                               talk: ['Deep focus active', 'Quiet zone here', 'Ambient loops on'],
                               idea: ['Pomodoro rule 💡', 'Mute all alerts', 'Posture check!'],
                               ask: ['Any developers here?', 'How is output?', 'Time to hydrate?']
                             };
                             return presets[selectedCommentType].map((presetText) => (
                               <button
                                 key={presetText}
                                 type="button"
                                 onClick={() => handleSendPresetComment(presetText, selectedCommentType)}
                                 className="px-1.5 py-1.5 bg-slate-950/60 border border-white/5 hover:border-indigo-500/20 hover:text-indigo-300 active:scale-95 transition-all rounded-xl text-[9px] font-mono text-slate-400 text-center truncate cursor-pointer shadow-inner"
                               >
                                 {presetText}
                               </button>
                             ));
                           })()}
                         </div>
                       </div>
                    </div>

                    {/* Live Feed: Latest 3 Comments */}
                    <div className="w-full space-y-2 text-left pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Live Focus Comments</span>
                        </div>
                        <span className="text-[8px] font-mono text-slate-600">latest 3</span>
                      </div>

                      <div className="space-y-1.5 min-h-[140px] flex flex-col justify-end">
                        <AnimatePresence initial={false} mode="popLayout">
                          {focusComments.slice(0, 3).map((comment) => {
                            const typeColors = {
                              comment: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
                              talk: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
                              idea: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                              ask: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
                            };
                            return (
                              <motion.div
                                key={comment.id}
                                layout
                                initial={{ opacity: 0, x: -10, y: 5 }}
                                animate={{ opacity: 1, x: 0, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.25 }}
                                className="flex items-start gap-2 p-2 bg-slate-950/40 border border-white/5 rounded-xl text-left"
                              >
                                <img src={comment.authorAvatar} alt={comment.authorName} className="w-5 h-5 rounded-full object-cover border border-white/10 shrink-0" referrerPolicy="no-referrer" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-bold text-slate-200">{comment.authorName}</span>
                                    <span className={`text-[7px] font-mono font-bold uppercase px-1 rounded border scale-90 origin-left shrink-0 ${typeColors[comment.type]}`}>
                                      {comment.type}
                                    </span>
                                    <span className="text-[7px] font-mono text-slate-600 ml-auto shrink-0">
                                      {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-300 font-medium mt-0.5 break-words leading-tight">
                                    {comment.text}
                                  </p>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="w-full flex flex-col gap-3">
                        {isComplete ? (
                           <>
                              <button 
                                onClick={() => handleSignalAction('Continue')}
                                className="w-full py-5 bg-white text-slate-950 rounded-[28px] text-[11px] font-bold uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all hover:bg-white/90"
                              >
                                 Continue Flow
                              </button>
                              <button 
                                onClick={() => handleSignalAction('Break')}
                                className="w-full py-5 bg-slate-950/40 border border-white/5 text-slate-400 rounded-[28px] text-[11px] font-bold uppercase tracking-[0.2em] active:scale-95 transition-all hover:text-white"
                              >
                                 Enter Recovery
                              </button>
                           </>
                        ) : (
                           <button 
                             onClick={() => handleSignalAction('Reset')}
                             className="w-full py-4 text-slate-600 hover:text-rose-500/80 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                           >
                              Disconnect
                           </button>
                        )}
                    </div>
                 </div>
              </div>
            </div>
          );
        }

        if (activeSignalGroupId) {
          const currentGroup = SIGNAL_GROUPS_LIST.find(g => g.id === activeSignalGroupId);
          if (!currentGroup) {
            setActiveSignalGroupId?.(null);
            return null;
          }

          if (activeDiscussionId) {
            const currentDiscussion = discussions.find(d => d.id === activeDiscussionId);
            if (!currentDiscussion) {
              setActiveDiscussionId(null);
              return null;
            }

            return (
              <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-in fade-in duration-500 pb-48 custom-scrollbar">
                <button 
                  onClick={() => {
                    setActiveDiscussionId(null);
                    setReplyingToId(null);
                    setReplyingToAuthor(null);
                  }}
                  className="flex items-center gap-2 text-[9px] font-bold text-indigo-400 uppercase tracking-widest bg-slate-900/60 border border-white/5 px-4 py-2 rounded-2xl hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <ChevronLeft size={12} /> Back to Group Discussions
                </button>

                <div className="p-6 bg-slate-900/40 backdrop-blur-md border border-indigo-500/20 rounded-[32px] space-y-4 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={currentDiscussion.authorAvatar} alt={currentDiscussion.authorName} className="w-10 h-10 rounded-xl object-cover border border-white/10" referrerPolicy="no-referrer" />
                      <div>
                        <h4 className="text-sm font-bold text-white">{currentDiscussion.authorName}</h4>
                        <span className="text-[9px] font-mono text-slate-500">
                          {new Date(currentDiscussion.timestamp).toLocaleDateString()} at {new Date(currentDiscussion.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <span className="text-[8px] font-mono uppercase tracking-widest px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full font-bold">
                      {currentDiscussion.category}
                    </span>
                  </div>

                  <p className="text-sm text-slate-200 font-medium leading-relaxed">{currentDiscussion.text}</p>

                  <div className="flex items-center gap-6 pt-2 border-t border-white/5">
                    <button 
                      onClick={() => handleLikeDiscussion(currentDiscussion.id)}
                      className={`flex items-center gap-2 text-[10px] font-mono px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        currentDiscussion.hasLiked ? 'text-rose-400 bg-rose-500/10' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Heart size={14} className={currentDiscussion.hasLiked ? 'fill-rose-400' : ''} />
                      {currentDiscussion.likes} Likes
                    </button>
                    <span className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                      <MessageSquare size={14} />
                      {currentDiscussion.replies.length} Replies
                    </span>
                  </div>
                </div>

                <div className="space-y-4 text-left">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-2">Discussion Replies</h4>
                  {currentDiscussion.replies.length === 0 ? (
                    <div className="text-center p-8 bg-slate-900/10 border border-dashed border-white/5 rounded-3xl">
                      <p className="text-[11px] text-slate-500">No replies in this thread yet. Establish sync and contribute!</p>
                    </div>
                  ) : (
                    renderRepliesTree(currentDiscussion.replies, 0, currentDiscussion.id)
                  )}
                </div>

                <div id="reply-input-box" className="fixed bottom-0 left-0 right-0 p-6 bg-slate-950/95 backdrop-blur-xl border-t border-white/5 z-50 flex flex-col gap-3">
                  {replyingToId && (
                    <div className="flex items-center justify-between px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                      <span className="text-[9px] font-bold text-indigo-300">Replying to @{replyingToAuthor}</span>
                      <button onClick={() => { setReplyingToId(null); setReplyingToAuthor(null); }} className="text-slate-500 hover:text-white"><X size={12} /></button>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <input 
                      type="text"
                      value={newReplyText}
                      onChange={(e) => setNewReplyText(e.target.value)}
                      placeholder={replyingToId ? `Write a threaded reply...` : `Share your perspective on this discussion...`}
                      className="flex-1 bg-slate-900/60 border border-white/5 rounded-2xl px-5 py-3.5 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all font-medium placeholder:text-slate-500"
                      onKeyDown={(e) => { if (e.key === 'Enter') handlePostReply(currentDiscussion.id); }}
                    />
                    <button 
                      onClick={() => handlePostReply(currentDiscussion.id)}
                      disabled={!newReplyText.trim()}
                      className="px-6 bg-white text-slate-950 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white rounded-2xl font-bold uppercase tracking-widest text-[9px] flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      <Send size={12} /> Send
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          const isDeepWork = currentGroup.id === 'deep-work';
          const isStartup = currentGroup.id === 'startup-builders';
          
          const aiEngineTopics = isDeepWork 
            ? ["Ultradian 90-Min Focus Cycles", "Sound Wave Blockouts", "HRV Coherent Breathing"]
            : isStartup 
            ? ["Early Waitlist Channel Validation", "Fast Landing MVP Sprints", "Co-Founder Sourcing Dynamics"]
            : ["Second Brain Semantic Systems", "Flat Domain Tagging Models", "Stoicism Practice Integration"];

          const aiEngineTrends = isDeepWork
            ? "Cognitive Velocity in active focus cycles increased by +14% this week. Popular focus intervals shift from standard Pomodoro (25m) towards Ultradian integration."
            : isStartup
            ? "Customer interaction mapping holds +22% higher engagement than pure building updates. Direct LinkedIn qualitative feedback is yielding highest value signals."
            : "Topic maps using non-nested structures are solving clutter issues. Common interest overlaps include AI ethics and decentralized scaling models.";

          const aiEngineResources = isDeepWork
            ? ["Focus wave generator settings", "90/20 pacing schedule sheet"]
            : isStartup
            ? ["Landing page Waitlist copy playbook", "Qualitative Outreach template"]
            : ["Flat tag metadata architecture cheatsheet", "Digital garden templates"];

          const groupDiscussions = discussions
            .filter(d => d.groupId === activeSignalGroupId)
            .filter(d => discussionFilter === 'All' || d.category === discussionFilter)
            .sort((a, b) => getDiscussionRankScore(b) - getDiscussionRankScore(a));

          return (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-in fade-in duration-500 pb-56 custom-scrollbar">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setActiveSignalGroupId?.(null)}
                  className="flex items-center gap-2 text-[9px] font-bold text-indigo-400 uppercase tracking-widest bg-slate-900/60 border border-white/5 px-4 py-2 rounded-2xl hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <ChevronLeft size={12} /> Back to Signals
                </button>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-slate-950/50 border border-white/5 rounded-lg shrink-0">{currentGroup.icon}</span>
                  <span className="text-xs font-bold text-white tracking-tight">{currentGroup.name} Feed</span>
                </div>
              </div>

              <div className="p-6 bg-indigo-950/20 border border-indigo-500/20 rounded-[32px] space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-2.5">
                  <Sparkles size={16} className="text-indigo-400 animate-pulse shrink-0" />
                  <h4 className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em] text-left">Nexora AI Discussion Engine</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Frequently Discussed Topics</p>
                    <div className="flex flex-wrap gap-1.5">
                      {aiEngineTopics.map(topic => (
                        <span key={topic} className="text-[8px] font-bold text-white bg-slate-950/40 border border-white/5 px-2 py-0.5 rounded-lg">{topic}</span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Helpful Resources Shared</p>
                    <div className="flex flex-wrap gap-1.5">
                      {aiEngineResources.map(res => (
                        <span key={res} className="text-[8px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1">✦ {res}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/30 rounded-2xl border border-white/5 text-left space-y-1">
                  <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest leading-none">Emerging Trend Summary</p>
                  <p className="text-[10px] text-slate-300 leading-relaxed font-semibold">{aiEngineTrends}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/20 p-3 rounded-2xl border border-white/5">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {(['All', 'Questions', 'Ideas', 'Knowledge', 'Updates', 'Resources', 'Discussions'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setDiscussionFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-[8.5px] font-bold uppercase tracking-wider transition-all border shrink-0 whitespace-nowrap cursor-pointer ${
                        discussionFilter === cat 
                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' 
                        : 'bg-slate-950/40 border-white/5 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const next = !qualityOnlyFilter;
                    setQualityOnlyFilter(next);
                    if (showToast) showToast(next ? 'AI Quality Optimization Enabled' : 'Standard Feed Enabled', 'info');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[8.5px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    qualityOnlyFilter 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 animate-pulse shrink-0' 
                    : 'bg-slate-950/40 border-white/5 text-slate-500 hover:text-slate-300 shrink-0'
                  }`}
                >
                  <Sparkles size={11} /> AI Resonance Sorting
                </button>
              </div>

              <div className="space-y-4 text-left">
                {groupDiscussions.length === 0 ? (
                  <div className="text-center p-12 bg-slate-900/10 border border-dashed border-white/5 rounded-[36px]">
                    <p className="text-xs text-slate-500 font-semibold">No discussions match this filter. Be the first to start the synchrony!</p>
                  </div>
                ) : (
                  groupDiscussions.map(disc => {
                    const snippet = disc.text.length > 120 ? `${disc.text.substring(0, 120)}...` : disc.text;
                    const rankScore = getDiscussionRankScore(disc).toFixed(0);

                    return (
                      <div 
                        key={disc.id}
                        onClick={() => {
                          setActiveDiscussionId(disc.id);
                          setReplyingToId(null);
                        }}
                        className="p-5 bg-slate-900/30 hover:bg-slate-900/50 border border-white/5 hover:border-indigo-500/20 rounded-[28px] transition-all duration-300 cursor-pointer space-y-3 relative group"
                      >
                        <div className="absolute top-5 right-5 flex items-center gap-1.5">
                          <span className="text-[8px] font-mono uppercase px-2 py-0.5 bg-slate-950/60 text-indigo-400 border border-white/5 rounded-lg flex items-center gap-1 font-bold">
                            Resonance Index: {rankScore}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <img src={disc.authorAvatar} alt={disc.authorName} className="w-8 h-8 rounded-xl object-cover border border-white/10" referrerPolicy="no-referrer" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-200">{disc.authorName}</span>
                              <span className="text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md font-bold">
                                {disc.category}
                              </span>
                            </div>
                            <span className="text-[8px] font-mono text-slate-500">
                              {new Date(disc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-relaxed font-semibold">{snippet}</p>

                        <div className="flex items-center gap-4 pt-1 text-[10px] font-mono text-slate-500">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLikeDiscussion(disc.id);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                              disc.hasLiked ? 'text-rose-400 bg-rose-500/10' : 'hover:text-slate-300'
                            }`}
                          >
                            <Heart size={12} className={disc.hasLiked ? 'fill-rose-400' : ''} />
                            {disc.likes}
                          </button>
                          <span className="flex items-center gap-1.5">
                            <MessageSquare size={12} />
                            {disc.replies.length} replies
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="fixed bottom-0 left-0 right-0 p-6 bg-slate-950/90 backdrop-blur-xl border-t border-white/5 z-50 flex flex-col gap-3">
                <div className="flex items-center gap-3 text-left">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Category:</span>
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                    {(['Questions', 'Ideas', 'Knowledge', 'Updates', 'Resources', 'Discussions'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setNewDiscussionCategory(cat)}
                        className={`px-3 py-1 rounded-xl text-[8px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                          newDiscussionCategory === cat 
                          ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' 
                          : 'bg-slate-900 border-white/5 text-slate-500'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <input 
                    type="text"
                    value={newDiscussionText}
                    onChange={(e) => setNewDiscussionText(e.target.value)}
                    placeholder="💬 Share an idea, knowledge vector, or question with this group..."
                    className="flex-1 bg-slate-900/60 border border-white/5 rounded-2xl px-5 py-3.5 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all font-medium placeholder:text-slate-500"
                    onKeyDown={(e) => { if (e.key === 'Enter') handlePostDiscussion(); }}
                  />
                  <button 
                    onClick={handlePostDiscussion}
                    disabled={!newDiscussionText.trim()}
                    className="px-6 bg-white text-slate-950 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white rounded-2xl font-bold uppercase tracking-widest text-[9px] flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <Send size={12} /> Send
                  </button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="flex-1 overflow-y-auto p-6 space-y-10 animate-in fade-in duration-700 pb-40 custom-scrollbar">
            {/* Social Energy Header */}
            <div className="flex items-center justify-between px-2">
              <div className="flex flex-col">
                <h3 className="text-2xl font-bold font-outfit text-white flex items-center gap-3">
                  <Activity size={24} className="text-indigo-400" /> Signal
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{livePulse} people focused now</span>
                </div>
              </div>
              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-2 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                  <Flame size={16} />
                </div>
                <div className="pr-2">
                   <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-none">Your Rank</p>
                   <p className="text-xs font-bold text-white tracking-tight leading-none mt-1">Leading Circle</p>
                </div>
              </div>
            </div>

            {/* Immersive Feature Card */}
            <div className="relative aspect-[4/5] md:aspect-video rounded-[3.5rem] overflow-hidden bg-slate-900 group shadow-2xl">
              <img src="https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200" className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 group-hover:scale-100 transition-transform duration-[3s]" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              
              <div className="absolute inset-x-8 bottom-8 z-10 space-y-4">
                 <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-600/20 backdrop-blur-md border border-indigo-500/20 rounded-full text-indigo-400 text-[9px] font-bold uppercase tracking-widest">
                   <Users size={12} /> Sync Session Live
                 </div>
                 <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">Focus Circle: <br/> Stoic Foundation</h2>
                 <p className="text-sm text-slate-300 font-medium max-w-[80%]">Join {livePulse + 4} others in a 25-minute deep focus block aimed at essential prioritization. Your presence matters.</p>
                 <button 
                  onClick={() => {
                    setActiveSignalGroupId?.('stoic-foundation');
                    handleSignalAction('Join Sync');
                  }}
                  className="px-8 py-4 bg-white text-slate-950 rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:bg-slate-100 transition-all active:scale-95"
                 >
                   Join Session
                  </button>
            </div>
          </div>

          {/* Signal Groups Sync Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex flex-col">
                  <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 font-mono">Synchronized Groups</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Establish and synchronize secure focus tracks</p>
                </div>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-xl">
                  {joinedGroupIds.length} synced
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {SIGNAL_GROUPS_LIST.map(group => {
                  const GROUP_METADATA: Record<string, { icon: any; color: string; technicalIntel: string }> = {
                    'deep-work': {
                      icon: Brain,
                      color: 'indigo',
                      technicalIntel: '>> deep-work synchrony active. 124 neural nodes currently aligned in collective flow state. group cohesion: 94%.'
                    },
                    'startup-builders': {
                      icon: Rocket,
                      color: 'emerald',
                      technicalIntel: '>> high-leverage cognitive builder protocols active. 86 nodes building. syndication and product scaling delta: +18%.'
                    },
                    'growth-circle': {
                      icon: TrendingUp,
                      color: 'amber',
                      technicalIntel: '>> optimal neural learning channels unlocked. synaptic plasticity elevated by 14%. daily knowledge synthesis cycle: online.'
                    }
                  };
                  const isJoined = joinedGroupIds.includes(group.id);
                  const memberCount = group.baseMembers + (isJoined ? 1 : 0);
                  const meta = GROUP_METADATA[group.id] || { icon: Brain, color: 'indigo', technicalIntel: '>> diagnostic telemetry stable.' };
                  const IconComp = meta.icon;
                  const groupColor = meta.color;
                  
                  return (
                    <div 
                      key={group.id} 
                      className={`bg-slate-900/40 backdrop-blur-md border rounded-[40px] p-8 flex flex-col justify-between group transition-all relative ${
                        isJoined 
                        ? 'border-indigo-500/40 bg-indigo-950/20 shadow-[0_0_25px_rgba(99,102,241,0.05)]' 
                        : 'border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className={`w-10 h-10 rounded-2xl bg-${groupColor}-500/10 flex items-center justify-center text-${groupColor}-400 border border-${groupColor}-500/20 shadow-lg`}>
                            <IconComp size={20} />
                          </div>
                          <button 
                            onClick={() => setExpandedGroupId(expandedGroupId === group.id ? null : group.id)}
                            className={`p-2 rounded-xl transition-all ${expandedGroupId === group.id ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-600 hover:text-slate-400'}`}
                          >
                            <Info size={16} />
                          </button>
                        </div>

                        <div className="space-y-2 text-left">
                          <h4 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                            {group.name}
                            {isJoined && (
                              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                            )}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            {memberCount} active nodes synced
                          </div>
                          <p className="text-xs text-slate-400 font-medium leading-relaxed pt-1">{group.description}</p>
                        </div>

                        <AnimatePresence>
                          {expandedGroupId === group.id && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="bg-slate-950/60 rounded-2xl p-4 border border-white/5 overflow-hidden text-left"
                            >
                              <div className="flex items-center gap-2 mb-3 text-left">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">Neural Technical Intel</span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono leading-relaxed lowercase text-left">
                                {meta.technicalIntel}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="mt-8 flex items-center justify-between gap-4">
                        {isJoined ? (
                          <>
                            <button
                              onClick={() => {
                                handleSignalAction('Join Sync');
                              }}
                              className="flex items-center gap-2 text-[10px] font-bold text-white uppercase tracking-widest group-hover:gap-4 transition-all cursor-pointer"
                            >
                              Join Sync <ArrowUpRight size={14} className="text-slate-500" />
                            </button>
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => {
                                  setActiveSignalGroupId?.(group.id);
                                  if (showToast) showToast(`Connecting to ${group.name} discussions circle...`, 'info');
                                }}
                                className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-all cursor-pointer"
                              >
                                Open Feed
                              </button>
                              <button
                                onClick={() => {
                                  if (setJoinedGroupIds) {
                                    setJoinedGroupIds(prev => prev.filter(id => id !== group.id));
                                    if (showToast) showToast(`Disconnected from ${group.name}`, 'info');
                                  }
                                }}
                                className="text-[9px] font-mono text-slate-500 hover:text-rose-400 uppercase tracking-wider transition-all cursor-pointer"
                              >
                                [disconnect]
                              </button>
                            </div>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              if (setJoinedGroupIds) {
                                setJoinedGroupIds(prev => prev.includes(group.id) ? prev : [...prev, group.id]);
                                if (showToast) showToast(`Synced with ${group.name}! +100 XP gained.`, 'success');
                              }
                              setActiveSignalGroupId?.(group.id);
                              handleSignalAction('Join Sync');
                            }}
                            className="flex items-center gap-2 text-[10px] font-bold text-white uppercase tracking-widest group-hover:gap-4 transition-all cursor-pointer"
                          >
                            Establish Sync <ArrowUpRight size={14} className="text-slate-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Signal Card Variety */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Human-Style Signals */}
               {[
                { 
                  id: 's1', 
                  title: 'You regained momentum.',
                  desc: 'Yesterday was slow, but you just matched your peak pace. Keep this rhythm.',
                  icon: TrendingUp,
                  color: 'indigo',
                  action: 'Join Sync'
                },
                { 
                  id: 's2', 
                  title: 'Energy feels stable.',
                  desc: 'Bio-signals suggest a high-focus window. Perfect time for deep cognitive work.',
                  icon: Activity,
                  color: 'emerald',
                  action: 'Next Task'
                },
                { 
                  id: 's3', 
                  title: 'You paused. Resume flow?',
                  desc: 'The neural trail is still warm. Returning now keeps the momentum intact.',
                  icon: Wind,
                  color: 'amber',
                  action: 'Resume'
                }
               ].map((signal) => (
                 <div key={signal.id} className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-[40px] p-8 flex flex-col justify-between group hover:border-white/10 transition-all">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <div className={`w-10 h-10 rounded-2xl bg-${signal.color}-500/10 flex items-center justify-center text-${signal.color}-400 border border-${signal.color}-500/20 shadow-lg`}>
                           <signal.icon size={20} />
                         </div>
                         <button 
                           onClick={() => setExpandedSignalId(expandedSignalId === signal.id ? null : signal.id)}
                           className={`p-2 rounded-xl transition-all ${expandedSignalId === signal.id ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-600 hover:text-slate-400'}`}
                         >
                           <Info size={16} />
                         </button>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-lg font-bold text-white tracking-tight">{signal.title}</h4>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">{signal.desc}</p>
                      </div>

                      <AnimatePresence>
                        {expandedSignalId === signal.id && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-slate-950/60 rounded-2xl p-4 border border-white/5 overflow-hidden"
                          >
                             <div className="flex items-center gap-2 mb-3">
                               <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                               <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">Neural Technical Intel</span>
                             </div>
                             <p className="text-[10px] text-slate-400 font-mono leading-relaxed lowercase">
                               {signal.id === 's1' ? '>> processing delta recovery speed: +12% from baseline. cortisol levels peaking in normal range. synaptic load stable.' : 
                                signal.id === 's2' ? '>> high-theta wave coherence detected. window of optimal neural plasticity: ~22 minutes remains.' : 
                                '>> state-loss recovery active. momentum preservation algorithm suggest immediate return within 120s.'}
                             </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button 
                      onClick={() => handleSignalAction(signal.action)}
                      className="mt-8 flex items-center gap-2 text-[10px] font-bold text-white uppercase tracking-widest group-hover:gap-4 transition-all"
                    >
                      {signal.action} <ArrowUpRight size={14} className="text-slate-500" />
                    </button>
                 </div>
               ))}

               {/* Activity Strip Card */}
               <div className="bg-slate-900/30 border border-white/5 rounded-[40px] p-8 flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Activity</h4>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  </div>
                  <div className="space-y-4">
                     {socialEvents.map((event, i) => (
                       <div key={event.id} className="flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-500">
                          <div className={`w-1.5 h-1.5 rounded-full ${event.type === 'join' ? 'bg-indigo-400' : event.type === 'complete' ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                          <p className="text-[11px] text-slate-300 font-medium">{event.text}</p>
                       </div>
                     ))}
                  </div>
                  <div className="mt-2 pt-6 border-t border-white/5">
                     <p className="text-[10px] text-slate-500 font-medium italic">"12 people reached Deep Work state in the last 15 mins."</p>
                  </div>
               </div>
            </div>

            {/* Atmosphere Detail: Expandable Insight */}
            {isFocusDroppedInReal && (
              <div className="bg-slate-950 border border-white/5 rounded-[40px] p-10 flex flex-col items-center text-center space-y-6">
                 <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/40 mb-2">
                   <Moon size={32} />
                 </div>
                 <div className="space-y-2">
                   <h4 className="text-xl font-bold text-white tracking-tight">Focus dropped for a moment.</h4>
                   <p className="text-sm text-slate-500 max-w-xs mx-auto font-medium">It's okay. Resilience isn't about never pausing, but how fast you return.</p>
                 </div>
                 <button 
                  onClick={() => {
                    setFocusDropped(false);
                    handleSignalAction('Next Task');
                  }}
                  className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:text-white transition-colors"
                 >
                   Acknowledge & Continue
                 </button>
              </div>
            )}
          </div>
        );
      case 'people':
        return (
          <div className="flex-1 overflow-y-auto flex flex-col p-6 animate-in fade-in duration-500 custom-scrollbar relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Cpu size={120} />
            </div>
            
            <header className="mb-8 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Users2 size={20} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white font-outfit uppercase tracking-tight">Similar Minds</h2>
                  <p className="text-xs text-slate-400 font-medium">Intelligent discovery based on your vectors</p>
                </div>
              </div>
            </header>

            <div className="space-y-4 relative z-10">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-5 bg-slate-900/60 border border-slate-800 hover:border-amber-500/30 rounded-[28px] transition-all cursor-pointer flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img src={`https://i.pravatar.cc/150?u=similar${i}`} className="w-12 h-12 rounded-full object-cover border border-slate-700" />
                        <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-1 rounded-full border border-slate-900">
                          <Zap size={10} fill="currentColor" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Mind {i}</h4>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                          <Target size={10} className="text-amber-400" /> Focusing on similar goals
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg uppercase tracking-wider">
                        {95 - i * 5}% Match
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all">
                      View Profile
                    </button>
                    <button 
                      onClick={() => { setActiveSubTab('messages'); }} 
                      className="w-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all"
                    >
                      <MessageSquare size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'messages':
        return (
          <div className="flex-1 overflow-y-auto flex flex-col animate-in fade-in duration-500 custom-scrollbar">
            <div className="px-6 py-4 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2 cursor-pointer group"><h3 className="text-lg font-bold text-white font-outfit tracking-tight">{userProfile?.username || activeSenderId}</h3><ChevronDown size={16} className="text-slate-400 group-hover:text-white transition-colors" /></div>
              <button onClick={() => { if(showToast) showToast("Neural Profile Editor Active", "info") }} className="p-2 text-slate-400 hover:text-white transition-all"><Edit3 size={22} /></button>
            </div>
            <div className="px-6 py-4 flex gap-6 overflow-x-auto no-scrollbar border-b border-slate-900/50 pb-6 mb-2">
              <div className="flex flex-col items-center gap-2 min-w-[75px] group cursor-pointer">
                <div className="relative"><div className="p-[2px] rounded-full bg-slate-800"><img src="https://i.pravatar.cc/150?u=alex" className="w-16 h-16 rounded-full object-cover border-2 border-slate-950" /></div><div className="absolute -top-6 left-1/2 -translate-x-1/2 px-3 py-2 bg-white rounded-[18px] rounded-bl-none shadow-xl animate-in zoom-in duration-300"><p className="text-[9px] text-slate-950 font-bold whitespace-nowrap">Your thoughts...</p></div></div><span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Your note</span>
              </div>
              <div onClick={() => setShowMap(true)} className="flex flex-col items-center gap-2 min-w-[75px] group cursor-pointer">
                <div className="w-16 h-16 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.15)] group-hover:scale-105 transition-transform"><Globe size={32} strokeWidth={1.5} /></div><span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Map</span>
              </div>
              {[1, 2, 3].map(i => (
                <div key={i} className="flex flex-col items-center gap-2 min-w-[75px] group cursor-pointer" onClick={() => openChannelProfile(`Friend ${i}`, `https://i.pravatar.cc/150?u=note${i}`)}>
                   <div className="relative"><div className="p-[2px] rounded-full bg-indigo-500/30"><img src={`https://i.pravatar.cc/150?u=note${i}`} className="w-16 h-16 rounded-full object-cover border-2 border-slate-950" /></div><div className="absolute -top-4 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg shadow-xl"><p className="text-[8px] text-white font-bold whitespace-nowrap truncate max-w-[50px]">Status {i}...</p></div></div><span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Friend {i}</span>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-bold text-white font-outfit tracking-tight">Messages</h4>
                <div className="flex items-center gap-4">
                  <button onClick={() => setIsJoinGroupOpen(true)} className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider hover:text-emerald-300 transition-colors">Join</button>
                  <button onClick={() => setIsGroupCreateOpen(true)} className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider hover:text-indigo-300 transition-colors">+ Group</button>
                  <button className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em] hover:text-slate-400 transition-colors">Requests</button>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-1 pb-32">
              {conversations.map((chat, i) => (
                <div key={i} onClick={() => openChat(chat.sender)} className="px-6 py-4 flex items-center justify-between group hover:bg-slate-900/30 cursor-pointer transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img src={chat.avatar} className="w-14 h-14 rounded-full object-cover border border-slate-800" />
                      {chat.unread && <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white tracking-tight">{chat.sender}</span>
                        {chat.isGroup ? (
                          <span className="text-[9px] font-extrabold uppercase bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 px-1.5 py-0.5 rounded-md tracking-wider">Group</span>
                        ) : (
                          <Check size={12} className="text-indigo-400 fill-indigo-400/20" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium truncate max-w-[180px]">{chat.lastMessage}</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); openChat(chat.sender); }} className="p-2 text-slate-600 group-hover:text-white transition-colors">
                    <Camera size={22} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (viewMode === 'channel-profile' && selectedChannel) {
    return (
      <div className="h-[calc(100vh-160px)] flex flex-col bg-slate-950 animate-in fade-in slide-in-from-right duration-300 overflow-y-auto custom-scrollbar pb-32">
        <header className="p-6 flex items-center gap-4 sticky top-0 bg-slate-950/95 backdrop-blur-xl z-20 border-b border-slate-900">
           <button onClick={() => setViewMode('feed')} className="p-2 hover:bg-slate-900 rounded-full text-slate-400 transition-all"><ArrowLeft size={24} /></button>
           <h2 className="text-xl font-bold text-white font-outfit uppercase tracking-tight">{selectedChannel.name}</h2>
        </header>
        <div className="px-6 pt-10 flex flex-col items-center">
           <div className="relative mb-6">
              <div className="w-32 h-32 rounded-[40px] overflow-hidden border-4 border-indigo-500/20 p-1"><img src={selectedChannel.avatar} className="w-full h-full object-cover rounded-[32px]" /></div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white border-4 border-slate-950 shadow-xl"><ShieldCheck size={20} /></div>
           </div>
           <h1 className="text-3xl font-bold text-white mb-2 font-outfit">{selectedChannel.name}</h1>
           <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-8">Neural Entity • Verified Node</p>
           
           <div className="flex gap-10 mb-10 text-center">
              <div><p className="text-lg font-bold text-white">12.4k</p><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Followers</p></div>
              <div className="w-px h-8 bg-slate-800 self-center" />
              <div><p className="text-lg font-bold text-white">1.2k</p><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Signals</p></div>
              <div className="w-px h-8 bg-slate-800 self-center" />
              <div><p className="text-lg font-bold text-white">85</p><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Circles</p></div>
           </div>

           <div className="w-full max-w-sm flex flex-col gap-4 mb-12">
              <button onClick={() => openChat(selectedChannel.name)} className="w-full py-5 bg-white text-slate-950 rounded-[24px] font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all">
                <MessageSquareShare size={18} /> Chat
              </button>
              <button onClick={() => { if(showToast) showToast(`Follow request sent to ${selectedChannel.name}`, "success"); }} className="w-full py-5 bg-slate-900 border border-slate-800 text-white rounded-[24px] font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-95">
                <UserPlus size={18} /> Follow
              </button>
           </div>

           <div className="w-full grid grid-cols-3 gap-2 px-1 pb-32">
              {[1,2,3,4,5,6,7,8,9].map(i => (
                <div key={i} className="aspect-square bg-slate-900 rounded-2xl overflow-hidden border border-slate-800/50 group relative">
                   <img src={`https://picsum.photos/seed/${selectedChannel.name}${i}/400/400`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                   <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
           </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'messages') {
    const selectedChat = conversations.find(c => c.id === selectedChatId);
    const activeCustomization = (selectedChatId && chatCustomizations[selectedChatId]) || {};
    const activeAccent = activeCustomization.accentColor || 'indigo';

    const activePinnedRecords: PinnedMessageRecord[] = (() => {
      if (!selectedChat) return [];
      if (selectedChat.pinnedMessages && selectedChat.pinnedMessages.length > 0) {
        return selectedChat.pinnedMessages;
      }
      if (selectedChat.groupDetails?.pinnedMessageIds && selectedChat.groupDetails.pinnedMessageIds.length > 0) {
        return selectedChat.groupDetails.pinnedMessageIds.map(id => {
          const msg = selectedChat.messages?.find(m => m.id === id);
          return {
            messageId: id,
            chatId: selectedChat.id,
            pinnedBy: 'System',
            pinnedAt: Date.now(),
            originalSender: msg?.senderName || selectedChat.sender || 'Anonymous',
            pinHistory: []
          };
        });
      }
      return [];
    })();

    return (
      <div 
        className="h-[calc(100vh-160px)] flex flex-col max-w-2xl mx-auto bg-slate-950 animate-in fade-in duration-300 border-x border-slate-900 overflow-hidden relative"
        style={{
          '--chat-accent': activeAccent === 'indigo' ? '#6366f1' :
                           activeAccent === 'emerald' ? '#10b981' :
                           activeAccent === 'rose' ? '#f43f5e' :
                           activeAccent === 'amber' ? '#f59e0b' :
                           activeAccent === 'purple' ? '#a855f7' :
                           activeAccent === 'cyan' ? '#06b6d4' : '#6366f1',
          '--chat-accent-soft': activeAccent === 'indigo' ? 'rgba(99,102,241,0.1)' :
                                activeAccent === 'emerald' ? 'rgba(16,185,129,0.12)' :
                                activeAccent === 'rose' ? 'rgba(244,63,94,0.12)' :
                                activeAccent === 'amber' ? 'rgba(245,158,11,0.12)' :
                                activeAccent === 'purple' ? 'rgba(168,85,247,0.12)' :
                                activeAccent === 'cyan' ? 'rgba(6,182,212,0.12)' : 'rgba(99,102,241,0.1)',
          '--chat-accent-glow': activeAccent === 'indigo' ? 'rgba(99,102,241,0.35)' :
                                activeAccent === 'emerald' ? 'rgba(16,185,129,0.35)' :
                                activeAccent === 'rose' ? 'rgba(244,63,94,0.35)' :
                                activeAccent === 'amber' ? 'rgba(245,158,11,0.35)' :
                                activeAccent === 'purple' ? 'rgba(168,85,247,0.35)' :
                                activeAccent === 'cyan' ? 'rgba(6,182,212,0.35)' : 'rgba(99,102,241,0.35)',
        } as React.CSSProperties}
      >
        {isCalling && (
          <div className="absolute inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl animate-in fade-in zoom-in duration-500 flex flex-col items-center justify-center p-10">
             <div className="relative mb-12">
               <div className="w-48 h-48 rounded-[60px] overflow-hidden border-8 border-indigo-500/20 shadow-[0_0_80px_rgba(99,102,241,0.2)]">
                  {isVideoOn ? (
                    <img src={selectedChat?.avatar} className="w-full h-full object-cover animate-pulse" />
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center"><Phone size={48} className="text-indigo-400 animate-bounce" /></div>
                  )}
               </div>
               <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-2xl animate-pulse">Connecting...</div>
             </div>
             <h2 className="text-3xl font-bold text-white mb-2 font-outfit">{selectedChat?.sender}</h2>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.4em] mb-20">{isCalling === 'voice' ? 'Voice Transmission' : 'Visual Stream'}</p>
             
             <div className="flex gap-8">
               <button onClick={() => setIsMuted(!isMuted)} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-slate-800 text-slate-500' : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'}`}>
                 {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
               </button>
               {isCalling === 'video' && (
                 <button onClick={() => setIsVideoOn(!isVideoOn)} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${!isVideoOn ? 'bg-slate-800 text-slate-500' : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'}`}>
                   {!isVideoOn ? <VideoOff size={24} /> : <VideoIcon size={24} />}
                 </button>
               )}
               <button onClick={handleEndCall} className="w-16 h-16 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 hover:bg-rose-500 active:scale-90 transition-all">
                 <PhoneOff size={24} />
               </button>
             </div>
          </div>
        )}

        {!selectedChatId ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="p-6 border-b border-slate-900 flex items-center gap-4 bg-slate-950/95 backdrop-blur-xl shrink-0">
              <button onClick={() => setViewMode('feed')} className="p-2 hover:bg-slate-900 rounded-full text-slate-400 transition-all"><ArrowLeft size={24} /></button>
              <h2 className="text-xl font-bold text-white font-outfit uppercase tracking-tight">Messages</h2>
            </header>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {conversations.map(chat => (
                <button key={chat.id} onClick={() => {
                  setSelectedChatId(chat.id);
                  setConversations(prev => prev.map(c => c.id === chat.id ? {...c, unread: false} : c));
                  fetch('/api/chat/read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chatId: chat.id, readerName: userProfile?.name || 'You' })
                  }).catch(e => console.warn('Read sync failed:', e));
                }} className="w-full flex items-center gap-4 p-4 rounded-3xl hover:bg-slate-900 transition-all group">
                  <div className="relative"><img src={chat.avatar} className="w-14 h-14 rounded-2xl object-cover border border-slate-800" />{chat.unread && <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-slate-950" />}</div>
                  <div className="flex-1 text-left"><div className="flex justify-between items-center mb-1"><span className="font-bold text-sm text-white">{chat.sender}</span><span className="text-[10px] text-slate-500">{chat.time}</span></div><p className="text-xs text-slate-500 truncate">{chat.lastMessage}</p></div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <header className="p-4 border-b border-slate-900 flex items-center justify-between bg-slate-950/95 backdrop-blur-xl shrink-0 z-20">
              <div className="flex items-center gap-4">
                <button onClick={() => { setSelectedChatId(null); setEditingMessageId(null); setMessageInput(''); setIsChatInfoOpen(false); }} className="p-2 hover:bg-slate-900 rounded-full text-slate-400 transition-colors"><ArrowLeft size={20} /></button>
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => openChannelProfile(selectedChat?.sender || '', selectedChat?.avatar || '')}>
                  <img src={selectedChat?.avatar} className="w-8 h-8 rounded-lg object-cover border border-slate-800 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-[var(--chat-accent)] transition-colors" style={{ color: 'var(--chat-accent)' }}>{selectedChat?.sender}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-widest block transition-colors" style={{ color: activeCustomization.muted ? '#f59e0b' : '#10b981' }}>
                        {activeCustomization.muted ? '🔇 Muted Sync' : '🟢 Active Sync'}
                      </span>
                      <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        syncStatus === 'offline' 
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' 
                          : syncStatus === 'syncing'
                          ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300 animate-pulse'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}>
                        {syncStatus === 'offline' ? `⚡ Offline Queue (${offlineQueue.length})` : syncStatus === 'syncing' ? '⚡ Syncing...' : '● Synced'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3 text-slate-400">
                <button 
                  onClick={() => {
                    playLocalSynth('tap');
                    setIsSemanticSearchOpen(true);
                  }} 
                  className="hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all active:scale-90 text-purple-400 hover:text-purple-300"
                  title="Semantic Message Search (AI Index)"
                >
                  <Search size={18} />
                </button>
                <button onClick={() => handleCall('voice')} className="hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all active:scale-90"><Phone size={18} /></button>
                <button onClick={() => handleCall('video')} className="hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all active:scale-90"><VideoIcon size={20} /></button>
                <button 
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(10);
                    playLocalSynth('tap');
                    setIsChatInfoOpen(!isChatInfoOpen);
                  }} 
                  className="hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all relative"
                  style={{
                    color: isChatInfoOpen ? 'var(--chat-accent)' : undefined,
                    backgroundColor: isChatInfoOpen ? 'var(--chat-accent-soft)' : undefined
                  }}
                >
                  <Info size={20} />
                </button>
              </div>
            </header>
            {activePinnedRecords.length > 0 && (
              <div className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between z-20 text-[11px] text-slate-300 font-medium animate-in slide-in-from-top-2 shadow-lg">
                <div 
                  onClick={() => {
                    if (activePinnedRecords.length === 0) return;
                    const currentPin = activePinnedRecords[currentPinnedIndex % activePinnedRecords.length];
                    const msgId = currentPin.messageId;
                    const element = document.getElementById(`msg-${msgId}`);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      element.classList.add('ring-2', 'ring-amber-500', 'scale-[1.01]');
                      setTimeout(() => element.classList.remove('ring-2', 'ring-amber-500', 'scale-[1.01]'), 2000);
                    }
                    if (activePinnedRecords.length > 1) {
                      setCurrentPinnedIndex(prev => (prev + 1) % activePinnedRecords.length);
                    }
                  }}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
                >
                  <div className="w-1.5 h-7 bg-amber-400 rounded-full shrink-0 group-hover:bg-amber-300 transition-colors" />
                  <Pin size={14} className="text-amber-400 fill-amber-400/20 shrink-0 rotate-45" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-300 text-[10px] uppercase tracking-wider">
                        {activePinnedRecords.length > 1 
                          ? `Pinned Message (${(currentPinnedIndex % activePinnedRecords.length) + 1}/${activePinnedRecords.length})` 
                          : 'Pinned Message'}
                      </span>
                      {(() => {
                        const currentPin = activePinnedRecords[currentPinnedIndex % activePinnedRecords.length];
                        return (
                          <span className="text-[9px] text-slate-400 font-bold truncate">
                            • {currentPin.originalSender || 'Sender'}
                          </span>
                        );
                      })()}
                    </div>
                    <span className="truncate text-slate-300 text-xs font-normal">
                      {(() => {
                        const currentPin = activePinnedRecords[currentPinnedIndex % activePinnedRecords.length];
                        const pinMsg = selectedChat?.messages?.find(m => m.id === currentPin.messageId);
                        if (!pinMsg) return 'Pinned transmission';
                        if (pinMsg.text) return pinMsg.text;
                        if (pinMsg.image) return '📷 Photo transmission';
                        if (pinMsg.videoUrl) return '📹 Video transmission';
                        if (pinMsg.documentName) return `📄 ${pinMsg.documentName}`;
                        if (pinMsg.audioUrl) return '🎙️ Voice Note';
                        return 'Pinned transmission';
                      })()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentPin = activePinnedRecords[currentPinnedIndex % activePinnedRecords.length];
                      if (selectedChat) handleUnpinMessage(selectedChat.id, currentPin.messageId);
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    title="Unpin message"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 pb-32">
              {/* Scheduled Messages Banner / Cards */}
              {scheduledMessages.filter(sm => (sm.status === 'scheduled' || sm.status === 'pending') && sm.chatId === selectedChatId).length > 0 && (
                <div className="p-4 bg-slate-900/80 border border-indigo-500/30 rounded-3xl backdrop-blur-md shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                        <Clock size={14} className="animate-spin-slow" />
                      </div>
                      <div>
                        <h5 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          Scheduled Transmissions <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-[9px] font-mono font-bold">{scheduledMessages.filter(sm => (sm.status === 'scheduled' || sm.status === 'pending') && sm.chatId === selectedChatId).length}</span>
                        </h5>
                        <p className="text-[9px] text-slate-400">Hidden from recipient until delivery time</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {scheduledMessages.filter(sm => (sm.status === 'scheduled' || sm.status === 'pending') && sm.chatId === selectedChatId).map((sm) => {
                      const isToday = sm.scheduledDate === new Date().toISOString().split('T')[0];
                      const timeLabel = isToday 
                        ? `🕒 Scheduled Today • ${sm.scheduledTime}` 
                        : `⏰ Sends ${sm.scheduledDate} • ${sm.scheduledTime}`;

                      return (
                        <div key={sm.messageId} className="p-3 bg-slate-950/70 border border-slate-800 hover:border-indigo-500/40 rounded-2xl transition-all space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-800/60 px-2.5 py-1 rounded-full flex items-center gap-1 font-mono">
                              {timeLabel}
                              {sm.repeat && sm.repeat !== 'once' && (
                                <span className="text-[9px] text-purple-300 uppercase tracking-widest font-extrabold ml-1">
                                  • 🔁 {sm.repeat}
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-1">
                              {/* Send Immediately */}
                              <button
                                type="button"
                                onClick={() => handleSendScheduledImmediately(sm.messageId)}
                                className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 rounded-lg text-[9px] font-bold text-emerald-400 hover:text-emerald-200 transition-all flex items-center gap-1 active:scale-95"
                                title="Send immediately"
                              >
                                <Send size={10} /> Send Now
                              </button>
                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => handleEditScheduledMessage(sm)}
                                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
                                title="Edit scheduled message"
                              >
                                <Edit3 size={12} />
                              </button>
                              {/* Cancel */}
                              <button
                                type="button"
                                onClick={() => handleCancelScheduledMessage(sm.messageId)}
                                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition-all"
                                title="Cancel schedule"
                              >
                                <X size={12} />
                              </button>
                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleDeleteScheduledMessage(sm.messageId)}
                                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-500 transition-all"
                                title="Delete permanently"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-slate-200 font-medium pl-1">
                            {sm.text || (sm.attachments?.image ? '📷 Image attachment' : 'Empty payload')}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {!selectedChat || (selectedChat.messages || []).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-600 font-mono text-xs uppercase space-y-2">
                  <CloudLightning size={24} className="opacity-30 mb-2 animate-bounce" />
                  <p>Neural Buffer Is Isolated</p>
                  <p className="text-[10px] opacity-60">Send a transmission to synchronize channels</p>
                </div>
              ) : (selectedChat.messages || []).map((m, i) => {
                if (m.senderName === 'System') {
                  return (
                    <div key={i} className="flex justify-center my-4 animate-in fade-in duration-300">
                      <div className="bg-slate-900/40 border border-slate-800 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {m.text}
                      </div>
                    </div>
                  );
                }

                const senderNameForPin = m.senderName || (m.fromMe ? (userProfile?.name || 'You') : selectedChat?.sender);
                const isMsgPinned = activePinnedRecords.some(p => p.messageId === m.id);

                return (
                  <div key={i} id={`msg-${m.id}`} className="relative group/msg my-1">
                    {/* Background Slide Indicator (Revealed on Swipe Right) */}
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2 text-amber-400 font-bold text-xs pointer-events-none opacity-80 z-0">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg">
                        <Pin size={14} className="rotate-45 fill-amber-400/20" />
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-amber-300 font-extrabold hidden sm:inline">
                        {isMsgPinned ? 'Unpin' : 'Pin'}
                      </span>
                    </div>

                    <motion.div 
                      drag="x"
                      dragConstraints={{ left: 0, right: 90 }}
                      dragElastic={{ left: 0.02, right: 0.4 }}
                      dragSnapToOrigin
                      onDragEnd={(_event, info) => {
                        if (info.offset.x > 50) {
                          if (selectedChatId) {
                            handleTogglePinMessage(selectedChatId, m.id, senderNameForPin);
                            if (navigator.vibrate) navigator.vibrate([30, 40]);
                          }
                        }
                      }}
                      className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'} gap-3 items-end relative z-10`}
                      onMouseDown={() => handleMessageLongPressStart(m.id, senderNameForPin)}
                      onMouseUp={handleMessageLongPressEnd}
                      onMouseLeave={handleMessageLongPressEnd}
                      onTouchStart={() => handleMessageLongPressStart(m.id, senderNameForPin)}
                      onTouchEnd={handleMessageLongPressEnd}
                    >
                    {!m.fromMe && selectedChat?.isGroup && (
                      <img 
                        src={m.senderAvatar || m.senderId ? `https://i.pravatar.cc/150?u=${m.senderId}` : 'https://i.pravatar.cc/150?u=anonymous'} 
                        onClick={() => openChannelProfile(m.senderName || 'Anonymous', m.senderAvatar || 'https://i.pravatar.cc/150?u=anonymous')}
                        className="w-8 h-8 rounded-full object-cover border border-slate-800 cursor-pointer hover:border-indigo-400 transition-colors"
                      />
                    )}

                    <div className={`flex flex-col gap-1 max-w-[80%] ${m.fromMe ? 'items-end' : 'items-start'}`}>
                      {!m.fromMe && selectedChat?.isGroup && (
                        <span className="text-[10px] font-bold text-slate-500 tracking-tight ml-1">{m.senderName || 'Anonymous'}</span>
                      )}

                      <div 
                        className={`px-4 py-3 rounded-2xl text-[13px] font-medium leading-relaxed shadow-lg transition-all relative ${
                          m.fromMe 
                            ? 'text-white rounded-tr-none' 
                            : 'bg-slate-900 text-slate-300 border border-slate-800 rounded-tl-none'
                        } ${activeMessageMenuId === m.id ? 'ring-2' : ''}`}
                        style={{
                          backgroundColor: m.fromMe ? 'var(--chat-accent)' : undefined,
                          borderColor: activeMessageMenuId === m.id ? 'var(--chat-accent)' : undefined,
                          boxShadow: m.fromMe ? '0 4px 14px var(--chat-accent-soft)' : undefined
                        }}
                      >
                        {/* Reply Preview */}
                        {m.replyToMessageId && (
                          <div className="mb-2 bg-black/20 border-l-2 border-indigo-400 px-2 py-1 rounded text-[10px] text-slate-400 italic max-w-full truncate">
                            {m.replyToMessageText || 'Original Transmission'}
                          </div>
                        )}
                        
                        {/* Intent Indicator Bubble */}
                        {m.intent && (
                          <div className="absolute -top-3 left-0 bg-slate-950 border border-white/10 rounded-full px-1.5 py-0.5 shadow-xl flex items-center gap-1 z-10 scale-90 origin-left">
                            {(() => {
                              const config = INTENTS.find(it => it.id === m.intent);
                              if (!config) return null;
                              return (
                                <>
                                  <config.icon size={10} className={config.color} />
                                  <span className="text-[7px] font-bold text-white uppercase tracking-tighter">{config.label}</span>
                                </>
                              );
                            })()}
                          </div>
                        )}

                        {/* Image Attachment */}
                        {m.image && (
                          <img src={m.image} className="max-w-full rounded-xl mb-2 border border-white/5 shadow-2xl cursor-pointer" alt="Shared" onClick={() => { playLocalSynth('tap'); setMediaViewerUrl(m.image || null); }} />
                        )}

                        {/* Video Attachment */}
                        {m.videoUrl && (
                          <div className="rounded-xl overflow-hidden mb-2 border border-slate-800 bg-black/40 relative group/vid max-w-[280px]">
                            <video src={m.videoUrl} className="w-full h-auto aspect-video object-cover" controls preload="metadata" />
                            <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-[8px] font-bold text-white uppercase tracking-wider">Video</div>
                          </div>
                        )}

                        {/* Document Attachment */}
                        {m.documentName && (
                          <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-850 rounded-xl p-3 mb-2 max-w-[280px]">
                            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                              <BookOpen size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white truncate">{m.documentName}</p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase">{m.documentSize || 'Unspecified size'}</p>
                            </div>
                            <button onClick={() => { if (showToast) showToast('Downloading Transmission File', 'success'); }} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all">
                              <Download size={14} />
                            </button>
                          </div>
                        )}

                        {/* Voice Note Attachment */}
                        {m.audioUrl && (
                          <div className="flex items-center gap-3 bg-slate-950/40 border border-slate-850 rounded-xl p-3 mb-2 min-w-[240px]">
                            <button onClick={() => { playLocalSynth('tap'); if (showToast) showToast('Playing Audio Packet', 'info'); }} className="w-8 h-8 rounded-full bg-indigo-500/20 hover:bg-indigo-500/30 flex items-center justify-center text-indigo-400 transition-all">
                              <Play size={14} className="ml-0.5" />
                            </button>
                            <div className="flex-1">
                              <div className="flex gap-0.5 items-end h-5">
                                {[2, 4, 3, 6, 2, 5, 8, 4, 3, 7, 5, 4, 6, 2, 4, 3, 5, 2].map((h, index) => (
                                  <div key={index} className="flex-1 bg-indigo-400/30 rounded-t" style={{ height: `${h * 10}%` }} />
                                ))}
                              </div>
                              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1">Audio Transmit • {m.voiceNoteDuration || 12}s</p>
                            </div>
                          </div>
                        )}

                        <div className="text-[13px] leading-relaxed">
                          {m.text && renderMessageText(m.text)}
                        </div>

                        {activeMessageMenuId === m.id && (
                          <div ref={messageMenuRef} className="absolute bottom-full mb-2 left-0 md:left-auto md:right-0 min-w-[220px] bg-slate-950 border border-slate-800 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] p-2 z-50 animate-in zoom-in-95 duration-150 flex flex-col gap-2">
                            {/* Reactions Row */}
                            <div className="flex items-center justify-between gap-1 border-b border-slate-900 pb-1.5 px-1">
                              {['👍', '❤️', '🔥', '😂', '😮', '😢', '🎉'].map(emoji => (
                                <button 
                                  key={emoji} 
                                  onClick={() => {
                                    handleToggleReaction(m.id, emoji);
                                    setActiveMessageMenuId(null);
                                  }}
                                  className="hover:bg-slate-800/80 p-1.5 rounded-lg text-sm transition-all hover:scale-110 active:scale-95"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                            
                            {/* Action Items */}
                            <div className="grid grid-cols-1 gap-0.5 text-left">
                              <button 
                                onClick={() => {
                                  setReplyingToMessage(m);
                                  setActiveMessageMenuId(null);
                                  playLocalSynth('tap');
                                }}
                                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-indigo-500/10 hover:text-indigo-300 rounded-xl text-slate-400 transition-all text-[11px] font-bold uppercase tracking-wider"
                              >
                                <span>Reply</span>
                                <MessageSquare size={12} />
                              </button>
                              
                              <button 
                                onClick={() => {
                                  setForwardingMessage(m);
                                  setIsForwardModalOpen(true);
                                  setActiveMessageMenuId(null);
                                  playLocalSynth('tap');
                                }}
                                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-indigo-500/10 hover:text-indigo-300 rounded-xl text-slate-400 transition-all text-[11px] font-bold uppercase tracking-wider"
                              >
                                <span>Forward</span>
                                <MessageSquareShare size={12} />
                              </button>

                              <button 
                                onClick={() => {
                                  if (selectedChatId) {
                                    handleTogglePinMessage(selectedChatId, m.id, m.senderName || (m.fromMe ? (userProfile?.name || 'You') : selectedChat?.sender));
                                  }
                                  setActiveMessageMenuId(null);
                                }}
                                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-amber-500/10 hover:text-amber-300 rounded-xl text-slate-400 transition-all text-[11px] font-bold uppercase tracking-wider cursor-pointer"
                              >
                                <span>{activePinnedRecords.some(p => p.messageId === m.id) ? 'Unpin Message' : 'Pin Message'}</span>
                                <Pin size={12} className={activePinnedRecords.some(p => p.messageId === m.id) ? 'text-amber-400 fill-amber-400/20 rotate-45' : 'rotate-45'} />
                              </button>

                              <button 
                                onClick={() => {
                                  handleToggleSaveToBrain(m);
                                  setActiveMessageMenuId(null);
                                }}
                                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-purple-500/10 hover:text-purple-300 rounded-xl text-slate-400 transition-all text-[11px] font-bold uppercase tracking-wider cursor-pointer"
                              >
                                <span>{(savedBrainMessageIds.has(m.id) || m.isSavedToBrain) ? 'Remove from Brain' : 'Save to AI Brain'}</span>
                                <Brain size={12} className={(savedBrainMessageIds.has(m.id) || m.isSavedToBrain) ? 'text-purple-400 fill-purple-400/20' : ''} />
                              </button>

                              {m.fromMe && (
                                <button 
                                  onClick={() => {
                                    initiateEdit(m.id, m.text || '');
                                    setActiveMessageMenuId(null);
                                  }}
                                  disabled={!canEditMessage(m)}
                                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                                    canEditMessage(m)
                                      ? 'hover:bg-indigo-500/10 hover:text-indigo-300 text-slate-400 cursor-pointer'
                                      : 'text-slate-600 opacity-40 cursor-not-allowed'
                                  }`}
                                  title={canEditMessage(m) ? "Edit message content" : "Editing locked because message has been seen by recipient"}
                                >
                                  <span>Edit Message</span>
                                  <Edit3 size={12} />
                                </button>
                              )}

                              {(m.fromMe || (selectedChat?.isGroup && (selectedChat.groupDetails?.ownerId === activeSenderId || selectedChat.groupDetails?.ownerId === 'alex_m.synapse' || selectedChat.groupDetails?.adminIds?.includes(activeSenderId) || selectedChat.groupDetails?.adminIds?.includes('alex_m.synapse')))) && (
                                <button 
                                  onClick={() => {
                                    setConversations(prev => prev.map(c => c.id === selectedChatId ? {
                                      ...c,
                                      messages: c.messages.filter(msg => msg.id !== m.id)
                                    } : c));
                                    setActiveMessageMenuId(null);
                                    if (showToast) showToast('Message Purged', 'info');
                                    playLocalSynth('delete');
                                  }}
                                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl text-rose-500 transition-all text-[11px] font-bold uppercase tracking-wider"
                                >
                                  <span>Purge Message</span>
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Reaction Badges */}
                      {m.reactions && Object.keys(m.reactions).length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {(() => {
                            const counts: Record<string, number> = {};
                            Object.values(m.reactions).forEach(emoji => {
                              counts[emoji] = (counts[emoji] || 0) + 1;
                            });
                            return Object.entries(counts).map(([emoji, count], idx) => (
                              <button 
                                key={idx} 
                                onClick={() => handleToggleReaction(m.id, emoji)}
                                className="inline-flex items-center gap-1 bg-slate-900/60 border border-slate-800 hover:bg-slate-800 px-2 py-0.5 rounded-full text-[10px] text-slate-300 font-bold"
                              >
                                <span>{emoji}</span>
                                <span>{count}</span>
                              </button>
                            ));
                          })()}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {(savedBrainMessageIds.has(m.id) || m.isSavedToBrain) && (
                          <span className="text-[8px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                            <Brain size={9} /> Saved to Brain
                          </span>
                        )}
                        {m.status === ('offline-queued' as MessageStatus) && (
                          <span className="text-[8px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                            <ZapOff size={9} /> Offline Queue
                          </span>
                        )}
                        {m.isEdited && <span className="text-[7px] text-slate-500 font-bold uppercase italic tracking-tighter">edited before seen</span>}
                        <div className="text-[8px] opacity-40 font-bold uppercase tracking-widest">{m.time}</div>
                        {m.fromMe && (
                          <div className="transition-colors duration-500" style={{ color: m.status === 'seen' ? 'var(--chat-accent)' : '#4b5563' }}>
                            {m.status === 'sent' && <Check size={10} strokeWidth={3} />}
                            {(m.status === 'delivered' || m.status === 'seen') && <CheckCheck size={10} strokeWidth={3} />}
                          </div>
                        )}

                        {/* Read receipts details for Group Chats */}
                        {!m.fromMe && m.seenBy && m.seenBy.length > 0 && (
                          <span className="text-[7px] text-indigo-400 font-bold uppercase tracking-wider">
                            Seen by {m.seenBy.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
              })}
            </div>
            
            <footer className="absolute bottom-0 left-0 right-0 p-4 bg-slate-950/95 backdrop-blur-xl border-t border-slate-900 z-30">
              {/* Intent Selection Area & Action Chips */}
              <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar pb-1">
                 {INTENTS.map(intent => (
                   <button 
                    key={intent.id} 
                    type="button"
                    onClick={() => setSelectedIntent(selectedIntent === intent.id ? null : intent.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[8px] font-bold uppercase tracking-widest transition-all border whitespace-nowrap ${
                      selectedIntent === intent.id ? 'text-white shadow-lg scale-105' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                    style={{
                      backgroundColor: selectedIntent === intent.id ? 'var(--chat-accent)' : undefined,
                      borderColor: selectedIntent === intent.id ? 'var(--chat-accent)' : undefined,
                      boxShadow: selectedIntent === intent.id ? '0 0 10px var(--chat-accent-glow)' : undefined
                    }}
                   >
                     <intent.icon size={12} className={selectedIntent === intent.id ? 'text-white' : intent.color} /> {intent.label}
                   </button>
                 ))}

                 {/* ⏰ Send Later Action Chip */}
                 <button
                   type="button"
                   onClick={() => {
                     playLocalSynth('tap');
                     handleOpenSendLaterModal();
                   }}
                   className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[8px] font-bold uppercase tracking-widest transition-all border whitespace-nowrap bg-slate-900 border-slate-800 text-indigo-400 hover:text-indigo-200 hover:border-indigo-500/50 active:scale-95 shadow-sm"
                 >
                   <Clock size={12} className="text-indigo-400 animate-pulse" /> ⏰ Send Later
                 </button>
              </div>

              {/* AI Natural Language Scheduling Suggestion Banner */}
              {aiSuggestedTime && (
                <div className="mb-2.5 px-3.5 py-2.5 bg-gradient-to-r from-indigo-950/90 via-purple-950/80 to-slate-900/90 border border-indigo-500/40 rounded-2xl flex items-center justify-between shadow-xl animate-in slide-in-from-bottom-2 duration-300 backdrop-blur-md">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Sparkles size={14} className="text-amber-400 shrink-0 animate-pulse" />
                    <p className="text-[11px] font-semibold text-slate-200 truncate">
                      💡 Schedule this message? <span className="text-indigo-300 font-bold">({aiSuggestedTime.label})</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        playLocalSynth('tap');
                        applyAiTimeSuggestion();
                      }}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1"
                    >
                      <Clock size={10} /> Schedule
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiSuggestedTime(null)}
                      className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}

              {editingMessageId && (
                <div 
                  className="mb-3 px-4 py-2 border-l-4 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200"
                  style={{
                    backgroundColor: 'var(--chat-accent-soft)',
                    borderLeftColor: 'var(--chat-accent)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Edit3 size={12} style={{ color: 'var(--chat-accent)' }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--chat-accent)' }}>Editing Neural Transmission</span>
                  </div>
                  <button onClick={() => { setEditingMessageId(null); setMessageInput(''); }} className="p-1 hover:bg-white/10 rounded-full" style={{ color: 'var(--chat-accent)' }}><X size={14} /></button>
                </div>
              )}
              {selectedImage && (<div className="mb-4 animate-in slide-in-from-bottom-2 duration-300"><div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 shadow-2xl" style={{ borderColor: 'var(--chat-accent)' }}><img src={selectedImage} className="w-full h-full object-cover" /><button onClick={() => setSelectedImage(null)} className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-500 rounded-full text-white transition-colors"><X size={12} /></button></div></div>)}
              <form onSubmit={handleSendMessage} className="bg-slate-900 border border-slate-800 rounded-[24px] flex items-center px-4 py-1.5 transition-all shadow-2xl relative" style={{ borderColor: (messageInput.trim() || selectedImage) ? 'var(--chat-accent)' : undefined }}>
                <button type="button" onClick={() => imageInputRef.current?.click()} className="p-2 text-slate-500 hover:text-white transition-all active:scale-90"><ImageIcon size={20} /></button>
                <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                <button type="button" onClick={() => { if(showToast) showToast("Neural Camera Initializing...", "info") }} className="p-2 text-slate-500 hover:text-white transition-all active:scale-90"><Camera size={20} /></button>
                <input value={messageInput} onChange={(e) => setMessageInput(e.target.value)} placeholder={editingMessageId ? "Refining signal..." : "Neural transmission..."} className="flex-1 bg-transparent border-none outline-none py-2.5 text-sm text-white px-3 placeholder:text-slate-700 font-medium" />
                <button 
                  type="submit" 
                  disabled={(!messageInput.trim() && !selectedImage)} 
                  className="p-2 transition-all rounded-full disabled:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    color: (messageInput.trim() || selectedImage) ? 'var(--chat-accent)' : undefined,
                    backgroundColor: (messageInput.trim() || selectedImage) ? 'var(--chat-accent-soft)' : undefined
                  }}
                >
                  {editingMessageId ? <ShieldCheck size={18} /> : <Send size={18} />}
                </button>
              </form>
            </footer>

            {/* Chat Info Modal (Slide-up drawer) */}
            <AnimatePresence>
              {isChatInfoOpen && (
                <div className="absolute inset-0 z-40 flex justify-end">
                  {/* Backdrop with elegant blur */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => {
                      playLocalSynth('tap');
                      setIsChatInfoOpen(false);
                    }}
                    className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-40 cursor-pointer"
                  />

                  {/* Sidebar Panel */}
                  <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                    className="relative w-full sm:w-[380px] h-full bg-slate-950/95 border-l border-slate-900 shadow-2xl flex flex-col overflow-hidden z-50 text-white"
                  >
                    {/* Drawer Header */}
                    <div className="p-4 border-b border-slate-900 flex items-center justify-between bg-slate-900/60 backdrop-blur-md">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Info size={14} style={{ color: 'var(--chat-accent)' }} /> Synaptic Identity
                      </h4>
                      <button
                        onClick={() => {
                          playLocalSynth('tap');
                          setIsChatInfoOpen(false);
                        }}
                        className="p-2 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-white transition-all active:scale-95"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Scrollable Panel Area */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar pb-24">
                      {/* Brand identity */}
                      <div className="flex flex-col items-center text-center p-5 bg-slate-900/40 border border-slate-800/60 rounded-3xl space-y-3 relative overflow-hidden">
                        <div 
                          className="absolute -top-12 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-40"
                          style={{ backgroundColor: 'var(--chat-accent)' }}
                        />
                        
                        <div 
                          className="w-20 h-20 rounded-2xl p-[2px] transition-all duration-300"
                          style={{
                            background: `linear-gradient(135deg, var(--chat-accent), #a855f7)`
                          }}
                        >
                          <img 
                            src={selectedChat?.avatar} 
                            className="w-full h-full object-cover rounded-[14px]" 
                            alt={selectedChat?.sender} 
                          />
                        </div>

                        <div>
                          <h3 className="font-bold text-base text-white tracking-wide">{selectedChat?.sender}</h3>
                          <span className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-widest block mt-0.5">
                            {selectedChat?.id?.toUpperCase() || 'NODE LINK'}
                          </span>
                        </div>

                        {/* Connection status tag */}
                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 border border-slate-900 rounded-full">
                          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${activeCustomization.muted ? 'bg-amber-500' : 'bg-emerald-400'}`} />
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                            {activeCustomization.muted ? '🔴 SILENT BRIDGE' : '🟢 SYNC ACTIVE'}
                          </span>
                        </div>
                      </div>

                      {/* Theme Customization section */}
                      <div className="bg-slate-900/40 border border-slate-800/40 p-4 rounded-3xl space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] flex items-center gap-1.5">
                          <Palette size={12} style={{ color: 'var(--chat-accent)' }} /> Spectral Accent Allocation
                        </h4>
                        
                        <div className="grid grid-cols-6 gap-2 pt-1">
                          {(['indigo', 'emerald', 'rose', 'amber', 'purple', 'cyan'] as const).map((color) => {
                            const colorHex = color === 'indigo' ? '#6366f1' :
                                              color === 'emerald' ? '#10b981' :
                                              color === 'rose' ? '#f43f5e' :
                                              color === 'amber' ? '#f59e0b' :
                                              color === 'purple' ? '#a855f7' : '#06b6d4';
                            const active = activeAccent === color;
                            return (
                              <button
                                key={color}
                                onClick={() => {
                                  if (navigator.vibrate) navigator.vibrate(10);
                                  playLocalSynth('toggle');
                                  setChatCustomizations(prev => ({
                                    ...prev,
                                    [selectedChatId || '']: {
                                      ...prev[selectedChatId || ''],
                                      accentColor: color
                                    }
                                  }));
                                }}
                                className="aspect-square rounded-xl flex items-center justify-center transition-all relative border"
                                style={{
                                  borderColor: active ? colorHex : 'transparent',
                                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                  boxShadow: active ? `0 0 10px ${colorHex}40` : undefined
                                }}
                              >
                                <span className="w-3.5 h-3.5 rounded-md pointer-events-none" style={{ backgroundColor: colorHex }} />
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[9px] text-slate-600 font-mono text-center uppercase tracking-wider mt-1">Changes this node channel accent only</p>
                      </div>

                      {/* AI Tone / Sync settings protocol */}
                      <div className="bg-slate-900/40 border border-slate-800/40 p-4 rounded-3xl space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] flex items-center gap-1.5">
                            <Sparkles size={12} style={{ color: 'var(--chat-accent)' }} /> AI Synaptic Protocol
                          </h4>
                          <span className="text-[8px] font-mono font-bold text-slate-400 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded uppercase">
                            {activeCustomization.aiPersonality || 'balanced'}
                          </span>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          {[
                            { id: 'balanced', label: 'Balanced Harmonizer', desc: 'Symmetric causal synthesis' },
                            { id: 'stoic', label: 'Stoic Resonance', desc: 'Logic, clarity, and rational response' },
                            { id: 'hyper-casual', label: 'Hyper-Casual Stream', desc: 'Chill, low semantic pressure' },
                            { id: 'visionary', label: 'Visionary Horizon', desc: 'Highly creative insights' }
                          ].map((pers) => {
                            const isSel = (activeCustomization.aiPersonality || 'balanced') === pers.id;
                            return (
                              <button
                                key={pers.id}
                                onClick={() => {
                                  if (navigator.vibrate) navigator.vibrate(10);
                                  playLocalSynth('toggle');
                                  setChatCustomizations(prev => ({
                                    ...prev,
                                    [selectedChatId || '']: {
                                      ...prev[selectedChatId || ''],
                                      aiPersonality: pers.id as any
                                    }
                                  }));
                                  if (showToast) showToast(`Personality tuned to: ${pers.label}`, 'info');
                                }}
                                className="w-full flex items-center justify-between text-left p-2.5 rounded-2xl border transition-all hover:bg-slate-900/60 active:scale-95"
                                style={{
                                  borderColor: isSel ? 'var(--chat-accent)' : 'rgba(30, 41, 59, 0.4)',
                                  backgroundColor: isSel ? 'var(--chat-accent-soft)' : undefined
                                }}
                              >
                                <div>
                                  <p className="text-[11px] font-bold text-white tracking-wide">{pers.label}</p>
                                  <p className="text-[8px] text-slate-500 font-mono mt-0.5">{pers.desc}</p>
                                </div>
                                <div 
                                  className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0"
                                  style={{ borderColor: isSel ? 'var(--chat-accent)' : 'rgba(71, 85, 105, 0.6)' }}
                                >
                                  {isSel && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--chat-accent)' }} />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Muter and Notifications configurations */}
                      <div className="bg-slate-900/40 border border-slate-800/40 p-4 rounded-3xl space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] flex items-center gap-1.5">
                          <Radio size={12} style={{ color: 'var(--chat-accent)' }} /> Signal Configuration
                        </h4>

                        <div className="space-y-3 pt-1">
                          {/* Notifications mode toggle */}
                          <div className="flex items-center justify-between p-2 hover:bg-slate-900/20 rounded-xl transition-all">
                            <div className="space-y-0.5">
                              <p className="text-[11px] font-bold text-white">Silent Communications</p>
                              <p className="text-[9px] text-slate-500">Suppress alert banners for this thread</p>
                            </div>
                            <button
                              onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(10);
                                playLocalSynth('toggle');
                                setChatCustomizations(prev => ({
                                  ...prev,
                                  [selectedChatId || '']: {
                                    ...prev[selectedChatId || ''],
                                    notificationsSilent: !prev[selectedChatId || '']?.notificationsSilent
                                  }
                                }));
                              }}
                              className="w-10 h-6 rounded-full border p-0.5 transition-colors relative"
                              style={{
                                backgroundColor: activeCustomization.notificationsSilent ? 'var(--chat-accent)' : 'rgba(15, 23, 42, 0.8)',
                                borderColor: 'rgba(71, 85, 105, 0.4)'
                              }}
                            >
                              <motion.div 
                                layout
                                className="w-4.5 h-4.5 rounded-full bg-white shadow-md"
                                animate={{ x: activeCustomization.notificationsSilent ? 14 : 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              />
                            </button>
                          </div>

                          {/* Muter mode toggle */}
                          <div className="flex items-center justify-between p-2 hover:bg-slate-900/20 rounded-xl transition-all">
                            <div className="space-y-0.5">
                              <p className="text-[11px] font-bold text-white">Mute Active Sync</p>
                              <p className="text-[9px] text-slate-500">Isolate channel communications</p>
                            </div>
                            <button
                              onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(10);
                                playLocalSynth('toggle');
                                setChatCustomizations(prev => ({
                                  ...prev,
                                  [selectedChatId || '']: {
                                    ...prev[selectedChatId || ''],
                                    muted: !prev[selectedChatId || '']?.muted
                                  }
                                }));
                              }}
                              className="w-10 h-6 rounded-full border p-0.5 transition-colors relative"
                              style={{
                                backgroundColor: activeCustomization.muted ? 'var(--chat-accent)' : 'rgba(15, 23, 42, 0.8)',
                                borderColor: 'rgba(71, 85, 105, 0.4)'
                              }}
                            >
                              <motion.div 
                                layout
                                className="w-4.5 h-4.5 rounded-full bg-white shadow-md"
                                animate={{ x: activeCustomization.muted ? 14 : 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Shared Multimedia list files */}
                      <div className="bg-slate-900/40 border border-slate-800/40 p-4 rounded-3xl space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                          Shared Media & Decryptions
                        </h4>

                        {(() => {
                          const sharedImages = selectedChat?.messages?.filter(msg => msg.image).map(msg => msg.image) || [];
                          return (
                            <div className="space-y-3">
                              {sharedImages.length > 0 ? (
                                <div className="grid grid-cols-4 gap-2">
                                  {sharedImages.map((img, idx) => (
                                    <div 
                                      key={idx} 
                                      onClick={() => {
                                        playLocalSynth('tap');
                                        setMediaViewerUrl(img || null);
                                      }}
                                      className="aspect-square bg-slate-950 rounded-lg overflow-hidden border border-slate-800 cursor-pointer group hover:border-[#10b981] transition-all relative"
                                    >
                                      <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-300" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                        <ArrowUpRight size={14} className="text-white" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[9px] text-slate-600 font-mono uppercase italic text-center py-2">No transmissions with raw ocular visuals</p>
                              )}

                              {/* Static downloads of dynamic configurations files */}
                              <div className="pt-2 border-t border-slate-900 space-y-1.5">
                                {[
                                  { name: 'Stoic_Pattern_Review.json', size: '12 KB', type: 'json' },
                                  { name: 'Memory_Epoch_Sync.cfg', size: '245 KB', type: 'cfg' },
                                  { name: 'Cognitive_Architecture_v4.pdf', size: '1.4 MB', type: 'pdf' }
                                ].map((file, fIdx) => (
                                  <div 
                                    key={fIdx}
                                    onClick={() => {
                                      playLocalSynth('tap');
                                      if (showToast) showToast(`Downloading ${file.name} securely...`, 'success');
                                    }}
                                    className="p-2 bg-slate-950/65 hover:bg-slate-900 border border-slate-900 hover:border-slate-850 rounded-xl flex items-center justify-between cursor-pointer group transition-all"
                                  >
                                    <div className="flex items-center gap-2 overflow-hidden mr-2">
                                      <Link size={10} className="text-slate-500 group-hover:text-white transition-colors shrink-0" />
                                      <span className="text-[10px] text-slate-400 font-mono tracking-tight group-hover:text-white truncate max-w-[170px]">{file.name}</span>
                                    </div>
                                    <span className="text-[8px] text-slate-500 font-mono shrink-0">{file.size}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Synaptic Maintenance: Clear, Block, Report */}
                      <div className="bg-slate-900/40 border border-slate-800/40 p-4 rounded-3xl space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] flex items-center gap-1.5">
                          <Trash2 size={12} className="text-rose-400" /> Synaptic Maintenance
                        </h4>

                        <div className="grid grid-cols-1 gap-2 pt-1 font-sans">
                          {/* Clear Chat */}
                          <button
                            onClick={() => {
                              playLocalSynth('tap');
                              setShowClearConfirm(true);
                            }}
                            className="w-full flex items-center justify-between p-2.5 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/30 rounded-2xl text-rose-450 transition-all active:scale-95 text-left font-bold"
                          >
                            <span className="text-[10px] uppercase tracking-wider">Flush Transmission Memory</span>
                            <Trash2 size={12} />
                          </button>

                          {/* Block sync thread */}
                          <button
                            onClick={() => {
                              playLocalSynth('tap');
                              setShowBlockConfirm(true);
                            }}
                            className="w-full flex items-center justify-between p-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl text-slate-300 transition-all active:scale-95 text-left font-bold"
                          >
                            <span className="text-[10px] uppercase tracking-wider">Sever Signal Trunk (Block)</span>
                            <EyeOff size={12} />
                          </button>

                          {/* Report infraction validation log */}
                          <button
                            onClick={() => {
                              playLocalSynth('tap');
                              setShowReportConfirm(true);
                            }}
                            className="w-full flex items-center justify-between p-2.5 bg-slate-950 hover:bg-rose-500/5 border border-slate-800 hover:border-rose-500/20 rounded-2xl text-slate-450 hover:text-rose-400 transition-all active:scale-95 text-left font-bold"
                          >
                            <span className="text-[10px] uppercase tracking-wider">Deport Neural Infracon (Report)</span>
                            <Flag size={12} />
                          </button>
                        </div>
                      </div>

                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Multimedia View Overlay dialog */}
            <AnimatePresence>
              {mediaViewerUrl && (
                <div className="absolute inset-0 z-[160] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => {
                      playLocalSynth('tap');
                      setMediaViewerUrl(null);
                    }}
                    className="absolute inset-0 bg-black/95 backdrop-blur-md cursor-zoom-out"
                  />
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative max-w-full max-h-[85%] rounded-[32px] overflow-hidden border border-white/10 shadow-2xl bg-black z-30 flex items-center justify-center animate-in zoom-in-95 duration-200"
                  >
                    <img src={mediaViewerUrl || ''} className="max-w-full max-h-[85vh] object-contain rounded-[24px]" />
                    <button
                      onClick={() => {
                        playLocalSynth('tap');
                        setMediaViewerUrl(null);
                      }}
                      className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-rose-600 text-white rounded-full transition-all"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Confirm wipe memory overlay dialog */}
            <AnimatePresence>
              {showClearConfirm && (
                <div className="absolute inset-0 z-[160] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-slate-900 border border-rose-500/40 p-6 rounded-[32px] shadow-[0_0_50px_rgba(239,68,68,0.2)] max-w-sm text-center relative space-y-4 z-40"
                  >
                    <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/30 text-rose-450 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
                      <Trash2 size={24} />
                    </div>
                    <div className="space-y-1.5 font-sans">
                      <h4 className="font-bold text-white uppercase text-xs tracking-[0.2em] font-outfit">Absolute Memory Purge?</h4>
                      <p className="text-[10px] text-slate-450 font-mono leading-relaxed px-2">
                        This action terminates and clears the synaptic bridge message store for {selectedChat?.sender}. This is permanent.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 font-sans">
                      <button
                        onClick={() => {
                          playLocalSynth('tap');
                          setShowClearConfirm(false);
                        }}
                        className="py-2.5 bg-slate-950 border border-slate-800 text-slate-300 font-bold uppercase text-[9px] tracking-widest rounded-2xl hover:text-white transition-all active:scale-95"
                      >
                        Abort
                      </button>
                      <button
                        onClick={() => {
                          setShowClearConfirm(false);
                          setIsChatInfoOpen(false);
                          if (selectedChatId) {
                            setConversations(prev => prev.map(c => c.id === selectedChatId ? { ...c, messages: [], lastMessage: 'Memory stores purged.' } : c));
                            playLocalSynth('delete');
                            if (showToast) showToast('Synaptic chat history purged successfully!', 'success');
                          }
                        }}
                        className="py-2.5 bg-rose-600 text-white font-bold uppercase text-[9px] tracking-widest rounded-2xl hover:bg-rose-500 transition-all active:scale-95"
                      >
                        Wipe Memory
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Confirm isolate node connection overlay */}
            <AnimatePresence>
              {showBlockConfirm && (
                <div className="absolute inset-0 z-[160] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] shadow-2xl max-w-sm text-center relative space-y-4 z-40"
                  >
                    <div className="w-12 h-12 bg-slate-800 border border-slate-700 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-2">
                      <EyeOff size={24} />
                    </div>
                    <div className="space-y-1.5 font-sans">
                      <h4 className="font-bold text-white uppercase text-xs tracking-[0.2em] font-outfit">Sever Node Link?</h4>
                      <p className="text-[10px] text-slate-450 font-mono leading-relaxed px-2">
                        By isolating node {selectedChat?.sender}, you disable mutual synchronization channels. Can be reinstated at any time.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 font-sans">
                      <button
                        onClick={() => {
                          playLocalSynth('tap');
                          setShowBlockConfirm(false);
                        }}
                        className="py-2.5 bg-slate-950 border border-slate-800 text-slate-300 font-bold uppercase text-[9px] tracking-widest rounded-2xl hover:text-white transition-all active:scale-95"
                      >
                        Keep Node
                      </button>
                      <button
                        onClick={() => {
                          setShowBlockConfirm(false);
                          setIsChatInfoOpen(false);
                          playLocalSynth('success');
                          if (showToast) showToast('Signal bridge isolated successfully. Node blocked.', 'info');
                        }}
                        className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase text-[9px] tracking-widest rounded-2xl transition-all active:scale-95"
                      >
                        Isolate Node
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Confirm send violation log overlay */}
            <AnimatePresence>
              {showReportConfirm && (
                <div className="absolute inset-0 z-[160] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-slate-900 border border-rose-500/20 p-6 rounded-[32px] shadow-2xl max-w-sm text-center relative space-y-4 z-40"
                  >
                    <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Flag size={20} className="text-rose-450" />
                    </div>
                    <div className="space-y-1.5 font-sans">
                      <h4 className="font-bold text-white uppercase text-xs tracking-[0.2em] font-outfit">Deport Synaptic Signal?</h4>
                      <p className="text-[10px] text-slate-450 font-mono leading-relaxed px-2">
                        Submitting an infraction log registers {selectedChat?.sender} for manual cybernetic audit. This cannot be retracted.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 font-sans">
                      <button
                        onClick={() => {
                          playLocalSynth('tap');
                          setShowReportConfirm(false);
                        }}
                        className="py-2.5 bg-slate-950 border border-slate-800 text-slate-300 font-bold uppercase text-[9px] tracking-widest rounded-2xl hover:text-white transition-all active:scale-95"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => {
                          setShowReportConfirm(false);
                          setIsChatInfoOpen(false);
                          playLocalSynth('success');
                          if (showToast) showToast('Neural violation log registered securely. Thank you.', 'success');
                        }}
                        className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase text-[9px] tracking-widest rounded-2xl transition-all active:scale-95"
                      >
                        Submit Deport
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full relative overflow-hidden flex flex-col max-w-2xl mx-auto bg-slate-950/20">
      <div 
        ref={scrollContainerRef} 
        className={`flex-1 custom-scrollbar overflow-x-hidden ${
          activeSubTab === 'signals' && activeSession && activeSignalGroupId 
            ? 'h-full overflow-hidden flex flex-col' 
            : 'overflow-y-auto'
        }`}
      >
        {renderSubTabContent()}
      </div>
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } @keyframes fly-up { 0% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; } 100% { transform: translateY(-120px) scale(1.8) rotate(25deg); opacity: 0; } } .animate-fly-up { animation: fly-up linear forwards; }`}</style>
      {/* Global Share Modal */}
      {activeSharePost && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setActiveSharePost(null)} />
          <div ref={shareMenuRef} className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white font-outfit uppercase tracking-tight">Share Signal</h3>
              <button onClick={() => setActiveSharePost(null)} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-all"><X size={20} /></button>
            </div>
            
            <div className="p-4 space-y-6">
              <div className="space-y-2">
                <div className="px-3 py-1 text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">Nexora Internal</div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleShareToStory(activeSharePost)} className="flex flex-col items-center gap-3 p-4 bg-slate-800/50 hover:bg-indigo-600/20 border border-white/5 rounded-2xl transition-all group">
                    <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform"><History size={20} /></div>
                    <span className="text-[10px] font-bold text-slate-300 group-hover:text-white uppercase tracking-widest">To Story</span>
                  </button>
                  <button onClick={() => { if(showToast) showToast("Asset saved to local node", "success"); setActiveSharePost(null); }} className="flex flex-col items-center gap-3 p-4 bg-slate-800/50 hover:bg-emerald-600/20 border border-white/5 rounded-2xl transition-all group">
                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform"><Download size={20} /></div>
                    <span className="text-[10px] font-bold text-slate-300 group-hover:text-white uppercase tracking-widest">Download</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="px-3 py-1 text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">External Nodes</div>
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(activeSharePost.content || activeSharePost.description)}`); setActiveSharePost(null); }} className="flex flex-col items-center gap-2 p-3 hover:bg-white/5 rounded-xl transition-all group">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform"><WhatsApp size={18} /></div>
                    <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">WhatsApp</span>
                  </button>
                  <button onClick={() => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`); setActiveSharePost(null); }} className="flex flex-col items-center gap-2 p-3 hover:bg-white/5 rounded-xl transition-all group">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform"><Facebook size={18} /></div>
                    <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Facebook</span>
                  </button>
                  <button onClick={() => { window.open(`mailto:?subject=Nexora Signal&body=${encodeURIComponent(activeSharePost.content || activeSharePost.description)}`); setActiveSharePost(null); }} className="flex flex-col items-center gap-2 p-3 hover:bg-white/5 rounded-xl transition-all group">
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform"><Mail size={18} /></div>
                    <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Email</span>
                  </button>
                  <button onClick={() => { if(showToast) showToast("Uploading to Drive...", "info"); setActiveSharePost(null); }} className="flex flex-col items-center gap-2 p-3 hover:bg-white/5 rounded-xl transition-all group">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform"><Drive size={18} /></div>
                    <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Drive</span>
                  </button>
                </div>
              </div>

              <button onClick={handleCopyLink} className="w-full flex items-center justify-center gap-3 p-4 bg-slate-800/50 hover:bg-white/5 border border-white/5 rounded-2xl transition-all group">
                <Link size={16} className="text-slate-400 group-hover:text-indigo-400" />
                <span className="text-[10px] font-bold text-slate-300 group-hover:text-white uppercase tracking-widest">Copy Neural Link</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Details Modal */}
      {selectedCoursePost && (() => {
        const course = getCourseDetails(selectedCoursePost);
        const isAlreadyEnrolled = purchasedPostIds.has(selectedCoursePost.id);
        
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={() => setSelectedCoursePost(null)} />
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col my-8">
              
              {/* Header Image/Banner */}
              <div className="relative aspect-[16/10] bg-gradient-to-tr from-slate-950 to-indigo-950 flex items-end">
                {selectedCoursePost.image ? (
                  <img src={selectedCoursePost.image} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                ) : (
                  <div className={`absolute inset-0 ${selectedCoursePost.gradientClass || 'bg-gradient-to-br from-indigo-950 to-slate-900'} opacity-50`} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                
                {/* Top Actions */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                  <div className="bg-indigo-600/90 text-white text-[8px] font-bold uppercase tracking-[0.25em] px-3 py-1 rounded-full border border-indigo-400/20 backdrop-blur-sm shadow-lg flex items-center gap-1.5 animate-pulse">
                    <Sparkles size={8} /> Active Syllabus
                  </div>
                  <button 
                    onClick={() => { playLocalSynth('tap'); setSelectedCoursePost(null); }}
                    className="p-2 bg-slate-950/70 hover:bg-slate-900/90 border border-white/5 hover:border-slate-700/50 rounded-full text-slate-300 hover:text-white transition-all shadow-md cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Course Title over image */}
                <div className="relative p-6 z-10 w-full">
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.25em] block mb-1">Nexora Certified Course</span>
                  <h3 className="text-xl font-black text-white font-outfit uppercase tracking-tight leading-tight max-w-sm drop-shadow-md">
                    {course.title}
                  </h3>
                </div>
              </div>

              {/* Core Content Layout */}
              <div className="p-6 space-y-6 overflow-y-auto max-h-[50vh] custom-scrollbar">
                
                {/* Provider Detail (by whom given, price, rating) */}
                <div className="bg-slate-950/40 border border-slate-800/65 rounded-[24px] p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Instructor / Organization */}
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/10">
                        {course.providerType === 'company' ? <Building size={16} /> : <UserIcon size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest block">Provider</span>
                        <span className="text-[11px] font-bold text-slate-200 truncate block">{selectedCoursePost.creator}</span>
                        <span className="text-[8px] text-slate-500 font-medium capitalize mt-[-2px] block mb-1">
                          {course.providerType === 'company' ? '🏢 Org / Company' : '👤 Individual'}
                        </span>
                        <button
                          onClick={() => {
                            playLocalSynth('tap');
                            setSelectedInstructorName(selectedCoursePost.creator);
                          }}
                          className="flex items-center gap-1.5 text-[8px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest bg-indigo-505 bg-indigo-500/5 hover:bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/10 active:scale-95 transition-all text-left cursor-pointer w-fit"
                        >
                          View Bio & Courses <ArrowUpRight size={8} />
                        </button>
                      </div>
                    </div>

                    {/* Price Tag */}
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/10">
                        <ShoppingBag size={16} />
                      </div>
                      <div>
                        <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest block">Value</span>
                        <span className="text-[12px] font-mono font-black text-emerald-400 block">
                          {course.price === 0 ? 'FREE' : `$${course.price.toFixed(2)}`}
                        </span>
                        <span className="text-[8px] text-slate-500 font-medium mt-[-2px] block">One-time license</span>
                      </div>
                    </div>

                    {/* Duration badge */}
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/10">
                        <Clock size={16} />
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest block">Duration</span>
                        <span className="text-[11px] font-bold text-slate-200 block">{course.duration}</span>
                        <span className="text-[8px] text-slate-500 font-medium mt-[-2px] block">Full coverage</span>
                      </div>
                    </div>

                    {/* Time Commit / Weekly badge */}
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/10">
                        <Activity size={16} />
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest block">Weekly Load</span>
                        <span className="text-[11px] font-bold text-slate-200 block">{course.timeReq}</span>
                        <span className="text-[8px] text-slate-500 font-medium mt-[-2px] block">Self-paced schedule</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-slate-800/60" />

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Global Evaluation</span>
                    <div className="flex items-center gap-1.5 bg-yellow-400/5 border border-yellow-400/10 px-2.5 py-1 rounded-lg">
                      <Star size={11} className="text-yellow-400" fill="currentColor" />
                      <span className="text-[10px] font-mono font-bold text-yellow-400">{course.rating.toFixed(1)} / 5.0</span>
                    </div>
                  </div>
                </div>

                {/* Course Overview Description */}
                <div className="space-y-2">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.25em] px-1">Syllabus Overview</div>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-normal bg-slate-950/20 p-4 border border-white/5 rounded-2xl italic">
                    "{course.description}"
                  </p>
                </div>

                {/* What's In the Course Curriculum Sections */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.25em]">What you will learn ({course.syllabus.length} units)</div>
                    <span className="text-[8px] text-slate-500 font-bold font-mono">100% Certified</span>
                  </div>
                  
                  <div className="space-y-2">
                    {course.syllabus.map((item: string, index: number) => (
                      <div 
                        key={index} 
                        className="flex items-center gap-3 p-3 bg-slate-950/30 border border-slate-800/40 rounded-2xl hover:bg-slate-950/50 hover:border-slate-800 transition-all duration-300 group/item"
                      >
                        <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center font-mono text-[9px] font-black text-indigo-400 border border-indigo-500/15 group-hover/item:bg-indigo-600 group-hover/item:text-white group-hover/item:border-indigo-500 transition-all">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-slate-350 truncate group-hover/item:text-white transition-colors">{item}</p>
                        </div>
                        <div className="text-[8px] text-indigo-450 bg-indigo-500/5 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-widest opacity-40 group-hover/item:opacity-100 transition-opacity">
                          Core
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Security and Certificate Seal info */}
                <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-emerald-500/5 to-transparent border border-emerald-500/10 rounded-2xl">
                  <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-300 block leading-tight">Fully Encrypted Course Access</span>
                    <span className="text-[8px] text-slate-500 block">Completing curriculum updates your cognitive XP metrics instantly.</span>
                  </div>
                </div>

              </div>

              {/* Action Footer (Purchase / Access) */}
              <div className="p-6 bg-slate-950/60 border-t border-slate-800/80 flex gap-3">
                <button 
                  onClick={() => { playLocalSynth('tap'); setSelectedCoursePost(null); }}
                  className="px-5 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-2xl text-[10px] font-extrabold uppercase tracking-widest transition-all cursor-pointer shadow-lg"
                >
                  Close
                </button>
                {isAlreadyEnrolled ? (
                  <button 
                    disabled
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-indigo-950/50 border border-indigo-500/20 text-indigo-400 rounded-2xl text-[10px] font-extrabold uppercase tracking-widest shadow-lg cursor-not-allowed"
                  >
                    <CheckCircle2 size={14} className="text-indigo-400" /> Connected
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      playLocalSynth('success');
                      onBuy(selectedCoursePost.id);
                      if (showToast) {
                        showToast(`Enrolled: Course data compiled in cognitive node.`, 'success');
                      }
                      setSelectedCoursePost(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-extrabold uppercase tracking-widest transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/10 active:scale-[0.98]"
                  >
                    Enroll Now • {course.price === 0 ? 'FREE' : `$${course.price.toFixed(2)}`}
                  </button>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* Instructor Details Modal */}
      {selectedInstructorName && (() => {
        const inst = getInstructorDetails(selectedInstructorName);
        const instPosts = posts.filter(p => 
          p.creator.toLowerCase() === selectedInstructorName.toLowerCase()
        );
        
        return (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 overflow-y-auto bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={() => setSelectedInstructorName(null)} />
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col my-8">
              
              {/* Header Banner */}
              <div className="relative p-6 pt-10 pb-6 bg-gradient-to-tr from-slate-950 via-indigo-950/70 to-slate-900 border-b border-slate-850 flex flex-col items-center text-center">
                
                {/* Close Button */}
                <button 
                  onClick={() => { playLocalSynth('tap'); setSelectedInstructorName(null); }}
                  className="absolute top-4 right-4 p-2 bg-slate-950/70 hover:bg-slate-900/90 border border-white/5 hover:border-slate-700/50 rounded-full text-slate-300 hover:text-white transition-all shadow-md cursor-pointer"
                >
                  <X size={16} />
                </button>

                {/* Avatar */}
                <div className="relative mb-4">
                  <img src={inst.avatar} className="w-20 h-20 rounded-3xl object-cover border-2 border-indigo-500 shadow-xl" />
                  <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-1 rounded-lg border border-slate-900">
                    <Sparkles size={12} fill="currentColor" />
                  </div>
                </div>

                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.25em] block mb-1">Nexora Expert Node</span>
                <h3 className="text-xl font-black text-white font-outfit uppercase tracking-tight leading-none drop-shadow-md">
                  {inst.name}
                </h3>
                <span className="text-[10px] text-slate-400 font-mono font-bold bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/15 uppercase tracking-wider mt-3 block">
                  {inst.expertise}
                </span>
              </div>

              {/* Core Content Layout */}
              <div className="p-6 space-y-6 overflow-y-auto max-h-[45vh] custom-scrollbar">
                
                {/* Bio Description */}
                <div className="space-y-2">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.25em] px-1">Professional Protocol Bio</div>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-5 border border-slate-800/60 rounded-2xl">
                    "{inst.bio}"
                  </p>
                </div>

                {/* Courses Offered */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.25em]">Available Modules ({instPosts.length})</div>
                    <span className="text-[8px] text-slate-500 font-bold font-mono">Telemetry Safe</span>
                  </div>
                  
                  <div className="space-y-3">
                    {instPosts.length > 0 ? (
                      instPosts.map((post: Post) => {
                        const isThisCourseCurrent = selectedCoursePost?.id === post.id;
                        return (
                          <div 
                            key={post.id}
                            onClick={() => {
                              playLocalSynth('tap');
                              setSelectedCoursePost(post);
                              setSelectedInstructorName(null);
                            }}
                            className={`p-4 rounded-2xl border transition-all text-left cursor-pointer flex items-center justify-between group ${
                              isThisCourseCurrent 
                                ? 'bg-indigo-600/10 border-indigo-500/30 ring-1 ring-indigo-500/20' 
                                : 'bg-slate-950/30 border-slate-800/40 hover:bg-slate-950/60 hover:border-slate-800'
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                                  {post.type.toUpperCase()}
                                </span>
                                {isThisCourseCurrent && (
                                  <span className="text-[7px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Viewing now
                                  </span>
                                )}
                              </div>
                              <h4 className="text-[12px] font-extrabold text-white truncate max-w-[240px] group-hover:text-indigo-400 transition-colors">
                                {post.courseTitle || post.title || post.content.split('.')[0] || 'Premium Masterclass'}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-medium truncate max-w-[240px] mt-0.5">
                                {post.content}
                              </p>
                            </div>
                            <div className="p-2 border border-slate-800 rounded-xl bg-slate-900 group-hover:bg-slate-850 group-hover:border-indigo-500/30 text-slate-400 group-hover:text-indigo-400 transition-all shrink-0">
                              <ArrowUpRight size={14} />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 bg-slate-950/20 rounded-2xl border border-slate-850 text-slate-500">
                        <BookOpen className="mx-auto text-slate-700 mb-2" size={24} />
                        <span className="text-[9px] font-bold uppercase tracking-widest block">No other modules indexable currently</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Action Footer */}
              <div className="p-6 bg-slate-950/60 border-t border-slate-800/80 flex">
                <button 
                  onClick={() => { playLocalSynth('tap'); setSelectedInstructorName(null); }}
                  className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-350 hover:text-white rounded-2xl text-[10px] font-extrabold uppercase tracking-widest transition-all cursor-pointer shadow-lg text-center"
                >
                  Close Profile Inquiry
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Explore Connection Established Post-Follow Modal */}
      <AnimatePresence>
        {showExploreFollowModal && exploreFollowedUser && (
          <div className="fixed inset-0 z-[250] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-slate-900 border border-slate-800 rounded-[36px] w-full max-w-sm shadow-[0_0_50px_rgba(99,102,241,0.15)] relative overflow-hidden p-6 text-center"
            >
              {/* Outer Glow Line */}
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
              
              <div className="space-y-4">
                <div className="w-12 h-12 bg-indigo-600/10 border border-indigo-500/25 rounded-2xl flex items-center justify-center text-indigo-400 mx-auto text-xl shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                  ✨
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white font-outfit uppercase tracking-tight">Connection Established</h3>
                  <p className="text-[11px] leading-relaxed font-semibold text-slate-400">
                    You are now following <span className="text-white font-bold">{exploreFollowedUser.name}</span>. They actively build in various signal spaces. Join their communities and build together.
                  </p>
                </div>

                {/* Direct Communities Join Action inside Explore */}
                <div className="space-y-2 text-left pt-2">
                  <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-widest pl-1">Join Group Channels</span>
                  {SIGNAL_GROUPS_LIST.slice(0, 3).map(group => {
                    const isJoined = joinedGroupIds.includes(group.id);
                    return (
                      <div key={group.id} className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-850 rounded-xl hover:border-slate-800 transition-all select-none">
                        <div className="flex items-center gap-2">
                          <span className="text-sm leading-none">{group.icon}</span>
                          <span className="text-[10.5px] font-bold text-white tracking-tight leading-none truncate max-w-[150px]">{group.name}</span>
                        </div>
                        <button
                          onClick={() => {
                            if (isJoined) {
                              if (setJoinedGroupIds) {
                                setJoinedGroupIds(prev => prev.filter(id => id !== group.id));
                              }
                              if (showToast) showToast(`Disconnected from ${group.name}`, "info");
                            } else {
                              if (setJoinedGroupIds) {
                                setJoinedGroupIds(prev => [...prev, group.id]);
                              }
                              if (showToast) showToast(`Synced to ${group.name}!`, "success");
                              // Automatically navigate to the Signal Group discussion feed
                              setActiveSignalGroupId?.(group.id);
                              setActiveSubTab('signals');
                              setShowExploreFollowModal(false);
                              setExploreFollowedUser(null);
                            }
                          }}
                          className={`py-1 px-2.5 rounded-md text-[8px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                            isJoined 
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                            : 'bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/20 text-indigo-400'
                          }`}
                        >
                          {isJoined ? 'Joined' : 'Join'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button 
                  onClick={() => {
                    setShowExploreFollowModal(false);
                    setExploreFollowedUser(null);
                  }}
                  className="w-full py-3 mt-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-2xl text-[9px] font-extrabold uppercase tracking-widest transition-all cursor-pointer text-center"
                >
                  Configure Later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Group Creation Modal */}
      <GroupCreationModal 
        isOpen={isGroupCreateOpen}
        onClose={() => setIsGroupCreateOpen(false)}
        onCreateGroup={handleCreateGroup}
      />

      {/* Group Info Drawer */}
      {(() => {
        const selectedChat = conversations.find(c => c.id === selectedChatId);
        return (
          <GroupInfoDrawer 
            isOpen={isGroupInfoOpen}
            onClose={() => setIsGroupInfoOpen(false)}
            group={selectedChat}
            onUpdateDetails={handleUpdateGroupDetails}
            onAddMembers={handleAddMembers}
            onKickMember={handleKickMember}
            onPromoteAdmin={handlePromoteAdmin}
            onDemoteAdmin={handleDemoteAdmin}
            onTransferOwnership={handleTransferOwnership}
            onLeaveGroup={handleLeaveGroup}
            onDeleteGroup={handleDeleteGroup}
            onTogglePinMessage={handleTogglePinMessage}
            onUpdateHistorySetting={handleUpdateHistorySetting}
          />
        );
      })()}

      {/* Join Group Modal */}
      <AnimatePresence>
        {isJoinGroupOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[250] animate-in fade-in duration-300">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
            >
              <h3 className="text-lg font-bold text-white mb-2 font-outfit">Join Group Node</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">Enter a unique invitation transmission credentials code to sync with an existing secure group channel.</p>
              
              <input 
                type="text" 
                value={joinInviteCode}
                onChange={(e) => setJoinInviteCode(e.target.value)}
                placeholder="e.g. NEX-3891 or Invite Link"
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 font-mono uppercase transition-colors placeholder:text-slate-600 mb-6"
              />
              
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsJoinGroupOpen(false)}
                  className="px-4 py-2 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleJoinGroupWithCode(joinInviteCode)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-[0_4px_12px_rgba(16,185,129,0.2)] transition-all"
                >
                  Sync Node
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ⏰ Send Later Compact Bottom Sheet Modal */}
      <AnimatePresence>
        {isSendLaterOpen && (
          <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                playLocalSynth('tap');
                setIsSendLaterOpen(false);
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
            />

            {/* Bottom Sheet Card */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800/90 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-hidden z-10 text-white"
            >
              {/* Top Handle / Grab Bar */}
              <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto mb-5 sm:hidden" />

              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-md">
                    <Clock size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-outfit tracking-tight flex items-center gap-2">
                      Send Later
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Automated neural delivery at exact date & time
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playLocalSynth('tap');
                    setIsSendLaterOpen(false);
                  }}
                  className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all active:scale-95"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Quick Preset Time Chips */}
              <div className="mb-5 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                  Quick Presets
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setHours(d.getHours() + 1);
                      setSendLaterDate(d.toISOString().split('T')[0]);
                      setSendLaterTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
                    }}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 hover:border-indigo-500/40 rounded-xl text-[10px] font-bold text-slate-300 hover:text-indigo-300 transition-all text-center"
                  >
                    In 1 Hour
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setSendLaterDate(d.toISOString().split('T')[0]);
                      setSendLaterTime('09:00');
                    }}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 hover:border-indigo-500/40 rounded-xl text-[10px] font-bold text-slate-300 hover:text-indigo-300 transition-all text-center"
                  >
                    Tomorrow 9 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setSendLaterDate(d.toISOString().split('T')[0]);
                      setSendLaterTime('18:00');
                    }}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 hover:border-indigo-500/40 rounded-xl text-[10px] font-bold text-slate-300 hover:text-indigo-300 transition-all text-center"
                  >
                    Tomorrow 6 PM
                  </button>
                </div>
              </div>

              {/* Form Controls */}
              <form onSubmit={handleScheduleMessageSubmit} className="space-y-4">
                {/* Deliver On (Date) & Deliver At (Time) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date Picker */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                      <Calendar size={12} className="text-indigo-400" /> Deliver On
                    </label>
                    <input
                      type="date"
                      value={sendLaterDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSendLaterDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                      required
                    />
                  </div>

                  {/* Time Picker */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                      <Clock size={12} className="text-indigo-400" /> Deliver At
                    </label>
                    <input
                      type="time"
                      value={sendLaterTime}
                      onChange={(e) => setSendLaterTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                      required
                    />
                  </div>
                </div>

                {/* Repeat Options */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <RefreshCw size={12} className="text-indigo-400" /> Repeat (Optional)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['once', 'daily', 'weekly', 'monthly'] as const).map((rMode) => (
                      <button
                        key={rMode}
                        type="button"
                        onClick={() => setSendLaterRepeat(rMode)}
                        className={`py-2 px-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border text-center cursor-pointer ${
                          sendLaterRepeat === rMode
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {rMode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview Message Text */}
                {messageInput.trim() && (
                  <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-2xl space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono">
                      Transmission Preview
                    </span>
                    <p className="text-xs text-slate-300 font-medium line-clamp-2">
                      "{messageInput}"
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      playLocalSynth('tap');
                      setIsSendLaterOpen(false);
                    }}
                    className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer font-outfit"
                  >
                    <Clock size={14} /> Schedule Message
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🔍 Semantic Neural Search Modal */}
      <AnimatePresence>
        {isSemanticSearchOpen && (
          <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                playLocalSynth('tap');
                setIsSemanticSearchOpen(false);
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800/90 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-hidden z-10 text-white max-h-[90vh] flex flex-col"
            >
              {/* Grab handle */}
              <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto mb-4 sm:hidden" />

              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-md">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-outfit tracking-tight flex items-center gap-2">
                      Semantic Neural Search
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Vector-indexed semantic matching across encrypted message history
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playLocalSynth('tap');
                    setIsSemanticSearchOpen(false);
                  }}
                  className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all active:scale-95"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search Form */}
              <form onSubmit={handleExecuteSemanticSearch} className="space-y-4 mb-4 shrink-0">
                <div className="relative flex items-center">
                  <Search size={18} className="absolute left-4 text-purple-400 pointer-events-none" />
                  <input
                    type="text"
                    value={semanticQuery}
                    onChange={(e) => setSemanticQuery(e.target.value)}
                    placeholder="Search by meaning, concept, or phrase..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500/80 rounded-2xl pl-11 pr-28 py-3 text-sm text-white focus:outline-none transition-all placeholder:text-slate-600 font-medium"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isSearchingSemantic || !semanticQuery.trim()}
                    className="absolute right-2 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    {isSearchingSemantic ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    <span>Query</span>
                  </button>
                </div>

                {/* Filter Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {/* Scope */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-mono">Scope</label>
                    <select
                      value={semanticFilters.type}
                      onChange={(e) => setSemanticFilters(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-purple-500"
                    >
                      <option value="all">All Transmissions</option>
                      <option value="dm">Direct Messages</option>
                      <option value="group">Group Channels</option>
                    </select>
                  </div>

                  {/* Media Type */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-mono">Media Type</label>
                    <select
                      value={semanticFilters.mediaType}
                      onChange={(e) => setSemanticFilters(prev => ({ ...prev, mediaType: e.target.value as any }))}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-purple-500"
                    >
                      <option value="all">All Media</option>
                      <option value="text">Text Only</option>
                      <option value="image">Photos</option>
                      <option value="video">Videos</option>
                      <option value="document">Documents</option>
                      <option value="audio">Voice Notes</option>
                    </select>
                  </div>

                  {/* Date Range */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-mono">Time Horizon</label>
                    <select
                      value={semanticFilters.dateRange}
                      onChange={(e) => setSemanticFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-purple-500"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="7days">Past 7 Days</option>
                      <option value="30days">Past 30 Days</option>
                    </select>
                  </div>
                </div>
              </form>

              {/* Results List */}
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1 min-h-[220px]">
                {isSearchingSemantic ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500 space-y-3">
                    <Loader2 size={28} className="animate-spin text-purple-400" />
                    <span className="text-xs font-bold uppercase tracking-widest">Computing Vector Similarities...</span>
                  </div>
                ) : semanticResults.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 space-y-2">
                    <Sparkles size={32} className="mx-auto text-slate-700" />
                    <p className="text-xs font-semibold text-slate-400">
                      {semanticQuery ? 'No semantic matches found for this query.' : 'Type a query above to search message index.'}
                    </p>
                    <p className="text-[10px] text-slate-600 max-w-sm mx-auto">
                      Nexora semantic search uses 64-dimensional FastText vector embeddings to find relevant messages based on concept similarity.
                    </p>
                  </div>
                ) : (
                  semanticResults.map((res: any, idx: number) => {
                    const msg = res.message || res;
                    const matchPercent = res.matchScore || Math.round((res.similarity || 0.85) * 100);

                    return (
                      <div
                        key={res.id || idx}
                        onClick={() => {
                          if (res.chatId) {
                            setSelectedChatId(res.chatId);
                          }
                          setIsSemanticSearchOpen(false);
                          setTimeout(() => {
                            const elem = document.getElementById(`msg-${msg.id}`);
                            if (elem) {
                              elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              elem.classList.add('ring-2', 'ring-purple-500', 'scale-[1.01]');
                              setTimeout(() => elem.classList.remove('ring-2', 'ring-purple-500', 'scale-[1.01]'), 2000);
                            }
                          }, 300);
                        }}
                        className="p-3.5 bg-slate-950 hover:bg-slate-850 border border-slate-800/80 hover:border-purple-500/40 rounded-2xl transition-all cursor-pointer group flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src={res.conversationAvatar || 'https://i.pravatar.cc/150?u=channel'}
                              className="w-5 h-5 rounded-md object-cover border border-slate-800"
                            />
                            <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                              {res.conversationName || msg.senderName || 'Transmission'}
                            </span>
                            <span className="text-[10px] text-slate-500">• {msg.time || '10:00 AM'}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 uppercase tracking-wider">
                              {matchPercent}% Match
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 font-medium line-clamp-2 pl-7">
                          {msg.text || (msg.image ? '📷 Photo Transmission' : 'Attachment Transmission')}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExploreView;
