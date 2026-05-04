"use client";

import { Environment } from "@react-three/drei";
import { useMemo } from "react";
import { createCarpetTexture, createConcreteTexture, createFabricNoiseTexture, createSoilTexture } from "@/shared/lib/threeTextures";

function CeilingLight({
  position,
  size,
  intensity = 0.9,
}: {
  position: [number, number, number];
  size: [number, number];
  intensity?: number;
}) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={size} />
      <meshStandardMaterial color="#0b1020" emissive="#e2e8f0" emissiveIntensity={intensity} />
    </mesh>
  );
}

function LowPlanterRow({
  position,
  length,
  rotationY = 0,
  seed = 1,
  soilMap,
}: {
  position: [number, number, number];
  length: number;
  rotationY?: number;
  seed?: number;
  soilMap: ReturnType<typeof createSoilTexture>;
}) {
  const rimH = 0.22;
  const innerW = 0.62;
  const innerD = 0.44;

  const moduleCount = Math.max(2, Math.round(length / 2.2));
  const gap = 0.22;
  const moduleLen = (length - gap * (moduleCount - 1)) / moduleCount;

  function foliageCluster(cx: number, cz: number, clusterSeed: number) {
    const greens = ["#14532d", "#166534", "#15803d", "#22c55e", "#4ade80"];
    const items = [];
    for (let i = 0; i < 9; i++) {
      const t = ((clusterSeed + i * 97) % 1000) / 1000;
      const u = ((clusterSeed + i * 131) % 1000) / 1000;
      const x = cx + (t - 0.5) * (moduleLen * 0.55);
      const z = cz + (u - 0.5) * (innerD * 0.55);
      const s = 0.08 + ((clusterSeed + i * 17) % 100) / 1000;
      const y = rimH + 0.03 + ((clusterSeed + i * 19) % 100) / 4000;
      const col = greens[(clusterSeed + i) % greens.length];
      items.push(
        <mesh key={`${clusterSeed}-${i}`} position={[x, y, z]}>
          <sphereGeometry args={[s, 10, 10]} />
          <meshStandardMaterial color={col} roughness={0.92} metalness={0.0} />
        </mesh>,
      );
    }
    // a couple “flowers”
    for (let i = 0; i < 3; i++) {
      const t = ((clusterSeed + i * 211) % 1000) / 1000;
      const u = ((clusterSeed + i * 223) % 1000) / 1000;
      const x = cx + (t - 0.5) * (moduleLen * 0.45);
      const z = cz + (u - 0.5) * (innerD * 0.45);
      const y = rimH + 0.05;
      const col = i % 2 === 0 ? "#fde68a" : "#fbcfe8";
      items.push(
        <mesh key={`f-${clusterSeed}-${i}`} position={[x, y, z]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color={col} roughness={0.55} metalness={0.0} emissive={col} emissiveIntensity={0.08} />
        </mesh>,
      );
    }
    return items;
  }

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {Array.from({ length: moduleCount }).map((_, i) => {
        const x = -length / 2 + moduleLen / 2 + i * (moduleLen + gap);
        const clusterSeed = seed * 1000 + i * 1337;
        return (
          <group key={i} position={[x, 0, 0]}>
            {/* outer rim */}
            <mesh position={[0, rimH / 2, 0]}>
              <boxGeometry args={[moduleLen, rimH, innerW]} />
              <meshStandardMaterial color="#111827" metalness={0.12} roughness={0.85} />
            </mesh>

            {/* soil bed */}
            <mesh position={[0, rimH + 0.02, 0]}>
              <boxGeometry args={[moduleLen - 0.12, 0.04, innerD]} />
              <meshStandardMaterial map={soilMap} color="#2a241c" roughness={0.98} metalness={0.0} />
            </mesh>

            {/* small feet */}
            <mesh position={[-moduleLen / 2 + 0.12, 0.05, -innerW / 2 + 0.06]}>
              <boxGeometry args={[0.08, 0.1, 0.08]} />
              <meshStandardMaterial color="#0b1020" metalness={0.25} roughness={0.65} />
            </mesh>
            <mesh position={[moduleLen / 2 - 0.12, 0.05, -innerW / 2 + 0.06]}>
              <boxGeometry args={[0.08, 0.1, 0.08]} />
              <meshStandardMaterial color="#0b1020" metalness={0.25} roughness={0.65} />
            </mesh>
            <mesh position={[-moduleLen / 2 + 0.12, 0.05, innerW / 2 - 0.06]}>
              <boxGeometry args={[0.08, 0.1, 0.08]} />
              <meshStandardMaterial color="#0b1020" metalness={0.25} roughness={0.65} />
            </mesh>
            <mesh position={[moduleLen / 2 - 0.12, 0.05, innerW / 2 - 0.06]}>
              <boxGeometry args={[0.08, 0.1, 0.08]} />
              <meshStandardMaterial color="#0b1020" metalness={0.25} roughness={0.65} />
            </mesh>

            {foliageCluster(0, 0, clusterSeed)}
          </group>
        );
      })}
    </group>
  );
}

function CityBackdrop() {
  return (
    <group position={[0, 0, -18]}>
      {/* skyline glow */}
      <mesh position={[0, 4.2, 0]}>
        <planeGeometry args={[60, 18]} />
        <meshStandardMaterial color="#050914" emissive="#0b1028" emissiveIntensity={0.9} />
      </mesh>

      {/* abstract “windows” */}
      <mesh position={[0, 2.8, 0.01]}>
        <planeGeometry args={[58, 14]} />
        <meshStandardMaterial
          color="#070d1a"
          emissive="#1d2b6b"
          emissiveIntensity={0.55}
          metalness={0.0}
          roughness={1.0}
        />
      </mesh>
    </group>
  );
}

function DeskStation({
  position,
  rotationY = 0,
  busy = 0.0,
}: {
  position: [number, number, number];
  rotationY?: number;
  busy?: number; // 0..1
}) {
  const clutter = Math.max(0, Math.min(1, busy));
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* desk top */}
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[1.5, 0.08, 0.75]} />
        <meshStandardMaterial color="#121a2f" metalness={0.15} roughness={0.65} />
      </mesh>
      {/* legs */}
      <mesh position={[-0.65, 0.31, -0.28]}>
        <boxGeometry args={[0.06, 0.62, 0.06]} />
        <meshStandardMaterial color="#0a1020" metalness={0.4} roughness={0.35} />
      </mesh>
      <mesh position={[0.65, 0.31, -0.28]}>
        <boxGeometry args={[0.06, 0.62, 0.06]} />
        <meshStandardMaterial color="#0a1020" metalness={0.4} roughness={0.35} />
      </mesh>
      <mesh position={[-0.65, 0.31, 0.28]}>
        <boxGeometry args={[0.06, 0.62, 0.06]} />
        <meshStandardMaterial color="#0a1020" metalness={0.4} roughness={0.35} />
      </mesh>
      <mesh position={[0.65, 0.31, 0.28]}>
        <boxGeometry args={[0.06, 0.62, 0.06]} />
        <meshStandardMaterial color="#0a1020" metalness={0.4} roughness={0.35} />
      </mesh>

      {/* monitor */}
      <mesh position={[0.35, 0.82, -0.1]}>
        <boxGeometry args={[0.44, 0.28, 0.04]} />
        <meshStandardMaterial color="#0b1020" emissive="#38bdf8" emissiveIntensity={0.08 + 0.18 * clutter} />
      </mesh>
      <mesh position={[0.35, 0.7, -0.1]}>
        <boxGeometry args={[0.12, 0.14, 0.08]} />
        <meshStandardMaterial color="#0a1020" metalness={0.4} roughness={0.35} />
      </mesh>

      {/* chair */}
      <mesh position={[-0.5, 0.42, 0.18]}>
        <boxGeometry args={[0.34, 0.06, 0.32]} />
        <meshStandardMaterial color="#0a1020" metalness={0.15} roughness={0.75} />
      </mesh>
      <mesh position={[-0.5, 0.55, 0.03]}>
        <boxGeometry args={[0.34, 0.32, 0.06]} />
        <meshStandardMaterial color="#0a1020" metalness={0.15} roughness={0.75} />
      </mesh>

      {/* clutter: papers, mug, tablet */}
      {clutter > 0.2 ? (
        <mesh position={[-0.15, 0.68, 0.14]} rotation={[0, 0.2, 0.06]}>
          <boxGeometry args={[0.28, 0.01, 0.2]} />
          <meshStandardMaterial color="#e2e8f0" roughness={1} metalness={0} />
        </mesh>
      ) : null}
      {clutter > 0.45 ? (
        <mesh position={[-0.38, 0.69, -0.12]}>
          <cylinderGeometry args={[0.06, 0.06, 0.11, 14]} />
          <meshStandardMaterial color="#6d28d9" emissive="#6d28d9" emissiveIntensity={0.06} roughness={0.5} />
        </mesh>
      ) : null}
      {clutter > 0.65 ? (
        <mesh position={[0.05, 0.685, -0.22]} rotation={[-0.12, -0.35, 0]}>
          <boxGeometry args={[0.22, 0.01, 0.16]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.95} metalness={0.05} />
        </mesh>
      ) : null}
    </group>
  );
}

function Plant({
  position,
  size = 1.0,
}: {
  position: [number, number, number];
  size?: number;
}) {
  return (
    <group position={position} scale={size}>
      <mesh position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.22, 0.26, 0.34, 16]} />
        <meshStandardMaterial color="#0b1326" metalness={0.2} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.33, 14, 14]} />
        <meshStandardMaterial color="#22c55e" roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh position={[0.12, 0.7, -0.08]}>
        <sphereGeometry args={[0.22, 14, 14]} />
        <meshStandardMaterial color="#16a34a" roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh position={[-0.14, 0.72, 0.1]}>
        <sphereGeometry args={[0.2, 14, 14]} />
        <meshStandardMaterial color="#15803d" roughness={0.85} metalness={0.05} />
      </mesh>
    </group>
  );
}

function Lounge({
  position,
}: {
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      {/* sofa */}
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[2.2, 0.32, 0.9]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.64, -0.34]}>
        <boxGeometry args={[2.2, 0.46, 0.18]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.64, 0.38]}>
        <boxGeometry args={[2.2, 0.22, 0.12]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} metalness={0.05} />
      </mesh>

      {/* coffee table */}
      <mesh position={[0.0, 0.26, 1.05]}>
        <boxGeometry args={[1.2, 0.06, 0.62]} />
        <meshStandardMaterial color="#121a2f" roughness={0.65} metalness={0.15} />
      </mesh>
      <mesh position={[-0.5, 0.13, 1.05]}>
        <boxGeometry args={[0.06, 0.26, 0.06]} />
        <meshStandardMaterial color="#0a1020" roughness={0.45} metalness={0.35} />
      </mesh>
      <mesh position={[0.5, 0.13, 1.05]}>
        <boxGeometry args={[0.06, 0.26, 0.06]} />
        <meshStandardMaterial color="#0a1020" roughness={0.45} metalness={0.35} />
      </mesh>
    </group>
  );
}

function AreaRug({
  position,
  size,
  rotationY = 0,
  fabricMap,
}: {
  position: [number, number, number];
  size: [number, number];
  rotationY?: number;
  fabricMap: ReturnType<typeof createFabricNoiseTexture>;
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, rotationY]} position={position}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={fabricMap} color="#111827" roughness={0.95} metalness={0.0} />
    </mesh>
  );
}

function WaterCooler({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.42, 1.1, 0.42]} />
        <meshStandardMaterial color="#0f172a" metalness={0.25} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.62, 0.21]}>
        <boxGeometry args={[0.34, 0.55, 0.02]} />
        <meshStandardMaterial color="#0b1020" emissive="#38bdf8" emissiveIntensity={0.12} roughness={0.35} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.22, 0.26, 0.1, 18]} />
        <meshStandardMaterial color="#0b1020" metalness={0.35} roughness={0.45} />
      </mesh>
    </group>
  );
}

function Bookshelf({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[1.1, 2.1, 0.35]} />
        <meshStandardMaterial color="#111827" metalness={0.12} roughness={0.85} />
      </mesh>
      {[-0.75, -0.25, 0.25, 0.75].map((yOff, i) => (
        <mesh key={i} position={[0, yOff, 0.18]}>
          <boxGeometry args={[0.95, 0.04, 0.28]} />
          <meshStandardMaterial color="#0b1020" metalness={0.2} roughness={0.75} />
        </mesh>
      ))}
      {/* a few “books” */}
      {Array.from({ length: 18 }).map((_, i) => {
        const x = -0.35 + (i % 6) * 0.14;
        const y = 0.35 + Math.floor(i / 6) * 0.22;
        const h = 0.16 + (i % 3) * 0.02;
        const c = i % 4 === 0 ? "#7c3aed" : i % 4 === 1 ? "#38bdf8" : i % 4 === 2 ? "#f59e0b" : "#e2e8f0";
        return (
          <mesh key={`b-${i}`} position={[x, y, 0.12]}>
            <boxGeometry args={[0.08, h, 0.18]} />
            <meshStandardMaterial color={c} roughness={0.75} metalness={0.05} />
          </mesh>
        );
      })}
    </group>
  );
}

function Whiteboard({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 1.35, 0.02]}>
        <boxGeometry args={[2.4, 1.35, 0.06]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.85} metalness={0.0} />
      </mesh>
      <mesh position={[0, 1.35, 0]}>
        <boxGeometry args={[2.55, 1.5, 0.04]} />
        <meshStandardMaterial color="#0b1020" metalness={0.15} roughness={0.75} />
      </mesh>
      <mesh position={[-0.9, 1.05, 0.04]}>
        <boxGeometry args={[0.02, 0.02, 0.02]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.12} />
      </mesh>
    </group>
  );
}

function TrashBin({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.18, 0.2, 0.56, 18]} />
        <meshStandardMaterial color="#111827" metalness={0.25} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.58, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.06, 18]} />
        <meshStandardMaterial color="#0b1020" metalness={0.35} roughness={0.45} />
      </mesh>
    </group>
  );
}

function CoffeeStation({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.95, 0.9, 0.55]} />
        <meshStandardMaterial color="#111827" metalness={0.2} roughness={0.7} />
      </mesh>
      <mesh position={[0.18, 0.75, 0.28]}>
        <boxGeometry args={[0.34, 0.22, 0.06]} />
        <meshStandardMaterial color="#0b1020" emissive="#f59e0b" emissiveIntensity={0.08} roughness={0.45} metalness={0.15} />
      </mesh>
      <mesh position={[-0.22, 0.62, 0.28]}>
        <cylinderGeometry args={[0.05, 0.05, 0.22, 12]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.35} roughness={0.35} />
      </mesh>
    </group>
  );
}

function WallPoster({
  position,
  rotationY,
  accent,
}: {
  position: [number, number, number];
  rotationY: number;
  accent: string;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[1.6, 1.0, 0.04]} />
        <meshStandardMaterial color="#0b1020" roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0, 0.045]}>
        <boxGeometry args={[1.45, 0.85, 0.02]} />
        <meshStandardMaterial color="#0f172a" emissive={accent} emissiveIntensity={0.04} roughness={0.92} metalness={0.0} />
      </mesh>
    </group>
  );
}

export function TrainingHubLevel() {
  const wallTex = useMemo(() => createConcreteTexture({ base: "#6b7280", seed: 1201 }), []);
  const floorTex = useMemo(() => createCarpetTexture({ base: "#151a2a", accent: "#272d44", seed: 443 }), []);
  const soilTex = useMemo(() => createSoilTexture({ seed: 9003 }), []);
  const rugTexA = useMemo(() => createFabricNoiseTexture({ base: "#1b2236", seed: 501 }), []);
  const rugTexB = useMemo(() => createFabricNoiseTexture({ base: "#1a2234", seed: 502 }), []);

  return (
    <>
      <color attach="background" args={["#050914"]} />
      <fog attach="fog" args={["#050914", 7, 34]} />

      {/* lighting: readable + “AAA-ish” accent */}
      <ambientLight intensity={0.22} />
      <directionalLight position={[10, 12, 5]} intensity={0.65} color="#dbeafe" />

      {/* drei RectAreaLight isn't available in this setup: use accent point lights */}
      <pointLight position={[-14.0, 2.2, 5.2]} intensity={2.2} color="#7c3aed" distance={7} />
      <pointLight position={[0.0, 2.3, 2.9]} intensity={1.8} color="#38bdf8" distance={7} />
      <pointLight position={[2.6, 2.2, -8.6]} intensity={1.8} color="#f59e0b" distance={7} />

      {/* soft daylight from windows */}
      <directionalLight position={[0, 8, -20]} intensity={0.55} color="#e2e8f0" />

      {/* ceiling panels (soft office light) */}
      <CeilingLight position={[-10, 3.75, -2]} size={[10, 6]} intensity={0.75} />
      <CeilingLight position={[10, 3.75, -2]} size={[10, 6]} intensity={0.75} />
      <CeilingLight position={[0, 3.75, -9]} size={[12, 6]} intensity={0.65} />

      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]} receiveShadow>
        <planeGeometry args={[54, 54]} />
        <meshStandardMaterial color="#0b1220" map={floorTex} metalness={0.02} roughness={0.98} />
      </mesh>

      {/* OFFICE SHELL: walls + windows */}
      <mesh position={[0, 1.0, 10.2]}>
        <boxGeometry args={[40, 4.2, 0.6]} />
        <meshStandardMaterial color="#6b7280" map={wallTex} metalness={0.05} roughness={0.92} />
      </mesh>
      <mesh position={[-20.0, 1.0, -2.0]}>
        <boxGeometry args={[0.6, 4.2, 26]} />
        <meshStandardMaterial color="#6b7280" map={wallTex} metalness={0.05} roughness={0.92} />
      </mesh>
      <mesh position={[20.0, 1.0, -2.0]}>
        <boxGeometry args={[0.6, 4.2, 26]} />
        <meshStandardMaterial color="#6b7280" map={wallTex} metalness={0.05} roughness={0.92} />
      </mesh>

      {/* panoramic windows wall */}
      <mesh position={[0, 1.0, -13.8]}>
        <boxGeometry args={[40, 4.2, 0.6]} />
        <meshStandardMaterial color="#101a2e" metalness={0.12} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.2, -13.49]}>
        <boxGeometry args={[32, 3.0, 0.06]} />
        <meshStandardMaterial color="#0b1020" emissive="#0b1020" emissiveIntensity={0.25} metalness={0.2} roughness={0.3} />
      </mesh>
      <CityBackdrop />

      {/* extra decor */}
      {/* rugs: keep away from planter “doorway” at z≈2.2 */}
      <AreaRug position={[0, -0.795, -0.6]} size={[9, 5.5]} rotationY={0} fabricMap={rugTexA} />
      <AreaRug position={[-12, -0.795, 5.0]} size={[7.5, 4.8]} rotationY={0.04} fabricMap={rugTexB} />
      <AreaRug position={[12, -0.795, 5.0]} size={[7.5, 4.8]} rotationY={-0.04} fabricMap={rugTexB} />

      <WaterCooler position={[-2.2, -0.8, 8.6]} />
      <WaterCooler position={[2.2, -0.8, 8.6]} />

      {/* shelves: flush to inner wall face (x = ±19.7) */}
      <Bookshelf position={[-19.525, -0.8, 2.0]} rotationY={Math.PI / 2} />
      <Bookshelf position={[19.525, -0.8, 2.0]} rotationY={-Math.PI / 2} />

      {/* boards: slightly inset so they don't float off the wall */}
      <Whiteboard position={[-19.62, -0.8, -6.0]} rotationY={0} />
      <Whiteboard position={[19.62, -0.8, -6.0]} rotationY={Math.PI} />

      <TrashBin position={[-1.1, -0.8, 8.1]} />
      <TrashBin position={[1.1, -0.8, 8.1]} />
      <TrashBin position={[-10.5, -0.8, -10.2]} />

      <CoffeeStation position={[-1.2, -0.8, -10.2]} rotationY={Math.PI * 0.15} />
      <CoffeeStation position={[1.4, -0.8, -10.0]} rotationY={-Math.PI * 0.12} />

      {/* posters on side walls */}
      <WallPoster position={[-19.62, 1.55, 5.6]} rotationY={0} accent="#7c3aed" />
      <WallPoster position={[-19.62, 1.55, -1.2]} rotationY={0} accent="#38bdf8" />
      <WallPoster position={[19.62, 1.55, 2.4]} rotationY={Math.PI} accent="#f59e0b" />

      {/* zone separators: low office sideboards (no huge purple planes) */}
      <LowPlanterRow position={[-6.5, -0.8, -5.5]} length={6.0} rotationY={Math.PI / 2} seed={11} soilMap={soilTex} />
      <LowPlanterRow position={[-6.5, -0.8, 0.0]} length={6.0} rotationY={Math.PI / 2} seed={12} soilMap={soilTex} />
      <LowPlanterRow position={[6.5, -0.8, -5.5]} length={6.0} rotationY={Math.PI / 2} seed={13} soilMap={soilTex} />
      <LowPlanterRow position={[6.5, -0.8, 0.0]} length={6.0} rotationY={Math.PI / 2} seed={14} soilMap={soilTex} />

      {/* front separators with doorway gap */}
      <LowPlanterRow position={[-4.1, -0.8, 2.2]} length={5.0} rotationY={0} seed={21} soilMap={soilTex} />
      <LowPlanterRow position={[4.1, -0.8, 2.2]} length={5.0} rotationY={0} seed={22} soilMap={soilTex} />

      {/* interaction pads (subtle carpet zones) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-14.0, -0.79, 5.2]}>
        <circleGeometry args={[2.25, 54]} />
        <meshStandardMaterial color="#0f172a" emissive="#7c3aed" emissiveIntensity={0.07} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.0, -0.79, 2.9]}>
        <circleGeometry args={[2.25, 54]} />
        <meshStandardMaterial color="#0f172a" emissive="#38bdf8" emissiveIntensity={0.06} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.6, -0.79, -8.6]}>
        <circleGeometry args={[2.25, 54]} />
        <meshStandardMaterial color="#0f172a" emissive="#f59e0b" emissiveIntensity={0.06} />
      </mesh>

      {/* ZONES */}
      {/* Open space: desk grid */}
      {[-1, 0, 1].flatMap((row) =>
        [-1, 0, 1, 2].map((col) => {
          const x = -15.0 + col * 3.2;
          const z = 6.5 - row * 2.4;
          const busy = (col + row * 0.6 + 0.8) % 1;
          return <DeskStation key={`desk-${row}-${col}`} position={[x, -0.8, z]} rotationY={Math.PI} busy={busy} />;
        }),
      )}
      {[-1, 0, 1].flatMap((row) =>
        [-1, 0, 1, 2].map((col) => {
          const x = 15.0 - col * 3.2;
          const z = 6.5 - row * 2.4;
          const busy = (0.3 + col * 0.27 + row * 0.4) % 1;
          return <DeskStation key={`deskR-${row}-${col}`} position={[x, -0.8, z]} rotationY={Math.PI} busy={busy} />;
        }),
      )}

      {/* Meeting room: table + frame */}
      <group position={[0, -0.8, 4.6]}>
        <mesh position={[0, 0.65, 0]}>
          <boxGeometry args={[4.8, 0.12, 1.8]} />
          <meshStandardMaterial color="#121a2f" metalness={0.15} roughness={0.65} />
        </mesh>
        <mesh position={[-2.1, 0.32, 0.7]}>
          <boxGeometry args={[0.1, 0.64, 0.1]} />
          <meshStandardMaterial color="#0a1020" metalness={0.4} roughness={0.35} />
        </mesh>
        <mesh position={[2.1, 0.32, 0.7]}>
          <boxGeometry args={[0.1, 0.64, 0.1]} />
          <meshStandardMaterial color="#0a1020" metalness={0.4} roughness={0.35} />
        </mesh>
        <mesh position={[-2.1, 0.32, -0.7]}>
          <boxGeometry args={[0.1, 0.64, 0.1]} />
          <meshStandardMaterial color="#0a1020" metalness={0.4} roughness={0.35} />
        </mesh>
        <mesh position={[2.1, 0.32, -0.7]}>
          <boxGeometry args={[0.1, 0.64, 0.1]} />
          <meshStandardMaterial color="#0a1020" metalness={0.4} roughness={0.35} />
        </mesh>
        {/* wall display removed: was read as a “big rectangle” in camera view */}
      </group>

      {/* Break room / lounge */}
      <Lounge position={[0.0, -0.8, -9.0]} />
      <Plant position={[-3.4, -0.8, -9.2]} size={1.05} />
      <Plant position={[3.6, -0.8, -9.0]} size={0.95} />

      <Environment preset="city" />
    </>
  );
}

