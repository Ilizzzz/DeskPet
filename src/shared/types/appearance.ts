export interface Appearance {
  level: number;
  character: 'cat' | 'fox';
  scene: 'transparent' | 'forest_home';
  head: 'hat_blue' | 'hat_star' | null;
  neck: 'scarf' | null;
  inventory: { itemId: string; quantity: number }[];
  unlocks: string[];
  balance: number;
}
export interface AppearanceChange {
  character?: Appearance['character'];
  scene?: Appearance['scene'];
  head?: Appearance['head'];
  neck?: Appearance['neck'];
}
