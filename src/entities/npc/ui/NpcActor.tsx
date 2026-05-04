"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";

interface NpcActorProps {
  id: string;
  name: string;
  role: string;
  position: [number, number, number];
  accent: string;
  active: boolean;
}

export function NpcActor({ name, role, position, accent, active }: NpcActorProps) {
  const groupRef = useRef<Group>(null);
  const emissive = useMemo(() => (active ? accent : "#1f2a44"), [accent, active]);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    g.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.04;
    g.rotation.y = state.clock.elapsedTime * 0.35;
  });

  return (
    <group ref={groupRef} position={position}>
      {/* hologram base */}
      <mesh position={[0, -0.65, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.12, 24]} />
        <meshStandardMaterial color="#0b1020" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* scan rings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
        <ringGeometry args={[0.35, 0.62, 48]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={active ? 0.9 : 0.35} />
      </mesh>

      {/* hologram body */}
      <mesh position={[0, 0.0, 0]}>
        <cylinderGeometry args={[0.28, 0.34, 1.05, 24]} />
        <meshStandardMaterial color={accent} emissive={emissive} emissiveIntensity={active ? 0.9 : 0.25} />
      </mesh>

      {/* head */}
      <mesh position={[0, 0.72, 0]}>
        <sphereGeometry args={[0.23, 24, 24]} />
        <meshStandardMaterial color={accent} emissive={emissive} emissiveIntensity={active ? 1 : 0.3} />
      </mesh>

      {/* shoulder lights */}
      <mesh position={[-0.22, 0.35, 0.05]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#e2e8f0" emissive={accent} emissiveIntensity={active ? 1 : 0.4} />
      </mesh>
      <mesh position={[0.22, 0.35, 0.05]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#e2e8f0" emissive={accent} emissiveIntensity={active ? 1 : 0.4} />
      </mesh>

      {/* label */}
      <Html
        center
        position={[0, 1.25, 0]}
        style={{ pointerEvents: "none" }}
        zIndexRange={[0, 10]}
        wrapperClass="npcLabel"
      >
        <div
          style={{
            padding: "6px 8px",
            borderRadius: 10,
            border: `1px solid ${active ? accent : "rgba(148,163,184,0.25)"}`,
            background: "rgba(9,14,28,0.6)",
            color: "#e2e8f0",
            fontSize: 12,
            whiteSpace: "nowrap",
            backdropFilter: "blur(6px)",
          }}
        >
          <div style={{ fontWeight: 700 }}>{name}</div>
          <div style={{ opacity: 0.8 }}>{role}</div>
          {active && <div style={{ marginTop: 4, fontWeight: 700 }}>Нажмите E</div>}
        </div>
      </Html>
    </group>
  );
}

