import type { ToolDefinition } from '../../shared/types/tool';

/**
 * 工具统一按等级解锁；达到等级后沿用用户自己的启停偏好。
 *
 * 今日总结在 1 级即可用，避免一开始完全没有生产力功能；
 * 其余工具从 2 级开始依次开放，形成一个和成长路线绑定的解锁节奏。
 */
export const TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  {
    id: 'daily_summary',
    name: '今日总结',
    description: '汇总今天的键鼠、经验、专注和奖励。',
    icon: 'assets/icons/summary.png',
    category: 'productivity',
    defaultEnabled: true,
    minimumLevel: 1,
    requiresPermission: false,
  },
  {
    id: 'focus',
    name: '番茄钟',
    description: '专注 25 分钟，让桌宠陪你一起。',
    icon: 'assets/icons/focus.png',
    category: 'productivity',
    defaultEnabled: true,
    minimumLevel: 2,
    requiresPermission: false,
  },
  {
    id: 'notes',
    name: '桌面便签',
    description: '随手记事，自动保存到本机。',
    icon: 'assets/icons/notes.png',
    category: 'productivity',
    defaultEnabled: true,
    minimumLevel: 4,
    requiresPermission: false,
  },
  {
    id: 'sedentary',
    name: '久坐提醒',
    description: '连续专注一段时间后提醒你起身。',
    icon: 'assets/icons/health.png',
    category: 'health',
    defaultEnabled: true,
    minimumLevel: 6,
    requiresPermission: false,
  },
  {
    id: 'todo',
    name: '待办清单',
    description: '把今天要做的小事一条条划掉。',
    icon: 'assets/icons/todo.png',
    category: 'productivity',
    defaultEnabled: true,
    minimumLevel: 9,
    requiresPermission: false,
  },
  {
    id: 'water',
    name: '喝水提醒',
    description: '定时提醒喝水，记录今天的杯数。',
    icon: 'assets/icons/water.png',
    category: 'health',
    defaultEnabled: true,
    minimumLevel: 12,
    requiresPermission: false,
  },
  {
    id: 'countdown',
    name: '倒计时',
    description: '给重要时刻设一个倒计时。',
    icon: 'assets/icons/countdown.png',
    category: 'utility',
    defaultEnabled: true,
    minimumLevel: 15,
    requiresPermission: false,
  },
  {
    id: 'anniversary',
    name: '纪念日',
    description: '记住值得纪念的日期。',
    icon: 'assets/icons/anniversary.png',
    category: 'utility',
    defaultEnabled: true,
    minimumLevel: 18,
    requiresPermission: false,
  },
] as const;
