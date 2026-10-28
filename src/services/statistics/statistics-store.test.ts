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
      expect(snapshot.today).toMatchObject({
        date: '2026-01-02',
        keyboardCount: 0,
        mouseCount: 1,
      });
      expect(snapshot.total).toMatchObject({ keyboardCount: 1, mouseCount: 1 });
      expect(snapshot.days).toHaveLength(30);
      store.clear();
      expect(store.all()).toEqual([]);
      store.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it('resets user content without rebuilding the database', () => {
    const store = new StatisticsStore(':memory:');
    store.add({
      date: '2026-01-02',
      keyboardCount: 2500,
      mouseCount: 0,
      activeSeconds: 60,
    });
    store.notes.create();
    store.preferences.update({ animationsEnabled: false });
    store.resetUserData();
    expect(store.snapshot(new Date(2026, 0, 2))).toMatchObject({
      growth: { level: 1, totalExperience: 0 },
      total: { keyboardCount: 0, mouseCount: 0 },
    });
    expect(store.notes.all()).toEqual([]);
    expect(store.appearance.get()).toMatchObject({
      character: 'cat',
      scene: 'transparent',
      balance: 0,
      inventory: [],
    });
    expect(store.preferences.get()).toEqual({
      animationsEnabled: true,
      onboardingCompleted: false,
      launchAtLogin: false,
    });
    store.close();
  });
});
