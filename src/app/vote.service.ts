import { Injectable } from "@angular/core";
import {
  BehaviorSubject,
  combineLatest,
  filter,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  toArray,
  zip,
} from "rxjs";
import { DrandService } from "./drand.service";
import { SettingsService } from "./settings.service";
import {
  ElectionData,
  EliminationReason,
  IRVElections,
  IRVRound,
  ValidatedBallot,
} from "./types";

type IRVCommonRoundProps = Omit<
  IRVRound,
  "eliminated" | "reason" | "candidates_remaining"
>;

@Injectable({
  providedIn: "root",
})
export class VoteService {
  private lastLoaded: string | null = null;

  preprocessingData$ =
    new BehaviorSubject<ElectionData<ValidatedBallot> | null>(null);
  data$: Observable<ElectionData | null> = this.preprocessingData$.pipe(
    map(x =>
      x === null
        ? x
        : {
            ballots: x.ballots
              .filter(x => x.parseError === undefined)
              .map(x => ({
                votes: x.votes as string[],
              })),
            candidates: x.candidates,
          },
    ),
    shareReplay(1),
  );
  sortedCandidates$ = combineLatest([
    this.data$,
    this.settingsService.timestamp$,
  ]).pipe(
    switchMap(([data, ts]) =>
      data === null || ts === null
        ? of(null)
        : zip(
            of(...data.candidates),
            this.drandService.getValues(ts, data.candidates.length),
          ).pipe(toArray()),
    ),
    map(x =>
      x === null
        ? null
        : x.sort((a, b) => a[1].localeCompare(b[1])).map(([x]) => x),
    ),
    shareReplay(1),
  );
  rounds$ = combineLatest([this.data$, this.settingsService.seats$]).pipe(
    map(([data, seats]) => [data, Math.min(seats, 20000)] as const),
    switchMap(([data, total_seats]) => {
      if (data === null) return of(null);

      const _ballots = data.ballots;
      const candidates = data.candidates;

      const result: IRVElections = {
        rounds: [],
        elected_candidates: [],
        candidates,
        ballots: _ballots,
      };

      const elected_candidates = result.elected_candidates;

      for (let seat = 0; seat < total_seats; seat++) {
        const ballots = structuredClone(_ballots);

        let remaining_candidates = candidates.filter(
          x => !elected_candidates.includes(x),
        );

        if (remaining_candidates.length === 0) break;

        const rounds: IRVRound[] = [];
        result.rounds.push(rounds);

        let transfer_tallies: IRVRound["transfers"] = new Map(
          remaining_candidates.map(x => [x, new Map()]),
        );
        for (;;) {
          // eslint-disable-next-line no-debugger
          if (rounds.length > 2000) debugger;

          const tallies: Record<string, number> = {};
          for (const map of transfer_tallies.values()) {
            for (const destination of remaining_candidates) {
              map.set(destination, 0);
            }
          }

          // eslint-disable-next-line no-inner-declarations
          function incrementTransfer(
            source: string | null,
            destination: string,
          ) {
            if (transfer_tallies === null) return;
            if (source === null) return;

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const sourceHolder = transfer_tallies.get(source)!;
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const count = sourceHolder.get(destination)!;
            sourceHolder.set(destination, count + 1);
          }

          for (const candidate of remaining_candidates) tallies[candidate] = 0;

          for (const ballot of ballots) {
            for (const vote of ballot.votes) {
              if (!remaining_candidates.includes(vote)) continue;

              incrementTransfer(ballot.last_candidate ?? null, vote);
              ballot.last_candidate = vote;
              tallies[vote]++;
              break;
            }
          }

          //We can eliminate all 0 votes, they'll never get past any of the elimination checks
          //We just wipe them as if they've always been eliminated
          const null_candidates = Object.entries(tallies)
            .filter(([, votes]) => votes === 0)
            .map(([candidate]) => candidate);
          remaining_candidates = remaining_candidates.filter(
            candidate => !null_candidates.includes(candidate),
          );
          for (const candidate of null_candidates) delete tallies[candidate];

          const lowest_vote_amount = Math.min(...Object.values(tallies));
          const lowest_vote = Object.entries(tallies)
            .filter(([, votes]) => votes === lowest_vote_amount)
            .map(([candidate]) => candidate);

          transfer_tallies = new Map();
          const partial_round: IRVCommonRoundProps = {
            tallies: tallies,
            candidates_start: remaining_candidates,
            potential_eliminations: lowest_vote,
            lowest_votes: lowest_vote_amount,
            transfers: transfer_tallies,
          };
          for (const candidate of remaining_candidates) {
            transfer_tallies.set(candidate, new Map());
          }

          if (remaining_candidates.length === 0) break;

          //EliminationReason.Win
          if (remaining_candidates.length === 1) {
            elected_candidates.push(remaining_candidates[0]);
            break;
          }

          //EliminationReason.Lowest
          if (lowest_vote.length === 1) {
            remaining_candidates = remaining_candidates.filter(
              x => x !== lowest_vote[0],
            );
            rounds.push({
              ...partial_round,
              reason: EliminationReason.Lowest,
              eliminated: lowest_vote,
              candidates_remaining: remaining_candidates,
            });
            continue;
          }

          //EliminationReason.Logic
          const second_lowest_vote_amount = Math.min(
            ...Object.values(tallies).filter(x => x !== lowest_vote_amount),
          );
          if (
            lowest_vote_amount * lowest_vote.length <
              second_lowest_vote_amount &&
            second_lowest_vote_amount !== Infinity
          ) {
            remaining_candidates = remaining_candidates.filter(
              x => !lowest_vote.includes(x),
            );
            rounds.push({
              ...partial_round,
              reason: EliminationReason.Logic,
              eliminated: lowest_vote,
              candidates_remaining: remaining_candidates,
            });
            continue;
          }

          //EliminationReason.TieBreak
          remaining_candidates = remaining_candidates.filter(
            x => x !== lowest_vote[0],
          );
          rounds.push({
            ...partial_round,
            reason: EliminationReason.TieBreak,
            eliminated: [lowest_vote[0]],
            candidates_remaining: remaining_candidates,
          });
        }
      }

      return of(result);
    }),
    shareReplay(1),
  );

  constructor(
    private drandService: DrandService,
    private settingsService: SettingsService,
  ) {
    this.settingsService.rawVotes$
      .pipe(
        filter((x): x is string => x !== null),
        filter(x => x !== this.lastLoaded),
      )
      .subscribe(x => this.load(x));
  }

  clear() {
    this.settingsService.rawVotes$.next(null);
    this.lastLoaded = null;
    this.preprocessingData$.next(null);
  }

  load(rawData: string): boolean {
    const lines = rawData.trim().split("\n");
    let headerLine = lines.shift();
    if (headerLine === undefined) return false;
    const splitter = headerLine.includes("\t") ? "\t" : ",";
    let headerSplitter = splitter;

    if (headerLine[0] === '"') {
      headerSplitter = '","';
      headerLine = headerLine.substring(1, headerLine.length - 1);
    }

    const candidates = headerLine
      .split(headerSplitter)
      .map(candidate =>
        candidate.replaceAll(/.+?(?:\[(.*)]|$)/g, (match, p1) => p1 ?? match),
      );

    //Duplicate check
    const candidateSet = new Set(candidates);
    if (candidates.length !== candidateSet.size) return false;

    //No ballots check
    if (lines.length === 0) return false;

    const ballots = new Array<ValidatedBallot>();
    lines.forEach(line => {
      const ballot = new Array<string | undefined>(candidates.length).fill(
        undefined,
      );
      //Yes this is one error per ballot max, no I don't care
      let parseError: string | undefined;
      const positions = line.split(splitter);

      positions.forEach((_position, idx) => {
        const position = parseInt(_position) - 1;
        if (Number.isNaN(position)) {
          parseError = `${_position} is not a valid number`;
          return;
        }
        if (candidates[position] === undefined) {
          parseError = `Number out of range: ${_position} | Valid range: 1-${candidates.length}`;
        }
        if (ballot[position] !== undefined) {
          parseError = `Multiple candidates at position ${_position}`;
          return;
        }
        ballot[position] = candidates[idx];
      });
      if (ballot.find(x => x === undefined)) {
        parseError = `Partial ballot (missing votes)`;
      }

      ballots.push({
        parseError,
        votes: ballot,
      });
    });

    this.lastLoaded = rawData;
    this.settingsService.updateStringValue(
      this.settingsService.rawVotes$,
      rawData,
    );
    this.preprocessingData$.next({
      ballots,
      candidates,
    });
    console.log(
      "Ballot preprocessing complete",
      candidates,
      ballots,
      this.preprocessingData$.getValue(),
    );
    return true;
  }
}
