
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Send, Bot, User, ArrowLeft, Loader2, Sparkles, Globe, ExternalLink, Compass, MessageSquare, TrendingUp, BookOpen, Lightbulb, Zap, Rocket, Brain as BrainIcon, ChevronRight, RefreshCw, Trash2, Calendar, Newspaper, ArrowUpRight, Clock, Cpu, Terminal, Plus, Search, Check, X } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import {
  ChatMessage,
  UserProfile,
  Task,
  AiActionDispatcher,
  AiPendingAction,
  FocusSessionRecord,
  DailyDebriefRecord,
  AppMode
} from '../types';
import { useTranslation } from '../localization/LanguageContext';
import { nexoraFirestoreService, sanitizeFirestoreId } from '../services/nexoraFirestoreService';

interface DiscoveryItem {
  id: string;
  title: string;
  summary: string;
  category: 'Trending' | 'Goal-Oriented' | 'Deep Dive';
  image: string;
  prompt: string;
  icon: React.ReactNode;
}

interface NewsHighlight {
  id: string;
  headline: string;
  source: string;
  time: string;
  impact: 'high' | 'medium' | 'low';
  tag: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: Date;
  spaceId?: string;
  pendingAction?: AiPendingAction | null;
}

const INITIAL_DISCOVERY_ITEMS: DiscoveryItem[] = [
  {
    id: 'trending-1',
    title: 'The Dopamine Reset: Reclaim Focus',
    summary: 'A neurobiological approach to filtering digital noise and achieving deep work states in a hyper-connected world.',
    category: 'Trending',
    image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=400',
    prompt: 'How can I implement a 24-hour dopamine detox to improve my productivity score in Nexora?',
    icon: <Zap size={14} className="text-orange-400" />
  },
  {
    id: 'goal-1',
    title: 'Advanced React Architecture',
    summary: 'Mastering Compound Components and Render Props to build scalable Nexora-like interfaces.',
    category: 'Goal-Oriented',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=400',
    prompt: 'Explain the Compound Component pattern in React. How does it help in building complex UI dashboards like Nexora?',
    icon: <Rocket size={14} className="text-indigo-400" />
  },
  {
    id: 'dive-1',
    title: 'Naval Ravikant on Wealth',
    summary: 'Deep dive into specific leverage points: Code, Media, and Capital. How to build without permission.',
    category: 'Deep Dive',
    image: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&q=80&w=400',
    prompt: 'Break down Navals "How to Get Rich" thread. Specifically, how do I apply the concept of specific knowledge to my coding career?',
    icon: <Lightbulb size={14} className="text-yellow-400" />
  }
];

const INITIAL_NEWS: NewsHighlight[] = [
  { id: 'n1', headline: "Global productivity levels hit 5-year high due to AI automation", source: "Neural Times", time: "12m ago", impact: 'high', tag: 'Economy' },
  { id: 'n2', headline: "New study reveals 15-minute 'Grind' sessions beat 4-hour marathons", source: "Focus Lab", time: "1h ago", impact: 'medium', tag: 'Science' },
  { id: 'n3', headline: "Gemini 3 capabilities expanded for complex architectural reasoning", source: "Nexora Dev", time: "3h ago", impact: 'high', tag: 'Update' },
];

interface AIBrainViewProps {
  userProfile: UserProfile;
  onInteraction?: (postId: string, type: 'like' | 'share' | 'purchase' | 'view') => void;
  tasks: Task[];
  autonomousActivities: string[];
  mode?: string;
  ghostMessages?: ChatMessage[];
  setGhostMessages?: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  activeSpaceId?: string;
  aiActionDispatcher?: AiActionDispatcher;
  focusSessions?: FocusSessionRecord[];
  dailyDebriefs?: DailyDebriefRecord[];
}

const AIBrainView: React.FC<AIBrainViewProps> = ({ 
  userProfile, 
  onInteraction, 
  tasks, 
  autonomousActivities,
  mode,
  ghostMessages,
  setGhostMessages,
  activeSpaceId = 'business',
  aiActionDispatcher,
  focusSessions = [],
  dailyDebriefs = []
}) => {
  const isGhost = mode === 'Ghost';
  const uid = !isGhost ? (userProfile?.userId || '') : '';
  const { t, language } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<'intelligence' | 'discover' | 'history' | 'saved_brain'>('intelligence');
  
  const [savedBrainMessages, setSavedBrainMessages] = useState<any[]>([]);
  const [isLoadingSavedBrain, setIsLoadingSavedBrain] = useState(false);
  const [brainSearchQuery, setBrainSearchQuery] = useState('');

  const fetchSavedBrainMessages = async () => {
    setIsLoadingSavedBrain(true);
    try {
      const res = await fetch('/api/chat/savedBrainMessages');
      const data = await res.json();
      setSavedBrainMessages(data.savedMessages || []);
    } catch (err) {
      console.error('Failed to fetch saved brain messages:', err);
    } finally {
      setIsLoadingSavedBrain(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'saved_brain') {
      fetchSavedBrainMessages();
    }
  }, [activeSubTab]);

  const handleRemoveSavedBrainMessage = async (msgId: string) => {
    try {
      await fetch('/api/chat/unsaveFromBrain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: msgId })
      });
      setSavedBrainMessages(prev => prev.filter(m => m.messageId !== msgId && m.id !== msgId));
    } catch (err) {
      console.error('Failed to unsave message:', err);
    }
  };

  const [isLogsPanelOpen, setIsLogsPanelOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const touchStartRef = useRef<number | null>(null);
  const touchStartClientY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
    touchStartClientY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const diffX = touchStartRef.current - currentX;
    if (diffX > 50) {
      setIsLogsPanelOpen(false);
      touchStartRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };
  
  const buildWelcomeMessage = useCallback((): ChatMessage => ({
    role: 'model',
    text: `NEXORA Intelligence Protocol Initialized. Active focus goals detected: ${(userProfile?.goals || []).slice(0, 3).join(', ') || 'Global Optimization'}. How shall we proceed with our objectives?`,
    timestamp: new Date()
  }), [userProfile?.goals]);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, ChatMessage[]>>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(isGhost ? 'ghost-active' : null);
  const [ghostPendingAction, setGhostPendingAction] = useState<AiPendingAction | null>(null);
  const [hasLoadedConvs, setHasLoadedConvs] = useState(false);
  const bootstrappedSpacesRef = useRef<Set<string>>(new Set());

  // Subscribe to Firestore conversations for non-Ghost mode
  useEffect(() => {
    if (isGhost || !uid) {
      setSessions([]);
      setHasLoadedConvs(false);
      return;
    }

    const unsub = nexoraFirestoreService.subscribeBrainConversations(
      uid,
      (convs) => {
        setSessions((prev) => {
          const prevMsgMap = new Map(prev.map((s) => [s.id, s.messages]));
          return convs.map((c) => {
            const tsVal = c.updatedAt?.toDate ? c.updatedAt.toDate() : (c.createdAt?.toDate ? c.createdAt.toDate() : new Date());
            return {
              id: c.id,
              title: c.title || 'New Chat',
              spaceId: c.spaceId || 'business',
              pendingAction: c.pendingAction ?? null,
              messages: prevMsgMap.get(c.id) || (c.lastMessagePreview ? [{ role: 'model' as const, text: c.lastMessagePreview, timestamp: tsVal }] : []),
              timestamp: tsVal instanceof Date ? tsVal : new Date(tsVal || Date.now())
            };
          });
        });
        setHasLoadedConvs(true);
      },
      (err) => {
        console.warn('Brain conversations subscription issue:', err);
      }
    );

    return () => unsub();
  }, [uid, isGhost]);

  // Filter sessions by activeSpaceId
  const spaceSessions = useMemo(() => {
    return sessions.filter((s) => (s.spaceId || 'business') === (activeSpaceId || 'business'));
  }, [sessions, activeSpaceId]);

  // Ensure active session exists for the current space and bootstrap cleanly in Firestore if empty
  useEffect(() => {
    if (isGhost) {
      setActiveSessionId('ghost-active');
      return;
    }
    if (!uid || !hasLoadedConvs) return;

    const currentSpace = activeSpaceId || 'business';
    const spaceSess = sessions.filter((s) => (s.spaceId || 'business') === currentSpace);

    if (spaceSess.length > 0) {
      if (!activeSessionId || !spaceSess.some((s) => s.id === activeSessionId)) {
        setActiveSessionId(spaceSess[0].id);
      }
      return;
    }

    if (bootstrappedSpacesRef.current.has(currentSpace)) return;
    bootstrappedSpacesRef.current.add(currentSpace);

    const newId = sanitizeFirestoreId(`session_${currentSpace}_${Date.now()}`, 'conv');
    const welcomeMsg = buildWelcomeMessage();
    const title = currentSpace === 'business'
      ? 'New Chat'
      : `${currentSpace.charAt(0).toUpperCase() + currentSpace.slice(1)} Intelligence Log`;

    nexoraFirestoreService
      .saveBrainConversation(uid, {
        id: newId,
        title,
        spaceId: currentSpace,
        messageCount: 1,
        lastMessagePreview: welcomeMsg.text,
        pendingAction: null
      })
      .then(() => nexoraFirestoreService.addBrainMessage(uid, newId, welcomeMsg))
      .then(() => {
        setActiveSessionId(newId);
      })
      .catch((err) => {
        console.warn('Failed to bootstrap brain conversation:', err);
      });
  }, [uid, isGhost, hasLoadedConvs, activeSpaceId, sessions, activeSessionId, buildWelcomeMessage]);

  // Subscribe to messages of the currently active conversation
  useEffect(() => {
    if (isGhost || !uid || !activeSessionId) return;

    const unsub = nexoraFirestoreService.subscribeBrainMessages(
      uid,
      activeSessionId,
      (msgs) => {
        setMessagesByConv((prev) => ({ ...prev, [activeSessionId]: msgs }));
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSessionId ? { ...s, messages: msgs } : s))
        );
      },
      (err) => {
        console.warn('Brain messages subscription issue:', err);
      }
    );

    return () => unsub();
  }, [uid, isGhost, activeSessionId]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Active session helper within the space sessions
  const currentSession = useMemo(() => {
    if (isGhost) return null;
    return spaceSessions.find((s) => s.id === activeSessionId) || spaceSessions[0] || sessions.find((s) => s.id === activeSessionId) || sessions[0] || null;
  }, [sessions, spaceSessions, activeSessionId, isGhost]);

  // Current session messages
  const currentMessages = useMemo(() => {
    if (isGhost) {
      return ghostMessages || [];
    }
    if (!currentSession) return [];
    return messagesByConv[currentSession.id] || currentSession.messages || [];
  }, [isGhost, ghostMessages, currentSession, messagesByConv]);

  const activePendingAction: AiPendingAction | null = useMemo(() => {
    if (isGhost) return ghostPendingAction;
    return currentSession?.pendingAction || null;
  }, [isGhost, ghostPendingAction, currentSession]);

  const appendMessage = useCallback(
    async (convId: string, msg: ChatMessage, extraConvPatch?: { title?: string; pendingAction?: AiPendingAction | null }) => {
      if (isGhost) {
        if (setGhostMessages) {
          setGhostMessages((prev) => [...prev, msg]);
        }
        if (extraConvPatch && extraConvPatch.pendingAction !== undefined) {
          setGhostPendingAction(extraConvPatch.pendingAction);
        }
        return;
      }

      if (!uid || !convId) return;
      const existingMsgs = messagesByConv[convId] || [];
      const nextCount = existingMsgs.length + 1;

      setMessagesByConv((prev) => ({
        ...prev,
        [convId]: [...(prev[convId] || []), msg]
      }));

      try {
        await nexoraFirestoreService.saveBrainConversation(uid, {
          id: convId,
          title: extraConvPatch?.title || currentSession?.title || 'New Chat',
          spaceId: currentSession?.spaceId || activeSpaceId || 'business',
          messageCount: nextCount,
          lastMessagePreview: msg.text,
          ...(extraConvPatch && extraConvPatch.pendingAction !== undefined
            ? { pendingAction: extraConvPatch.pendingAction }
            : {})
        });
        await nexoraFirestoreService.addBrainMessage(uid, convId, msg);
      } catch (err) {
        console.warn('Failed persisting brain message:', err);
      }
    },
    [isGhost, setGhostMessages, uid, messagesByConv, currentSession?.spaceId, activeSpaceId]
  );

  useEffect(() => {
    if (isGhost) {
      if (currentMessages.length === 0 && setGhostMessages) {
        setGhostMessages([
          { 
            role: 'model', 
            text: "Ghost session established. Neural traces will be purged upon disconnection. How can I assist you privately?", 
            timestamp: new Date() 
          }
        ]);
      }
    }
  }, [isGhost, setGhostMessages, currentMessages.length]);

  const [isGeneratingDiscoveries, setIsGeneratingDiscoveries] = useState(false);
  const [sources, setSources] = useState<any[]>([]);
  const [discoveryItems, setDiscoveryItems] = useState<DiscoveryItem[]>(INITIAL_DISCOVERY_ITEMS);
  const [news, setNews] = useState<NewsHighlight[]>(INITIAL_NEWS);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const lastLengthRef = useRef<number>(0);
  const lastTabRef = useRef<string>('intelligence');

  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const lastMsg = currentMessages[currentMessages.length - 1];
      
      const lengthChanged = currentMessages.length !== lastLengthRef.current;
      const tabChanged = activeSubTab !== lastTabRef.current;
      
      if (lengthChanged || tabChanged) {
        lastLengthRef.current = currentMessages.length;
        lastTabRef.current = activeSubTab;
        
        if (activeSubTab === 'intelligence') {
          if (lastMsg && lastMsg.role === 'model') {
            setTimeout(() => {
              if (latestMessageRef.current) {
                const element = latestMessageRef.current;
                const containerRect = container.getBoundingClientRect();
                const elementRect = element.getBoundingClientRect();
                const relativeTop = elementRect.top - containerRect.top + container.scrollTop;
                
                container.scrollTo({
                  top: Math.max(0, relativeTop - 24),
                  behavior: 'smooth'
                });
              }
            }, 60);
          } else {
            container.scrollTo({
              top: container.scrollHeight,
              behavior: 'smooth'
            });
          }
        }
      }
    }
  }, [currentMessages, activeSubTab]);

  const executePendingAndLog = async (convId: string, pending: AiPendingAction, baseReplyText?: string) => {
    if (!aiActionDispatcher) {
      await appendMessage(
        convId,
        {
          role: 'model',
          text: baseReplyText || 'Action dispatcher unavailable in this standalone view.',
          timestamp: Date.now(),
          actionResult: {
            actionType: pending.kind,
            summary: pending.summary,
            status: 'failed'
          }
        },
        { pendingAction: null }
      );
      return;
    }

    const res = await aiActionDispatcher.executePendingAction(pending);
    await appendMessage(
      convId,
      {
        role: 'model',
        text: baseReplyText ? `${baseReplyText}\n\n${res.message}` : res.message,
        timestamp: Date.now(),
        actionResult: {
          actionType: pending.kind,
          summary: res.message,
          status: res.success ? 'executed' : 'failed'
        }
      },
      { pendingAction: null }
    );
  };

  const cancelPendingAndLog = async (convId: string, pending: AiPendingAction, replyText?: string) => {
    if (!isGhost && uid) {
      await nexoraFirestoreService.logAiAction(uid, pending.idempotencyKey, {
        actionType: pending.kind,
        summary: pending.summary,
        status: 'cancelled'
      }).catch(() => {});
    }
    await appendMessage(
      convId,
      {
        role: 'model',
        text: replyText || 'Cancelled — no changes were made.',
        timestamp: Date.now(),
        actionResult: {
          actionType: pending.kind,
          summary: pending.summary,
          status: 'cancelled'
        }
      },
      { pendingAction: null }
    );
  };

  const handleConfirmPendingClick = async () => {
    if (!activePendingAction || isLoading) return;
    const convId = currentSession?.id || 'ghost-active';
    setIsLoading(true);
    try {
      await executePendingAndLog(convId, activePendingAction);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPendingClick = async () => {
    if (!activePendingAction || isLoading) return;
    const convId = currentSession?.id || 'ghost-active';
    setIsLoading(true);
    try {
      await cancelPendingAndLog(convId, activePendingAction);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || isLoading) return;
    if (activeSubTab !== 'intelligence') setActiveSubTab('intelligence');

    let targetConvId = currentSession?.id || '';
    if (!isGhost && !targetConvId && uid) {
      targetConvId = sanitizeFirestoreId(`session_${Date.now()}`, 'conv');
      await nexoraFirestoreService.saveBrainConversation(uid, {
        id: targetConvId,
        title: textToSend.length > 35 ? textToSend.substring(0, 35) + '...' : textToSend,
        spaceId: activeSpaceId || 'business',
        messageCount: 0,
        lastMessagePreview: textToSend,
        pendingAction: null
      });
      setActiveSessionId(targetConvId);
    }

    const convId = isGhost ? 'ghost-active' : targetConvId;
    const existingMessages = [...currentMessages];
    const shouldAutoTitle =
      currentSession &&
      (currentSession.title === 'New Chat' || currentSession.title === 'Persisted Session' || currentSession.title.endsWith('Intelligence Log')) &&
      !existingMessages.some((m) => m.role === 'user');
    const derivedTitle = shouldAutoTitle
      ? (textToSend.length > 35 ? textToSend.substring(0, 35) + '...' : textToSend)
      : undefined;

    const userMessage: ChatMessage = { role: 'user', text: textToSend, timestamp: Date.now() };
    await appendMessage(convId, userMessage, derivedTitle ? { title: derivedTitle } : undefined);

    if (!customPrompt) setInput('');
    setIsLoading(true);
    setSources([]);

    if (onInteraction) {
      onInteraction('ai-brain-interaction', 'like');
    }

    try {
      const response = await geminiService.brainAssist({
        prompt: textToSend,
        history: [...existingMessages, userMessage],
        pendingAction: activePendingAction,
        userProfile,
        tasks,
        focusSessions,
        dailyDebriefs,
        currentMode: (mode as AppMode) || AppMode.NORMAL,
        language: userProfile?.language || language || 'en'
      });

      if (response.confirmationDecision === 'confirm' && activePendingAction) {
        await executePendingAndLog(convId, activePendingAction, response.text);
      } else if (response.confirmationDecision === 'cancel' && activePendingAction) {
        await cancelPendingAndLog(convId, activePendingAction, response.text);
      } else if (response.pendingAction) {
        await appendMessage(
          convId,
          {
            role: 'model',
            text: response.text,
            timestamp: Date.now(),
            actionResult: {
              actionType: response.pendingAction.kind,
              summary: response.pendingAction.summary,
              status: 'proposed'
            }
          },
          { pendingAction: response.pendingAction }
        );
      } else {
        await appendMessage(
          convId,
          {
            role: 'model',
            text: response.text,
            timestamp: Date.now()
          },
          activePendingAction ? { pendingAction: null } : undefined
        );
      }
    } catch (error) {
      await appendMessage(convId, {
        role: 'model',
        text: 'Neural synchronization error. Please re-verify network uplink.',
        timestamp: Date.now()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createNewSession = async () => {
    if (isGhost) {
      setGhostPendingAction(null);
      if (setGhostMessages) {
        setGhostMessages([
          { 
            role: 'model', 
            text: "Ghost session established. Neural traces will be purged upon disconnection. How can I assist you privately?", 
            timestamp: new Date() 
          }
        ]);
      }
      return;
    }

    const hasUserMessages = currentMessages.some((m) => m.role === 'user');
    if (!hasUserMessages && currentSession) {
      setActiveSubTab('intelligence');
      return;
    }

    if (!uid) return;
    const newId = sanitizeFirestoreId(`session_${Date.now()}`, 'conv');
    const welcomeMsg = buildWelcomeMessage();
    try {
      await nexoraFirestoreService.saveBrainConversation(uid, {
        id: newId,
        title: 'New Chat',
        spaceId: activeSpaceId || 'business',
        messageCount: 1,
        lastMessagePreview: welcomeMsg.text,
        pendingAction: null
      });
      await nexoraFirestoreService.addBrainMessage(uid, newId, welcomeMsg);
      setActiveSessionId(newId);
      setActiveSubTab('intelligence');
    } catch (err) {
      console.warn('Failed creating brain session:', err);
    }
  };

  const clearHistory = () => {
    if (isGhost) {
      setGhostPendingAction(null);
      if (setGhostMessages) {
        setGhostMessages([
          { 
            role: 'model', 
            text: 'Ghost buffer wiped. Session clean.', 
            timestamp: new Date() 
          }
        ]);
      }
      return;
    }

    createNewSession();
  };

  const deleteSession = async (id: string, skipConfirm: boolean = false) => {
    if (!skipConfirm && !window.confirm("Permanently delete this neural log?")) return;
    if (isGhost || !uid) return;

    try {
      await nexoraFirestoreService.deleteBrainConversation(uid, id);
      if (activeSessionId === id) {
        const remaining = spaceSessions.filter((s) => s.id !== id);
        setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.warn('Failed deleting session:', err);
    }
  };

  const performDeleteAllSessions = async () => {
    if (isGhost || !uid) return;
    try {
      for (const s of spaceSessions) {
        await nexoraFirestoreService.deleteBrainConversation(uid, s.id);
      }
      setActiveSessionId(null);
    } catch (err) {
      console.warn('Failed deleting all sessions:', err);
    }
  };

  const loadSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setActiveSubTab('intelligence');
  };

  const generateNewDiscoveries = async () => {
    setIsGeneratingDiscoveries(true);
    try {
      const prompt = `Generate 3 high-impact "Discovery Feed" items and 3 "Breaking News" headlines for a youth-oriented AI super-app. Return exactly a JSON object.`;
      const response = await geminiService.generateContent(prompt, 'gemini-3.5-flash', 'Return only raw JSON.', {
        userProfile,
        tasks,
        currentMode: mode || AppMode.NORMAL
      });
      const cleaned = response.replace(/```json|```/g, '').trim();
      const data = JSON.parse(cleaned);
      const mappedDiscoveries: DiscoveryItem[] = data.discoveries.map((item: any, i: number) => ({
        ...item,
        id: `ai-disc-${Date.now()}-${i}`,
        icon: item.category === 'Trending' ? <TrendingUp size={14} className="text-emerald-400" /> : <Rocket size={14} className="text-indigo-400" />
      }));
      setDiscoveryItems(prev => [...mappedDiscoveries, ...prev.slice(0, 2)]);
      setNews(data.news.map((n: any, i: number) => ({ ...n, id: `n-${i}`, time: 'Just now' })));
    } catch (err) { console.error(err); } finally { setIsGeneratingDiscoveries(false); }
  };

  const today = useMemo(() => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }), []);

  return (
    <div className={`h-[calc(100vh-160px)] flex max-w-6xl mx-auto overflow-hidden transition-all duration-1000 ${isGhost ? 'bg-[#050508]' : 'bg-slate-950'} rounded-[32px] border border-slate-900 shadow-2xl w-full`}>
      {/* ChatGPT-style Sidebar for Recent Chats on Left */}
      {!isGhost && (
        <div className="hidden md:flex w-64 flex-col bg-slate-950/80 border-r border-slate-900 overflow-hidden shrink-0">
          <div className="p-4 border-b border-slate-900">
            <button 
              type="button"
              onClick={createNewSession}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/25 hover:border-indigo-500/40 text-indigo-400 text-xs font-bold rounded-2xl transition-all uppercase tracking-wider"
            >
              <Plus size={14} /> New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">Recent Chats</h4>
            {spaceSessions.map((session) => (
              <div 
                key={session.id}
                onClick={() => {
                  setActiveSessionId(session.id);
                  setActiveSubTab('intelligence');
                }}
                className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${session.id === activeSessionId ? 'bg-indigo-600/10 border-indigo-500/20 text-white font-medium' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <MessageSquare size={14} className={session.id === activeSessionId ? 'text-indigo-400 font-medium' : 'text-slate-500'} />
                  <span className="text-xs font-semibold truncate select-none">{session.title}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/10 hover:text-rose-400 rounded-lg transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-900 bg-slate-950/20">
            <p className="text-[9px] text-slate-600 text-center font-bold uppercase tracking-widest">
              {sessions.length} Chat logs saved
            </p>
          </div>
        </div>
      )}

      {/* Main chat & subtab content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Scrollable container for conversation and discovery content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Scrollable Header & Tab switcher */}
        <header className={`px-6 pt-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 transition-colors duration-1000 ${isGhost ? 'bg-[#050508]' : 'bg-slate-950'}`}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsLogsPanelOpen(true)}
              className="w-14 h-14 rounded-[22px] flex items-center justify-center shadow-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-705 text-slate-300 hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0"
              title="Open Logs"
            >
              <span className="text-xl leading-none">☰</span>
            </button>
            <div className={`w-14 h-14 rounded-[22px] flex items-center justify-center shadow-lg group cursor-pointer border transition-all hover:rotate-12 ${isGhost ? 'bg-slate-900 border-white/5' : 'bg-white border-white/20'}`} onClick={() => setActiveSubTab('intelligence')}>
               <span className={`${isGhost ? 'text-indigo-400' : 'text-slate-950'} font-black text-xl`}>N</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className={`${isGhost ? 'bg-indigo-500/5 border-indigo-500/10 text-indigo-500/50' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'} px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest flex items-center gap-1.5`}>
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isGhost ? 'bg-indigo-900' : 'bg-indigo-500'}`} /> {isGhost ? 'Isolated Link' : 'Live Now'}
                </div>
              </div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-1 flex items-center gap-2">
                 {isGhost ? 'Ghost Protocol' : 'Fast Mode'} <span className="w-1 h-1 rounded-full bg-slate-800" /> {today}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:self-center">
            <button 
              onClick={() => setActiveSubTab(activeSubTab === 'saved_brain' ? 'intelligence' : 'saved_brain')}
              className={`w-12 h-12 md:w-14 md:h-14 rounded-[22px] flex items-center justify-center shadow-lg border transition-all hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0 ${
                activeSubTab === 'saved_brain'
                  ? 'bg-purple-600 border-purple-500 text-white shadow-xl shadow-purple-600/30'
                  : 'bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-705 text-slate-400 hover:text-white'
              }`}
              title="Saved Brain Transmissions"
            >
              <BrainIcon size={18} />
            </button>

            <button 
              onClick={() => setActiveSubTab(activeSubTab === 'discover' ? 'intelligence' : 'discover')}
              className={`w-12 h-12 md:w-14 md:h-14 rounded-[22px] flex items-center justify-center shadow-lg border transition-all hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0 ${
                activeSubTab === 'discover'
                  ? (isGhost ? 'bg-indigo-600/20 border-indigo-500/35 text-indigo-400' : 'bg-white border-white/20 text-slate-950 shadow-xl')
                  : 'bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-705 text-slate-400 hover:text-white'
              }`}
              title="Discover"
            >
              <Compass size={18} />
            </button>
          </div>
        </header>

        {activeSubTab === 'intelligence' && (
          <div className="px-4 md:px-6 space-y-8 pb-20">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2">
                <Cpu size={12} /> {isGhost ? 'Temporary Uplink' : 'Active Uplink'}
              </h3>
              <button onClick={clearHistory} className="text-slate-600 hover:text-rose-400 transition-colors flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest">
                <Trash2 size={12} /> {isGhost ? 'Wipe Buffer' : t('clear_chat', 'Archive & Clear')}
              </button>
            </div>
            
            <div className="space-y-8 pr-4">
              {currentMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  ref={idx === currentMessages.length - 1 ? latestMessageRef : null}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards`}
                >
                  <div className={`flex gap-5 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm shadow-xl transition-all duration-700 ${msg.role === 'user' ? (isGhost ? 'bg-slate-900 border border-indigo-500/20 text-indigo-400' : 'bg-indigo-600 text-white shadow-lg') : (isGhost ? 'bg-slate-950 text-slate-500 border border-white/5' : 'bg-slate-800 text-white border border-slate-700')}`}>
                      {msg.role === 'user' ? 'G' : 'N'}
                    </div>
                    <div className={`p-6 rounded-3xl shadow-2xl relative group transition-all duration-700 ${msg.role === 'user' ? (isGhost ? 'bg-slate-900 text-slate-300 rounded-tr-none border border-white/5' : 'bg-indigo-600/90 text-white rounded-tr-none border border-white/10') : (isGhost ? 'bg-slate-900/40 backdrop-blur-md border border-white/5 text-slate-400 rounded-tl-none font-medium' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none')}`}>
                      {msg.role === 'model' && (
                        <div className="flex items-center gap-2 mb-3">
                           <div className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border ${isGhost ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
                             {isGhost ? 'Private Insight' : 'Answer'}
                           </div>
                        </div>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                      {msg.actionResult && (
                        <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
                            msg.actionResult.status === 'executed'
                              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                              : msg.actionResult.status === 'cancelled'
                              ? 'bg-slate-800 border-slate-700 text-slate-400'
                              : msg.actionResult.status === 'failed'
                              ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                              : 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300'
                          }`}>
                            {msg.actionResult.status === 'executed'
                              ? 'Confirmed & Synced'
                              : msg.actionResult.status === 'cancelled'
                              ? 'Cancelled'
                              : msg.actionResult.status === 'failed'
                              ? 'Action Failed'
                              : 'Awaiting Confirmation'}
                          </span>
                          {msg.actionResult.status === 'proposed' && activePendingAction && idx === currentMessages.length - 1 && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={handleConfirmPendingClick}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40"
                              >
                                <Check size={12} /> Confirm
                              </button>
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={handleCancelPendingClick}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40"
                              >
                                <X size={12} /> Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      <div className={`text-[9px] mt-4 opacity-40 font-bold uppercase tracking-widest ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {isGhost ? 'Disappears on exit' : 'Helpful'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards">
                  <div className="flex gap-5">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center border border-slate-700 font-bold">N</div>
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl rounded-tl-none flex flex-col gap-3 min-w-[200px]">
                      <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Instant Syncing...</p>
                      <div className="flex gap-1.5 mt-1">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {sources.length > 0 && (
              <div className="bg-indigo-600/5 p-5 rounded-3xl border border-indigo-500/10 mt-10">
                <h4 className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Globe size={12} /> Sources
                </h4>
                <div className="flex flex-wrap gap-3">
                  {sources.map((s, i) => s.web && (
                    <a key={i} href={s.web.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white hover:border-indigo-500 transition-all group">
                      <ExternalLink size={10} className="group-hover:text-indigo-400" />
                      <span className="truncate max-w-[200px]">{s.web.title || 'Grounding Data'}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'history' && (
          <div className="px-6 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <Clock size={12} /> Neural Logs
              </h3>
              <p className="text-[8px] font-bold text-slate-700 uppercase tracking-widest">{spaceSessions.length} Archived Sessions</p>
            </div>

            {spaceSessions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {spaceSessions.map((session) => (
                  <div key={session.id} className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] hover:border-slate-700 transition-all group relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="px-2.5 py-1 bg-slate-800 rounded-full text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                        {session.messages.length} Messages
                      </div>
                      <span className="text-[8px] font-bold text-slate-600 uppercase">
                        {session.timestamp.toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white mb-2 line-clamp-1">{session.title}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mb-6 h-8 italic">
                      "{session.messages.find(m => m.role === 'model')?.text.substring(0, 100)}..."
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                      <button 
                        onClick={() => loadSession(session)}
                        className="text-[9px] font-bold text-indigo-400 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1.5"
                      >
                        <RefreshCw size={10} /> Restore Session
                      </button>
                      <button 
                        onClick={() => deleteSession(session.id)}
                        className="text-[9px] font-bold text-slate-600 hover:text-rose-400 transition-colors uppercase tracking-widest"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                <div className="w-20 h-20 bg-slate-900 rounded-[32px] flex items-center justify-center text-slate-800 border border-slate-800/50">
                  <Clock size={32} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg mb-1">No Neural Artifacts</h4>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Clear and archive a chat to see it here</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'discover' && (
          <div className="px-6 animate-in fade-in duration-700 pb-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-1 space-y-8">
                 <div className="flex items-center justify-between">
                   <h4 className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                     <Newspaper size={16} className="text-indigo-400" /> Intelligence Pulse
                   </h4>
                   <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-600 uppercase">
                      Real-time index <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                   </div>
                 </div>
                 <div className="space-y-4">
                   {news.map(item => (
                     <div key={item.id} className="group p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl transition-all hover:bg-slate-800/50 cursor-pointer">
                        <div className="flex items-center justify-between mb-3">
                           <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border ${item.impact === 'high' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-slate-700/30 border-slate-700 text-slate-400'}`}>{item.tag}</span>
                           <span className="text-[8px] text-slate-500 flex items-center gap-1 font-bold">{item.time}</span>
                        </div>
                        <h5 className="text-sm font-bold text-slate-200 leading-snug group-hover:text-white transition-colors">{item.headline}</h5>
                        <div className="mt-4 flex items-center justify-between text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                           <span>{item.source}</span>
                           <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-all text-indigo-400" />
                        </div>
                     </div>
                   ))}
                 </div>
              </div>

              <div className="lg:col-span-2 space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1 font-outfit uppercase tracking-tight">For You</h3>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Based on your goals</p>
                  </div>
                  <button onClick={generateNewDiscoveries} disabled={isGeneratingDiscoveries} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] font-bold text-slate-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-50 uppercase tracking-widest shadow-xl">
                    <RefreshCw size={12} className={isGeneratingDiscoveries ? 'animate-spin' : ''} /> Re-Index
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {discoveryItems.map((item) => (
                    <div key={item.id} onClick={() => handleSendMessage(item.prompt)} className="group relative bg-slate-900 border border-slate-800 rounded-[40px] overflow-hidden cursor-pointer hover:border-white/10 transition-all hover:shadow-2xl flex flex-col h-full animate-in zoom-in duration-300">
                      <div className="h-48 w-full overflow-hidden relative">
                        <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s] opacity-50" />
                        <div className="absolute top-5 left-5 flex items-center gap-2 px-4 py-1.5 bg-slate-950/90 backdrop-blur-md rounded-full border border-white/10">
                          {item.icon}
                          <span className="text-[9px] font-bold text-white uppercase tracking-widest">{item.category}</span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                      </div>
                      <div className="p-8 flex flex-col flex-1">
                        <h4 className="text-lg font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors leading-tight">{item.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-6 flex-1 font-medium">{item.summary}</p>
                        <div className="flex items-center justify-between pt-5 border-t border-slate-800">
                          <div className="flex items-center gap-2 text-indigo-400 font-bold text-[10px] uppercase tracking-widest group-hover:text-white transition-colors">Initiate Analysis <Rocket size={12} /></div>
                          <ChevronRight size={18} className="text-slate-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'saved_brain' && (
          <div className="px-4 md:px-6 space-y-6 pb-20 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-purple-950/20 border border-purple-500/20 p-6 rounded-3xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <BrainIcon size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-outfit uppercase tracking-tight flex items-center gap-2">
                    AI Brain Transmissions
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Messages saved directly from Nexora Chat • Vector Indexed for Semantic Memory
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchSavedBrainMessages}
                className="px-4 py-2 bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-purple-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer self-start md:self-auto"
              >
                <RefreshCw size={14} className={isLoadingSavedBrain ? 'animate-spin' : ''} /> Refresh Memory
              </button>
            </div>

            {/* Filter Search */}
            <div className="relative">
              <Search size={16} className="absolute left-4 top-3.5 text-purple-400 pointer-events-none" />
              <input
                type="text"
                value={brainSearchQuery}
                onChange={(e) => setBrainSearchQuery(e.target.value)}
                placeholder="Filter saved memory transmissions..."
                className="w-full bg-slate-900 border border-slate-800 focus:border-purple-500/50 rounded-2xl pl-11 pr-4 py-2.5 text-xs text-white focus:outline-none font-medium transition-all"
              />
            </div>

            {/* Saved items list */}
            {isLoadingSavedBrain ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-3">
                <Loader2 size={28} className="animate-spin text-purple-400" />
                <span className="text-xs font-bold uppercase tracking-widest">Retrieving Neural Memory Index...</span>
              </div>
            ) : savedBrainMessages.length === 0 ? (
              <div className="text-center py-16 text-slate-500 space-y-3 bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
                <BrainIcon size={36} className="mx-auto text-slate-700" />
                <h4 className="text-sm font-bold text-slate-300">No Saved Transmissions in AI Brain</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Save important messages in Nexora Chat using the message menu option <span className="text-purple-400 font-bold">"Save to AI Brain"</span> to index them here for perpetual memory retrieval.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedBrainMessages
                  .filter(m => !brainSearchQuery || (m.text || '').toLowerCase().includes(brainSearchQuery.toLowerCase()) || (m.senderName || '').toLowerCase().includes(brainSearchQuery.toLowerCase()))
                  .map((m) => (
                    <div key={m.id || m.messageId} className="p-5 bg-slate-900 border border-slate-800 hover:border-purple-500/30 rounded-3xl transition-all space-y-3 relative group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                          <span className="text-xs font-bold text-white">{m.senderName || 'Sender'}</span>
                          <span className="text-[10px] text-slate-500">• {m.sourceConversation || 'Direct Chat'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSavedBrainMessage(m.messageId || m.id)}
                          className="p-1.5 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl text-slate-500 transition-all opacity-0 group-hover:opacity-100"
                          title="Remove from Brain"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <p className="text-xs text-slate-300 font-medium leading-relaxed">
                        {m.text || 'Photo / Media Transmission'}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[9px] text-slate-500 font-mono">
                        <span className="bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          64d Vector Indexed
                        </span>
                        <span>{m.timestamp || m.savedAt ? new Date(m.savedAt || Date.now()).toLocaleDateString() : 'Indexed'}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* STABLE Command Bar - ONLY visible in intelligence mode, significantly slimmed down */}
      {activeSubTab === 'intelligence' && (
        <div className={`px-6 py-2.5 backdrop-blur-xl border-t relative z-20 shrink-0 transition-all duration-1000 ${isGhost ? 'bg-[#050508]/95 border-white/5' : 'bg-slate-950/95 border-slate-900'}`}>
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative group max-w-4xl mx-auto">
            <div className={`absolute inset-0 blur-xl group-focus-within:opacity-100 transition-all opacity-0 ${isGhost ? 'bg-indigo-900/10' : 'bg-indigo-600/5 group-focus-within:bg-indigo-600/10'}`} />
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isGhost ? "Ghost session active..." : t('ask_nexora', 'Ask anything...')}
              className={`w-full border rounded-[24px] py-4 pl-6 pr-16 text-sm transition-all shadow-xl relative z-10 font-medium ${isGhost ? 'bg-slate-900/60 border-white/5 text-slate-300 focus:ring-1 focus:ring-indigo-900/40 placeholder:text-slate-800' : 'bg-slate-900 border-slate-800 text-white focus:ring-1 focus:ring-indigo-500/50 placeholder:text-slate-700'}`}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-[18px] flex items-center justify-center transition-all shadow-xl active:scale-90 z-20 ${isGhost ? 'bg-indigo-600 text-white' : 'bg-white text-slate-950 hover:bg-slate-200'} disabled:opacity-20`}
            >
              <Send size={18} />
            </button>
          </form>
          <p className="text-[6px] text-center text-slate-800 font-bold uppercase tracking-[0.5em] mt-2">{isGhost ? 'Isolated Link' : 'Neural Link Active'}</p>
        </div>
      )}
      </div> {/* Close main chat & subtab content wrapper */}

      {/* Slide-out Left Logs Panel */}
      {isLogsPanelOpen && (
        <div className="fixed inset-0 z-[100] flex select-none animate-in fade-in duration-300">
          {/* Backdrop Overlay */}
          <div 
            onClick={() => setIsLogsPanelOpen(false)}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
          />

          {/* Left Panel */}
          <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative w-80 max-w-full bg-slate-900 border-r border-slate-800 h-full flex flex-col shadow-2xl z-10 transition-transform duration-300 transform translate-x-0 ease-out"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 text-white">
                <span className="text-xl">📜</span>
                <span className="text-sm font-bold tracking-wider uppercase">Logs</span>
              </div>
              <button 
                onClick={() => setIsLogsPanelOpen(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all text-xs font-bold font-sans cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable logs list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {spaceSessions.length > 0 ? (
                spaceSessions.map((session) => {
                  const ts = session.timestamp instanceof Date ? session.timestamp : new Date(session.timestamp);
                  const dateStr = ts.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });
                  const timeStr = ts.toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div 
                      key={session.id}
                      className={`group relative flex flex-col p-4 rounded-2xl border transition-all cursor-pointer ${
                        session.id === activeSessionId 
                          ? 'bg-indigo-600/10 border-indigo-500/30 text-white' 
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-705 text-slate-300 hover:text-white'
                      }`}
                      onClick={() => {
                        loadSession(session);
                        setIsLogsPanelOpen(false);
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold truncate pr-6 font-sans">{session.title}</h4>
                          <span className="text-[10px] text-slate-500 font-medium block mt-1 font-mono">
                            {dateStr} • {timeStr}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSessionToDelete(session.id);
                          }}
                          className="absolute right-3 top-3 p-1.5 opacity-0 group-hover:opacity-100 bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 hover:text-rose-400 rounded-lg transition-all duration-200 cursor-pointer"
                          title="Delete log"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <div className="w-14 h-14 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-600 mb-4 shadow-inner">
                    <Clock size={20} />
                  </div>
                  <h4 className="text-slate-350 font-bold text-sm mb-1 font-sans">No logs available</h4>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed font-sans">
                    Start a conversation to create your first log.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            {spaceSessions.length > 0 && (
              <div className="p-4 border-t border-slate-800 bg-slate-950/20 shrink-0">
                <button
                  onClick={() => setShowDeleteAllConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 hover:border-rose-500/35 text-rose-400 text-xs font-bold rounded-xl transition-all uppercase tracking-wider cursor-pointer font-sans"
                >
                  <Trash2 size={13} /> Delete All Logs
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Single Log Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center select-none animate-in fade-in duration-200">
          <div onClick={() => setSessionToDelete(null)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" />
          <div className="relative bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-xs mx-4 shadow-2xl flex flex-col gap-5 z-10 animate-in zoom-in-95 duration-200">
            <h4 className="text-white font-bold text-sm text-center font-sans">Delete this log?</h4>
            <div className="flex gap-3">
              <button 
                onClick={() => setSessionToDelete(null)}
                className="flex-1 py-2 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all uppercase tracking-wider cursor-pointer font-sans"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  deleteSession(sessionToDelete, true);
                  setSessionToDelete(null);
                }}
                className="flex-1 py-2 px-4 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition-all uppercase tracking-wider shadow-lg shadow-rose-500/20 cursor-pointer font-sans"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Logs Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center select-none animate-in fade-in duration-200">
          <div onClick={() => setShowDeleteAllConfirm(false)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" />
          <div className="relative bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-sm mx-4 shadow-2xl flex flex-col gap-4 z-10 animate-in zoom-in-95 duration-200">
            <div>
              <h4 className="text-white font-bold text-sm text-center mb-1 font-sans">Delete all logs permanently?</h4>
              <p className="text-[11px] text-slate-500 text-center font-semibold uppercase tracking-wider font-mono">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteAllConfirm(false)}
                className="flex-1 py-2.5 px-4 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-705 text-slate-300 text-xs font-bold rounded-xl transition-all uppercase tracking-wider cursor-pointer font-sans"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  performDeleteAllSessions();
                  setShowDeleteAllConfirm(false);
                  setIsLogsPanelOpen(false);
                }}
                className="flex-1 py-2.5 px-4 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition-all uppercase tracking-wider shadow-lg shadow-rose-500/20 cursor-pointer font-sans"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIBrainView;
