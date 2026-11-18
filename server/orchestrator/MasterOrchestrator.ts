/**
 * Nexora Master AI Orchestrator - Central Nervous System
 * 100% Backend Layer connecting all algorithm subsystems together
 */

import { EventBus } from './EventBus';
import { SharedMemory } from './SharedMemory';
import { AlgorithmRegistry } from './AlgorithmRegistry';
import { SafetyLayer } from './SafetyLayer';
import { DecisionEngine } from './DecisionEngine';
import { SelfOptimizationEngine } from './SelfOptimizationEngine';
import {
  OrchestratorEvent,
  AlgorithmRecommendation,
  OrchestratorDecision,
  UserUnifiedContext,
  AuditLogEntry
} from './types';

// Import existing Nexora backend engines to register as central algorithms
import { trustScoreEngine } from '../trustEngine';
import { affinityEngine } from '../affinityEngine';
import { identityEngine } from '../identityEngine';
import { identityDriftEngine } from '../identityDriftEngine';
import { contextIntelligenceEngine } from '../contextIntelligenceEngine';
import { runJourneyEngine } from '../../services/journeyEngine';
import { nextStepService } from '../../services/nextStepService';
import { behavioralSuggestions } from '../../services/behavioralIntelligence';

export class MasterOrchestrator {
  public eventBus: EventBus;
  public sharedMemory: SharedMemory;
  public registry: AlgorithmRegistry;
  public safetyLayer: SafetyLayer;
  public decisionEngine: DecisionEngine;
  public selfOptimizer: SelfOptimizationEngine;

  private auditLogs: AuditLogEntry[] = [];
  private isInitialized: boolean = false;

  constructor() {
    this.eventBus = new EventBus();
    this.sharedMemory = new SharedMemory();
    this.registry = new AlgorithmRegistry();
    this.safetyLayer = new SafetyLayer();
    this.decisionEngine = new DecisionEngine(this.safetyLayer);
    this.selfOptimizer = new SelfOptimizationEngine(this.registry);

    this.initializeCoreAlgorithms();
  }

  /**
   * Register all Nexora backend engines into the Algorithm Registry
   */
  private initializeCoreAlgorithms(): void {
    if (this.isInitialized) return;

    // 1. Goal Engine
    this.registry.register({
      id: 'goal-engine',
      name: 'Nexora Goal & Milestone Engine',
      category: 'Goal',
      description: 'Monitors goal creation, progress tracking, and milestone completion velocity.',
      initialWeight: 1.1,
      subscribedEvents: ['goal_created', 'goal_completed', 'milestone_updated']
    });

    // 2. Trust Engine
    this.registry.register({
      id: 'trust-engine',
      name: 'Nexora Trust Score & Integrity Engine',
      category: 'Trust',
      description: 'Evaluates reliability, consistency, authenticity, and community safety signals.',
      initialWeight: 1.4,
      subscribedEvents: ['trust_decreased', 'toxic_behavior_flagged', 'community_report_filed', 'focus_session_completed', 'chat_message_sent']
    });

    // 3. Memory Engine
    this.registry.register({
      id: 'memory-engine',
      name: 'Nexora Shared Memory & Knowledge Matrix',
      category: 'Memory',
      description: 'Central knowledge store for user patterns, conversation history, and preferences.',
      initialWeight: 1.0,
      subscribedEvents: ['memory_created', 'pattern_detected', 'preference_updated']
    });

    // 4. Identity Engine
    this.registry.register({
      id: 'identity-engine',
      name: 'Nexora Core Identity Vector Engine',
      category: 'Identity',
      description: 'Tracks 17 identity dimensions, emerging traits, and behavioral shifts.',
      initialWeight: 1.2,
      subscribedEvents: ['identity_changed', 'building_project', 'complex_problem_solved', 'help_peer']
    });

    // 5. Recommendation Engine
    this.registry.register({
      id: 'recommendation-engine',
      name: 'Nexora Contextual Recommendation Engine',
      category: 'Recommendation',
      description: 'Synthesizes active mode, workload, and user context to recommend optimal actions.',
      initialWeight: 1.0,
      subscribedEvents: ['recommendation_requested', 'mode_switched']
    });

    // 6. Prediction Engine
    this.registry.register({
      id: 'prediction-engine',
      name: 'Nexora Relationship & Performance Prediction Engine',
      category: 'Prediction',
      description: 'Predicts relationship stability, completion probability, and performance trajectories.',
      initialWeight: 1.0,
      subscribedEvents: ['prediction_requested', 'collaboration_ended']
    });

    // 7. Relationship / Affinity Engine
    this.registry.register({
      id: 'affinity-engine',
      name: 'Nexora Behavioral Affinity & Resonance Engine',
      category: 'Relationship',
      description: 'Calculates user compatibility, active hour overlap, and collaboration scores.',
      initialWeight: 1.1,
      subscribedEvents: ['relationship_strengthened', 'friend_added', 'chat_message_sent', 'collaborated_on_session']
    });

    // 8. Recovery / Momentum Rescue Engine
    this.registry.register({
      id: 'recovery-engine',
      name: 'Nexora Momentum Rescue & Streak Recovery Engine',
      category: 'Recovery',
      description: 'Detects stalled streaks, burnout indicators, and triggers soft recovery routines.',
      initialWeight: 1.3,
      subscribedEvents: ['streak_broken', 'focus_session_cancelled', 'idle_detected']
    });

    // 9. Growth / Journey Engine
    this.registry.register({
      id: 'journey-engine',
      name: 'Nexora Journey & Story Chain Engine',
      category: 'Growth',
      description: 'Connects isolated actions into learning, productivity, builder, and social chains.',
      initialWeight: 1.1,
      subscribedEvents: ['xp_increased', 'level_up', 'task_completed']
    });

    // 10. Future Self / Identity Drift Engine
    this.registry.register({
      id: 'drift-engine',
      name: 'Nexora Future Self & Identity Drift Engine',
      category: 'FutureSelf',
      description: 'Audits the gap between desired target aspirations and actual recorded behaviors.',
      initialWeight: 1.2,
      subscribedEvents: ['activity_detected', 'focus_session_completed', 'study_session']
    });

    // 11. Momentum Engine
    this.registry.register({
      id: 'momentum-engine',
      name: 'Nexora Neural Momentum & Velocity Engine',
      category: 'Momentum',
      description: 'Tracks daily XP velocity, streak consistency, and deep work cadence.',
      initialWeight: 1.0,
      subscribedEvents: ['focus_session_completed', 'streak_updated']
    });

    // 12. Context Intelligence Engine
    this.registry.register({
      id: 'context-intelligence-engine',
      name: 'Nexora Intent & Context Intelligence Engine',
      category: 'Context',
      description: 'Performs multi-turn intent reasoning, digital twin alignment, and adaptive AI generation.',
      initialWeight: 1.3,
      subscribedEvents: ['conversation_started', 'chat_message_sent', 'query_received']
    });

    // 13. Behavioral Intelligence Engine
    this.registry.register({
      id: 'behavioral-intelligence-engine',
      name: 'Nexora Real-time Behavioral Nudge Engine',
      category: 'Behavioral',
      description: 'Monitors scroll fatigue, rapid tab switching, and offers cognitive reset interventions.',
      initialWeight: 1.0,
      subscribedEvents: ['frequent_tab_switches', 'excessive_scrolling', 'idle_detected']
    });

    // 14. Next Step Engine
    this.registry.register({
      id: 'next-step-engine',
      name: 'Nexora Personalised Next Meaningful Step Engine',
      category: 'NextStep',
      description: 'Selects and personalizes the single most impactful bonus challenge for the user.',
      initialWeight: 1.1,
      subscribedEvents: ['all_tasks_completed', 'next_step_requested']
    });

    // Subscribe Master Orchestrator event router to wildcard event bus
    this.eventBus.subscribe('*', 'master-orchestrator', this.handleEvent.bind(this));

    this.isInitialized = true;
    console.log('[MasterOrchestrator] Central Nervous System initialized with 14 core backend algorithms.');
  }

  /**
   * Main Event Processing Pipeline
   */
  public async handleEvent(event: OrchestratorEvent): Promise<OrchestratorDecision> {
    const startTime = Date.now();
    const correlationId = event.correlationId || `corr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // 1. Build or fetch Unified User Context
    const userContext = await this.getUnifiedUserContext(event.userId);

    // 2. Notify and update underlying backend subsystems
    await this.notifySubsystems(event);

    // 3. Gather algorithm recommendations
    const recommendations = await this.gatherAlgorithmRecommendations(event, userContext);

    // 4. Pass through Decision Engine for scoring, conflict resolution, and safety vetoes
    const decision = this.decisionEngine.evaluateAndResolve(event, recommendations, userContext);

    // 5. Execute winning recommendations and update Shared Memory
    await this.executeDecision(decision, userContext);

    // 6. Trigger Self-Optimization feedback loop
    this.selfOptimizer.evaluateAndOptimize(decision);

    // 7. Audit log entry
    const performanceMs = Date.now() - startTime;
    this.logAudit({
      id: decision.id,
      timestamp: startTime,
      eventType: event.type,
      userId: event.userId,
      source: event.sourceAlgorithmId || 'external',
      details: {
        decisionResult: decision.executionResult,
        executedCount: decision.executedActions.length,
        vetoedCount: decision.vetoedActions.length,
        conflictResolved: decision.conflictResolved,
        reasoning: decision.decisionReasoning
      },
      performanceMs,
      status: decision.executionResult === 'failed' ? 'error' : (decision.vetoedActions.length > 0 ? 'warning' : 'ok')
    });

    return decision;
  }

  /**
   * Synchronize incoming event with existing backend engines
   */
  private async notifySubsystems(event: OrchestratorEvent): Promise<void> {
    const { userId, type, payload } = event;

    try {
      // Notify Trust Engine
      trustScoreEngine.recordActivity(userId, type, payload);

      // Notify Affinity Engine
      affinityEngine.recordUserActivity(userId, type, payload);

      // Notify Identity Engine
      identityEngine.recordBehavior(userId, type, payload).catch(() => {});

      // Notify Identity Drift Engine
      identityDriftEngine.observeActivity(userId, type, payload).catch(() => {});
    } catch (err) {
      console.warn('[MasterOrchestrator] Non-blocking warning notifying underlying engines:', err);
    }
  }

  /**
   * Gather recommendations from registered algorithms for an event
   */
  private async gatherAlgorithmRecommendations(
    event: OrchestratorEvent,
    userContext: UserUnifiedContext
  ): Promise<AlgorithmRecommendation[]> {
    const recommendations: AlgorithmRecommendation[] = [];

    // Goal Engine recommendation
    if (event.type === 'goal_completed' || event.type === 'task_completed') {
      recommendations.push({
        id: `rec-goal-${Date.now()}`,
        algorithmId: 'goal-engine',
        userId: event.userId,
        actionType: 'update_xp_and_streak',
        parameters: { xpGained: 50, incrementStreak: true },
        confidence: 0.95,
        priority: 80,
        urgency: 70,
        reliability: 0.95,
        reasoning: 'Goal or task completion verified by Goal Engine. Recommend awarding XP and updating daily streak.'
      });
    }

    // Trust Engine recommendation
    if (event.type === 'toxic_behavior_flagged' || userContext.trustProfile?.recentTrust < 50) {
      recommendations.push({
        id: `rec-trust-${Date.now()}`,
        algorithmId: 'trust-engine',
        userId: event.userId,
        actionType: 'flag_security_review',
        parameters: { trustScore: userContext.trustProfile?.trustScore },
        confidence: 0.98,
        priority: 95,
        urgency: 95,
        reliability: 0.98,
        reasoning: 'Low trust or toxic behavior detected. Recommending security flag to protect community network.',
        vetoRules: { requiresTrustThreshold: 0 }
      });
    }

    // Recovery Engine recommendation
    if (event.type === 'streak_broken' || userContext.criticalState) {
      recommendations.push({
        id: `rec-recovery-${Date.now()}`,
        algorithmId: 'recovery-engine',
        userId: event.userId,
        actionType: 'trigger_momentum_rescue',
        parameters: { rescueGoal: '5-minute micro focus session' },
        confidence: 0.90,
        priority: 90,
        urgency: 85,
        reliability: 0.90,
        reasoning: 'User momentum is broken or at risk. Recommending a soft 5-minute recovery micro-goal.'
      });
    }

    // Future Self / Identity Drift recommendation
    if (userContext.driftProfile?.overallDriftScore > 30) {
      recommendations.push({
        id: `rec-drift-${Date.now()}`,
        algorithmId: 'drift-engine',
        userId: event.userId,
        actionType: 'realign_drift_aspirations',
        parameters: { overallDrift: userContext.driftProfile.overallDriftScore },
        confidence: 0.85,
        priority: 75,
        urgency: 60,
        reliability: 0.85,
        reasoning: `Significant identity drift detected (${userContext.driftProfile.overallDriftScore}). Recommending aspiration realignment.`
      });
    }

    // Next Step Engine recommendation
    if (event.type === 'all_tasks_completed' || event.type === 'next_step_requested') {
      recommendations.push({
        id: `rec-nextstep-${Date.now()}`,
        algorithmId: 'next-step-engine',
        userId: event.userId,
        actionType: 'generate_next_meaningful_step',
        parameters: { completedCount: event.payload?.completedTodayCount || 1 },
        confidence: 0.92,
        priority: 85,
        urgency: 75,
        reliability: 0.90,
        reasoning: 'All daily tasks completed. Recommending personalized bonus challenge.'
      });
    }

    return recommendations;
  }

  /**
   * Execute winning decision actions and update Shared Memory
   */
  private async executeDecision(
    decision: OrchestratorDecision,
    userContext: UserUnifiedContext
  ): Promise<void> {
    for (const action of decision.executedActions) {
      const { actionType, parameters, userId, algorithmId } = action.recommendation;

      // Update Shared Memory state with executed action
      this.sharedMemory.set(
        userId,
        'orchestrator_actions',
        actionType,
        {
          parameters,
          decisionId: decision.id,
          executedAt: Date.now()
        },
        algorithmId,
        24 * 60 * 60 * 1000 // 24hr TTL
      );
    }
  }

  /**
   * Get Unified User Context uniting all backend subsystem profiles
   */
  public async getUnifiedUserContext(userId: string): Promise<UserUnifiedContext> {
    const normId = userId.toLowerCase().replace(/[^a-z0-9]/g, '');

    const trustProfile = trustScoreEngine.getOrCreateProfile(normId, userId);
    const affinityProfile = affinityEngine.getOrCreateProfile(normId, userId);
    const identityProfile = identityEngine.getOrCreateProfile(normId, userId);
    const driftProfile = identityDriftEngine.getOrCreateProfile(normId, userId);
    const memory = this.sharedMemory.getUserMemorySummary(normId);

    const isStalled = driftProfile.overallDriftScore > 40 || trustProfile.trustScore < 50;
    const criticalState = trustProfile.metrics.toxicBehaviorsDetected > 0 || driftProfile.overallDriftScore > 50;

    let globalMood: UserUnifiedContext['globalMood'] = 'neutral';
    if (criticalState) globalMood = 'recovering';
    else if (driftProfile.overallDriftScore < 20 && trustProfile.trustScore > 85) globalMood = 'growth';
    else if (isStalled) globalMood = 'stalled';
    else globalMood = 'focused';

    return {
      userId: normId,
      updatedAt: Date.now(),
      activeGoals: [],
      trustProfile,
      identityProfile,
      driftProfile,
      affinityProfile,
      contextIntelligence: {},
      memoryPatterns: Object.values(memory.patterns || {}),
      recentActivities: driftProfile.recentActivities || [],
      behavioralState: {},
      journeyChains: [],
      nextStepRecommendation: null,
      globalMood,
      criticalState
    };
  }

  /**
   * Publish an event to the orchestrator (public backend interface)
   */
  public async publishEvent(
    userId: string,
    type: string,
    payload: Record<string, any> = {},
    sourceAlgorithmId?: string
  ): Promise<OrchestratorDecision> {
    const event: OrchestratorEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type,
      userId,
      payload,
      timestamp: Date.now(),
      sourceAlgorithmId
    };

    return this.handleEvent(event);
  }

  /**
   * Log internal diagnostic audit entry
   */
  private logAudit(entry: AuditLogEntry): void {
    this.auditLogs.push(entry);
    if (this.auditLogs.length > 200) {
      this.auditLogs.shift();
    }
  }

  /**
   * Return full system diagnostic telemetry JSON
   */
  public getDiagnosticsJSON(): any {
    return {
      system: 'Nexora Master AI Orchestrator (Backend AI Brain)',
      status: 'Operational',
      initializedAt: new Date().toISOString(),
      algorithmRegistry: this.registry.getRegistryDiagnostics(),
      sharedMemoryBlocksCount: (this.sharedMemory as any).memoryStore.size,
      subscribersCount: this.eventBus.getSubscriberCount(),
      auditLogsCount: this.auditLogs.length,
      recentAuditLogs: this.auditLogs.slice(-10)
    };
  }
}

// Export singleton instance
export const masterOrchestrator = new MasterOrchestrator();
