export type PetState =
  | 'idle'
  | 'focus'
  | 'rest'
  | 'sleep'
  | 'levelup'
  | 'dragging'
  | 'keyboard'
  | 'mouse'
  | 'drop'
  | 'edge-bottom'
  | 'edge-left'
  | 'edge-right';

export interface PetStateSignals {
  dragging: boolean;
  levelUp: boolean;
  focus: boolean;
  resting: boolean;
  sleeping: boolean;
  inputReaction: 'keyboard' | 'mouse' | null;
  celebratingDrop: boolean;
  edge: 'free' | 'bottom' | 'left' | 'right';
}
