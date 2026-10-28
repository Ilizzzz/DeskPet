import type { GrowthSnapshot } from './growth';
export interface DailyStatistics {
  date: string;
  keyboardCount: number;
  mouseCount: number;
  activeSeconds: number;
}
export interface StatisticsSnapshot {
  growth: GrowthSnapshot;
  todayExperience: number;
  today: DailyStatistics;
  days: DailyStatistics[];
  total: { keyboardCount: number; mouseCount: number; activeSeconds: number };
}
export function localDate(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
