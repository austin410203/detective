import type { Evidence, EvidenceDef } from '../data/types';
import type { CaseState } from '../investigation/CaseState';

export class EvidenceManager {
  constructor(private state: CaseState) {}

  get defs(): EvidenceDef[] { return this.state.def.evidence; }

  get(id: string): EvidenceDef | undefined { return this.defs.find((e) => e.id === id); }

  list(): Evidence[] {
    return this.defs.map((d) => ({
      id: d.id, name: d.name, description: d.description, location: d.location,
      importance: d.importance, relatedCharacters: d.relatedCharacters,
      relatedEvidence: d.relatedEvidence, discovered: this.state.discovered.has(d.id),
    }));
  }

  isDiscovered(id: string) { return this.state.discovered.has(id); }

  /** Returns true the first time a piece of evidence is collected. */
  discover(id: string): boolean {
    if (this.state.discovered.has(id)) return false;
    this.state.discovered.add(id);
    this.state.emit();
    return true;
  }

  index(id: string) { return this.defs.findIndex((e) => e.id === id) + 1; }
}
