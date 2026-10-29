// Version 2 场景只在宠物脚下绘制小范围地毯，不再使用方形背景遮挡桌面。
export interface SceneTheme {
  background: 'transparent';
  ground?: string;
  groundAccent?: string;
}

export interface SceneDecoration {
  asset: string;
  x: number;
  y: number;
  width: number;
  flip?: boolean;
  opacity?: number;
  z?: number;
}

export interface SceneDefinition {
  id: string;
  name: string;
  description: string;
  unlockLevel: number;
  theme: SceneTheme;
  background?: string;
  decorations: readonly SceneDecoration[];
}

export const SCENES: readonly SceneDefinition[] = [
  {
    id: 'transparent',
    name: '无地面装饰',
    description: '让伙伴直接待在桌面上。',
    unlockLevel: 1,
    theme: { background: 'transparent' },
    decorations: [],
  },
  {
    id: 'forest_home',
    name: '森野草垫',
    description: '柔软的草绿色圆垫。',
    unlockLevel: 3,
    theme: { background: 'transparent', ground: '#9bcf8b', groundAccent: '#d9efb6' },
    decorations: [],
  },
  {
    id: 'coffee_corner',
    name: '奶咖地毯',
    description: '暖暖的奶咖色编织地毯。',
    unlockLevel: 6,
    theme: { background: 'transparent', ground: '#e8c7a2', groundAccent: '#fff0d8' },
    decorations: [],
  },
  {
    id: 'starry_night',
    name: '星夜圆毯',
    description: '深蓝圆毯上散着小星星。',
    unlockLevel: 9,
    theme: { background: 'transparent', ground: '#46517e', groundAccent: '#f7d879' },
    decorations: [],
  },
  {
    id: 'sunset_beach',
    name: '海浪软垫',
    description: '像黄昏海浪一样柔软。',
    unlockLevel: 13,
    theme: { background: 'transparent', ground: '#78bdd0', groundAccent: '#ffd39b' },
    decorations: [],
  },
  {
    id: 'snowy_cabin',
    name: '雪花绒毯',
    description: '蓬松的浅蓝雪花绒毯。',
    unlockLevel: 17,
    theme: { background: 'transparent', ground: '#d9eafa', groundAccent: '#ffffff' },
    decorations: [],
  },
  {
    id: 'cozy_library',
    name: '书房木垫',
    description: '有细密木纹的椭圆地垫。',
    unlockLevel: 21,
    theme: { background: 'transparent', ground: '#b9825f', groundAccent: '#ecc6a2' },
    decorations: [],
  },
  {
    id: 'city_dusk',
    name: '暮色霓虹毯',
    description: '紫粉暮色铺成的小地毯。',
    unlockLevel: 25,
    theme: { background: 'transparent', ground: '#76577f', groundAccent: '#f4a7b9' },
    decorations: [],
  },
] as const;
