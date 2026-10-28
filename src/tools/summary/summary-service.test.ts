import { describe, expect, it } from 'vitest';
import { StatisticsStore } from '../../services/statistics/statistics-store';
import { localDate } from '../../shared/types/statistics';

describe('daily summary', () => {
  it('combines input, growth, focus and rewards for the local day', () => {
    const store = new StatisticsStore(':memory:');
    const now = 60_000;
    const date = localDate(new Date(now));
    store.add({
      date: localDate(new Date(now - 86_400_000)),
      keyboardCount: 2500,
      mouseCount: 0,
      activeSeconds: 60,
    });
    store.add({
      date,
      keyboardCount: 5000,
      mouseCount: 0,
      activeSeconds: 120,
    });
    store.focus.start('focus', 1, 0);
    store.completeFocusIfDue(now);
    expect(store.summary.get(new Date(now))).toMatchObject({
      date,
      keyboardCount: 5000,
      activeMinutes: 2,
      experience: 210,
      level: 3,
      focusMinutes: 1,
      rewards: ['currency_50'],
    });
    store.close();
  });
});
