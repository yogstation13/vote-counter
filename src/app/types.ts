export interface ElectionData<T = Ballot> {
  candidates: string[];
  ballots: T[];
}

export interface Ballot {
  votes: string[];
  last_candidate?: string;
}

export interface ValidatedBallot {
  parseError?: string;
  votes: (string | undefined)[];
}

export enum EliminationReason {
  Lowest,
  Logic,
  TieBreak,
}

export interface IRVElections {
  rounds: IRVRound[][];
  candidates: string[];
  elected_candidates: string[];
  ballots: Ballot[];
}

export interface IRVRound {
  candidates_start: string[];
  candidates_remaining: string[];
  tallies: Record<string, number>;
  potential_eliminations: string[];
  lowest_votes: number;
  transfers: Map<string, Map<string, number>>;
  eliminated: string[];
  reason: EliminationReason;
}
