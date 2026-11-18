/**
 * Nexora Master AI Orchestrator - Algorithm Registry
 * Dynamic registry managing algorithm metadata, weights, priorities, and performance
 */

import { AlgorithmMetadata } from './types';

export class AlgorithmRegistry {
  private registry: Map<string, AlgorithmMetadata> = new Map();

  /**
   * Register or update an algorithm in the central registry
   */
  public register(meta: Omit<AlgorithmMetadata, 'currentWeight' | 'accuracyScore' | 'totalEvaluations' | 'successfulDecisions' | 'vetoCount' | 'lastActiveTimestamp'> & Partial<AlgorithmMetadata>): AlgorithmMetadata {
    const existing = this.registry.get(meta.id);

    const fullMeta: AlgorithmMetadata = {
      id: meta.id,
      name: meta.name,
      category: meta.category,
      description: meta.description,
      version: meta.version || '1.0.0',
      initialWeight: meta.initialWeight ?? 1.0,
      currentWeight: existing ? existing.currentWeight : (meta.initialWeight ?? 1.0),
      accuracyScore: existing ? existing.accuracyScore : 0.85,
      totalEvaluations: existing ? existing.totalEvaluations : 0,
      successfulDecisions: existing ? existing.successfulDecisions : 0,
      vetoCount: existing ? existing.vetoCount : 0,
      lastActiveTimestamp: Date.now(),
      subscribedEvents: meta.subscribedEvents || ['*']
    };

    this.registry.set(meta.id, fullMeta);
    return fullMeta;
  }

  /**
   * Get metadata for a specific algorithm
   */
  public get(algorithmId: string): AlgorithmMetadata | undefined {
    return this.registry.get(algorithmId);
  }

  /**
   * Return all registered algorithms
   */
  public getAll(): AlgorithmMetadata[] {
    return Array.from(this.registry.values());
  }

  /**
   * Calculate dynamic priority multiplier for an algorithm given current user context
   * Contextually boosts priority in critical scenarios (e.g. streak broken, toxicity event, high drift)
   */
  public calculateDynamicPriority(algorithmId: string, context: any): number {
    const meta = this.registry.get(algorithmId);
    if (!meta) return 1.0;

    let multiplier = 1.0;

    // 1. Time of day / Activity factors
    const currentHour = new Date().getHours();

    switch (meta.category) {
      case 'Trust':
        if (context?.hasToxicSignal || context?.trustProfile?.recentTrust < 60) {
          multiplier *= 2.5; // Elevate Trust Engine during security/trust alerts
        }
        break;

      case 'Recovery':
      case 'Momentum':
        if (context?.streakAtRisk || context?.isStalled || context?.globalMood === 'stalled') {
          multiplier *= 2.0; // Elevate Recovery/Momentum when momentum is at risk
        }
        break;

      case 'FutureSelf':
        if (context?.driftProfile?.overallDriftScore > 35) {
          multiplier *= 1.8; // Elevate FutureSelf/Drift Engine when user is drifting significantly
        }
        break;

      case 'Goal':
      case 'NextStep':
        if (currentHour >= 8 && currentHour <= 18) {
          multiplier *= 1.3; // Boost productivity/goal priority during standard active hours
        }
        break;

      case 'Relationship':
        if (context?.activeCollaborationsCount > 0) {
          multiplier *= 1.5;
        }
        break;

      case 'Context':
      case 'Behavioral':
        if (context?.frequentTabSwitches || context?.isIdle) {
          multiplier *= 1.6;
        }
        break;
    }

    // Blend with algorithm's historical accuracy score and dynamic weight
    const finalScore = meta.currentWeight * meta.accuracyScore * multiplier;
    return Number(Math.max(0.1, Math.min(5.0, finalScore)).toFixed(3));
  }

  /**
   * Record evaluation outcome for self-optimization
   */
  public recordOutcome(algorithmId: string, outcome: 'success' | 'failed' | 'vetoed'): void {
    const meta = this.registry.get(algorithmId);
    if (!meta) return;

    meta.totalEvaluations++;
    meta.lastActiveTimestamp = Date.now();

    if (outcome === 'success') {
      meta.successfulDecisions++;
    } else if (outcome === 'vetoed') {
      meta.vetoCount++;
    }

    // Recalculate accuracy score
    const validEvals = Math.max(1, meta.totalEvaluations);
    meta.accuracyScore = Number((meta.successfulDecisions / validEvals).toFixed(3));
  }

  /**
   * Update dynamic algorithm weight directly
   */
  public updateWeight(algorithmId: string, newWeight: number): void {
    const meta = this.registry.get(algorithmId);
    if (meta) {
      meta.currentWeight = Number(Math.max(0.05, Math.min(2.0, newWeight)).toFixed(3));
    }
  }

  public getRegistryDiagnostics(): any {
    return {
      totalRegisteredCount: this.registry.size,
      categories: Array.from(this.registry.values()).reduce((acc, m) => {
        acc[m.category] = (acc[m.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      algorithms: Array.from(this.registry.values()).map(m => ({
        id: m.id,
        name: m.name,
        category: m.category,
        currentWeight: m.currentWeight,
        accuracyScore: m.accuracyScore,
        totalEvaluations: m.totalEvaluations,
        successfulDecisions: m.successfulDecisions,
        vetoCount: m.vetoCount
      }))
    };
  }
}
