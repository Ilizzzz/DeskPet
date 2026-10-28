export type PetState = 'idle' | 'focus' | 'rest' | 'sleep' | 'levelup' | 'dragging';

export interface PetStateSignals {
  dragging: boolean;
  levelUp: boolean;
  focus: boolean;
  resting: boolean;
  sleeping: boolean;
}
