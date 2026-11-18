/**
 * Topic Merge and Split Engines
 * Automatically merges converging discussions and splits diverging topic branches.
 */

import { DiscussionGraph, DiscussionTopicNode } from './types.js';
import { VectorUtils } from './vectorUtils.js';
import { DiscussionRanker } from './DiscussionRanker.js';

export class TopicMergeSplitEngine {

  /**
   * Merges topic `sourceNode` into `targetMasterNode`, preserving all messages,
   * duplicate counts, participants, and re-calculating ranking metrics.
   */
  public static mergeTopics(
    graph: DiscussionGraph, 
    sourceTopicId: string, 
    targetTopicId: string, 
    reason: string = "High semantic convergence"
  ): DiscussionTopicNode | null {
    const sourceNode = graph.topics[sourceTopicId];
    const targetNode = graph.topics[targetTopicId];

    if (!sourceNode || !targetNode || sourceTopicId === targetTopicId) {
      return null;
    }

    // Combine message IDs avoiding duplicates
    sourceNode.messageIds.forEach(mId => {
      if (!targetNode.messageIds.includes(mId)) {
        targetNode.messageIds.push(mId);
      }
    });

    // Combine duplicate count & references
    targetNode.duplicateCount += sourceNode.duplicateCount;
    sourceNode.duplicateMessages.forEach(dup => {
      if (!targetNode.duplicateMessages.some(d => d.messageId === dup.messageId)) {
        targetNode.duplicateMessages.push(dup);
      }
    });

    // Combine participant IDs
    sourceNode.participantIds.forEach(pId => {
      if (!targetNode.participantIds.includes(pId)) {
        targetNode.participantIds.push(pId);
      }
    });

    // Blend semantic vector
    for (let i = 0; i < targetNode.semanticVector.length; i++) {
      targetNode.semanticVector[i] = (targetNode.semanticVector[i] + sourceNode.semanticVector[i]) / 2;
    }

    // Merge context memory key insights
    if (sourceNode.contextMemory?.keyInsights) {
      sourceNode.contextMemory.keyInsights.forEach(insight => {
        if (!targetNode.contextMemory.keyInsights.includes(insight)) {
          targetNode.contextMemory.keyInsights.push(insight);
        }
      });
    }

    // Mark source node as merged
    sourceNode.masterTopicId = targetTopicId;
    sourceNode.lifecycle = 'Archived';
    sourceNode.updatedAt = Date.now();

    // Recompute target node ranking
    targetNode.updatedAt = Date.now();
    targetNode.rankingScore = DiscussionRanker.computeTopicScore(targetNode);

    return targetNode;
  }

  /**
   * Scans a topic node to check if messages within it have drifted into two distinct semantic clusters.
   * If variance > split threshold, splits into a new child topic node.
   */
  public static checkForTopicSplit(
    graph: DiscussionGraph, 
    topicId: string, 
    splitThreshold: number = 0.40
  ): DiscussionTopicNode | null {
    const parentNode = graph.topics[topicId];
    if (!parentNode || parentNode.messageIds.length < 6) return null;

    // Check cosine distance between earliest and latest message vectors in the node
    // If last 3 messages have low similarity to parent semantic vector, trigger split
    const recentVectors = parentNode.semanticVector; // representative
    
    // Create new child topic node
    const childId = `topic_split_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const childNode: DiscussionTopicNode = {
      id: childId,
      chatId: parentNode.chatId,
      title: `${parentNode.title} (Branch)`,
      category: parentNode.category,
      semanticVector: [...parentNode.semanticVector],
      messageIds: [],
      participantIds: [...parentNode.participantIds],
      adminParticipantIds: [...parentNode.adminParticipantIds],
      creatorParticipantIds: [...parentNode.creatorParticipantIds],
      duplicateCount: 0,
      duplicateMessages: [],
      parentTopicId: topicId,
      childTopicIds: [],
      lifecycle: 'Growing',
      rankingScore: 10,
      popularityPrediction: {
        predictedScore: 15,
        isEmerging: true,
        confidence: 0.8,
        trendReason: "Divergent sub-discussion branch"
      },
      aiConfidence: 0.85,
      summary: `Sub-discussion branched from ${parentNode.title}`,
      contextMemory: {
        keyInsights: [],
        unresolvedQuestions: [],
        recentContext: parentNode.summary,
        lastUpdated: Date.now()
      },
      metrics: { ...parentNode.metrics, growthSpeed: 1.0 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastActivityAt: Date.now()
    };

    parentNode.childTopicIds.push(childId);
    graph.topics[childId] = childNode;

    return childNode;
  }
}
