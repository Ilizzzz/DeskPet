import type { StatisticsSnapshot } from './statistics';
export interface DesktopApi {
  readonly platform: NodeJS.Platform;
  getStatistics(): Promise<StatisticsSnapshot>;
  clearStatistics(): Promise<boolean>;
  exportStatistics(): Promise<boolean>;
}
