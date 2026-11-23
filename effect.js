import {
  ACESFilmicToneMapping, AmbientLight, BufferGeometry, Color, DirectionalLight,
  EdgesGeometry, Float32BufferAttribute, Group, IcosahedronGeometry, LineBasicMaterial,
  LineSegments, MathUtils, Mesh, MeshPhysicalMaterial, PerspectiveCamera, PMREMGenerator,
  Scene, SRGBColorSpace, Vector3, WebGLRenderer
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const artwork = document.querySelector('.prism');
const cover = document.querySelector('.cover');
const play = document.getElementById('prism-play');
const phone = matchMedia('(max-width: 690px)');
const motion = matchMedia('(prefers-reduced-motion: reduce)');

try {
  if (window.WebGL2RenderingContext) setup();
} catch {
  // The CSS prism remains visible when 3D rendering cannot be initialized.
}

function setup() {
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.setClearColor(0, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, .1, 35);

  const surroundings = new RoomEnvironment();
  const capture = new PMREMGenerator(renderer);
  scene.environment = capture.fromScene(surroundings, .07).texture;
  surroundings.dispose();
  capture.dispose();

  scene.add(new AmbientLight(0xffefe0, .72));
  const key = new DirectionalLight(0xffd598, 2.55);
  key.position.set(-3.2, 4.7, 5);
  scene.add(key);
  const rim = new DirectionalLight(0xbbdacf, 1.74);
  rim.position.set(4, 1, -3);
  scene.add(rim);

  const object = new Group();
  const shards = makeShards(object);
  scene.add(object);
  artwork.prepend(renderer.domElement);

  let visible = true;
  let lost = false;
  let frame = 0;
  let previous = 0;
  let time = 0;
  let opening = 0;
  let mouseX = 0;
  let mouseY = 0;
  let tiltX = 0;
  let tiltY = 0;
  let optedIn = false;
  let previewStarted = -Infinity;
  const allowsMotion = () => optedIn || !motion.matches;

  function draw(now) {
    const dt = Math.min(.05, Math.max(0, (now - previous) / 1000));
    previous = now;
    const moving = allowsMotion();
    const scrollProgress = MathUtils.clamp(window.scrollY / (cover.offsetHeight * .68), 0, 1);
    const previewProgress = MathUtils.clamp((time - previewStarted) / 1.65, 0, 1);
    const preview = optedIn ? .70 * Math.sin(previewProgress * Math.PI) : 0;
    const target = moving ? Math.max(scrollProgress, preview) : 0;
    const smooth = 1 - Math.exp(-dt * 9.5);
    time += moving ? dt : 0;
    opening = moving ? MathUtils.lerp(opening, target, smooth) : 0;
    tiltX = moving ? MathUtils.lerp(tiltX, mouseX, smooth) : 0;
    tiltY = moving ? MathUtils.lerp(tiltY, mouseY, smooth) : 0;
    artwork.style.setProperty('--spread', opening.toFixed(4));

    const burst = MathUtils.smoothstep(opening, .04, .87);
    object.rotation.set(.32 + tiltY * .24 + burst * .32, -.24 + Math.sin(time * .62) * .23 + tiltX * .47 + burst * 1.21, -.24);
    object.position.y = Math.sin(time * 1.13) * .085 + .08 - burst * .42;

    for (const { mesh, home, normal, variation } of shards) {
      mesh.position.copy(home).addScaledVector(normal, burst * (.68 + variation * .54));
      mesh.position.y -= burst * variation * .28;
      mesh.rotation.set(burst * (.30 + variation * .45), burst * (variation - .42) * 1.19, burst * (variation - .5) * .85);
      mesh.scale.setScalar(1 - burst * .13);
    }

    camera.position.set(0, .1, (phone.matches ? 5.0 : 4.85) + burst * 1.75);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  function loop(now) {
    frame = 0;
    draw(now);
    sync();
  }

  function sync() {
    if (lost || !allowsMotion() || document.hidden || !visible) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      return;
    }
    if (frame) return;
    previous ||= performance.now();
    frame = requestAnimationFrame(loop);
  }

  function resize() {
    if (lost) return;
    const { width, height } = artwork.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, phone.matches ? 1.35 : 1.55));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw(performance.now());
  }

  renderer.domElement.addEventListener('webglcontextlost', () => {
    lost = true;
    delete artwork.dataset.ready;
    play.hidden = true;
    artwork.style.removeProperty('--spread');
    sync();
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    lost = false;
    resize();
    artwork.dataset.ready = 'true';
    refreshControl();
    sync();
  });

  new ResizeObserver(resize).observe(artwork);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(artwork);

  cover.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || !allowsMotion()) return;
    const box = artwork.getBoundingClientRect();
    mouseX = MathUtils.clamp((event.clientX - box.left) / box.width * 2 - 1, -1, 1);
    mouseY = MathUtils.clamp((event.clientY - box.top) / box.height * 2 - 1, -1, 1);
  }, { passive: true });
  cover.addEventListener('pointerleave', () => { mouseX = mouseY = 0; });
  document.addEventListener('visibilitychange', sync);
  function refreshControl() {
    play.hidden = !motion.matches || lost;
    play.textContent = optedIn ? 'Остановить анимацию' : 'Оживить призму';
  }
  play.addEventListener('click', () => {
    optedIn = !optedIn;
    if (optedIn) previewStarted = time;
    refreshControl();
    if (!lost) draw(performance.now());
    sync();
  });
  motion.addEventListener('change', () => {
    optedIn = false;
    refreshControl();
    if (!lost) draw(performance.now());
    sync();
  });
  resize();
  artwork.dataset.ready = 'true';
  refreshControl();
  sync();
}

function makeShards(group) {
  const shell = new IcosahedronGeometry(1.12);
  const positions = shell.attributes.position;
  const shards = [];
  const tones = [0xc78945, 0xe8b773, 0xa04d30, 0x79b6a3, 0x40776b];
  const edge = new LineBasicMaterial({ color: 0xfaf0ca, opacity: .57, transparent: true });
  const materials = tones.map(color => new MeshPhysicalMaterial({
    color: new Color(color), metalness: .24, roughness: .105,
    transmission: .38, thickness: .69, ior: 1.47,
    clearcoat: .72, clearcoatRoughness: .11
  }));

  for (let i = 0; i < positions.count; i += 3) {
    const face = [0, 1, 2].map(offset => {
      const point = new Vector3().fromBufferAttribute(positions, i + offset);
      return point.multiply(new Vector3(.92, 1.23, .92));
    });
    const home = face[0].clone().add(face[1]).add(face[2]).multiplyScalar(1 / 3);
    const normal = home.clone().normalize();
    const vertices = face.map(point => point.clone().lerp(home, .025).sub(home));
    vertices.push(...face.map(point => point.clone().multiplyScalar(.61).sub(home)));
    const faces = [0, 1, 2, 3, 5, 4, 0, 3, 4, 0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 2, 3, 0];
    const data = faces.flatMap(index => vertices[index].toArray());
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(data, 3));
    geometry.computeVertexNormals();
    const mesh = new Mesh(geometry, materials[(i / 3 * 7) % materials.length]);
    mesh.add(new LineSegments(new EdgesGeometry(geometry, 20), edge));
    group.add(mesh);
    shards.push({ mesh, home, normal, variation: ((i * 13) % 19) / 19 });
  }
  shell.dispose();
  return shards;
}
