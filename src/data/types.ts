// Shared, case-agnostic data types. New cases (case002.ts, case003.ts…) only
// need to export a CaseDefinition — the engine reads everything from here.

export type Importance = 'low' | 'medium' | 'high';

export interface Evidence {
  id: string;
  name: string;
  description: string;
  location: string;
  importance: Importance;
  discovered: boolean;
  relatedCharacters: string[];
  relatedEvidence: string[];
}

export interface EvidenceDef extends Omit<Evidence, 'discovered'> {
  /** Short quote shown in the "EVIDENCE FOUND" card */
  quote: string;
  /** World placement */
  position: [number, number, number];
  /** Prop model key built by the world (see world/props.ts) */
  prop: string;
  kind: 'Evidence' | 'Book' | 'Phone' | 'Computer' | 'Container' | 'EnvironmentalObject';
}

export interface Requirement {
  evidence?: string[];
  flags?: string[];
  notFlags?: string[];
  minSuspicion?: number;
}

export interface DialogueTopic {
  id: string;
  label: string;
  requires?: Requirement;
  lines: string[];
  setFlags?: string[];
  /** Change to this NPC's suspicion (0-100) */
  suspicion?: number;
  /** Counts toward the Investigation score */
  key?: boolean;
}

export interface Greeting {
  requires?: Requirement;
  text: string;
}

export interface SuspectDef {
  id: string;
  name: string;
  role: string;
  bio: string;
  position: [number, number, number];
  facing: number;
  palette: { coat: number; accent: number; skin: number; hair: number };
  baseSuspicion: number;
  /** Private knowledge — not shown to the player; reserved for future LLM prompts */
  persona: { personality: string; secrets: string[]; lies: string[] };
  greetings: Greeting[];
  topics: DialogueTopic[];
}

export interface Contradiction {
  id: string;
  title: string;
  detail: string;
  requires: Requirement;
  between: string[];
}

export interface AIInsight {
  requires?: Requirement;
  /** if any of these are met, this insight is suppressed (newer data supersedes it) */
  supersededBy?: Requirement;
  text: string;
  confidence: number;
  /** Deliberately wrong analysis — the hallucination mechanic */
  hallucination?: boolean;
}

export interface Objective {
  until: Requirement;
  text: string;
}

export interface CaseDefinition {
  id: string;
  number: string;
  title: string;
  tagline: string;
  intro: string[];
  victim: { name: string; bio: string };
  world: string;
  playerStart: [number, number, number];
  evidence: EvidenceDef[];
  suspects: SuspectDef[];
  contradictions: Contradiction[];
  objectives: Objective[];
  ai: {
    summarize: AIInsight[];
    contradictions: AIInsight[];
    suggest: AIInsight[];
    relationships: AIInsight[];
  };
  deduction: {
    who: string[];
    why: string[];
    how: string[];
  };
  solution: { who: string; why: string; how: string; explanation: string[] };
  footprints: [number, number][];
}
