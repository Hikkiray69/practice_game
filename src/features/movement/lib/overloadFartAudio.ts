/**
 * Пасхалка перегруза: `public/sounds/fart.mp3`.
 * Пул из нескольких HTMLAudioElement — чтобы наложения не глушили друг друга.
 */

import { isGameAudioMuted } from "@/shared/lib/gameAudioMute";

const FART_URL = "/sounds/fart.mp3";
const POOL_SIZE = 6;

let pool: HTMLAudioElement[] | null = null;
let poolIndex = 0;

function ensurePool(): HTMLAudioElement[] {
  if (!pool) {
    pool = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const a = new Audio(FART_URL);
      a.preload = "auto";
      pool.push(a);
    }
  }
  return pool;
}

/** Прогрев после user gesture (Space в игре). */
export function preloadOverloadFartAudio(): void {
  ensurePool();
}

export function playOverloadFartSound(): void {
  if (typeof window === "undefined" || isGameAudioMuted()) {
    return;
  }
  const p = ensurePool();
  const a = p[poolIndex];
  poolIndex = (poolIndex + 1) % p.length;
  a.pause();
  a.currentTime = 0;
  void a.play().catch(() => {});
}
