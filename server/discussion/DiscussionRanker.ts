/**
 * Intelligent Topic Ranking Engine
 * Continuously calculates dynamic topic importance without rebuilding indexes.
 */

import { DiscussionTopicNode } from './types.js';

export class DiscussionRanker {

  /**
   * Recalculates and updates the dynamic ranking score for a topic node.
   */
  public static computeTopicScore(node: DiscussionTopicNode, now: number = Date.now()): number {
    const metrics = node.metrics;

    // 1. Participant Weight (Logarithmic scaling to prevent huge groups from completely dominating)
    const activeParticipants = Math.max(1, metrics.activeParticipantsCount);
    const participantScore = Math.log2(activeParticipants + 1) * 20;

    // 2. Growth Speed & Engagement Velocity (weight 25%)
    const growthVelocityScore = Math.min(100, metrics.growthSpeed * 15 + metrics.engagementVelocity * 10);

    // 3. Recency Decay (Exponential half-life decay of ~2 hours)
    const ageInMinutes = Math.max(0, (now - node.lastActivityAt) / (1000 * 60));
    const recencyDecayFactor = Math.exp(-ageInMinutes / 120);

    // 4. Urgency & Semantic Importance Boost (weight 20%)
    const urgencyImportanceScore = (metrics.urgencyScore * 30) + (metrics.semanticImportance * 25);

    // 5. Admin & Creator Participation Multipliers
    const adminBoost = 1.0 + (metrics.adminParticipationWeight * 0.25);
    const creatorBoost = 1.0 + (metrics.creatorParticipationWeight * 0.15);

    // 6. Reply Density Weight
    const replyDensityScore = Math.min(30, metrics.replyDensity * 5);

    // 7. Duplicate Compression Count Bonus
    const duplicateBonus = Math.min(25, node.duplicateCount * 2.5);

    // Base Composite Score
    const baseScore = (
      participantScore +
      growthVelocityScore +
      urgencyImportanceScore +
      replyDensityScore +
      duplicateBonus
    );

    // Apply Admin, Creator, Recency Decay, and Spam Downweighting
    const spamMultiplier = metrics.spamInfluenceFactor ?? 1.0;
    const finalScore = baseScore * recencyDecayFactor * adminBoost * creatorBoost * spamMultiplier;

    return Number(Math.max(0, finalScore).toFixed(2));
  }

  /**
   * Updates metric fields on a topic node when a new message arrives.
   */
  public static updateNodeMetricsOnNewMessage(
    node: DiscussionTopicNode,
    senderId: string,
    isAdmin: boolean,
    isCreator: boolean,
    urgency: number,
    spamScore: number,
    timestamp: number = Date.now()
  ): void {
    // Participant tracking
    if (!node.participantIds.includes(senderId)) {
      node.participantIds.push(senderId);
    }
    if (isAdmin && !node.adminParticipantIds.includes(senderId)) {
      node.adminParticipantIds.push(senderId);
    }
    if (isCreator && !node.creatorParticipantIds.includes(senderId)) {
      node.creatorParticipantIds.push(senderId);
    }

    node.metrics.activeParticipantsCount = node.participantIds.length;
    node.metrics.adminParticipationWeight = node.adminParticipantIds.length;
    node.metrics.creatorParticipationWeight = node.creatorParticipantIds.length;

    // Rolling growth speed
    const timeDeltaMin = Math.max(0.1, (timestamp - node.createdAt) / (1000 * 60));
    node.metrics.messageFrequency = node.messageIds.length;
    node.metrics.growthSpeed = Number((node.messageIds.length / timeDeltaMin).toFixed(2));
    node.metrics.engagementVelocity = Number((node.messageIds.length / (timeDeltaMin * 0.5 + 0.5)).toFixed(2));

    // Urgency smoothing
    node.metrics.urgencyScore = Number(((node.metrics.urgencyScore * 0.7) + (urgency * 0.3)).toFixed(2));

    // Spam multiplier
    const spamFactor = 1.0 - (spamScore * 0.8);
    node.metrics.spamInfluenceFactor = Number(((node.metrics.spamInfluenceFactor * 0.8) + (spamFactor * 0.2)).toFixed(2));

    // Update timestamps
    node.lastActivityAt = timestamp;
    node.updatedAt = timestamp;

    // Re-calculate ranking score
    node.rankingScore = this.computeTopicScore(node, timestamp);
  }
}
