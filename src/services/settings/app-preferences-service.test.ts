import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { AppPreferencesService } from './app-preferences-service';

describe('app preferences', () => {
  it('persists known experience settings', () => {
    const db = new DatabaseSync(':memory:');
    db.exec(`CREATE TABLE app_preferences(id INTEGER PRIMARY KEY, animations_enabled INTEGER, onboarding_completed INTEGER, launch_at_login INTEGER, pet_scale INTEGER, edge_snap_enabled INTEGER, input_reactions_enabled INTEGER);
      INSERT INTO app_preferences VALUES(1, 1, 0, 0, 100, 1, 1);`);
    const preferences = new AppPreferencesService(db);
    expect(preferences.get()).toEqual({
      animationsEnabled: true,
      onboardingCompleted: false,
      launchAtLogin: false,
      petScale: 100,
      edgeSnapEnabled: true,
      inputReactionsEnabled: true,
    });
    expect(preferences.update({ animationsEnabled: false }).animationsEnabled).toBe(false);
    expect(preferences.update({ petScale: 75 }).petScale).toBe(75);
    expect(() => preferences.update({ petScale: 80 })).toThrow();
    expect(() => preferences.update({ unknown: true })).toThrow();
    expect(() => preferences.update({ animationsEnabled: true, launchAtLogin: true })).toThrow();
    db.close();
  });
});
