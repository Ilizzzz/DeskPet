export interface WaterSettings {
  intervalMinutes: number;
  /** 每日喝水目标杯数。 */
  dailyGoal: number;
}

export interface WaterSnapshot extends WaterSettings {
  date: string;
  cupsToday: number;
  lastDrinkAt: number | null;
  lastRemindedAt: number | null;
}
