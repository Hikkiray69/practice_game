/**
 * Фоновая процедурная музыка (Web Audio): хаб, миссия (диалог/выбор), миниигра.
 */

import { isGameAudioMuted, subscribeGameAudioMute } from "./gameAudioMute";
import { resumeGameUiAudio } from "./gameUiSfx";

export type GameBgmMode = "explore" | "mission" | "minigame";

const EXPLORE_BPM = 100;
const MISSION_BPM = 84;
const MINIGAME_BPM = 112;

/** Поднимающийся мажорный контур (C) — спокойный хаб. */
const EXPLORE_MELODY = [
  523.25, 587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 523.25,
] as const;

/** Сдержанный минорно-фригийский оттенок — лёгкое напряжение. */
const MISSION_MELODY = [
  220.0, 246.94, 261.63, 293.66, 311.13, 293.66, 261.63, 233.08,
] as const;

/** Ярче и выше — «дожми до победы» (во время миниигры и отсчёта). */
const MINIGAME_MELODY = [
  659.25, 783.99, 987.77, 1318.51, 1046.5, 1174.66, 1318.51, 1046.5,
] as const;

/** Общая громкость шины (раньше было ~0.11 — было слишком тихо). */
const BUS_PEAK = 0.26;

const LEVELS: Record<
  GameBgmMode,
  { mel: number; bass: number; bassHz: number }
> = {
  explore: { mel: 0.1, bass: 0.065, bassHz: 130.81 },
  mission: { mel: 0.085, bass: 0.072, bassHz: 110.0 },
  minigame: { mel: 0.12, bass: 0.08, bassHz: 130.81 },
};

interface BgmRuntime {
  ctx: AudioContext;
  bus: GainNode;
  stopFlag: boolean;
  mode: GameBgmMode;
  nextPhraseT: number;
  timerId: number | null;
}

let runtime: BgmRuntime | null = null;

function applyBgmBusMute(): void {
  if (!runtime) return;
  const { bus, ctx } = runtime;
  const t = ctx.currentTime;
  try {
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), t);
    if (isGameAudioMuted()) {
      bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    } else {
      bus.gain.exponentialRampToValueAtTime(BUS_PEAK, t + 0.28);
    }
  } catch {
    /* ignore */
  }
}

subscribeGameAudioMute(applyBgmBusMute);

function playSoftTone(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  t0: number,
  dur: number,
  peak: number,
  type: OscillatorType,
) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  g.connect(dest);
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  o.connect(g);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}

function schedulePhrase(): void {
  if (!runtime || runtime.stopFlag) return;

  const { ctx, bus, mode } = runtime;
  const now = ctx.currentTime;
  let t = runtime.nextPhraseT;
  if (t < now + 0.03) {
    t = now + 0.03;
  }

  const bpm =
    mode === "minigame" ? MINIGAME_BPM : mode === "explore" ? EXPLORE_BPM : MISSION_BPM;
  const beat = 60 / bpm;
  const melody =
    mode === "minigame"
      ? MINIGAME_MELODY
      : mode === "explore"
        ? EXPLORE_MELODY
        : MISSION_MELODY;
  const { mel: melPeak, bass: bassPeak, bassHz: bassRoot } = LEVELS[mode];

  if (!isGameAudioMuted()) {
    for (let i = 0; i < melody.length; i += 1) {
      const t0 = t + i * beat;
      playSoftTone(ctx, bus, melody[i], t0, beat * 0.92, melPeak, "triangle");
      if (i % 4 === 0) {
        playSoftTone(ctx, bus, bassRoot, t0, beat * 1.25, bassPeak, "sine");
      }
    }
  }

  const phraseDur = melody.length * beat;
  runtime.nextPhraseT = t + phraseDur;
  const leadSec = runtime.nextPhraseT - ctx.currentTime - 0.12;
  const leadMs = Math.max(25, leadSec * 1000);
  runtime.timerId = window.setTimeout(schedulePhrase, leadMs);
}

export function setGameBgmMode(mode: GameBgmMode): void {
  if (runtime) {
    runtime.mode = mode;
  }
}

export function stopGameBgm(): void {
  if (!runtime) return;
  runtime.stopFlag = true;
  if (runtime.timerId !== null) {
    window.clearTimeout(runtime.timerId);
    runtime.timerId = null;
  }
  const { bus, ctx } = runtime;
  const n = ctx.currentTime;
  try {
    bus.gain.cancelScheduledValues(n);
    bus.gain.setValueAtTime(bus.gain.value, n);
    bus.gain.exponentialRampToValueAtTime(0.0001, n + 0.5);
  } catch {
    /* ignore */
  }
  runtime = null;
}

/**
 * Старт цикла (останавливает предыдущий BGM). Нужен running AudioContext (после жеста).
 */
export async function startGameBgm(initialMode: GameBgmMode): Promise<void> {
  const ctx = await resumeGameUiAudio();
  if (!ctx || ctx.state !== "running") {
    return;
  }

  stopGameBgm();

  const bus = ctx.createGain();
  const peak = isGameAudioMuted() ? 0.0001 : BUS_PEAK;
  bus.gain.setValueAtTime(0.0001, ctx.currentTime);
  bus.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + 0.35);
  bus.connect(ctx.destination);

  runtime = {
    ctx,
    bus,
    stopFlag: false,
    mode: initialMode,
    nextPhraseT: ctx.currentTime + 0.1,
    timerId: null,
  };
  schedulePhrase();
}
