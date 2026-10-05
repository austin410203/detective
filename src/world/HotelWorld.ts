import * as THREE from 'three';
import { CollisionWorld } from './Collision';
import { box, canvasTexture, std } from './props';

const WALL_H = 3.0;
const WALL_T = 0.3;

/**
 * Hotel Meridian — 3rd floor + lobby (compact, low-poly, noir).
 *
 *   z=-14 ┌──────────── Room 317 ───────────┬──── Lounge ────┐
 *         │  desk   bed  nightstand          │  sofa   bar    │
 *   z=-4  ├──────────────[door]──────────────┴─[door]─────────┤
 *         │ ice            HALLWAY                   elevator ▐│
 *   z=4   ├───────────┐                     ┌─────────────────┤
 *         │  sofa     │       LOBBY         │      security   │
 *         │           │   reception desk    │                 │
 *   z=14  └──────────────────────────────────────────────────┘
 *        x=-12                                              x=12
 */
export class HotelWorld {
  group = new THREE.Group();
  collision = new CollisionWorld();
  walls: THREE.Mesh[] = [];
  footprints: THREE.Mesh[] = [];
  hemi!: THREE.HemisphereLight;
  private flicker!: THREE.PointLight;
  private neon: THREE.MeshBasicMaterial[] = [];
  private dust!: THREE.Points;
  private t = 0;

  constructor(scene: THREE.Scene, footprintPath: [number, number][], private mobile: boolean) {
    scene.add(this.group);
    scene.background = new THREE.Color(0x05070d);
    scene.fog = new THREE.FogExp2(0x070a12, 0.022);
    this.buildFloors();
    this.buildWalls();
    this.buildFurniture();
    this.buildDecor();
    this.buildLights();
    this.buildFootprints(footprintPath);
    this.buildDust();
  }

  // ---------------------------------------------------------------- floors
  private floor(x0: number, x1: number, z0: number, z1: number, mat: THREE.Material) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
    m.receiveShadow = true;
    this.group.add(m);
  }

  private buildFloors() {
    const marble = canvasTexture(256, 256, (c) => {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        c.fillStyle = (i + j) % 2 ? '#1b1e26' : '#2a2c33';
        c.fillRect(i * 64, j * 64, 64, 64);
      }
      c.strokeStyle = 'rgba(200,170,110,0.25)'; c.lineWidth = 2;
      for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, 256); c.moveTo(0, i * 64); c.lineTo(256, i * 64); c.stroke(); }
    }, [6, 2.5]);
    const carpet = canvasTexture(128, 128, (c) => {
      c.fillStyle = '#3a1218'; c.fillRect(0, 0, 128, 128);
      c.strokeStyle = '#5c2027'; c.lineWidth = 3;
      for (let i = -128; i < 256; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 128, 128); c.moveTo(i + 128, 0); c.lineTo(i, 128); c.stroke(); }
      c.fillStyle = '#b08a4a'; c.fillRect(0, 0, 128, 4); c.fillRect(0, 124, 128, 4);
    }, [12, 2]);
    const roomCarpet = canvasTexture(128, 128, (c) => {
      c.fillStyle = '#18232c'; c.fillRect(0, 0, 128, 128);
      c.fillStyle = '#1f2d38';
      for (let x = 0; x < 128; x += 16) for (let y = 0; y < 128; y += 16) if ((x + y) % 32 === 0) c.fillRect(x + 4, y + 4, 8, 8);
    }, [8, 5]);
    const wood = canvasTexture(128, 128, (c) => {
      for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#2c1e16' : '#33231a'; c.fillRect(0, i * 16, 128, 16); }
      c.strokeStyle = '#1a110c'; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo((i * 37) % 128, i * 16); c.lineTo((i * 37) % 128, i * 16 + 16); c.stroke(); }
    }, [4, 5]);
    this.floor(-12, 12, 4, 14, std(0xffffff, { map: marble, roughness: 0.35, metalness: 0.2, flatShading: false }));
    this.floor(-12, 12, -4, 4, std(0xffffff, { map: carpet, roughness: 0.95, flatShading: false }));
    this.floor(-12, 4, -14, -4, std(0xffffff, { map: roomCarpet, roughness: 0.95, flatShading: false }));
    this.floor(4, 12, -14, -4, std(0xffffff, { map: wood, roughness: 0.6, flatShading: false }));
  }

  // ---------------------------------------------------------------- walls
  private wallMat = std(0x3d4560, { roughness: 0.9 });
  private trimMat = std(0x8a6a3a, { metalness: 0.5, roughness: 0.4 });

  private wall(x0: number, z0: number, x1: number, z1: number) {
    const horiz = z0 === z1;
    const len = horiz ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const w = horiz ? len + WALL_T : WALL_T, d = horiz ? WALL_T : len + WALL_T;
    const mat = this.wallMat.clone();
    mat.transparent = true;
    const m = box(w, WALL_H, d, mat, cx, WALL_H / 2, cz);
    m.userData.fade = 1;
    this.group.add(m);
    this.walls.push(m);
    const trim = box(w + 0.02, 0.12, d + 0.02, this.trimMat, cx, WALL_H - 0.06, cz, false);
    trim.receiveShadow = false;
    m.add(trim); trim.position.set(0, WALL_H / 2 - 0.06, 0);
    const base = box(w + 0.02, 0.18, d + 0.02, std(0x14161c), 0, -WALL_H / 2 + 0.09, 0, false);
    m.add(base);
    this.collision.addBox(cx, cz, w, d);
  }

  /** Wall line with door gaps: gaps are [from,to] along the wall axis */
  private wallLine(fixed: number, from: number, to: number, horizontal: boolean, gaps: [number, number][] = []) {
    let cur = from;
    const segs: [number, number][] = [];
    for (const [a, b] of gaps) { segs.push([cur, a]); cur = b; }
    segs.push([cur, to]);
    for (const [a, b] of segs) {
      if (b - a < 0.01) continue;
      if (horizontal) this.wall(a, fixed, b, fixed); else this.wall(fixed, a, fixed, b);
    }
    for (const [a, b] of gaps) {
      // door frame posts
      for (const p of [a, b]) {
        const post = horizontal ? box(0.18, WALL_H, 0.4, this.trimMat, p, WALL_H / 2, fixed) : box(0.4, WALL_H, 0.18, this.trimMat, fixed, WALL_H / 2, p);
        this.group.add(post);
      }
      const lintel = horizontal ? box(b - a, 0.5, WALL_T, this.wallMat, (a + b) / 2, WALL_H - 0.25, fixed) : box(WALL_T, 0.5, b - a, this.wallMat, fixed, WALL_H - 0.25, (a + b) / 2);
      this.group.add(lintel);
    }
  }

  private buildWalls() {
    this.wallLine(-14, -12, 12, true);          // north
    this.wallLine(14, -12, 12, true);           // south
    this.wallLine(-12, -14, 14, false);         // west
    this.wallLine(12, -14, 14, false);          // east
    this.wallLine(-4, -12, 4, true, [[-3, -1]]); // 317 door
    this.wallLine(-4, 4, 12, true, [[7, 9]]);   // lounge door
    this.wallLine(4, -14, -4, false);           // 317 | lounge
    this.wallLine(4, -12, -4, true);            // lobby west partition
    this.wallLine(4, 4, 12, true);              // lobby east partition
  }

  // ---------------------------------------------------------------- furniture
  private solid(obj: THREE.Object3D, cx: number, cz: number, w: number, d: number) {
    this.group.add(obj);
    this.collision.addBox(cx, cz, w, d);
  }

  private buildFurniture() {
    const darkWood = std(0x2a1a12), lightWood = std(0x5a3a24), fabric = std(0x1f2b3d), red = std(0x6a1820), cream = std(0xd8cfbf), brass = std(0xb08a4a, { metalness: 0.7, roughness: 0.3 });

    // ---- Room 317
    const bed = new THREE.Group();
    bed.add(box(2.6, 0.45, 3.6, darkWood, 0, 0.22, 0));
    bed.add(box(2.5, 0.25, 3.3, cream, 0, 0.55, 0.1));
    const duvet = box(2.55, 0.12, 2.0, std(0x24364f), 0, 0.72, 0.7); duvet.rotation.x = 0.03; bed.add(duvet);
    bed.add(box(0.9, 0.18, 0.5, cream, -0.6, 0.78, -1.3), box(0.9, 0.18, 0.5, cream, 0.6, 0.78, -1.3));
    bed.add(box(2.8, 1.5, 0.15, darkWood, 0, 0.75, -1.85));
    bed.position.set(-6, 0, -11.6);
    this.solid(bed, -6, -11.6, 2.8, 3.8);
    // nightstands
    const ns = new THREE.Group(); ns.add(box(0.7, 0.6, 0.6, darkWood, 0, 0.3, 0)); ns.position.set(-3.3, 0, -13);
    this.solid(ns, -3.3, -13, 0.7, 0.6);
    const lamp = new THREE.Group();
    lamp.add(box(0.06, 0.4, 0.06, brass, 0, 0.8, 0));
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.25, 8, 1, true), std(0xffd9a0, { emissive: 0xffa040, emissiveIntensity: 0.8, side: THREE.DoubleSide }));
    shade.position.y = 1.05; lamp.add(shade); lamp.position.set(-3.1, 0, -13.2); this.group.add(lamp);
    const ns2 = ns.clone(); ns2.position.set(-8.7, 0, -13); this.solid(ns2, -8.7, -13, 0.7, 0.6);
    // writing desk + chair
    const desk = new THREE.Group();
    desk.add(box(1.9, 0.08, 0.9, lightWood, 0, 0.8, 0));
    for (const [x, z] of [[-0.85, -0.38], [0.85, -0.38], [-0.85, 0.38], [0.85, 0.38]]) desk.add(box(0.08, 0.8, 0.08, lightWood, x, 0.4, z));
    desk.add(box(0.3, 0.03, 0.3, brass, 0.6, 0.85, -0.2));
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.1, 8), std(0xd9b26b, { transparent: true, opacity: 0.6, metalness: 0.2, roughness: 0.1 }));
    glass.position.set(0.55, 0.9, 0.1); desk.add(glass);
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.32, 8), std(0x5a3010, { transparent: true, opacity: 0.8 }));
    bottle.position.set(0.75, 1.0, -0.15); desk.add(bottle);
    desk.position.set(-10.2, 0, -12.8);
    this.solid(desk, -10.2, -12.8, 1.9, 0.9);
    const chair = new THREE.Group();
    chair.add(box(0.5, 0.08, 0.5, red, 0, 0.48, 0), box(0.5, 0.6, 0.08, red, 0, 0.8, 0.22));
    for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) chair.add(box(0.05, 0.48, 0.05, darkWood, x, 0.24, z));
    chair.position.set(-10.0, 0, -11.8); chair.rotation.y = 0.4;
    this.solid(chair, -10.0, -11.8, 0.55, 0.55);
    // armchair
    const arm = new THREE.Group();
    arm.add(box(1.0, 0.45, 1.0, fabric, 0, 0.22, 0), box(1.0, 0.7, 0.2, fabric, 0, 0.7, -0.4), box(0.18, 0.35, 1.0, fabric, -0.45, 0.6, 0), box(0.18, 0.35, 1.0, fabric, 0.45, 0.6, 0));
    arm.position.set(-10.6, 0, -7.0); arm.rotation.y = 1.2;
    this.solid(arm, -10.6, -7.0, 1.1, 1.1);
    // pill bottle (staging)
    const pills = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 8), std(0xd27a1a, { transparent: true, opacity: 0.85 }));
    pills.position.set(-3.45, 0.67, -12.85); this.group.add(pills);

    // ---- Lounge
    const sofa = new THREE.Group();
    sofa.add(box(3.0, 0.45, 1.0, red, 0, 0.22, 0), box(3.0, 0.7, 0.25, red, 0, 0.65, -0.4), box(0.25, 0.6, 1.0, red, -1.4, 0.45, 0), box(0.25, 0.6, 1.0, red, 1.4, 0.45, 0));
    sofa.position.set(6.6, 0, -13.1);
    this.solid(sofa, 6.6, -13.1, 3.0, 1.0);
    const table = new THREE.Group();
    table.add(box(1.4, 0.06, 0.7, std(0x111318, { metalness: 0.6, roughness: 0.2 }), 0, 0.42, 0), box(0.1, 0.42, 0.1, brass, 0, 0.21, 0));
    table.position.set(6.6, 0, -11.5);
    this.solid(table, 6.6, -11.5, 1.4, 0.7);
    const tumbler = glass.clone(); tumbler.position.set(6.9, 0.5, -11.4); this.group.add(tumbler);
    const bar = new THREE.Group();
    bar.add(box(0.9, 1.1, 3.6, darkWood, 0, 0.55, 0), box(1.0, 0.06, 3.7, brass, 0, 1.12, 0));
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 6), std([0x4a8a6a, 0x8a3a2a, 0xc9a14a, 0x3a5a8a, 0x6a2a6a][i], { transparent: true, opacity: 0.85, emissive: 0x111111 }));
      b.position.set(11.6, 1.6, -12.8 + i * 0.4); this.group.add(b);
    }
    this.group.add(box(0.3, 0.06, 2.4, darkWood, 11.65, 1.42, -12.0));
    bar.position.set(10.9, 0, -11.2);
    this.solid(bar, 10.9, -11.2, 0.9, 3.6);
    const armL = arm.clone(); armL.position.set(5.0, 0, -8.6); armL.rotation.y = 2.2; this.solid(armL, 5.0, -8.6, 1.1, 1.1);

    // ---- Hallway
    const ice = new THREE.Group();
    ice.add(box(0.8, 1.7, 0.9, std(0x8e9aa8, { metalness: 0.7, roughness: 0.35 }), 0, 0.85, 0));
    ice.add(box(0.5, 0.2, 0.02, new THREE.MeshBasicMaterial({ color: 0x57d0ff }), 0.0, 1.4, 0.46, false));
    ice.position.set(-11.4, 0, 1.6); ice.rotation.y = Math.PI / 2;
    this.solid(ice, -11.4, 1.6, 0.9, 0.8);
    const bench = new THREE.Group(); bench.add(box(2.0, 0.45, 0.6, fabric, 0, 0.23, 0)); bench.position.set(0, 0, 3.4);
    // lobby partitions sit at z=4; bench is in the hallway opening — keep it off the path
    bench.position.set(-8, 0, 3.4); this.solid(bench, -8, 3.4, 2.0, 0.6);
    for (const [x, z] of [[-11.3, -3.3], [3.4, -3.3], [11.3, 3.3], [-11.3, 4.6], [11.3, 13.3], [-11.3, 13.3], [4.6, -13.3]]) {
      const plant = new THREE.Group();
      plant.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.55, 8), std(0x2a2a2e)));
      plant.children[0].position.y = 0.27;
      const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), std(0x1f4a35));
      leaves.position.y = 1.0; leaves.scale.set(1, 1.3, 1); plant.add(leaves);
      plant.traverse((o) => (o.castShadow = true));
      plant.position.set(x, 0, z);
      this.solid(plant, x, z, 0.6, 0.6);
    }
    // elevator (east wall)
    const elev = new THREE.Group();
    elev.add(box(0.12, 2.5, 2.2, std(0x9aa3ad, { metalness: 0.85, roughness: 0.25 }), 0, 1.25, 0));
    elev.add(box(0.14, 2.5, 0.02, std(0x222222), 0, 1.25, 0));
    elev.add(box(0.14, 0.3, 2.4, this.trimMat, 0, 2.6, 0));
    const ind = this.neonMat(0xff9b3d);
    elev.add(box(0.05, 0.18, 0.5, ind, -0.06, 2.6, 0, false));
    elev.position.set(11.8, 0, 0);
    this.group.add(elev);

    // ---- Lobby
    const counter = new THREE.Group();
    counter.add(box(6.0, 1.05, 1.0, darkWood, 0, 0.52, 0));
    counter.add(box(6.2, 0.07, 1.15, std(0x1c1c22, { metalness: 0.5, roughness: 0.2 }), 0, 1.07, 0));
    counter.add(box(6.0, 0.06, 0.04, this.neonMat(0xe8b25a), 0, 0.15, 0.52, false));
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), brass); bell.position.set(1.4, 1.11, 0.2); counter.add(bell);
    const pc = box(0.6, 0.4, 0.05, std(0x111111), 1.8, 1.35, 0.1); pc.rotation.y = Math.PI; counter.add(pc);
    counter.position.set(0, 0, 9.6);
    this.solid(counter, 0, 9.6, 6.2, 1.15);
    // key cabinet behind reception
    const cab = new THREE.Group();
    cab.add(box(3.0, 1.6, 0.25, lightWood, 0, 1.6, 0));
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) cab.add(box(0.12, 0.18, 0.04, brass, -1.2 + i * 0.48, 1.15 + j * 0.42, 0.14, false));
    cab.position.set(0, 0, 13.7); this.group.add(cab);
    // sofas
    const ls = sofa.clone(); ls.position.set(-8.2, 0, 8.0); ls.rotation.y = Math.PI / 2; this.solid(ls, -8.2, 8.0, 1.0, 3.0);
    const lt = table.clone(); lt.position.set(-6.6, 0, 8.0); lt.rotation.y = Math.PI / 2; this.solid(lt, -6.6, 8.0, 0.7, 1.4);
    // security desk
    const sd = new THREE.Group();
    sd.add(box(1.6, 0.9, 0.9, std(0x1b1e26, { metalness: 0.5 }), 0, 0.45, 0));
    sd.add(box(1.7, 0.05, 1.0, std(0x2a2e38, { metalness: 0.6, roughness: 0.3 }), 0, 0.92, 0));
    sd.position.set(9.4, 0, 11.6);
    this.solid(sd, 9.4, 11.6, 1.7, 1.0);
    for (let i = 0; i < 3; i++) {
      const mon = box(0.55, 0.35, 0.04, new THREE.MeshBasicMaterial({ color: [0x123a48, 0x0f2e36, 0x15404a][i] }), 8.8 + i * 0.6, 1.9, 13.75, false);
      this.group.add(mon);
    }
  }

  private neonMat(color: number) {
    const m = new THREE.MeshBasicMaterial({ color });
    this.neon.push(m);
    return m;
  }

  // ---------------------------------------------------------------- decor
  private buildDecor() {
    // City windows (north wall) — subtle cyberpunk skyline
    const sky = canvasTexture(256, 128, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#0a1430'); g.addColorStop(1, '#1d1240');
      c.fillStyle = g; c.fillRect(0, 0, 256, 128);
      for (let i = 0; i < 26; i++) {
        const w = 8 + Math.random() * 18, h = 30 + Math.random() * 80, x = Math.random() * 256;
        c.fillStyle = '#070912'; c.fillRect(x, 128 - h, w, h);
        for (let k = 0; k < h / 6; k++) if (Math.random() < 0.35) {
          c.fillStyle = Math.random() < 0.15 ? '#ff4fa0' : Math.random() < 0.3 ? '#4fe3ff' : '#ffcf7a';
          c.fillRect(x + 2 + Math.random() * (w - 4), 128 - h + 3 + k * 6, 2, 2);
        }
      }
    });
    for (const x of [-9.5, -2.5, 8]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshBasicMaterial({ map: sky }));
      win.position.set(x, 1.7, -13.84);
      this.group.add(win);
      this.group.add(box(2.8, 0.1, 0.1, this.trimMat, x, 0.88, -13.8, false), box(2.8, 0.1, 0.1, this.trimMat, x, 2.52, -13.8, false), box(0.08, 1.6, 0.1, this.trimMat, x, 1.7, -13.8, false));
    }
    // Neon sign — MERIDIAN (original brand)
    const sign = canvasTexture(512, 128, (c) => {
      c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, 512, 128);
      c.font = 'italic 700 78px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = '#ff3d8b'; c.shadowBlur = 22; c.fillStyle = '#ff7ab0'; c.fillText('Meridian', 256, 64);
      c.shadowBlur = 6; c.fillStyle = '#ffe0ee'; c.fillText('Meridian', 256, 64);
    });
    const signMat = new THREE.MeshBasicMaterial({ map: sign, transparent: true, depthWrite: false });
    this.neon.push(signMat);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), signMat);
    s.position.set(-11.82, 2.2, 9.6); s.rotation.y = Math.PI / 2;
    this.group.add(s);
    // Room plate 317
    const plate = canvasTexture(128, 64, (c) => {
      c.fillStyle = '#b08a4a'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#1a1208';
      c.font = '700 40px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('317', 64, 34);
    });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshStandardMaterial({ map: plate, metalness: 0.6, roughness: 0.3 }));
    p.position.set(-3.5, 1.9, -3.82); this.group.add(p);
    const lp = canvasTexture(256, 64, (c) => {
      c.fillStyle = '#b08a4a'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#1a1208';
      c.font = '700 30px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('EXECUTIVE LOUNGE', 128, 34);
    });
    const lpm = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshStandardMaterial({ map: lp, metalness: 0.6, roughness: 0.3 }));
    lpm.position.set(8, 2.2, -3.82); this.group.add(lpm);
    // Police tape across part of the 317 doorway
    const tape = new THREE.MeshBasicMaterial({
      map: canvasTexture(256, 32, (c) => {
        c.fillStyle = '#f2c230'; c.fillRect(0, 0, 256, 32); c.fillStyle = '#111'; c.font = '700 18px sans-serif';
        c.fillText('CRIME SCENE · DO NOT CROSS ·', 6, 23);
      }), side: THREE.DoubleSide,
    });
    const t1 = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.14), tape);
    t1.position.set(-3.9, 1.2, -3.6); t1.rotation.set(0, 0, -0.35); this.group.add(t1);
    // Chalk outline where Victor was found
    const outline = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.2), new THREE.MeshBasicMaterial({
      transparent: true, depthWrite: false,
      map: canvasTexture(128, 200, (c) => {
        c.strokeStyle = 'rgba(235,235,235,0.85)'; c.lineWidth = 4; c.lineJoin = 'round';
        c.beginPath();
        c.arc(64, 30, 18, 0, Math.PI * 2);
        c.moveTo(50, 50); c.lineTo(20, 70); c.lineTo(12, 110); c.moveTo(78, 50); c.lineTo(110, 60); c.lineTo(118, 95);
        c.moveTo(50, 50); c.lineTo(46, 120); c.lineTo(34, 190); c.moveTo(78, 50); c.lineTo(84, 120); c.lineTo(98, 188);
        c.stroke();
      }),
    }));
    outline.rotation.x = -Math.PI / 2; outline.rotation.z = 0.5;
    outline.position.set(-8.9, 0.012, -9.0); this.group.add(outline);
    // Rugs
    const rug = (x: number, z: number, w: number, d: number, col: number) => {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std(col, { roughness: 1 }));
      r.rotation.x = -Math.PI / 2; r.position.set(x, 0.006, z); r.receiveShadow = true; this.group.add(r);
    };
    rug(-6, -8.0, 4.0, 2.4, 0x3a2c22);
    rug(7.2, -10.5, 4.2, 3.4, 0x2a1a20);
    rug(-7.4, 8, 3.2, 4.4, 0x22283a);
  }

  // ---------------------------------------------------------------- lights
  private point(color: number, intensity: number, dist: number, x: number, y: number, z: number) {
    const l = new THREE.PointLight(color, intensity * 2.2, dist * 1.3, 1.2);
    l.position.set(x, y, z);
    this.group.add(l);
    return l;
  }

  private buildLights() {
    this.hemi = new THREE.HemisphereLight(0x6680b8, 0x1a1a26, 1.5);
    this.group.add(this.hemi);
    this.group.add(new THREE.AmbientLight(0x2a3450, 0.9));
    const moon = new THREE.DirectionalLight(0x9fb4ff, 1.6);
    moon.position.set(-9, 18, -6);
    moon.target.position.set(0, 0, 0);
    moon.castShadow = true;
    const sz = this.mobile ? 1024 : 2048;
    moon.shadow.mapSize.set(sz, sz);
    const sc = moon.shadow.camera;
    sc.left = -17; sc.right = 17; sc.top = 17; sc.bottom = -17; sc.near = 1; sc.far = 50;
    moon.shadow.bias = -0.002;
    moon.shadow.normalBias = 0.06;
    this.group.add(moon, moon.target);

    this.point(0xffb35c, 9, 14, 0, 2.8, 9);       // lobby chandelier
    this.point(0xff3d8b, 4, 7, -10.8, 2.2, 9.6);  // neon pink
    this.point(0x4fd8ff, 4, 9, 9.4, 2.0, 12.4);   // security monitors
    this.flicker = this.point(0xffc27a, 6, 10, -5, 2.7, 0); // hallway (flickers)
    this.point(0xffc27a, 6, 10, 5, 2.7, 0);       // hallway east
    this.point(0x31e1ff, 3, 6, 11, 2.4, 0);       // elevator neon
    this.point(0xffa040, 6, 8, -3.2, 1.3, -12.6); // 317 bedside lamp
    this.point(0xffcf8a, 4, 9, -8, 2.6, -8);      // 317 ceiling (dim)
    this.point(0xff9b4a, 7, 10, 8, 2.6, -10);     // lounge
  }

  // ---------------------------------------------------------------- clues
  private buildFootprints(path: [number, number][]) {
    const geo = new THREE.PlaneGeometry(0.11, 0.24);
    for (let i = 0; i < path.length; i++) {
      const [x, z] = path[i];
      const [nx, nz] = path[Math.min(i + 1, path.length - 1)];
      const ang = Math.atan2(nx - x, nz - z);
      for (const side of [-1, 1]) {
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x4fe3ff, transparent: true, opacity: 0, depthWrite: false }));
        m.rotation.x = -Math.PI / 2; m.rotation.z = -ang;
        m.position.set(x + Math.cos(ang) * 0.13 * side, 0.02, z - Math.sin(ang) * 0.13 * side + (side > 0 ? 0.25 : 0));
        m.visible = false;
        this.group.add(m);
        this.footprints.push(m);
      }
    }
  }

  private buildDust() {
    const n = this.mobile ? 160 : 380;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 24; pos[i * 3 + 1] = Math.random() * 3; pos[i * 3 + 2] = (Math.random() - 0.5) * 28; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffe2b0, size: 0.035, transparent: true, opacity: 0.45, depthWrite: false }));
    this.group.add(this.dust);
  }

  update(dt: number, vision: number) {
    this.t += dt;
    // hallway flicker
    const f = Math.sin(this.t * 23) * Math.sin(this.t * 7.3) > 0.82 ? 0.15 : 1;
    this.flicker.intensity = 13 * f * (Math.random() < 0.01 ? 0.3 : 1);
    // neon breathe
    const pulse = 0.85 + Math.sin(this.t * 2.4) * 0.15;
    for (const m of this.neon) m.opacity = pulse;
    // dust drift
    const p = this.dust.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) + dt * 0.05;
      if (y > 3) y = 0;
      p.setY(i, y);
      p.setX(i, p.getX(i) + Math.sin(this.t * 0.3 + i) * dt * 0.02);
    }
    p.needsUpdate = true;
    // detective vision: dim world, reveal footprints
    this.hemi.intensity = 1.5 - vision * 0.8;
    for (const fp of this.footprints) {
      const mat = fp.material as THREE.MeshBasicMaterial;
      mat.opacity = vision * (0.35 + Math.sin(this.t * 4 + fp.position.x) * 0.15);
      fp.visible = vision > 0.01;
    }
  }
}
