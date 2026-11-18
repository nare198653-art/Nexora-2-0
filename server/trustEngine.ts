import fs from 'fs';
import path from 'path';

export interface TrustBehaviourProfile {
  reliability: number;             // 0.0 to 1.0 (meeting commitments/sessions)
  consistency: number;             // 0.0 to 1.0 (regular activity intervals)
  integrity: number;               // 0.0 to 1.0 (no fake achievements/cheats)
  authenticity: number;            // 0.0 to 1.0 (genuine content vs spam/low-effort)
  helpfulness: number;             // 0.0 to 1.0 (peer guidance, constructive chat)
  responsibility: number;          // 0.0 to 1.0 (orderly behavior, no spamming)
  communityContribution: number;   // 0.0 to 1.0 (group chats, positive interactions)
  learningCommitment: number;      // 0.0 to 1.0 (educational & deep work hours)
  positiveInteractionRatio: number;// 0.0 to 1.0 (fraction of high-quality/helpful logs)
}

export interface TrustMetrics {
  goalsCreated: number;
  goalsCompleted: number;
  sessionsAttempted: number;
  sessionsCompleted: number;
  helpfulMessagesSent: number;
  spamMessageCount: number;
  communityReportsReceived: number;
  toxicBehaviorsDetected: number;
  successfulCollaborations: number;
  failedCollaborations: number;
  fakeEngagementAttempts: number;
  aiAuthenticityRating: number;   // 0-100 rating based on NLP analysis
  consecutiveActiveDays: number;
}

export interface TrustHistoryPoint {
  timestamp: number;
  score: number;
  delta: number;
  reason: string;
}

export interface UserTrustProfile {
  userId: string;
  name: string;
  trustScore: number;             // Consolidated score (0.0 - 100.0)
  longTermTrust: number;          // Base trust score (dampens fast volatility)
  recentTrust: number;            // Weighted score of recent window activities
  accountAgeDays: number;
  createdAt: number;
  lastActivityTime: number;
  behaviourProfile: TrustBehaviourProfile;
  metrics: TrustMetrics;
  history: TrustHistoryPoint[];
  dailyActiveDates: string[];     // Array of "YYYY-MM-DD"
}

const STORAGE_PATH = path.join(process.cwd(), 'trust_profiles.json');

// Standard seed profiles matching Nexora system users
const SEED_TRUST_PROFILES: Record<string, Partial<UserTrustProfile>> = {
  'alex': {
    userId: 'alex',
    name: 'Alex M.',
    trustScore: 92.4,
    longTermTrust: 91.5,
    recentTrust: 94.5,
    createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000, // 45 days old
    behaviourProfile: {
      reliability: 0.94,
      consistency: 0.92,
      integrity: 0.95,
      authenticity: 0.90,
      helpfulness: 0.85,
      responsibility: 0.96,
      communityContribution: 0.88,
      learningCommitment: 0.95,
      positiveInteractionRatio: 0.93
    },
    metrics: {
      goalsCreated: 24,
      goalsCompleted: 22,
      sessionsAttempted: 48,
      sessionsCompleted: 45,
      helpfulMessagesSent: 112,
      spamMessageCount: 0,
      communityReportsReceived: 0,
      toxicBehaviorsDetected: 0,
      successfulCollaborations: 12,
      failedCollaborations: 1,
      fakeEngagementAttempts: 0,
      aiAuthenticityRating: 95,
      consecutiveActiveDays: 9
    }
  },
  'sarah': {
    userId: 'sarah',
    name: 'Sarah J.',
    trustScore: 96.8,
    longTermTrust: 96.0,
    recentTrust: 98.0,
    createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
    behaviourProfile: {
      reliability: 0.98,
      consistency: 0.97,
      integrity: 0.99,
      authenticity: 0.96,
      helpfulness: 0.95,
      responsibility: 0.98,
      communityContribution: 0.94,
      learningCommitment: 0.96,
      positiveInteractionRatio: 0.98
    },
    metrics: {
      goalsCreated: 42,
      goalsCompleted: 41,
      sessionsAttempted: 85,
      sessionsCompleted: 84,
      helpfulMessagesSent: 230,
      spamMessageCount: 0,
      communityReportsReceived: 0,
      toxicBehaviorsDetected: 0,
      successfulCollaborations: 24,
      failedCollaborations: 0,
      fakeEngagementAttempts: 0,
      aiAuthenticityRating: 98,
      consecutiveActiveDays: 14
    }
  },
  'kira': {
    userId: 'kira',
    name: 'Kira L.',
    trustScore: 89.5,
    longTermTrust: 88.0,
    recentTrust: 93.0,
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    behaviourProfile: {
      reliability: 0.85,
      consistency: 0.80,
      integrity: 0.98,
      authenticity: 0.95,
      helpfulness: 0.75,
      responsibility: 0.95,
      communityContribution: 0.70,
      learningCommitment: 0.98,
      positiveInteractionRatio: 0.92
    },
    metrics: {
      goalsCreated: 15,
      goalsCompleted: 13,
      sessionsAttempted: 50,
      sessionsCompleted: 43,
      helpfulMessagesSent: 48,
      spamMessageCount: 0,
      communityReportsReceived: 0,
      toxicBehaviorsDetected: 0,
      successfulCollaborations: 5,
      failedCollaborations: 1,
      fakeEngagementAttempts: 0,
      aiAuthenticityRating: 94,
      consecutiveActiveDays: 5
    }
  },
  'marcus': {
    userId: 'marcus',
    name: 'Marcus D.',
    trustScore: 94.2,
    longTermTrust: 93.5,
    recentTrust: 95.8,
    createdAt: Date.now() - 50 * 24 * 60 * 60 * 1000,
    behaviourProfile: {
      reliability: 0.95,
      consistency: 0.96,
      integrity: 0.94,
      authenticity: 0.96,
      helpfulness: 0.92,
      responsibility: 0.95,
      communityContribution: 0.90,
      learningCommitment: 0.92,
      positiveInteractionRatio: 0.95
    },
    metrics: {
      goalsCreated: 31,
      goalsCompleted: 29,
      sessionsAttempted: 64,
      sessionsCompleted: 62,
      helpfulMessagesSent: 154,
      spamMessageCount: 0,
      communityReportsReceived: 0,
      toxicBehaviorsDetected: 0,
      successfulCollaborations: 16,
      failedCollaborations: 0,
      fakeEngagementAttempts: 0,
      aiAuthenticityRating: 96,
      consecutiveActiveDays: 12
    }
  }
};

export class TrustScoreEngine {
  private profiles: Record<string, UserTrustProfile> = {};
  private isSaving = false;

  constructor() {
    this.loadProfiles();
  }

  private loadProfiles() {
    try {
      if (fs.existsSync(STORAGE_PATH)) {
        const raw = fs.readFileSync(STORAGE_PATH, 'utf-8');
        this.profiles = JSON.parse(raw);
        console.log(`[TrustScoreEngine] Successfully loaded ${Object.keys(this.profiles).length} user trust profiles.`);
      } else {
        console.log('[TrustScoreEngine] Storage file not found. Seeding initial trust vectors...');
        this.seedInitialData();
      }
    } catch (err) {
      console.error('[TrustScoreEngine] Failed to load profiles. Using fallback memory cache.', err);
      this.seedInitialData();
    }
  }

  private async saveProfiles() {
    if (this.isSaving) return;
    this.isSaving = true;
    try {
      await fs.promises.writeFile(STORAGE_PATH, JSON.stringify(this.profiles, null, 2), 'utf-8');
    } catch (err) {
      console.error('[TrustScoreEngine] Failed to save trust profiles to disk:', err);
    } finally {
      this.isSaving = false;
    }
  }

  private seedInitialData() {
    this.profiles = {};
    for (const [id, seed] of Object.entries(SEED_TRUST_PROFILES)) {
      this.profiles[id] = this.createDefaultProfile(id, seed.name || id, seed);
    }
    this.saveProfiles();
  }

  private createDefaultProfile(userId: string, name: string, overrides: Partial<UserTrustProfile> = {}): UserTrustProfile {
    const now = Date.now();
    const createdAt = overrides.createdAt || now;
    const daysOld = Math.max(1, Math.floor((now - createdAt) / (24 * 60 * 60 * 1000)));

    const behavior = overrides.behaviourProfile || {
      reliability: 0.70,
      consistency: 0.70,
      integrity: 0.85, // Assumed trustworthy initially
      authenticity: 0.80,
      helpfulness: 0.65,
      responsibility: 0.85,
      communityContribution: 0.60,
      learningCommitment: 0.70,
      positiveInteractionRatio: 0.75
    };

    const metrics = overrides.metrics || {
      goalsCreated: 0,
      goalsCompleted: 0,
      sessionsAttempted: 0,
      sessionsCompleted: 0,
      helpfulMessagesSent: 0,
      spamMessageCount: 0,
      communityReportsReceived: 0,
      toxicBehaviorsDetected: 0,
      successfulCollaborations: 0,
      failedCollaborations: 0,
      fakeEngagementAttempts: 0,
      aiAuthenticityRating: 80,
      consecutiveActiveDays: 1
    };

    const initialScore = overrides.trustScore || 75.0;

    const defaultProfile: UserTrustProfile = {
      userId,
      name,
      trustScore: initialScore,
      longTermTrust: overrides.longTermTrust || initialScore,
      recentTrust: overrides.recentTrust || initialScore,
      accountAgeDays: daysOld,
      createdAt,
      lastActivityTime: now,
      behaviourProfile: behavior,
      metrics,
      history: [{
        timestamp: now,
        score: initialScore,
        delta: 0,
        reason: 'Trust System Initialized'
      }],
      dailyActiveDates: [new Date().toISOString().split('T')[0]]
    };

    return defaultProfile;
  }

  /**
   * Retrieves or creates a trust profile for a user
   */
  public getOrCreateProfile(userId: string, name: string): UserTrustProfile {
    const normalizedId = userId.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!this.profiles[normalizedId]) {
      this.profiles[normalizedId] = this.createDefaultProfile(normalizedId, name);
      this.saveProfiles();
    }
    return this.profiles[normalizedId];
  }

  /**
   * Public internal consumer: Returns calculated score (0.0 - 100.0) safely.
   */
  public getTrustScore(userId: string): number {
    const normalizedId = userId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const profile = this.profiles[normalizedId];
    return profile ? profile.trustScore : 70.0; // Default neutral-positive baseline
  }

  /**
   * Silent activity analysis engine: Log events that build or reduce trust
   */
  public recordActivity(userId: string, activityType: string, meta: any = {}) {
    const normId = userId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const profile = this.profiles[normId];
    if (!profile) return;

    const now = Date.now();
    profile.lastActivityTime = now;
    profile.accountAgeDays = Math.max(1, Math.floor((now - profile.createdAt) / (24 * 60 * 60 * 1000)));

    // Track daily active streaks
    const todayStr = new Date().toISOString().split('T')[0];
    if (!profile.dailyActiveDates.includes(todayStr)) {
      profile.dailyActiveDates.push(todayStr);
      // Clean old history
      if (profile.dailyActiveDates.length > 60) {
        profile.dailyActiveDates.shift();
      }
      
      // Calculate streak
      const yesterday = new Date(now - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      if (profile.dailyActiveDates.includes(yesterday)) {
        profile.metrics.consecutiveActiveDays++;
      } else {
        profile.metrics.consecutiveActiveDays = 1;
      }
    }

    const bp = profile.behaviourProfile;
    const mt = profile.metrics;
    let delta = 0.0;
    let reason = '';

    switch (activityType) {
      // 1. Genuine Goal & Session Completion (Positive consistency signals)
      case 'goal_created':
        mt.goalsCreated++;
        bp.reliability = Math.min(1.0, bp.reliability * 0.98 + 0.02 * 0.7);
        break;

      case 'goal_completed': {
        mt.goalsCompleted++;
        
        // Fraud Check: If goal completed instantly after creation
        const durationMs = meta.durationMs || (5 * 60 * 1000); // default 5 mins
        if (durationMs < 5000) { // under 5 seconds is extremely suspicious fake achievement
          mt.fakeEngagementAttempts++;
          bp.integrity = Math.max(0.0, bp.integrity - 0.12);
          bp.authenticity = Math.max(0.0, bp.authenticity - 0.10);
          delta = -2.5;
          reason = 'Suspicious rapid goal completion detected';
        } else {
          bp.reliability = Math.min(1.0, bp.reliability + 0.015);
          bp.consistency = Math.min(1.0, bp.consistency + 0.01);
          bp.integrity = Math.min(1.0, bp.integrity + 0.005);
          delta = 0.4;
          reason = 'Goal authentic completion verified';
        }
        break;
      }

      case 'focus_session_completed':
        mt.sessionsCompleted++;
        mt.sessionsAttempted++;
        bp.reliability = Math.min(1.0, bp.reliability + 0.02);
        bp.learningCommitment = Math.min(1.0, bp.learningCommitment + 0.025);
        bp.consistency = Math.min(1.0, bp.consistency + 0.015);
        delta = 0.6;
        reason = 'Deep Work Focus Session completed';
        break;

      case 'focus_session_cancelled':
        mt.sessionsAttempted++;
        bp.reliability = Math.max(0.0, bp.reliability - 0.01);
        delta = -0.2;
        reason = 'Focus Session prematurely cancelled';
        break;

      // 2. High Quality Communications vs Spam & Toxicity
      case 'chat_message_sent': {
        const text = meta.text || '';
        const len = text.length;

        // NLP Quality Indicators: Looking for constructive terminology
        const constructiveTerms = ['help', 'share', 'build', 'learn', 'logic', 'system', 'research', 'solve', 'stoic', 'habits', 'guide'];
        let constructiveCount = 0;
        constructiveTerms.forEach(term => {
          if (text.toLowerCase().includes(term)) constructiveCount++;
        });

        if (constructiveCount > 0) {
          mt.helpfulMessagesSent++;
          bp.helpfulness = Math.min(1.0, bp.helpfulness + 0.01);
          bp.positiveInteractionRatio = Math.min(1.0, bp.positiveInteractionRatio + 0.015);
          delta = 0.2;
          reason = 'Constructive peer chat message recorded';
        }

        // Spam Prevention Analysis
        const tooShortRepeated = len < 5;
        if (tooShortRepeated && meta.consecutiveMessageCount > 4) {
          mt.spamMessageCount++;
          bp.responsibility = Math.max(0.0, bp.responsibility - 0.05);
          bp.authenticity = Math.max(0.0, bp.authenticity - 0.08);
          delta = -1.5;
          reason = 'Repetitive low-effort chat spam warning';
        }

        // Fake Engagement / Flooding detection
        if (text.includes('👍') && text.length < 3 && meta.consecutiveMessageCount > 6) {
          mt.fakeEngagementAttempts++;
          bp.integrity = Math.max(0.0, bp.integrity - 0.05);
          delta = -1.0;
          reason = 'Sub-optimal robotic reaction pattern logged';
        }
        break;
      }

      case 'toxic_behavior_flagged': {
        mt.toxicBehaviorsDetected++;
        bp.positiveInteractionRatio = Math.max(0.0, bp.positiveInteractionRatio - 0.20);
        bp.responsibility = Math.max(0.0, bp.responsibility - 0.15);
        bp.integrity = Math.max(0.0, bp.integrity - 0.10);
        delta = -8.0; // Significant appropriate penalty but avoids instant ban
        reason = `Toxicity detected in communication signals`;
        break;
      }

      // 3. Collaborative Networks
      case 'collaboration_session_ended': {
        const success = meta.success;
        if (success) {
          mt.successfulCollaborations++;
          bp.communityContribution = Math.min(1.0, bp.communityContribution + 0.03);
          bp.reliability = Math.min(1.0, bp.reliability + 0.02);
          delta = 0.8;
          reason = 'Successful dual node collaboration';
        } else {
          mt.failedCollaborations++;
          bp.reliability = Math.max(0.0, bp.reliability - 0.02);
          delta = -0.5;
          reason = 'Incomplete or abandoned collaboration task';
        }
        break;
      }

      case 'community_report_filed': {
        mt.communityReportsReceived++;
        bp.communityContribution = Math.max(0.0, bp.communityContribution - 0.15);
        bp.responsibility = Math.max(0.0, bp.responsibility - 0.12);
        delta = -5.0;
        reason = 'External safety report filed against account';
        break;
      }

      // 4. Recovery Routine: Self-healing for inactive/recovering periods
      case 'idle_trust_recovery': {
        // If they had positive behavior recently, allow slow crawl back up to normal
        if (profile.trustScore < 90) {
          bp.integrity = Math.min(1.0, bp.integrity + 0.005);
          bp.responsibility = Math.min(1.0, bp.responsibility + 0.005);
          delta = 0.3;
          reason = 'Behavior recovery mechanism synchronized';
        }
        break;
      }
    }

    if (delta !== 0.0) {
      this.recalculateTrustScore(profile, delta, reason);
    }
  }

  /**
   * Internal algorithm calculation: Calculates and stabilizes trust ratings
   * Dampens sudden changes via rolling historical averages.
   */
  private recalculateTrustScore(profile: UserTrustProfile, delta: number, reason: string) {
    const bp = profile.behaviourProfile;

    // AI Authenticity Rating matches the core dimensions
    const rawMetricsScore = (
      bp.reliability * 0.15 +
      bp.consistency * 0.12 +
      bp.integrity * 0.18 +
      bp.authenticity * 0.15 +
      bp.helpfulness * 0.10 +
      bp.responsibility * 0.10 +
      bp.communityContribution * 0.08 +
      bp.learningCommitment * 0.06 +
      bp.positiveInteractionRatio * 0.06
    ) * 100;

    // Recovery speed boost: If user has low trust but no recent toxic behavior,
    // trust recovers 1.5x faster to incentivize genuine rehabilitation
    let actualDelta = delta;
    if (delta > 0 && profile.trustScore < 70 && profile.metrics.toxicBehaviorsDetected === 0) {
      actualDelta *= 1.5;
    }

    // Account age boost (up to 5 points maximum for mature accounts over 30 days)
    const maturityFactor = Math.min(5.0, profile.accountAgeDays * 0.15);

    // Dynamic state updating
    profile.recentTrust = Math.max(0.0, Math.min(100.0, rawMetricsScore + actualDelta));
    
    // Dampening formula: 70% long term running average, 30% recent activities
    // This blocks wild, jittery score changes
    profile.longTermTrust = profile.longTermTrust * 0.95 + profile.recentTrust * 0.05;
    
    const calculatedScore = (profile.longTermTrust * 0.7) + (profile.recentTrust * 0.3) + (maturityFactor * 0.2);
    const prevScore = profile.trustScore;
    profile.trustScore = Math.max(0.0, Math.min(100.0, Number(calculatedScore.toFixed(2))));

    // Append history log
    profile.history.push({
      timestamp: Date.now(),
      score: profile.trustScore,
      delta: Number((profile.trustScore - prevScore).toFixed(2)),
      reason
    });

    // Trim history log to save storage
    if (profile.history.length > 40) {
      profile.history.shift();
    }

    this.saveProfiles();
  }

  /**
   * Safe Diagnostic logs for deep developer telemetry
   */
  public getInternalDiagnosticsJSON(): any {
    return {
      diagnostics_timestamp: Date.now(),
      total_profiles: Object.keys(this.profiles).length,
      global_average_trust: Number((Object.values(this.profiles).reduce((acc, p) => acc + p.trustScore, 0) / Math.max(1, Object.keys(this.profiles).length)).toFixed(2)),
      user_trust_profiles: Object.keys(this.profiles).map(id => ({
        id,
        name: this.profiles[id].name,
        trustScore: this.profiles[id].trustScore,
        longTermTrust: Number(this.profiles[id].longTermTrust.toFixed(2)),
        recentTrust: Number(this.profiles[id].recentTrust.toFixed(2)),
        accountAgeDays: this.profiles[id].accountAgeDays,
        behaviourProfile: this.profiles[id].behaviourProfile,
        metrics: this.profiles[id].metrics,
        recentHistoryLog: this.profiles[id].history.slice(-3)
      }))
    };
  }
}

// Export singleton instance
export const trustScoreEngine = new TrustScoreEngine();
