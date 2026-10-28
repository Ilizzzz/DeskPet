export interface SedentarySnapshot {
  intervalMinutes: number;
  inactivityResetMinutes: number;
  quietStart: string | null;
  quietEnd: string | null;
  continuousMinutes: number;
  nextReminderAt: number | null;
  snoozedUntil: number | null;
}

export interface SedentarySettings {
  intervalMinutes: number;
  inactivityResetMinutes: number;
  quietStart: string | null;
  quietEnd: string | null;
}
