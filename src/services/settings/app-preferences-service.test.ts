import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { AppPreferencesService } from './app-preferences-service';

describe('app preferences', () => {
  it('persists only known boolean settings', () => {
    const db = new DatabaseSync(':memory:');
    db.exec(`CREATE TABLE app_preferences(id INTEGER PRIMARY KEY, animations_enabled INTEGER, onboarding_completed INTEGER, launch_at_login INTEGER);
      INSERT INTO app_preferences VALUES(1, 1, 0, 0);`);
    const preferences = new AppPreferencesService(db);
    expect(preferences.get()).toEqual({
      animationsEnabled: true,
      onboardingCompleted: false,
      launchAtLogin: false,
    });
    expect(preferences.update({ animationsEnabled: false }).animationsEnabled).toBe(false);
    expect(() => preferences.update({ unknown: true })).toThrow();
    expect(() => preferences.update({ animationsEnabled: true, launchAtLogin: true })).toThrow();
    db.close();
  });
});
