"use client";

import { CanvasTexture, ClampToEdgeWrapping, Color, LinearFilter, RepeatWrapping, SRGBColorSpace } from "three";

function makeCanvas(size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context not available");
  return { canvas, ctx };
}

function rand(seed: number) {
  // xorshift32-ish
  let x = seed | 0;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  return ((x >>> 0) % 100000) / 100000;
}

export function createConcreteTexture({
  size = 256,
  seed = 1337,
  base = "#5b6472",
}: {
  size?: number;
  seed?: number;
  base?: string;
}) {
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // blotches
  for (let i = 0; i < 420; i++) {
    const r = rand(seed + i * 97);
    const x = Math.floor(r * size);
    const y = Math.floor(rand(seed + i * 131) * size);
    const rad = 6 + Math.floor(rand(seed + i * 251) * 22);
    const alpha = 0.03 + rand(seed + i * 19) * 0.06;
    ctx.fillStyle = `rgba(10,16,32,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // subtle grain
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function createCarpetTexture({
  size = 256,
  seed = 9001,
  base = "#1c2333",
  accent = "#2a2f46",
}: {
  size?: number;
  seed?: number;
  base?: string;
  accent?: string;
}) {
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // woven stripes
  for (let y = 0; y < size; y += 4) {
    const a = 0.08 + rand(seed + y * 17) * 0.1;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(0, y, size, 1);
  }

  // speckles
  const c1 = new Color(accent);
  for (let i = 0; i < 1600; i++) {
    const x = Math.floor(rand(seed + i * 7) * size);
    const y = Math.floor(rand(seed + i * 11) * size);
    const a = 0.05 + rand(seed + i * 13) * 0.12;
    ctx.fillStyle = `rgba(${Math.floor(c1.r * 255)},${Math.floor(c1.g * 255)},${Math.floor(c1.b * 255)},${a})`;
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function createFabricNoiseTexture({
  size = 256,
  seed = 42,
  base = "#d6dde8",
}: {
  size?: number;
  seed?: number;
  base?: string;
}) {
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // tiny fiber noise
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand(seed + i) - 0.5) * 26;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = ClampToEdgeWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function createSoilTexture({
  size = 256,
  seed = 4242,
}: {
  size?: number;
  seed?: number;
} = {}) {
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = "#2a241c";
  ctx.fillRect(0, 0, size, size);

  // organic speckles
  for (let i = 0; i < 5200; i++) {
    const x = Math.floor(rand(seed + i * 3) * size);
    const y = Math.floor(rand(seed + i * 5) * size);
    const a = 0.04 + rand(seed + i * 7) * 0.12;
    const t = rand(seed + i * 11);
    const r = Math.floor(40 + t * 40);
    const g = Math.floor(55 + t * 35);
    const b = Math.floor(30 + t * 25);
    ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // mulch streaks
  for (let i = 0; i < 120; i++) {
    const y = Math.floor(rand(seed + i * 13) * size);
    const w = 20 + Math.floor(rand(seed + i * 17) * 90);
    const x = Math.floor(rand(seed + i * 19) * size);
    ctx.strokeStyle = `rgba(0,0,0,${0.05 + rand(seed + i * 23) * 0.08})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + (rand(seed + i * 29) - 0.5) * 6);
    ctx.stroke();
  }

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

