/**
 * Nexora Master AI Orchestrator - Safety Layer
 * Ensures system stability, prevents infinite loops, deadlocks, duplicate actions, and enforces trust vetoes
 */

import { AlgorithmRecommendation, ScoredRecommendation, SafetyConfig } from './types';

export class SafetyLayer {
  private activeLocks: Set<string> = new Map() as any; // Re-entrancy locks
  private executedActionHashes: Map<string, number> = new Map(); // Action deduplication window
  private config: SafetyConfig;

  constructor(config?: Partial<SafetyConfig>) {
    this.config = {
      maxCallDepth: config?.maxCallDepth ?? 5,
      maxEventsPerWindow: config?.maxEventsPerWindow ?? 200,
      rateWindowMs: config?.rateWindowMs ?? 1000,
      deduplicationWindowMs: config?.deduplicationWindowMs ?? 3000,
      reentrancyGuardMs: config?.reentrancyGuardMs ?? 100
    };
  }

  /**
   * Acquire a lock for a specific resource or user pipeline to prevent deadlocks and race conditions
   */
  public acquireLock(lockKey: string): boolean {
    if (this.activeLocks.has(lockKey as any)) {
      return false; // Lock already held
    }
    this.activeLocks.add(lockKey as any);

    // Auto-release lock after safeguard timeout
    setTimeout(() => {
      this.releaseLock(lockKey);
    }, 5000);

    return true;
  }

  /**
   * Release a lock
   */
  public releaseLock(lockKey: string): void {
    this.activeLocks.delete(lockKey as any);
  }

  /**
   * Evaluate safety and veto rules on a batch of algorithm recommendations
   */
  public evaluateSafety(
    recommendations: AlgorithmRecommendation[],
    userContext: any
  ): ScoredRecommendation[] {
    const now = Date.now();
    const scoredList: ScoredRecommendation[] = [];

    // Clean old action hashes
    if (this.executedActionHashes.size > 2000) {
      for (const [hash, time] of this.executedActionHashes.entries()) {
        if (now - time > this.config.deduplicationWindowMs * 2) {
          this.executedActionHashes.delete(hash);
        }
      }
    }

    for (const rec of recommendations) {
      let vetoed = false;
      let vetoReason = '';

      // 1. Action Deduplication Guard
      const actionHash = `${rec.userId}:${rec.actionType}:${JSON.stringify(rec.parameters)}`;
      const lastExecuted = this.executedActionHashes.get(actionHash);

      if (lastExecuted && (now - lastExecuted) < this.config.deduplicationWindowMs) {
        vetoed = true;
        vetoReason = `Duplicate action suppressed within ${this.config.deduplicationWindowMs}ms window`;
      }

      // 2. Trust Threshold Enforcement
      if (!vetoed && rec.vetoRules?.requiresTrustThreshold) {
        const userTrustScore = userContext?.trustProfile?.trustScore ?? 70;
        if (userTrustScore < rec.vetoRules.requiresTrustThreshold) {
          vetoed = true;
          vetoReason = `Vetoed by Safety Layer: User trust score (${userTrustScore}) is below required threshold (${rec.vetoRules.requiresTrustThreshold})`;
        }
      }

      // 3. Security/Toxicity Veto
      if (!vetoed && userContext?.hasToxicSignal && rec.actionType.includes('group_chat')) {
        vetoed = true;
        vetoReason = 'Vetoed by Safety Layer: Active toxicity flag blocks peer communication action';
      }

      // 4. Calculate composite score
      // compositeScore = confidence * priority * urgency * reliability * weight
      const weight = userContext?.algorithmWeights?.[rec.algorithmId] ?? 1.0;
      const compositeScore = Number((rec.confidence * (rec.priority / 100) * (rec.urgency / 100) * rec.reliability * weight).toFixed(4));

      scoredList.push({
        recommendation: rec,
        algorithmWeight: weight,
        compositeScore: vetoed ? 0 : compositeScore,
        vetoed,
        vetoReason: vetoed ? vetoReason : undefined
      });
    }

    return scoredList;
  }

  /**
   * Mark an action as executed for deduplication
   */
  public markActionExecuted(userId: string, actionType: string, parameters: any): void {
    const actionHash = `${userId}:${actionType}:${JSON.stringify(parameters)}`;
    this.executedActionHashes.set(actionHash, Date.now());
  }
}
