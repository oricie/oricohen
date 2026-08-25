// The 3D side: renderer, environment, the two camera modes and export.

import * as THREE from 'three';
import { OrbitControls } from 'three/controls/OrbitControls.js';
import { PointerLockControls } from 'three/controls/PointerLockControls.js';
import { GLTFExporter } from 'three/exporters/GLTFExporter.js';
import { RoomEnvironment } from 'three/environments/RoomEnvironment.js';
import { buildApartment, buildFurnitureItem } from './builder.js';
import { material } from './textures.js';

const EYE_HEIGHT = 1.65;
const PLAYER_RADIUS = 0.3;

export class Viewer {
  constructor(canvas) {
    this.canvas = canvas;
    this.mode = 'orbit';
    this.night = false;
    this.showCeiling = true;
    this.apartment = null;
    this.walkLevel = 0;
    this.levels = [0];
    this.collision = [];
    this.clock = new THREE.Clock();
    this.keys = new Set();
    this.velocity = new THREE.Vector3();
    this.onModeChange = () => {};
    this.onPick = () => {};
    this.onFrame = () => {};
    this.onItemChange = () => {};
    this.onPlace = () => {};
    this.placing = null;
    this.sketching = false;
    this.onSketch = () => {};
    this.gizmo = null;
    this.gizmoItemId = null;
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.raycaster = new THREE.Raycaster();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = skyTexture(false);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envMap;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.05, 400);
    this.camera.position.set(8, 9, 12);

    this.orbit = new OrbitControls(this.camera, canvas);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.08;
    this.orbit.maxPolarAngle = Math.PI * 0.495;
    this.orbit.target.set(0, 0, 0);

    this.walk = new PointerLockControls(this.camera, canvas);
    this.scene.add(this.walk.object);

    this.sun = new THREE.DirectionalLight(0xfff3e0, 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xdfeaff, 0x8a7f70, 0.55);
    this.scene.add(this.hemi);

    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      material('grass').clone()
    );
    this.ground.material.map.repeat.set(100, 100);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.04;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this._bindInput();
    this._resize();
    window.addEventListener('resize', () => this._resize());
    this.renderer.setAnimationLoop(() => this._tick());
  }

  // ------------------------------------------------------------- scene data

  setPlan(plan, options = {}) {
    if (this.apartment) {
      this.scene.remove(this.apartment.root);
      disposeTree(this.apartment.root);
    }
    this._highlighted = null;
    this.hideGizmo();
    this.plan = plan;
    this.apartment = buildApartment(plan, { ...options, ceiling: true });
    this.scene.add(this.apartment.root);
    this.collision = this.apartment.collision;
    this.wallHeight = this.apartment.height;
    this.collisionByLevel = new Map();
    for (const seg of this.collision) {
      if (!this.collisionByLevel.has(seg.level)) this.collisionByLevel.set(seg.level, []);
      this.collisionByLevel.get(seg.level).push(seg);
    }
    this.levels = [...this.collisionByLevel.keys()].sort((a, b) => a - b);
    if (!this.levels.includes(this.walkLevel)) this.walkLevel = this.levels[0] || 0;

    const box = this.apartment.bounds;
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    this.centre = centre;
    this.radius = Math.max(size.x, size.z) * 0.5 || 5;

    this.sun.position.set(centre.x + this.radius * 1.4, this.radius * 2.2 + 6, centre.z - this.radius * 1.1);
    this.sun.target.position.copy(centre);
    const s = this.sun.shadow.camera;
    const span = this.radius * 1.9 + 4;
    s.left = -span; s.right = span; s.top = span; s.bottom = -span;
    s.near = 0.5; s.far = this.radius * 6 + 40;
    s.updateProjectionMatrix();

    this.applyCeiling();
    this.applyLighting();
    this.setVisibleLevel(this.visibleLevel ?? null);
    // Rebuilding after an edit must leave the camera exactly where it was:
    // deleting a wall should not throw the view back to the overview.
    if (options.frame && this.mode === 'orbit') this.frameAll();
  }

  frameAll() {
    if (!this.apartment) return;
    const visible = this.apartment.root.children.filter((c) => c.visible && c.userData.level !== undefined);
    if (visible.length) {
      const box = new THREE.Box3();
      for (const g of visible) box.expandByObject(g);
      box.getCenter(this.centre);
      const size = box.getSize(new THREE.Vector3());
      this.radius = Math.max(size.x, size.z) * 0.5 || 5;
    }
    const r = this.radius;
    this.orbit.target.copy(this.centre);
    // steep enough to look over the near walls into the rooms
    this.camera.position.set(
      this.centre.x + r * 0.55,
      this.centre.y + r * 1.85 + 4,
      this.centre.z + r * 1.05
    );
    this.orbit.update();
  }

  // ------------------------------------------------------------------ modes

  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    if (mode === 'walk') {
      this._orbitView = {
        position: this.camera.position.clone(),
        target: this.orbit.target.clone(),
      };
      this.orbit.enabled = false;
      const start = this.spawnPoint();
      this.walk.object.position.set(start.x, this.walkYBase + EYE_HEIGHT, start.z);
      this.camera.rotation.set(0, 0, 0);
      this.walk.object.rotation.set(0, this.spawnYaw || 0, 0);
      this.velocity.set(0, 0, 0);
      this.walk.lock();
    } else {
      this.orbit.enabled = true;
      if (this.walk.isLocked) this.walk.unlock();
      if (this._orbitView) {
        // put the dollhouse back exactly as it was before the walkthrough
        this.camera.position.copy(this._orbitView.position);
        this.orbit.target.copy(this._orbitView.target);
        this.orbit.update();
      } else {
        this.frameAll();
      }
    }
    this.applyCeiling();
    this.onModeChange(this.mode);
  }

  spawnPoint() {
    // stand in the largest room, or the centre of the flat
    const p = this.spawn || this.centre || new THREE.Vector3();
    return new THREE.Vector3(p.x, EYE_HEIGHT, p.z);
  }

  // yaw is measured so that 0 looks towards -z, matching PointerLockControls.
  setSpawn(x, z, yaw = 0, level = 0) {
    this.spawn = new THREE.Vector3(x, EYE_HEIGHT, z);
    this.spawnYaw = yaw;
    this.walkLevel = level;
  }

  get walkYBase() {
    return (this.walkLevel || 0) * (this.wallHeight || 2.7);
  }

  setWalkLevel(level) {
    this.walkLevel = level;
    if (this.mode === 'walk') {
      const start = this.spawnPoint();
      this.walk.object.position.set(start.x, this.walkYBase + EYE_HEIGHT, start.z);
    }
  }

  // Show one storey on its own — a stacked model is otherwise only visible
  // from the top floor down.
  setVisibleLevel(level) {
    this.visibleLevel = level;
    if (!this.apartment) return;
    for (const group of this.apartment.root.children) {
      if (group.userData.level === undefined) continue;
      group.visible = level == null || group.userData.level === level;
    }
  }

  toggleCeiling(on) {
    this.showCeiling = on;
    this.applyCeiling();
  }

  applyCeiling() {
    if (!this.apartment) return;
    const visible = this.mode === 'walk' ? this.showCeiling : false;
    this.apartment.root.traverse((o) => {
      if (o.name === 'ceiling') o.visible = visible;
    });
  }

  setNight(night) {
    this.night = night;
    this.applyLighting();
  }

  applyLighting() {
    const night = this.night;
    this.scene.background = skyTexture(night);
    this.sun.intensity = night ? 0.12 : 2.6;
    this.sun.color.set(night ? 0x9fb6e0 : 0xfff3e0);
    this.hemi.intensity = night ? 0.12 : 0.55;
    this.hemi.color.set(night ? 0x2a3550 : 0xdfeaff);
    this.renderer.toneMappingExposure = night ? 1.15 : 1.0;
    if (this.envMap) this.scene.environment = this.envMap;
    this.scene.environmentIntensity = night ? 0.12 : 1.0;

    if (!this.apartment) return;
    this.apartment.root.traverse((o) => {
      if (o.isPointLight) o.intensity = night ? o.userData.baseIntensity : 0;
      if (o.material && o.material.emissive && o.material.emissiveIntensity !== undefined &&
          o.geometry && o.geometry.type === 'CylinderGeometry') {
        o.material.emissiveIntensity = night ? 1.6 : 0.25;
      }
    });
  }

  // ------------------------------------------------------------------ input

  _bindInput() {
    const down = (e) => {
      if (this.mode !== 'walk') return;
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    };
    const up = (e) => this.keys.delete(e.code);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    this.canvas.addEventListener('pointerdown', (e) => {
      this._pressAt = { x: e.clientX, y: e.clientY };
      if (this.mode !== 'orbit' || e.button !== 0) return;
      if (!this.apartment || this.sketching) return;

      // a handle on the gizmo wins over everything underneath it
      const handle = this.gizmo ? this.pickGizmo(e) : null;
      const hit = handle ? { kind: 'item', id: this.gizmoItemId } : this.pickAt(e);
      if (!hit || hit.kind !== 'item') return;
      const group = this.itemGroup(hit.id);
      if (!group) return;

      // grabbing furniture moves it; the camera stays put. OrbitControls
      // listens on the same element, so stop the event reaching it rather
      // than disabling it mid-gesture and leaving its pointer bookkeeping
      // out of step.
      e.stopPropagation();
      this.orbit.enabled = false;
      this.canvas.setPointerCapture(e.pointerId);
      const level = this.levelOf(group);
      this.dragPlane.set(new THREE.Vector3(0, 1, 0), -(level * (this.wallHeight || 2.7)));
      const at = this.planePoint(e);
      this.item = {
        id: hit.id,
        group,
        mode: handle || (e.shiftKey ? 'rotate' : (e.altKey ? 'scale' : 'move')),
        grab: at,
        origin: group.position.clone(),
        rot: group.rotation.y,
        scale: group.scale.x,
        startX: e.clientX,
        grabRadius: (() => {
          const at = this.planePoint(e);
          return at ? Math.max(0.05, Math.hypot(at.x - group.position.x, at.z - group.position.z)) : 1;
        })(),
        moved: false,
      };
    }, true);

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.item) return;
      const drag = this.item;
      drag.moved = true;
      const at = this.planePoint(e);
      if (drag.mode === 'move') {
        if (!at || !drag.grab) return;
        drag.group.position.x = drag.origin.x + (at.x - drag.grab.x);
        drag.group.position.z = drag.origin.z + (at.z - drag.grab.z);
        if (this.gizmo) this.gizmo.position.set(drag.group.position.x, this.gizmo.position.y, drag.group.position.z);
      } else if (drag.mode === 'rotate') {
        if (!at) return;
        const angle = Math.atan2(at.x - drag.origin.x, at.z - drag.origin.z);
        if (drag.startAngle === undefined) drag.startAngle = angle - drag.rot;
        drag.group.rotation.y = angle - drag.startAngle;
        if (this.gizmo) this.gizmo.rotation.y = drag.group.rotation.y;
      } else {
        if (!at || !drag.grabRadius) return;
        const radius = Math.hypot(at.x - drag.origin.x, at.z - drag.origin.z);
        const k = Math.max(0.3, Math.min(3, drag.scale * (radius / drag.grabRadius)));
        drag.group.scale.setScalar(k);
        if (this.gizmo) this.gizmo.scale.setScalar(k / drag.scale);
      }
    });

    const endItemDrag = (e) => {
      if (!this.item) return;
      const drag = this.item;
      this.item = null;
      this.orbit.enabled = this.mode === 'orbit';
      if (!drag.moved) return;
      this._justDragged = true;
      this.onItemChange(drag.id, {
        x: drag.group.position.x,
        y: drag.group.position.z,
        rot: drag.group.rotation.y,
        scale: drag.mode === 'scale' ? drag.group.scale.x : undefined,
      });
    };
    this.canvas.addEventListener('pointerup', endItemDrag);
    this.canvas.addEventListener('pointercancel', endItemDrag);
    this.canvas.addEventListener('click', (e) => {
      if (this.mode === 'walk') {
        if (!this.walk.isLocked && this.pointerLockOk !== false) {
          try { this.walk.lock(); } catch { this.pointerLockOk = false; }
        }
        return;
      }
      // ignore the click that ends an orbit drag or a furniture drag
      if (this._justDragged) { this._justDragged = false; return; }
      const moved = this._pressAt
        ? Math.hypot(e.clientX - this._pressAt.x, e.clientY - this._pressAt.y)
        : 0;
      if (moved > 4) return;
      if (this.placing) {
        const at = this.planePoint(e);
        if (at) {
          const level = this.walkLevel || 0;
          const offset = this.levelOffset(level);
          this.onPlace(this.placing, at.x - offset.dx, at.z - offset.dy, level);
          return;
        }
      }
      this.onPick(this.pickAt(e), e.shiftKey);
    });
    // Sandboxed frames and touch devices refuse pointer lock; fall back to
    // dragging the view around, which needs no permission.
    document.addEventListener('pointerlockerror', () => {
      this.pointerLockOk = false;
      this.onPointerLockDenied();
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.sketching || this.mode !== 'orbit' || e.button !== 0) return;
      e.stopPropagation();
      this.canvas.setPointerCapture(e.pointerId);
      const level = this.walkLevel || 0;
      this.dragPlane.set(new THREE.Vector3(0, 1, 0), -(level * (this.wallHeight || 2.7)));
      const at = this.planePoint(e);
      this.lasso = at ? [{ x: at.x, y: at.z }] : [];
      this.lassoScreen = [{ x: e.clientX, y: e.clientY }];
    }, true);

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.lasso) return;
      const at = this.planePoint(e);
      if (!at) return;
      const last = this.lasso[this.lasso.length - 1];
      if (!last || Math.hypot(at.x - last.x, at.z - last.y) > 0.08) {
        this.lasso.push({ x: at.x, y: at.z });
        this.lassoScreen.push({ x: e.clientX, y: e.clientY });
        this.onSketchProgress(this.lassoScreen);
      }
    });

    const endLasso = () => {
      if (!this.lasso) return;
      const points = this.lasso;
      this.lasso = null;
      this.lassoScreen = null;
      this.onSketchProgress(null);
      if (points.length < 4) return this.onSketch(null);
      const level = this.walkLevel || 0;
      const offset = this.levelOffset(level);
      this.onSketch(points.map((p) => ({ x: p.x - offset.dx, y: p.y - offset.dy })), level);
    };
    this.canvas.addEventListener('pointerup', endLasso);
    this.canvas.addEventListener('pointercancel', endLasso);

    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'walk' || this.walk.isLocked) return;
      this.look = { x: e.clientX, y: e.clientY, id: e.pointerId };
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.look || e.pointerId !== this.look.id) return;
      this._turn(e.clientX - this.look.x, e.clientY - this.look.y);
      this.look.x = e.clientX;
      this.look.y = e.clientY;
    });
    const endLook = (e) => {
      if (this.look && e.pointerId === this.look.id) this.look = null;
    };
    this.canvas.addEventListener('pointerup', endLook);
    this.canvas.addEventListener('pointercancel', endLook);

    this.walk.addEventListener('unlock', () => {
      this.keys.clear();
      this.velocity.set(0, 0, 0);
    });
  }

  onPointerLockDenied() {}
  onSketchProgress() {}

  // Float a length label over the middle of every wall.
  showDimensions(on, plan) {
    if (this.dimensions) {
      this.scene.remove(this.dimensions);
      this.dimensions.traverse((o) => {
        if (o.material && o.material.map) o.material.map.dispose();
        if (o.material) o.material.dispose();
      });
      this.dimensions = null;
    }
    if (!on || !plan) return;

    const group = new THREE.Group();
    group.name = 'dimensions';
    const height = plan.wallHeight || 2.7;
    for (const wall of plan.walls || []) {
      const length = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
      if (length < 0.4) continue;
      const level = wall.level || 0;
      const offset = this.levelOffset(level);
      const sprite = labelSprite(`${length.toFixed(2)} m`);
      sprite.position.set(
        (wall.x1 + wall.x2) / 2 + offset.dx,
        level * height + height + 0.28,
        (wall.y1 + wall.y2) / 2 + offset.dy
      );
      group.add(sprite);
    }
    this.dimensions = group;
    this.scene.add(group);
  }

  setSketching(on) {
    this.sketching = on;
    this.orbit.enabled = !on && this.mode === 'orbit';
    this.canvas.style.cursor = on ? 'crosshair' : '';
  }

  // Which gizmo handle, if any, is under the cursor.
  pickGizmo(event) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObject(this.gizmo, true);
    return hits.length ? hits[0].object.userData.gizmo : null;
  }

  // Drop one piece into the scene without rebuilding the whole flat.
  addItem(item) {
    if (!this.apartment) return null;
    const level = item.level || 0;
    const group = this.apartment.root.children.find((c) => c.userData.level === level)
      || this.apartment.root.children[0];
    if (!group) return null;
    const mesh = buildFurnitureItem(item);
    if (mesh) group.add(mesh);
    return mesh;
  }

  removeItem(id) {
    const mesh = this.itemGroup(id);
    if (mesh && mesh.parent) mesh.parent.remove(mesh);
  }

  // The group in the scene that carries this furniture id.
  itemGroup(id) {
    let found = null;
    this.apartment.root.traverse((o) => {
      if (!found && o.userData.itemId === id) found = o;
    });
    return found;
  }

  levelOf(object) {
    for (let o = object; o; o = o.parent) {
      if (o.userData && o.userData.level !== undefined) return o.userData.level;
    }
    return 0;
  }

  // Where the cursor meets the floor of the level being edited.
  planePoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const at = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.dragPlane, at) ? at : null;
  }

  // What is under the cursor, as a plan selection: {kind, id} or null.
  pickAt(event) {
    if (!this.apartment) return null;
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObject(this.apartment.root, true);
    for (const hit of hits) {
      if (!hit.object.visible) continue;
      for (let o = hit.object; o && o !== this.apartment.root; o = o.parent) {
        if (o.userData.itemId) return { kind: 'item', id: o.userData.itemId };
        if (o.userData.openingId) return { kind: 'opening', id: o.userData.openingId };
        if (o.userData.wallId) return { kind: 'wall', id: o.userData.wallId };
        if (o.userData.room) return { kind: 'room', id: o.userData.room };
      }
    }
    return null;
  }

  // A ring to turn the selected piece and four corners to resize it, so the
  // 3D view needs no modifier keys.
  showGizmo(item, footprint) {
    this.hideGizmo();
    if (!item || !footprint) return;
    const g = new THREE.Group();
    g.name = 'gizmo';
    const r = Math.max(footprint.w, footprint.d) * 0.5 + 0.22;

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc2410c, transparent: true, opacity: 0.85, depthTest: false,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.028, 8, 40), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.03;
    ring.renderOrder = 999;
    ring.userData.gizmo = 'rotate';
    g.add(ring);

    const knobMat = new THREE.MeshBasicMaterial({ color: 0xc2410c, depthTest: false });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const knob = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), knobMat);
        knob.position.set(sx * footprint.w / 2, 0.06, sz * footprint.d / 2);
        knob.renderOrder = 999;
        knob.userData.gizmo = 'scale';
        g.add(knob);
      }
    }

    const level = item.level || 0;
    const offset = this.levelOffset(level);
    g.position.set(item.x + offset.dx, level * (this.wallHeight || 2.7) + 0.01, item.y + offset.dy);
    g.rotation.y = item.rot || 0;
    this.gizmo = g;
    this.scene.add(g);
  }

  hideGizmo() {
    if (!this.gizmo) return;
    this.scene.remove(this.gizmo);
    this.gizmo.traverse((o) => o.geometry && o.geometry.dispose());
    this.gizmo = null;
  }

  levelOffset(level) {
    const offsets = (this.plan && this.plan.levelOffsets) || {};
    return offsets[level] || { dx: 0, dy: 0 };
  }

  // Tint whatever is selected so the 3D view agrees with the plan. Takes one
  // selection or a list of them.
  setHighlight(selection) {
    if (!this.apartment) return;
    if (this._highlighted) {
      for (const m of this._highlighted) m.material = m.userData.baseMaterial;
      this._highlighted = null;
    }
    const list = Array.isArray(selection) ? selection : (selection ? [selection] : []);
    if (!list.length) return;
    const wanted = new Set(list.map((s) => s.id));
    const matches = [];
    this.apartment.root.traverse((o) => {
      if (!o.isMesh) return;
      for (let p = o; p && p !== this.apartment.root; p = p.parent) {
        const id = p.userData.itemId || p.userData.openingId || p.userData.wallId || p.userData.room;
        if (id && wanted.has(id)) { matches.push(o); return; }
      }
    });
    if (!matches.length) return;
    for (const m of matches) {
      m.userData.baseMaterial = m.material;
      m.material = highlightMaterial();
    }
    this._highlighted = matches;
  }

  _turn(dx, dy) {
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.setFromQuaternion(this.camera.quaternion);
    euler.y -= dx * 0.0032;
    euler.x -= dy * 0.0032;
    euler.x = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, euler.x));
    this.camera.quaternion.setFromEuler(euler);
  }

  _move(dt) {
    const speed = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) ? 5.2 : 2.4;
    const dir = new THREE.Vector3();
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) dir.z += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) dir.z -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) dir.x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dir.x += 1;

    const damping = Math.exp(-9 * dt);
    this.velocity.x *= damping;
    this.velocity.z *= damping;
    if (dir.lengthSq() > 0) {
      dir.normalize().multiplyScalar(speed * 9 * dt);
      this.velocity.x += dir.x;
      this.velocity.z += dir.z;
    }

    const obj = this.walk.object;
    const before = obj.position.clone();
    this.walk.moveRight(this.velocity.x * dt);
    this.walk.moveForward(this.velocity.z * dt);
    obj.position.y = this.walkYBase + EYE_HEIGHT;
    this._resolveCollisions(obj.position, before);
  }

  _resolveCollisions(p, before) {
    const segments = (this.collisionByLevel && this.collisionByLevel.get(this.walkLevel)) || [];
    for (let pass = 0; pass < 3; pass++) {
      let hit = false;
      for (const seg of segments) {
        const ax = seg.x1, ay = seg.y1;
        const bx = seg.x2, by = seg.y2;
        const dx = bx - ax, dy = by - ay;
        const l2 = dx * dx + dy * dy;
        let t = l2 < 1e-9 ? 0 : ((p.x - ax) * dx + (p.z - ay) * dy) / l2;
        t = Math.max(0, Math.min(1, t));
        const cx = ax + dx * t, cy = ay + dy * t;
        let ox = p.x - cx, oy = p.z - cy;
        const d = Math.hypot(ox, oy);
        const minD = PLAYER_RADIUS + seg.t / 2;
        if (d < minD) {
          hit = true;
          if (d < 1e-6) { ox = p.x - before.x; oy = p.z - before.z; }
          const l = Math.hypot(ox, oy) || 1;
          p.x = cx + (ox / l) * minD;
          p.z = cy + (oy / l) * minD;
        }
      }
      if (!hit) break;
    }
  }

  // ------------------------------------------------------------------- loop

  _tick() {
    const dt = Math.min(0.05, this.clock.getDelta());
    if (this.mode === 'walk') this._move(dt);
    if (this.mode === 'orbit') this.orbit.update();
    this.renderer.render(this.scene, this.camera);
    if (this.mode === 'walk') this.onFrame(this.camera);
  }

  _resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = Math.max(1, parent.clientWidth);
    const h = Math.max(1, parent.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ----------------------------------------------------------------- output

  screenshot() {
    this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL('image/png');
  }

  screenshotBlob() {
    this.renderer.render(this.scene, this.camera);
    return new Promise((resolve) => this.canvas.toBlob(resolve, 'image/png'));
  }

  exportGLB() {
    return new Promise((resolve, reject) => {
      if (!this.apartment) return reject(new Error('nothing to export'));
      new GLTFExporter().parse(
        this.apartment.root,
        (result) => resolve(new Blob([result], { type: 'model/gltf-binary' })),
        (err) => reject(err),
        { binary: true }
      );
    });
  }
}

let _highlight = null;
function highlightMaterial() {
  if (!_highlight) {
    _highlight = new THREE.MeshStandardMaterial({
      color: 0xc2410c,
      emissive: 0x7a2606,
      emissiveIntensity: 0.35,
      roughness: 0.6,
    });
  }
  return _highlight;
}

// A small canvas-drawn label that always faces the camera.
function labelSprite(text) {
  const pad = 10;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = '600 34px system-ui, sans-serif';
  const width = Math.ceil(ctx.measureText(text).width) + pad * 2;
  canvas.width = width;
  canvas.height = 54;
  const c = canvas.getContext('2d');
  c.font = '600 34px system-ui, sans-serif';
  c.fillStyle = 'rgba(255,255,255,0.92)';
  c.strokeStyle = 'rgba(31,33,36,0.25)';
  c.lineWidth = 2;
  c.beginPath();
  c.roundRect(1, 1, width - 2, 52, 10);
  c.fill();
  c.stroke();
  c.fillStyle = '#1f2124';
  c.textBaseline = 'middle';
  c.fillText(text, pad, 28);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, depthTest: false, transparent: true,
  }));
  sprite.renderOrder = 998;
  sprite.scale.set((width / 54) * 0.42, 0.42, 1);
  return sprite;
}

function skyTexture(night) {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  if (night) {
    g.addColorStop(0, '#0b1224');
    g.addColorStop(0.55, '#1b2740');
    g.addColorStop(1, '#3a4256');
  } else {
    g.addColorStop(0, '#7fa9dd');
    g.addColorStop(0.5, '#bcd4ea');
    g.addColorStop(1, '#e8e2d6');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}

function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
  });
}
