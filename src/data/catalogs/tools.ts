import type { ToolDefinition } from '../../shared/types/tool';

export const TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  {
    id: 'focus',
    name: '番茄钟',
    icon: 'timer',
    category: 'productivity',
    defaultEnabled: true,
    minimumLevel: 1,
    requiresPermission: false,
  },
  {
    id: 'notes',
    name: '桌面便签',
    icon: 'note',
    category: 'productivity',
    defaultEnabled: true,
    minimumLevel: 1,
    requiresPermission: false,
  },
  {
    id: 'sedentary',
    name: '久坐提醒',
    icon: 'health',
    category: 'health',
    defaultEnabled: true,
    minimumLevel: 1,
    requiresPermission: false,
  },
  {
    id: 'daily_summary',
    name: '今日总结',
    icon: 'summary',
    category: 'productivity',
    defaultEnabled: true,
    minimumLevel: 1,
    requiresPermission: false,
  },
] as const;
