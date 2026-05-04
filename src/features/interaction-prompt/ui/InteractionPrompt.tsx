"use client";

interface InteractionPromptProps {
  isVisible: boolean;
  title: string;
  subtitle?: string;
  keyLabel?: string;
}

export function InteractionPrompt({ isVisible, title, subtitle, keyLabel = "E" }: InteractionPromptProps) {
  if (!isVisible) return null;

  return (
    <div className="aaaPrompt" role="status" aria-live="polite">
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
}

