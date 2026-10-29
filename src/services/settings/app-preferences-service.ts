import type { DatabaseSync } from 'node:sqlite';
import type { AppPreferenceChange, PersistedAppPreferences } from '../../shared/types/settings';

type PreferenceRow = {
  animations_enabled: number;
  onboarding_completed: number;
  launch_at_login: number;
  pet_scale: number;
  edge_snap_enabled: number;
  input_reactions_enabled: number;
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
      petScale: row.pet_scale as 25 | 50 | 75 | 100 | 125,
      edgeSnapEnabled: row.edge_snap_enabled === 1,
      inputReactionsEnabled: row.input_reactions_enabled === 1,
    };
  }

  update(value: unknown): PersistedAppPreferences {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('无效应用设置');
    const change = value as Partial<AppPreferenceChange>;
    const keys = Object.keys(change);
    if (
      keys.length !== 1 ||
      ![
        'animationsEnabled',
        'onboardingCompleted',
        'launchAtLogin',
        'petScale',
        'edgeSnapEnabled',
        'inputReactionsEnabled',
      ].includes(keys[0])
    )
      throw new Error('无效应用设置');
    const rawValue = (change as Record<string, unknown>)[keys[0]];
    if (keys[0] === 'petScale') {
      if (![25, 50, 75, 100, 125].includes(rawValue as number)) throw new Error('无效宠物缩放');
    } else if (typeof rawValue !== 'boolean') throw new Error('无效应用设置');
    const column = {
      animationsEnabled: 'animations_enabled',
      onboardingCompleted: 'onboarding_completed',
      launchAtLogin: 'launch_at_login',
      petScale: 'pet_scale',
      edgeSnapEnabled: 'edge_snap_enabled',
      inputReactionsEnabled: 'input_reactions_enabled',
    }[keys[0]];
    this.db
      .prepare(`UPDATE app_preferences SET ${column} = ? WHERE id = 1`)
      .run(typeof rawValue === 'boolean' ? (rawValue ? 1 : 0) : (rawValue as number));
    return this.get();
  }
}
