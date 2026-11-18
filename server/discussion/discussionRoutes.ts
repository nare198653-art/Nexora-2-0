/**
 * REST API Routes for Nexora Signal Groups AI Discussion Intelligence Engine
 */

import { Router, Request, Response } from 'express';
import { discussionIntelligenceEngine } from './DiscussionIntelligenceEngine.js';
import { DiscussionTopicGraph } from './DiscussionTopicGraph.js';
import { TopicMergeSplitEngine } from './TopicMergeSplitEngine.js';
import { PopularityPredictor } from './PopularityPredictor.js';

const router = Router();

// 1. GET Ranked AI Topics for a Group Chat
router.get('/topics', async (req: Request, res: Response) => {
  try {
    const chatId = (req.query.chatId as string) || 'group-default';
    const topics = discussionIntelligenceEngine.getRankedTopics(chatId);
    res.json({ success: true, chatId, count: topics.length, topics });
  } catch (error: any) {
    console.error('Error fetching discussion topics:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. GET Complete AI Topic Graph for a Group Chat
router.get('/graph', async (req: Request, res: Response) => {
  try {
    const chatId = (req.query.chatId as string) || 'group-default';
    const graph = DiscussionTopicGraph.getGraphForChat(chatId);
    const rankedTopics = DiscussionTopicGraph.getRankedTopicsForChat(chatId);
    
    res.json({
      success: true,
      chatId,
      totalMessagesProcessed: graph.totalMessagesProcessed,
      totalDuplicatesCompressed: graph.totalDuplicatesCompressed,
      topicCount: rankedTopics.length,
      topics: rankedTopics,
      lastGraphUpdate: graph.lastGraphUpdate
    });
  } catch (error: any) {
    console.error('Error fetching discussion graph:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. POST Semantic Search Across Discussions
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { chatId, query, messagesMap } = req.body;
    if (!chatId || !query) {
      return res.status(400).json({ error: 'Missing chatId or query parameter' });
    }

    const searchResults = discussionIntelligenceEngine.searchDiscussions(chatId, query, messagesMap || {});
    res.json({ success: true, chatId, query, count: searchResults.length, results: searchResults });
  } catch (error: any) {
    console.error('Error searching discussions:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. GET Popularity Predictions for Emerging Topics
router.get('/predict', async (req: Request, res: Response) => {
  try {
    const chatId = (req.query.chatId as string) || 'group-default';
    const topics = DiscussionTopicGraph.getRankedTopicsForChat(chatId);
    
    const predictions = topics.map(topic => PopularityPredictor.predictPopularity(topic));
    const emerging = predictions.filter(p => p.isEmerging);

    res.json({
      success: true,
      chatId,
      totalTopics: topics.length,
      emergingCount: emerging.length,
      emergingTopics: emerging,
      allPredictions: predictions
    });
  } catch (error: any) {
    console.error('Error predicting popularity:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. POST Merge Two Discussion Topics
router.post('/merge', async (req: Request, res: Response) => {
  try {
    const { chatId, sourceTopicId, targetTopicId, reason } = req.body;
    if (!chatId || !sourceTopicId || !targetTopicId) {
      return res.status(400).json({ error: 'Missing chatId, sourceTopicId, or targetTopicId' });
    }

    const graph = DiscussionTopicGraph.getGraphForChat(chatId);
    const mergedNode = TopicMergeSplitEngine.mergeTopics(graph, sourceTopicId, targetTopicId, reason);

    if (!mergedNode) {
      return res.status(404).json({ error: 'Failed to merge topics. Topic nodes not found.' });
    }

    res.json({ success: true, chatId, mergedTopic: mergedNode });
  } catch (error: any) {
    console.error('Error merging topics:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. POST Split Discussion Topic
router.post('/split', async (req: Request, res: Response) => {
  try {
    const { chatId, topicId } = req.body;
    if (!chatId || !topicId) {
      return res.status(400).json({ error: 'Missing chatId or topicId' });
    }

    const graph = DiscussionTopicGraph.getGraphForChat(chatId);
    const childNode = TopicMergeSplitEngine.checkForTopicSplit(graph, topicId);

    if (!childNode) {
      return res.status(400).json({ error: 'Topic node cannot be split or sufficient divergence not detected.' });
    }

    res.json({ success: true, chatId, parentTopicId: topicId, newChildTopic: childNode });
  } catch (error: any) {
    console.error('Error splitting topic:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7. GET Discussion Intelligence Analytics
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const chatId = (req.query.chatId as string) || 'group-default';
    const graph = DiscussionTopicGraph.getGraphForChat(chatId);
    const topics = DiscussionTopicGraph.getRankedTopicsForChat(chatId);

    const analytics = {
      chatId,
      totalMessagesProcessed: graph.totalMessagesProcessed,
      totalDuplicatesCompressed: graph.totalDuplicatesCompressed,
      compressionRatio: graph.totalMessagesProcessed > 0 
        ? Number(((graph.totalDuplicatesCompressed / graph.totalMessagesProcessed) * 100).toFixed(1)) 
        : 0,
      activeTopicCount: topics.length,
      topicsByLifecycle: {
        Growing: topics.filter(t => t.lifecycle === 'Growing').length,
        Trending: topics.filter(t => t.lifecycle === 'Trending').length,
        Stable: topics.filter(t => t.lifecycle === 'Stable').length,
        Cooling: topics.filter(t => t.lifecycle === 'Cooling').length,
        Archived: topics.filter(t => t.lifecycle === 'Archived').length
      },
      topCategory: topics.length > 0 ? topics[0].category : 'discussion',
      lastUpdate: graph.lastGraphUpdate
    };

    res.json({ success: true, analytics });
  } catch (error: any) {
    console.error('Error fetching discussion analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
