/**
 * AI Topic Graph & Dynamic Duplicate Compression Engine
 * Manages the graph of AI discussion topics, duplicate compression, and node clustering.
 */

import { DiscussionGraph, DiscussionTopicNode, SemanticAnalysis, DuplicateMessageRef } from './types.js';
import { VectorUtils } from './vectorUtils.js';
import { DiscussionRanker } from './DiscussionRanker.js';
import { LifecycleManager } from './LifecycleManager.js';
import { PopularityPredictor } from './PopularityPredictor.js';

export class DiscussionTopicGraph {
  private static graphCache: Map<string, DiscussionGraph> = new Map();

  /**
   * Retrieves or initializes the Discussion Graph for a chat group.
   */
  public static getGraphForChat(chatId: string): DiscussionGraph {
    if (!this.graphCache.has(chatId)) {
      this.graphCache.set(chatId, {
        chatId,
        topics: {},
        topicEdgeWeights: {},
        totalMessagesProcessed: 0,
        totalDuplicatesCompressed: 0,
        lastGraphUpdate: Date.now()
      });
    }
    return this.graphCache.get(chatId)!;
  }

  /**
   * Ingests a new incoming message into the AI Topic Graph.
   * Connects to nearest semantic node, creates new node if distinct, or compresses if duplicate.
   */
  public static ingestMessage(
    chatId: string,
    message: { id: string; text: string; senderId?: string; senderName?: string; time?: string; timestamp?: number },
    analysis: SemanticAnalysis,
    isAdmin: boolean = false,
    isCreator: boolean = false
  ): { topicNode: DiscussionTopicNode; isDuplicate: boolean } {
    const graph = this.getGraphForChat(chatId);
    graph.totalMessagesProcessed++;
    const now = message.timestamp || Date.now();
    const sender = message.senderId || 'anonymous';
    const senderName = message.senderName || 'Participant';

    let bestMatchingTopic: DiscussionTopicNode | null = null;
    let highestSimilarity = 0;

    // 1. Search existing active topic nodes for closest semantic vector match
    Object.values(graph.topics).forEach(topic => {
      if (topic.masterTopicId) return; // Skip archived merged nodes

      const sim = VectorUtils.cosineSimilarity(analysis.embeddingVector, topic.semanticVector);
      if (sim > highestSimilarity) {
        highestSimilarity = sim;
        bestMatchingTopic = topic;
      }
    });

    const DUPLICATE_THRESHOLD = 0.88;
    const MATCH_THRESHOLD = 0.58;

    let isDuplicate = false;
    let targetNode: DiscussionTopicNode;

    if (bestMatchingTopic && highestSimilarity >= DUPLICATE_THRESHOLD) {
      // 2. DYNAMIC DUPLICATE COMPRESSION (Module 3)
      targetNode = bestMatchingTopic;
      isDuplicate = true;

      targetNode.duplicateCount += 1;
      graph.totalDuplicatesCompressed += 1;

      const dupRef: DuplicateMessageRef = {
        messageId: message.id,
        senderId: sender,
        senderName: senderName,
        text: message.text,
        timestamp: now,
        confidence: Number(highestSimilarity.toFixed(2))
      };

      targetNode.duplicateMessages.push(dupRef);

      // Increase participant & popularity score without visual clutter
      DiscussionRanker.updateNodeMetricsOnNewMessage(
        targetNode, 
        sender, 
        isAdmin, 
        isCreator, 
        analysis.urgency, 
        analysis.spamScore, 
        now
      );

      analysis.isDuplicate = true;
      analysis.masterTopicId = targetNode.id;

    } else if (bestMatchingTopic && highestSimilarity >= MATCH_THRESHOLD) {
      // 3. ATTACH TO NEAREST EXISTING TOPIC NODE
      targetNode = bestMatchingTopic;
      targetNode.messageIds.push(message.id);

      // Blend semantic vector gradually
      for (let i = 0; i < targetNode.semanticVector.length; i++) {
        targetNode.semanticVector[i] = Number(((targetNode.semanticVector[i] * 0.8) + (analysis.embeddingVector[i] * 0.2)).toFixed(6));
      }

      DiscussionRanker.updateNodeMetricsOnNewMessage(
        targetNode, 
        sender, 
        isAdmin, 
        isCreator, 
        analysis.urgency, 
        analysis.spamScore, 
        now
      );

    } else {
      // 4. CREATE NEW TOPIC NODE (Low similarity -> Distinct topic)
      const topicId = `topic_${chatId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      targetNode = {
        id: topicId,
        chatId,
        title: analysis.topic || "Discussion Point",
        category: analysis.intent,
        semanticVector: [...analysis.embeddingVector],
        messageIds: [message.id],
        participantIds: [sender],
        adminParticipantIds: isAdmin ? [sender] : [],
        creatorParticipantIds: isCreator ? [sender] : [],
        duplicateCount: 0,
        duplicateMessages: [],
        childTopicIds: [],
        lifecycle: 'Growing',
        rankingScore: 10,
        popularityPrediction: {
          predictedScore: 12,
          isEmerging: false,
          confidence: 0.7,
          trendReason: "Newly initiated topic"
        },
        aiConfidence: analysis.confidence || 0.85,
        summary: `Initiated topic on ${analysis.topic}`,
        contextMemory: {
          keyInsights: analysis.keywords.slice(0, 3),
          unresolvedQuestions: analysis.intent === 'question' ? [message.text] : [],
          recentContext: message.text.substring(0, 150),
          lastUpdated: now
        },
        metrics: {
          activeParticipantsCount: 1,
          growthSpeed: 1.0,
          messageFrequency: 1,
          recencyScore: 1.0,
          urgencyScore: analysis.urgency,
          adminParticipationWeight: isAdmin ? 1.0 : 0,
          creatorParticipationWeight: isCreator ? 1.0 : 0,
          engagementVelocity: 1.0,
          replyDensity: 0,
          semanticImportance: analysis.urgency > 0.5 ? 0.8 : 0.4,
          spamInfluenceFactor: 1.0 - (analysis.spamScore * 0.8)
        },
        createdAt: now,
        updatedAt: now,
        lastActivityAt: now
      };

      graph.topics[topicId] = targetNode;
      DiscussionRanker.updateNodeMetricsOnNewMessage(
        targetNode, 
        sender, 
        isAdmin, 
        isCreator, 
        analysis.urgency, 
        analysis.spamScore, 
        now
      );
    }

    // 5. Update lifecycle and popularity predictions
    LifecycleManager.updateLifecycleState(targetNode, now);
    PopularityPredictor.predictPopularity(targetNode, now);

    graph.lastGraphUpdate = now;
    return { topicNode: targetNode, isDuplicate };
  }

  /**
   * Returns sorted list of active topics for a group chat
   */
  public static getRankedTopicsForChat(chatId: string): DiscussionTopicNode[] {
    const graph = this.getGraphForChat(chatId);
    const topics = Object.values(graph.topics).filter(t => !t.masterTopicId && t.lifecycle !== 'Archived');
    
    // Sort by rankingScore descending
    topics.sort((a, b) => b.rankingScore - a.rankingScore);
    return topics;
  }
}
