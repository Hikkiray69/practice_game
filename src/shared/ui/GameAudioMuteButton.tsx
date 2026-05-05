"use client";

import { useEffect, useState } from "react";
import { isGameAudioMuted, setGameAudioMuted, subscribeGameAudioMute } from "@/shared/lib/gameAudioMute";

function IconSound() {
  return (
    <svg
      className="gameAudioMuteBtn__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
      <path d="M19.07 4.93a10 10 0 010 14.14" />
    </svg>
  );
}

function IconMuted() {
  return (
    <svg
      className="gameAudioMuteBtn__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}

export function GameAudioMuteButton() {
  const [muted, setMuted] = useState(isGameAudioMuted);

  useEffect(() => {
    setMuted(isGameAudioMuted());
    return subscribeGameAudioMute(() => setMuted(isGameAudioMuted()));
  }, []);

  return (
    <button
      type="button"
      className="gameAudioMuteBtn"
      onClick={() => setGameAudioMuted(!isGameAudioMuted())}
      aria-pressed={muted}
      aria-label={muted ? "Включить звук в игре" : "Выключить звук в игре"}
      title={muted ? "Включить звук" : "Выключить звук"}
    >
      {muted ? <IconMuted /> : <IconSound />}
    </button>
  );
}
