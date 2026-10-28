export interface Countdown {
  id: number;
  label: string;
  endsAt: number;
  createdAt: number;
  /** 到点后是否已经推送系统通知，避免重复提醒。 */
  notified: boolean;
}
