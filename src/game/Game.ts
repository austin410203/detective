import * as THREE from 'three';
import { DetectiveAI } from '../ai/DetectiveAI';
import { AudioManager } from '../audio/AudioManager';
import { CameraRig } from '../camera/CameraRig';
import type { CaseDefinition } from '../data/types';
import { EvidenceManager } from '../evidence/EvidenceManager';
import { InteractionSystem, type Interactable } from '../interaction/Interaction';
import { CaseState } from '../investigation/CaseState';
import { DetectiveVision } from '../investigation/DetectiveVision';
import { scoreCase } from '../investigation/Scoring';
import { DialogueManager } from '../npc/DialogueManager';
import { NPC } from '../npc/NPC';
import { Player } from '../player/Player';
import { UI } from '../ui/UI';
import { HotelWorld } from '../world/HotelWorld';
import { evidenceProp } from '../world/props';
import { Input } from './Input';

export class Game {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  cam: CameraRig;
  input = new Input();
  audio = new AudioManager();
  state: CaseState;
  evidence: EvidenceManager;
  dialogue: DialogueManager;
  ai: DetectiveAI;
  ui: UI;
  world: HotelWorld;
  player: Player;
  npcs: NPC[] = [];
  interaction: InteractionSystem;
  vision = new DetectiveVision();
  private clock = new THREE.Timer();
  private running = false;
  private talkingTo: NPC | null = null;
  private busy = false;
  private pixelRatio: number;
  private frameAcc = 0;
  private frameN = 0;
  private mobile: boolean;

  constructor(canvas: HTMLCanvasElement, private def: CaseDefinition) {
    this.mobile = this.input.isTouch || Math.min(innerWidth, innerHeight) < 600;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.mobile, powerPreference: 'high-performance' });
    this.pixelRatio = Math.min(devicePixelRatio, this.mobile ? 1.5 : 2);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.cam = new CameraRig(innerWidth / innerHeight);
    this.state = new CaseState(def);
    this.evidence = new EvidenceManager(this.state);
    this.dialogue = new DialogueManager(this.state);
    this.ai = new DetectiveAI(this.state);
    this.ui = new UI(this.state, this.evidence, this.dialogue, this.ai, this.audio);

    this.world = new HotelWorld(this.scene, def.footprints, this.mobile);
    this.player = new Player(def.playerStart);
    this.player.onStep = (run) => this.audio.footstep(run);
    this.scene.add(this.player.object);
    this.interaction = new InteractionSystem(this.scene);

    this.buildNPCs();
    this.buildInteractables();
    this.bindUI();

    addEventListener('resize', () => this.resize());
    this.resize();
    this.cam.snap(this.player.position);
    this.loop();
  }

  // ---------------------------------------------------------------- setup
  private buildNPCs() {
    for (const s of this.def.suspects) {
      const n = new NPC(s);
      this.scene.add(n.object);
      this.npcs.push(n);
      this.world.collision.circles.push(n.collider);
      this.interaction.add({
        id: s.id, kind: 'NPC', label: s.name, radius: 2.1,
        position: n.position.clone().setY(1.2), object: n.rig.object,
        important: () => false, fresh: () => false,
        onInteract: () => this.talk(n),
      });
    }
  }

  private buildInteractables() {
    for (const e of this.def.evidence) {
      const prop = evidenceProp(e.prop);
      prop.position.set(...e.position);
      this.scene.add(prop);
      const it: Interactable = {
        id: e.id, kind: e.kind, label: e.name, radius: 1.7,
        position: new THREE.Vector3(...e.position), object: prop,
        important: () => true,
        fresh: () => !this.evidence.isDiscovered(e.id),
        onInteract: () => this.investigate(e.id),
      };
      this.interaction.add(it, true);
    }
    // Environmental: elevator (Door)
    const elev = new THREE.Group();
    elev.position.set(11.6, 1.2, 0);
    this.interaction.add({
      id: 'elevator', kind: 'Door', label: 'Elevator', radius: 2.0,
      position: elev.position.clone(), object: elev,
      important: () => false, fresh: () => false,
      onInteract: () => { this.audio.door(); this.ui.toast('Elevator locked down by HPD until the scene is cleared.'); },
    });
    // Environmental: pill bottle (red herring flavour)
    const pills = new THREE.Group(); pills.position.set(-3.45, 0.7, -12.4);
    this.interaction.add({
      id: 'pills', kind: 'EnvironmentalObject', label: 'Pill bottle', radius: 1.3,
      position: pills.position.clone(), object: pills,
      important: () => true, fresh: () => false,
      onInteract: () => { this.player.pose('investigate', 0.9); this.audio.investigate(); this.ui.toast('Sleeping pills — full bottle, seal unbroken. Placed, not taken.', false, 3800); this.state.flags.add('pills_seen'); this.state.emit(); },
    });
  }

  private bindUI() {
    this.ui.onDialogueClose = () => {
      if (this.talkingTo) this.talkingTo.talking = false;
      this.talkingTo = null;
      this.player.hold(null);
      this.cam.zoomTo(null);
    };
    this.ui.onDeduce = (a) => {
      const r = scoreCase(this.state, a);
      this.state.deductions.push(a);
      this.state.score = r.total;
      this.state.emit();
      this.audio.result(r.outcome === 'Perfect Case' || r.outcome === 'Case Solved');
      this.ui.showResult(r, a);
    };
    this.ui.onReplay = () => { this.state.clearSave(); location.reload(); };

    const $ = (id: string) => document.getElementById(id)!;
    this.input.bindJoystick($('joy-zone'), $('joy-base'), $('joy-knob'));
    $('t-act').addEventListener('click', () => this.input.press('e'));
    $('t-vision').addEventListener('click', () => this.input.press('q'));
    const hold = (id: string, dir: number) => {
      const el = $(id);
      el.addEventListener('pointerdown', () => (this.input.rotate = dir));
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, () => (this.input.rotate = 0));
    };
    hold('t-rot-l', -1); hold('t-rot-r', 1);
  }

  /** Called from the title screen */
  begin(load: boolean) {
    if (load) this.state.load(); else { this.state.clearSave(); this.state.reset(); }
    this.audio.start();
    this.running = true;
    this.ui.showHUD();
    this.ui.toast(this.mobile ? 'Drag left side to move · tap INVESTIGATE near clues' : 'WASD to move · E to investigate · Q for Detective Vision', false, 4200);
  }

  private resize() {
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.cam.resize(innerWidth, innerHeight);
  }

  // ---------------------------------------------------------------- actions
  private async investigate(id: string) {
    if (this.busy) return;
    this.busy = true;
    const it = this.interaction.items.find((i) => i.id === id)!;
    this.player.face(it.position);
    this.player.pose('investigate', 1.1);
    this.audio.investigate();
    const contraBefore = this.state.contradictions.length;
    await new Promise((r) => setTimeout(r, 450));
    const isNew = this.evidence.discover(id);
    if (isNew) { this.audio.evidenceFound(); this.cam.bump(0.12); }
    await this.ui.showFound(this.evidence.get(id)!, isNew);
    this.busy = false;
    if (isNew) {
      this.ui.ping('btn-evidence');
      const cs = this.state.contradictions;
      if (cs.length > contraBefore) {
        this.ui.toast(`⚡ CONTRADICTION: ${cs[cs.length - 1].title}`, true, 3600);
        this.ui.ping('btn-board');
      }
      if (this.state.discovered.size === this.def.evidence.length) setTimeout(() => this.ui.toast('All evidence collected. Open the Case Board [B] to deduce.', false, 4000), 3800);
    }
  }

  private talk(n: NPC) {
    this.talkingTo = n;
    n.talking = true;
    this.player.face(n.position);
    this.player.hold('talk');
    this.cam.zoomTo(this.cam.camera.aspect < 1 ? 11 : 8);
    this.audio.dialogue();
    const contraBefore = this.state.contradictions.length;
    this.ui.openDialogue(n.def.id);
    const check = () => {
      if (this.state.contradictions.length > contraBefore) {
        const cs = this.state.contradictions;
        this.ui.toast(`⚡ CONTRADICTION: ${cs[cs.length - 1].title}`, true, 3600);
      }
    };
    const prev = this.ui.onDialogueClose;
    this.ui.onDialogueClose = () => { prev?.(); check(); this.ui.onDialogueClose = prev; };
  }

  // ---------------------------------------------------------------- input
  private handleKeys() {
    const inp = this.input, ui = this.ui;
    if (inp.hit('escape')) {
      if (ui.foundOpen) ui.closeFound();
      else if (ui.dialogueOpen) ui.closeDialogue();
      else { ui.closeModals(); ui.toggleAI(false); }
    }
    if (inp.hit('m')) ui.toggleMute();
    if (ui.foundOpen) { if (inp.hit('e', ' ', 'enter')) ui.closeFound(); return; }
    if (ui.dialogueOpen) {
      for (let n = 0; n <= 9; n++) if (inp.hit(String(n))) ui.dialogueKey(n);
      if (inp.hit('e', ' ', 'enter')) ui.skipTyping();
      return;
    }
    if (inp.hit('b')) ui.toggleModal('board');
    if (inp.hit('i', 'tab')) ui.toggleModal('evidence-panel');
    if (inp.hit('h', '?')) ui.toggleModal('help');
    if (inp.hit('t')) ui.toggleAI();
    if (ui.blocking) return;
    if (inp.hit('q')) {
      if (this.vision.trigger()) { this.audio.vision(); this.ui.toast('DETECTIVE VISION', false, 1200); }
      else this.audio.warn();
    }
    if (inp.hit('e', ' ', 'enter') && this.interaction.focused && !this.busy) this.interaction.focused.onInteract();
  }

  // ---------------------------------------------------------------- loop
  private loop = () => {
    requestAnimationFrame(this.loop);
    this.clock.update(); const dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.running) this.handleKeys();
    this.input.endFrame();

    const blocked = !this.running || this.ui.blocking || this.busy;
    this.input.enabled = !blocked;
    document.body.classList.toggle('blocked', this.running && this.ui.blocking);
    let rot = this.input.rotate;
    if (!blocked) { if (this.input.down('z')) rot -= 1; if (this.input.down('c')) rot += 1; }
    if (rot) this.cam.rotate(rot * dt * 1.8);

    this.vision.update(dt);
    const v = this.vision.intensity;
    this.player.update(dt, this.input.move(), this.cam.basis(), this.world.collision);
    for (const n of this.npcs) n.update(dt, this.player.position, v, this.state.suspicion[n.def.id]);
    this.world.update(dt, v);
    this.interaction.update(dt, this.player.position, this.player.rig.object.rotation.y, v, !blocked);

    const f = this.interaction.focused;
    this.ui.setPrompt(f && !blocked ? f.label : null, f?.kind === 'NPC' ? 'TALK' : f?.kind === 'Door' ? 'USE' : 'INVESTIGATE');
    this.ui.setVision(this.vision.meter, this.vision.active > 0, v);

    this.cam.update(dt, this.player.position, this.world.walls);
    this.renderer.render(this.scene, this.cam.camera);
    this.adaptQuality(dt);
  };

  /** Drop resolution if we can't hold ~35 FPS (mobile safety net) */
  private adaptQuality(dt: number) {
    this.frameAcc += dt; this.frameN++;
    if (this.frameAcc < 2) return;
    const avg = this.frameAcc / this.frameN;
    this.frameAcc = 0; this.frameN = 0;
    if (avg > 1 / 35 && this.pixelRatio > 0.9) {
      this.pixelRatio = Math.max(0.85, this.pixelRatio - 0.25);
      this.renderer.setPixelRatio(this.pixelRatio);
      this.resize();
    }
  }
}
