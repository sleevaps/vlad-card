import {
  ACESFilmicToneMapping, AmbientLight, BoxGeometry, DirectionalLight,
  Group, HemisphereLight, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  PerspectiveCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer
} from 'three';
import { createTram } from './tram.js';
import { addRails, createShadow, createTrack, tileLength } from './track.js';

const journey = document.querySelector('.journey');
const stage = journey.querySelector('.stage');
const host = stage.querySelector('.render');
const opening = stage.querySelector('.opening');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const lerp = MathUtils.lerp;
const between = (value, start, end) => MathUtils.smoothstep(value, start, end);
const pathStart = -5.75;
const unitsPerScreen = 7.65;
const rideStart = .30;
const scrollSmoothingMs = 115;

async function start() {
  if (!window.WebGL2RenderingContext) return;
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.34;
  host.append(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(42, 1, .1, 75);
  scene.add(new AmbientLight(0xd1e1ca, .64));
  scene.add(new HemisphereLight(0xfaf3e5, 0x344938, 2.45));
  const light = new DirectionalLight(0xffdfad, 2.65);
  light.position.set(-2, 5, 5);
  scene.add(light);
  const rim = new DirectionalLight(0x8dc6b2, 3.4);
  rim.position.set(5, 2, -5);
  scene.add(rim);

  const train = createTram(scene);
  await document.fonts.load('900 36px "Golos Text"', 'ЗДОРОВЬЯ').catch(() => {});
  const track = createTrack(scene);
  const shadow = createShadow(scene);
  const skyline = createSkyline(scene);
  const stand = createPlatform(scene);
  const introPosition = new Vector3();
  const bodyPosition = new Vector3();

  let mobile = false;
  let near = true;
  let frame = 0;
  let contextLost = false;
  let optedIn = false;
  const motionEnabled = () => optedIn || !preference.matches;
  let lastProgress = -1;
  let visualProgress = null;
  let previousFrame = 0;
  let scrollOrigin = 0;
  let screens = 4.5;
  let entered = performance.now();

  function draw(now) {
    const viewport = Math.max(1, stage.offsetHeight);
    const offset = Math.max(0, -journey.getBoundingClientRect().top);
    const localScreens = offset / viewport;
    const targetProgress = motionEnabled() ? (scrollOrigin + localScreens) / 2.45 : 0;
    const frameInterval = MathUtils.clamp(now - previousFrame, 0, 50);
    previousFrame = now;
    if (visualProgress === null || Math.abs(targetProgress - visualProgress) < .00015) {
      visualProgress = targetProgress;
    } else {
      const catchUp = 1 - Math.exp(-frameInterval / scrollSmoothingMs);
      visualProgress = lerp(visualProgress, targetProgress, catchUp);
    }
    const progress = visualProgress;
    const elapsed = motionEnabled() ? (now - entered) / 1000 : 0;
    const unfold = between(progress, .045, rideStart);
    const distance = Math.max(0, progress - rideStart) * 2.45 * unitsPerScreen;
    const tileIndex = Math.floor(distance / tileLength);
    const x = pathStart + distance - tileIndex * tileLength;
    const size = lerp(mobile ? .88 : 1.28, 1, unfold);
    const stillX = mobile ? 0 : 2.42;
    const base = mobile ? 1.67 : .57;
    introPosition.set(stillX, base, -.50);
    bodyPosition.set(x, 0, 0);
    train.tram.position.copy(introPosition).lerp(bodyPosition, unfold);
    const turn = lerp(-.54 + Math.sin(elapsed * .69) * .11, 0, unfold);
    train.tram.rotation.y = turn;
    train.tram.scale.setScalar(size);
    train.pose(distance, elapsed, 1 - unfold);

    const dock = between(unfold, .06, .91);
    const handoff = between(unfold, .91, 1);
    const standWidth = size * (1 - .96 * handoff);
    stand.visible = handoff < .97;
    stand.scale.set(standWidth, size * (1 - .93 * handoff), standWidth);
    stand.position.copy(train.tram.position);
    stand.rotation.y = turn;

    track.update(tileIndex);
    track.group.position.y = lerp(-4.3, train.tram.position.y - .025 * (1 - handoff), dock);
    track.group.visible = dock > .025;
    shadow.visible = handoff > 0;
    shadow.position.set(train.tram.position.x, track.group.position.y + .021, train.tram.position.z);
    shadow.material.opacity = handoff;
    skyline.position.set(x - (distance % 2.5), 0, -5.7);
    skyline.visible = unfold > .27;
    skyline.scale.y = lerp(.34, 1, unfold);
    const viewX = lerp(mobile ? 0 : .1, x + (mobile ? .08 : .8), unfold);
    const viewY = lerp(mobile ? 1.01 : 1.77, .70, unfold);
    const viewDepth = lerp(mobile ? 8.55 : 7.75, mobile ? 8.75 : 7.25, unfold);
    camera.position.set(viewX + unfold * (mobile ? .82 : 2.75), lerp(mobile ? 1.19 : 2.45, 3.36, unfold), viewDepth);
    camera.lookAt(viewX, viewY, 0);
    renderer.render(scene, camera);

    if (progress !== lastProgress) {
      const fade = between(progress, .017, .129);
      stage.style.setProperty('--intro-offset', (-34 * fade) + 'px');
      stage.style.setProperty('--intro-opacity', String(1 - fade));
      const away = fade > .85;
      if (opening.inert !== away) opening.inert = away;
      stage.toggleAttribute('data-riding', away);
      lastProgress = progress;
    }
    if (!motionEnabled()) return;
    if (localScreens > 1800) {
      const shift = Math.round(viewport * 1200);
      scrollOrigin += shift / viewport;
      window.scrollTo({ top: offset - shift, behavior: 'instant' });
      screens -= shift / viewport;
      journey.style.setProperty('--journey-height', screens * 100 + 'svh');
    } else if (localScreens > screens - 2.20) {
      screens += 4;
      journey.style.setProperty('--journey-height', screens * 100 + 'svh');
    }
  }

  function loop(now) {
    frame = 0;
    draw(now);
    sync();
  }

  function sync() {
    if (!near || document.hidden || contextLost || !motionEnabled()) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    if (!frame) frame = requestAnimationFrame(loop);
  }

  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height || contextLost) return;
    mobile = width <= 700;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.36 : 1.55));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = mobile ? 46 : 42;
    camera.updateProjectionMatrix();
    draw(performance.now());
  }

  function setMode() {
    journey.dataset.scene = motionEnabled() ? 'moving' : 'still';
    entered = performance.now();
    visualProgress = null;
    resize();
    sync();
  }

  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(([entry]) => {
    near = entry.isIntersecting;
    sync();
  }).observe(stage);
  document.addEventListener('visibilitychange', sync);
  opening.querySelector('.follow').addEventListener('click', () => {
    if (motionEnabled() || contextLost) return;
    optedIn = true;
    setMode();
  });
  stage.querySelector('.route a').addEventListener('click', event => {
    event.preventDefault();
    history.replaceState(history.state, '', '#top');
    scrollOrigin = 0;
    window.scrollTo({ top: 0, behavior: 'instant' });
    visualProgress = 0;
    screens = 4.5;
    journey.style.removeProperty('--journey-height');
    opening.inert = false;
    opening.querySelector('.follow').focus({ preventScroll: true });
  });
  preference.addEventListener('change', () => {
    optedIn = false;
    scrollOrigin = 0;
    setMode();
  });
  renderer.domElement.addEventListener('webglcontextlost', () => {
    contextLost = true;
    delete journey.dataset.scene;
    opening.inert = false;
    stage.style.removeProperty('--intro-offset');
    stage.style.removeProperty('--intro-opacity');
    lastProgress = -1;
    sync();
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    setMode();
  });
  setMode();
}

function createPlatform(scene) {
  const stand = new Group();
  const base = new Mesh(
    new BoxGeometry(3.35, .21, 1.45),
    new MeshStandardMaterial({ color: 0x566150, roughness: .68, metalness: .14 })
  );
  base.position.y = -.105;
  stand.add(base);
  addRails(stand, 3.35);
  scene.add(stand);
  return stand;
}

function createSkyline(scene) {
  const group = new Group();
  const body = new MeshBasicMaterial({ color: 0x42584e });
  const beam = new MeshBasicMaterial({ color: 0xffd591 });
  const column = new BoxGeometry(.10, 2.1, .12);
  const head = new BoxGeometry(.29, .056, .14);
  const retainingWall = new Mesh(new BoxGeometry(36, 1.16, .65), new MeshBasicMaterial({ color: 0x293d35 }));
  retainingWall.position.set(0, -1.65, 0);
  group.add(retainingWall);

  const rail = new Mesh(new BoxGeometry(36, .044, .044), body);
  rail.position.set(0, -.39, .034);
  group.add(rail);
  const lowerRail = rail.clone();
  lowerRail.position.y = -.76;
  group.add(lowerRail);

  for (let i = -5; i <= 5; i++) {
    const post = new Mesh(column, body);
    const lamp = new Mesh(head, beam);
    post.position.set(i * 2.5, -.2, 0);
    lamp.position.set(post.position.x, .83, 0);
    group.add(post, lamp);
  }
  scene.add(group);
  return group;
}

start().catch(() => {
  host.replaceChildren();
  delete journey.dataset.scene;
  opening.inert = false;
});
