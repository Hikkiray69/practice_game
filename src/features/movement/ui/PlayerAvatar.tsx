"use client";

import { useFrame } from "@react-three/fiber";
import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import {
  CircleGeometry,
  ConeGeometry,
  DoubleSide,
  Euler,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import { defaultMovementConfig } from "@/features/movement/model/types";
import { playOverloadFartSound, preloadOverloadFartAudio } from "@/features/movement/lib/overloadFartAudio";
import { createFabricNoiseTexture } from "@/shared/lib/threeTextures";

/** Совпадает с полом `TrainingHubLevel` (`mesh` на y = -0.8). */
const FLOOR_Y = -0.8;
/** Пивот вращения перегруза / полёта — торс (~пояс), иначе ось в ногах уводит силуэт под пол. */
const CHARACTER_SPIN_PIVOT_Y = 0.86;

const SPACE_CHARGE_SEC = 5;
const OVERLOAD_SEC = 5;
const SPLAT_COUNT = 160;
/** Локальный Y группы брызг под корнем игрока (как в JSX). */
const SPLAT_GROUP_LOCAL_Y = 0.22;
/** Пятна на полу: инстансы в мировых координатах, кольцевой буфер. */
const STAIN_MAX = 440;
/** Чуть выше `FLOOR_Y`, без z-fight с плейном пола. */
const STAIN_Y_ABOVE_FLOOR = 0.026;
/** Порог попадания капли на пол (мировой Y), с запасом на дискретный шаг. */
const STAIN_FLOOR_HIT = 0.075;

/**
 * Единый цвет без instanceColor: иначе MeshBasic + InstancedMesh + vertexColors
 * даёт чёрные капли/пятна в ряде сборок WebGL.
 */
/** Летающие капли — тёмно-коричневый, почти как шоколадная грязь. */
const SPLAT_MATERIAL_COLOR = "#6a4a32";
/** Лужи на полу ещё темнее капель. */
const STAIN_MATERIAL_COLOR = "#4d3524";

const UNDERFOOT_SLUDGE_INTERVAL_OVERLOAD = 0.048;
const UNDERFOOT_SLUDGE_INTERVAL_JET = 0.062;
const UNDERFOOT_SLUDGE_BATCH_OVERLOAD = 3;
const UNDERFOOT_SLUDGE_BATCH_JET = 2;

function commitFloorStain(
  stainMesh: InstancedMesh,
  dummy: Object3D,
  stainWrite: number,
  wx: number,
  wz: number,
  seed: number,
): number {
  const idx = stainWrite % STAIN_MAX;
  dummy.position.set(wx, FLOOR_Y + STAIN_Y_ABOVE_FLOOR, wz);
  dummy.rotation.set(-Math.PI / 2, 0, 0);
  // Равномерный масштаб: круг остаётся кругом (без эллипса).
  const s = 0.18 + (seed % 60) / 85;
  dummy.scale.setScalar(s);
  dummy.updateMatrix();
  stainMesh.setMatrixAt(idx, dummy.matrix);
  stainMesh.instanceMatrix.needsUpdate = true;
  return stainWrite + 1;
}

/** Крупная лужа под персонажем (мировой XZ — как тень на полу, даже в полёте). */
function commitUnderfootSludge(
  stainMesh: InstancedMesh,
  dummy: Object3D,
  stainWrite: number,
  wx: number,
  wz: number,
  seed: number,
): number {
  const idx = stainWrite % STAIN_MAX;
  dummy.position.set(wx, FLOOR_Y + STAIN_Y_ABOVE_FLOOR + 0.002, wz);
  dummy.rotation.set(-Math.PI / 2, 0, 0);
  const UNDERFOOT_SLUDGE_SCALE = 3;
  // Равномерный масштаб: лужа параллельна полу и не растягивается в эллипс.
  const s = (0.5 + (seed % 70) / 52) * UNDERFOOT_SLUDGE_SCALE;
  dummy.scale.setScalar(s);
  dummy.updateMatrix();
  stainMesh.setMatrixAt(idx, dummy.matrix);
  stainMesh.instanceMatrix.needsUpdate = true;
  return stainWrite + 1;
}

function spawnUnderfootSludgeBatch(
  stainMesh: InstancedMesh,
  dummy: Object3D,
  stainWrite: number,
  group: Group,
  timeKey: number,
  batch: number,
): number {
  let w = stainWrite;
  for (let b = 0; b < batch; b++) {
    const seed = timeKey * 131 + b * 977 + batch * 19;
    const jx = (((seed * 17) % 100) / 100 - 0.5) * 1.05;
    const jz = (((seed * 31) % 100) / 100 - 0.5) * 1.05;
    const cy = Math.cos(group.rotation.y);
    const sy = Math.sin(group.rotation.y);
    const wx = group.position.x + jx * cy + jz * sy;
    const wz = group.position.z - jx * sy + jz * cy;
    w = commitUnderfootSludge(stainMesh, dummy, w, wx, wz, seed);
  }
  return w;
}

function respawnSplatOverload(
  i: number,
  t: number,
  px: Float32Array,
  py: Float32Array,
  pz: Float32Array,
  vx: Float32Array,
  vy: Float32Array,
  vz: Float32Array,
  life: Float32Array,
) {
  const a = (((i * 17.23) % 1000) / 1000) * Math.PI * 2 + t * 4.2;
  const b = (((i * 31.91) % 1000) / 1000) * Math.PI;
  const wobbleA = Math.sin(t * 22 + i * 0.9) * 0.14;
  const wobbleB = Math.cos(t * 19 + i * 1.1) * 0.12;
  px[i] = ((i * 13) % 10) / 10 * 0.58 - 0.29 + wobbleA;
  py[i] = 0.26 + ((i * 7) % 10) / 85 + ((i * 3) % 5) * 0.058;
  pz[i] = ((i * 19) % 10) / 10 * 0.58 - 0.29 + wobbleB;
  const spd = 7.1 + ((i * 41) % 100) / 8.5;
  const silly = Math.sin(t * 31 + i) * 0.52;
  vx[i] = Math.sin(b) * Math.cos(a) * spd + silly;
  vy[i] = Math.abs(Math.cos(b)) * spd * 0.86 + 3.05 + ((i % 5) * 0.22);
  vz[i] = Math.sin(b) * Math.sin(a) * spd + silly * 0.85;
  life[i] = 0.58 + ((i * 59) % 100) / 110;
}

function respawnSplatJet(
  i: number,
  ft: number,
  px: Float32Array,
  py: Float32Array,
  pz: Float32Array,
  vx: Float32Array,
  vy: Float32Array,
  vz: Float32Array,
  life: Float32Array,
  /** Чем выше игрок над полом, тем дольше живёт капля, чтобы долетала до y = FLOOR_Y. */
  playerAboveFloorY: number,
) {
  const seed = i * 47 + Math.floor(ft * 30);
  const a = ((seed % 360) / 360) * Math.PI * 2;
  const spread = 0.45 + ((seed * 3) % 10) / 21;
  const sputter = Math.sin(ft * 40 + i * 1.7) * 0.1;
  px[i] = Math.cos(a) * spread * 0.4 + sputter;
  py[i] = 0.04 + ((seed % 5) * 0.024);
  pz[i] = Math.sin(a) * spread * 0.4 - sputter * 0.72;
  const jet = 7.4 + ((seed * 11) % 20) / 4.2;
  vx[i] = Math.cos(a + 0.4) * (1.42 + (seed % 7) / 4.2);
  vy[i] = -jet - ((seed % 5) * 0.45);
  vz[i] = Math.sin(a + 0.4) * (1.42 + (seed % 6) / 4.6);
  const extraLife = Math.min(2.4, playerAboveFloorY * 0.16);
  life[i] = 0.48 + ((seed * 13) % 100) / 200 + extraLife;
}
/** Ускорение вверх на «тяге» после перегруза (ед/с²). */
const FLIGHT_THRUST_Y = 11.2;
const FLIGHT_INITIAL_VY = 6.2;
/** 0 — обычный режим, 1 — перегруз, 2 — улет вверх на тяге. */
type PlayerBurstPhase = 0 | 1 | 2;

/** Плавный поворот к целевому yaw по кратчайшей дуге (рад). atan2(sin,cos) — корректно при любом «намотанном» from. */
function lerpYawShortest(from: number, to: number, alpha: number): number {
  const d = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  const y = from + d * alpha;
  return Math.atan2(Math.sin(y), Math.cos(y));
}

interface PlayerAvatarProps {
  onPositionChange: (position: [number, number, number]) => void;
  collisionBoxes?: Array<{
    min: [number, number, number];
    max: [number, number, number];
  }>;
  /** Состояние джойстика без setState каждый кадр — читается в useFrame. */
  virtualInputRef?: MutableRefObject<{ x: number; z: number } | null>;
  virtualInput?: { x: number; z: number } | null;
  onMotionChange?: (motion: {
    position: [number, number, number];
    moveDir: [number, number, number]; // normalized, y=0
    speed: number; // units/sec
    yaw: number; // radians
  }) => void;
  /** Пасхалка: вызов в кадре старта перегруза (Space 3 с). */
  onOverloadStarted?: () => void;
}

export function PlayerAvatar({
  onPositionChange,
  onMotionChange,
  onOverloadStarted,
  collisionBoxes,
  virtualInput,
  virtualInputRef,
}: PlayerAvatarProps) {
  const { camera } = useThree();
  const groupRef = useRef<Group>(null);
  /** Визуал персонажа + брызги. */
  const characterVisualRef = useRef<Group>(null);
  const splatMeshRef = useRef<InstancedMesh>(null);
  const splatDummyRef = useRef(new Object3D());
  const splatLifeRef = useRef(new Float32Array(SPLAT_COUNT));
  const splatPxRef = useRef(new Float32Array(SPLAT_COUNT));
  const splatPyRef = useRef(new Float32Array(SPLAT_COUNT));
  const splatPzRef = useRef(new Float32Array(SPLAT_COUNT));
  const splatVxRef = useRef(new Float32Array(SPLAT_COUNT));
  const splatVyRef = useRef(new Float32Array(SPLAT_COUNT));
  const splatVzRef = useRef(new Float32Array(SPLAT_COUNT));
  const stainMeshRef = useRef<InstancedMesh>(null);
  const stainDummyRef = useRef(new Object3D());
  const stainWriteRef = useRef(0);
  const underfootSludgeAccRef = useRef(0);
  const sludgeSpawnSeqRef = useRef(0);
  const tmpSplatWorldRef = useRef(new Vector3());
  const burstPhaseRef = useRef<PlayerBurstPhase>(0);
  const spaceChargeRef = useRef(0);
  const overloadTimerRef = useRef(0);
  const overloadSpinXRef = useRef(0);
  const overloadSpinYRef = useRef(0);
  const overloadSpinZRef = useRef(0);
  const flightVelYRef = useRef(0);
  const flightTimeRef = useRef(0);
  const legsGroupRef = useRef<Group>(null);
  const wheelchairGroupRef = useRef<Group>(null);
  /** Пивоты для качания при ходьбе (таз / плечо). */
  const leftLegSwingRef = useRef<Group>(null);
  const rightLegSwingRef = useRef<Group>(null);
  const leftArmSwingRef = useRef<Group>(null);
  const rightArmSwingRef = useRef<Group>(null);
  const walkPhaseRef = useRef(0);
  const walkSwingBlendRef = useRef(0);
  /** Смешивание анимации рук «толкаем обода» в режиме коляски (6+7). */
  const chairArmBlendRef = useRef(0);
  /** Режим коляски (6+7): переключение по нажатию комбо, без удержания. */
  const wheelchairModeRef = useRef(false);
  /** Предыдущий кадр: оба ключа 6 и 7 зажаты — чтобы ловить только фронт. */
  const wheelchairComboPrevRef = useRef(false);
  const pressedCodesRef = useRef<Record<string, boolean>>({});
  const lastPosRef = useRef<[number, number, number] | null>(null);
  const lastMoveDirRef = useRef<[number, number, number]>([0, 0, -1]);
  const tmpForwardRef = useRef(new Vector3());
  const tmpRightRef = useRef(new Vector3());
  const tmpMoveRef = useRef(new Vector3());
  const colliders = useMemo(() => {
    if (!collisionBoxes || collisionBoxes.length === 0) return [] as Array<{ minX: number; minZ: number; maxX: number; maxZ: number }>;
    return collisionBoxes.map((b) => ({
      minX: b.min[0],
      minZ: b.min[2],
      maxX: b.max[0],
      maxZ: b.max[2],
    }));
  }, [collisionBoxes]);

  /** Плащ: нейтральный графит (мало синего), + tint #fff на мешах. */
  const coatTex = useMemo(() => createFabricNoiseTexture({ base: "#42454c", seed: 777 }), []);
  const coatLightTex = useMemo(() => createFabricNoiseTexture({ base: "#4e5159", seed: 776 }), []);
  /** Кожа лица и кисти — одна текстура и один тон (голова не темнее рук). */
  const handTex = useMemo(() => createFabricNoiseTexture({ base: "#f0dcc8", seed: 781 }), []);
  const hairTex = useMemo(() => createFabricNoiseTexture({ base: "#e8eef8", seed: 779 }), []);

  /**
   * Конусы над повязкой, плотная сетка + макушка. Ось конуса слегка отклонена от +Y
   * (детерминированно по индексу), без полного «ежа».
   */
  const hairCones = useMemo(() => {
    const cx = 0;
    const cy = 1.4;
    const cz = 0.02;
    const sx = 0.15 * 0.88;
    const sy = 0.15 * 1.05;
    const sz = 0.15 * 0.92;
    const bandTopY = 1.41 + 0.03;
    const yMin = bandTopY + 0.006;
    const out: Array<{ pos: [number, number, number]; r: number; h: number; rot: [number, number, number] }> = [];

    const up = new Vector3(0, 1, 0);
    const dir = new Vector3();
    const q = new Quaternion();
    const e = new Euler();
    let coneSeed = 0;

    const push = (x: number, ySurf: number, z: number, r: number, h: number) => {
      const s = coneSeed++;
      const u = Math.sin(s * 12.9898 + 78.233) * 43758.5453;
      const v = Math.sin(s * 39.4231 + 11.7) * 31415.9265;
      const fx = u - Math.floor(u);
      const fy = v - Math.floor(v);
      const spread = 0.34;
      dir.set((fx - 0.5) * spread, 1, (fy - 0.5) * spread).normalize();
      q.setFromUnitVectors(up, dir);
      e.setFromQuaternion(q, "YXZ");
      out.push({ pos: [x, ySurf + h * 0.5, z], r, h, rot: [e.x, e.y, e.z] });
    };

    const ringAtY = (ySurf: number, yi: number) => {
      if (ySurf >= cy + sy * 0.998) return;
      const yEff = ySurf - cy;
      const inner = 1 - (yEff * yEff) / (sy * sy);
      if (inner <= 0.0015) return;
      const rr = Math.sqrt(inner);
      const arc = 2 * Math.PI * Math.max(sx, sz) * rr;
      const spacing = 0.026;
      const count = Math.max(14, Math.ceil(arc / spacing) + (yi % 2));

      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2 + yi * 0.11;
        const x = cx + sx * rr * Math.cos(theta);
        const z = cz + sz * rr * Math.sin(theta);
        const h = 0.07 + (yi % 4) * 0.012 + (i % 5) * 0.006;
        const r = 0.021 + (i % 5) * 0.0032;
        push(x, ySurf, z, r, h);
      }
    };

    const ySteps = 12;
    const dy = 0.01;
    for (let yi = 0; yi < ySteps; yi++) {
      const ySurf = yMin + yi * dy;
      ringAtY(ySurf, yi);
    }

    const crownY = cy + sy * 0.992;
    const yEffC = crownY - cy;
    const innerC = 1 - (yEffC * yEffC) / (sy * sy);
    if (innerC > 0.003) {
      const rrC = Math.sqrt(innerC);
      const nC = 12;
      for (let k = 0; k < nC; k++) {
        const a = (k / nC) * Math.PI * 2 + 0.12;
        const rad = rrC * 0.32;
        const x = cx + sx * rad * Math.cos(a);
        const z = cz + sz * rad * Math.sin(a);
        push(x, crownY, z, 0.022 + (k % 4) * 0.0028, 0.076 + (k % 3) * 0.009);
      }
      push(cx, crownY + 0.004, cz, 0.03, 0.1);
    }

    return out;
  }, []);

  const hairBaseR = 0.022;
  const hairBaseH = 0.072;
  const hairInstanced = useMemo(() => {
    const count = hairCones.length;
    if (count === 0) return null;
    const geom = new ConeGeometry(hairBaseR, hairBaseH, 5);
    const mat = new MeshStandardMaterial({
      map: hairTex,
      color: "#f2f6fc",
      roughness: 0.64,
      metalness: 0.03,
    });
    const mesh = new InstancedMesh(geom, mat, count);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    const dummy = new Object3D();
    for (let i = 0; i < count; i++) {
      const c = hairCones[i];
      dummy.position.set(c.pos[0], c.pos[1], c.pos[2]);
      dummy.rotation.set(c.rot[0], c.rot[1], c.rot[2]);
      dummy.scale.set(c.r / hairBaseR, c.h / hairBaseH, c.r / hairBaseR);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.skipCharacterShadowFlags = true;
    return mesh;
  }, [hairCones, hairTex]);

  useEffect(() => {
    const mesh = hairInstanced;
    if (!mesh) return;
    return () => {
      mesh.geometry.dispose();
      const m = mesh.material;
      if (m && !Array.isArray(m)) {
        m.dispose();
      }
    };
  }, [hairInstanced]);

  const splatMeshTemplate = useMemo(() => {
    const geom = new SphereGeometry(0.056, 8, 8);
    /** Без освещения — иначе мелкие капли «пропадают» в тени плаща. */
    const mat = new MeshBasicMaterial({
      color: SPLAT_MATERIAL_COLOR,
      depthTest: true,
      depthWrite: true,
    });
    const mesh = new InstancedMesh(geom, mat, SPLAT_COUNT);
    mesh.visible = false;
    mesh.frustumCulled = false;
    mesh.renderOrder = 24;
    mesh.userData.skipCharacterShadowFlags = true;
    const d = new Object3D();
    for (let i = 0; i < SPLAT_COUNT; i++) {
      d.position.set(0, -80, 0);
      d.scale.setScalar(0.001);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }, []);

  const stainMeshTemplate = useMemo(() => {
    const geom = new CircleGeometry(0.26, 13);
    const mat = new MeshBasicMaterial({
      color: STAIN_MATERIAL_COLOR,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -1,
    });
    const mesh = new InstancedMesh(geom, mat, STAIN_MAX);
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    mesh.userData.skipCharacterShadowFlags = true;
    const d = new Object3D();
    for (let i = 0; i < STAIN_MAX; i++) {
      d.position.set(0, -500, 0);
      d.scale.set(0.001, 0.001, 1);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }, []);

  useEffect(() => {
    const mesh = splatMeshTemplate;
    return () => {
      mesh.geometry.dispose();
      const m = mesh.material;
      if (m && !Array.isArray(m)) m.dispose();
    };
  }, [splatMeshTemplate]);

  useEffect(() => {
    const mesh = stainMeshTemplate;
    return () => {
      mesh.geometry.dispose();
      const m = mesh.material;
      if (m && !Array.isArray(m)) m.dispose();
    };
  }, [stainMeshTemplate]);

  useEffect(() => {
    function typingTarget(t: EventTarget | null): boolean {
      if (!t || !(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.code === "Space" && !typingTarget(event.target)) {
        if (burstPhaseRef.current === 0) {
          event.preventDefault();
        }
        preloadOverloadFartAudio();
      }
      pressedCodesRef.current[event.code] = true;
    }

    function onKeyUp(event: KeyboardEvent) {
      pressedCodesRef.current[event.code] = false;
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  function applyCharacterShadowFlags() {
    const root = groupRef.current;
    if (!root) return;
    root.traverse((obj) => {
      if (!(obj instanceof Mesh)) return;
      if ((obj.userData as { skipCharacterShadowFlags?: boolean }).skipCharacterShadowFlags) {
        obj.castShadow = false;
        obj.receiveShadow = false;
        return;
      }
      const mat = obj.material;
      const mats = Array.isArray(mat) ? mat : mat ? [mat] : [];
      const skipCast = mats.some(
        (m) =>
          m &&
          typeof m === "object" &&
          "transparent" in m &&
          Boolean((m as { transparent?: boolean }).transparent) &&
          "depthWrite" in m &&
          (m as { depthWrite?: boolean }).depthWrite === false,
      );
      obj.castShadow = !skipCast;
      obj.receiveShadow = true;
    });
  }

  useLayoutEffect(() => {
    applyCharacterShadowFlags();
  }, [hairInstanced, splatMeshTemplate]);

  useEffect(() => {
    applyCharacterShadowFlags();
  }, [hairInstanced, splatMeshTemplate]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    const keys = pressedCodesRef.current;
    const phase = burstPhaseRef.current;

    if (phase === 2) {
      flightTimeRef.current += delta;
      const ft = flightTimeRef.current;

      flightVelYRef.current += FLIGHT_THRUST_Y * delta;
      group.position.y += flightVelYRef.current * delta;
      group.position.x += Math.sin(ft * 14.3) * 0.022 * delta;
      group.position.z += Math.cos(ft * 11.7) * 0.022 * delta;
      group.position.x = Math.max(-18.0, Math.min(18.0, group.position.x));
      group.position.z = Math.max(-12.5, Math.min(9.5, group.position.z));

      const cv = characterVisualRef.current;
      if (cv) {
        overloadSpinYRef.current += delta * 4.2;
        cv.rotation.order = "YXZ";
        cv.rotation.x = -Math.min(1.25, ft * 0.38) * 0.95;
        cv.rotation.y = overloadSpinYRef.current;
        cv.rotation.z = Math.sin(ft * 5.5) * 0.14;
      }

      const splatMesh = splatMeshRef.current ?? splatMeshTemplate;
      const stainMesh = stainMeshRef.current ?? stainMeshTemplate;
      const stainDummy = stainDummyRef.current;
      const tw = tmpSplatWorldRef.current;
      splatMesh.visible = true;
      const dummy = splatDummyRef.current;
      const life = splatLifeRef.current;
      const px = splatPxRef.current;
      const py = splatPyRef.current;
      const pz = splatPzRef.current;
      const vx = splatVxRef.current;
      const vy = splatVyRef.current;
      const vz = splatVzRef.current;

      group.updateMatrixWorld(true);
      const jetAlt = Math.max(0, group.position.y - FLOOR_Y);
      underfootSludgeAccRef.current += delta;
      while (underfootSludgeAccRef.current >= UNDERFOOT_SLUDGE_INTERVAL_JET) {
        underfootSludgeAccRef.current -= UNDERFOOT_SLUDGE_INTERVAL_JET;
        const tk = sludgeSpawnSeqRef.current++ + Math.floor(ft * 500);
        stainWriteRef.current = spawnUnderfootSludgeBatch(
          stainMesh,
          stainDummy,
          stainWriteRef.current,
          group,
          tk,
          UNDERFOOT_SLUDGE_BATCH_JET,
        );
      }
      for (let i = 0; i < SPLAT_COUNT; i++) {
        if (life[i] > 0) {
          vy[i] -= 5.5 * delta;
          px[i] += vx[i] * delta;
          py[i] += vy[i] * delta;
          pz[i] += vz[i] * delta;
          life[i] -= delta;
        }

        tw.set(px[i], py[i] + SPLAT_GROUP_LOCAL_Y, pz[i]);
        group.localToWorld(tw);

        if (tw.y <= FLOOR_Y + STAIN_FLOOR_HIT) {
          stainWriteRef.current = commitFloorStain(
            stainMesh,
            stainDummy,
            stainWriteRef.current,
            tw.x,
            tw.z,
            i * 977 + Math.floor(ft * 80),
          );
          respawnSplatJet(i, ft, px, py, pz, vx, vy, vz, life, jetAlt);
        } else if (life[i] <= 0) {
          respawnSplatJet(i, ft, px, py, pz, vx, vy, vz, life, jetAlt);
        }
        const scl = 0.46 + (i % 11) * 0.13;
        const wobble = 0.87 + Math.sin(ft * 14 + i * 0.61) * 0.16;
        const elong = 0.5 + (i % 6) * 0.075;
        dummy.position.set(px[i], py[i], pz[i]);
        dummy.scale.set(scl * elong * wobble, scl * 0.55 * wobble, scl * (1.08 - elong * 0.2));
        dummy.rotation.set(life[i] * 8 + i * 0.1, life[i] * 11 + ft * 4, life[i] * 6);
        dummy.updateMatrix();
        splatMesh.setMatrixAt(i, dummy.matrix);
      }
      splatMesh.instanceMatrix.needsUpdate = true;

      onPositionChange([group.position.x, group.position.y, group.position.z]);
      if (typeof onMotionChange === "function") {
        onMotionChange({
          position: [group.position.x, group.position.y, group.position.z],
          moveDir: [0, 1, 0],
          speed: flightVelYRef.current,
          yaw: group.rotation.y,
        });
      }
      return;
    }

    if (phase === 0) {
      if (keys.Space) {
        spaceChargeRef.current += delta;
        if (spaceChargeRef.current >= SPACE_CHARGE_SEC) {
          burstPhaseRef.current = 1;
          overloadTimerRef.current = 0;
          overloadSpinXRef.current = 0;
          overloadSpinYRef.current = 0;
          overloadSpinZRef.current = 0;
          spaceChargeRef.current = 0;
          playOverloadFartSound();
          onOverloadStarted?.();
          const sm = splatMeshRef.current ?? splatMeshTemplate;
          sm.visible = true;
        }
      } else if (spaceChargeRef.current > 0 && spaceChargeRef.current < SPACE_CHARGE_SEC) {
        spaceChargeRef.current = 0;
      }
    }

    if (burstPhaseRef.current === 1) {
      overloadTimerRef.current += delta;
      const t = overloadTimerRef.current;

      group.position.y = FLOOR_Y;
      group.position.x = Math.max(-18.0, Math.min(18.0, group.position.x));
      group.position.z = Math.max(-12.5, Math.min(9.5, group.position.z));

      /** В кадре старта полёта не гоняем 160 брызг перегруза — тяжёлый hitch. */
      if (t >= OVERLOAD_SEC) {
        burstPhaseRef.current = 2;
        flightVelYRef.current = FLIGHT_INITIAL_VY;
        flightTimeRef.current = 0;
        overloadSpinYRef.current = 0;

        onPositionChange([group.position.x, group.position.y, group.position.z]);
        if (typeof onMotionChange === "function") {
          onMotionChange({
            position: [group.position.x, group.position.y, group.position.z],
            moveDir: lastMoveDirRef.current,
            speed: 0,
            yaw: group.rotation.y,
          });
        }
        return;
      }

      const cv = characterVisualRef.current;
      if (cv) {
        /** Непрерывное вращение сразу вокруг X, Y и Z (разные скорости — «куб» вместо одной оси). */
        overloadSpinXRef.current += delta * 6.4;
        overloadSpinYRef.current += delta * 9.2;
        overloadSpinZRef.current += delta * 7.1;
        cv.rotation.order = "XYZ";
        cv.rotation.set(overloadSpinXRef.current, overloadSpinYRef.current, overloadSpinZRef.current);
      }

      const spin = t * 30;
      const legWild = 1.72;
      const armWild = 1.58;
      if (leftLegSwingRef.current) {
        leftLegSwingRef.current.rotation.x = Math.sin(spin) * legWild;
        leftLegSwingRef.current.rotation.z = Math.cos(spin * 1.1) * 0.62;
      }
      if (rightLegSwingRef.current) {
        rightLegSwingRef.current.rotation.x = Math.sin(spin + 1.7) * legWild;
        rightLegSwingRef.current.rotation.z = Math.cos(spin * 1.08 + 0.4) * 0.62;
      }
      if (leftArmSwingRef.current) {
        leftArmSwingRef.current.rotation.x = Math.sin(spin * 1.3 + 0.5) * armWild;
        leftArmSwingRef.current.rotation.z = Math.sin(spin * 0.9) * 0.68;
      }
      if (rightArmSwingRef.current) {
        rightArmSwingRef.current.rotation.x = Math.sin(spin * 1.28 - 0.4) * armWild;
        rightArmSwingRef.current.rotation.z = Math.cos(spin * 0.95) * 0.68;
      }

      const splatMesh = splatMeshRef.current ?? splatMeshTemplate;
      const stainMesh = stainMeshRef.current ?? stainMeshTemplate;
      const stainDummy = stainDummyRef.current;
      const tw = tmpSplatWorldRef.current;
      const dummy = splatDummyRef.current;
      const life = splatLifeRef.current;
      const px = splatPxRef.current;
      const py = splatPyRef.current;
      const pz = splatPzRef.current;
      const vx = splatVxRef.current;
      const vy = splatVyRef.current;
      const vz = splatVzRef.current;

      group.updateMatrixWorld(true);
      underfootSludgeAccRef.current += delta;
      while (underfootSludgeAccRef.current >= UNDERFOOT_SLUDGE_INTERVAL_OVERLOAD) {
        underfootSludgeAccRef.current -= UNDERFOOT_SLUDGE_INTERVAL_OVERLOAD;
        const tk = sludgeSpawnSeqRef.current++ + Math.floor(t * 400);
        stainWriteRef.current = spawnUnderfootSludgeBatch(
          stainMesh,
          stainDummy,
          stainWriteRef.current,
          group,
          tk,
          UNDERFOOT_SLUDGE_BATCH_OVERLOAD,
        );
      }
      for (let i = 0; i < SPLAT_COUNT; i++) {
        if (life[i] > 0) {
          vy[i] -= 8.5 * delta;
          px[i] += vx[i] * delta;
          py[i] += vy[i] * delta;
          pz[i] += vz[i] * delta;
          life[i] -= delta;
        }

        tw.set(px[i], py[i] + SPLAT_GROUP_LOCAL_Y, pz[i]);
        group.localToWorld(tw);

        if (tw.y <= FLOOR_Y + STAIN_FLOOR_HIT) {
          stainWriteRef.current = commitFloorStain(
            stainMesh,
            stainDummy,
            stainWriteRef.current,
            tw.x,
            tw.z,
            i * 991 + Math.floor(t * 60),
          );
          respawnSplatOverload(i, t, px, py, pz, vx, vy, vz, life);
        } else if (life[i] <= 0) {
          respawnSplatOverload(i, t, px, py, pz, vx, vy, vz, life);
        }
        const scl = 0.52 + (i % 11) * 0.14;
        const wobble = 0.86 + Math.sin(t * 15 + i * 0.58) * 0.17;
        const elong = 0.51 + (i % 6) * 0.074;
        dummy.position.set(px[i], py[i], pz[i]);
        dummy.scale.set(scl * elong * wobble, scl * 0.57 * wobble, scl * (1.07 - elong * 0.19));
        dummy.rotation.set(life[i] * 9 + i * 0.1, life[i] * 12 + t * 3, life[i] * 7);
        dummy.updateMatrix();
        splatMesh.setMatrixAt(i, dummy.matrix);
      }
      splatMesh.instanceMatrix.needsUpdate = true;

      onPositionChange([group.position.x, group.position.y, group.position.z]);
      if (typeof onMotionChange === "function") {
        onMotionChange({
          position: [group.position.x, group.position.y, group.position.z],
          moveDir: lastMoveDirRef.current,
          speed: 0,
          yaw: group.rotation.y,
        });
      }
      return;
    }

    const comboRow = Boolean(keys.Digit6 && keys.Digit7);
    const comboNum = Boolean(keys.Numpad6 && keys.Numpad7);
    const combo = comboRow || comboNum;
    if (combo && !wheelchairComboPrevRef.current) {
      wheelchairModeRef.current = !wheelchairModeRef.current;
    }
    wheelchairComboPrevRef.current = combo;
    const wheelchairMode = wheelchairModeRef.current;
    if (legsGroupRef.current) {
      legsGroupRef.current.visible = !wheelchairMode;
    }
    if (wheelchairGroupRef.current) {
      wheelchairGroupRef.current.visible = wheelchairMode;
    }

    const moveSpeed = defaultMovementConfig.speed * delta * 2;

    const kbX = (keys.KeyA || keys.ArrowLeft ? -1 : 0) + (keys.KeyD || keys.ArrowRight ? 1 : 0);
    const kbZ = (keys.KeyW || keys.ArrowUp ? 1 : 0) + (keys.KeyS || keys.ArrowDown ? -1 : 0);
    const stick = virtualInputRef?.current ?? virtualInput ?? null;
    const inputX = typeof stick?.x === "number" ? stick.x : kbX;
    const inputZ = typeof stick?.z === "number" ? stick.z : kbZ;

    // Move relative to camera (projected onto XZ plane)
    const forward = tmpForwardRef.current;
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) {
      forward.set(0, 0, -1);
    } else {
      forward.normalize();
    }

    const right = tmpRightRef.current;
    right.set(-forward.z, 0, forward.x); // 90deg turn on plane (right-hand)
    right.normalize();

    const move = tmpMoveRef.current;
    move.set(0, 0, 0);
    move.addScaledVector(right, inputX);
    move.addScaledVector(forward, inputZ);

    const prevX = group.position.x;
    const prevZ = group.position.z;

    if (move.lengthSq() > 1e-6) {
      move.normalize();
      const nextX = prevX + move.x * moveSpeed;
      const nextZ = prevZ + move.z * moveSpeed;

      // collision: simple AABB blockers (resolve by axis)
      if (colliders.length > 0) {
        // try X only
        const tryX = { x: nextX, z: prevZ };
        let blockedX = false;
        for (const box of colliders) {
          if (tryX.x >= box.minX && tryX.x <= box.maxX && tryX.z >= box.minZ && tryX.z <= box.maxZ) {
            blockedX = true;
            break;
          }
        }

        // try Z only
        const tryZ = { x: prevX, z: nextZ };
        let blockedZ = false;
        for (const box of colliders) {
          if (tryZ.x >= box.minX && tryZ.x <= box.maxX && tryZ.z >= box.minZ && tryZ.z <= box.maxZ) {
            blockedZ = true;
            break;
          }
        }

        group.position.x = blockedX ? prevX : nextX;
        group.position.z = blockedZ ? prevZ : nextZ;
      } else {
        group.position.x = nextX;
        group.position.z = nextZ;
      }

      const targetYaw = Math.atan2(move.x, move.z);
      const turnSharpness = 12;
      const alpha = 1 - Math.exp(-turnSharpness * delta);
      group.rotation.y = lerpYawShortest(group.rotation.y, targetYaw, alpha);
      lastMoveDirRef.current = [move.x, 0, move.z];
    }

    // Match the current office shell so NPCs/zones are reachable.
    group.position.x = Math.max(-18.0, Math.min(18.0, group.position.x));
    group.position.z = Math.max(-12.5, Math.min(9.5, group.position.z));
    group.position.y = FLOOR_Y;

    onPositionChange([group.position.x, group.position.y, group.position.z]);

    const pos: [number, number, number] = [group.position.x, group.position.y, group.position.z];
    const lastPos = lastPosRef.current;
    lastPosRef.current = pos;

    const vx = lastPos ? (pos[0] - lastPos[0]) / Math.max(1e-6, delta) : 0;
    const vz = lastPos ? (pos[2] - lastPos[2]) / Math.max(1e-6, delta) : 0;
    const planarSpeed = Math.hypot(vx, vz);

    const derivedDir: [number, number, number] = lastMoveDirRef.current;

    const yaw = group.rotation.y;

    if (typeof onMotionChange === "function") {
      onMotionChange({
        position: pos,
        moveDir: derivedDir,
        speed: planarSpeed,
        yaw,
      });
    }

    // Ходьба: противофаза рук и ног. Коляска (6+7): ноги скрыты, обе руки в одну фазу — как при катании.
    const walkActive = !wheelchairMode && planarSpeed > 0.08;
    const chairPushActive = wheelchairMode && planarSpeed > 0.08;
    const targetWalkBlend = walkActive ? Math.min(1, planarSpeed / 2.2) : 0;
    const targetChairArmBlend = chairPushActive ? Math.min(1, planarSpeed / 2.2) : 0;
    const blendAlpha = 1 - Math.exp(-10 * delta);
    walkSwingBlendRef.current += (targetWalkBlend - walkSwingBlendRef.current) * blendAlpha;
    chairArmBlendRef.current += (targetChairArmBlend - chairArmBlendRef.current) * blendAlpha;
    const walkB = walkSwingBlendRef.current;
    const chairB = chairArmBlendRef.current;
    if (walkB > 0.02 || chairB > 0.02) {
      walkPhaseRef.current += delta * Math.max(planarSpeed, 0.35) * 6.5;
    }
    const s = Math.sin(walkPhaseRef.current);
    const legAmp = 0.38;
    const armAmp = 0.28;
    const chairArmAmp = 0.26;
    if (leftLegSwingRef.current) {
      leftLegSwingRef.current.rotation.x = wheelchairMode ? 0 : s * legAmp * walkB;
      leftLegSwingRef.current.rotation.z = 0;
    }
    if (rightLegSwingRef.current) {
      rightLegSwingRef.current.rotation.x = wheelchairMode ? 0 : -s * legAmp * walkB;
      rightLegSwingRef.current.rotation.z = 0;
    }
    if (leftArmSwingRef.current) {
      leftArmSwingRef.current.rotation.x = wheelchairMode ? s * chairArmAmp * chairB : -s * armAmp * walkB;
      leftArmSwingRef.current.rotation.z = 0;
    }
    if (rightArmSwingRef.current) {
      rightArmSwingRef.current.rotation.x = wheelchairMode ? s * chairArmAmp * chairB : s * armAmp * walkB;
      rightArmSwingRef.current.rotation.z = 0;
    }
  });

  return (
    <>
    <group ref={groupRef} position={[1.2, FLOOR_Y, 0]}>
      <group ref={characterVisualRef} position={[0, CHARACTER_SPIN_PIVOT_Y, 0]}>
        <group position={[0, -CHARACTER_SPIN_PIVOT_Y, 0]}>
        {/* --- Gojo silhouette: широкие плечи, V-торс, расклешённый хаори, не «овал с головой» --- */}
        {/* Низ плаща — уже снизу, чтобы ноги по бокам читались */}
        <mesh position={[0, 0.49, 0.01]} rotation={[0.03, 0, 0]}>
          <cylinderGeometry args={[0.13, 0.17, 0.3, 14]} />
          <meshStandardMaterial map={coatTex} color="#ffffff" metalness={0.1} roughness={0.82} envMapIntensity={0.55} />
        </mesh>
        <mesh position={[-0.1, 0.49, 0]} rotation={[0, 0, 0.12]}>
          <capsuleGeometry args={[0.1, 0.2, 6, 10]} />
          <meshStandardMaterial map={coatTex} color="#ffffff" metalness={0.08} roughness={0.84} envMapIntensity={0.52} />
        </mesh>
        <mesh position={[0.1, 0.49, 0]} rotation={[0, 0, -0.12]}>
          <capsuleGeometry args={[0.1, 0.2, 6, 10]} />
          <meshStandardMaterial map={coatTex} color="#ffffff" metalness={0.08} roughness={0.84} envMapIntensity={0.52} />
        </mesh>

        {/* Ноги — пивот у таза для шага; скрываются в режиме коляски (6+7 — переключение) */}
        <group ref={legsGroupRef}>
          <group ref={leftLegSwingRef} position={[-0.12, 0.38, 0]}>
            <mesh position={[0, -0.07, 0]}>
              <capsuleGeometry args={[0.088, 0.25, 6, 12]} />
              <meshStandardMaterial
                map={coatTex}
                color="#ffffff"
                metalness={0.06}
                roughness={0.88}
                envMapIntensity={0.48}
                polygonOffset
                polygonOffsetFactor={-1}
                polygonOffsetUnits={-1}
              />
            </mesh>
            <mesh position={[0, -0.2, 0]}>
              <capsuleGeometry args={[0.078, 0.29, 6, 10]} />
              <meshStandardMaterial
                map={coatTex}
                color="#ffffff"
                metalness={0.05}
                roughness={0.9}
                envMapIntensity={0.45}
                polygonOffset
                polygonOffsetFactor={-1}
                polygonOffsetUnits={-1}
              />
            </mesh>
            <mesh position={[0, -0.36, 0.04]} rotation={[0.02, 0, 0]}>
              <boxGeometry args={[0.12, 0.08, 0.2]} />
              <meshStandardMaterial
                map={coatTex}
                color="#d2d8e4"
                metalness={0.1}
                roughness={0.78}
                envMapIntensity={0.45}
                polygonOffset
                polygonOffsetFactor={-1.5}
                polygonOffsetUnits={-1}
              />
            </mesh>
          </group>
          <group ref={rightLegSwingRef} position={[0.12, 0.38, 0]}>
            <mesh position={[0, -0.07, 0]}>
              <capsuleGeometry args={[0.088, 0.25, 6, 12]} />
              <meshStandardMaterial
                map={coatTex}
                color="#ffffff"
                metalness={0.06}
                roughness={0.88}
                envMapIntensity={0.48}
                polygonOffset
                polygonOffsetFactor={-1}
                polygonOffsetUnits={-1}
              />
            </mesh>
            <mesh position={[0, -0.2, 0]}>
              <capsuleGeometry args={[0.078, 0.29, 6, 10]} />
              <meshStandardMaterial
                map={coatTex}
                color="#ffffff"
                metalness={0.05}
                roughness={0.9}
                envMapIntensity={0.45}
                polygonOffset
                polygonOffsetFactor={-1}
                polygonOffsetUnits={-1}
              />
            </mesh>
            <mesh position={[0, -0.36, 0.04]} rotation={[0.02, 0, 0]}>
              <boxGeometry args={[0.12, 0.08, 0.2]} />
              <meshStandardMaterial
                map={coatTex}
                color="#d2d8e4"
                metalness={0.1}
                roughness={0.78}
                envMapIntensity={0.45}
                polygonOffset
                polygonOffsetFactor={-1.5}
                polygonOffsetUnits={-1}
              />
            </mesh>
          </group>
        </group>

        {/* Easter egg 6+7 (тап переключает): коляска — колёса цилиндром Rz(π/2): ось вдоль X, диск в YZ (вертикально, не тор в XY) */}
        <group ref={wheelchairGroupRef} visible={false} position={[0, 0, 0.05]}>
          {/** Ось колеса вдоль X: [0,0,π/2] у цилиндра по умолчанию вдоль Y */}
          {/* Задние колёса: ещё крупнее R≈0.335; cy=R — касание пола */}
          <mesh position={[-0.46, 0.335, 0.09]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.335, 0.335, 0.095, 36]} />
            <meshStandardMaterial color="#0a0c12" metalness={0.12} roughness={0.88} />
          </mesh>
          <mesh position={[0.46, 0.335, 0.09]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.335, 0.335, 0.095, 36]} />
            <meshStandardMaterial color="#0a0c12" metalness={0.12} roughness={0.88} />
          </mesh>
          <mesh position={[-0.46, 0.335, 0.09]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.258, 0.258, 0.098, 30]} />
            <meshStandardMaterial color="#64748b" metalness={0.78} roughness={0.26} />
          </mesh>
          <mesh position={[0.46, 0.335, 0.09]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.258, 0.258, 0.098, 30]} />
            <meshStandardMaterial color="#64748b" metalness={0.78} roughness={0.26} />
          </mesh>
          {/* Передние ролики */}
          <mesh position={[-0.12, 0.11, 0.52]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.11, 0.11, 0.065, 24]} />
            <meshStandardMaterial color="#111827" metalness={0.22} roughness={0.82} />
          </mesh>
          <mesh position={[0.12, 0.11, 0.52]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.11, 0.11, 0.065, 24]} />
            <meshStandardMaterial color="#111827" metalness={0.22} roughness={0.82} />
          </mesh>
          {/* Рама: поперечина у осей + лонжерон к роликам */}
          <mesh position={[0, 0.2, 0.14]}>
            <boxGeometry args={[0.94, 0.042, 0.09]} />
            <meshStandardMaterial color="#5c6570" metalness={0.66} roughness={0.36} />
          </mesh>
          <mesh position={[0, 0.16, 0.34]}>
            <boxGeometry args={[0.28, 0.036, 0.42]} />
            <meshStandardMaterial color="#4b5563" metalness={0.62} roughness={0.4} />
          </mesh>
          <mesh position={[-0.46, 0.22, 0.26]} rotation={[0.1, 0, -0.06]}>
            <cylinderGeometry args={[0.024, 0.024, 0.44, 10]} />
            <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.34} />
          </mesh>
          <mesh position={[0.46, 0.22, 0.26]} rotation={[0.1, 0, 0.06]}>
            <cylinderGeometry args={[0.024, 0.024, 0.44, 10]} />
            <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.34} />
          </mesh>
          {/* Сиденье */}
          <mesh position={[0, 0.58, 0.12]}>
            <boxGeometry args={[0.48, 0.055, 0.4]} />
            <meshStandardMaterial color="#3d4a63" metalness={0.42} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.62, 0.12]}>
            <boxGeometry args={[0.46, 0.07, 0.38]} />
            <meshStandardMaterial map={coatTex} color="#ffffff" metalness={0.08} roughness={0.86} />
          </mesh>
          {/* Спинка */}
          <mesh position={[0, 0.8, -0.1]} rotation={[-0.12, 0, 0]}>
            <boxGeometry args={[0.44, 0.46, 0.06]} />
            <meshStandardMaterial map={coatLightTex} color="#ffffff" metalness={0.1} roughness={0.84} />
          </mesh>
          <mesh position={[0, 0.8, -0.085]} rotation={[-0.12, 0, 0]}>
            <boxGeometry args={[0.42, 0.42, 0.045]} />
            <meshStandardMaterial map={coatTex} color="#ffffff" metalness={0.06} roughness={0.88} />
          </mesh>
          {/* Ручки сзади */}
          <mesh position={[-0.17, 0.92, -0.26]}>
            <cylinderGeometry args={[0.017, 0.017, 0.58, 10]} />
            <meshStandardMaterial color="#7c8491" metalness={0.72} roughness={0.3} />
          </mesh>
          <mesh position={[0.17, 0.92, -0.26]}>
            <cylinderGeometry args={[0.017, 0.017, 0.58, 10]} />
            <meshStandardMaterial color="#7c8491" metalness={0.72} roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.2, -0.26]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.015, 0.015, 0.38, 10]} />
            <meshStandardMaterial color="#8b93a0" metalness={0.78} roughness={0.26} />
          </mesh>
          {/* Подлокотники */}
          <mesh position={[-0.26, 0.66, 0.14]}>
            <boxGeometry args={[0.07, 0.05, 0.4]} />
            <meshStandardMaterial map={coatTex} color="#ffffff" metalness={0.08} roughness={0.85} />
          </mesh>
          <mesh position={[0.26, 0.66, 0.14]}>
            <boxGeometry args={[0.07, 0.05, 0.4]} />
            <meshStandardMaterial map={coatTex} color="#ffffff" metalness={0.08} roughness={0.85} />
          </mesh>
          <mesh position={[-0.26, 0.58, 0.14]}>
            <boxGeometry args={[0.05, 0.12, 0.05]} />
            <meshStandardMaterial color="#6b7280" metalness={0.68} roughness={0.38} />
          </mesh>
          <mesh position={[0.26, 0.58, 0.14]}>
            <boxGeometry args={[0.05, 0.12, 0.05]} />
            <meshStandardMaterial color="#6b7280" metalness={0.68} roughness={0.38} />
          </mesh>
          {/* Подножка */}
          <mesh position={[0, 0.16, 0.42]} rotation={[-0.36, 0, 0]}>
            <boxGeometry args={[0.44, 0.028, 0.26]} />
            <meshStandardMaterial color="#2a3344" metalness={0.35} roughness={0.64} />
          </mesh>
          <mesh position={[-0.14, 0.3, 0.2]} rotation={[-0.28, 0, 0]}>
            <cylinderGeometry args={[0.017, 0.017, 0.28, 10]} />
            <meshStandardMaterial color="#6b7280" metalness={0.65} roughness={0.36} />
          </mesh>
          <mesh position={[0.14, 0.3, 0.2]} rotation={[-0.28, 0, 0]}>
            <cylinderGeometry args={[0.017, 0.017, 0.28, 10]} />
            <meshStandardMaterial color="#6b7280" metalness={0.65} roughness={0.36} />
          </mesh>
          {/* Боковые щитки */}
          <mesh position={[-0.26, 0.44, 0.16]}>
            <boxGeometry args={[0.024, 0.3, 0.32]} />
            <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.74} />
          </mesh>
          <mesh position={[0.26, 0.44, 0.16]}>
            <boxGeometry args={[0.024, 0.3, 0.32]} />
            <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.74} />
          </mesh>
        </group>

        {/* Пояс / пресс-зона — уже, подчёркивает ширину груди (+0.2 к торсу, ноги без изменений) */}
        <mesh position={[0, 0.85, 0.02]}>
          <cylinderGeometry args={[0.22, 0.16, 0.22, 12]} />
          <meshStandardMaterial map={coatLightTex} color="#ffffff" metalness={0.14} roughness={0.76} envMapIntensity={0.5} />
        </mesh>

        {/* Грудь и спина — широкий блок */}
        <mesh position={[0, 1.03, 0.02]}>
          <boxGeometry args={[0.52, 0.34, 0.26]} />
          <meshStandardMaterial map={coatLightTex} color="#ffffff" metalness={0.12} roughness={0.78} envMapIntensity={0.52} />
        </mesh>
        {/* Дельты / плечевой объём */}
        <mesh position={[-0.3, 1.09, 0.02]}>
          <sphereGeometry args={[0.13, 14, 14]} />
          <meshStandardMaterial map={coatTex} color="#ffffff" metalness={0.1} roughness={0.8} envMapIntensity={0.52} />
        </mesh>
        <mesh position={[0.3, 1.09, 0.02]}>
          <sphereGeometry args={[0.13, 14, 14]} />
          <meshStandardMaterial map={coatTex} color="#ffffff" metalness={0.1} roughness={0.8} envMapIntensity={0.52} />
        </mesh>

        {/* Руки — пивот у плеча для качания при ходьбе */}
        <group ref={leftArmSwingRef} position={[-0.28, 1.06, 0.02]}>
          <mesh position={[-0.1, -0.13, 0]} rotation={[0.12, 0, -0.35]}>
            <capsuleGeometry args={[0.095, 0.42, 6, 12]} />
            <meshStandardMaterial map={coatTex} color="#ffffff" metalness={0.09} roughness={0.83} envMapIntensity={0.52} />
          </mesh>
          <group position={[-0.18, -0.37, 0]} rotation={[-0.5, 0, -0.25]}>
            <mesh position={[0, -0.035, 0]}>
              <capsuleGeometry args={[0.095, 0.2, 6, 10]} />
              <meshStandardMaterial map={coatTex} color="#ffffff" metalness={0.08} roughness={0.85} envMapIntensity={0.5} />
            </mesh>
            <mesh position={[0, -0.15, 0]}>
              <capsuleGeometry args={[0.076, 0.11, 6, 10]} />
              <meshStandardMaterial
                map={handTex}
                color="#f2dcc8"
                metalness={0.04}
                roughness={0.52}
                envMapIntensity={0.35}
                emissive="#c49a7a"
                emissiveIntensity={0.045}
              />
            </mesh>
          </group>
        </group>
        <group ref={rightArmSwingRef} position={[0.28, 1.06, 0.02]}>
          <mesh position={[0.1, -0.13, 0]} rotation={[0.12, 0, 0.35]}>
            <capsuleGeometry args={[0.095, 0.42, 6, 12]} />
            <meshStandardMaterial map={coatTex} color="#ffffff" metalness={0.09} roughness={0.83} envMapIntensity={0.52} />
          </mesh>
          <group position={[0.18, -0.37, 0]} rotation={[-0.5, 0, 0.25]}>
            <mesh position={[0, -0.035, 0]}>
              <capsuleGeometry args={[0.095, 0.2, 6, 10]} />
              <meshStandardMaterial map={coatTex} color="#ffffff" metalness={0.08} roughness={0.85} envMapIntensity={0.5} />
            </mesh>
            <mesh position={[0, -0.15, 0]}>
              <capsuleGeometry args={[0.076, 0.11, 6, 10]} />
              <meshStandardMaterial
                map={handTex}
                color="#f2dcc8"
                metalness={0.04}
                roughness={0.52}
                envMapIntensity={0.35}
                emissive="#c49a7a"
                emissiveIntensity={0.045}
              />
            </mesh>
          </group>
        </group>

        {/* Высокий ворот хаори */}
        <mesh position={[0, 1.19, 0.04]}>
          <cylinderGeometry args={[0.15, 0.17, 0.14, 12]} />
          <meshStandardMaterial map={coatTex} color="#ffffff" metalness={0.15} roughness={0.72} envMapIntensity={0.48} />
        </mesh>
        {/* Тонкая «золотая» кайма ворота — лёгкая отсылка к силуэту Годжо */}
        <mesh position={[0, 1.254, 0.03]} rotation={[1.5, 0, 0]}>
          <torusGeometry args={[0.14, 0.009, 6, 22]} />
          <meshStandardMaterial color="#c9a44e" metalness={0.58} roughness={0.35} />
        </mesh>

        {/* Шея */}
        <mesh position={[0, 1.29, 0.02]}>
          <cylinderGeometry args={[0.075, 0.08, 0.1, 10]} />
          <meshStandardMaterial
            map={handTex}
            color="#f2dcc8"
            metalness={0.04}
            roughness={0.52}
            envMapIntensity={0.35}
            emissive="#c49a7a"
            emissiveIntensity={0.045}
          />
        </mesh>

        {/* Голова — вытянутая, не шарик-мяч */}
        <mesh position={[0, 1.4, 0.02]} scale={[0.88, 1.05, 0.92]}>
          <sphereGeometry args={[0.15, 20, 20]} />
          <meshStandardMaterial
            map={handTex}
            color="#f2dcc8"
            metalness={0.04}
            roughness={0.52}
            envMapIntensity={0.35}
            emissive="#c49a7a"
            emissiveIntensity={0.045}
          />
        </mesh>
        {/* Скулы / нижняя челюсть лёгкий объём */}
        <mesh position={[0, 1.34, 0.1]} scale={[1.05, 0.55, 0.75]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial
            map={handTex}
            color="#f2dcc8"
            metalness={0.04}
            roughness={0.52}
            envMapIntensity={0.35}
            emissive="#c49a7a"
            emissiveIntensity={0.045}
          />
        </mesh>

        {/* Волосы: один InstancedMesh вместо сотен draw calls */}
        {hairInstanced ? <primitive object={hairInstanced} dispose={null} /> : null}

        {/*
          Повязка: открытый цилиндр (только боковая поверхность) — непрерывное кольцо, без «двух коробок».
          Ось Y = вертикаль; низкая высота = тонкая лента вокруг головы (не толстый тор).
        */}
        <mesh position={[0, 1.41, 0.02]} renderOrder={4}>
          <cylinderGeometry args={[0.132, 0.132, 0.06, 48, 1, true]} />
          <meshStandardMaterial
            color="#020205"
            metalness={0}
            roughness={0.98}
            envMapIntensity={0}
            side={DoubleSide}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-1}
          />
        </mesh>
        </group>
      </group>
      {/* Брызги вне вращающегося торса — иначе их закрывает плащ и они слишком мелкие в кадре. */}
      <group position={[0, 0.22, 0]}>
        <primitive ref={splatMeshRef} object={splatMeshTemplate} dispose={null} />
      </group>
    </group>
    <primitive ref={stainMeshRef} object={stainMeshTemplate} dispose={null} />
    </>
  );
}
