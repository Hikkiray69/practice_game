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
        const isTarget = npc.id === activeNpcId;
        const canInteract = distance <= 1.9 && isTarget;
        return (
          <NpcActor
            key={npc.id}
            id={npc.id}
            name={npc.name}
            role={npc.role}
            position={npc.position}
            accent={npc.accent}
            highlight={isTarget}
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
}: {
  target: [number, number, number];
  moveDir: [number, number, number];
}) {
  const { camera } = useThree();
  const state = useMemo(() => {
    return {
      // persistent state for smooth-damping
      camVel: new Vector3(0, 0, 0),
      lookVel: new Vector3(0, 0, 0),
      /** Смещение точки взгляда (XZ) в сторону стрейфа — орбита камеры не трогается. */
      lookStrafeOffset: new Vector3(0, 0, 0),
      lookStrafeVel: new Vector3(0, 0, 0),
      currentLook: new Vector3(0, 1.0, 0),
      baseForward: new Vector3(0, 0, -1), // fixed yaw (no drift)
      desiredPos: new Vector3(),
      desiredLook: new Vector3(),
      tmpBehind: new Vector3(),
      tmpTarget: new Vector3(),
      camFlatFwd: new Vector3(0, 0, -1),
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

    // 2) Орбита камеры — только фиксированный yaw 45° (стрейф орбиту не крутит).
    const behindDistance = 6.2;
    const up = 4.6;

    const yaw = Math.PI / 4;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const bx = behind.x * cos + behind.z * sin;
    const bz = -behind.x * sin + behind.z * cos;

    state.desiredPos.set(target[0], target[1], target[2]);
    state.desiredPos.x += bx * behindDistance;
    state.desiredPos.z += bz * behindDistance;
    state.desiredPos.y = up;

    // 3) Точка взгляда: база у головы ГГ + сдвиг только по стрейфу (экран влево/вправо) — открывается обзор, позиция камеры та же.
    const moveLen = Math.hypot(moveDir[0], moveDir[2]);
    camera.getWorldDirection(state.camFlatFwd);
    let fcx = state.camFlatFwd.x;
    let fcz = state.camFlatFwd.z;
    const fcl = Math.hypot(fcx, fcz);
    if (fcl > 1e-6) {
      fcx /= fcl;
      fcz /= fcl;
    } else {
      fcx = 0;
      fcz = -1;
    }
    const crnx = -fcz;
    const crnz = fcx;

    const strafeLookMax = 0.92;
    let tx = 0;
    let tz = 0;
    if (moveLen > 0.02) {
      const inv = 1 / moveLen;
      const strafe = moveDir[0] * inv * crnx + moveDir[2] * inv * crnz;
      const s = Math.max(-1, Math.min(1, strafe));
      tx = crnx * s * strafeLookMax;
      tz = crnz * s * strafeLookMax;
    }
    state.tmpTarget.set(tx, 0, tz);
    smoothDampVec3(state.lookStrafeOffset, state.tmpTarget, state.lookStrafeVel, 0.28, delta);

    state.desiredLook.set(target[0], 1.0, target[2]);
    state.desiredLook.addScaledVector(forward, 0.22);
    state.desiredLook.x += state.lookStrafeOffset.x;
    state.desiredLook.z += state.lookStrafeOffset.z;

    const posSmooth = 0.26;
    const lookSmooth = 0.22;

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
  const [playerPosition, setPlayerPosition] = useState<[number, number, number]>([1.2, -0.8, 0]);
  const [playerMoveDir, setPlayerMoveDir] = useState<[number, number, number]>([0, 0, -1]);
  const [virtualInput, setVirtualInput] = useState<{ x: number; z: number } | null>(null);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

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
    const mq = window.matchMedia?.("(pointer: coarse)");
    const update = () => setIsCoarsePointer(Boolean(mq?.matches));
    update();
    mq?.addEventListener?.("change", update);
    return () => mq?.removeEventListener?.("change", update);
  }, []);

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
          virtualInput={virtualInput}
          onMotionChange={(motion) => {
            setPlayerMoveDir(motion.moveDir);
          }}
        />
        <FollowCamera target={playerPosition} moveDir={playerMoveDir} />
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

      {isCoarsePointer && (
        <div className="mobileControls" aria-hidden="true">
          <div
            className="joyBase"
            onPointerDown={(e) => {
              (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
              const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const cx = r.left + r.width / 2;
              const cy = r.top + r.height / 2;
              const dx = (e.clientX - cx) / (r.width / 2);
              const dy = (e.clientY - cy) / (r.height / 2);
              const x = Math.max(-1, Math.min(1, dx));
              const z = Math.max(-1, Math.min(1, -dy));
              setVirtualInput({ x, z });
            }}
            onPointerMove={(e) => {
              if (!e.buttons) return;
              const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const cx = r.left + r.width / 2;
              const cy = r.top + r.height / 2;
              const dx = (e.clientX - cx) / (r.width / 2);
              const dy = (e.clientY - cy) / (r.height / 2);
              const x = Math.max(-1, Math.min(1, dx));
              const z = Math.max(-1, Math.min(1, -dy));
              setVirtualInput({ x, z });
            }}
            onPointerUp={() => setVirtualInput(null)}
            onPointerCancel={() => setVirtualInput(null)}
          >
            <div
              className="joyKnob"
              style={{
                transform: `translate(${(virtualInput?.x ?? 0) * 26}px, ${-(virtualInput?.z ?? 0) * 26}px)`,
              }}
            />
          </div>

          <button
            className="interactBtn"
            type="button"
            onClick={() => {
              if (!canInteract) return;
              onNpcInteract(activeNpcId);
            }}
            disabled={!canInteract}
          >
            E
          </button>
        </div>
      )}
    </div>
  );
}
