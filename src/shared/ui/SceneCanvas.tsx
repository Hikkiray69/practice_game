"use client";

import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import { PlayerAvatar } from "@/features/movement";
import { NpcActor } from "@/entities/npc";
import { useFrame, useThree } from "@react-three/fiber";

interface SceneCanvasProps {
  activeNpcId: string;
  onNpcInteract: (npcId: string) => void;
}

const NPCS = [
  {
    id: "npc-responsibility",
    name: "Куратор миссий",
    role: "Ответственность",
    position: [-6.2, 0.0, -2.2] as [number, number, number],
    accent: "#7c3aed",
  },
  {
    id: "npc-transparency",
    name: "Тимлид",
    role: "Прозрачность",
    position: [0.0, 0.0, -6.0] as [number, number, number],
    accent: "#38bdf8",
  },
  {
    id: "npc-speed",
    name: "Релиз-инженер",
    role: "Скорость",
    position: [6.0, 0.0, -2.4] as [number, number, number],
    accent: "#f59e0b",
  },
] as const;

function SceneObjects({ playerPosition, activeNpcId }: { playerPosition: [number, number, number]; activeNpcId: string }) {
  return (
    <>
      <color attach="background" args={["#050914"]} />
      <fog attach="fog" args={["#050914", 6, 28]} />

      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 10, 4]} intensity={1.05} />
      <pointLight position={[-6, 2.5, -2]} intensity={14} color="#7c3aed" distance={8} />
      <pointLight position={[0, 2.6, -6]} intensity={12} color="#38bdf8" distance={8} />
      <pointLight position={[6, 2.5, -2]} intensity={12} color="#f59e0b" distance={8} />

      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]} receiveShadow>
        <planeGeometry args={[28, 28]} />
        <meshStandardMaterial color="#0b1326" metalness={0.1} roughness={0.9} />
      </mesh>

      {/* hub ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.79, -2.2]}>
        <ringGeometry args={[2.6, 3.3, 64]} />
        <meshStandardMaterial color="#1e293b" emissive="#1e293b" emissiveIntensity={0.25} />
      </mesh>

      {/* zone pads */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6.2, -0.79, -2.2]}>
        <circleGeometry args={[2.2, 48]} />
        <meshStandardMaterial color="#1b1030" emissive="#7c3aed" emissiveIntensity={0.15} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.79, -6.0]}>
        <circleGeometry args={[2.2, 48]} />
        <meshStandardMaterial color="#071b2a" emissive="#38bdf8" emissiveIntensity={0.12} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6.0, -0.79, -2.4]}>
        <circleGeometry args={[2.2, 48]} />
        <meshStandardMaterial color="#2a1b05" emissive="#f59e0b" emissiveIntensity={0.12} />
      </mesh>

      {/* simple blockers / walls */}
      <mesh position={[0, 0.25, 6.2]}>
        <boxGeometry args={[20, 2.2, 0.6]} />
        <meshStandardMaterial color="#0a1020" metalness={0.2} roughness={0.55} />
      </mesh>
      <mesh position={[-10.2, 0.25, -2.0]}>
        <boxGeometry args={[0.6, 2.2, 16]} />
        <meshStandardMaterial color="#0a1020" metalness={0.2} roughness={0.55} />
      </mesh>
      <mesh position={[10.2, 0.25, -2.0]}>
        <boxGeometry args={[0.6, 2.2, 16]} />
        <meshStandardMaterial color="#0a1020" metalness={0.2} roughness={0.55} />
      </mesh>

      {/* NPCs */}
      {NPCS.map((npc) => {
        const dx = playerPosition[0] - npc.position[0];
        const dz = playerPosition[2] - npc.position[2];
        const distance = Math.sqrt(dx * dx + dz * dz);
        const canInteract = distance <= 1.9 && npc.id === activeNpcId;
        return (
          <NpcActor
            key={npc.id}
            id={npc.id}
            name={npc.name}
            role={npc.role}
            position={npc.position}
            accent={npc.accent}
            active={canInteract}
          />
        );
      })}

      <Environment preset="city" />
    </>
  );
}

function FollowCamera({ target }: { target: [number, number, number] }) {
  const { camera } = useThree();
  useFrame(() => {
    /* eslint-disable react-hooks/immutability */
    const desired = {
      x: target[0],
      y: 5.2,
      z: target[2] + 9.5,
    };
    camera.position.x += (desired.x - camera.position.x) * 0.08;
    camera.position.y += (desired.y - camera.position.y) * 0.08;
    camera.position.z += (desired.z - camera.position.z) * 0.08;
    camera.lookAt(target[0], 0.6, target[2]);
    /* eslint-enable react-hooks/immutability */
  });
  return null;
}

export function SceneCanvas({ onNpcInteract, activeNpcId }: SceneCanvasProps) {
  const [playerPosition, setPlayerPosition] = useState<[number, number, number]>([0, 0, 4.5]);

  const activeNpc = useMemo(() => NPCS.find((n) => n.id === activeNpcId) ?? NPCS[0], [activeNpcId]);

  const canInteract = useMemo(() => {
    const dx = playerPosition[0] - activeNpc.position[0];
    const dz = playerPosition[2] - activeNpc.position[2];
    return Math.sqrt(dx * dx + dz * dz) <= 1.9;
  }, [activeNpc.position, playerPosition]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== "KeyE") return;
      if (!canInteract) return;
      onNpcInteract(activeNpcId);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeNpcId, canInteract, onNpcInteract]);

  return (
    <div className="sceneWrap fullscreen">
      <Canvas camera={{ position: [0, 4.8, 10.5], fov: 55 }}>
        <SceneObjects playerPosition={playerPosition} activeNpcId={activeNpcId} />
        <PlayerAvatar onPositionChange={setPlayerPosition} />
        <FollowCamera target={playerPosition} />
      </Canvas>

      <div className="topHint">
        <div className="hintPill">WASD/стрелки: движение</div>
        <div className="hintPill">
          {canInteract ? `E: поговорить с NPC (${activeNpc.role})` : `Подойди к NPC (${activeNpc.role}), затем нажми E`}
        </div>
      </div>
    </div>
  );
}
