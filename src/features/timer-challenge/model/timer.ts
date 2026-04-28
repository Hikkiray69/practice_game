export interface TimerState {
  enabled: boolean;
  secondsLeft: number;
}

export const defaultTimerState: TimerState = {
  enabled: false,
  secondsLeft: 0,
};
