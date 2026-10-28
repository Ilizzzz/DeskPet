export interface PersistedAppPreferences {
  animationsEnabled: boolean;
  onboardingCompleted: boolean;
  launchAtLogin: boolean;
}

export interface AppSettingsSnapshot extends PersistedAppPreferences {
  appVersion: string;
  canLaunchAtLogin: boolean;
  inputTracking: {
    consentGiven: boolean;
    enabled: boolean;
    running: boolean;
    /** 最近一次启动监听失败的原因；成功启动后清空。 */
    error: string | null;
  };
}

export type AppPreferenceChange =
  { animationsEnabled: boolean } | { onboardingCompleted: boolean } | { launchAtLogin: boolean };
