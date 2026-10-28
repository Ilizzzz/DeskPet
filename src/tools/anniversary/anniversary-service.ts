import type { DatabaseSync } from 'node:sqlite';
import type { Anniversary, AnniversaryView } from '../../shared/types/anniversary';

const MAX_TITLE_LENGTH = 40;
const DAY_MS = 86_400_000;

type Row = {
  id: number;
  title: string;
  date: string;
  repeat_yearly: number;
  created_at: number;
};

function validId(id: unknown): id is number {
  return typeof id === 'number' && Number.isSafeInteger(id) && id >= 1;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function diffDays(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** 解析成日历日期；2026-02-30 这类不存在的日期会被拒绝。 */
function parseDate(value: unknown): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error('无效纪念日日期');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
    throw new Error('无效纪念日日期');
  return date;
}

function toView(row: Row, today: Date): AnniversaryView {
  const [year, month, day] = row.date.split('-').map(Number);
  const original = new Date(year, month - 1, day);
  let next = original;
  if (row.repeat_yearly === 1) {
    // 周年日期可能落在闰日；非闰年按当月最后一天计算。
    for (let offset = 0; offset <= 1; offset += 1) {
      const candidateYear = today.getFullYear() + offset;
      const candidateDay = Math.min(day, daysInMonth(candidateYear, month));
      const candidate = new Date(candidateYear, month - 1, candidateDay);
      if (candidate.getTime() >= startOfDay(today).getTime()) {
        next = candidate;
        break;
      }
    }
  }
  const base: Anniversary = {
    id: row.id,
    title: row.title,
    date: row.date,
    repeatYearly: row.repeat_yearly === 1,
    createdAt: row.created_at,
  };
  return {
    ...base,
    nextDate: formatDate(next),
    daysUntil: diffDays(today, next),
  };
}

/** 纪念日：按“下一次日期”由近到远排序，已过去的单次纪念日排在最后。 */
export class AnniversaryService {
  constructor(private readonly db: DatabaseSync) {}

  all(now = new Date()): AnniversaryView[] {
    const rows = this.db
      .prepare(
        'SELECT id, title, date, repeat_yearly, created_at FROM anniversaries ORDER BY id ASC',
      )
      .all() as unknown as Row[];
    return rows
      .map((row) => toView(row, now))
      .sort(
        (a, b) =>
          // 已过去的单次纪念日排到最后，其余按最近的下一次日期排序。
          Number(a.daysUntil < 0) - Number(b.daysUntil < 0) ||
          a.daysUntil - b.daysUntil ||
          a.nextDate.localeCompare(b.nextDate) ||
          a.id - b.id,
      );
  }

  create(title: unknown, date: unknown, repeatYearly: unknown): AnniversaryView[] {
    if (typeof title !== 'string') throw new Error('无效纪念日');
    const text = title.trim();
    if (text.length < 1 || text.length > MAX_TITLE_LENGTH) throw new Error('无效纪念日名称');
    const parsed = parseDate(date);
    if (typeof repeatYearly !== 'boolean') throw new Error('无效纪念日设置');
    this.db
      .prepare(
        'INSERT INTO anniversaries(title, date, repeat_yearly, created_at) VALUES (?, ?, ?, ?)',
      )
      .run(text, formatDate(parsed), repeatYearly ? 1 : 0, Date.now());
    return this.all();
  }

  remove(id: unknown): AnniversaryView[] {
    if (!validId(id)) throw new Error('无效纪念日');
    const result = this.db.prepare('DELETE FROM anniversaries WHERE id = ?').run(id);
    if (result.changes !== 1) throw new Error('纪念日不存在');
    return this.all();
  }
}
