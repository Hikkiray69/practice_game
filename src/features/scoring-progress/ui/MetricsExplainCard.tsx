"use client";

import { useId } from "react";
import type { MetricsExplainCardData } from "../model/metricsExplainCards";

export function MetricsExplainCard({ card }: { card: MetricsExplainCardData }) {
  const headingId = useId();
  return (
    <div className="metricsExplainCard" role="region" aria-labelledby={headingId}>
      <h3 className="metricsExplainCardTitle" id={headingId}>
        {card.title}
      </h3>
      {card.lines.map((line, i) => (
        <p key={i} className="dialogueText metricsExplainCardLine">
          {line}
        </p>
      ))}
    </div>
  );
}
