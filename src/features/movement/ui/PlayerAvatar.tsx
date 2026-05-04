"use client";

import { useFrame } from "@react-three/fiber";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import { Vector3 } from "three";
import { defaultMovementConfig } from "@/features/movement/model/types";
import { createFabricNoiseTexture } from "@/shared/lib/threeTextures";

interface PlayerAvatarProps {
  onPositionChange: (position: [number, number, number]) => void;
  collisionBoxes?: Array<{
    min: [number, number, number];
    max: [number, number, number];
  }>;
  onMotionChange?: (motion: {
    position: [number, number, number];
    moveDir: [number, number, number]; // normalized, y=0
    speed: number; // units/sec
    yaw: number; // radians
  }) => void;
}

export function PlayerAvatar({ onPositionChange, onMotionChange, collisionBoxes }: PlayerAvatarProps) {
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

  const coatTex = useMemo(() => createFabricNoiseTexture({ base: "#0b1020", seed: 777 }), []);
  const skinTex = useMemo(() => createFabricNoiseTexture({ base: "#f8fafc", seed: 778 }), []);
  const hairTex = useMemo(() => createFabricNoiseTexture({ base: "#ffffff", seed: 779 }), []);

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

    const inputX = (keys.KeyA || keys.ArrowLeft ? -1 : 0) + (keys.KeyD || keys.ArrowRight ? 1 : 0);
    const inputZ = (keys.KeyW || keys.ArrowUp ? 1 : 0) + (keys.KeyS || keys.ArrowDown ? -1 : 0);

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
    } else {
      group.position.y = Math.sin(state.clock.elapsedTime * 2.5) * 0.01;
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
    <group ref={groupRef} position={[1.2, 0, 0]}>
      {/* shadow-ish ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.49, 0]}>
        <ringGeometry args={[0.22, 0.5, 32]} />
        <meshBasicMaterial color="#0b1020" transparent opacity={0.55} />
      </mesh>

      {/* body (Gojo-ish silhouette: tall dark coat) */}
      <mesh position={[0, 0.12, 0]}>
        <capsuleGeometry args={[0.26, 0.72, 8, 16]} />
        <meshStandardMaterial map={coatTex} color="#0b1020" metalness={0.08} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.22, 0.02]}>
        <capsuleGeometry args={[0.285, 0.68, 8, 16]} />
        <meshStandardMaterial map={coatTex} color="#0f172a" metalness={0.06} roughness={0.92} />
      </mesh>

      {/* head */}
      <mesh position={[0, 0.86, 0]}>
        <sphereGeometry args={[0.2, 18, 18]} />
        <meshStandardMaterial map={skinTex} color="#f8fafc" metalness={0.0} roughness={0.95} />
      </mesh>

      {/* blindfold */}
      <mesh position={[0, 0.86, 0.18]}>
        <boxGeometry args={[0.26, 0.08, 0.03]} />
        <meshStandardMaterial map={coatTex} color="#0b1020" roughness={0.92} metalness={0.02} />
      </mesh>

      {/* hair spikes */}
      <mesh position={[-0.08, 1.02, 0.03]} rotation={[0.2, -0.2, 0.1]}>
        <coneGeometry args={[0.12, 0.22, 10]} />
        <meshStandardMaterial map={hairTex} color="#ffffff" roughness={0.85} metalness={0.0} />
      </mesh>
      <mesh position={[0.08, 1.02, 0.02]} rotation={[0.2, 0.25, -0.1]}>
        <coneGeometry args={[0.12, 0.22, 10]} />
        <meshStandardMaterial map={hairTex} color="#ffffff" roughness={0.85} metalness={0.0} />
      </mesh>
      <mesh position={[0.0, 1.04, -0.06]} rotation={[0.35, 0.0, 0]}>
        <coneGeometry args={[0.13, 0.26, 10]} />
        <meshStandardMaterial map={hairTex} color="#ffffff" roughness={0.85} metalness={0.0} />
      </mesh>
    </group>
  );
}
