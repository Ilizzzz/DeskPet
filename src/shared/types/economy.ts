import type { ItemRarity } from './appearance';

export interface DropPoolEntry {
  itemId: string;
  weight: number;
}

export interface DropEvent {
  id: number;
  itemId: string;
  createdAt: number;
}

export interface DropProgress {
  keyboardRemainder: number;
  keyboardPerDrop: number;
  latestDrop: DropEvent | null;
}

export interface ItemEconomy {
  itemId: string;
  rarity: ItemRarity;
  price: number;
  dismantleValue: number;
  source: 'starter' | 'drop' | 'shop' | 'milestone';
  milestoneLevel?: number;
}

export interface PetActivityEvent {
  keyboard: number;
  mouse: number;
  drops: DropEvent[];
  edge?: 'free' | 'bottom' | 'left' | 'right';
  animationsEnabled?: boolean;
  inputReactionsEnabled?: boolean;
}
