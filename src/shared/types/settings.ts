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
  };
}

export type AppPreferenceChange =
  { animationsEnabled: boolean } | { onboardingCompleted: boolean } | { launchAtLogin: boolean };
