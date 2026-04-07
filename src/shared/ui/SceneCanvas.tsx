"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useState } from "react";
import { PlayerAvatar } from "@/features/movement";

interface SceneCanvasProps {
  onNpcInteract: () => void;
}

function SceneObjects({
  canInteractWithNpc,
  onNpcInteract,
  onPlayerPositionChange,
}: {
  canInteractWithNpc: boolean;
  onNpcInteract: () => void;
  onPlayerPositionChange: (position: [number, number, number]) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[2, 4, 2]} intensity={1.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#19242f" />
      </mesh>
      <mesh
        position={[-1.2, 0, 0]}
        onClick={() => {
          if (canInteractWithNpc) {
            onNpcInteract();
          }
        }}
      >
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color={canInteractWithNpc ? "#7c3aed" : "#4f46e5"} />
      </mesh>
      <PlayerAvatar onPositionChange={onPlayerPositionChange} />
    </>
  );
}

export function SceneCanvas({ onNpcInteract }: SceneCanvasProps) {
  const [playerPosition, setPlayerPosition] = useState<[number, number, number]>([1.2, 0, 0]);

  const canInteractWithNpc = useMemo(() => {
    const npcPosition: [number, number, number] = [-1.2, 0, 0];
    const dx = playerPosition[0] - npcPosition[0];
    const dz = playerPosition[2] - npcPosition[2];
    const distance = Math.sqrt(dx * dx + dz * dz);
    return distance <= 1.6;
  }, [playerPosition]);

  return (
    <div className="sceneWrap">
      <div className="sceneOverlay">
        <p>WASD / стрелки: движение</p>
        <p>{canInteractWithNpc ? "Клик по кубу: поговорить с NPC" : "Подойди ближе к кубу для взаимодействия"}</p>
      </div>
      <Canvas camera={{ position: [0, 1.2, 3.5], fov: 60 }}>
        <SceneObjects
          canInteractWithNpc={canInteractWithNpc}
          onNpcInteract={onNpcInteract}
          onPlayerPositionChange={setPlayerPosition}
        />
        <OrbitControls enablePan={false} maxPolarAngle={1.5} />
      </Canvas>
    </div>
  );
}
