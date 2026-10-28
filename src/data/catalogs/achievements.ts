import type { AchievementDefinition } from '../../shared/types/achievement';

/**
 * 12 个成就，覆盖输入、专注、等级、收藏、合成、签到和伙伴/场景收集。
 *
 * 图标复用 public/assets/icons 下已登记的通用图标，不引入额外素材；
 * 进度与领取状态由 AchievementService 结合数据库计算。
 */
export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: 'first_steps',
    name: '初次相遇',
    description: '累计操作 500 次。',
    icon: 'assets/icons/app.png',
    condition: { type: 'totalInput', target: 500 },
    rewards: [{ type: 'coins', amount: 20 }],
  },
  {
    id: 'typist',
    name: '键盘达人',
    description: '键盘累计输入 100000 次。',
    icon: 'assets/icons/notes.png',
    condition: { type: 'keyboard', target: 100000 },
    rewards: [
      { type: 'coins', amount: 60 },
      { type: 'fragments', amount: 1 },
    ],
  },
  {
    id: 'clicker',
    name: '点击能手',
    description: '鼠标累计点击 50000 次。',
    icon: 'assets/icons/tools.png',
    condition: { type: 'mouse', target: 50000 },
    rewards: [{ type: 'coins', amount: 60 }],
  },
  {
    id: 'focus_5',
    name: '专注新星',
    description: '完成 5 次专注。',
    icon: 'assets/icons/focus.png',
    condition: { type: 'focusSessions', target: 5 },
    rewards: [
      { type: 'coins', amount: 30 },
      { type: 'fragments', amount: 1 },
    ],
  },
  {
    id: 'focus_30',
    name: '专注大师',
    description: '完成 30 次专注。',
    icon: 'assets/icons/focus.png',
    condition: { type: 'focusSessions', target: 30 },
    rewards: [
      { type: 'coins', amount: 100 },
      { type: 'fragments', amount: 3 },
    ],
  },
  {
    id: 'level_10',
    name: '十级伙伴',
    description: '成长等级达到 10 级。',
    icon: 'assets/icons/levelup.png',
    condition: { type: 'level', target: 10 },
    rewards: [{ type: 'fragments', amount: 2 }],
  },
  {
    id: 'level_25',
    name: '资深陪伴',
    description: '成长等级达到 25 级。',
    icon: 'assets/icons/growth.png',
    condition: { type: 'level', target: 25 },
    rewards: [
      { type: 'coins', amount: 100 },
      { type: 'fragments', amount: 5 },
    ],
  },
  {
    id: 'collect_10',
    name: '收藏家',
    description: '拥有 10 种不同的装扮。',
    icon: 'assets/icons/appearance.png',
    condition: { type: 'uniqueItems', target: 10 },
    rewards: [{ type: 'fragments', amount: 3 }],
  },
  {
    id: 'craft_3',
    name: '合成学徒',
    description: '累计合成 3 次。',
    icon: 'assets/icons/tools.png',
    condition: { type: 'craftCount', target: 3 },
    rewards: [{ type: 'coins', amount: 40 }],
  },
  {
    id: 'checkin_7',
    name: '签到之星',
    description: '连续签到 7 天。',
    icon: 'assets/icons/checkin.png',
    condition: { type: 'checkinStreak', target: 7 },
    rewards: [{ type: 'fragments', amount: 3 }],
  },
  {
    id: 'scene_3',
    name: '旅行家',
    description: '拥有 3 个场景。',
    icon: 'assets/icons/home.png',
    condition: { type: 'scenes', target: 3 },
    rewards: [{ type: 'coins', amount: 40 }],
  },
  {
    id: 'character_3',
    name: '伙伴成群',
    description: '拥有 3 个角色。',
    icon: 'assets/icons/app.png',
    condition: { type: 'characters', target: 3 },
    rewards: [{ type: 'fragments', amount: 3 }],
  },
];
