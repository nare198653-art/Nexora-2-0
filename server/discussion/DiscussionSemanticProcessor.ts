/**
 * Semantic Understanding Engine
 * AI Semantic processor that extracts intent, topic, emotion, urgency, question probability,
 * context relationship, and embedding vector representations.
 */

import { SemanticAnalysis, IntentCategory, EmotionType } from './types.js';
import { VectorUtils } from './vectorUtils.js';
import { DiscussionSpamFilter } from './DiscussionSpamFilter.js';
import { callGeminiWithRetryAndFallback, cleanAndParseJSON } from '../geminiHelper.js';

export class DiscussionSemanticProcessor {

  /**
   * Processes a message through the AI Semantic Understanding Engine.
   * Utilizes zero-latency local vectorization & heuristic intent extraction first,
   * coupled with resilient Gemini AI classification.
   */
  public async processMessage(
    text: string, 
    senderId: string, 
    contextHistory: { text: string; topicId?: string }[] = []
  ): Promise<SemanticAnalysis> {
    const cleanText = (text || '').trim();

    // 1. Run Spam Analysis
    const spamResult = DiscussionSpamFilter.analyzeSpam(senderId, cleanText);

    // 2. Generate Local Vector Embedding (64d)
    const fastVector = VectorUtils.generateFastTextVector(cleanText);

    // 3. Extract Local Heuristics
    const isQuestion = /\?|how|what|why|where|when|who|is there|can someone|help/i.test(cleanText);
    const isBug = /bug|error|crash|broken|fail|issue|not working|defect|exception/i.test(cleanText);
    const isFeature = /feature|request|add|should have|would be cool|suggestion|idea|can we have/i.test(cleanText);
    const isUrgent = /urgent|asap|critical|blocking|production|emergency|help me|pls/i.test(cleanText);

    let initialIntent: IntentCategory = 'discussion';
    if (isBug) initialIntent = 'bug_report';
    else if (isFeature) initialIntent = 'feature_request';
    else if (isQuestion) initialIntent = 'question';
    else if (cleanText.length < 15) initialIntent = 'casual';

    let initialEmotion: EmotionType = 'neutral';
    if (isUrgent) initialEmotion = 'urgent';
    else if (/frustrated|annoyed|terrible|hate|stuck/i.test(cleanText)) initialEmotion = 'frustrated';
    else if (/awesome|great|love|cool|nice|thanks|thank you|excited/i.test(cleanText)) initialEmotion = 'excited';

    const localKeywords = cleanText
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['this', 'that', 'with', 'from', 'have', 'what', 'there', 'some', 'about'].includes(w));

    // Default fast semantic analysis object
    const analysis: SemanticAnalysis = {
      intent: initialIntent,
      topic: this.inferLocalTopicName(cleanText),
      emotion: initialEmotion,
      urgency: isUrgent ? 0.85 : (isBug ? 0.6 : 0.2),
      questionProbability: isQuestion ? 0.9 : 0.15,
      contextRelationship: contextHistory.length > 0 ? 'continuation' : 'new_thread',
      conversationDepth: contextHistory.length,
      embeddingVector: fastVector,
      keywords: localKeywords,
      spamScore: spamResult.spamScore,
      isDuplicate: false,
      confidence: 0.8
    };

    // 4. Asynchronously invoke Gemini for deep LLM semantic refinement if text is substantial
    if (cleanText.length >= 8) {
      try {
        const recentContextSnippet = contextHistory.slice(-3).map(c => `"- ${c.text.substring(0, 80)}"`).join('\n');
        const prompt = `
          Analyze this group discussion message deeply for a real-time discussion intelligence engine.
          
          Message: "${cleanText}"
          Recent Group Context:
          ${recentContextSnippet || "None"}

          Return JSON matching EXACTLY this format:
          {
            "intent": "question" | "feature_request" | "bug_report" | "discussion" | "feedback" | "casual" | "announcement" | "help_wanted",
            "topic": "Short 2-4 word topic title (e.g. Audio Delay, Payment Issue, Bug Report, Feature Request)",
            "emotion": "positive" | "neutral" | "urgent" | "frustrated" | "constructive" | "excited" | "curious",
            "urgency": number between 0.0 and 1.0,
            "questionProbability": number between 0.0 and 1.0,
            "contextRelationship": "continuation" | "topic_shift" | "standalone" | "answer",
            "keywords": ["keyword1", "keyword2"]
          }
        `;

        const geminiRes = await callGeminiWithRetryAndFallback('gemini-3.5-flash', prompt, {
          temperature: 0.1,
          maxOutputTokens: 256
        });

        if (geminiRes && geminiRes.text) {
          const parsed = cleanAndParseJSON(geminiRes.text, null);
          if (parsed && parsed.intent) {
            analysis.intent = parsed.intent as IntentCategory;
            analysis.topic = parsed.topic || analysis.topic;
            analysis.emotion = parsed.emotion as EmotionType;
            analysis.urgency = typeof parsed.urgency === 'number' ? parsed.urgency : analysis.urgency;
            analysis.questionProbability = typeof parsed.questionProbability === 'number' ? parsed.questionProbability : analysis.questionProbability;
            analysis.contextRelationship = parsed.contextRelationship || analysis.contextRelationship;
            if (Array.isArray(parsed.keywords) && parsed.keywords.length > 0) {
              analysis.keywords = parsed.keywords;
            }
            analysis.confidence = 0.95;
          }
        }
      } catch (geminiErr) {
        // Fallback to local analysis smoothly
      }
    }

    return analysis;
  }

  private inferLocalTopicName(text: string): string {
    const clean = text.replace(/[^\w\s]/g, '').trim();
    if (clean.length === 0) return "General Discussion";

    const words = clean.split(/\s+/);
    if (words.length <= 3) {
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    const firstThree = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return firstThree;
  }
}

export const discussionSemanticProcessor = new DiscussionSemanticProcessor();
