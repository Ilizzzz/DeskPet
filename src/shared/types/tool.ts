export type ToolId =
  | 'daily_summary'
  | 'focus'
  | 'notes'
  | 'sedentary'
  | 'todo'
  | 'water'
  | 'countdown'
  | 'anniversary';

export type ToolCategory = 'productivity' | 'health' | 'utility';

export interface ToolDefinition {
  id: ToolId;
  name: string;
  description: string;
  /** 图标资源路径，统一放在 public/assets/icons 下。 */
  icon: string;
  category: ToolCategory;
  defaultEnabled: boolean;
  /** 工具按等级解锁；达到等级后默认启用逻辑仍然生效。 */
  minimumLevel: number;
  requiresPermission: boolean;
}

export interface ToolState extends ToolDefinition {
  enabled: boolean;
  unlocked: boolean;
}
