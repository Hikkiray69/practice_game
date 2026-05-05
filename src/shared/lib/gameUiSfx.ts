/**
 * Короткие «игровые» UI-звуки через Web Audio (без файлов).
 * После user gesture вызывайте `resumeGameUiAudio()` — иначе браузер режет звук.
 */

import { isGameAudioMuted } from "./gameAudioMute";

export type GameUiSfxKind =
  | "tap"
  | "confirm"
  | "npcChat"
  | "tick"
  | "go"
  | "hit"
  | "miss"
  | "pickup"
  | "win"
  | "mismatch"
  /** Фанфара при финальном экране кампании (все миссии). */
  | "campaignEnd";

function getCtor(): (typeof AudioContext) | null {
  if (typeof globalThis === "undefined") return null;
  const g = globalThis as typeof globalThis & {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return g.AudioContext ?? g.webkitAudioContext ?? null;
}

let uiCtx: AudioContext | null = null;

export async function resumeGameUiAudio(): Promise<AudioContext | null> {
  const Ctor = getCtor();
  if (!Ctor) return null;
  if (!uiCtx || uiCtx.state === "closed") {
    uiCtx = new Ctor();
  }
  if (uiCtx.state === "suspended") {
    await uiCtx.resume();
  }
  return uiCtx;
}

function masterGain(ctx: AudioContext, now: number, peak: number, dur: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(peak, now + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  g.connect(ctx.destination);
  return g;
}

function playTap(ctx: AudioContext) {
  const now = ctx.currentTime;
  const g = masterGain(ctx, now, 0.12, 0.06);
  const o = ctx.createOscillator();
  o.type = "square";
  o.frequency.setValueAtTime(620, now);
  o.frequency.exponentialRampToValueAtTime(420, now + 0.05);
  o.connect(g);
  o.start(now);
  o.stop(now + 0.07);
}

function playConfirm(ctx: AudioContext) {
  const now = ctx.currentTime;
  const notes = [523.25, 659.25];
  notes.forEach((freq, i) => {
    const t0 = now + i * 0.07;
    const g = masterGain(ctx, t0, 0.11, 0.11);
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(freq, t0);
    o.connect(g);
    o.start(t0);
    o.stop(t0 + 0.12);
  });
}

function playNpcChat(ctx: AudioContext) {
  const now = ctx.currentTime;
  const freqs = [392, 494, 587, 784];
  freqs.forEach((freq, i) => {
    const t0 = now + i * 0.055;
    const g = masterGain(ctx, t0, 0.1, 0.09);
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, t0);
    o.connect(g);
    o.start(t0);
    o.stop(t0 + 0.1);
  });
}

function playTick(ctx: AudioContext) {
  const now = ctx.currentTime;
  const g = masterGain(ctx, now, 0.09, 0.05);
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(880, now);
  o.connect(g);
  o.start(now);
  o.stop(now + 0.06);
}

function playGo(ctx: AudioContext) {
  const now = ctx.currentTime;
  const g = masterGain(ctx, now, 0.14, 0.18);
  const o = ctx.createOscillator();
  o.type = "square";
  o.frequency.setValueAtTime(196, now);
  o.frequency.exponentialRampToValueAtTime(392, now + 0.14);
  o.connect(g);
  o.start(now);
  o.stop(now + 0.2);
}

function playHit(ctx: AudioContext) {
  const now = ctx.currentTime;
  const g = masterGain(ctx, now, 0.13, 0.08);
  const o = ctx.createOscillator();
  o.type = "square";
  o.frequency.setValueAtTime(740, now);
  o.frequency.exponentialRampToValueAtTime(1100, now + 0.05);
  o.connect(g);
  o.start(now);
  o.stop(now + 0.09);
}

function playMiss(ctx: AudioContext, gainMul = 1) {
  const now = ctx.currentTime;
  const g = ctx.createGain();
  const peak = 0.1 * gainMul;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(peak, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  g.connect(ctx.destination);
  const o = ctx.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(220, now);
  o.frequency.exponentialRampToValueAtTime(90, now + 0.18);
  o.connect(g);
  o.start(now);
  o.stop(now + 0.24);
}

function playPickup(ctx: AudioContext) {
  const now = ctx.currentTime;
  const g = masterGain(ctx, now, 0.11, 0.07);
  const o = ctx.createOscillator();
  o.type = "triangle";
  o.frequency.setValueAtTime(740, now);
  o.frequency.exponentialRampToValueAtTime(990, now + 0.06);
  o.connect(g);
  o.start(now);
  o.stop(now + 0.09);
}

function playWin(ctx: AudioContext) {
  const now = ctx.currentTime;
  const seq = [523.25, 659.25, 783.99, 1046.5];
  seq.forEach((freq, i) => {
    const t0 = now + i * 0.06;
    const gn = masterGain(ctx, t0, 0.09, 0.1);
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(freq, t0);
    o.connect(gn);
    o.start(t0);
    o.stop(t0 + 0.14);
  });
}

/** Короткая триумфальная мелодия (C major): восходящий аккорд + каданс. ~2.1 с */
function playCampaignEnd(ctx: AudioContext) {
  const now = ctx.currentTime;
  type Note = { f: number; t: number; dur: number; peak: number };
  const melody: Note[] = [
    { f: 523.25, t: 0.0, dur: 0.16, peak: 0.085 },
    { f: 659.25, t: 0.14, dur: 0.16, peak: 0.088 },
    { f: 783.99, t: 0.28, dur: 0.18, peak: 0.092 },
    { f: 1046.5, t: 0.46, dur: 0.22, peak: 0.1 },
    { f: 1318.51, t: 0.72, dur: 0.2, peak: 0.09 },
    { f: 1174.66, t: 0.94, dur: 0.16, peak: 0.085 },
    { f: 1046.5, t: 1.12, dur: 0.42, peak: 0.1 },
  ];
  const bass: Note[] = [
    { f: 261.63, t: 0.44, dur: 0.28, peak: 0.055 },
    { f: 261.63, t: 1.08, dur: 0.52, peak: 0.065 },
  ];
  const all = [...melody, ...bass];
  all.forEach(({ f, t, dur, peak }) => {
    const t0 = now + t;
    const gn = masterGain(ctx, t0, peak, dur);
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(f, t0);
    o.connect(gn);
    o.start(t0);
    o.stop(t0 + dur + 0.04);
  });
}

function dispatch(kind: GameUiSfxKind, ctx: AudioContext) {
  switch (kind) {
    case "tap":
      playTap(ctx);
      break;
    case "confirm":
      playConfirm(ctx);
      break;
    case "npcChat":
      playNpcChat(ctx);
      break;
    case "tick":
      playTick(ctx);
      break;
    case "go":
      playGo(ctx);
      break;
    case "hit":
      playHit(ctx);
      break;
    case "miss":
      playMiss(ctx);
      break;
    case "pickup":
      playPickup(ctx);
      break;
    case "win":
      playWin(ctx);
      break;
    case "campaignEnd":
      playCampaignEnd(ctx);
      break;
    case "mismatch":
      playMiss(ctx, 0.55);
      break;
    default:
      break;
  }
}

/** Проигрывание после resume (один клик в игре обычно уже поднимает контекст). */
export function playGameUiSfx(kind: GameUiSfxKind): void {
  if (isGameAudioMuted()) return;
  void resumeGameUiAudio().then((ctx) => {
    if (!ctx || ctx.state !== "running") return;
    try {
      dispatch(kind, ctx);
    } catch {
      /* ignore */
    }
  });
}
