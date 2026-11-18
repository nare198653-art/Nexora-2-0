/**
 * Nexora Master Algorithm Orchestrator - Type Definitions
 * 100% Backend Architecture Layer
 */

export type EventSeverity = 'low' | 'normal' | 'high' | 'critical';

export interface OrchestratorEvent {
  id: string;
  type: string; // e.g. "goal_completed", "trust_decreased", "friend_added", "memory_created", "identity_changed", "streak_broken", etc.
  userId: string;
  payload: Record<string, any>;
  timestamp: number;
  sourceAlgorithmId?: string;
  severity?: EventSeverity;
  correlationId?: string;
  idempotencyKey?: string;
}

export type EventCallback = (event: OrchestratorEvent) => Promise<void> | void;

export interface AlgorithmMetadata {
  id: string;
  name: string;
  category: 
    | 'Goal' 
    | 'Trust' 
    | 'Memory' 
    | 'Identity' 
    | 'Recommendation' 
    | 'Prediction' 
    | 'Relationship' 
    | 'Recovery' 
    | 'Growth' 
    | 'FutureSelf' 
    | 'Momentum' 
    | 'Context' 
    | 'Behavioral' 
    | 'NextStep'
    | 'Custom';
  description: string;
  version: string;
  initialWeight: number; // 0.0 to 1.0
  currentWeight: number; // dynamically adjusted
  accuracyScore: number; // 0.0 to 1.0
  totalEvaluations: number;
  successfulDecisions: number;
  vetoCount: number;
  lastActiveTimestamp: number;
  subscribedEvents: string[]; // event types it listens for
}

export interface AlgorithmObservation {
  algorithmId: string;
  timestamp: number;
  userId: string;
  observationType: string;
  data: Record<string, any>;
  confidence: number; // 0.0 to 1.0
}

export interface AlgorithmPrediction {
  algorithmId: string;
  timestamp: number;
  userId: string;
  predictedOutcome: string;
  confidence: number; // 0.0 to 1.0
  horizonMs?: number;
  supportingData?: Record<string, any>;
}

export interface AlgorithmRecommendation {
  id: string;
  algorithmId: string;
  userId: string;
  actionType: string; // e.g. "trigger_recovery_prompt", "increase_trust_score", "update_identity_dimension", "recommend_next_step"
  parameters: Record<string, any>;
  confidence: number; // 0.0 to 1.0
  priority: number;   // 0 to 100
  urgency: number;    // 0 to 100
  reliability: number; // 0.0 to 1.0
  reasoning: string;
  vetoRules?: {
    requiresTrustThreshold?: number;
    forbiddenModes?: string[];
  };
}

export interface ScoredRecommendation {
  recommendation: AlgorithmRecommendation;
  algorithmWeight: number;
  compositeScore: number; // confidence * priority * urgency * reliability * weight
  vetoed: boolean;
  vetoReason?: string;
}

export interface OrchestratorDecision {
  id: string;
  correlationId: string;
  userId: string;
  triggerEvent: OrchestratorEvent;
  timestamp: number;
  consideredRecommendations: ScoredRecommendation[];
  winningAction?: ScoredRecommendation;
  executedActions: ScoredRecommendation[];
  vetoedActions: ScoredRecommendation[];
  conflictResolved: boolean;
  decisionReasoning: string;
  executionResult: 'success' | 'partial' | 'failed' | 'vetoed_all';
  executionDetails?: Record<string, any>;
}

export interface SharedMemoryBlock {
  key: string;
  userId: string;
  namespace: string;
  data: any;
  updatedByAlgorithm: string;
  updatedAt: number;
  ttlMs?: number;
  version: number;
}

export interface UserUnifiedContext {
  userId: string;
  updatedAt: number;
  activeGoals: any[];
  trustProfile: any;
  identityProfile: any;
  driftProfile: any;
  affinityProfile: any;
  contextIntelligence: any;
  memoryPatterns: any[];
  recentActivities: any[];
  behavioralState: any;
  journeyChains: any[];
  nextStepRecommendation: any;
  globalMood: 'focused' | 'stalled' | 'recovering' | 'growth' | 'collaborative' | 'neutral';
  criticalState: boolean; // e.g., streak at risk, trust breach, severe drift
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  eventType: string;
  userId: string;
  source: string;
  details: Record<string, any>;
  performanceMs: number;
  status: 'ok' | 'warning' | 'error';
}

export interface SafetyConfig {
  maxCallDepth: number; // Default: 5 to prevent stack overflow/infinite loops
  maxEventsPerWindow: number; // Rate limiting
  rateWindowMs: number;
  deduplicationWindowMs: number; // Drop duplicate events within this window
  reentrancyGuardMs: number;
}
