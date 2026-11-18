/**
 * Enterprise AI Discussion Intelligence Engine Types
 * Nexora Signal Groups System
 */

export type TopicLifecycle = 'Growing' | 'Trending' | 'Stable' | 'Cooling' | 'Archived';

export type IntentCategory = 
  | 'question' 
  | 'feature_request' 
  | 'bug_report' 
  | 'discussion' 
  | 'feedback' 
  | 'casual' 
  | 'announcement'
  | 'help_wanted';

export type EmotionType = 
  | 'positive' 
  | 'neutral' 
  | 'urgent' 
  | 'frustrated' 
  | 'constructive' 
  | 'excited' 
  | 'curious';

export interface SemanticAnalysis {
  intent: IntentCategory;
  topic: string;
  emotion: EmotionType;
  urgency: number; // 0.0 - 1.0
  questionProbability: number; // 0.0 - 1.0
  similarityScore?: number; // 0.0 - 1.0
  contextRelationship: string;
  conversationDepth: number;
  embeddingVector: number[];
  keywords: string[];
  spamScore: number; // 0.0 - 1.0
  isDuplicate: boolean;
  masterTopicId?: string;
  confidence: number;
}

export interface DuplicateMessageRef {
  messageId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  confidence: number;
}

export interface DiscussionTopicNode {
  id: string;
  chatId: string;
  title: string;
  category: IntentCategory;
  semanticVector: number[];
  masterTopicId?: string; // If merged into another topic
  messageIds: string[];
  participantIds: string[];
  adminParticipantIds: string[];
  creatorParticipantIds: string[];
  duplicateCount: number;
  duplicateMessages: DuplicateMessageRef[];
  parentTopicId?: string;
  childTopicIds: string[];
  lifecycle: TopicLifecycle;
  rankingScore: number;
  popularityPrediction: {
    predictedScore: number;
    isEmerging: boolean;
    confidence: number;
    trendReason: string;
  };
  aiConfidence: number;
  summary: string;
  contextMemory: {
    keyInsights: string[];
    unresolvedQuestions: string[];
    recentContext: string;
    lastUpdated: number;
  };
  metrics: {
    activeParticipantsCount: number;
    growthSpeed: number; // messages per minute in rolling window
    messageFrequency: number;
    recencyScore: number;
    urgencyScore: number;
    adminParticipationWeight: number;
    creatorParticipationWeight: number;
    engagementVelocity: number;
    replyDensity: number;
    semanticImportance: number;
    spamInfluenceFactor: number; // 0.1 to 1.0 multiplier
  };
  createdAt: number;
  updatedAt: number;
  lastActivityAt: number;
}

export interface DiscussionGraph {
  chatId: string;
  topics: Record<string, DiscussionTopicNode>;
  topicEdgeWeights: Record<string, number>; // "topicA_topicB" => similarity weight
  totalMessagesProcessed: number;
  totalDuplicatesCompressed: number;
  lastGraphUpdate: number;
}

export interface SpamAnalysisResult {
  isSpam: boolean;
  spamScore: number; // 0.0 - 1.0
  reasons: string[];
  rankingFactor: number; // 0.1 - 1.0 (downweights spam)
}

export interface SemanticSearchResult {
  topic: DiscussionTopicNode;
  relevanceScore: number;
  matchedMessages: any[];
  matchedKeywords: string[];
}

export interface PopularityPredictionResult {
  topicId: string;
  currentRank: number;
  predictedRank: number;
  growthAcceleration: number;
  isEmerging: boolean;
  confidence: number;
  reason: string;
}

// Modular Future-Ready Plugin Interface
export interface DiscussionPlugin {
  name: string;
  version: string;
  enabled: boolean;
  processMessage?: (message: any, analysis: SemanticAnalysis, topicNode?: DiscussionTopicNode) => Promise<Partial<SemanticAnalysis> | void>;
  processTopic?: (topicNode: DiscussionTopicNode) => Promise<Partial<DiscussionTopicNode> | void>;
}
