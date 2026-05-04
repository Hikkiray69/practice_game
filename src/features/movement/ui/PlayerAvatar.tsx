"use client";

import { useFrame } from "@react-three/fiber";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import { Vector3 } from "three";
import { defaultMovementConfig } from "@/features/movement/model/types";
import { createFabricNoiseTexture } from "@/shared/lib/threeTextures";

/** Совпадает с полом `TrainingHubLevel` (`mesh` на y = -0.8). */
const FLOOR_Y = -0.8;

interface PlayerAvatarProps {
  onPositionChange: (position: [number, number, number]) => void;
  collisionBoxes?: Array<{
    min: [number, number, number];
    max: [number, number, number];
  }>;
  virtualInput?: { x: number; z: number } | null;
  onMotionChange?: (motion: {
    position: [number, number, number];
    moveDir: [number, number, number]; // normalized, y=0
    speed: number; // units/sec
    yaw: number; // radians
  }) => void;
}

export function PlayerAvatar({ onPositionChange, onMotionChange, collisionBoxes, virtualInput }: PlayerAvatarProps) {
  const { camera } = useThree();
  const groupRef = useRef<Group>(null);
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

  const coatTex = useMemo(() => createFabricNoiseTexture({ base: "#050810", seed: 777 }), []);
  const coatLightTex = useMemo(() => createFabricNoiseTexture({ base: "#0c1528", seed: 776 }), []);
  const skinTex = useMemo(() => createFabricNoiseTexture({ base: "#eef2f7", seed: 778 }), []);
  const hairTex = useMemo(() => createFabricNoiseTexture({ base: "#f4f8ff", seed: 779 }), []);
  const blindTex = useMemo(() => createFabricNoiseTexture({ base: "#020408", seed: 775 }), []);

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

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    const keys = pressedCodesRef.current;
    const moveSpeed = defaultMovementConfig.speed * delta * 2;

    let moved = false;

    const kbX = (keys.KeyA || keys.ArrowLeft ? -1 : 0) + (keys.KeyD || keys.ArrowRight ? 1 : 0);
    const kbZ = (keys.KeyW || keys.ArrowUp ? 1 : 0) + (keys.KeyS || keys.ArrowDown ? -1 : 0);
    const inputX = typeof virtualInput?.x === "number" ? virtualInput.x : kbX;
    const inputZ = typeof virtualInput?.z === "number" ? virtualInput.z : kbZ;

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
      moved = true;
    }

    // Match the current office shell so NPCs/zones are reachable.
    group.position.x = Math.max(-18.0, Math.min(18.0, group.position.x));
    group.position.z = Math.max(-12.5, Math.min(9.5, group.position.z));

    if (moved) {
      const targetAngle = Math.atan2(move.x, move.z);
      group.rotation.y = targetAngle;
      lastMoveDirRef.current = [move.x, 0, move.z];
      group.position.y = FLOOR_Y;
    } else {
      group.position.y = FLOOR_Y + Math.sin(state.clock.elapsedTime * 2.5) * 0.01;
    }

    onPositionChange([group.position.x, group.position.y, group.position.z]);

    const pos: [number, number, number] = [group.position.x, group.position.y, group.position.z];
    const lastPos = lastPosRef.current;
    lastPosRef.current = pos;

    const vx = lastPos ? (pos[0] - lastPos[0]) / Math.max(1e-6, delta) : 0;
    const vz = lastPos ? (pos[2] - lastPos[2]) / Math.max(1e-6, delta) : 0;
    const planarSpeed = Math.hypot(vx, vz);

    const derivedDir: [number, number, number] = moved ? lastMoveDirRef.current : lastMoveDirRef.current;

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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[0.28, 0.62, 36]} />
        <meshBasicMaterial color="#050810" transparent opacity={0.5} />
      </mesh>

      {/* --- Gojo silhouette: широкие плечи, V-торс, расклешённый хаори, не «овал с головой» --- */}
      <group position={[0, 0, 0]}>
        {/* Низ плаща — уже снизу, чтобы ноги по бокам читались */}
        <mesh position={[0, 0.49, 0.01]} rotation={[0.03, 0, 0]}>
          <cylinderGeometry args={[0.13, 0.17, 0.3, 14]} />
          <meshStandardMaterial map={coatTex} color="#040814" metalness={0.1} roughness={0.82} />
        </mesh>
        <mesh position={[-0.1, 0.49, 0]} rotation={[0, 0, 0.12]}>
          <capsuleGeometry args={[0.1, 0.2, 6, 10]} />
          <meshStandardMaterial map={coatTex} color="#050a18" metalness={0.08} roughness={0.84} />
        </mesh>
        <mesh position={[0.1, 0.49, 0]} rotation={[0, 0, -0.12]}>
          <capsuleGeometry args={[0.1, 0.2, 6, 10]} />
          <meshStandardMaterial map={coatTex} color="#050a18" metalness={0.08} roughness={0.84} />
        </mesh>

        {/* Ноги: строго под корпусом (та же z, что у пояса), стопы у земли */}
        <mesh position={[-0.12, 0.215, 0.03]}>
          <capsuleGeometry args={[0.088, 0.34, 6, 12]} />
          <meshStandardMaterial
            map={coatTex}
            color="#02060f"
            metalness={0.06}
            roughness={0.88}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
        <mesh position={[0.12, 0.215, 0.03]}>
          <capsuleGeometry args={[0.088, 0.34, 6, 12]} />
          <meshStandardMaterial
            map={coatTex}
            color="#02060f"
            metalness={0.06}
            roughness={0.88}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
        <mesh position={[-0.12, 0.062, 0.03]}>
          <capsuleGeometry args={[0.078, 0.29, 6, 10]} />
          <meshStandardMaterial
            map={coatTex}
            color="#010408"
            metalness={0.05}
            roughness={0.9}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
        <mesh position={[0.12, 0.062, 0.03]}>
          <capsuleGeometry args={[0.078, 0.29, 6, 10]} />
          <meshStandardMaterial
            map={coatTex}
            color="#010408"
            metalness={0.05}
            roughness={0.9}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
        <mesh position={[-0.12, 0.0235, 0.03]} rotation={[0.02, 0, 0]}>
          <boxGeometry args={[0.12, 0.047, 0.22]} />
          <meshStandardMaterial
            map={blindTex}
            color="#010206"
            metalness={0.18}
            roughness={0.55}
            polygonOffset
            polygonOffsetFactor={-1.5}
            polygonOffsetUnits={-1}
          />
        </mesh>
        <mesh position={[0.12, 0.0235, 0.03]} rotation={[0.02, 0, 0]}>
          <boxGeometry args={[0.12, 0.047, 0.22]} />
          <meshStandardMaterial
            map={blindTex}
            color="#010206"
            metalness={0.18}
            roughness={0.55}
            polygonOffset
            polygonOffsetFactor={-1.5}
            polygonOffsetUnits={-1}
          />
        </mesh>

        {/* Пояс / пресс-зона — уже, подчёркивает ширину груди (+0.2 к торсу, ноги без изменений) */}
        <mesh position={[0, 0.85, 0.02]}>
          <cylinderGeometry args={[0.22, 0.16, 0.22, 12]} />
          <meshStandardMaterial map={coatLightTex} color="#0a1224" metalness={0.14} roughness={0.76} />
        </mesh>

        {/* Грудь и спина — широкий блок */}
        <mesh position={[0, 1.03, 0.02]}>
          <boxGeometry args={[0.52, 0.34, 0.26]} />
          <meshStandardMaterial map={coatLightTex} color="#0b1428" metalness={0.12} roughness={0.78} />
        </mesh>
        {/* Дельты / плечевой объём */}
        <mesh position={[-0.3, 1.09, 0.02]}>
          <sphereGeometry args={[0.13, 14, 14]} />
          <meshStandardMaterial map={coatTex} color="#060d1c" metalness={0.1} roughness={0.8} />
        </mesh>
        <mesh position={[0.3, 1.09, 0.02]}>
          <sphereGeometry args={[0.13, 14, 14]} />
          <meshStandardMaterial map={coatTex} color="#060d1c" metalness={0.1} roughness={0.8} />
        </mesh>

        {/* Руки в рукаве — длинные, с наклоном «уверенная стойка» */}
        <mesh position={[-0.38, 0.93, 0.02]} rotation={[0.12, 0, -0.35]}>
          <capsuleGeometry args={[0.095, 0.42, 6, 12]} />
          <meshStandardMaterial map={coatTex} color="#050a16" metalness={0.09} roughness={0.83} />
        </mesh>
        <mesh position={[0.38, 0.93, 0.02]} rotation={[0.12, 0, 0.35]}>
          <capsuleGeometry args={[0.095, 0.42, 6, 12]} />
          <meshStandardMaterial map={coatTex} color="#050a16" metalness={0.09} roughness={0.83} />
        </mesh>
        {/* Предплечья чуть толще — «накаченный» силуэт */}
        <mesh position={[-0.48, 0.69, 0.06]} rotation={[0.08, 0, -0.25]}>
          <capsuleGeometry args={[0.1, 0.28, 6, 10]} />
          <meshStandardMaterial map={coatTex} color="#040812" metalness={0.08} roughness={0.85} />
        </mesh>
        <mesh position={[0.48, 0.69, 0.06]} rotation={[0.08, 0, 0.25]}>
          <capsuleGeometry args={[0.1, 0.28, 6, 10]} />
          <meshStandardMaterial map={coatTex} color="#040812" metalness={0.08} roughness={0.85} />
        </mesh>

        {/* Высокий ворот хаори */}
        <mesh position={[0, 1.19, 0.04]}>
          <cylinderGeometry args={[0.15, 0.17, 0.14, 12]} />
          <meshStandardMaterial map={coatTex} color="#02060f" metalness={0.15} roughness={0.72} />
        </mesh>

        {/* Шея */}
        <mesh position={[0, 1.29, 0.02]}>
          <cylinderGeometry args={[0.075, 0.08, 0.1, 10]} />
          <meshStandardMaterial map={skinTex} color="#e8edf5" metalness={0.02} roughness={0.88} />
        </mesh>

        {/* Голова — вытянутая, не шарик-мяч */}
        <mesh position={[0, 1.4, 0.02]} scale={[0.88, 1.05, 0.92]}>
          <sphereGeometry args={[0.15, 20, 20]} />
          <meshStandardMaterial map={skinTex} color="#eef2f7" metalness={0.04} roughness={0.86} />
        </mesh>
        {/* Скулы / нижняя челюсть лёгкий объём */}
        <mesh position={[0, 1.34, 0.1]} scale={[1.05, 0.55, 0.75]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial map={skinTex} color="#e2e8f0" metalness={0.03} roughness={0.88} />
        </mesh>

        {/* Слепая повязка — тор вокруг головы (геометрия three в XY; Rx -90° → кольцо в XZ вокруг Y) */}
        <mesh position={[0, 1.395, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.152, 0.038, 10, 28]} />
          <meshStandardMaterial map={blindTex} color="#010308" metalness={0.22} roughness={0.45} />
        </mesh>

        {/* Белые волосы — культовые шипы, выше и агрессивнее */}
        <mesh position={[-0.1, 1.51, 0.06]} rotation={[0.45, -0.35, -0.2]}>
          <coneGeometry args={[0.1, 0.38, 8]} />
          <meshStandardMaterial map={hairTex} color="#ffffff" roughness={0.55} metalness={0.08} />
        </mesh>
        <mesh position={[0.11, 1.51, 0.05]} rotation={[0.48, 0.4, 0.22]}>
          <coneGeometry args={[0.1, 0.36, 8]} />
          <meshStandardMaterial map={hairTex} color="#fbfdff" roughness={0.52} metalness={0.1} />
        </mesh>
        <mesh position={[0, 1.53, -0.08]} rotation={[0.55, 0, 0]}>
          <coneGeometry args={[0.12, 0.45, 8]} />
          <meshStandardMaterial map={hairTex} color="#ffffff" roughness={0.5} metalness={0.1} />
        </mesh>
        <mesh position={[-0.14, 1.46, -0.04]} rotation={[0.35, -0.6, -0.35]}>
          <coneGeometry args={[0.07, 0.28, 6]} />
          <meshStandardMaterial map={hairTex} color="#f8fafc" roughness={0.58} metalness={0.06} />
        </mesh>
        <mesh position={[0.14, 1.46, -0.05]} rotation={[0.35, 0.55, 0.35]}>
          <coneGeometry args={[0.07, 0.28, 6]} />
          <meshStandardMaterial map={hairTex} color="#f8fafc" roughness={0.58} metalness={0.06} />
        </mesh>
        <mesh position={[0, 1.49, 0.12]} rotation={[0.85, 0, 0]}>
          <coneGeometry args={[0.09, 0.22, 6]} />
          <meshStandardMaterial map={hairTex} color="#ffffff" roughness={0.55} metalness={0.08} />
        </mesh>
      </group>
    </group>
  );
}
