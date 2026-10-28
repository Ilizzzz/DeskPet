export type FocusStatus = 'idle' | 'running' | 'paused' | 'completed';
export interface FocusSnapshot {
  status: FocusStatus;
  kind: 'focus' | 'break';
  durationMs: number;
  remainingMs: number;
  completedSessions: number;
  focusMinutes: number;
  todayFocusMinutes: number;
  soundEnabled: boolean;
}
