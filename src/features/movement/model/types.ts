export interface MovementConfig {
  speed: number;
  allowJump: boolean;
}

export const defaultMovementConfig: MovementConfig = {
  speed: 1,
  allowJump: false,
};
