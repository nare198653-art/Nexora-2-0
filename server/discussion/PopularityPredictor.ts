/**
 * Popularity Prediction Engine
 * Predicts emerging viral/popular discussions before they peak using early velocity,
 * question probability, participant growth rate, and semantic urgency.
 */

import { DiscussionTopicNode, PopularityPredictionResult } from './types.js';

export class PopularityPredictor {

  /**
   * Predicts popularity acceleration and emerging trend potential for a topic.
   */
  public static predictPopularity(node: DiscussionTopicNode, now: number = Date.now()): PopularityPredictionResult {
    const ageMinutes = Math.max(0.5, (now - node.createdAt) / (1000 * 60));
    const msgCount = node.messageIds.length + node.duplicateCount;
    const participants = node.metrics.activeParticipantsCount;

    // Acceleration ratio: messages per minute in young topics
    const earlyVelocity = msgCount / ageMinutes;
    const participantRatio = participants / Math.max(1, msgCount);

    // Question / Help engagement multiplier (questions invite more replies)
    const engagementMultiplier = node.category === 'question' || node.category === 'bug_report' ? 1.3 : 1.0;

    // Growth acceleration factor
    const acceleration = earlyVelocity * (1 + participantRatio) * engagementMultiplier;

    const isEmerging = (ageMinutes < 60 && acceleration > 0.8 && participants >= 2) || (node.metrics.urgencyScore > 0.7);
    const predictedScore = Number((node.rankingScore * (1 + (isEmerging ? 0.6 : 0.1))).toFixed(2));
    const confidence = Number((Math.min(0.98, 0.5 + (msgCount * 0.05))).toFixed(2));

    let reason = "Normal conversational growth";
    if (isEmerging) {
      if (node.metrics.urgencyScore > 0.7) {
        reason = "High urgency problem requiring group consensus";
      } else if (earlyVelocity > 1.2) {
        reason = "Rapid participant response velocity";
      } else {
        reason = "High multi-user engagement density";
      }
    }

    const prediction = {
      predictedScore,
      isEmerging,
      confidence,
      trendReason: reason
    };

    node.popularityPrediction = prediction;

    return {
      topicId: node.id,
      currentRank: node.rankingScore,
      predictedRank: predictedScore,
      growthAcceleration: Number(acceleration.toFixed(2)),
      isEmerging,
      confidence,
      reason
    };
  }
}
