import type { DatabaseSync } from 'node:sqlite';
import type { AppPreferenceChange, PersistedAppPreferences } from '../../shared/types/settings';

type PreferenceRow = {
  animations_enabled: number;
  onboarding_completed: number;
  launch_at_login: number;
};

export class AppPreferencesService {
  constructor(private readonly db: DatabaseSync) {}

  get(): PersistedAppPreferences {
    const row = this.db.prepare('SELECT * FROM app_preferences WHERE id = 1').get() as
      PreferenceRow | undefined;
    if (!row) throw new Error('应用设置不存在');
    return {
      animationsEnabled: row.animations_enabled === 1,
      onboardingCompleted: row.onboarding_completed === 1,
      launchAtLogin: row.launch_at_login === 1,
    };
  }

  update(value: unknown): PersistedAppPreferences {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('无效应用设置');
    const change = value as Partial<AppPreferenceChange>;
    const keys = Object.keys(change);
    if (
      keys.length !== 1 ||
      !['animationsEnabled', 'onboardingCompleted', 'launchAtLogin'].includes(keys[0]) ||
      typeof (change as Record<string, unknown>)[keys[0]] !== 'boolean'
    )
      throw new Error('无效应用设置');
    const column = {
      animationsEnabled: 'animations_enabled',
      onboardingCompleted: 'onboarding_completed',
      launchAtLogin: 'launch_at_login',
    }[keys[0]];
    this.db
      .prepare(`UPDATE app_preferences SET ${column} = ? WHERE id = 1`)
      .run((change as Record<string, boolean>)[keys[0]] ? 1 : 0);
    return this.get();
  }
}
