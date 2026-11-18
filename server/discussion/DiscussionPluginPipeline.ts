/**
 * Future Ready Plug-and-Play Plugin Pipeline
 * Enables seamless integration of multilingual understanding, voice, image/video analysis,
 * AI summaries, moderation, and recommendations.
 */

import { DiscussionPlugin, SemanticAnalysis, DiscussionTopicNode } from './types.js';

export class DiscussionPluginPipeline {
  private plugins: Map<string, DiscussionPlugin> = new Map();

  constructor() {
    // Register Default Core Plugins
    this.registerPlugin({
      name: 'MultilingualPlugin',
      version: '1.0.0',
      enabled: true,
      processMessage: async (msg, analysis) => {
        // Detects non-English scripts and attaches language hint
        if (msg.text && /[\u0600-\u06FF\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FFF]/.test(msg.text)) {
          analysis.contextRelationship = `${analysis.contextRelationship}_multilingual`;
        }
      }
    });

    this.registerPlugin({
      name: 'AIModerationPlugin',
      version: '1.0.0',
      enabled: true,
      processMessage: async (msg, analysis) => {
        // Auto-flag severe toxicity
        if (/hate|threat|attack|kill/i.test(msg.text || '')) {
          analysis.spamScore = Math.max(analysis.spamScore, 0.8);
        }
      }
    });

    this.registerPlugin({
      name: 'AISummaryPlugin',
      version: '1.0.0',
      enabled: true,
      processTopic: async (topicNode) => {
        if (!topicNode.summary) {
          topicNode.summary = `Discussion on ${topicNode.title} with ${topicNode.participantIds.length} active members.`;
        }
      }
    });

    this.registerPlugin({
      name: 'MediaUnderstandingPlugin',
      version: '1.0.0',
      enabled: true,
      processMessage: async (msg, analysis) => {
        if (msg.image) {
          analysis.keywords.push('image_attachment', 'visual_media');
        }
      }
    });

    this.registerPlugin({
      name: 'VoiceDiscussionPlugin',
      version: '1.0.0',
      enabled: true,
      processMessage: async (msg, analysis) => {
        if (msg.audioUrl || msg.isVoiceNote) {
          analysis.keywords.push('voice_note', 'audio_transmission');
        }
      }
    });

    this.registerPlugin({
      name: 'AIRecommendationPlugin',
      version: '1.0.0',
      enabled: true,
      processTopic: async (topicNode) => {
        if (topicNode.category === 'question' && topicNode.duplicateCount > 2) {
          topicNode.contextMemory.keyInsights.push('High frequency FAQ topic - recommend pinning solution.');
        }
      }
    });
  }

  public registerPlugin(plugin: DiscussionPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  public unregisterPlugin(pluginName: string): boolean {
    return this.plugins.delete(pluginName);
  }

  public async runMessagePipeline(message: any, analysis: SemanticAnalysis, topicNode?: DiscussionTopicNode): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled && plugin.processMessage) {
        try {
          await plugin.processMessage(message, analysis, topicNode);
        } catch (err) {
          console.warn(`[DiscussionPluginPipeline] Error in plugin ${plugin.name}:`, err);
        }
      }
    }
  }

  public async runTopicPipeline(topicNode: DiscussionTopicNode): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled && plugin.processTopic) {
        try {
          await plugin.processTopic(topicNode);
        } catch (err) {
          console.warn(`[DiscussionPluginPipeline] Error in topic plugin ${plugin.name}:`, err);
        }
      }
    }
  }
}

export const discussionPluginPipeline = new DiscussionPluginPipeline();
