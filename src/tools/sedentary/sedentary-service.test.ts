import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { SedentaryService } from './sedentary-service';

function service() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE sedentary_state(id INTEGER PRIMARY KEY, interval_minutes INTEGER, inactivity_reset_minutes INTEGER, quiet_start TEXT, quiet_end TEXT, last_activity_at INTEGER, active_since INTEGER, last_reminded_at INTEGER, snoozed_until INTEGER);
    INSERT INTO sedentary_state VALUES(1, 60, 5, NULL, NULL, NULL, NULL, NULL, NULL);`);
  return { db, sedentary: new SedentaryService(db) };
}

describe('sedentary reminders', () => {
  it('reminds once after continuous activity and resets after inactivity', () => {
    const { db, sedentary } = service();
    sedentary.configure({
      intervalMinutes: 60,
      inactivityResetMinutes: 60,
      quietStart: null,
      quietEnd: null,
    });
    sedentary.recordActivity(0);
    sedentary.recordActivity(59 * 60_000);
    expect(sedentary.checkDue(60 * 60_000)).toBe(true);
    expect(sedentary.checkDue(61 * 60_000)).toBe(false);
    sedentary.configure({
      intervalMinutes: 60,
      inactivityResetMinutes: 5,
      quietStart: null,
      quietEnd: null,
    });
    sedentary.recordActivity(70 * 60_000);
    expect(sedentary.get(70 * 60_000).continuousMinutes).toBe(0);
    db.close();
  });

  it('supports settings and snooze without forcing interruption', () => {
    const { db, sedentary } = service();
    sedentary.configure({
      intervalMinutes: 1,
      inactivityResetMinutes: 5,
      quietStart: null,
      quietEnd: null,
    });
    sedentary.recordActivity(0);
    sedentary.recordActivity(50_000);
    sedentary.snooze(5, 60_000);
    expect(sedentary.checkDue(120_000)).toBe(false);
    sedentary.recordActivity(5 * 60_000);
    expect(sedentary.checkDue(6 * 60_000)).toBe(true);
    db.close();
  });
});
