/**
 * Nexora Master AI Orchestrator - Self Optimization Engine
 * Monitors algorithm accuracy, decision outcomes, and automatically recalibrates algorithm decision weights
 */

import { AlgorithmRegistry } from './AlgorithmRegistry';
import { OrchestratorDecision } from './types';

export class SelfOptimizationEngine {
  private registry: AlgorithmRegistry;
  private learningRate: number = 0.02;

  constructor(registry: AlgorithmRegistry) {
    this.registry = registry;
  }

  /**
   * Process a completed OrchestratorDecision and adjust algorithm weights based on performance
   */
  public evaluateAndOptimize(decision: OrchestratorDecision, userFeedbackSuccess?: boolean): void {
    // 1. Evaluate executed winning actions
    for (const executed of decision.executedActions) {
      const algoId = executed.recommendation.algorithmId;
      const meta = this.registry.get(algoId);

      if (!meta) continue;

      this.registry.recordOutcome(algoId, 'success');

      // Increase weight if user feedback was positive or decision succeeded
      const feedbackMultiplier = userFeedbackSuccess === false ? -1.0 : 1.0;
      const weightDelta = this.learningRate * feedbackMultiplier * (executed.recommendation.confidence);

      this.registry.updateWeight(algoId, meta.currentWeight + weightDelta);
    }

    // 2. Evaluate vetoed actions
    for (const vetoed of decision.vetoedActions) {
      const algoId = vetoed.recommendation.algorithmId;
      const meta = this.registry.get(algoId);

      if (!meta) continue;

      this.registry.recordOutcome(algoId, 'vetoed');

      // Decrease weight slightly for vetoed recommendations
      const weightDelta = -this.learningRate * 0.5;
      this.registry.updateWeight(algoId, meta.currentWeight + weightDelta);
    }

    // 3. Normalize weights periodically across all algorithms
    this.normalizeRegistryWeights();
  }

  /**
   * Normalize algorithm weights to prevent extreme weight divergence
   */
  private normalizeRegistryWeights(): void {
    const all = this.registry.getAll();
    if (all.length === 0) return;

    const totalWeight = all.reduce((acc, m) => acc + m.currentWeight, 0);
    const targetAvg = 1.0;
    const currentAvg = totalWeight / all.length;

    if (Math.abs(currentAvg - targetAvg) > 0.2) {
      const scaleFactor = targetAvg / currentAvg;
      for (const m of all) {
        this.registry.updateWeight(m.id, m.currentWeight * scaleFactor);
      }
    }
  }
}
