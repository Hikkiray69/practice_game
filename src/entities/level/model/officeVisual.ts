/**
 * Visual design system: “creative office hub” — neutral warm shell,
 * cool daylight from the window wall, muted zone accents (no RGB wash).
 * Used by TrainingHubLevel only; keep values literal for easy tuning.
 */
export const officeVisual = {
  /** Scene & atmosphere */
  background: "#0b101c",
  /** Линейный Fog: между near…far пол смешивается с fog — при близких near/far «игровое поле» темнело сильнее краёв кадра. */
  fog: "#0b101c",
  fogNear: 58,
  fogFar: 120,

  /** Shell */
  ceiling: "#141c2c",
  ceilingGridEmissive: "#1e293b",
  trim: "#d4d0c8",
  wallPaint: "#8f9ba8",
  wallTexBase: "#8a95a3",
  windowWallOuter: "#152032",
  glassTint: "#4a6fa8",
  glassEmissive: "#8cb4f0",

  /** Floor — light wide-plank parquet (see createParquetTexture) */
  floorTint: "#ffffff",
  parquetBase: "#f6efe6",
  parquetJoint: "#c9b8a0",
  parquetRepeat: [26, 26] as const,
  floorRoughness: 0.62,
  /** Area rugs sit darker on light wood */
  rugTintA: "#9aa8b8",
  rugTintB: "#8b98a8",
  /** Glass meeting pods — interior carpet vs parquet */
  focusRoomCarpet: "#323846",
  focusRoomGlass: "#dce8f5",

  /** Furniture & props */
  woodDesk: "#c4b59f",
  woodDeskDark: "#8b7b62",
  metalLeg: "#3d4555",
  fabricDark: "#2f3a4d",
  fabricSofa: "#3d4a5f",
  ink: "#0f1624",
  planterRim: "#2a3344",
  planterFeet: "#1a2230",
  soilTint: "#3a3228",

  /** Accents (muted — light carries hue, not albedo) */
  accentViolet: "#6b5b95",
  accentCyan: "#4a7a8f",
  accentAmber: "#8a7348",

  /** Lights — между читаемостью и контрастом теней (не «вымывание», не «мрак»). */
  ambient: { intensity: 0.44, color: "#e8eef8" },
  hemisphere: { sky: "#dce6f5", ground: "#d6cec6", intensity: 0.48 },
  fillDir: { intensity: 0.55, color: "#f2f6ff", pos: [12, 15, 8] as const },
  /**
   * Ключ с окна. Z должен быть **зади** `CityBackdrop` (группа z=-18), иначе свет
   * лежит почти в плоскости фона — плохая математика для shadow-камеры.
   */
  windowKey: { intensity: 1.35, color: "#eef4ff", pos: [0, 11, -22] as const },
  zonePoints: [
    { pos: [-14.0, 2.38, 5.2] as const, intensity: 0.68, color: "#c4b5ff", distance: 15.5 },
    { pos: [0.0, 2.42, 2.9] as const, intensity: 0.6, color: "#a8d8f0", distance: 15.5 },
    { pos: [2.6, 2.36, -8.6] as const, intensity: 0.58, color: "#f0d9a6", distance: 15.5 },
  ] as const,
  ceilingPanels: [
    { pos: [-10, 2.9, -2] as const, size: [10, 6] as const, intensity: 0.52 },
    { pos: [10, 2.9, -2] as const, size: [10, 6] as const, intensity: 0.52 },
    { pos: [0, 2.9, -9] as const, size: [12, 6] as const, intensity: 0.48 },
  ] as const,

  /** PBR tiers */
  rough: { matte: 0.94, wall: 0.9, fabric: 0.82, wood: 0.58, metal: 0.42 },
  metal: { low: 0.06, leg: 0.28, frame: 0.12 },

  /** IBL — сильный PMREM «съедает» контраст real-time теней (см. three #30193). Умеренно. */
  environmentIntensity: 0.1,

  /** Backdrop behind window glass */
  cityDeep: "#0c1528",
  cityDeepEmissive: "#243a72",
  cityWindows: "#122040",
  cityWindowsEmissive: "#5a7ec4",
} as const;
