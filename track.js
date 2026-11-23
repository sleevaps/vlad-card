import {
  BoxGeometry, CanvasTexture, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  PlaneGeometry, SRGBColorSpace
} from 'three';
import { wishAt } from './wishes.js';

export const tileLength = 3.95;
const firstTile = -4.9;
const tileCount = 11;
const colors = ['#ffd28c', '#a7c5a8', '#eca68b', '#ded6b4'];

const steel = new MeshStandardMaterial({ color: 0xbea980, roughness: .37, metalness: .63 });
const timber = new MeshStandardMaterial({ color: 0x584837, roughness: .78 });
const sleeperShape = new BoxGeometry(.10, .023, 1.13);

export function addRails(group, length) {
  const railShape = new BoxGeometry(length, .022, .039);
  for (const side of [-1, 1]) {
    const rail = new Mesh(railShape, steel);
    rail.position.set(0, .036, side * .38);
    group.add(rail);
  }
  const count = Math.round(length / .51);
  const sleepers = new InstancedMesh(sleeperShape, timber, count);
  const offset = new Matrix4();
  for (let i = 0; i < count; i++) {
    sleepers.setMatrixAt(i, offset.makeTranslation((i + .5) * length / count - length / 2, .013, 0));
  }
  sleepers.instanceMatrix.needsUpdate = true;
  group.add(sleepers);
}

export function createTrack(scene) {
  const group = new Group();
  const deck = new MeshStandardMaterial({ color: 0x3c4c40, roughness: .61, metalness: .25 });
  const side = new MeshStandardMaterial({ color: 0x283932, roughness: .63, metalness: .32 });
  const ballast = new MeshStandardMaterial({ color: 0x202d27, roughness: .82 });
  const width = tileLength - .03;
  const body = new BoxGeometry(width, .75, 2.28);
  const base = new BoxGeometry(tileLength, .20, 2.33);
  const face = new PlaneGeometry(width - .10, .67);
  const stripeGeometry = new BoxGeometry(width - .08, .012, .035);
  const tiles = [];

  for (let i = 0; i < tileCount; i++) {
    const block = new Group();
    const platform = new Mesh(body, [side, side, deck, side, side, side]);
    platform.position.y = -.375;
    const footing = new Mesh(base, ballast);
    footing.position.y = -.84;
    const panel = document.createElement('canvas');
    panel.width = 768;
    panel.height = 146;
    const texture = new CanvasTexture(panel);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    const print = new Mesh(face, new MeshBasicMaterial({ map: texture, toneMapped: false }));
    print.position.set(0, -.385, 1.146);
    const stripe = new Mesh(stripeGeometry, new MeshBasicMaterial({ toneMapped: false }));
    stripe.position.set(0, .007, 1);
    block.add(platform, footing, print, stripe);
    addRails(block, tileLength);
    group.add(block);
    tiles.push({ block, texture, stripe, index: -1 });
  }
  scene.add(group);

  let origin = -1;
  function update(index) {
    if (index === origin) return;
    origin = index;
    const first = Math.max(0, index - 5);
    for (let i = first; i < first + tileCount; i++) {
      const tile = tiles[i % tileCount];
      tile.block.position.x = firstTile + (i - origin) * tileLength;
      if (tile.index === i) continue;
      const color = colors[i % colors.length];
      paintWord(tile.texture.image, wishAt(i).toUpperCase(), color);
      tile.texture.needsUpdate = true;
      tile.stripe.material.color.set(color);
      tile.index = i;
    }
  }
  update(0);
  return { group, update };
}

export function createShadow(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext('2d');
  const fade = ctx.createRadialGradient(48, 48, 3, 48, 48, 46);
  fade.addColorStop(0, 'rgba(5,8,19,.75)');
  fade.addColorStop(.5, 'rgba(5,8,19,.35)');
  fade.addColorStop(1, 'rgba(5,8,19,0)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, 96, 96);
  const shadow = new Mesh(
    new PlaneGeometry(1.85, 1.3),
    new MeshBasicMaterial({ map: new CanvasTexture(canvas), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = .02;
  scene.add(shadow);
  return shadow;
}

function paintWord(canvas, text, color) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#263128';
  ctx.fillRect(0, 0, width, 4);
  ctx.fillRect(0, height - 4, width, 4);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = '900 111px "Golos Text", Arial, sans-serif';
  const words = text.split(' ');
  if (words.length > 1 && ctx.measureText(text).width > width * 1.36) {
    const cut = Math.ceil(words.length / 2);
    ctx.font = '900 63px "Golos Text", Arial, sans-serif';
    ctx.fillText(words.slice(0, cut).join(' '), width / 2, 42, width - 38);
    ctx.fillText(words.slice(cut).join(' '), width / 2, 105, width - 38);
  } else {
    ctx.fillText(text, width / 2, 79, width - 38);
  }
}
