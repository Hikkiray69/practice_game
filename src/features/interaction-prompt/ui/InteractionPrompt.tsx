"use client";

import { forwardRef } from "react";

interface InteractionPromptProps {
  /** Режим по умолчанию: размонтировать когда скрыто. */
  variant?: "modal" | "docked";
  /** Для `variant="modal"`: показывать ли плашку. */
  isVisible?: boolean;
  title: string;
  subtitle?: string;
  keyLabel?: string;
}

/**
 * `docked` — плашка всегда в DOM; видимость переключается классом `aaaPrompt--dockedHidden`
 * снаружи (useFrame), без React-рендеров → нет фриза у границы NPC.
 */
export const InteractionPrompt = forwardRef<HTMLDivElement, InteractionPromptProps>(function InteractionPrompt(
  { variant = "modal", isVisible = false, title, subtitle, keyLabel = "E" },
  ref,
) {
  const docked = variant === "docked";
  if (!docked && !isVisible) return null;

  return (
    <div
      ref={ref}
      className={docked ? "aaaPrompt aaaPrompt--docked aaaPrompt--dockedHidden" : "aaaPrompt"}
      role="status"
      aria-live="polite"
      aria-hidden={docked ? true : undefined}
    >
      <div className="aaaPromptKeycap" aria-hidden="true">
        <span>{keyLabel}</span>
      </div>
      <div className="aaaPromptText">
        <div className="aaaPromptTitle">{title}</div>
        {subtitle ? <div className="aaaPromptSub">{subtitle}</div> : null}
      </div>
      <div className="aaaPromptSheen" aria-hidden="true" />
    </div>
  );
});


