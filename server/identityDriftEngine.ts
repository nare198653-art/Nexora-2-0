import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type } from "@google/genai";
import { callGeminiWithRetryAndFallback, cleanAndParseJSON } from "./geminiHelper";


export interface CategoryDrift {
  category: string;
  desired: number; // 10 to 100 (representing aspiration weight)
  actual: number;  // 10 to 100 (representing actual behavioral performance)
  drift: number;   // 0 to 100 (drift value: lower means aligned, higher means drifting)
  evidenceCount: number;
}

export interface DriftHistoryPoint {
  timestamp: number;
  overallDriftScore: number;
  categoryDrifts: Record<string, number>;
  triggerAction?: string;
  reason: string;
}

export interface UserDriftProfile {
  userId: string;
  name: string;
  createdAt: number;
  lastUpdated: number;
  overallDriftScore: number; // 0 to 100 (overall drift index)
  categories: Record<string, CategoryDrift>;
  history: DriftHistoryPoint[];
  recentActivities: { timestamp: number; activityType: string; meta: any }[];
  lastAIEvalTime: number;
  metadata: Record<string, any>;
}

export const DRIFT_CATEGORIES = [
  'Discipline',
  'Learning',
  'Health',
  'Building',
  'Social behaviour',
  'Consistency',
  'Curiosity',
  'Execution',
  'Focus'
] as const;

export type DriftCategoryType = typeof DRIFT_CATEGORIES[number];

const STORAGE_PATH = path.join(process.cwd(), 'identity_drift_profiles.json');

// Map activities to their respective behavioral reinforcements
export const ACTIVITY_DRIFT_BOOSTS: Record<string, { categories: DriftCategoryType[]; intensity: number }> = {
  'focus_session_completed': {
    categories: ['Focus', 'Discipline', 'Consistency', 'Execution'],
    intensity: 6
  },
  'study_session': {
    categories: ['Learning', 'Curiosity', 'Focus'],
    intensity: 5
  },
  'building_project': {
    categories: ['Building', 'Execution', 'Discipline'],
    intensity: 8
  },
  'goal_completed': {
    categories: ['Execution', 'Discipline', 'Consistency'],
    intensity: 9
  },
  'joined_group': {
    categories: ['Social behaviour', 'Curiosity'],
    intensity: 4
  },
  'help_peer': {
    categories: ['Social behaviour', 'Learning'],
    intensity: 6
  },
  'complex_problem_solved': {
    categories: ['Focus', 'Curiosity', 'Building'],
    intensity: 7
  },
  'creativity_session': {
    categories: ['Curiosity', 'Focus'],
    intensity: 5
  },
  'read_article': {
    categories: ['Learning', 'Curiosity'],
    intensity: 3
  },
  'leadership_role': {
    categories: ['Social behaviour', 'Execution', 'Discipline'],
    intensity: 7
  }
};

const SEED_DRIFT_PROFILES: Record<string, Partial<UserDriftProfile>> = {
  'alex': {
    userId: 'alex',
    name: 'Alex M.',
    createdAt: Date.now() - 30 * 24 * 3600 * 1000,
    lastUpdated: Date.now(),
    overallDriftScore: 18, // Well-aligned builder
    categories: {
      'Discipline': { category: 'Discipline', desired: 85, actual: 80, drift: 5, evidenceCount: 14 },
      'Learning': { category: 'Learning', desired: 90, actual: 88, drift: 2, evidenceCount: 19 },
      'Health': { category: 'Health', desired: 60, actual: 40, drift: 20, evidenceCount: 4 },
      'Building': { category: 'Building', desired: 95, actual: 90, drift: 5, evidenceCount: 22 },
      'Social behaviour': { category: 'Social behaviour', desired: 50, actual: 45, drift: 5, evidenceCount: 8 },
      'Consistency': { category: 'Consistency', desired: 80, actual: 78, drift: 2, evidenceCount: 15 },
      'Curiosity': { category: 'Curiosity', desired: 85, actual: 82, drift: 3, evidenceCount: 11 },
      'Execution': { category: 'Execution', desired: 90, actual: 85, drift: 5, evidenceCount: 16 },
      'Focus': { category: 'Focus', desired: 85, actual: 75, drift: 10, evidenceCount: 12 }
    },
    history: [
      { timestamp: Date.now() - 5 * 24 * 3600 * 1000, overallDriftScore: 22, categoryDrifts: { 'Focus': 15, 'Building': 10 }, reason: 'Slight drift in target focus hours during project crunch.' },
      { timestamp: Date.now() - 1 * 24 * 3600 * 1000, overallDriftScore: 18, categoryDrifts: { 'Focus': 10, 'Building': 5 }, reason: 'Regained alignment following 3 successful module releases.' }
    ],
    recentActivities: [],
    lastAIEvalTime: Date.now()
  },
  'sarah': {
    userId: 'sarah',
    name: 'Sarah J.',
    createdAt: Date.now() - 45 * 24 * 3600 * 1000,
    lastUpdated: Date.now(),
    overallDriftScore: 12, // Extremely well-aligned community leader
    categories: {
      'Discipline': { category: 'Discipline', desired: 80, actual: 78, drift: 2, evidenceCount: 12 },
      'Learning': { category: 'Learning', desired: 85, actual: 82, drift: 3, evidenceCount: 18 },
      'Health': { category: 'Health', desired: 70, actual: 68, drift: 2, evidenceCount: 10 },
      'Building': { category: 'Building', desired: 40, actual: 35, drift: 5, evidenceCount: 3 },
      'Social behaviour': { category: 'Social behaviour', desired: 95, actual: 95, drift: 0, evidenceCount: 29 },
      'Consistency': { category: 'Consistency', desired: 85, actual: 82, drift: 3, evidenceCount: 21 },
      'Curiosity': { category: 'Curiosity', desired: 80, actual: 78, drift: 2, evidenceCount: 14 },
      'Execution': { category: 'Execution', desired: 75, actual: 72, drift: 3, evidenceCount: 11 },
      'Focus': { category: 'Focus', desired: 80, actual: 76, drift: 4, evidenceCount: 9 }
    },
    history: [],
    recentActivities: [],
    lastAIEvalTime: Date.now()
  },
  'kira': {
    userId: 'kira',
    name: 'Kira N.',
    createdAt: Date.now() - 15 * 24 * 3600 * 1000,
    lastUpdated: Date.now(),
    overallDriftScore: 34, // Creative struggling with discipline/execution drift
    categories: {
      'Discipline': { category: 'Discipline', desired: 80, actual: 45, drift: 35, evidenceCount: 5 },
      'Learning': { category: 'Learning', desired: 85, actual: 80, drift: 5, evidenceCount: 16 },
      'Health': { category: 'Health', desired: 70, actual: 50, drift: 20, evidenceCount: 4 },
      'Building': { category: 'Building', desired: 90, actual: 60, drift: 30, evidenceCount: 8 },
      'Social behaviour': { category: 'Social behaviour', desired: 75, actual: 70, drift: 5, evidenceCount: 12 },
      'Consistency': { category: 'Consistency', desired: 85, actual: 40, drift: 45, evidenceCount: 6 },
      'Curiosity': { category: 'Curiosity', desired: 95, actual: 92, drift: 3, evidenceCount: 22 },
      'Execution': { category: 'Execution', desired: 85, actual: 50, drift: 35, evidenceCount: 7 },
      'Focus': { category: 'Focus', desired: 90, actual: 62, drift: 28, evidenceCount: 9 }
    },
    history: [
      { timestamp: Date.now() - 10 * 24 * 3600 * 1000, overallDriftScore: 42, categoryDrifts: { 'Discipline': 45, 'Consistency': 50 }, reason: 'High drift in consistency. Ideation is strong but structural follow-through is lacking.' },
      { timestamp: Date.now() - 2 * 24 * 3600 * 1000, overallDriftScore: 34, categoryDrifts: { 'Discipline': 35, 'Consistency': 45 }, reason: 'Execution drift reduced slightly after submitting 2 creative prototypes.' }
    ],
    recentActivities: [],
    lastAIEvalTime: Date.now()
  }
};

export class IdentityDriftEngine {
  private profiles: Record<string, UserDriftProfile> = {};
  private ai: GoogleGenAI;
  private isSaving = false;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    this.loadProfiles();
  }

  private loadProfiles() {
    try {
      if (fs.existsSync(STORAGE_PATH)) {
        const raw = fs.readFileSync(STORAGE_PATH, 'utf-8');
        this.profiles = JSON.parse(raw);
        console.log(`[IdentityDriftEngine] Successfully loaded ${Object.keys(this.profiles).length} user drift profiles.`);
      } else {
        console.log('[IdentityDriftEngine] Storage file not found. Seeding initial drift profile data...');
        for (const [uid, partial] of Object.entries(SEED_DRIFT_PROFILES)) {
          const fullProfile = this.createDefaultProfile(uid, partial.name || uid);
          this.profiles[uid] = {
            ...fullProfile,
            ...partial,
            categories: {
              ...fullProfile.categories,
              ...partial.categories
            }
          };
        }
        this.saveProfiles();
      }
    } catch (err) {
      console.error('[IdentityDriftEngine] Error loading profiles:', err);
    }
  }

  private async saveProfiles() {
    if (this.isSaving) return;
    this.isSaving = true;
    try {
      await fs.promises.writeFile(STORAGE_PATH, JSON.stringify(this.profiles, null, 2), 'utf-8');
    } catch (err) {
      console.error('[IdentityDriftEngine] Error saving profiles:', err);
    } finally {
      this.isSaving = false;
    }
  }

  private createDefaultProfile(userId: string, name: string): UserDriftProfile {
    const categories: Record<string, CategoryDrift> = {};
    for (const cat of DRIFT_CATEGORIES) {
      categories[cat] = {
        category: cat,
        desired: 50, // Mid-point baseline for non-initialized aspirations
        actual: 40,  // Base starting behavior
        drift: 10,   // Small initial default drift
        evidenceCount: 0
      };
    }

    return {
      userId: userId.toLowerCase().replace(/[^a-z0-9]/g, ''),
      name,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      overallDriftScore: 10,
      categories,
      history: [
        {
          timestamp: Date.now(),
          overallDriftScore: 10,
          categoryDrifts: {},
          reason: 'Identity Drift Engine connection initialized. Daily behaviors are monitored against aspirations.'
        }
      ],
      recentActivities: [],
      lastAIEvalTime: Date.now(),
      metadata: {}
    };
  }

  public getOrCreateProfile(userId: string, name?: string): UserDriftProfile {
    const cleanId = userId.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!this.profiles[cleanId]) {
      this.profiles[cleanId] = this.createDefaultProfile(cleanId, name || userId);
      this.saveProfiles();
    }
    
    // Ensure nested fields are safe
    const profile = this.profiles[cleanId];
    if (!profile.categories) profile.categories = {};
    if (!profile.history) profile.history = [];
    if (!profile.recentActivities) profile.recentActivities = [];
    if (!profile.metadata) profile.metadata = {};
    
    for (const cat of DRIFT_CATEGORIES) {
      if (!profile.categories[cat]) {
        profile.categories[cat] = {
          category: cat,
          desired: 50,
          actual: 40,
          drift: 10,
          evidenceCount: 0
        };
      }
    }

    return profile;
  }

  /**
   * Observe user activity incrementally.
   * Boosts corresponding actual categories, calculates current drift values,
   * handles slow decay, checks timeline, and updates profile data.
   */
  public async observeActivity(userId: string, activityType: string, meta: any = {}) {
    const profile = this.getOrCreateProfile(userId);
    profile.lastUpdated = Date.now();

    // Log the recent activity
    profile.recentActivities.push({
      timestamp: Date.now(),
      activityType,
      meta
    });

    if (profile.recentActivities.length > 30) {
      profile.recentActivities.shift();
    }

    // Check action mapping
    const mapping = ACTIVITY_DRIFT_BOOSTS[activityType];
    const boostedCats = mapping?.categories || ['Learning'];
    const intensity = mapping?.intensity || 3;

    // 1. Process actual behavior boosts
    for (const cat of boostedCats) {
      const entry = profile.categories[cat];
      if (entry) {
        entry.evidenceCount += 1;
        // Asymptotic actual improvement
        const oldActual = entry.actual;
        const increase = (100 - oldActual) * (intensity / 100);
        entry.actual = Math.min(100, parseFloat((oldActual + increase).toFixed(2)));
      }
    }

    // 2. Perform slow, gradual decay on unassociated actual behavior categories
    // This represents skill fading/behavior regression over time without practice
    for (const cat of DRIFT_CATEGORIES) {
      if (!boostedCats.includes(cat)) {
        const entry = profile.categories[cat];
        if (entry && entry.actual > 15) {
          // Micro decay over time/actions
          const decay = 0.08 * (entry.actual / 100);
          entry.actual = Math.max(15, parseFloat((entry.actual - decay).toFixed(2)));
        }
      }
    }

    // 3. Recalculate drift scores for each category
    // Drift is computed as Math.max(0, desired - actual)
    // If the user's actual behavior matches or exceeds their desired aspiration, drift is 0.
    // If actual behavior falls short of desired aspiration, drift is the magnitude of that shortfall.
    let totalDriftWeight = 0;
    let totalDesiredWeight = 0;

    for (const cat of DRIFT_CATEGORIES) {
      const entry = profile.categories[cat];
      if (entry) {
        entry.drift = Math.round(Math.max(0, entry.desired - entry.actual));
        totalDriftWeight += entry.drift * (entry.desired / 100);
        totalDesiredWeight += (entry.desired / 100);
      }
    }

    // Determine overall drift score (normalized)
    const baseDrift = totalDesiredWeight > 0 ? (totalDriftWeight / totalDesiredWeight) : 10;
    const finalDriftScore = Math.max(0, Math.min(100, Math.round(baseDrift)));
    
    // Smooth transition
    profile.overallDriftScore = Math.round((profile.overallDriftScore * 4 + finalDriftScore) / 5);

    // 4. Record history events if there is a shift in overall drift
    const lastHistory = profile.history[profile.history.length - 1];
    const diff = Math.abs(profile.overallDriftScore - (lastHistory?.overallDriftScore || 0));
    
    if (diff >= 5 && profile.history.length < 50) {
      const catDrifts: Record<string, number> = {};
      for (const cat of DRIFT_CATEGORIES) {
        catDrifts[cat] = profile.categories[cat].drift;
      }

      let desc = `Drift score updated to ${profile.overallDriftScore} after observing action: ${activityType}`;
      if (profile.overallDriftScore < (lastHistory?.overallDriftScore || 0)) {
        desc = `Discipline & execution behaviors reinforced. Behavior drift decreased to ${profile.overallDriftScore}.`;
      } else {
        desc = `Identity drift rose to ${profile.overallDriftScore} due to divergence between target aspirations and daily actual outputs.`;
      }

      profile.history.push({
        timestamp: Date.now(),
        overallDriftScore: profile.overallDriftScore,
        categoryDrifts: catDrifts,
        triggerAction: activityType,
        reason: desc
      });
    }

    // 5. Run silent, background AI analysis of goals/conversations to update 'desired' vectors
    const elapsedMinutes = (Date.now() - profile.lastAIEvalTime) / (60 * 1000);
    if (elapsedMinutes >= 45 || profile.recentActivities.length % 8 === 0) {
      this.evaluateDriftWithAI(userId, meta.userProfileContext).catch(err => {
        console.warn("[IdentityDriftEngine] Background AI eval failed:", err);
      });
    } else {
      await this.saveProfiles();
    }
  }

  /**
   * AI-powered Drift Engine recalibrator.
   * Utilizes Gemini to extract current desires/aspirations from the UserProfile,
   * aligns those aspirations with target categories, and validates actual behavior logs.
   */
  public async evaluateDriftWithAI(userId: string, userProfileContext?: any): Promise<boolean> {
    const profile = this.profiles[userId.toLowerCase().replace(/[^a-z0-9]/g, '')];
    if (!profile) return false;

    if (!process.env.GEMINI_API_KEY) {
      profile.lastAIEvalTime = Date.now();
      await this.saveProfiles();
      return true;
    }

    try {
      // Gather relevant context (goals, interests, bio) from context or fallback
      const goals = userProfileContext?.goals || ["Complete technical modules", "Sustain daily focus blocks"];
      const interests = userProfileContext?.interests || ["Software Development", "Machine Learning"];
      const bio = userProfileContext?.bio || "";
      const recentActionLog = profile.recentActivities.slice(-15);

      const prompt = `
        You are the Core Identity Drift Engine of Nexora.
        Your role is to understand the difference between who a user wishes to become (Desired Aspirations)
        and how they actually spend their energy (Actual Behavior).
        
        USER CONTEXT:
        Name: "${profile.name}"
        Goals: ${JSON.stringify(goals)}
        Interests: ${JSON.stringify(interests)}
        Bio: "${bio}"
        
        RECENT ACTIONS (ACTUAL RECORDED BEHAVIORS):
        ${JSON.stringify(recentActionLog)}
        
        CURRENT PROFILE DRIFT CATEGORIES:
        ${JSON.stringify(profile.categories)}
        
        TASK:
        1. Evaluate Desired values (10 to 100) for all 9 behavioral categories based on goals, aspirations, bio, and career interests:
           - Discipline: consistency, routine sticking, schedule density
           - Learning: research, studying, acquiring theoretical domain depth
           - Health: athletic logs, cardio, recovery habits
           - Building: publishing code, physical/digital prototypes, project construction
           - Social behaviour: peer guidance, collaborative group sessions, mentoring
           - Consistency: frequency of recurring actions
           - Curiosity: exploring unfamiliar domains, broad reading, creative draftings
           - Execution: raw rate of goal/task completion
           - Focus: depth of focus sessions, deep work block lengths
        2. Evaluate Actual values (10 to 100) by combining existing actuals with the frequency/intensity of recent recorded behaviors.
        3. Recalculate individual drift scores: drift = Math.max(0, desired - actual).
        4. Draft an objective, concise, professional clinical reason (max 20 words, no marketing hype or self-praise) explaining why the drift has narrowed or widened.
        
        Return your results as a clean, raw JSON matching this schema exactly:
        {
          "categories": {
            "CategoryName": { "desired": number, "actual": number }
          },
          "newHistoryEvent": {
            "reason": "string (max 20 words, precise and scientific)"
          } or null
        }
      `;

      const result = await callGeminiWithRetryAndFallback('gemini-3.5-flash', prompt, {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            categories: {
              type: Type.OBJECT,
              additionalProperties: {
                type: Type.OBJECT,
                properties: {
                  desired: { type: Type.INTEGER },
                  actual: { type: Type.INTEGER }
                },
                required: ["desired", "actual"]
              }
            },
            newHistoryEvent: {
              type: Type.OBJECT,
              properties: {
                reason: { type: Type.STRING }
              },
              required: ["reason"]
            }
          },
          required: ["categories"]
        }
      });

      let rawText = result.text || "{}";
      const data = cleanAndParseJSON(rawText, { categories: {} });

      // Merge results carefully
      if (data.categories) {
        let totalDriftWeight = 0;
        let totalDesiredWeight = 0;

        for (const cat of DRIFT_CATEGORIES) {
          const aiCat = data.categories[cat];
          const entry = profile.categories[cat];
          if (aiCat && entry) {
            entry.desired = Math.max(10, Math.min(100, aiCat.desired));
            // Actual is heavily influenced by the AI audit, but retains incremental evidence weight
            entry.actual = Math.max(10, Math.min(100, Math.round((entry.actual + aiCat.actual) / 2)));
            entry.drift = Math.max(0, entry.desired - entry.actual);

            totalDriftWeight += entry.drift * (entry.desired / 100);
            totalDesiredWeight += (entry.desired / 100);
          }
        }

        const calculatedDrift = totalDesiredWeight > 0 ? (totalDriftWeight / totalDesiredWeight) : 10;
        profile.overallDriftScore = Math.max(0, Math.min(100, Math.round(calculatedDrift)));
      }

      if (data.newHistoryEvent && data.newHistoryEvent.reason && profile.history.length < 50) {
        const catDrifts: Record<string, number> = {};
        for (const cat of DRIFT_CATEGORIES) {
          catDrifts[cat] = profile.categories[cat].drift;
        }

        profile.history.push({
          timestamp: Date.now(),
          overallDriftScore: profile.overallDriftScore,
          categoryDrifts: catDrifts,
          reason: data.newHistoryEvent.reason
        });
      }

      profile.lastAIEvalTime = Date.now();
      await this.saveProfiles();
      console.log(`[IdentityDriftEngine] Successfully updated AI drift alignment scores for user: ${userId}`);
      return true;
    } catch (err) {
      console.warn("[IdentityDriftEngine] AI evaluation failure. Preserving heuristical metrics.", err);
      profile.lastAIEvalTime = Date.now();
      await this.saveProfiles();
      return false;
    }
  }

  public getInternalDiagnosticsJSON(): string {
    return JSON.stringify({
      status: "Operational",
      profileCount: Object.keys(this.profiles).length,
      storageFile: STORAGE_PATH,
      categoriesTracked: DRIFT_CATEGORIES,
      systemTime: new Date().toISOString()
    }, null, 2);
  }
}

export const identityDriftEngine = new IdentityDriftEngine();
