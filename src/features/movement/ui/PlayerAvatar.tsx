"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Mesh } from "three";
import { defaultMovementConfig } from "@/features/movement/model/types";

interface PlayerAvatarProps {
  onPositionChange: (position: [number, number, number]) => void;
}

export function PlayerAvatar({ onPositionChange }: PlayerAvatarProps) {
  const meshRef = useRef<Mesh>(null);
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

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }

    const keys = pressedCodesRef.current;
    const speed = defaultMovementConfig.speed * delta * 2;

    if (keys.KeyW || keys.ArrowUp) {
      mesh.position.z -= speed;
    }
    if (keys.KeyS || keys.ArrowDown) {
      mesh.position.z += speed;
    }
    if (keys.KeyA || keys.ArrowLeft) {
      mesh.position.x -= speed;
    }
    if (keys.KeyD || keys.ArrowRight) {
      mesh.position.x += speed;
    }

    mesh.position.x = Math.max(-4.5, Math.min(4.5, mesh.position.x));
    mesh.position.z = Math.max(-4.5, Math.min(4.5, mesh.position.z));

    onPositionChange([mesh.position.x, mesh.position.y, mesh.position.z]);
  });

  return (
    <mesh ref={meshRef} position={[1.2, 0, 0]}>
      <sphereGeometry args={[0.45, 32, 32]} />
      <meshStandardMaterial color="#10b981" />
    </mesh>
  );
}
