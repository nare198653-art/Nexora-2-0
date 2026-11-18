import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type } from "@google/genai";
import { callGeminiWithRetryAndFallback, cleanAndParseJSON } from "./geminiHelper";


export interface IdentityDimension {
  confidence: number; // 0 to 100
  trend: 'Emerging' | 'Growing' | 'Declining' | 'Stable' | 'Dormant';
  evidenceCount: number;
}

export interface TimelineEvent {
  timestamp: number;
  type: string; // e.g. "Identity Shift", "Major Milestone", "Consistency Leap"
  description: string;
  impactLayers: string[];
}

export interface BehaviorLog {
  timestamp: number;
  actionType: string;
  description: string;
  weight: number; // dynamically assigned behavior significance
  associatedLayers: string[];
}

export interface IdentityRelationship {
  combo: string; // e.g., "Builder + Learner"
  score: number; // 0 to 100 relationship alignment
  potentialLabel: string; // e.g., "Strong Startup Potential"
  reason: string;
}

export interface UserIdentityProfile {
  userId: string;
  name: string;
  createdAt: number;
  lastActivityTime: number;
  identityLayers: Record<string, IdentityDimension>;
  relationships: IdentityRelationship[];
  timeline: TimelineEvent[];
  recentBehaviors: BehaviorLog[];
  lastRetrained: number;
  metadata: Record<string, any>;
}

// Full set of identity layers requested by the user
export const IDENTITY_LAYERS_LIST = [
  'Builder',
  'Learner',
  'Creator',
  'Thinker',
  'Researcher',
  'Leader',
  'Mentor',
  'Executor',
  'Visionary',
  'Strategist',
  'Explorer',
  'Teacher',
  'Analyst',
  'Innovator',
  'Communicator',
  'Planner',
  'Problem Solver'
] as const;

export type IdentityLayerType = typeof IDENTITY_LAYERS_LIST[number];

const STORAGE_PATH = path.join(process.cwd(), 'identity_profiles.json');

// Behavior dynamic weighting map
// Higher-intensity real-world building/solving gets greater weight, casual interactions get lower weight.
export const BEHAVIOR_WEIGHTS: Record<string, { weight: number; layers: IdentityLayerType[]; description: string }> = {
  'building_project': {
    weight: 10,
    layers: ['Builder', 'Executor', 'Innovator', 'Problem Solver'],
    description: 'Built and compiled a physical or digital product module.'
  },
  'goal_completed': {
    weight: 9,
    layers: ['Executor', 'Planner', 'Builder'],
    description: 'Completed a long-term goal milestone ahead of schedule.'
  },
  'complex_problem_solved': {
    weight: 8,
    layers: ['Problem Solver', 'Analyst', 'Thinker', 'Researcher'],
    description: 'Deconstructed and successfully debugged a complex technical error.'
  },
  'help_peer': {
    weight: 8,
    layers: ['Mentor', 'Teacher', 'Communicator'],
    description: 'Spent active sessions guiding other operators and answering technical blocks.'
  },
  'study_session': {
    weight: 5,
    layers: ['Learner', 'Researcher', 'Thinker'],
    description: 'Engaged in a deep work educational deep-dive.'
  },
  'creativity_session': {
    weight: 6,
    layers: ['Creator', 'Innovator', 'Visionary'],
    description: 'Drafted concept maps and creative architecture flows.'
  },
  'leadership_role': {
    weight: 7,
    layers: ['Leader', 'Strategist', 'Visionary'],
    description: 'Moderated a collaborative squad sprint and distributed sub-tasks.'
  },
  'group_chat_active': {
    weight: 3,
    layers: ['Communicator', 'Explorer'],
    description: 'Exchanged findings in a public network node.'
  },
  'read_article': {
    weight: 2,
    layers: ['Learner', 'Explorer'],
    description: 'Consumed technical research materials or literature.'
  },
  'focus_completed': {
    weight: 4,
    layers: ['Executor', 'Planner'],
    description: 'Successfully maintained a high-intensity focus session block.'
  }
};

const SEED_IDENTITY_PROFILES: Record<string, Partial<UserIdentityProfile>> = {
  'alex': {
    userId: 'alex',
    name: 'Alex M.',
    createdAt: Date.now() - 30 * 24 * 3600 * 1000,
    lastActivityTime: Date.now(),
    identityLayers: {
      'Builder': { confidence: 88, trend: 'Stable', evidenceCount: 15 },
      'Learner': { confidence: 90, trend: 'Stable', evidenceCount: 18 },
      'Executor': { confidence: 85, trend: 'Stable', evidenceCount: 12 },
      'Analyst': { confidence: 80, trend: 'Stable', evidenceCount: 10 },
      'Problem Solver': { confidence: 85, trend: 'Growing', evidenceCount: 11 }
    },
    relationships: [
      { combo: 'Builder + Learner', score: 89, potentialLabel: 'Strong Startup Potential', reason: 'High translation of theoretical learnings into functional, built codebases.' },
      { combo: 'Analyst + Thinker', score: 82, potentialLabel: 'Strong Research Potential', reason: 'Linear logical models coupled with high curiosity index.' }
    ],
    timeline: [
      { timestamp: Date.now() - 20 * 24 * 3600 * 1000, type: 'Identity Shift', description: 'Builder dimension surpassed 80% confidence following three consecutive full-stack module publications.', impactLayers: ['Builder', 'Executor'] },
      { timestamp: Date.now() - 5 * 24 * 3600 * 1000, type: 'Major Milestone', description: 'Achieved complete consistency breakthrough in study deep-work cycles.', impactLayers: ['Learner', 'Thinker'] }
    ],
    recentBehaviors: [],
    lastRetrained: Date.now()
  },
  'sarah': {
    userId: 'sarah',
    name: 'Sarah J.',
    createdAt: Date.now() - 45 * 24 * 3600 * 1000,
    lastActivityTime: Date.now(),
    identityLayers: {
      'Teacher': { confidence: 85, trend: 'Growing', evidenceCount: 22 },
      'Leader': { confidence: 80, trend: 'Stable', evidenceCount: 14 },
      'Mentor': { confidence: 92, trend: 'Stable', evidenceCount: 28 },
      'Communicator': { confidence: 88, trend: 'Stable', evidenceCount: 19 }
    },
    relationships: [
      { combo: 'Leader + Mentor', score: 90, potentialLabel: 'Strong Community Potential', reason: 'High alignment in peer facilitation and supportive direct leadership vectors.' }
    ],
    timeline: [
      { timestamp: Date.now() - 15 * 24 * 3600 * 1000, type: 'Major Milestone', description: 'Recognized as leading peer instructor after contributing answers to 10+ open blocks.', impactLayers: ['Teacher', 'Mentor'] }
    ],
    recentBehaviors: [],
    lastRetrained: Date.now()
  },
  'kira': {
    userId: 'kira',
    name: 'Kira N.',
    createdAt: Date.now() - 10 * 24 * 3600 * 1000,
    lastActivityTime: Date.now(),
    identityLayers: {
      'Creator': { confidence: 92, trend: 'Stable', evidenceCount: 24 },
      'Innovator': { confidence: 88, trend: 'Growing', evidenceCount: 16 },
      'Explorer': { confidence: 82, trend: 'Stable', evidenceCount: 11 },
      'Builder': { confidence: 65, trend: 'Growing', evidenceCount: 8 }
    },
    relationships: [
      { combo: 'Creator + Researcher', score: 87, potentialLabel: 'Innovation Potential', reason: 'Strong capacity for lateral creative design backed by research models.' }
    ],
    timeline: [
      { timestamp: Date.now() - 2 * 24 * 3600 * 1000, type: 'Major Milestone', description: 'Initiated 3 novel structural concept cards in creative-focused zones.', impactLayers: ['Creator', 'Innovator'] }
    ],
    recentBehaviors: [],
    lastRetrained: Date.now()
  },
  'marcus': {
    userId: 'marcus',
    name: 'Marcus E.',
    createdAt: Date.now() - 60 * 24 * 3600 * 1000,
    lastActivityTime: Date.now(),
    identityLayers: {
      'Strategist': { confidence: 90, trend: 'Stable', evidenceCount: 30 },
      'Visionary': { confidence: 85, trend: 'Stable', evidenceCount: 18 },
      'Leader': { confidence: 80, trend: 'Stable', evidenceCount: 15 },
      'Planner': { confidence: 85, trend: 'Stable', evidenceCount: 22 }
    },
    relationships: [
      { combo: 'Strategist + Visionary', score: 88, potentialLabel: 'Future Chief Officer', reason: 'Long-range operational planner coupled with high initiative and execution clarity.' }
    ],
    timeline: [],
    recentBehaviors: [],
    lastRetrained: Date.now()
  }
};

export class IdentityEngine {
  private profiles: Record<string, UserIdentityProfile> = {};
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
        console.log(`[IdentityEngine] Successfully loaded ${Object.keys(this.profiles).length} user identity profiles.`);
      } else {
        console.log('[IdentityEngine] Storage file not found. Seeding initial profile data...');
        // Initialize from SEED_IDENTITY_PROFILES
        for (const [uid, partial] of Object.entries(SEED_IDENTITY_PROFILES)) {
          const fullProfile = this.createDefaultProfile(uid, partial.name || uid);
          this.profiles[uid] = {
            ...fullProfile,
            ...partial,
            identityLayers: {
              ...fullProfile.identityLayers,
              ...partial.identityLayers
            }
          };
        }
        this.saveProfiles();
      }
    } catch (err) {
      console.error('[IdentityEngine] Error loading profiles:', err);
    }
  }

  private async saveProfiles() {
    if (this.isSaving) return;
    this.isSaving = true;
    try {
      await fs.promises.writeFile(STORAGE_PATH, JSON.stringify(this.profiles, null, 2), 'utf-8');
    } catch (err) {
      console.error('[IdentityEngine] Error saving profiles:', err);
    } finally {
      this.isSaving = false;
    }
  }

  private createDefaultProfile(userId: string, name: string): UserIdentityProfile {
    const layers: Record<string, IdentityDimension> = {};
    for (const key of IDENTITY_LAYERS_LIST) {
      layers[key] = {
        confidence: 10, // Starts at base 10% representation
        trend: 'Stable',
        evidenceCount: 0
      };
    }

    return {
      userId: userId.toLowerCase().replace(/[^a-z0-9]/g, ''),
      name,
      createdAt: Date.now(),
      lastActivityTime: Date.now(),
      identityLayers: layers,
      relationships: [],
      timeline: [
        {
          timestamp: Date.now(),
          type: 'Discovery Commenced',
          description: 'Identity Engine initial connection initialized. Consistent activities will start revealing your actual vectors.',
          impactLayers: []
        }
      ],
      recentBehaviors: [],
      lastRetrained: Date.now(),
      metadata: {}
    };
  }

  public getOrCreateProfile(userId: string, name?: string): UserIdentityProfile {
    const cleanId = userId.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!this.profiles[cleanId]) {
      this.profiles[cleanId] = this.createDefaultProfile(cleanId, name || userId);
      this.saveProfiles();
    }
    const profile = this.profiles[cleanId];
    if (!profile.metadata) profile.metadata = {};
    if (!profile.recentBehaviors) profile.recentBehaviors = [];
    if (!profile.timeline) profile.timeline = [];
    if (!profile.identityLayers) profile.identityLayers = {};
    if (!profile.relationships) profile.relationships = [];
    return profile;
  }

  /**
   * Incremental observation of user activity.
   * Silently records behavior, recalculates layer confidence dynamically, manages decay,
   * updates timelines, and saves changes.
   */
  public async recordBehavior(userId: string, actionType: string, meta: any = {}) {
    const profile = this.getOrCreateProfile(userId);
    profile.lastActivityTime = Date.now();

    // Check if behavior is defined in weights
    const mapping = BEHAVIOR_WEIGHTS[actionType];
    const weight = mapping?.weight || 3;
    const layers = mapping?.layers || ['Learner'];
    const desc = meta.description || mapping?.description || `Logged activity of type ${actionType}`;

    // 1. Store the behavior evidence
    const log: BehaviorLog = {
      timestamp: Date.now(),
      actionType,
      description: desc,
      weight,
      associatedLayers: layers
    };

    profile.recentBehaviors.push(log);
    // Keep last 40 behaviors for retraining context
    if (profile.recentBehaviors.length > 40) {
      profile.recentBehaviors.shift();
    }

    // 2. Increment confidence based on dynamic weight
    // Confidence is earned purely by actions, never self-reported
    for (const layer of layers) {
      const dim = profile.identityLayers[layer];
      if (dim) {
        dim.evidenceCount += 1;
        
        // Compute delta (diminishing returns as confidence gets higher)
        const current = dim.confidence;
        const potentialIncrease = (100 - current) * (weight / 150);
        dim.confidence = Math.min(100, parseFloat((current + potentialIncrease).toFixed(2)));
        
        // Evaluate dynamic trends
        if (dim.trend === 'Dormant' || dim.trend === 'Declining') {
          dim.trend = 'Emerging';
        } else if (dim.confidence > current && dim.trend === 'Stable') {
          dim.trend = 'Growing';
        }
      }
    }

    // 3. Apply gradual decay to ALL OTHER unassociated active layers
    // Helps maintain real-time accuracy and prevents static/fake profiles
    const hoursSinceLastActivity = 1; // Simulated increment or actual diff
    for (const layer of IDENTITY_LAYERS_LIST) {
      if (!layers.includes(layer)) {
        const dim = profile.identityLayers[layer];
        if (dim && dim.confidence > 10) {
          // Slow decay multiplier
          const decay = 0.05 * (dim.confidence / 100);
          const oldConfidence = dim.confidence;
          dim.confidence = Math.max(10, parseFloat((dim.confidence - decay).toFixed(2)));
          
          if (oldConfidence - dim.confidence > 0.01 && dim.trend === 'Growing') {
            dim.trend = 'Stable';
          }
        }
      }
    }

    // 4. Periodically update relationships & check for milestone thresholds
    this.recalculateIdentityRelationships(profile);
    this.checkAndGenerateMilestones(profile, layers);

    // 5. Trigger silent, background AI Retraining if we have enough new evidence
    // Retraining is throttled to once every 10 behaviors or 10 minutes to protect rate-limits
    const elapsedMinutes = (Date.now() - profile.lastRetrained) / (60 * 1000);
    const newBehaviorsCount = profile.recentBehaviors.filter(b => b.timestamp > profile.lastRetrained).length;
    
    if (newBehaviorsCount >= 5 || elapsedMinutes >= 30) {
      // Run AI retraining in background to avoid blocking main loop
      this.retrainIdentityWithAI(userId).catch(err => {
        console.warn("[IdentityEngine] Background AI retrain failed:", err);
      });
    } else {
      await this.saveProfiles();
    }
  }

  /**
   * Deterministic logic for identity relationships.
   * Matches core combinations like Builder + Learner, Leader + Mentor, etc.
   */
  public recalculateIdentityRelationships(profile: UserIdentityProfile) {
    const relationships: IdentityRelationship[] = [];
    const layers = profile.identityLayers;

    const getScore = (l1: string, l2: string) => {
      const c1 = layers[l1]?.confidence || 0;
      const c2 = layers[l2]?.confidence || 0;
      return Math.round((c1 + c2) / 2);
    };

    // Builder + Learner
    const blScore = getScore('Builder', 'Learner');
    if (blScore > 40) {
      relationships.push({
        combo: 'Builder + Learner',
        score: blScore,
        potentialLabel: 'Strong Startup Potential',
        reason: 'Exceptional capability to immediately translate intellectual intake into functional physical/digital creations.'
      });
    }

    // Leader + Mentor
    const lmScore = getScore('Leader', 'Mentor');
    if (lmScore > 40) {
      relationships.push({
        combo: 'Leader + Mentor',
        score: lmScore,
        potentialLabel: 'Strong Community Potential',
        reason: 'Highly effective in orchestrating project goals while supporting the operational capacity of group peers.'
      });
    }

    // Researcher + Creator
    const rcScore = getScore('Researcher', 'Creator');
    if (rcScore > 40) {
      relationships.push({
        combo: 'Researcher + Creator',
        score: rcScore,
        potentialLabel: 'Innovation Potential',
        reason: 'Mastery in analyzing academic concepts and restructuring them into innovative conceptual frameworks.'
      });
    }

    // Strategist + Visionary
    const svScore = getScore('Strategist', 'Visionary');
    if (svScore > 40) {
      relationships.push({
        combo: 'Strategist + Visionary',
        score: svScore,
        potentialLabel: 'Product/Project Architect',
        reason: 'Adept at visualizing long-range futures while organizing high-level milestone sequencing.'
      });
    }

    // Thinker + Problem Solver
    const tpsScore = getScore('Thinker', 'Problem Solver');
    if (tpsScore > 40) {
      relationships.push({
        combo: 'Thinker + Problem Solver',
        score: tpsScore,
        potentialLabel: 'System Architect',
        reason: 'Combines structural mental deep-work with extreme tenacity in debugging critical framework failures.'
      });
    }

    // Analyst + Explorer
    const aeScore = getScore('Analyst', 'Explorer');
    if (aeScore > 40) {
      relationships.push({
        combo: 'Analyst + Explorer',
        score: aeScore,
        potentialLabel: 'Uncharted Territory Scout',
        reason: 'Pioneers unfamiliar tech environments or domain vectors, immediately structuralizing them into neat models.'
      });
    }

    // Sort by confidence score
    profile.relationships = relationships.sort((a, b) => b.score - a.score);
  }

  /**
   * Check confidence thresholds and automatically commit milestone events to timeline
   */
  private checkAndGenerateMilestones(profile: UserIdentityProfile, activeLayers: string[]) {
    const thresholds = [30, 50, 75, 90];
    const layers = profile.identityLayers;

    if (!profile.metadata) {
      profile.metadata = {};
    }

    for (const layer of activeLayers) {
      const dim = layers[layer];
      if (!dim) continue;

      const metadataKey = `milestone_reached_${layer}`;
      const reachedList: number[] = profile.metadata[metadataKey] || [];

      for (const th of thresholds) {
        if (dim.confidence >= th && !reachedList.includes(th)) {
          reachedList.push(th);
          profile.metadata[metadataKey] = reachedList;

          // Add timeline entry
          const trendLabel = dim.confidence >= 75 ? 'Mastery Ascent' : 'Growth Milestone';
          profile.timeline.push({
            timestamp: Date.now(),
            type: trendLabel,
            description: `Dimension '${layer}' successfully surpassed ${th}% confidence based on consistent action indicators.`,
            impactLayers: [layer]
          });
        }
      }
    }
  }

  /**
   * Full AI-powered retrainer for the user's Identity.
   * Leverages Gemini (with standard JSON output) to analyze actions, goals, and logs,
   * dynamically restructuring layers, confidence levels, relationship insights, and shifts.
   */
  public async retrainIdentityWithAI(userId: string): Promise<boolean> {
    const profile = this.profiles[userId.toLowerCase().replace(/[^a-z0-9]/g, '')];
    if (!profile) return false;

    if (!process.env.GEMINI_API_KEY) {
      // In absence of API key, we run the local rules-based recalculation & update
      profile.lastRetrained = Date.now();
      await this.saveProfiles();
      return true;
    }

    try {
      const prompt = `
        You are the Core Identity Engine of Nexora.
        Nexora does not ask users who they are. Instead, we reveal who they are becoming based ONLY on actions.
        
        USER IDENTIFYING: "${profile.name}" (ID: ${profile.userId})
        CURRENT CONFIDENCES & TRENDS:
        ${JSON.stringify(profile.identityLayers, null, 2)}
        
        RECENT ACTIONS LOG (DYNAMIC WEIGHTED EVIDENCE):
        ${JSON.stringify(profile.recentBehaviors.slice(-25), null, 2)}
        
        ACTIVE TIMELINE RECORDS:
        ${JSON.stringify(profile.timeline.slice(-10), null, 2)}
        
        TASK:
        You must analyze the historical evidence log, actions, and current vectors.
        1. Evaluate confidence levels (0-100) for ALL 17 dimensions:
           Builder, Learner, Creator, Thinker, Researcher, Leader, Mentor, Executor, Visionary, Strategist, Explorer, Teacher, Analyst, Innovator, Communicator, Planner, Problem Solver.
           - Confidence should strictly align with action weight and frequency.
           - If an identity has high confidence but no recent evidence, reduce confidence gradually (decay).
           - Do not give 90%+ ratings unless there is a mountain of highly weighted actions (e.g., project built, complex problem solved).
        2. Assign a Trend for each dimension: 'Emerging' (recently active from 0), 'Growing' (active and rising), 'Stable' (consistently high), 'Declining' (unbalanced decay), 'Dormant' (not active).
        3. Identify structural Identity Relationships between highly aligned layers, and generate a dynamic score, label, and contextual reason.
        4. Detect if a major behavioral transition is happening. If so, generate a maximum of ONE new Timeline Event explaining this shift conceptually. Do not spam timeline events.
        
        Return your analysis as a raw JSON object matching this schema exactly:
        {
          "identityLayers": {
            "DimensionName": { "confidence": number, "trend": "Emerging|Growing|Stable|Declining|Dormant", "evidenceCount": number }
          },
          "relationships": [
            { "combo": "LayerA + LayerB", "score": number, "potentialLabel": "string", "reason": "string" }
          ],
          "newTimelineEvent": {
            "type": "Identity Shift|Major Milestone|Consistency Leap",
            "description": "string (max 18 words, humble and literal, no self-praise)",
            "impactLayers": ["string"]
          } or null
        }
      `;

      const result = await callGeminiWithRetryAndFallback('gemini-3.5-flash', prompt, {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            identityLayers: {
              type: Type.OBJECT,
              additionalProperties: {
                type: Type.OBJECT,
                properties: {
                  confidence: { type: Type.INTEGER },
                  trend: { type: Type.STRING },
                  evidenceCount: { type: Type.INTEGER }
                },
                required: ["confidence", "trend", "evidenceCount"]
              }
            },
            relationships: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  combo: { type: Type.STRING },
                  score: { type: Type.INTEGER },
                  potentialLabel: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["combo", "score", "potentialLabel", "reason"]
              }
            },
            newTimelineEvent: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                description: { type: Type.STRING },
                impactLayers: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["type", "description", "impactLayers"]
            }
          },
          required: ["identityLayers", "relationships"]
        }
      });

      let rawText = result.text || "{}";
      const data = cleanAndParseJSON(rawText, { identityLayers: {}, relationships: {} });

      // Merge and update profile layers carefully preserving evidence counts
      if (data.identityLayers) {
        for (const key of IDENTITY_LAYERS_LIST) {
          const aiDim = data.identityLayers[key];
          const localDim = profile.identityLayers[key];
          if (aiDim) {
            profile.identityLayers[key] = {
              confidence: Math.max(10, Math.min(100, aiDim.confidence)),
              trend: aiDim.trend || 'Stable',
              evidenceCount: localDim ? Math.max(localDim.evidenceCount, aiDim.evidenceCount || 0) : (aiDim.evidenceCount || 0)
            };
          }
        }
      }

      if (data.relationships) {
        profile.relationships = data.relationships;
      }

      if (data.newTimelineEvent) {
        profile.timeline.push({
          timestamp: Date.now(),
          type: data.newTimelineEvent.type,
          description: data.newTimelineEvent.description,
          impactLayers: data.newTimelineEvent.impactLayers || []
        });
      }

      profile.lastRetrained = Date.now();
      await this.saveProfiles();
      console.log(`[IdentityEngine] Successfully retrained AI identity model for user: ${userId}`);
      return true;
    } catch (err) {
      console.warn("[IdentityEngine] Failed AI retraining session. Preserving local heuristical calculations.", err);
      profile.lastRetrained = Date.now();
      await this.saveProfiles();
      return false;
    }
  }

  public getInternalDiagnosticsJSON(): string {
    return JSON.stringify({
      status: "Operational",
      profileCount: Object.keys(this.profiles).length,
      storageFile: STORAGE_PATH,
      dimensionsTrackedCount: IDENTITY_LAYERS_LIST.length,
      systemTime: new Date().toISOString()
    }, null, 2);
  }
}

export const identityEngine = new IdentityEngine();
