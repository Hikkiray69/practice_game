"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Mesh, type Group, type MeshStandardMaterial } from "three";
import { createFabricNoiseTexture } from "@/shared/lib/threeTextures";
import { TargetNpcInRangeRefContext } from "@/shared/ui/targetNpcInRangeContext";

interface NpcActorProps {
  id: string;
  name: string;
  role: string;
  position: [number, number, number];
  accent: string;
  highlight?: boolean;
  /** Без backdrop-filter на <Html> — на таче очень дорого. */
  coarsePointer?: boolean;
}

function NpcActorImpl({ name, role, position, accent, highlight = false, coarsePointer = false }: NpcActorProps) {
  const targetInRangeRef = useContext(TargetNpcInRangeRefContext);
  const groupRef = useRef<Group>(null);
  const beaconMatRef = useRef<MeshStandardMaterial | null>(null);
  const ringMatRef = useRef<MeshStandardMaterial | null>(null);
  const readyLineRef = useRef<HTMLDivElement | null>(null);
  const emissive = useMemo(() => (highlight ? accent : "#1f2a44"), [accent, highlight]);
  const fabricTex = useMemo(() => createFabricNoiseTexture({ base: "#dde6f2", seed: name.length * 123 + role.length * 17 }), [name.length, role.length]);

  function applyNpcShadowFlags() {
    const root = groupRef.current;
    if (!root) return;
    root.traverse((obj) => {
      if (!(obj instanceof Mesh)) return;
      const mat = obj.material;
      const mats = Array.isArray(mat) ? mat : mat ? [mat] : [];
      const skipCast = mats.some(
        (m) =>
          m &&
          typeof m === "object" &&
          "transparent" in m &&
          Boolean((m as MeshStandardMaterial).transparent) &&
          "depthWrite" in m &&
          (m as MeshStandardMaterial).depthWrite === false,
      );
      obj.castShadow = !skipCast;
      obj.receiveShadow = true;
    });
  }

  useLayoutEffect(() => {
    applyNpcShadowFlags();
  }, []);

  useEffect(() => {
    applyNpcShadowFlags();
  }, []);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    g.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.04;
    g.rotation.y = state.clock.elapsedTime * 0.35;

    if (!highlight) {
      const readyOff = readyLineRef.current;
      if (readyOff) {
        readyOff.style.opacity = "0";
        readyOff.style.maxHeight = "0";
        readyOff.setAttribute("aria-hidden", "true");
      }
      return;
    }
    const inRange = Boolean(targetInRangeRef?.current);
    const t = state.clock.elapsedTime;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
    const base = inRange ? 0.42 : 0.26;
    const ring = ringMatRef.current;
    const beacon = beaconMatRef.current;
    if (ring) {
      ring.opacity = base + pulse * (inRange ? 0.18 : 0.12);
      ring.emissiveIntensity = 0.9 + pulse * (inRange ? 0.9 : 0.55);
    }
    if (beacon) {
      beacon.opacity = 0.08 + pulse * (inRange ? 0.08 : 0.05);
      beacon.emissiveIntensity = 0.6 + pulse * (inRange ? 0.75 : 0.45);
    }
    const ready = readyLineRef.current;
    if (ready) {
      ready.style.opacity = inRange ? "0.9" : "0";
      ready.style.maxHeight = inRange ? "40px" : "0";
      ready.setAttribute("aria-hidden", inRange ? "false" : "true");
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* target beacon */}
      {highlight && (
        <group>
          <mesh position={[0, -0.74, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.72, 0.05, 8, coarsePointer ? 24 : 32]} />
            <meshStandardMaterial
              ref={(m) => {
                ringMatRef.current = m;
              }}
              color={accent}
              emissive={accent}
              emissiveIntensity={1.0}
              transparent
              opacity={0.32}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.085, 0.085, 1.35, coarsePointer ? 10 : 12]} />
            <meshStandardMaterial
              ref={(m) => {
                beaconMatRef.current = m;
              }}
              color={accent}
              emissive={accent}
              emissiveIntensity={0.65}
              transparent
              opacity={0.09}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* base */}
      <mesh position={[0, -0.68, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.1, 22]} />
        <meshStandardMaterial color="#0b1020" metalness={0.65} roughness={0.3} />
      </mesh>

      {/* “human-ish” placeholder */}
      <mesh position={[0, 0.1, 0]}>
        <capsuleGeometry args={[0.25, 0.6, 8, 16]} />
        <meshStandardMaterial
          map={fabricTex}
          color="#e2e8f0"
          emissive={emissive}
          emissiveIntensity={highlight ? 0.12 : 0.04}
          roughness={0.75}
          metalness={0.02}
        />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <sphereGeometry args={[0.22, 18, 18]} />
        <meshStandardMaterial map={fabricTex} color="#f1f5f9" roughness={0.85} metalness={0.0} />
      </mesh>

      {/* role jacket */}
      <mesh position={[0, 0.18, 0]}>
        <capsuleGeometry args={[0.28, 0.55, 8, 16]} />
        <meshStandardMaterial
          map={fabricTex}
          color={accent}
          emissive={accent}
          emissiveIntensity={highlight ? 0.06 : 0.03}
          roughness={0.78}
          metalness={0.0}
        />
      </mesh>

      {/* “working” arms */}
      <mesh position={[-0.28, 0.22, 0.1]} rotation={[0, 0, 0.35]}>
        <capsuleGeometry args={[0.07, 0.35, 6, 12]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.65} />
      </mesh>
      <mesh position={[0.28, 0.22, 0.1]} rotation={[0, 0, -0.35]}>
        <capsuleGeometry args={[0.07, 0.35, 6, 12]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.65} />
      </mesh>

      {/* label */}
      <Html
        center
        position={[0, 1.25, 0]}
        style={{ pointerEvents: "none" }}
        zIndexRange={[0, 10]}
        wrapperClass={`npcLabel${highlight ? " targetNpc" : ""}`}
      >
        <div
          style={{
            padding: "6px 8px",
            borderRadius: 10,
            border: `1px solid ${highlight ? "rgba(167,139,250,0.55)" : "rgba(148,163,184,0.25)"}`,
            background: "rgba(9,14,28,0.6)",
            color: "#e2e8f0",
            fontSize: 12,
            whiteSpace: "nowrap",
            ...(coarsePointer ? {} : { backdropFilter: "blur(6px)" }),
          }}
        >
          <div style={{ fontWeight: 700 }}>{name}</div>
          <div style={{ opacity: 0.8 }}>{role}</div>
          <div
            ref={readyLineRef}
            style={{
              marginTop: 4,
              opacity: 0,
              maxHeight: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}
            aria-hidden
          >
            Готов к диалогу
          </div>
        </div>
      </Html>
    </group>
  );
}

export const NpcActor = memo(NpcActorImpl);

