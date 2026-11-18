/**
 * Context Memory Engine
 * Maintains discussion memory so incoming messages understand previous replies,
 * key insights, and unresolved questions without requiring exact word matches.
 */

import { DiscussionTopicNode } from './types.js';
import { callGeminiWithRetryAndFallback, cleanAndParseJSON } from '../geminiHelper.js';

export class DiscussionContextMemory {

  /**
   * Updates context memory and generates rolling summaries for a topic node.
   */
  public static async updateContextMemory(
    node: DiscussionTopicNode, 
    latestMessagesText: string[]
  ): Promise<void> {
    if (!latestMessagesText || latestMessagesText.length === 0) return;

    const combinedText = latestMessagesText.slice(-10).join('\n- ');
    
    // Quick heuristic update first
    node.contextMemory.recentContext = combinedText.substring(0, 300);
    node.contextMemory.lastUpdated = Date.now();

    // Asynchronously call Gemini for deep insight extraction if enough messages exist
    if (latestMessagesText.length >= 3) {
      try {
        const prompt = `
          Analyze this group discussion thread and update its context memory.
          Thread Title: "${node.title}"
          Recent Messages:
          - ${combinedText}

          Return JSON in EXACT format:
          {
            "summary": "1-2 sentence overview of current conversation state",
            "keyInsights": ["insight 1", "insight 2"],
            "unresolvedQuestions": ["question 1"]
          }
        `;

        const res = await callGeminiWithRetryAndFallback('gemini-3.5-flash', prompt, {
          temperature: 0.2,
          maxOutputTokens: 256
        });

        if (res && res.text) {
          const parsed = cleanAndParseJSON(res.text, null);
          if (parsed) {
            if (parsed.summary) node.summary = parsed.summary;
            if (Array.isArray(parsed.keyInsights)) node.contextMemory.keyInsights = parsed.keyInsights;
            if (Array.isArray(parsed.unresolvedQuestions)) node.contextMemory.unresolvedQuestions = parsed.unresolvedQuestions;
          }
        }
      } catch (err) {
        // Fallback gracefully
      }
    }
  }
}
