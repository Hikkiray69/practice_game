"use client";

import { useFrame } from "@react-three/fiber";
import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import {
  ConeGeometry,
  DoubleSide,
  Euler,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import { defaultMovementConfig } from "@/features/movement/model/types";
import { createFabricNoiseTexture } from "@/shared/lib/threeTextures";

/** Совпадает с полом `TrainingHubLevel` (`mesh` на y = -0.8). */
const FLOOR_Y = -0.8;

/** Плавный поворот к целевому yaw по кратчайшей дуге (рад). */
function lerpYawShortest(from: number, to: number, alpha: number): number {
  let d = to - from;
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return from + d * alpha;
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
}

export function PlayerAvatar({
  onPositionChange,
  onMotionChange,
  collisionBoxes,
  virtualInput,
  virtualInputRef,
}: PlayerAvatarProps) {
  const { camera } = useThree();
  const groupRef = useRef<Group>(null);
  const legsGroupRef = useRef<Group>(null);
  const wheelchairGroupRef = useRef<Group>(null);
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
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
  }, [hairInstanced]);

  useEffect(() => {
    applyCharacterShadowFlags();
  }, [hairInstanced]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    const keys = pressedCodesRef.current;
    const wheelchairMode = Boolean(
      (keys.Digit6 && keys.Digit7) || (keys.Numpad6 && keys.Numpad7),
    );
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
  });

  return (
    <group ref={groupRef} position={[1.2, FLOOR_Y, 0]}>
      {/* --- Gojo silhouette: широкие плечи, V-торс, расклешённый хаори, не «овал с головой» --- */}
      <group position={[0, 0, 0]}>
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

        {/* Ноги — скрываются при удержании 6+7 (Digit6 + Digit7) */}
        <group ref={legsGroupRef}>
          <mesh position={[-0.12, 0.215, 0.03]}>
            <capsuleGeometry args={[0.088, 0.34, 6, 12]} />
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
          <mesh position={[0.12, 0.215, 0.03]}>
            <capsuleGeometry args={[0.088, 0.34, 6, 12]} />
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
          <mesh position={[-0.12, 0.062, 0.03]}>
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
          <mesh position={[0.12, 0.062, 0.03]}>
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
          {/* Обувь — не blindTex (иначе как вторая «повязка» + тот же ржавый оттенок в тени). */}
          <mesh position={[-0.12, 0.0235, 0.03]} rotation={[0.02, 0, 0]}>
            <boxGeometry args={[0.12, 0.047, 0.22]} />
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
          <mesh position={[0.12, 0.0235, 0.03]} rotation={[0.02, 0, 0]}>
            <boxGeometry args={[0.12, 0.047, 0.22]} />
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

        {/* Easter egg 6+7: коляска — колёса цилиндром Rz(π/2): ось вдоль X, диск в YZ (вертикально, не тор в XY) */}
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

        {/* Руки в рукаве — длинные, с наклоном «уверенная стойка» */}
        <mesh position={[-0.38, 0.93, 0.02]} rotation={[0.12, 0, -0.35]}>
          <capsuleGeometry args={[0.095, 0.42, 6, 12]} />
          <meshStandardMaterial map={coatTex} color="#ffffff" metalness={0.09} roughness={0.83} envMapIntensity={0.52} />
        </mesh>
        <mesh position={[0.38, 0.93, 0.02]} rotation={[0.12, 0, 0.35]}>
          <capsuleGeometry args={[0.095, 0.42, 6, 12]} />
          <meshStandardMaterial map={coatTex} color="#ffffff" metalness={0.09} roughness={0.83} envMapIntensity={0.52} />
        </mesh>
        {/* Предплечье в рукаве + кисть натурального цвета */}
        <group position={[-0.48, 0.69, 0.06]} rotation={[0.08, 0, -0.25]}>
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
        <group position={[0.48, 0.69, 0.06]} rotation={[0.08, 0, 0.25]}>
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
  );
}
