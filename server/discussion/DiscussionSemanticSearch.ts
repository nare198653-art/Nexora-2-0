/**
 * Semantic Search Engine
 * Performs vector distance and semantic embedding matching across discussion graphs.
 */

import { DiscussionGraph, SemanticSearchResult, DiscussionTopicNode } from './types.js';
import { VectorUtils } from './vectorUtils.js';

export class DiscussionSemanticSearch {

  /**
   * Performs semantic vector search across a discussion graph for a query string.
   */
  public static searchGraph(
    graph: DiscussionGraph, 
    query: string, 
    allMessagesMap: Record<string, any> = {},
    limit: number = 10
  ): SemanticSearchResult[] {
    if (!query || !query.trim() || !graph || !graph.topics) return [];

    const queryClean = query.toLowerCase().trim();
    const queryVector = VectorUtils.generateFastTextVector(queryClean);
    const queryKeywords = queryClean.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);

    const results: SemanticSearchResult[] = [];

    Object.values(graph.topics).forEach(topic => {
      if (topic.masterTopicId) return; // Skip merged duplicate nodes

      // 1. Vector Cosine Similarity
      const vectorSim = VectorUtils.cosineSimilarity(queryVector, topic.semanticVector);

      // 2. Keyword Jaccard Similarity
      const keywordSim = VectorUtils.keywordSimilarity(queryKeywords, topic.contextMemory?.keyInsights || []);

      // 3. Title match boost
      const titleMatch = topic.title.toLowerCase().includes(queryClean) ? 0.35 : 0.0;

      // Composite relevance score
      const totalRelevance = (vectorSim * 0.5) + (keywordSim * 0.2) + titleMatch + (topic.rankingScore > 50 ? 0.05 : 0);

      if (totalRelevance >= 0.15) {
        // Collect matched message objects
        const matchedMsgs = topic.messageIds
          .map(mId => allMessagesMap[mId])
          .filter(Boolean);

        results.push({
          topic,
          relevanceScore: Number(totalRelevance.toFixed(3)),
          matchedMessages: matchedMsgs,
          matchedKeywords: queryKeywords
        });
      }
    });

    // Sort by relevance score descending
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return results.slice(0, limit);
  }
}
