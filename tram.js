import {
  AdditiveBlending, CanvasTexture, CylinderGeometry, Group, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, Sprite, SpriteMaterial
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const wheelRadius = .21;

export function createTram(scene) {
  const tram = new Group();
  const coach = new Group();
  const wheelsets = [];
  const red = surface(0x8c3027, .42, .24);
  const enamel = surface(0xe7cca0, .56, .09);
  const roof = surface(0x324843, .66, .19);
  const ink = surface(0x1b312f, .55, .32);
  const brass = surface(0xba874f, .34, .55);
  const glass = new MeshStandardMaterial({
    color: 0xe8a94d, roughness: .31, emissive: 0xc56418, emissiveIntensity: .54
  });
  const light = new MeshBasicMaterial({ color: 0xffefb1, toneMapped: false });

  plate(coach, 2.72, .20, .97, .092, ink, 0, .47, 0);
  plate(coach, 2.65, .47, 1.01, .16, red, 0, .76, 0);
  plate(coach, 2.57, .52, .97, .16, enamel, 0, 1.21, 0);
  plate(coach, 2.76, .23, 1.04, .105, roof, 0, 1.59, 0);
  plate(coach, 2.02, .066, .63, .027, brass, 0, 1.722, 0);
  plate(coach, 2.66, .042, 1.03, .02, brass, 0, .973, 0);

  for (const side of [-1, 1]) {
    const z = side * .492;
    for (const x of [-.91, -.31, .31, .91]) {
      plate(coach, .418, .343, .044, .068, ink, x, 1.249, z);
      plate(coach, .352, .280, .026, .045, glass, x, 1.252, z + side * .024);
      plate(coach, .018, .278, .014, .008, enamel, x + .025, 1.252, z + side * .039);
    }
    plate(coach, .25, .054, .031, .01, brass, -.90, .79, z + side * .032);
    plate(coach, .25, .054, .031, .01, brass, .90, .79, z + side * .032);

    const name = new Mesh(new PlaneGeometry(.95, .22), sign('ВЛАД', '#772d27', '#ffe2a3', 134));
    name.position.set(0, .756, z + side * .027);
    if (side < 0) name.rotation.y = Math.PI;
    coach.add(name);
  }

  for (const end of [-1, 1]) {
    const x = end * 1.278;
    plate(coach, .061, .373, .57, .031, ink, x, 1.245, 0);
    for (const z of [-.13, .13]) {
      plate(coach, .035, .30, .218, .028, glass, x + end * .038, 1.264, z);
    }
    const indicator = new Mesh(new PlaneGeometry(.437, .13), sign('С ДНЁМ!', '#243b39', '#ffe7b0', 93));
    indicator.rotation.y = end * Math.PI / 2;
    indicator.position.set(x + end * .035, 1.49, 0);
    coach.add(indicator);

    const gasket = new Mesh(new CylinderGeometry(.121, .121, .059, 24), brass);
    gasket.rotation.z = Math.PI / 2;
    gasket.position.set(x + end * .106, .764, 0);
    coach.add(gasket);
    const lens = new Mesh(new CylinderGeometry(.083, .083, .021, 24), light);
    lens.rotation.z = Math.PI / 2;
    lens.position.set(x + end * .144, .764, 0);
    coach.add(lens);
    plate(coach, .122, .092, .57, .037, ink, x + end * .144, .441, 0);
  }

  const glow = new Sprite(new SpriteMaterial({
    map: glowTexture(), color: 0xffbf67, depthWrite: false, transparent: true,
    blending: AdditiveBlending, opacity: .65, toneMapped: false
  }));
  glow.scale.setScalar(.87);
  glow.position.set(1.47, .765, 0);
  coach.add(glow);
  tram.add(coach);

  for (const x of [-.82, .82]) {
    const axle = new Group();
    axle.position.set(x, wheelRadius + .047, 0);
    for (const side of [-1, 1]) {
      const tire = new Mesh(new CylinderGeometry(wheelRadius, wheelRadius, .10, 24), ink);
      tire.rotation.x = Math.PI / 2;
      tire.position.z = side * .38;
      axle.add(tire);
      const rim = new Mesh(new CylinderGeometry(.129, .129, .028, 20), brass);
      rim.rotation.x = Math.PI / 2;
      rim.position.z = side * .446;
      axle.add(rim);
      for (let i = 0; i < 5; i++) {
        const angle = i * Math.PI * .4;
        const spoke = plate(axle, .019, .091, .018, .006, ink,
          Math.sin(angle) * .051, Math.cos(angle) * .051, side * .464);
        spoke.rotation.z = -angle;
      }
    }
    tram.add(axle);
    wheelsets.push(axle);
  }
  scene.add(tram);

  function pose(distance, time, parked) {
    for (const axle of wheelsets) axle.rotation.z = -distance / wheelRadius;
    coach.position.y = Math.sin(distance * 9) * .009 * (1 - parked);
    coach.rotation.x = Math.sin(distance * 4) * .009;
    glow.material.opacity = .58 + .08 * Math.sin(time * 1.7);
  }
  return { tram, pose };
}

function surface(color, roughness, metalness) {
  return new MeshStandardMaterial({ color, roughness, metalness });
}

function plate(group, w, h, d, radius, material, x, y, z) {
  const mesh = new Mesh(new RoundedBoxGeometry(w, h, d, 3, radius), material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

function sign(text, background, ink, size) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, 500, 148);
  ctx.fillStyle = ink;
  ctx.font = '700 ' + size + 'px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 86, 464);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return new MeshBasicMaterial({ map: texture, toneMapped: false });
}

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 80;
  const ctx = canvas.getContext('2d');
  const radial = ctx.createRadialGradient(40, 40, 0, 40, 40, 40);
  radial.addColorStop(0, 'rgba(255,255,255,.95)');
  radial.addColorStop(.30, 'rgba(255,255,255,.3)');
  radial.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, 80, 80);
  return new CanvasTexture(canvas);
}
