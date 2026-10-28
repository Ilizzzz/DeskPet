import type { PetState, PetStateSignals } from '../../shared/types/pet';

export function resolvePetState(signals: PetStateSignals): PetState {
  if (signals.dragging) return 'dragging';
  if (signals.levelUp) return 'levelup';
  if (signals.interacting) return 'interact';
  if (signals.focus) return 'focus';
  if (signals.resting) return 'rest';
  if (signals.sleeping) return 'sleep';
  return 'idle';
}
