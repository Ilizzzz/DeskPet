export interface Anniversary {
  id: number;
  title: string;
  /** YYYY-MM-DD 本地日期。 */
  date: string;
  repeatYearly: boolean;
  createdAt: number;
}

export interface AnniversaryView extends Anniversary {
  /** 距离下一次纪念日的天数，0 表示就是今天。 */
  daysUntil: number;
  nextDate: string;
}
