import type { CaseState } from './CaseState';

export type Outcome = 'Perfect Case' | 'Case Solved' | 'Wrong Suspect' | 'Insufficient Evidence';

export interface CaseResult {
  outcome: Outcome;
  total: number;
  evidence: number;
  deduction: number;
  investigation: number;
  aiReliance: number;
  rank: string;
  correct: { who: boolean; why: boolean; how: boolean };
}

export function scoreCase(state: CaseState, answer: { who: string; why: string; how: string }): CaseResult {
  const sol = state.def.solution;
  const correct = { who: answer.who === sol.who, why: answer.why === sol.why, how: answer.how === sol.how };

  const evidence = Math.round((state.discovered.size / state.def.evidence.length) * 100);
  const deduction = (correct.who ? 50 : 0) + (correct.why ? 25 : 0) + (correct.how ? 25 : 0);
  const talk = state.keyTopicsDone / Math.max(1, state.keyTopicsTotal);
  const con = state.contradictions.length / Math.max(1, state.def.contradictions.length);
  const investigation = Math.round((talk * 0.5 + con * 0.5) * 100);
  // Lower is better: each AI query adds reliance. A few checks are healthy.
  const aiReliance = Math.min(100, Math.max(0, (state.aiQueries - 2) * 9));

  let total = Math.round(deduction * 0.45 + evidence * 0.25 + investigation * 0.2 + (100 - aiReliance) * 0.1);

  let outcome: Outcome;
  if (!correct.who) { outcome = 'Wrong Suspect'; total = Math.min(total, 45); }
  else if (evidence < 50 || state.contradictions.length < 2) { outcome = 'Insufficient Evidence'; total = Math.min(total, 60); }
  else if (deduction === 100 && total >= 90) outcome = 'Perfect Case';
  else outcome = 'Case Solved';

  const rank =
    total >= 90 ? 'MASTER DETECTIVE' :
    total >= 75 ? 'SENIOR INSPECTOR' :
    total >= 55 ? 'DETECTIVE' :
    total >= 35 ? 'JUNIOR INVESTIGATOR' : 'ROOKIE';

  return { outcome, total, evidence, deduction, investigation, aiReliance, rank, correct };
}
