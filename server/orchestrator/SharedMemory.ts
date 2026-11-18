/**
 * Nexora Master AI Orchestrator - Shared Memory Layer
 * Centralized, structured, cross-algorithm memory state engine with persistence
 */

import fs from 'fs';
import path from 'path';
import { SharedMemoryBlock } from './types';

const STORAGE_PATH = path.join(process.cwd(), 'shared_memory_store.json');

export class SharedMemory {
  private memoryStore: Map<string, SharedMemoryBlock> = new Map();
  private isSaving: boolean = false;

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(STORAGE_PATH)) {
        const raw = fs.readFileSync(STORAGE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const block of Object.values(parsed) as SharedMemoryBlock[]) {
          if (!block.ttlMs || Date.now() < (block.updatedAt + block.ttlMs)) {
            this.memoryStore.set(`${block.userId}:${block.namespace}:${block.key}`, block);
          }
        }
        console.log(`[SharedMemory] Successfully loaded ${this.memoryStore.size} active shared memory blocks.`);
      }
    } catch (err) {
      console.error('[SharedMemory] Error loading disk memory store:', err);
    }
  }

  private async saveToDisk() {
    if (this.isSaving) return;
    this.isSaving = true;
    try {
      const obj: Record<string, SharedMemoryBlock> = {};
      for (const [k, v] of this.memoryStore.entries()) {
        obj[k] = v;
      }
      await fs.promises.writeFile(STORAGE_PATH, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.error('[SharedMemory] Error saving disk memory store:', err);
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Set or update a shared memory value
   */
  public set(
    userId: string,
    namespace: string,
    key: string,
    data: any,
    updatedByAlgorithm: string,
    ttlMs?: number
  ): SharedMemoryBlock {
    const fullKey = `${userId}:${namespace}:${key}`;
    const existing = this.memoryStore.get(fullKey);

    const block: SharedMemoryBlock = {
      key,
      userId,
      namespace,
      data,
      updatedByAlgorithm,
      updatedAt: Date.now(),
      ttlMs,
      version: existing ? existing.version + 1 : 1
    };

    this.memoryStore.set(fullKey, block);
    this.saveToDisk();
    return block;
  }

  /**
   * Get a shared memory value
   */
  public get<T = any>(userId: string, namespace: string, key: string): T | null {
    const fullKey = `${userId}:${namespace}:${key}`;
    const block = this.memoryStore.get(fullKey);

    if (!block) return null;

    if (block.ttlMs && Date.now() > block.updatedAt + block.ttlMs) {
      this.memoryStore.delete(fullKey);
      this.saveToDisk();
      return null;
    }

    return block.data as T;
  }

  /**
   * Query all memory blocks in a specific namespace for a user
   */
  public getNamespace(userId: string, namespace: string): Record<string, any> {
    const result: Record<string, any> = {};
    const prefix = `${userId}:${namespace}:`;

    for (const [k, block] of this.memoryStore.entries()) {
      if (k.startsWith(prefix)) {
        if (!block.ttlMs || Date.now() <= block.updatedAt + block.ttlMs) {
          result[block.key] = block.data;
        }
      }
    }

    return result;
  }

  /**
   * Delete a memory block
   */
  public delete(userId: string, namespace: string, key: string): boolean {
    const fullKey = `${userId}:${namespace}:${key}`;
    const existed = this.memoryStore.delete(fullKey);
    if (existed) {
      this.saveToDisk();
    }
    return existed;
  }

  /**
   * Return entire user memory object across all namespaces
   */
  public getUserMemorySummary(userId: string): Record<string, Record<string, any>> {
    const summary: Record<string, Record<string, any>> = {};
    const prefix = `${userId}:`;

    for (const [k, block] of this.memoryStore.entries()) {
      if (k.startsWith(prefix)) {
        if (!block.ttlMs || Date.now() <= block.updatedAt + block.ttlMs) {
          if (!summary[block.namespace]) {
            summary[block.namespace] = {};
          }
          summary[block.namespace][block.key] = {
            data: block.data,
            updatedByAlgorithm: block.updatedByAlgorithm,
            updatedAt: block.updatedAt,
            version: block.version
          };
        }
      }
    }

    return summary;
  }
}
