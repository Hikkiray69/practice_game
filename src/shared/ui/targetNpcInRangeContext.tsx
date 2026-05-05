"use client";

import { createContext, type MutableRefObject } from "react";

/** Обновляется в useFrame (без React state) — целевой NPC в зоне диалога. */
export const TargetNpcInRangeRefContext = createContext<MutableRefObject<boolean> | null>(null);
