import type { CaseDefinition, Requirement } from '../data/types';

export interface SaveData {
  caseId: string;
  discoveredEvidence: string[];
  dialogueProgress: Record<string, string[]>;
  flags: string[];
  suspicion: Record<string, number>;
  deductions: { who: string; why: string; how: string }[];
  aiQueries: number;
  score: number;
}

type Listener = () => void;

/** Authoritative game state for one case. NPC dialogue / AI only read from it. */
export class CaseState {
  discovered = new Set<string>();
  flags = new Set<string>();
  suspicion: Record<string, number> = {};
  dialogueProgress: Record<string, Set<string>> = {};
  deductions: SaveData['deductions'] = [];
  aiQueries = 0;
  score = 0;
  private listeners: Listener[] = [];

  constructor(public def: CaseDefinition) {
    this.reset();
  }

  reset() {
    this.discovered.clear();
    this.flags.clear();
    this.deductions = [];
    this.aiQueries = 0;
    this.score = 0;
    this.suspicion = {};
    this.dialogueProgress = {};
    for (const s of this.def.suspects) {
      this.suspicion[s.id] = s.baseSuspicion;
      this.dialogueProgress[s.id] = new Set();
    }
  }

  onChange(fn: Listener) { this.listeners.push(fn); }
  emit() { this.save(); for (const l of this.listeners) l(); }

  meets(r?: Requirement): boolean {
    if (!r) return true;
    if (r.evidence && !r.evidence.every((e) => this.discovered.has(e))) return false;
    if (r.flags && !r.flags.every((f) => this.flags.has(f))) return false;
    if (r.notFlags && r.notFlags.some((f) => this.flags.has(f))) return false;
    return true;
  }

  meetsFor(npcId: string, r?: Requirement) {
    if (!this.meets(r)) return false;
    if (r?.minSuspicion != null && (this.suspicion[npcId] ?? 0) < r.minSuspicion) return false;
    return true;
  }

  get contradictions() {
    return this.def.contradictions.filter((c) => this.meets(c.requires));
  }

  get keyTopicsTotal() {
    return this.def.suspects.reduce((n, s) => n + s.topics.filter((t) => t.key).length, 0);
  }
  get keyTopicsDone() {
    let n = 0;
    for (const s of this.def.suspects)
      for (const t of s.topics) if (t.key && this.dialogueProgress[s.id].has(t.id)) n++;
    return n;
  }

  /** 0..100 overall investigation progress shown in the HUD */
  get progress() {
    const ev = this.discovered.size / this.def.evidence.length;
    const talk = this.keyTopicsDone / Math.max(1, this.keyTopicsTotal);
    const con = this.contradictions.length / Math.max(1, this.def.contradictions.length);
    return Math.round((ev * 0.5 + talk * 0.3 + con * 0.2) * 100);
  }

  get objective() {
    return this.def.objectives.find((o) => !this.meets(o.until))?.text ?? '';
  }

  // ---------- persistence (localStorage MVP) ----------
  private get key() { return `ai-detective:${this.def.id}`; }

  save() {
    const data: SaveData = {
      caseId: this.def.id,
      discoveredEvidence: [...this.discovered],
      dialogueProgress: Object.fromEntries(Object.entries(this.dialogueProgress).map(([k, v]) => [k, [...v]])),
      flags: [...this.flags],
      suspicion: this.suspicion,
      deductions: this.deductions,
      aiQueries: this.aiQueries,
      score: this.score,
    };
    try { localStorage.setItem(this.key, JSON.stringify(data)); } catch { /* storage unavailable */ }
  }

  hasSave(): boolean {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return false;
      const d = JSON.parse(raw) as SaveData;
      return d.discoveredEvidence.length > 0 || d.flags.length > 0;
    } catch { return false; }
  }

  load(): boolean {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return false;
      const d = JSON.parse(raw) as SaveData;
      if (d.caseId !== this.def.id) return false;
      this.reset();
      d.discoveredEvidence.forEach((e) => this.discovered.add(e));
      d.flags.forEach((f) => this.flags.add(f));
      Object.assign(this.suspicion, d.suspicion);
      for (const [k, v] of Object.entries(d.dialogueProgress)) this.dialogueProgress[k] = new Set(v);
      this.deductions = d.deductions ?? [];
      this.aiQueries = d.aiQueries ?? 0;
      this.score = d.score ?? 0;
      return true;
    } catch { return false; }
  }

  clearSave() { try { localStorage.removeItem(this.key); } catch { /* noop */ } }
}
