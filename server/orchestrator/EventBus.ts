/**
 * Nexora Master AI Orchestrator - Event Bus
 * Internal, thread-safe, loop-protected pub/sub event bus for backend algorithms
 */

import { OrchestratorEvent, EventCallback, SafetyConfig } from './types';

export class EventBus {
  private subscribers: Map<string, Set<{ id: string; callback: EventCallback }>> = new Map();
  private wildcardSubscribers: Set<{ id: string; callback: EventCallback }> = new Set();
  private recentEventKeys: Map<string, number> = new Map(); // Idempotency deduplication
  private callDepth: number = 0;
  private config: SafetyConfig;
  private eventCountInWindow: number = 0;
  private windowStartTime: number = Date.now();

  constructor(config?: Partial<SafetyConfig>) {
    this.config = {
      maxCallDepth: config?.maxCallDepth ?? 5,
      maxEventsPerWindow: config?.maxEventsPerWindow ?? 200,
      rateWindowMs: config?.rateWindowMs ?? 1000,
      deduplicationWindowMs: config?.deduplicationWindowMs ?? 1000,
      reentrancyGuardMs: config?.reentrancyGuardMs ?? 50
    };
  }

  /**
   * Subscribe an algorithm callback to a specific event type or "*" wildcard
   */
  public subscribe(eventType: string, subscriberId: string, callback: EventCallback): void {
    if (eventType === '*') {
      this.wildcardSubscribers.add({ id: subscriberId, callback });
      return;
    }

    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add({ id: subscriberId, callback });
  }

  /**
   * Unsubscribe a subscriber from a specific event type or all events
   */
  public unsubscribe(subscriberId: string, eventType?: string): void {
    if (eventType === '*') {
      this.wildcardSubscribers = new Set(Array.from(this.wildcardSubscribers).filter(s => s.id !== subscriberId));
      return;
    }

    if (eventType) {
      const set = this.subscribers.get(eventType);
      if (set) {
        this.subscribers.set(eventType, new Set(Array.from(set).filter(s => s.id !== subscriberId)));
      }
    } else {
      // Unsubscribe from all
      for (const [key, set] of this.subscribers.entries()) {
        this.subscribers.set(key, new Set(Array.from(set).filter(s => s.id !== subscriberId)));
      }
      this.wildcardSubscribers = new Set(Array.from(this.wildcardSubscribers).filter(s => s.id !== subscriberId));
    }
  }

  /**
   * Publish an event asynchronously with loop protection and deduplication
   */
  public async publish(event: OrchestratorEvent): Promise<boolean> {
    const now = Date.now();

    // 1. Rate limiting check
    if (now - this.windowStartTime > this.config.rateWindowMs) {
      this.windowStartTime = now;
      this.eventCountInWindow = 0;
    }
    this.eventCountInWindow++;
    if (this.eventCountInWindow > this.config.maxEventsPerWindow) {
      console.warn(`[EventBus] Rate limit exceeded (${this.config.maxEventsPerWindow} events/s). Dropping event: ${event.type}`);
      return false;
    }

    // 2. Loop protection - Call depth guard
    if (this.callDepth >= this.config.maxCallDepth) {
      console.error(`[EventBus] CRITICAL: Maximum event recursion depth reached (${this.callDepth}). Infinite loop prevented for event: ${event.type}`);
      return false;
    }

    // 3. Idempotency / Deduplication check
    const dedupKey = event.idempotencyKey || `${event.userId}:${event.type}:${JSON.stringify(event.payload)}`;
    const lastSeen = this.recentEventKeys.get(dedupKey);
    if (lastSeen && (now - lastSeen) < this.config.deduplicationWindowMs) {
      // Duplicate event suppressed
      return false;
    }
    this.recentEventKeys.set(dedupKey, now);

    // Clean old keys periodically
    if (this.recentEventKeys.size > 1000) {
      for (const [k, v] of this.recentEventKeys.entries()) {
        if (now - v > this.config.deduplicationWindowMs * 2) {
          this.recentEventKeys.delete(k);
        }
      }
    }

    // 4. Dispatch to subscribers
    this.callDepth++;
    try {
      const typeSubscribers = this.subscribers.get(event.type) || new Set();
      const allSubscribers = [...Array.from(typeSubscribers), ...Array.from(this.wildcardSubscribers)];

      const promises = allSubscribers.map(sub => {
        return Promise.resolve().then(() => sub.callback(event)).catch(err => {
          console.error(`[EventBus] Error in subscriber '${sub.id}' processing event '${event.type}':`, err);
        });
      });

      await Promise.all(promises);
      return true;
    } finally {
      this.callDepth--;
    }
  }

  public getSubscriberCount(eventType?: string): number {
    if (eventType) {
      return (this.subscribers.get(eventType)?.size || 0) + this.wildcardSubscribers.size;
    }
    let total = this.wildcardSubscribers.size;
    for (const set of this.subscribers.values()) {
      total += set.size;
    }
    return total;
  }
}
