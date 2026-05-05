/**
 * Глобальный «без звука» для игры: UI-SFX, фон, пасхалка перегруза.
 * Состояние хранится в localStorage (`gameAudioMuted`).
 */

const STORAGE_KEY = "gameAudioMuted";

let muted = false;
const listeners = new Set<() => void>();

function readStorage(): void {
  if (typeof window === "undefined") return;
  try {
    muted = window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    /* ignore */
  }
}

if (typeof window !== "undefined") {
  readStorage();
}

export function isGameAudioMuted(): boolean {
  return muted;
}

export function setGameAudioMuted(next: boolean): void {
  if (muted === next) return;
  muted = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((fn) => fn());
}

export function subscribeGameAudioMute(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
