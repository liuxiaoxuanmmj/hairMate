import { expect, test, vi } from 'vitest';
import { runWorker } from '../../apps/worker/src/worker.js';

test('worker closes on cancellation and cannot report invented task success', async () => {
  const controller = new AbortController();
  const database = { check: vi.fn().mockResolvedValue(true), close: vi.fn().mockResolvedValue(undefined) };
  const operations: string[] = [];
  await runWorker(database, 100, controller.signal, (operation) => { operations.push(operation); if (operation === 'ready') controller.abort(); });
  expect(operations).toEqual(['ready', 'stopped']);
  expect(database.check).toHaveBeenCalledTimes(1);
  expect(database.close).toHaveBeenCalledTimes(1);
});

test('worker dependency failure still closes resources', async () => {
  const database = { check: vi.fn().mockResolvedValue(false), close: vi.fn().mockResolvedValue(undefined) };
  const report = vi.fn();
  await expect(runWorker(database, 100, new AbortController().signal, report)).rejects.toThrow('Worker dependency unavailable');
  expect(report).not.toHaveBeenCalledWith('ready');
  expect(database.close).toHaveBeenCalledTimes(1);
});

test('already aborted worker does no work', async () => {
  const database = { check: vi.fn(), close: vi.fn().mockResolvedValue(undefined) };
  await runWorker(database, 100, AbortSignal.abort(), vi.fn());
  expect(database.check).not.toHaveBeenCalled();
  expect(database.close).toHaveBeenCalledTimes(1);
});

test('dependency failure after startup terminates the idle loop and closes the connection', async () => {
  const database = { check: vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false), close: vi.fn().mockResolvedValue(undefined) };
  const reports: string[] = [];
  await expect(runWorker(database, 1, new AbortController().signal, (operation) => reports.push(operation))).rejects.toThrow('Worker dependency unavailable');
  expect(reports).toEqual(['ready', 'stopped']);
  expect(database.close).toHaveBeenCalledTimes(1);
});
