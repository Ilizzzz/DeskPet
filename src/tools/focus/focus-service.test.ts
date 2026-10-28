import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { FocusService } from './focus-service';
describe('focus timer', () => {
  it('uses deadlines, preserves pause, and records completion once', () => {
    const db = new DatabaseSync(':memory:');
    db.exec(`CREATE TABLE focus_timer (id INTEGER PRIMARY KEY, status TEXT, kind TEXT, duration_ms INTEGER, remaining_ms INTEGER, deadline INTEGER, completed_sessions INTEGER, focus_ms INTEGER); INSERT INTO focus_timer VALUES(1, 'idle', 'focus', 0, 0, NULL, 0, 0);
      CREATE TABLE focus_sessions(id INTEGER PRIMARY KEY, date TEXT, duration_ms INTEGER, completed_at INTEGER);
      CREATE TABLE focus_preferences(id INTEGER PRIMARY KEY, sound_enabled INTEGER); INSERT INTO focus_preferences VALUES(1, 1);`);
    const timer = new FocusService(db);
    timer.start('focus', 1, 0);
    expect(timer.get(10000).remainingMs).toBe(50000);
    timer.pause(10000);
    expect(timer.get(30000).remainingMs).toBe(50000);
    timer.resume(30000);
    expect(timer.completeIfDue(79999)).toBe(false);
    expect(timer.completeIfDue(80000)).toBe(true);
    expect(timer.completeIfDue(90000)).toBe(false);
    expect(new FocusService(db).get(90000)).toMatchObject({
      status: 'completed',
      completedSessions: 1,
      focusMinutes: 1,
      todayFocusMinutes: 1,
    });
    expect(timer.setSoundEnabled(false, 90000).soundEnabled).toBe(false);
    expect(() => timer.start('focus', -1)).toThrow();
    db.close();
  });
});
