import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StatisticsStore } from './statistics-store';
import { InputCounter } from '../input-monitor/input-counter';

describe('statistics persistence', () => {
  it('keeps separate days across midnight and restores totals after reopening', () => {
    const directory = mkdtempSync(join(tmpdir(), 'deskpet-stats-'));
    try {
      const file = join(directory, 'stats.sqlite');
      const counter = new InputCounter();
      counter.keyDown(1, new Date(2026, 0, 1, 23, 59, 59).getTime());
      counter.mouseDown(new Date(2026, 0, 2, 0, 0, 1).getTime());
      let store = new StatisticsStore(file);
      for (const day of counter.flushDays().days) store.add(day);
      store.close();
      store = new StatisticsStore(file);
      const snapshot = store.snapshot(new Date(2026, 0, 2));
      expect(snapshot.today).toEqual({ date: '2026-01-02', keyboardCount: 0, mouseCount: 1 });
      expect(snapshot.total).toEqual({ keyboardCount: 1, mouseCount: 1 });
      expect(snapshot.days).toHaveLength(30);
      store.clear();
      expect(store.all()).toEqual([]);
      store.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
