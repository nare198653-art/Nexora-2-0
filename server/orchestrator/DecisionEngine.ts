/**
 * Nexora Master AI Orchestrator - Decision Engine & Conflict Resolution
 * Evaluates competing algorithm recommendations, resolves conflicts, and selects optimal actions
 */

import {
  OrchestratorEvent,
  AlgorithmRecommendation,
  ScoredRecommendation,
  OrchestratorDecision
} from './types';
import { SafetyLayer } from './SafetyLayer';

export class DecisionEngine {
  private safetyLayer: SafetyLayer;

  constructor(safetyLayer: SafetyLayer) {
    this.safetyLayer = safetyLayer;
  }

  /**
   * Evaluate candidate algorithm recommendations, resolve conflicts, and make a final decision
   */
  public evaluateAndResolve(
    event: OrchestratorEvent,
    recommendations: AlgorithmRecommendation[],
    userContext: any
  ): OrchestratorDecision {
    const decisionId = `dec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const correlationId = event.correlationId || decisionId;

    if (recommendations.length === 0) {
      return {
        id: decisionId,
        correlationId,
        userId: event.userId,
        triggerEvent: event,
        timestamp: Date.now(),
        consideredRecommendations: [],
        executedActions: [],
        vetoedActions: [],
        conflictResolved: false,
        decisionReasoning: 'No algorithm recommendations were submitted for this event.',
        executionResult: 'success'
      };
    }

    // 1. Pass through Safety Layer for veto check and multi-dimensional composite scoring
    const scoredList = this.safetyLayer.evaluateSafety(recommendations, userContext);

    const validActions = scoredList.filter(s => !s.vetoed);
    const vetoedActions = scoredList.filter(s => s.vetoed);

    if (validActions.length === 0) {
      return {
        id: decisionId,
        correlationId,
        userId: event.userId,
        triggerEvent: event,
        timestamp: Date.now(),
        consideredRecommendations: scoredList,
        executedActions: [],
        vetoedActions,
        conflictResolved: false,
        decisionReasoning: 'All submitted recommendations were vetoed by the Safety Layer.',
        executionResult: 'vetoed_all'
      };
    }

    // 2. Conflict Resolution & Prioritization Strategy
    // Sort by composite score descending
    validActions.sort((a, b) => b.compositeScore - a.compositeScore);

    // Group recommendations by actionType to detect direct conflicts
    const actionGroups = new Map<string, ScoredRecommendation[]>();
    for (const scored of validActions) {
      const type = scored.recommendation.actionType;
      if (!actionGroups.has(type)) {
        actionGroups.set(type, []);
      }
      actionGroups.get(type)!.push(scored);
    }

    const winningActions: ScoredRecommendation[] = [];
    let conflictResolved = false;

    // For each action type, pick the highest composite score recommendation
    for (const [actionType, candidates] of actionGroups.entries()) {
      if (candidates.length > 1) {
        conflictResolved = true;
      }
      // Top candidate wins the conflict for this action type
      winningActions.push(candidates[0]);
    }

    // Sort final executed actions by composite score
    winningActions.sort((a, b) => b.compositeScore - a.compositeScore);
    const topWinningAction = winningActions[0];

    // Mark winning actions as executed in SafetyLayer for deduplication
    for (const winner of winningActions) {
      this.safetyLayer.markActionExecuted(
        winner.recommendation.userId,
        winner.recommendation.actionType,
        winner.recommendation.parameters
      );
    }

    const reasoning = conflictResolved
      ? `Resolved conflict across ${validActions.length} valid recommendations from multiple algorithms. Selected ${winningActions.length} optimal non-conflicting action(s). Top winner: ${topWinningAction.recommendation.algorithmId} (Score: ${topWinningAction.compositeScore}).`
      : `Selected top recommendation from ${topWinningAction.recommendation.algorithmId} with composite score ${topWinningAction.compositeScore}.`;

    return {
      id: decisionId,
      correlationId,
      userId: event.userId,
      triggerEvent: event,
      timestamp: Date.now(),
      consideredRecommendations: scoredList,
      winningAction: topWinningAction,
      executedActions: winningActions,
      vetoedActions,
      conflictResolved,
      decisionReasoning: reasoning,
      executionResult: 'success'
    };
  }
}
