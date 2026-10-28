export interface GrowthState {
  level: number;
  experience: number;
  totalExperience: number;
  keyboardRemainder: number;
  mouseRemainder: number;
}
export interface GrowthSnapshot extends GrowthState {
  nextLevelExperience: number;
}
