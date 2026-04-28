export interface GameSessionState {
  startedAt: number;
  activeMissionId: string | null;
}

export const initialGameSessionState: GameSessionState = {
  startedAt: Date.now(),
  activeMissionId: null,
};
