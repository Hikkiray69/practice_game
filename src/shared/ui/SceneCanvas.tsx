"use client";

import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { PlayerAvatar } from "@/features/movement";
import { NpcActor } from "@/entities/npc";
import { useFrame, useThree } from "@react-three/fiber";
import { TrainingHubLevel } from "@/entities/level";
import { InteractionPrompt } from "@/features/interaction-prompt";
import { playGameUiSfx } from "@/shared/lib/gameUiSfx";
import { TargetNpcInRangeRefContext } from "@/shared/ui/targetNpcInRangeContext";
import { PCFShadowMap, Vector3 } from "three";

interface SceneCanvasProps {
  activeNpcId: string;
  onNpcInteract: (npcId: string) => void;
}

/** Один раз в dev печатает факты о тенях (если 0 — искать в коде/консоли). */
function ShadowDiagnostics() {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const done = useRef(false);
  useEffect(() => {
    if (done.current || process.env.NODE_ENV !== "development") return;
    done.current = true;
    let meshesCast = 0;
    let meshesRecv = 0;
    let dirCast = 0;
    scene.traverse((o) => {
      const x = o as { isMesh?: boolean; isDirectionalLight?: boolean; castShadow?: boolean; receiveShadow?: boolean };
      if (x.isMesh) {
        if (x.castShadow) meshesCast += 1;
        if (x.receiveShadow) meshesRecv += 1;
      }
      if (x.isDirectionalLight && x.castShadow) dirCast += 1;
    });
    console.info("[shadow check]", {
      shadowMapEnabled: gl.shadowMap.enabled,
      shadowMapType: gl.shadowMap.type,
      directionalLightsCastShadow: dirCast,
      meshesCastShadow: meshesCast,
      meshesReceiveShadow: meshesRecv,
    });
  }, [scene, gl]);
  return null;
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

/** Гистерезис: выход чуть дальше входа → реже переключение у границы 1.9. */
const NPC_RANGE_ENTER = 1.9;
const NPC_RANGE_LEAVE = 2.06;

/** Дистанция + DOM плашки/кнопки без setState — только refs и classList. */
function NpcProximityR3f({
  playerPosRef,
  activeNpcIdRef,
  targetNpcInRangeRef,
  activeNpcId,
  promptRef,
  interactBtnRef,
}: {
  playerPosRef: MutableRefObject<[number, number, number]>;
  activeNpcIdRef: MutableRefObject<string>;
  targetNpcInRangeRef: MutableRefObject<boolean>;
  activeNpcId: string;
  promptRef: MutableRefObject<HTMLDivElement | null>;
  interactBtnRef: MutableRefObject<HTMLButtonElement | null>;
}) {
  const hysteresisRef = useRef(false);
  const lastDomRef = useRef<boolean | null>(null);

  function syncDom(near: boolean) {
    const el = promptRef.current;
    if (el) {
      el.classList.toggle("aaaPrompt--dockedHidden", !near);
      el.setAttribute("aria-hidden", near ? "false" : "true");
    }
    const btn = interactBtnRef.current;
    if (btn) btn.disabled = !near;
  }

  useEffect(() => {
    hysteresisRef.current = false;
    targetNpcInRangeRef.current = false;
    lastDomRef.current = null;
    const el = promptRef.current;
    if (el) {
      el.classList.add("aaaPrompt--dockedHidden");
      el.setAttribute("aria-hidden", "true");
    }
    const btn = interactBtnRef.current;
    if (btn) btn.disabled = true;
  }, [activeNpcId, interactBtnRef, promptRef, targetNpcInRangeRef]);

  useFrame(() => {
    const p = playerPosRef.current;
    const id = activeNpcIdRef.current;
    const npc = NPCS.find((n) => n.id === id) ?? NPCS[0];
    const d = Math.hypot(p[0] - npc.position[0], p[2] - npc.position[2]);
    let inRange = hysteresisRef.current;
    if (inRange) {
      if (d > NPC_RANGE_LEAVE) inRange = false;
    } else {
      if (d <= NPC_RANGE_ENTER) inRange = true;
    }
    hysteresisRef.current = inRange;
    targetNpcInRangeRef.current = inRange;

    if (lastDomRef.current !== inRange) {
      lastDomRef.current = inRange;
      syncDom(inRange);
    }
  });

  return null;
}

function SceneObjects({ activeNpcId, coarsePointer }: { activeNpcId: string; coarsePointer: boolean }) {
  return (
    <>
      <TrainingHubLevel />

      {NPCS.map((npc) => {
        const isTarget = npc.id === activeNpcId;
        return (
          <NpcActor
            key={npc.id}
            id={npc.id}
            name={npc.name}
            role={npc.role}
            position={npc.position}
            accent={npc.accent}
            highlight={isTarget}
            coarsePointer={coarsePointer}
          />
        );
      })}
    </>
  );
}

/** Высота камеры над полом при игроке на `y = -0.8` (см. `PlayerAvatar` FLOOR_Y). */
const PLAYER_FLOOR_Y = -0.8;
const CAMERA_WORLD_Y_AT_FLOOR_PLAYER = 4.6;
const CAMERA_Y_OFFSET_ABOVE_PLAYER = CAMERA_WORLD_Y_AT_FLOOR_PLAYER - PLAYER_FLOOR_Y;
const LOOK_Y_OFFSET_ABOVE_PLAYER = 1.0 - PLAYER_FLOOR_Y;

function FollowCamera({
  targetRef,
  moveDirRef,
}: {
  targetRef: MutableRefObject<[number, number, number]>;
  moveDirRef: MutableRefObject<[number, number, number]>;
}) {
  const { camera } = useThree();
  const camStoreRef = useRef({
    camVel: new Vector3(0, 0, 0),
    lookVel: new Vector3(0, 0, 0),
    lookStrafeOffset: new Vector3(0, 0, 0),
    lookStrafeVel: new Vector3(0, 0, 0),
    currentLook: new Vector3(0, 1.0, 0),
    baseForward: new Vector3(0, 0, -1),
    desiredPos: new Vector3(),
    desiredLook: new Vector3(),
    tmpBehind: new Vector3(),
    tmpTarget: new Vector3(),
    camFlatFwd: new Vector3(0, 0, -1),
  });

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
    const cam = camStoreRef.current;
    const target = targetRef.current;
    const moveDir = moveDirRef.current;
    // IMPORTANT: movement is camera-relative, so we keep camera yaw FIXED here.
    // Otherwise you get a slow drift and the character starts moving in an arc.
    const forward = cam.baseForward; // fixed world direction
    const behind = cam.tmpBehind.copy(forward).multiplyScalar(-1);

    // 2) Орбита камеры — только фиксированный yaw 45° (стрейф орбиту не крутит).
    const behindDistance = 6.2;

    const yaw = Math.PI / 4;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const bx = behind.x * cos + behind.z * sin;
    const bz = -behind.x * sin + behind.z * cos;

    cam.desiredPos.set(target[0], target[1], target[2]);
    cam.desiredPos.x += bx * behindDistance;
    cam.desiredPos.z += bz * behindDistance;
    cam.desiredPos.y = target[1] + CAMERA_Y_OFFSET_ABOVE_PLAYER;

    // 3) Точка взгляда: база у головы ГГ + сдвиг только по стрейфу (экран влево/вправо) — открывается обзор, позиция камеры та же.
    const moveLen = Math.hypot(moveDir[0], moveDir[2]);
    camera.getWorldDirection(cam.camFlatFwd);
    let fcx = cam.camFlatFwd.x;
    let fcz = cam.camFlatFwd.z;
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
    cam.tmpTarget.set(tx, 0, tz);
    smoothDampVec3(cam.lookStrafeOffset, cam.tmpTarget, cam.lookStrafeVel, 0.28, delta);

    cam.desiredLook.set(target[0], target[1] + LOOK_Y_OFFSET_ABOVE_PLAYER, target[2]);
    cam.desiredLook.addScaledVector(forward, 0.22);
    cam.desiredLook.x += cam.lookStrafeOffset.x;
    cam.desiredLook.z += cam.lookStrafeOffset.z;

    const posSmooth = 0.26;
    const lookSmooth = 0.22;

    const camPos = camera.position;
    smoothDampVec3(camPos, cam.desiredPos, cam.camVel, posSmooth, delta);

    // Keep lookAt also smooth to avoid snapping on sudden turns.
    smoothDampVec3(cam.currentLook, cam.desiredLook, cam.lookVel, lookSmooth, delta);

    camera.lookAt(cam.currentLook);
  });
  return null;
}

export function SceneCanvas({ onNpcInteract, activeNpcId }: SceneCanvasProps) {
  const playerPosRef = useRef<[number, number, number]>([1.2, -0.8, 0]);
  const playerMoveDirRef = useRef<[number, number, number]>([0, 0, -1]);
  const virtualInputRef = useRef<{ x: number; z: number } | null>(null);
  const joyKnobRef = useRef<HTMLDivElement | null>(null);
  const glRef = useRef<{ setPixelRatio: (v: number) => void } | null>(null);
  const targetNpcInRangeRef = useRef(false);
  const activeNpcIdRef = useRef(activeNpcId);
  const promptDockRef = useRef<HTMLDivElement | null>(null);
  const interactBtnRef = useRef<HTMLButtonElement | null>(null);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [showOverload67, setShowOverload67] = useState(false);
  const overload67TimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const OVERLOAD_67_DELAY_MS = 8600;

  const scheduleOverload67Overlay = useCallback(() => {
    if (overload67TimerRef.current != null) {
      clearTimeout(overload67TimerRef.current);
    }
    overload67TimerRef.current = setTimeout(() => {
      setShowOverload67(true);
      overload67TimerRef.current = null;
    }, OVERLOAD_67_DELAY_MS);
  }, []);

  const dismissOverload67 = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (overload67TimerRef.current != null) {
        clearTimeout(overload67TimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showOverload67) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Escape") {
        e.preventDefault();
        dismissOverload67();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showOverload67, dismissOverload67]);
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

  useEffect(() => {
    activeNpcIdRef.current = activeNpcId;
  }, [activeNpcId]);

  useEffect(() => {
    const mq = window.matchMedia?.("(pointer: coarse)");
    const update = () => setIsCoarsePointer(Boolean(mq?.matches));
    update();
    mq?.addEventListener?.("change", update);
    return () => mq?.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    const gl = glRef.current as { setPixelRatio: (v: number) => void } | null;
    if (!gl || typeof window === "undefined") return;
    gl.setPixelRatio(Math.min(window.devicePixelRatio, isCoarsePointer ? 1.15 : 1.45));
  }, [isCoarsePointer]);

  useEffect(() => {
    function clampPixelRatio() {
      const gl = glRef.current;
      if (!gl || typeof window === "undefined") return;
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      gl.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.15 : 1.45));
    }
    window.addEventListener("resize", clampPixelRatio);
    return () => window.removeEventListener("resize", clampPixelRatio);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== "KeyE") return;
      if (!targetNpcInRangeRef.current) return;
      playGameUiSfx("npcChat");
      onNpcInteract(activeNpcIdRef.current);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onNpcInteract]);

  const setJoyKnob = (x: number, z: number) => {
    const el = joyKnobRef.current;
    if (el) el.style.transform = `translate(${x * 26}px, ${-z * 26}px)`;
  };

  return (
    <div className="sceneWrap fullscreen">
      <Canvas
        shadows={{ enabled: true, type: PCFShadowMap, autoUpdate: true }}
        camera={{ position: [0, 4.8, 10.5], fov: 55 }}
        dpr={[1, 1.45]}
        gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          glRef.current = gl;
          if (typeof window === "undefined") return;
          const coarse = window.matchMedia("(pointer: coarse)").matches;
          gl.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.15 : 1.45));
        }}
      >
        <TargetNpcInRangeRefContext.Provider value={targetNpcInRangeRef}>
          <NpcProximityR3f
            playerPosRef={playerPosRef}
            activeNpcIdRef={activeNpcIdRef}
            targetNpcInRangeRef={targetNpcInRangeRef}
            activeNpcId={activeNpcId}
            promptRef={promptDockRef}
            interactBtnRef={interactBtnRef}
          />
          <ShadowDiagnostics />
          <SceneObjects activeNpcId={activeNpcId} coarsePointer={isCoarsePointer} />
          <PlayerAvatar
            onPositionChange={(p) => {
              playerPosRef.current = p;
            }}
            collisionBoxes={collisionBoxes}
            virtualInputRef={virtualInputRef}
            onOverloadStarted={scheduleOverload67Overlay}
            onMotionChange={(motion) => {
              playerMoveDirRef.current = motion.moveDir;
            }}
          />
          <FollowCamera targetRef={playerPosRef} moveDirRef={playerMoveDirRef} />
        </TargetNpcInRangeRefContext.Provider>
      </Canvas>

      {showOverload67 ? (
        <div
          className="overload67Overlay"
          role="dialog"
          aria-modal="true"
          aria-label="67"
          onClick={dismissOverload67}
        >
          <div className="overload67Burst" aria-hidden />
          <div className="overload67DigitWrap">
            <span className="overload67DigitShadow" aria-hidden>
              67
            </span>
            <span className="overload67Digit">67</span>
          </div>
          <p className="overload67Hint">клик или Esc — перезапуск игры</p>
        </div>
      ) : null}

      <div className="topHint">
        <div className="hintPill">WASD/стрелки: движение</div>
      </div>

      <InteractionPrompt
        ref={promptDockRef}
        variant="docked"
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
              virtualInputRef.current = { x, z };
              setJoyKnob(x, z);
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
              virtualInputRef.current = { x, z };
              setJoyKnob(x, z);
            }}
            onPointerUp={() => {
              virtualInputRef.current = null;
              setJoyKnob(0, 0);
            }}
            onPointerCancel={() => {
              virtualInputRef.current = null;
              setJoyKnob(0, 0);
            }}
          >
            <div ref={joyKnobRef} className="joyKnob" />
          </div>

          <button
            ref={interactBtnRef}
            className="interactBtn"
            type="button"
            onClick={() => {
              if (!targetNpcInRangeRef.current) return;
              playGameUiSfx("npcChat");
              onNpcInteract(activeNpcIdRef.current);
            }}
          >
            E
          </button>
        </div>
      )}
    </div>
  );
}
