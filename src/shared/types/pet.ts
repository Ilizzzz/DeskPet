export type PetState = 'idle' | 'interact' | 'focus' | 'rest' | 'sleep' | 'levelup' | 'dragging';

export interface PetStateSignals {
  dragging: boolean;
  levelUp: boolean;
  interacting: boolean;
  focus: boolean;
  resting: boolean;
  sleeping: boolean;
}
