import type { DatabaseSync } from 'node:sqlite';
import type { AchievementCondition, AchievementState } from '../../shared/types/achievement';
import { ACHIEVEMENTS } from '../../data/catalogs/achievements';
import { CHARACTERS, SCENES } from '../../data/catalogs/appearance';
import { grantReward } from '../../services/rewards/rewards';

type Metrics = Record<AchievementCondition['type'], number>;
type CountRow = { count: number };

export class AchievementService {
  constructor(private readonly db: DatabaseSync) {}

  list(): AchievementState[] {
    const metrics = this.metrics();
    const claimed = new Set(
      (this.db.prepare('SELECT id FROM achievements').all() as unknown as { id: string }[]).map(
        (row) => row.id,
      ),
    );
    return ACHIEVEMENTS.map((definition) => {
      const progress = metrics[definition.condition.type];
      const isClaimed = claimed.has(definition.id);
      return {
        ...definition,
        progress,
        // 条件达成后仍需用户主动领取，领取后不再显示可领取。
        claimable: !isClaimed && progress >= definition.condition.target,
        claimed: isClaimed,
      };
    });
  }

  claim(id: unknown): AchievementState[] {
    if (typeof id !== 'string') throw new Error('无效成就');
    const definition = ACHIEVEMENTS.find((entry) => entry.id === id);
    if (!definition) throw new Error('成就不存在');
    const state = this.list().find((entry) => entry.id === id)!;
    // 幂等：重复领取直接返回当前状态，不再发放奖励。
    if (state.claimed) return this.list();
    if (!state.claimable) throw new Error('成就条件未达成');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const inserted = this.db
        .prepare('INSERT OR IGNORE INTO achievements(id, claimed_at) VALUES (?, ?)')
        .run(id, Date.now());
      if (inserted.changes === 1)
        for (const reward of definition.rewards) grantReward(this.db, reward);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return this.list();
  }

  private count(sql: string): number {
    return (this.db.prepare(sql).get() as unknown as CountRow).count;
  }

  private metrics(): Metrics {
    const input = this.db
      .prepare(
        'SELECT COALESCE(SUM(keyboard_count), 0) AS keyboard, COALESCE(SUM(mouse_count), 0) AS mouse FROM daily_statistics',
      )
      .get() as unknown as { keyboard: number; mouse: number };
    const unlocks = new Set(
      (this.db.prepare('SELECT id FROM unlocks').all() as unknown as { id: string }[]).map(
        (row) => row.id,
      ),
    );
    const level = (
      this.db.prepare('SELECT level FROM growth_state WHERE id = 1').get() as unknown as {
        level: number;
      }
    ).level;
    return {
      totalInput: input.keyboard + input.mouse,
      keyboard: input.keyboard,
      mouse: input.mouse,
      focusSessions: this.count('SELECT COUNT(*) AS count FROM focus_sessions'),
      level,
      // 发现记录不会因分解最后一件而消失，收藏成就不会倒退。
      uniqueItems: this.count('SELECT COUNT(*) AS count FROM item_discoveries'),
      // 成就一旦达成不应因断签而丢失，因此取历史最长连续天数。
      checkinStreak: (
        this.db
          .prepare('SELECT COALESCE(MAX(streak), 0) AS count FROM checkins')
          .get() as unknown as CountRow
      ).count,
      scenes: SCENES.filter((scene) => unlocks.has(scene.id)).length,
      characters: CHARACTERS.filter((character) => unlocks.has(character.id)).length,
    };
  }
}
