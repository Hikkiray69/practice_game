"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group } from "three";
import { defaultMovementConfig } from "@/features/movement/model/types";

interface PlayerAvatarProps {
  onPositionChange: (position: [number, number, number]) => void;
}

export function PlayerAvatar({ onPositionChange }: PlayerAvatarProps) {
  const groupRef = useRef<Group>(null);
  const pressedCodesRef = useRef<Record<string, boolean>>({});

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
    const speed = defaultMovementConfig.speed * delta * 2;

    let moved = false;

    if (keys.KeyW || keys.ArrowUp) {
      group.position.z -= speed;
      moved = true;
    }
    if (keys.KeyS || keys.ArrowDown) {
      group.position.z += speed;
      moved = true;
    }
    if (keys.KeyA || keys.ArrowLeft) {
      group.position.x -= speed;
      moved = true;
    }
    if (keys.KeyD || keys.ArrowRight) {
      group.position.x += speed;
      moved = true;
    }

    group.position.x = Math.max(-7.5, Math.min(7.5, group.position.x));
    group.position.z = Math.max(-7.5, Math.min(7.5, group.position.z));

    if (moved) {
      const forwardX = 0;
      const forwardZ = -1;
      const dx = (keys.KeyA || keys.ArrowLeft ? -1 : 0) + (keys.KeyD || keys.ArrowRight ? 1 : 0);
      const dz = (keys.KeyW || keys.ArrowUp ? -1 : 0) + (keys.KeyS || keys.ArrowDown ? 1 : 0);
      const len = Math.hypot(dx, dz) || 1;
      const ndx = dx / len;
      const ndz = dz / len;
      const targetAngle = Math.atan2(ndx || forwardX, ndz || forwardZ);
      group.rotation.y = targetAngle;
    } else {
      group.position.y = Math.sin(state.clock.elapsedTime * 2.5) * 0.01;
    }

    onPositionChange([group.position.x, group.position.y, group.position.z]);
  });

  return (
    <group ref={groupRef} position={[1.2, 0, 0]}>
      {/* shadow-ish ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.49, 0]}>
        <ringGeometry args={[0.22, 0.5, 32]} />
        <meshBasicMaterial color="#0b1020" transparent opacity={0.55} />
      </mesh>

      {/* body */}
      <mesh position={[0, 0.1, 0]}>
        <capsuleGeometry args={[0.28, 0.55, 8, 16]} />
        <meshStandardMaterial color="#10b981" metalness={0.25} roughness={0.35} />
      </mesh>

      {/* head */}
      <mesh position={[0, 0.66, 0]}>
        <sphereGeometry args={[0.2, 20, 20]} />
        <meshStandardMaterial color="#34d399" metalness={0.2} roughness={0.4} />
      </mesh>

      {/* visor/front indicator */}
      <mesh position={[0, 0.66, 0.18]}>
        <boxGeometry args={[0.22, 0.08, 0.02]} />
        <meshStandardMaterial color="#a78bfa" emissive="#7c3aed" emissiveIntensity={0.55} />
      </mesh>
    </group>
  );
}
