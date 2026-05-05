"use client";

import { Environment } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import type { DirectionalLight } from "three";
import { BoxGeometry, Group, InstancedMesh, Mesh, MeshStandardMaterial, Object3D, RepeatWrapping } from "three";
import {
  createCeilingTileTexture,
  createConcreteTexture,
  createFabricNoiseTexture,
  createParquetTexture,
  createSoilTexture,
  createWoodLaminateTexture,
} from "@/shared/lib/threeTextures";
import { officeVisual as ov } from "../model/officeVisual";

/** Детерминированные звёзды в локальных координатах CityBackdrop (y — верхняя часть окон). */
function makeCityStarField(): Array<[number, number, number, number]> {
  const out: Array<[number, number, number, number]> = [];
  for (let i = 0; i < 52; i++) {
    const u = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    const v = Math.sin(i * 39.4231 + 11.7) * 31415.9265;
    const fx = u - Math.floor(u);
    const fy = v - Math.floor(v);
    const x = (fx - 0.5) * 58;
    const y = 3.6 + fy * 5.4;
    const z = -0.34 - (i % 7) * 0.018;
    const s = 0.04 + (i % 5) * 0.022;
    out.push([x, y, z, s]);
  }
  return out;
}
const CITY_STAR_FIELD = makeCityStarField();

/** `true` — тест: directional сверху. `false` — свет с окна (боевой режим). */
const DEBUG_OVERHEAD_SUN = false;

const OVERHEAD_SUN_POS = [0, 30, 0] as const;
const OVERHEAD_SUN_TARGET = [0, -0.8, 1] as const;
const OVERHEAD_SUN_INTENSITY = 1.45;

function CeilingLight({
  position,
  size,
  intensity = 0.9,
  emissive = "#e8eef8",
}: {
  position: [number, number, number];
  size: [number, number];
  intensity?: number;
  emissive?: string;
}) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]} userData={{ shadow: "none" as const }}>
      <planeGeometry args={size} />
      <meshStandardMaterial
        color={ov.ink}
        emissive={emissive}
        emissiveIntensity={intensity}
        roughness={ov.rough.matte}
        metalness={ov.metal.low}
      />
    </mesh>
  );
}

function LowPlanterRow({
  position,
  length,
  rotationY = 0,
  seed = 1,
  soilMap,
}: {
  position: [number, number, number];
  length: number;
  rotationY?: number;
  seed?: number;
  soilMap: ReturnType<typeof createSoilTexture>;
}) {
  const rimH = 0.42;
  const innerW = 0.62;
  const innerD = 0.44;

  const moduleCount = Math.max(2, Math.round(length / 2.2));
  const gap = 0.22;
  const moduleLen = (length - gap * (moduleCount - 1)) / moduleCount;

  function foliageCluster(cx: number, cz: number, clusterSeed: number) {
    const greens = ["#14532d", "#166534", "#15803d", "#22c55e", "#4ade80"];
    const items = [];
    for (let i = 0; i < 9; i++) {
      const t = ((clusterSeed + i * 97) % 1000) / 1000;
      const u = ((clusterSeed + i * 131) % 1000) / 1000;
      const x = cx + (t - 0.5) * (moduleLen * 0.55);
      const z = cz + (u - 0.5) * (innerD * 0.55);
      const s = 0.08 + ((clusterSeed + i * 17) % 100) / 1000;
      const y = rimH + 0.03 + ((clusterSeed + i * 19) % 100) / 4000;
      const col = greens[(clusterSeed + i) % greens.length];
      items.push(
        <mesh key={`${clusterSeed}-${i}`} position={[x, y, z]}>
          <sphereGeometry args={[s, 10, 10]} />
          <meshStandardMaterial color={col} roughness={0.92} metalness={0.0} />
        </mesh>,
      );
    }
    // a couple “flowers”
    for (let i = 0; i < 3; i++) {
      const t = ((clusterSeed + i * 211) % 1000) / 1000;
      const u = ((clusterSeed + i * 223) % 1000) / 1000;
      const x = cx + (t - 0.5) * (moduleLen * 0.45);
      const z = cz + (u - 0.5) * (innerD * 0.45);
      const y = rimH + 0.05;
      const col = i % 2 === 0 ? "#fde68a" : "#fbcfe8";
      items.push(
        <mesh key={`f-${clusterSeed}-${i}`} position={[x, y, z]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color={col} roughness={0.62} metalness={0.0} emissive={col} emissiveIntensity={0.035} />
        </mesh>,
      );
    }
    return items;
  }

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {Array.from({ length: moduleCount }).map((_, i) => {
        const x = -length / 2 + moduleLen / 2 + i * (moduleLen + gap);
        const clusterSeed = seed * 1000 + i * 1337;
        return (
          <group key={i} position={[x, 0, 0]}>
            {/* outer rim */}
            <mesh position={[0, rimH / 2, 0]}>
              <boxGeometry args={[moduleLen, rimH, innerW]} />
              <meshStandardMaterial color={ov.planterRim} metalness={ov.metal.frame} roughness={ov.rough.wall} />
            </mesh>

            {/* soil bed */}
            <mesh position={[0, rimH + 0.02, 0]}>
              <boxGeometry args={[moduleLen - 0.12, 0.04, innerD]} />
              <meshStandardMaterial map={soilMap} color={ov.soilTint} roughness={ov.rough.matte} metalness={0.0} />
            </mesh>

            {/* small feet */}
            <mesh position={[-moduleLen / 2 + 0.12, 0.05, -innerW / 2 + 0.06]}>
              <boxGeometry args={[0.08, 0.1, 0.08]} />
              <meshStandardMaterial color={ov.planterFeet} metalness={ov.metal.leg} roughness={ov.rough.metal} />
            </mesh>
            <mesh position={[moduleLen / 2 - 0.12, 0.05, -innerW / 2 + 0.06]}>
              <boxGeometry args={[0.08, 0.1, 0.08]} />
              <meshStandardMaterial color={ov.planterFeet} metalness={ov.metal.leg} roughness={ov.rough.metal} />
            </mesh>
            <mesh position={[-moduleLen / 2 + 0.12, 0.05, innerW / 2 - 0.06]}>
              <boxGeometry args={[0.08, 0.1, 0.08]} />
              <meshStandardMaterial color={ov.planterFeet} metalness={ov.metal.leg} roughness={ov.rough.metal} />
            </mesh>
            <mesh position={[moduleLen / 2 - 0.12, 0.05, innerW / 2 - 0.06]}>
              <boxGeometry args={[0.08, 0.1, 0.08]} />
              <meshStandardMaterial color={ov.planterFeet} metalness={ov.metal.leg} roughness={ov.rough.metal} />
            </mesh>

            {foliageCluster(0, 0, clusterSeed)}
          </group>
        );
      })}
    </group>
  );
}

/**
 * Силуэты ближе к стеклу (+Z к комнате).
 * Низ ~ у подоконника — в кадре не «пол под ногами», а стена зданий + небо выше.
 */
const CITY_SILHOUETTES = [
  { x: -27, w: 2.6, h: 9.5, z: 0.34, win: 3 },
  { x: -21, w: 4.0, h: 12.8, z: 0.46, win: 5 },
  { x: -14, w: 2.9, h: 10.2, z: 0.3, win: 3 },
  { x: -7, w: 3.4, h: 11.0, z: 0.52, win: 4 },
  { x: 0, w: 4.8, h: 13.5, z: 0.4, win: 6 },
  { x: 8, w: 3.0, h: 9.0, z: 0.5, win: 3 },
  { x: 15, w: 3.6, h: 11.4, z: 0.34, win: 4 },
  { x: 23, w: 2.4, h: 8.2, z: 0.28, win: 2 },
  { x: -10, w: 2.1, h: 7.0, z: 0.58, win: 2 },
  { x: 12, w: 2.3, h: 7.6, z: 0.54, win: 2 },
  { x: -17, w: 1.8, h: 6.2, z: 0.66, win: 2 },
  { x: 19, w: 1.9, h: 6.5, z: 0.62, win: 2 },
] as const;

function CityBackdropBuilding({
  x,
  w,
  h,
  z,
  winCount,
}: {
  x: number;
  w: number;
  h: number;
  z: number;
  winCount: number;
}) {
  /** Подоконник в проёме ~ y≈−0.3 мир; группа z=−18 — низ силуэта чуть ниже, масса вверх в окно */
  const baseY = -0.22;
  const cy = baseY + h * 0.5;
  const depth = 0.12;
  const cols = Math.min(3, Math.max(1, winCount <= 2 ? 1 : winCount <= 4 ? 2 : 3));
  const rows = Math.min(3, Math.max(2, Math.ceil(winCount / cols)));
  const faces: ReactNode[] = [];
  let k = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (k >= winCount) break;
      const wx = cols === 1 ? 0 : (c / (cols - 1) - 0.5) * w * 0.62;
      /* Ниже центра корпуса — в кадре под верхней перемычкой окна, не у облаков */
      const wy = -h * 0.34 + (r / Math.max(1, rows - 1)) * (h * 0.32);
      faces.push(
        <mesh key={k} position={[wx, wy, depth * 0.52]} userData={{ shadow: "none" as const }}>
          <planeGeometry args={[Math.min(0.42, w * 0.22), Math.min(0.55, h * 0.2)]} />
          <meshStandardMaterial
            color="#1a2844"
            emissive="#f0d78a"
            emissiveIntensity={0.95 + (k % 3) * 0.18}
            roughness={0.45}
            metalness={0.05}
          />
        </mesh>,
      );
      k += 1;
    }
  }
  return (
    <group position={[x, cy, z]}>
      <mesh userData={{ shadow: "none" as const }}>
        <boxGeometry args={[w, h, depth]} />
        <meshStandardMaterial color="#080e18" roughness={0.94} metalness={0.04} />
      </mesh>
      {faces}
    </group>
  );
}

function CityBackdrop() {
  return (
    <group position={[0, 0, -17.85]}>
      {/* Зенит — светлее, чтобы пробивалось через transmission стекла */}
      <mesh position={[0, 6.9, -0.52]} userData={{ shadow: "none" as const }}>
        <planeGeometry args={[76, 17]} />
        <meshStandardMaterial color="#121a32" emissive="#3558a8" emissiveIntensity={0.72} roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0, 4.75, -0.28]} userData={{ shadow: "none" as const }}>
        <planeGeometry args={[74, 15]} />
        <meshStandardMaterial color="#243058" emissive="#4a6ab4" emissiveIntensity={0.58} roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0, 2.95, -0.08]} userData={{ shadow: "none" as const }}>
        <planeGeometry args={[68, 11]} />
        <meshStandardMaterial color="#344868" emissive="#5a78c8" emissiveIntensity={0.45} roughness={1} metalness={0} />
      </mesh>

      <mesh position={[0, 3.55, 0.04]} userData={{ shadow: "none" as const }}>
        <planeGeometry args={[60, 12]} />
        <meshStandardMaterial color={ov.cityDeep} emissive={ov.cityDeepEmissive} emissiveIntensity={1.15} roughness={1} metalness={0} />
      </mesh>

      <mesh position={[0, 2.7, 0.06]} userData={{ shadow: "none" as const }}>
        <planeGeometry args={[58, 10]} />
        <meshStandardMaterial
          color={ov.cityWindows}
          emissive={ov.cityWindowsEmissive}
          emissiveIntensity={0.78}
          metalness={0.0}
          roughness={1.0}
        />
      </mesh>

      {CITY_STAR_FIELD.map(([sx, sy, sz, ss], i) => (
        <mesh key={`star-${i}`} position={[sx, sy, sz]} userData={{ shadow: "none" as const }}>
          <sphereGeometry args={[ss, 6, 6]} />
          <meshStandardMaterial
            color="#f0f4ff"
            emissive="#e8eeff"
            emissiveIntensity={1.1 + (i % 4) * 0.15}
            roughness={0.35}
            metalness={0}
          />
        </mesh>
      ))}

      <mesh position={[-16, 7.0, -0.38]} userData={{ shadow: "none" as const }}>
        <circleGeometry args={[0.95, 28]} />
        <meshStandardMaterial color="#c5d4f0" emissive="#eef4ff" emissiveIntensity={0.55} roughness={0.75} metalness={0} />
      </mesh>
      <mesh position={[-16.35, 6.72, -0.36]} userData={{ shadow: "none" as const }}>
        <circleGeometry args={[0.72, 24]} />
        <meshStandardMaterial color="#8899b8" emissive="#a8b8d8" emissiveIntensity={0.12} roughness={0.85} metalness={0} />
      </mesh>

      <mesh position={[0, -0.42, 0.16]} userData={{ shadow: "none" as const }}>
        <planeGeometry args={[64, 0.9]} />
        <meshStandardMaterial color="#5a4a62" emissive="#e8c4dc" emissiveIntensity={0.2} roughness={1} metalness={0} />
      </mesh>

      <mesh position={[0, 0.38, 0.12]} userData={{ shadow: "none" as const }}>
        <planeGeometry args={[62, 2.8]} />
        <meshStandardMaterial color="#28364c" emissive="#4a62a0" emissiveIntensity={0.32} roughness={1} metalness={0} />
      </mesh>

      {/* Тонкий тёмный газон у подножия домов — без яркого зелёного «барьера» */}
      <mesh position={[0, -0.58, 0.2]} userData={{ shadow: "none" as const }}>
        <planeGeometry args={[70, 0.55]} />
        <meshStandardMaterial color="#1c281c" emissive="#243224" emissiveIntensity={0.03} roughness={0.97} metalness={0.02} />
      </mesh>

      {CITY_SILHOUETTES.map((b, i) => (
        <CityBackdropBuilding key={i} x={b.x} w={b.w} h={b.h} z={b.z} winCount={b.win} />
      ))}
    </group>
  );
}

function DeskStation({
  position,
  rotationY = 0,
  busy = 0.0,
  woodMap,
}: {
  position: [number, number, number];
  rotationY?: number;
  busy?: number; // 0..1
  woodMap: ReturnType<typeof createWoodLaminateTexture>;
}) {
  const clutter = Math.max(0, Math.min(1, busy));
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[1.5, 0.08, 0.75]} />
        <meshStandardMaterial
          map={woodMap}
          color={ov.woodDesk}
          metalness={ov.metal.low}
          roughness={ov.rough.wood}
        />
      </mesh>
      <mesh position={[-0.65, 0.31, -0.28]}>
        <boxGeometry args={[0.06, 0.62, 0.06]} />
        <meshStandardMaterial color={ov.metalLeg} metalness={ov.metal.leg} roughness={ov.rough.metal} />
      </mesh>
      <mesh position={[0.65, 0.31, -0.28]}>
        <boxGeometry args={[0.06, 0.62, 0.06]} />
        <meshStandardMaterial color={ov.metalLeg} metalness={ov.metal.leg} roughness={ov.rough.metal} />
      </mesh>
      <mesh position={[-0.65, 0.31, 0.28]}>
        <boxGeometry args={[0.06, 0.62, 0.06]} />
        <meshStandardMaterial color={ov.metalLeg} metalness={ov.metal.leg} roughness={ov.rough.metal} />
      </mesh>
      <mesh position={[0.65, 0.31, 0.28]}>
        <boxGeometry args={[0.06, 0.62, 0.06]} />
        <meshStandardMaterial color={ov.metalLeg} metalness={ov.metal.leg} roughness={ov.rough.metal} />
      </mesh>

      <mesh position={[0.35, 0.82, -0.1]}>
        <boxGeometry args={[0.44, 0.28, 0.04]} />
        <meshStandardMaterial
          color={ov.ink}
          emissive="#9ecae0"
          emissiveIntensity={0.045 + 0.1 * clutter}
          roughness={0.35}
          metalness={0.08}
        />
      </mesh>
      <mesh position={[0.35, 0.7, -0.1]}>
        <boxGeometry args={[0.12, 0.14, 0.08]} />
        <meshStandardMaterial color={ov.ink} metalness={ov.metal.leg} roughness={ov.rough.metal} />
      </mesh>

      <mesh position={[-0.5, 0.42, 0.18]}>
        <boxGeometry args={[0.34, 0.06, 0.32]} />
        <meshStandardMaterial color={ov.fabricDark} metalness={ov.metal.low} roughness={ov.rough.fabric} />
      </mesh>
      <mesh position={[-0.5, 0.55, 0.03]}>
        <boxGeometry args={[0.34, 0.32, 0.06]} />
        <meshStandardMaterial color={ov.fabricDark} metalness={ov.metal.low} roughness={ov.rough.fabric} />
      </mesh>

      {clutter > 0.2 ? (
        <mesh position={[-0.15, 0.68, 0.14]} rotation={[0, 0.2, 0.06]}>
          <boxGeometry args={[0.28, 0.01, 0.2]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.95} metalness={0} />
        </mesh>
      ) : null}
      {clutter > 0.45 ? (
        <mesh position={[-0.38, 0.69, -0.12]}>
          <cylinderGeometry args={[0.06, 0.06, 0.11, 14]} />
          <meshStandardMaterial color={ov.accentViolet} emissive={ov.accentViolet} emissiveIntensity={0.04} roughness={0.55} />
        </mesh>
      ) : null}
      {clutter > 0.65 ? (
        <mesh position={[0.05, 0.685, -0.22]} rotation={[-0.12, -0.35, 0]}>
          <boxGeometry args={[0.22, 0.01, 0.16]} />
          <meshStandardMaterial color="#a8b4c8" roughness={0.92} metalness={0.04} />
        </mesh>
      ) : null}
    </group>
  );
}

function Plant({
  position,
  size = 1.0,
}: {
  position: [number, number, number];
  size?: number;
}) {
  return (
    <group position={position} scale={size}>
      <mesh position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.22, 0.26, 0.34, 16]} />
        <meshStandardMaterial color={ov.woodDeskDark} metalness={ov.metal.frame} roughness={ov.rough.wood} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.33, 14, 14]} />
        <meshStandardMaterial color="#2d6a4f" roughness={0.88} metalness={0.02} />
      </mesh>
      <mesh position={[0.12, 0.7, -0.08]}>
        <sphereGeometry args={[0.22, 14, 14]} />
        <meshStandardMaterial color="#1b5e3a" roughness={0.9} metalness={0.02} />
      </mesh>
      <mesh position={[-0.14, 0.72, 0.1]}>
        <sphereGeometry args={[0.2, 14, 14]} />
        <meshStandardMaterial color="#164832" roughness={0.9} metalness={0.02} />
      </mesh>
    </group>
  );
}

/** Compact task chair — seat clears table apron; back sits behind seat, not through desk */
function GlassMeetingChair({ position, rotationY }: { position: [number, number, number]; rotationY: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.06, 0.02]}>
        <cylinderGeometry args={[0.18, 0.2, 0.04, 14]} />
        <meshStandardMaterial color="#c8d0e0" metalness={0.45} roughness={0.38} />
      </mesh>
      <mesh position={[0, 0.21, 0.02]}>
        <boxGeometry args={[0.4, 0.05, 0.38]} />
        <meshStandardMaterial color="#1a2230" roughness={0.88} metalness={0.06} />
      </mesh>
      <mesh position={[0, 0.4, -0.2]}>
        <boxGeometry args={[0.38, 0.38, 0.08]} />
        <meshStandardMaterial color="#222938" roughness={0.9} metalness={0.04} />
      </mesh>
      <mesh position={[0, -0.01, 0.02]}>
        <cylinderGeometry args={[0.022, 0.022, 0.14, 8]} />
        <meshStandardMaterial color="#8b95a8" metalness={0.55} roughness={0.42} />
      </mesh>
    </group>
  );
}

/** Light real-glass read: thin + low opacity so it never reads as a solid wall */
const focusGlassMatProps = {
  color: "#eef6ff",
  metalness: 0.06,
  roughness: 0.08,
  transparent: true,
  opacity: 0.16,
  depthWrite: false,
} as const;

const FOCUS_BAY_COUNT = 3;
const FOCUS_SCALE = 1.25;

function FocusBayMeetingTable({
  woodMap,
  xC,
  cz,
  tableW,
  tableD,
  floorY,
}: {
  woodMap: ReturnType<typeof createWoodLaminateTexture>;
  xC: number;
  cz: number;
  tableW: number;
  tableD: number;
  floorY: number;
}) {
  const legH = 0.58;
  const topT = 0.07;
  const topY = floorY + legH + topT / 2;
  const legY = floorY + legH / 2;
  const lx = Math.max(0.22, tableW / 2 - 0.2);
  const lz = Math.max(0.18, tableD / 2 - 0.16);
  const leg: [number, number, number] = [0.07, legH, 0.07];
  const corners: [number, number][] = [
    [-lx, -lz],
    [lx, -lz],
    [-lx, lz],
    [lx, lz],
  ];
  return (
    <group>
      {corners.map(([ox, oz], k) => (
        <mesh key={k} position={[xC + ox, legY, cz + oz]}>
          <boxGeometry args={leg} />
          <meshStandardMaterial color={ov.metalLeg} metalness={ov.metal.leg} roughness={ov.rough.metal} />
        </mesh>
      ))}
      <mesh position={[xC, topY, cz]}>
        <boxGeometry args={[tableW, topT, tableD]} />
        <meshStandardMaterial map={woodMap} color={ov.woodDesk} roughness={ov.rough.wood} metalness={ov.metal.frame} />
      </mesh>
    </group>
  );
}

/**
 * Three built-in bays **along the side wall (Z)**, not along the window.
 * Flush to building X face + window strip; hall opens on +X (left) / −X (right).
 */
function FocusRoomBayRow({ woodMap, align }: { woodMap: ReturnType<typeof createWoodLaminateTexture>; align: "negX" | "posX" }) {
  const floorY = -0.8;
  const h = 2.46;
  const cy = floorY + h / 2;
  const shellT = 0.06;
  const glassT = 0.022;
  const isNeg = align === "negX";

  const rx = 3.25 * FOCUS_SCALE;
  const rzBay = 2.78 * FOCUS_SCALE;
  const z0 = -13.5 + shellT;
  const z3 = z0 + FOCUS_BAY_COUNT * rzBay;
  const zSpan = z3 - z0;
  const zCAll = (z0 + z3) / 2;

  const xIn = isNeg ? -19.7 + shellT : 19.7 - shellT - rx;
  const xOut = isNeg ? xIn + rx : 19.7 - shellT;
  const xC = (xIn + xOut) / 2;

  const ZB = Array.from({ length: FOCUS_BAY_COUNT + 1 }, (_, j) => z0 + j * rzBay);

  const doorW = 0.64 * FOCUS_SCALE;
  const doorPad = 0.09;

  const hallGlassX = isNeg ? xOut - glassT / 2 : xIn + glassT / 2;
  const ceilingY = floorY + h - 0.04;

  return (
    <group>
      <mesh position={[xC, cy, z0 - shellT / 2]}>
        <boxGeometry args={[rx - 0.04, h, shellT]} />
        <meshStandardMaterial map={woodMap} color={ov.woodDesk} roughness={ov.rough.wood} metalness={ov.metal.frame} />
      </mesh>

      {isNeg ? (
        <mesh position={[-19.7 + shellT / 2, cy, zCAll]}>
          <boxGeometry args={[shellT, h, zSpan]} />
          <meshStandardMaterial map={woodMap} color={ov.woodDesk} roughness={ov.rough.wood} metalness={ov.metal.frame} />
        </mesh>
      ) : (
        <mesh position={[19.7 - shellT / 2, cy, zCAll]}>
          <boxGeometry args={[shellT, h, zSpan]} />
          <meshStandardMaterial map={woodMap} color={ov.woodDesk} roughness={ov.rough.wood} metalness={ov.metal.frame} />
        </mesh>
      )}

      {[1, 2].map((j) => (
        <mesh key={`part-${align}-z-${j}`} position={[xC, cy, ZB[j]]}>
          <boxGeometry args={[rx - 0.02, h, glassT]} />
          <meshStandardMaterial {...focusGlassMatProps} />
        </mesh>
      ))}

      {[0, 1, 2].map((i) => {
        const zL = ZB[i];
        const zR = ZB[i + 1];
        const cz = (zL + zR) / 2;
        const rz = zR - zL;
        const panelAlongZ = (rz - doorW - 2 * doorPad) / 2;
        const panelAlongX = (rx - doorW - 2 * doorPad) / 2;
        const tableW = Math.min(rx - 0.68, 2.48);
        const tableD = Math.min(rz - 0.62, 1.48);
        const halfW = tableW / 2;
        const halfD = tableD / 2;
        const chairPad = 0.3;
        const sx = halfW + chairPad;
        const sz = halfD + chairPad;
        const frontGlassZ = zR - glassT / 2;
        return (
          <group key={`bay-${align}-${i}`}>
            <mesh position={[xC, floorY + 0.026, cz]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[rx - 0.08, rz - 0.08]} />
              <meshStandardMaterial color={ov.focusRoomCarpet} roughness={0.94} metalness={0.02} />
            </mesh>

            <mesh position={[xC, ceilingY, cz]}>
              <boxGeometry args={[rx - 0.06, 0.08, rz - 0.06]} />
              <meshStandardMaterial color="#e8edf5" roughness={0.75} metalness={0.06} />
            </mesh>

            <mesh position={[xC, floorY + 1.14, zL + 0.12]}>
              <boxGeometry args={[Math.min(rx - 0.25, 1.15), 0.55, 0.045]} />
              <meshStandardMaterial color="#0a0c12" roughness={0.35} metalness={0.15} emissive="#1e293b" emissiveIntensity={0.06} />
            </mesh>

            <mesh position={[hallGlassX, cy, zL + doorPad + panelAlongZ / 2]}>
              <boxGeometry args={[glassT, h, panelAlongZ]} />
              <meshStandardMaterial {...focusGlassMatProps} />
            </mesh>
            <mesh position={[hallGlassX, cy, zR - doorPad - panelAlongZ / 2]}>
              <boxGeometry args={[glassT, h, panelAlongZ]} />
              <meshStandardMaterial {...focusGlassMatProps} />
            </mesh>

            <mesh position={[xIn + doorPad + panelAlongX / 2, cy, frontGlassZ]}>
              <boxGeometry args={[panelAlongX, h, glassT]} />
              <meshStandardMaterial {...focusGlassMatProps} />
            </mesh>
            <mesh position={[xOut - doorPad - panelAlongX / 2, cy, frontGlassZ]}>
              <boxGeometry args={[panelAlongX, h, glassT]} />
              <meshStandardMaterial {...focusGlassMatProps} />
            </mesh>

            <FocusBayMeetingTable woodMap={woodMap} xC={xC} cz={cz} tableW={tableW} tableD={tableD} floorY={floorY} />

            <GlassMeetingChair
              position={[isNeg ? xC - sx : xC + sx, floorY, cz - sz]}
              rotationY={isNeg ? Math.PI / 2 : -Math.PI / 2}
            />
            <GlassMeetingChair
              position={[isNeg ? xC - sx : xC + sx, floorY, cz + sz]}
              rotationY={isNeg ? Math.PI / 2 : -Math.PI / 2}
            />
            <GlassMeetingChair
              position={[isNeg ? xC + sx : xC - sx, floorY, cz - sz]}
              rotationY={isNeg ? -Math.PI / 2 : Math.PI / 2}
            />
            <GlassMeetingChair
              position={[isNeg ? xC + sx : xC - sx, floorY, cz + sz]}
              rotationY={isNeg ? -Math.PI / 2 : Math.PI / 2}
            />
          </group>
        );
      })}
    </group>
  );
}

/** Зона отдыха: диван (сиденье + спинка + два подлокотника) + низкий стол — без «полной полосы» спереди, чтобы не путать с тумбами. */
function Lounge({
  position,
  woodMap,
}: {
  position: [number, number, number];
  woodMap: ReturnType<typeof createWoodLaminateTexture>;
}) {
  const seatW = 2.2;
  const seatD = 0.78;
  const armW = 0.2;
  const armD = 0.72;
  const armX = seatW / 2 + armW / 2;
  return (
    <group position={position}>
      <mesh position={[0, 0.24, 0.02]}>
        <boxGeometry args={[seatW, 0.28, seatD]} />
        <meshStandardMaterial color="#dd9475" roughness={ov.rough.fabric} metalness={ov.metal.low} />
      </mesh>
      <mesh position={[0, 0.42, -0.32]}>
        <boxGeometry args={[seatW + 0.04, 0.42, 0.14]} />
        <meshStandardMaterial color="#7a431f" roughness={0.85} metalness={ov.metal.low} />
      </mesh>
      <mesh position={[-armX, 0.245, 0.02]}>
        <boxGeometry args={[armW, 0.5, armD]} />
        <meshStandardMaterial color="#7a431f" roughness={0.85} metalness={ov.metal.low} />
      </mesh>
      <mesh position={[armX, 0.245, 0.02]}>
        <boxGeometry args={[armW, 0.5, armD]} />
        <meshStandardMaterial color="#7a431f" roughness={0.85} metalness={ov.metal.low} />
      </mesh>

      <mesh position={[0.0, 0.26, 1.05]}>
        <boxGeometry args={[1.2, 0.06, 0.62]} />
        <meshStandardMaterial map={woodMap} color={ov.woodDesk} roughness={ov.rough.wood} metalness={ov.metal.frame} />
      </mesh>
      <mesh position={[-0.5, 0.13, 1.05]}>
        <boxGeometry args={[0.06, 0.26, 0.06]} />
        <meshStandardMaterial color={ov.metalLeg} roughness={ov.rough.metal} metalness={ov.metal.leg} />
      </mesh>
      <mesh position={[0.5, 0.13, 1.05]}>
        <boxGeometry args={[0.06, 0.26, 0.06]} />
        <meshStandardMaterial color={ov.metalLeg} roughness={ov.rough.metal} metalness={ov.metal.leg} />
      </mesh>
    </group>
  );
}

function AreaRug({
  position,
  size,
  rotationY = 0,
  fabricMap,
  tint = ov.rugTintA,
}: {
  position: [number, number, number];
  size: [number, number];
  rotationY?: number;
  fabricMap: ReturnType<typeof createFabricNoiseTexture>;
  tint?: string;
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, rotationY]} position={position}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={fabricMap} color={tint} roughness={ov.rough.matte} metalness={0.0} />
    </mesh>
  );
}

function WaterCooler({ position }: { position: [number, number, number] }) {
  const bodyTopY = 0.55 + 0.55;
  /** Перевёрнутая бутыль: горловина вниз в кулер, толстый бочок сверху. */
  const jugR = 0.22;
  const jugH = 0.4;
  const neckR = 0.07;
  const neckH = 0.14;
  const neckCy = bodyTopY - neckH * 0.6;
  const neckTopY = neckCy + neckH * 0.5;
  const shoulderH = 0.1;
  const shoulderCy = neckTopY + shoulderH * 0.5;
  const shoulderTopY = shoulderCy + shoulderH * 0.5;
  const jugCy = shoulderTopY + jugH * 0.5;
  const jugMat = {
    color: "#9fd4ea" as const,
    emissive: "#5a8aa8" as const,
    emissiveIntensity: 0.08,
    roughness: 0.18,
    metalness: 0.06,
    transparent: true,
    opacity: 0.9,
  };
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.42, 1.1, 0.42]} />
        <meshStandardMaterial color="#FFFFFF" metalness={0.22} roughness={0.58} />
      </mesh>
      <mesh position={[0, 0.62, 0.21]}>
        <boxGeometry args={[0.34, 0.55, 0.02]} />
        <meshStandardMaterial
          color={ov.ink}
          emissive="#8ec5d9"
          emissiveIntensity={0.06}
          roughness={0.4}
          metalness={0.12}
        />
      </mesh>
      <mesh position={[0, bodyTopY - 0.01, 0]}>
        <cylinderGeometry args={[0.092, 0.098, 0.026, 16]} />
        <meshStandardMaterial color="#1a222c" roughness={0.52} metalness={0.22} />
      </mesh>
      <mesh position={[0, neckCy, 0]}>
        <cylinderGeometry args={[neckR, neckR, neckH, 16]} />
        <meshStandardMaterial
          color="#7ab8d4"
          emissive="#4a7894"
          emissiveIntensity={0.05}
          roughness={0.35}
          metalness={0.1}
          transparent
          opacity={0.92}
        />
      </mesh>
      <mesh position={[0, shoulderCy, 0]}>
        <cylinderGeometry args={[jugR, neckR + 0.006, shoulderH, 18]} />
        <meshStandardMaterial {...jugMat} />
      </mesh>
      <mesh position={[0, jugCy, 0]}>
        <cylinderGeometry args={[jugR, jugR, jugH, 16]} />
        <meshStandardMaterial {...jugMat} />
      </mesh>
    </group>
  );
}

function Bookshelf({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[1.1, 2.1, 0.35]} />
        <meshStandardMaterial color={ov.woodDeskDark} metalness={ov.metal.frame} roughness={ov.rough.wood} />
      </mesh>
      {[-0.75, -0.25, 0.25, 0.75].map((yOff, i) => (
        <mesh key={i} position={[0, yOff, 0.18]}>
          <boxGeometry args={[0.95, 0.04, 0.28]} />
          <meshStandardMaterial color={ov.ink} metalness={ov.metal.frame} roughness={0.8} />
        </mesh>
      ))}
      {Array.from({ length: 18 }).map((_, i) => {
        const x = -0.35 + (i % 6) * 0.14;
        const y = 0.35 + Math.floor(i / 6) * 0.22;
        const h = 0.16 + (i % 3) * 0.02;
        const c =
          i % 4 === 0 ? ov.accentViolet : i % 4 === 1 ? ov.accentCyan : i % 4 === 2 ? ov.accentAmber : "#d8dee9";
        return (
          <mesh key={`b-${i}`} position={[x, y, 0.12]}>
            <boxGeometry args={[0.08, h, 0.18]} />
            <meshStandardMaterial color={c} roughness={0.82} metalness={0.04} />
          </mesh>
        );
      })}
    </group>
  );
}

function Whiteboard({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 1.35, 0.02]}>
        <boxGeometry args={[2.4, 1.35, 0.06]} />
        <meshStandardMaterial color="#f4f7fb" roughness={0.55} metalness={0.02} />
      </mesh>
      <mesh position={[0, 1.35, 0]}>
        <boxGeometry args={[2.55, 1.5, 0.04]} />
        <meshStandardMaterial color={ov.ink} metalness={ov.metal.frame} roughness={0.78} />
      </mesh>
      <mesh position={[-0.9, 1.05, 0.04]}>
        <boxGeometry args={[0.02, 0.02, 0.02]} />
        <meshStandardMaterial color="#c45c52" emissive="#b91c1c" emissiveIntensity={0.06} />
      </mesh>
    </group>
  );
}

function TrashBin({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.18, 0.2, 0.56, 18]} />
        <meshStandardMaterial color="grey" metalness={0.28} roughness={0.52} />
      </mesh>
      <mesh position={[0, 0.58, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.06, 18]} />
        <meshStandardMaterial color="grey" metalness={0.32} roughness={0.48} />
      </mesh>
    </group>
  );
}

function CoffeeStation({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  const baseH = 0.28;
  const baseY = baseH / 2;
  const bodyH = 0.9;
  const bodyY = baseH + bodyH / 2;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, baseY, 0]}>
        <boxGeometry args={[1.06, baseH, 0.62]} />
        <meshStandardMaterial color="#7a3f00" metalness={ov.metal.leg} roughness={ov.rough.metal} />
      </mesh>
      <mesh position={[0, bodyY, 0]}>
        <boxGeometry args={[0.95, bodyH, 0.55]} />
        <meshStandardMaterial color="#dd9475" metalness={0.12} roughness={0.72} />
      </mesh>
      <mesh position={[0.18, bodyY + 0.3, 0.28]}>
        <boxGeometry args={[0.34, 0.22, 0.06]} />
        <meshStandardMaterial
          color="#42aaff"
          emissive={ov.accentAmber}
          emissiveIntensity={0.045}
          roughness={0.48}
          metalness={0.12}
        />
      </mesh>
      <mesh position={[-0.22, bodyY + 0.05, 0.28]}>
        <cylinderGeometry args={[0.05, 0.05, 0.22, 12]} />
        <meshStandardMaterial color="#7a3f00" metalness={0.4} roughness={0.38} />
      </mesh>
    </group>
  );
}

function WallPoster({
  position,
  rotationY,
  accent,
}: {
  position: [number, number, number];
  rotationY: number;
  accent: string;
}) {
  const frameT = 0.055;
  const outerW = 1.72;
  const outerH = 1.12;
  const matZ = 0.038;
  const artZ = 0.056;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* outer frame */}
      <mesh position={[0, 0, 0.018]}>
        <boxGeometry args={[outerW, outerH, 0.05]} />
        <meshStandardMaterial color={ov.woodDeskDark} roughness={ov.rough.wood} metalness={ov.metal.frame} />
      </mesh>
      {/* mat */}
      <mesh position={[0, 0, matZ]}>
        <boxGeometry args={[1.52, 0.92, 0.012]} />
        <meshStandardMaterial color="#ebe6dc" roughness={0.92} metalness={0.0} />
      </mesh>
      {/* art plane */}
      <mesh position={[0, 0, artZ]}>
        <boxGeometry args={[1.28, 0.68, 0.014]} />
        <meshStandardMaterial color={ov.ink} emissive={accent} emissiveIntensity={0.055} roughness={0.9} metalness={0.0} />
      </mesh>
      {/* thin frame lip */}
      <mesh position={[0, outerH / 2 - frameT / 2, artZ + 0.01]}>
        <boxGeometry args={[outerW + 0.02, frameT, 0.02]} />
        <meshStandardMaterial color={ov.ink} roughness={0.75} metalness={0.08} />
      </mesh>
      <mesh position={[0, -outerH / 2 + frameT / 2, artZ + 0.01]}>
        <boxGeometry args={[outerW + 0.02, frameT, 0.02]} />
        <meshStandardMaterial color={ov.ink} roughness={0.75} metalness={0.08} />
      </mesh>
      <mesh position={[outerW / 2 - frameT / 2, 0, artZ + 0.01]}>
        <boxGeometry args={[frameT, outerH, 0.02]} />
        <meshStandardMaterial color={ov.ink} roughness={0.75} metalness={0.08} />
      </mesh>
      <mesh position={[-outerW / 2 + frameT / 2, 0, artZ + 0.01]}>
        <boxGeometry args={[frameT, outerH, 0.02]} />
        <meshStandardMaterial color={ov.ink} roughness={0.75} metalness={0.08} />
      </mesh>
    </group>
  );
}

/** Perimeter trim where walls meet floor — sells “finished interior” */
function FloorTrim() {
  const h = 0.11;
  const y = -0.8 + h / 2;
  const t = 0.07;
  const spanZ = 25.4;
  const spanX = 39.0;
  return (
    <group>
      <mesh position={[-19.66, y, -2]}>
        <boxGeometry args={[t, h, spanZ]} />
        <meshStandardMaterial color={ov.trim} roughness={0.78} metalness={0.04} />
      </mesh>
      <mesh position={[19.66, y, -2]}>
        <boxGeometry args={[t, h, spanZ]} />
        <meshStandardMaterial color={ov.trim} roughness={0.78} metalness={0.04} />
      </mesh>
      <mesh position={[0, y, -13.44]}>
        <boxGeometry args={[spanX, h, t]} />
        <meshStandardMaterial color={ov.trim} roughness={0.78} metalness={0.04} />
      </mesh>
      <mesh position={[0, y, 9.84]}>
        <boxGeometry args={[spanX, h, t]} />
        <meshStandardMaterial color={ov.trim} roughness={0.78} metalness={0.04} />
      </mesh>
    </group>
  );
}

/**
 * Северная стена: рама вокруг проёма 32×3 под стекло (как у текущего mesh glass).
 * Сплошной slab перекрывал CityBackdrop — «стекло» не могло быть прозрачным по смыслу.
 */
function NorthWindowWallFrame() {
  const z = -13.8;
  return (
    <group>
      <mesh position={[-18, 1.0, z]}>
        <boxGeometry args={[4, 4.2, 0.6]} />
        <meshStandardMaterial color={ov.windowWallOuter} metalness={ov.metal.frame} roughness={ov.rough.wall} />
      </mesh>
      <mesh position={[18, 1.0, z]}>
        <boxGeometry args={[4, 4.2, 0.6]} />
        <meshStandardMaterial color={ov.windowWallOuter} metalness={ov.metal.frame} roughness={ov.rough.wall} />
      </mesh>
      <mesh position={[0, 2.9, z]}>
        <boxGeometry args={[32, 0.4, 0.6]} />
        <meshStandardMaterial color={ov.windowWallOuter} metalness={ov.metal.frame} roughness={ov.rough.wall} />
      </mesh>
      <mesh position={[0, -0.7, z]}>
        <boxGeometry args={[32, 0.8, 0.6]} />
        <meshStandardMaterial color={ov.windowWallOuter} metalness={ov.metal.frame} roughness={ov.rough.wall} />
      </mesh>
    </group>
  );
}

/**
 * Рама на стекле: центр как у glass [0,1.2,-13.49], верх/низ по кромке проёма (высота 3).
 * Z чуть севернее центра стекла — утоплены в плоскость окна, не «висят» перед ним.
 */
function WindowMullions() {
  const xs = [-12, -6, 0, 6, 12];
  const barZ = 0.045;
  const crossW = 33.0;
  const crossH = 0.09;
  const vertW = 0.07;
  const vertH = 3.0;
  return (
    <group position={[0, 1.2, -13.505]}>
      {xs.map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <boxGeometry args={[vertW, vertH, barZ]} />
          <meshStandardMaterial color={ov.ink} metalness={ov.metal.frame} roughness={0.75} />
        </mesh>
      ))}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[crossW, crossH, barZ]} />
        <meshStandardMaterial color={ov.ink} metalness={ov.metal.frame} roughness={0.75} />
      </mesh>
      <mesh position={[0, -1.5, 0]}>
        <boxGeometry args={[crossW, crossH, barZ]} />
        <meshStandardMaterial color={ov.ink} metalness={ov.metal.frame} roughness={0.75} />
      </mesh>
    </group>
  );
}

function materialSkipsShadowCast(m: object): boolean {
  return (
    "transparent" in m &&
    Boolean((m as { transparent?: boolean }).transparent) &&
    "depthWrite" in m &&
    (m as { depthWrite?: boolean }).depthWrite === false
  );
}

function applyLevelMeshShadowFlags(root: Group) {
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    const flag = obj.userData.shadow as "none" | "receiveOnly" | undefined;
    if (flag === "none") {
      obj.castShadow = false;
      obj.receiveShadow = false;
      return;
    }
    if (flag === "receiveOnly") {
      obj.castShadow = false;
      obj.receiveShadow = true;
      return;
    }
    const mat = obj.material;
    const mats = Array.isArray(mat) ? mat : mat ? [mat] : [];
    const skipCast = mats.some((m) => m && typeof m === "object" && materialSkipsShadowCast(m));
    obj.receiveShadow = true;
    let cast = !skipCast;
    if (cast && obj.geometry) {
      if (!obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere();
      const r = obj.geometry.boundingSphere?.radius ?? 0;
      /** Сотни микромешей в одном shadow-pass дают пустой/сломаный результат на части драйверов. */
      if (r > 0 && r < 0.22) cast = false;
    }
    obj.castShadow = cast;
  });
}

/** Applies cast/receive shadow flags to level geometry (opt-out via mesh.userData.shadow). */
function LevelShadowGroup({ children }: { children: ReactNode }) {
  const rootRef = useRef<Group>(null);
  const apply = () => {
    const root = rootRef.current;
    if (root) applyLevelMeshShadowFlags(root);
  };
  useLayoutEffect(() => {
    apply();
  }, []);
  useEffect(() => {
    apply();
  }, []);
  return <group ref={rootRef}>{children}</group>;
}

/**
 * Ключевой directional с тенями. `DEBUG_OVERHEAD_SUN` — тест «с неба».
 * Target должен быть в сцене: `scene.add(light.target)` (three.js).
 */
function SunDirectional() {
  const scene = useThree((s) => s.scene);
  const ref = useRef<DirectionalLight | null>(null);

  useLayoutEffect(() => {
    const L = ref.current;
    if (!L) return;

    L.castShadow = true;
    L.shadow.mapSize.set(1024, 1024);
    L.shadow.bias = 0;
    L.shadow.normalBias = DEBUG_OVERHEAD_SUN ? 0.004 : 0.008;
    const cam = L.shadow.camera;
    cam.near = 0.05;
    cam.far = 130;
    cam.left = -48;
    cam.right = 48;
    cam.top = 48;
    cam.bottom = -48;
    cam.updateProjectionMatrix();

    if (DEBUG_OVERHEAD_SUN) {
      L.target.position.set(OVERHEAD_SUN_TARGET[0], OVERHEAD_SUN_TARGET[1], OVERHEAD_SUN_TARGET[2]);
    } else {
      L.target.position.set(0, 0.4, 3.5);
    }
    if (L.target.parent !== scene) {
      scene.add(L.target);
    }

    return () => {
      if (L.target.parent === scene) {
        scene.remove(L.target);
      }
    };
  }, [scene]);

  return (
    <directionalLight
      key={DEBUG_OVERHEAD_SUN ? "overhead" : "window"}
      ref={ref}
      castShadow
      name={DEBUG_OVERHEAD_SUN ? "debugOverheadSun" : "windowSun"}
      position={
        DEBUG_OVERHEAD_SUN ? ([...OVERHEAD_SUN_POS] as [number, number, number]) : ([...ov.windowKey.pos] as [number, number, number])
      }
      intensity={DEBUG_OVERHEAD_SUN ? OVERHEAD_SUN_INTENSITY : ov.windowKey.intensity}
      color={ov.windowKey.color}
    />
  );
}

/** Северный газон — совпадает с mesh `position={[-3,-0.798,-15.84]}`, `planeGeometry [58,4.65]`. */
const N_LAWN_CX = -3;
const N_LAWN_Y = -0.798;
const N_LAWN_CZ = -15.84;
const N_LAWN_HALF_X = 58 / 2;
const N_LAWN_HALF_Z = 4.65 / 2;

const N_LAWN_BLADE_SHORT = 4200;
const N_LAWN_BLADE_TALL = 900;

type LawnBlade = { x: number; z: number; h: number; ry: number; tilt: number; sx: number; sz: number };

function makeLawnBladeData(count: number, salt: number, hMin: number, hStep: number, hMods: number, southBias: number): LawnBlade[] {
  const z0 = N_LAWN_CZ - N_LAWN_HALF_Z + 0.06;
  const z1 = N_LAWN_CZ + N_LAWN_HALF_Z - 0.06;
  const x0 = N_LAWN_CX - N_LAWN_HALF_X * 0.97;
  const x1 = N_LAWN_CX + N_LAWN_HALF_X * 0.97;
  const arr: LawnBlade[] = [];
  for (let i = 0; i < count; i++) {
    const u = Math.sin(i * 12.9898 + salt) * 0.5 + 0.5;
    const rawV = Math.sin(i * 79.233 + salt * 0.31) * 0.5 + 0.5;
    const v = Math.pow(Math.max(1e-5, rawV), southBias);
    const x = x0 + u * (x1 - x0);
    const z = z0 + v * (z1 - z0);
    const h = hMin + (i % hMods) * hStep;
    const ry = Math.sin(i * 44.7 + salt) * Math.PI;
    const tilt = 0.04 + (i % 7) * 0.026;
    const sx = 0.75 + (i % 6) * 0.1;
    const sz = 0.8 + (i % 5) * 0.12;
    arr.push({ x, z, h, ry, tilt, sx, sz });
  }
  return arr;
}

function writeLawnMatrices(inst: InstancedMesh, dummy: Object3D, data: LawnBlade[], baseH: number, y: number) {
  for (let i = 0; i < data.length; i++) {
    const { x, z, h, ry, tilt, sx, sz } = data[i];
    dummy.position.set(x, y + h * 0.5, z);
    dummy.rotation.set(tilt, ry, tilt * 0.32);
    dummy.scale.set(sx, h / baseH, sz);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
}

/** Два слоя травы: плотный «кипящий» газон + реже — высокие стебли (читается с дистанции). */
function NorthLawnGrassBlades() {
  const refShort = useRef<InstancedMesh>(null);
  const refTall = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const geomShort = useMemo(() => new BoxGeometry(0.017, 0.09, 0.013), []);
  const geomTall = useMemo(() => new BoxGeometry(0.014, 0.15, 0.011), []);
  const matShort = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#2f4a36",
        emissive: "#141c14",
        emissiveIntensity: 0.028,
        roughness: 0.93,
        metalness: 0,
      }),
    [],
  );
  const matTall = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#4a6e52",
        emissive: "#243828",
        emissiveIntensity: 0.055,
        roughness: 0.88,
        metalness: 0,
      }),
    [],
  );
  const dataShort = useMemo(
    () => makeLawnBladeData(N_LAWN_BLADE_SHORT, 101, 0.045, 0.012, 10, 0.52),
    [],
  );
  const dataTall = useMemo(
    () => makeLawnBladeData(N_LAWN_BLADE_TALL, 707, 0.09, 0.022, 12, 0.45),
    [],
  );

  useLayoutEffect(() => {
    if (refShort.current) writeLawnMatrices(refShort.current, dummy, dataShort, 0.09, N_LAWN_Y);
    if (refTall.current) writeLawnMatrices(refTall.current, dummy, dataTall, 0.15, N_LAWN_Y);
  }, [dataShort, dataTall, dummy]);

  useEffect(() => {
    return () => {
      geomShort.dispose();
      geomTall.dispose();
      matShort.dispose();
      matTall.dispose();
    };
  }, [geomShort, geomTall, matShort, matTall]);

  return (
    <group>
      <instancedMesh ref={refShort} args={[geomShort, matShort, N_LAWN_BLADE_SHORT]} userData={{ shadow: "none" as const }} />
      <instancedMesh ref={refTall} args={[geomTall, matTall, N_LAWN_BLADE_TALL]} userData={{ shadow: "none" as const }} />
    </group>
  );
}

export function TrainingHubLevel() {
  const wallTex = useMemo(() => createConcreteTexture({ base: ov.wallTexBase, seed: 1201 }), []);
  const floorTex = useMemo(
    () =>
      createParquetTexture({
        seed: 443,
        base: ov.parquetBase,
        joint: ov.parquetJoint,
        repeatU: ov.parquetRepeat[0],
        repeatV: ov.parquetRepeat[1],
      }),
    [],
  );
  const soilTex = useMemo(() => createSoilTexture({ seed: 9003 }), []);
  const rugTexA = useMemo(() => createFabricNoiseTexture({ base: "#cfd6e4", seed: 501 }), []);
  const rugTexB = useMemo(() => createFabricNoiseTexture({ base: "#c5ccda", seed: 502 }), []);
  const woodTex = useMemo(
    () =>
      createWoodLaminateTexture({
        seed: 3101,
        base: ov.woodDesk,
        grain: ov.woodDeskDark,
      }),
    [],
  );
  const ceilingTex = useMemo(() => createCeilingTileTexture({ seed: 6201, base: ov.ceiling, line: ov.ceilingGridEmissive }), []);

  /** Трава за окном: приглушённый тон + мелкий шум — не «плашка», через стекло читается как дальний газон. */
  const grassFieldTex = useMemo(() => {
    const t = createFabricNoiseTexture({ base: "#036f1e", seed: 8842 });
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(28, 4.5);
    return t;
  }, []);

  /** Паркет не уходит севернее стекла — иначе через transmission виден «пол за окном». */
  const floorZNorth = -13.46;
  const floorZSouth = 27;
  const floorDepthZ = floorZSouth - floorZNorth;
  const floorCenterZ = (floorZSouth + floorZNorth) / 2;

  return (
    <>
      <color attach="background" args={[ov.background]} />
      <fog attach="fog" args={[ov.fog, ov.fogNear, ov.fogFar]} />

      <ambientLight intensity={ov.ambient.intensity} color={ov.ambient.color} />
      <hemisphereLight args={[ov.hemisphere.sky, ov.hemisphere.ground, ov.hemisphere.intensity]} position={[0, 2.4, 0]} />
      <directionalLight
        position={[...ov.fillDir.pos]}
        intensity={ov.fillDir.intensity}
        color={ov.fillDir.color}
        castShadow={false}
      />

      {ov.zonePoints.map((L, i) => (
        <pointLight key={i} position={[...L.pos]} intensity={L.intensity} color={L.color} distance={L.distance} decay={2} />
      ))}

      <SunDirectional />

      {ov.ceilingPanels.map((p, i) => (
        <CeilingLight key={i} position={[...p.pos]} size={[...p.size]} intensity={p.intensity} />
      ))}

      <LevelShadowGroup>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, floorCenterZ]} userData={{ shadow: "receiveOnly" as const }}>
        <planeGeometry args={[54, floorDepthZ]} />
        <meshStandardMaterial
          color={ov.floorTint}
          map={floorTex}
          metalness={0.04}
          roughness={ov.floorRoughness}
        />
      </mesh>

      <FloorTrim />

      {/* Не castShadow: иначе плоскость «закрывает» солнце с окна и даёт гигантскую тень на пол. */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.06, -2]} userData={{ shadow: "none" as const }}>
        <planeGeometry args={[40, 26]} />
        <meshStandardMaterial
          map={ceilingTex}
          color={ov.ceiling}
          roughness={ov.rough.matte}
          metalness={ov.metal.low}
          emissive={ov.ceilingGridEmissive}
          emissiveIntensity={0.06}
        />
      </mesh>

      {/* South shell: keep WELL behind follow-cam (player z≤9.5 + behind≤~7.6 → cam z≤~17.1) or it fills the whole frame */}
      <mesh position={[0, 1.0, 18.4]}>
        <boxGeometry args={[40, 4.2, 0.6]} />
        <meshStandardMaterial color={ov.wallPaint} map={wallTex} metalness={ov.metal.low} roughness={ov.rough.wall} />
      </mesh>
      <mesh position={[-20.0, 1.0, -2.0]}>
        <boxGeometry args={[0.6, 4.2, 26]} />
        <meshStandardMaterial color={ov.wallPaint} map={wallTex} metalness={ov.metal.low} roughness={ov.rough.wall} />
      </mesh>
      <mesh position={[20.0, 1.0, -2.0]}>
        <boxGeometry args={[0.6, 4.2, 26]} />
        <meshStandardMaterial color={ov.wallPaint} map={wallTex} metalness={ov.metal.low} roughness={ov.rough.wall} />
      </mesh>

      <CityBackdrop />

      <NorthWindowWallFrame />
      {/* Газон снаружи: только горизонталь, севернее стекла; без вертикали — она закрывала половину проёма */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3, -0.798, -15.84]} userData={{ shadow: "none" as const }}>
        <planeGeometry args={[58, 4.65]} />
        <meshStandardMaterial
          map={grassFieldTex}
          color="#c8e0c8"
          emissive="#1a2820"
          emissiveIntensity={0.04}
          roughness={0.94}
          metalness={0.02}
        />
      </mesh>
      <NorthLawnGrassBlades />
      <mesh position={[0, 1.2, -13.49]} userData={{ shadow: "none" as const }}>
        <boxGeometry args={[32, 3.0, 0.06]} />
        <meshPhysicalMaterial
          color="#dce8f8"
          metalness={0.04}
          roughness={0.06}
          transmission={0.97}
          thickness={0.035}
          ior={1.48}
          transparent
          envMapIntensity={0.5}
          attenuationColor="#b8c8e8"
          attenuationDistance={14}
        />
      </mesh>
      <WindowMullions />

      <AreaRug position={[0, -0.795, -0.6]} size={[9, 5.5]} rotationY={0} fabricMap={rugTexA} tint={ov.rugTintA} />
      <AreaRug position={[-12, -0.795, 5.0]} size={[7.5, 4.8]} rotationY={0.04} fabricMap={rugTexB} tint={ov.rugTintB} />
      <AreaRug position={[12, -0.795, 5.0]} size={[7.5, 4.8]} rotationY={-0.04} fabricMap={rugTexB} tint={ov.rugTintB} />

      <WaterCooler position={[-2.2, -0.8, 8.6]} />
      <WaterCooler position={[2.2, -0.8, 8.6]} />

      {/* shelves: flush to inner wall face (x = ±19.7) */}
      <Bookshelf position={[-19.525, -0.8, 2.0]} rotationY={Math.PI / 2} />
      <Bookshelf position={[19.525, -0.8, 2.0]} rotationY={-Math.PI / 2} />

      {/* boards: YZ wall → rotate so thin axis is ±X, face opens into room */}
      <Whiteboard position={[-19.62, -0.8, -6.0]} rotationY={Math.PI / 2} />
      <Whiteboard position={[19.62, -0.8, -6.0]} rotationY={-Math.PI / 2} />

      <TrashBin position={[-1.1, -0.8, 8.1]} />
      <TrashBin position={[1.1, -0.8, 8.1]} />
      <TrashBin position={[-10.5, -0.8, -10.2]} />

      {/* Сбоку от Lounge (−X), чтобы не пересекаться с зоной / NPC справа */}
      <CoffeeStation position={[-2.35, -0.8, -9.02]} rotationY={Math.PI * 0.48 - Math.PI / 2} />

      <WallPoster position={[-19.62, 1.55, 5.6]} rotationY={Math.PI / 2} accent={ov.accentViolet} />
      <WallPoster position={[-19.62, 1.55, -1.2]} rotationY={Math.PI / 2} accent={ov.accentCyan} />
      <WallPoster position={[19.62, 1.55, 2.4]} rotationY={-Math.PI / 2} accent={ov.accentAmber} />

      {/* zone separators: low office sideboards (no huge purple planes) */}
      <LowPlanterRow position={[-6.5, -0.8, -5.5]} length={6.0} rotationY={Math.PI / 2} seed={11} soilMap={soilTex} />
      <LowPlanterRow position={[-6.5, -0.8, 0.0]} length={6.0} rotationY={Math.PI / 2} seed={12} soilMap={soilTex} />
      <LowPlanterRow position={[6.5, -0.8, -5.5]} length={6.0} rotationY={Math.PI / 2} seed={13} soilMap={soilTex} />
      <LowPlanterRow position={[6.5, -0.8, 0.0]} length={6.0} rotationY={Math.PI / 2} seed={14} soilMap={soilTex} />

      {/* front separators with doorway gap */}
      <LowPlanterRow position={[-4.1, -0.8, 2.2]} length={5.0} rotationY={0} seed={21} soilMap={soilTex} />
      <LowPlanterRow position={[4.1, -0.8, 2.2]} length={5.0} rotationY={0} seed={22} soilMap={soilTex} />

      {/* ZONES */}
      {/* Open space: desk grid */}
      {[-1, 0, 1].flatMap((row) =>
        [-1, 0, 1, 2].map((col) => {
          const x = -15.0 + col * 3.2;
          const z = 6.5 - row * 2.4;
          const busy = (col + row * 0.6 + 0.8) % 1;
          return (
            <DeskStation key={`desk-${row}-${col}`} position={[x, -0.8, z]} rotationY={Math.PI} busy={busy} woodMap={woodTex} />
          );
        }),
      )}
      {[-1, 0, 1].flatMap((row) =>
        [-1, 0, 1, 2].map((col) => {
          const x = 15.0 - col * 3.2;
          const z = 6.5 - row * 2.4;
          const busy = (0.3 + col * 0.27 + row * 0.4) % 1;
          return (
            <DeskStation key={`deskR-${row}-${col}`} position={[x, -0.8, z]} rotationY={Math.PI} busy={busy} woodMap={woodTex} />
          );
        }),
      )}

      {/* Meeting room: table + frame */}
      <group position={[0, -0.8, 4.6]}>
        <mesh position={[0, 0.65, 0]}>
          <boxGeometry args={[4.8, 0.12, 1.8]} />
          <meshStandardMaterial map={woodTex} color={ov.woodDesk} metalness={ov.metal.frame} roughness={ov.rough.wood} />
        </mesh>
        <mesh position={[-2.1, 0.32, 0.7]}>
          <boxGeometry args={[0.1, 0.64, 0.1]} />
          <meshStandardMaterial color={ov.metalLeg} metalness={ov.metal.leg} roughness={ov.rough.metal} />
        </mesh>
        <mesh position={[2.1, 0.32, 0.7]}>
          <boxGeometry args={[0.1, 0.64, 0.1]} />
          <meshStandardMaterial color={ov.metalLeg} metalness={ov.metal.leg} roughness={ov.rough.metal} />
        </mesh>
        <mesh position={[-2.1, 0.32, -0.7]}>
          <boxGeometry args={[0.1, 0.64, 0.1]} />
          <meshStandardMaterial color={ov.metalLeg} metalness={ov.metal.leg} roughness={ov.rough.metal} />
        </mesh>
        <mesh position={[2.1, 0.32, -0.7]}>
          <boxGeometry args={[0.1, 0.64, 0.1]} />
          <meshStandardMaterial color={ov.metalLeg} metalness={ov.metal.leg} roughness={ov.rough.metal} />
        </mesh>
        {/* wall display removed: was read as a “big rectangle” in camera view */}
      </group>

      {/* Break room / lounge */}
      <Lounge position={[0.0, -0.8, -9.0]} woodMap={woodTex} />
      <Plant position={[-3.4, -0.8, -9.2]} size={1.05} />
      <Plant position={[3.6, -0.8, -9.0]} size={0.95} />

      {/* Glass focus rooms — 3 bays each side, built into shell + window row */}
      <FocusRoomBayRow woodMap={woodTex} align="negX" />
      <FocusRoomBayRow woodMap={woodTex} align="posX" />

      </LevelShadowGroup>

      <Environment preset="city" environmentIntensity={ov.environmentIntensity} resolution={128} />
    </>
  );
}

