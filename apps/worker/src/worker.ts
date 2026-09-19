import { setTimeout } from 'node:timers/promises';
import type { HealthDependency } from '@hairmate/server/composition';

export async function runWorker(database: HealthDependency, intervalMs: number, signal: AbortSignal, report: (operation: 'ready' | 'stopped') => void) {
  try {
    if (signal.aborted) return;
    if (!await database.check()) throw new Error('Worker dependency unavailable.');
    report('ready');
    // No job handlers exist in this slice. Never acknowledge or manufacture work.
    while (!signal.aborted) {
      try { await setTimeout(intervalMs, undefined, { signal }); }
      catch (error) { if (signal.aborted) break; throw error; }
      if (!signal.aborted && !await database.check()) throw new Error('Worker dependency unavailable.');
    }
  } finally {
    await database.close();
    report('stopped');
  }
}
