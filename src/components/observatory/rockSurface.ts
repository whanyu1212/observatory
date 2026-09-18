import * as THREE from 'three';

const SIZE = 256;
let stoneCanvases: { color: HTMLCanvasElement; normal: HTMLCanvasElement } | undefined;

function hash(x: number, y: number) {
  let value = Math.imul(x + 17, 374761393) ^ Math.imul(y + 31, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

// Periodic value noise keeps the texture's wrap invisible on a closed rock.
function noise(u: number, v: number, frequency: number) {
  const x = u * frequency, y = v * frequency;
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const sample = (dx: number, dy: number) => hash((ix + dx) % frequency, (iy + dy) % frequency);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(sample(0, 0), sample(1, 0), fx),
    THREE.MathUtils.lerp(sample(0, 1), sample(1, 1), fx), fy,
  );
}

function bakeStone() {
  if (stoneCanvases) return stoneCanvases;
  const color = document.createElement('canvas');
  const normal = document.createElement('canvas');
  color.width = color.height = normal.width = normal.height = SIZE;
  const colorContext = color.getContext('2d')!;
  const normalContext = normal.getContext('2d')!;
  const albedo = colorContext.createImageData(SIZE, SIZE);
  const heights = new Float32Array(SIZE * SIZE);
  const normals = normalContext.createImageData(SIZE, SIZE);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE, v = y / SIZE;
      const broad = noise(u, v, 5);
      const chips = noise(u, v, 17);
      const grit = noise(u, v, 61);
      const grain = hash(x, y);
      const pits = Math.max(0, (0.35 - chips) * 2.8);
      const tone = (94 + broad * 43 + chips * 22 + grain * 9) * (1 - pits * 0.22);
      const height = Math.max(0, Math.min(1, broad * 0.42 + chips * 0.34 + grit * 0.18 + grain * 0.06 - pits * 0.14));
      const offset = (y * SIZE + x) * 4;
      albedo.data[offset] = tone;
      albedo.data[offset + 1] = tone;
      albedo.data[offset + 2] = tone * 0.99;
      albedo.data[offset + 3] = 255;
      heights[y * SIZE + x] = height;
    }
  }
  // Bake the relief into normals, avoiding repeated height samples in the shader.
  const heightAt = (x: number, y: number) => heights[((y + SIZE) % SIZE) * SIZE + (x + SIZE) % SIZE];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const nx = (heightAt(x - 1, y) - heightAt(x + 1, y)) * 8;
      const ny = (heightAt(x, y + 1) - heightAt(x, y - 1)) * 8;
      const length = Math.hypot(nx, ny, 1);
      const offset = (y * SIZE + x) * 4;
      normals.data[offset] = (nx / length * 0.5 + 0.5) * 255;
      normals.data[offset + 1] = (ny / length * 0.5 + 0.5) * 255;
      normals.data[offset + 2] = (0.5 / length + 0.5) * 255;
      normals.data[offset + 3] = 255;
    }
  }
  colorContext.putImageData(albedo, 0, 0);
  normalContext.putImageData(normals, 0, 0);
  stoneCanvases = { color, normal };
  return stoneCanvases;
}

export function createRockMaterial() {
  // Bake once on the CPU. Each scene owns its textures so teardown is independent.
  const baked = bakeStone();
  const map = new THREE.CanvasTexture(baked.color);
  const normalMap = new THREE.CanvasTexture(baked.normal);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const texture of [map, normalMap]) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 6);
    texture.anisotropy = 4;
  }
  return new THREE.MeshStandardMaterial({
    color: 0x92979d,
    map,
    normalMap,
    normalScale: new THREE.Vector2(0.8, 0.8),
    vertexColors: true,
    roughness: 1,
    metalness: 0,
  });
}
