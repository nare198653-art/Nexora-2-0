/**
 * Discussion Lifecycle Manager
 * Automatically manages topic states: Growing -> Trending -> Stable -> Cooling -> Archived
 */

import { DiscussionTopicNode, TopicLifecycle } from './types.js';

export class LifecycleManager {

  /**
   * Evaluates and updates the lifecycle state of a topic node based on activity metrics.
   */
  public static updateLifecycleState(node: DiscussionTopicNode, now: number = Date.now()): TopicLifecycle {
    const ageMinutes = (now - node.createdAt) / (1000 * 60);
    const idleMinutes = (now - node.lastActivityAt) / (1000 * 60);
    const msgCount = node.messageIds.length + node.duplicateCount;
    const participants = node.metrics.activeParticipantsCount;
    const velocity = node.metrics.growthSpeed;

    let newState: TopicLifecycle = node.lifecycle;

    if (idleMinutes > 1440) { // 24 hours of total inactivity
      newState = 'Archived';
    } else if (idleMinutes > 180) { // 3 hours idle
      newState = 'Cooling';
    } else if (velocity > 1.5 || (participants >= 4 && msgCount >= 10 && idleMinutes < 30)) {
      newState = 'Trending';
    } else if (msgCount >= 5 || participants >= 2) {
      newState = 'Stable';
    } else {
      newState = 'Growing';
    }

    if (node.lifecycle !== newState) {
      node.lifecycle = newState;
      node.updatedAt = now;
    }

    return newState;
  }
}
