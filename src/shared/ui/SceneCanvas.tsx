"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { PlayerAvatar } from "@/features/movement";
import { NpcActor } from "@/entities/npc";
import { useFrame, useThree } from "@react-three/fiber";
import { TrainingHubLevel } from "@/entities/level";
import { InteractionPrompt } from "@/features/interaction-prompt";
import { Vector3 } from "three";

interface SceneCanvasProps {
  activeNpcId: string;
  onNpcInteract: (npcId: string) => void;
}

const NPCS = [
  {
    id: "npc-responsibility",
    name: "Куратор миссий",
    role: "Ответственность",
    // Open space (left wing)
    position: [-14.0, 0.0, 5.2] as [number, number, number],
    accent: "#7c3aed",
  },
  {
    id: "npc-transparency",
    name: "Тимлид",
    role: "Прозрачность",
    // Meeting room (center-front)
    position: [0.0, 0.0, 2.9] as [number, number, number],
    accent: "#38bdf8",
  },
  {
    id: "npc-speed",
    name: "Релиз-инженер",
    role: "Скорость",
    // Break room (near windows)
    position: [2.6, 0.0, -8.6] as [number, number, number],
    accent: "#f59e0b",
  },
] as const;

function SceneObjects({ playerPosition, activeNpcId }: { playerPosition: [number, number, number]; activeNpcId: string }) {
  return (
    <>
      <TrainingHubLevel />

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
    </>
  );
}

function FollowCamera({
  target,
  moveDir,
  speed,
}: {
  target: [number, number, number];
  moveDir: [number, number, number];
  speed: number;
}) {
  const { camera } = useThree();
  const state = useMemo(() => {
    return {
      // persistent state for smooth-damping
      camVel: new Vector3(0, 0, 0),
      lookVel: new Vector3(0, 0, 0),
      currentLook: new Vector3(0, 0.78, 0),
      baseForward: new Vector3(0, 0, -1), // fixed yaw (no drift)
      desiredPos: new Vector3(),
      desiredLook: new Vector3(),
      tmpRight: new Vector3(),
      tmpTarget: new Vector3(),
      tmpBehind: new Vector3(),
    };
  }, []);

  function smoothDampVec3(
    current: Vector3,
    targetVec: Vector3,
    velocity: Vector3,
    smoothTime: number,
    delta: number,
  ) {
    // Unity-like smooth damp (critically damped spring), per-axis.
    const st = Math.max(0.0001, smoothTime);
    const omega = 2 / st;
    const x = omega * delta;
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

    const changeX = current.x - targetVec.x;
    const changeY = current.y - targetVec.y;
    const changeZ = current.z - targetVec.z;

    const tempX = (velocity.x + omega * changeX) * delta;
    const tempY = (velocity.y + omega * changeY) * delta;
    const tempZ = (velocity.z + omega * changeZ) * delta;

    velocity.x = (velocity.x - omega * tempX) * exp;
    velocity.y = (velocity.y - omega * tempY) * exp;
    velocity.z = (velocity.z - omega * tempZ) * exp;

    current.x = targetVec.x + (changeX + tempX) * exp;
    current.y = targetVec.y + (changeY + tempY) * exp;
    current.z = targetVec.z + (changeZ + tempZ) * exp;
  }

  useFrame((_, delta) => {
    /* eslint-disable react-hooks/immutability */
    // IMPORTANT: movement is camera-relative, so we keep camera yaw FIXED here.
    // Otherwise you get a slow drift and the character starts moving in an arc.
    const forward = state.baseForward; // fixed world direction
    const behind = state.tmpBehind.copy(forward).multiplyScalar(-1);
    const right = state.tmpRight.set(-forward.z, 0, forward.x).normalize();

    // 2) Stable 3rd-person offset (tilted view: up + behind + slight shoulder).
    const baseBehind = 6.2;
    const speedAdd = Math.min(1.4, speed * 0.08);
    const behindDistance = baseBehind + speedAdd;
    const up = 4.6;

    // 3) Soft feedback: tiny shift toward movement (inertia feel).
    const side = 0.72;
    const moveLen = Math.hypot(moveDir[0], moveDir[2]);
    const lateralDrift = moveLen > 0.001 ? Math.min(0.28, speed * 0.015) : 0;

    state.desiredPos.set(target[0], target[1], target[2]);
    state.desiredPos.addScaledVector(behind, behindDistance);
    state.desiredPos.addScaledVector(right, side + lateralDrift);
    state.desiredPos.y = up;

    // 4) Look-ahead: keep yaw stable (use baseForward only).
    const lookAhead = 1.25 + Math.min(0.45, speed * 0.03);
    state.desiredLook.set(target[0], 0.78, target[2]);
    state.desiredLook.addScaledVector(forward, lookAhead);

    // 5) SmoothDamp (spring) gives “догоняние” + inertia, but remains stable.
    // Slightly different times for position vs look target.
    const posSmooth = 0.2;
    const lookSmooth = 0.12;

    const camPos = camera.position;
    smoothDampVec3(camPos, state.desiredPos, state.camVel, posSmooth, delta);

    // Keep lookAt also smooth to avoid snapping on sudden turns.
    smoothDampVec3(state.currentLook, state.desiredLook, state.lookVel, lookSmooth, delta);
    camera.lookAt(state.currentLook);
    /* eslint-enable react-hooks/immutability */
  });
  return null;
}

export function SceneCanvas({ onNpcInteract, activeNpcId }: SceneCanvasProps) {
  const [playerPosition, setPlayerPosition] = useState<[number, number, number]>([0, 0, 4.5]);
  const [playerMoveDir, setPlayerMoveDir] = useState<[number, number, number]>([0, 0, -1]);
  const [playerSpeed, setPlayerSpeed] = useState(0);

  const collisionBoxes = useMemo(() => {
    function boxFromCenterSize(
      center: [number, number, number],
      size: [number, number, number],
    ): { min: [number, number, number]; max: [number, number, number] } {
      const yMin = -0.8;
      const yMax = -0.8 + Math.max(0.1, size[1]);
      return {
        min: [center[0] - size[0] / 2, yMin, center[2] - size[2] / 2],
        max: [center[0] + size[0] / 2, yMax, center[2] + size[2] / 2],
      };
    }

    return [
      // Planter rows (approx AABB around rim volume; foliage is decorative)
      boxFromCenterSize([-6.5, -0.8, -5.5], [0.62, 0.22, 6.0]),
      boxFromCenterSize([-6.5, -0.8, 0.0], [0.62, 0.22, 6.0]),
      boxFromCenterSize([6.5, -0.8, -5.5], [0.62, 0.22, 6.0]),
      boxFromCenterSize([6.5, -0.8, 0.0], [0.62, 0.22, 6.0]),
      boxFromCenterSize([-4.1, -0.8, 2.2], [5.0, 0.22, 0.62]),
      boxFromCenterSize([4.1, -0.8, 2.2], [5.0, 0.22, 0.62]),
    ];
  }, []);

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
        <PlayerAvatar
          onPositionChange={setPlayerPosition}
          collisionBoxes={collisionBoxes}
          onMotionChange={(motion) => {
            setPlayerMoveDir(motion.moveDir);
            setPlayerSpeed(motion.speed);
          }}
        />
        <FollowCamera target={playerPosition} moveDir={playerMoveDir} speed={playerSpeed} />
      </Canvas>

      <div className="topHint">
        <div className="hintPill">WASD/стрелки: движение</div>
      </div>

      <InteractionPrompt
        isVisible={canInteract}
        title={`Поговорить: ${activeNpc.name}`}
        subtitle={activeNpc.role}
        keyLabel="E"
      />
    </div>
  );
}
