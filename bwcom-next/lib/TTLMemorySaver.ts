import { MemorySaver } from '@langchain/langgraph';
import type { RunnableConfig } from '@langchain/core/runnables';
import type {
  Checkpoint,
  CheckpointMetadata,
  CheckpointTuple,
  CheckpointListOptions,
  PendingWrite,
} from '@langchain/langgraph-checkpoint';

interface TTLMemorySaverOptions {
  /** Default TTL in milliseconds */
  defaultTTLMs: number;
  /** How often to sweep expired threads, in ms (default: 60_000) */
  sweepIntervalMs?: number;
  /** Whether to refresh TTL on reads (default: true) */
  refreshOnRead?: boolean;
}

/**
 * A MemorySaver subclass that automatically prunes threads
 * which have not been accessed within a configurable TTL window.
 */
export class TTLMemorySaver extends MemorySaver {
  private lastAccess: Map<string, number> = new Map();
  private defaultTTLMs: number;
  private refreshOnRead: boolean;
  private sweepInterval?: ReturnType<typeof setInterval>;

  constructor(options: TTLMemorySaverOptions) {
    super();
    this.defaultTTLMs = options.defaultTTLMs;
    this.refreshOnRead = options.refreshOnRead ?? true;

    const sweepMs = options.sweepIntervalMs ?? 60_000;
    this.sweepInterval = setInterval(() => {
      this.sweepExpired().catch((err) =>
        console.error('[TTLMemorySaver] sweep error:', err)
      );
    }, sweepMs);

    // Allow Node.js to exit even if the sweep interval is still running
    if (this.sweepInterval?.unref) {
      this.sweepInterval.unref();
    }
  }

  private touchThread(threadId: string): void {
    this.lastAccess.set(threadId, Date.now());
  }

  // --- Override every entry point to track access ---

  async getTuple(
    config: RunnableConfig
  ): Promise<CheckpointTuple | undefined> {
    const threadId = config.configurable?.thread_id;
    if (threadId && this.refreshOnRead) {
      this.touchThread(threadId);
    }
    return super.getTuple(config);
  }

  async *list(
    config: RunnableConfig,
    options?: CheckpointListOptions
  ): AsyncGenerator<CheckpointTuple> {
    const threadId = config.configurable?.thread_id;
    if (threadId && this.refreshOnRead) {
      this.touchThread(threadId);
    }
    yield* super.list(config, options);
  }

  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata
  ): Promise<RunnableConfig> {
    const threadId = config.configurable?.thread_id;
    if (threadId) this.touchThread(threadId);
    return super.put(config, checkpoint, metadata);
  }

  async putWrites(
    config: RunnableConfig,
    writes: PendingWrite[],
    taskId: string
  ): Promise<void> {
    const threadId = config.configurable?.thread_id;
    if (threadId) this.touchThread(threadId);
    return super.putWrites(config, writes, taskId);
  }

  // --- Sweep logic ---

  async sweepExpired(): Promise<string[]> {
    const now = Date.now();
    const expired: string[] = [];

    for (const [threadId, lastTime] of this.lastAccess) {
      if (now - lastTime > this.defaultTTLMs) {
        expired.push(threadId);
      }
    }

    for (const threadId of expired) {
      await this.deleteThread(threadId);
      this.lastAccess.delete(threadId);
    }

    if (expired.length > 0) {
      console.log(
        `[TTLMemorySaver] pruned ${expired.length} expired thread(s):`,
        expired
      );
    }

    return expired;
  }

  // Override deleteThread to also clean up tracking
  async deleteThread(threadId: string): Promise<void> {
    await super.deleteThread(threadId);
    this.lastAccess.delete(threadId);
  }

  /** Stop the background sweep timer */
  stop(): void {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = undefined;
    }
  }
}
