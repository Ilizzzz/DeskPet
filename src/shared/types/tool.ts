export type ToolId = 'focus' | 'notes' | 'sedentary' | 'daily_summary';

export interface ToolDefinition {
  id: ToolId;
  name: string;
  icon: string;
  category: 'productivity' | 'health' | 'utility' | 'game';
  defaultEnabled: boolean;
  minimumLevel: number;
  requiresPermission: boolean;
}

export interface ToolState extends ToolDefinition {
  enabled: boolean;
}
