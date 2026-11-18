
import {
  AiPendingAction,
  ChatMessage,
  DailyDebriefRecord,
  FocusSessionRecord,
  Post,
  Task,
  UserProfile
} from "../types";

/**
 * NEXORA INTELLIGENCE SERVICE (CLIENT-SIDE)
 * Proxies calls to the server-side Gemini API.
 */

let cooldownUntil = 0;
let lastRankings: any[] = [];
let inFlightRequest: Promise<any[]> | null = null;
let lastPersonalizeTime = 0;
const MIN_PERSONALIZE_INTERVAL = 30000; // 30 seconds of mandatory caching

function applyRankings(posts: Post[], rankings: any[]): Post[] {
  const personalizedPosts = posts.map(post => {
    const ranking = rankings.find((r: any) => r.id === post.id);
    return {
      ...post,
      relevanceReason: ranking ? ranking.relevanceReason : post.relevanceReason
    };
  });

  return personalizedPosts.sort((a, b) => {
    const indexA = rankings.findIndex((r: any) => r.id === a.id);
    const indexB = rankings.findIndex((r: any) => r.id === b.id);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
}

export const geminiService = {
  /**
   * Action-oriented AI Brain endpoint with live Firebase grounding & explicit confirmation proposals
   */
  async brainAssist(params: {
    prompt: string;
    history?: ChatMessage[];
    pendingAction?: AiPendingAction | null;
    userProfile?: UserProfile;
    tasks?: Task[];
    focusSessions?: FocusSessionRecord[];
    dailyDebriefs?: DailyDebriefRecord[];
    currentMode?: string;
    language?: string;
  }): Promise<{
    text: string;
    pendingAction: AiPendingAction | null;
    confirmationDecision: 'confirm' | 'cancel' | null;
  }> {
    try {
      const response = await fetch('/api/gemini/brain-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: params.prompt,
          history: params.history || [],
          pendingAction: params.pendingAction || null,
          context: {
            userProfile: params.userProfile || null,
            tasks: params.tasks || [],
            focusSessions: params.focusSessions || [],
            dailyDebriefs: params.dailyDebriefs || [],
            currentMode: params.currentMode || 'Normal',
            language: params.language || params.userProfile?.language || 'en'
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Neural uplink failed.');
      }

      return {
        text: data.text || "I couldn't generate a response.",
        pendingAction: data.pendingAction || null,
        confirmationDecision: data.confirmationDecision || null
      };
    } catch (error: any) {
      console.warn('Gemini Brain Assist issue:', error);
      return {
        text: error?.message || 'Something went wrong. Please check your connection.',
        pendingAction: null,
        confirmationDecision: null
      };
    }
  },

  /**
   * General text generation for chat or reasoning
   */
  async generateContent(prompt: string, model?: string, systemInstruction?: string, explicitContext?: any) {
    try {
      const userProfileStr = !explicitContext ? localStorage.getItem('nexora_user_profile') : null;
      const userProfile = explicitContext?.userProfile ?? (userProfileStr ? JSON.parse(userProfileStr) : null);
      const tasksStr = !explicitContext ? localStorage.getItem('nexora_tasks') : null;
      const tasks = explicitContext?.tasks ?? (tasksStr ? JSON.parse(tasksStr) : null);
      const mode = explicitContext?.currentMode ?? localStorage.getItem('nexora_current_mode') ?? 'Normal';
      const activeSessionStr = !explicitContext ? localStorage.getItem('nexora_active_session') : null;
      const activeSession = explicitContext?.activeSession ?? (activeSessionStr ? JSON.parse(activeSessionStr) : null);
      const chatHistory = explicitContext?.chatHistory ?? null;

      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt, 
          model, 
          systemInstruction,
          context: {
            userProfile,
            tasks,
            currentMode: mode,
            activeSession,
            chatHistory
          }
        }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Neural uplink failed.");
      }
      
      return data.text || "I couldn't generate a response.";
    } catch (error: any) {
      console.warn("Gemini API issue:", error);
      return error.message || "Something went wrong. Please check your connection.";
    }
  },

  /**
   * Simulated streaming for chat
   */
  async *generateContentStream(prompt: string, model?: string, systemInstruction?: string, explicitContext?: any) {
    try {
      const userProfileStr = !explicitContext ? localStorage.getItem('nexora_user_profile') : null;
      const userProfile = explicitContext?.userProfile ?? (userProfileStr ? JSON.parse(userProfileStr) : null);
      const tasksStr = !explicitContext ? localStorage.getItem('nexora_tasks') : null;
      const tasks = explicitContext?.tasks ?? (tasksStr ? JSON.parse(tasksStr) : null);
      const mode = explicitContext?.currentMode ?? localStorage.getItem('nexora_current_mode') ?? 'Normal';
      const activeSessionStr = !explicitContext ? localStorage.getItem('nexora_active_session') : null;
      const activeSession = explicitContext?.activeSession ?? (activeSessionStr ? JSON.parse(activeSessionStr) : null);
      const chatHistory = explicitContext?.chatHistory ?? null;

      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt, 
          model, 
          systemInstruction,
          context: {
            userProfile,
            tasks,
            currentMode: mode,
            activeSession,
            chatHistory
          }
        }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Server error");
      
      if (data.text) {
        yield data.text;
      } else {
        yield "I couldn't generate a response.";
      }
    } catch (error) {
      console.warn("Gemini Streaming issue:", error);
      yield "Neural synchronization error. Please re-verify network uplink.";
    }
  },

  /**
   * Specialized helper for Creator Hub tasks
   */
  async getCreatorAide(type: 'caption' | 'thumbnail' | 'script', description: string) {
    try {
      const response = await fetch("/api/gemini/creator-aide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, description }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Server error");
      
      return data.text || "";
    } catch (error) {
      console.warn("Creator Aide issue:", error);
      return "";
    }
  },

  /**
   * Generates images using the server-side Gemini Image model
   */
  async generateImage(prompt: string, options?: { referenceImage?: string; isProMode?: boolean; aspectRatio?: string }) {
    try {
      const response = await fetch("/api/gemini/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          referenceImage: options?.referenceImage,
          isProMode: options?.isProMode,
          aspectRatio: options?.aspectRatio || "1:1"
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Image compilation failed.");
      return data.generatedImage;
    } catch (error: any) {
      console.warn("Gemini Image API issue:", error);
      throw error;
    }
  },

  /**
   * AI-driven feed personalization with Circuit Breaker tracking, deduplication, and caching
   */
  async personalizeFeed(posts: Post[], userProfile: UserProfile): Promise<Post[]> {
    // 1. Cooldown circuit breaker check
    if (Date.now() < cooldownUntil) {
      if (lastRankings.length > 0) {
        console.warn("AI Personalization cooldown active. Serving cached rankings.");
        return applyRankings(posts, lastRankings);
      }
      return posts;
    }

    // 2. Client-side quota protection (frequent triggers)
    if (Date.now() - lastPersonalizeTime < MIN_PERSONALIZE_INTERVAL && lastRankings.length > 0) {
      console.log("Serving cached personalization to guard API quota.");
      return applyRankings(posts, lastRankings);
    }

    // 3. Deduplicate concurrent triggers (e.g. App and ExploreView both calling on load)
    if (inFlightRequest) {
      try {
        const rankings = await inFlightRequest;
        return applyRankings(posts, rankings);
      } catch (e) {
        return lastRankings.length > 0 ? applyRankings(posts, lastRankings) : posts;
      }
    }

    // Create single unified promise
    inFlightRequest = (async () => {
      try {
        const response = await fetch("/api/gemini/personalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ posts, userProfile }),
        });
        
        if (!response.ok) {
          if (response.status === 429 || response.status === 503) {
            cooldownUntil = Date.now() + 45000; // 45 seconds circuit breaker
            console.warn(`Upstream rate limit detected (${response.status}). Circuit breaker active for 45s.`);
          }
          throw new Error(`Server returned status ${response.status}`);
        }
        
        const data = await response.json();
        if (data.error || data.fallbackActive) {
          cooldownUntil = Date.now() + 45000;
          console.warn("Personalization feedback notice activated circuit breaker cooldown:", data.error);
        }
        
        const rankings = data.rankings || [];
        if (rankings.length > 0) {
          lastRankings = rankings;
          lastPersonalizeTime = Date.now();
        }
        return rankings;
      } catch (error) {
        console.warn("AI Personalization request issue:", error);
        cooldownUntil = Date.now() + 30000; // 30 seconds simple cooldown
        throw error;
      } finally {
        inFlightRequest = null;
      }
    })();

    try {
      const rankings = await inFlightRequest;
      if (rankings.length > 0) {
        return applyRankings(posts, rankings);
      }
      if (lastRankings.length > 0) {
        return applyRankings(posts, lastRankings);
      }
      return posts;
    } catch (e) {
      if (lastRankings.length > 0) {
        return applyRankings(posts, lastRankings);
      }
      return posts;
    }
  },

  /**
   * Automatically analyzes a user-typed task title via Gemini on the server
   * and assigns an appropriate category (e.g., 'Focus', 'Admin', 'Creative') and time estimate.
   */
  async categorizeTask(
    title: string,
    signal?: AbortSignal
  ): Promise<{
    category: string;
    timeEstimate: string;
    reason: string;
    confidence?: number;
    source?: 'gemini' | 'fallback';
  }> {
    const trimmed = title.trim();
    if (!trimmed) {
      return {
        category: 'Focus',
        timeEstimate: '25m',
        reason: 'Default deep focus task',
        source: 'fallback'
      };
    }

    try {
      const response = await fetch("/api/gemini/categorize-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
        signal
      });

      if (!response.ok) {
        throw new Error(`Categorization failed (${response.status})`);
      }

      const data = await response.json();
      return {
        category: data.category || 'Focus',
        timeEstimate: data.timeEstimate || '25m',
        reason: data.reason || 'Classified by Nexora AI',
        confidence: typeof data.confidence === 'number' ? data.confidence : 0.85,
        source: data.source === 'gemini' ? 'gemini' : 'fallback'
      };
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw error;
      }
      console.warn("Task categorization fallback triggered:", error);
      return {
        category: 'Focus',
        timeEstimate: '25m',
        reason: 'Assigned default Focus category',
        confidence: 0.5,
        source: 'fallback'
      };
    }
  }
};

