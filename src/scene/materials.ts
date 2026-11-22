import * as THREE from 'three';

function randomGenerator(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
let woodTexture: THREE.CanvasTexture | undefined;
export function getWoodTexture() {
  if (woodTexture) return woodTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  const rand = randomGenerator(1940);
  ctx.fillStyle = '#735032';
  ctx.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 4200; i++) {
    const x = rand() * 512;
    const thickness = rand() * 2.8 + 0.2;
    ctx.strokeStyle =
      rand() > 0.47 ? `rgba(32,16,8,${rand() * 0.25})` : `rgba(206,153,84,${rand() * 0.3})`;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    const wave = rand() * 25;
    ctx.bezierCurveTo(x + wave, 300, x - wave, 650, x + rand() * 8, 1024);
    ctx.stroke();
  }
  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = `rgba(19,10,4,${rand() * 0.13})`;
    ctx.fillRect(rand() * 512, rand() * 1024, 0.5 + rand(), 15 + rand() * 190);
  }
  woodTexture = new THREE.CanvasTexture(canvas);
  woodTexture.colorSpace = THREE.SRGBColorSpace;
  woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.anisotropy = 8;
  return woodTexture;
}

const labelCache = new Map<string, THREE.CanvasTexture>();
export function labelTexture(
  text: string,
  color = '#e5dfcb',
  background = '',
  serif = false,
  aspect = 1,
) {
  const key = `${text}/${color}/${background}/${serif}/${aspect}`;
  const existing = labelCache.get(key);
  if (existing) return existing;
  const canvas = document.createElement('canvas');
  canvas.height = text.length > 5 ? 128 : 256;
  canvas.width = Math.max(64, Math.min(4096, Math.round(canvas.height * aspect)));
  const ctx = canvas.getContext('2d')!;
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let fontSize = canvas.height * 0.77;
  const font = () => `${serif ? 'bold' : '600'} ${fontSize}px ${serif ? 'Georgia' : 'monospace'}`;
  ctx.font = font();
  const measured = ctx.measureText(text).width;
  if (measured > canvas.width * 0.9) {
    fontSize *= (canvas.width * 0.9) / measured;
    ctx.font = font();
  }
  ctx.fillText(text, canvas.width / 2, canvas.height * 0.52);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  labelCache.set(key, texture);
  return texture;
}
