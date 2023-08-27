import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { retryBackoff } from "backoff-rxjs";
import { MessageService } from "primeng/api";
import {
  BehaviorSubject,
  catchError,
  EMPTY,
  finalize,
  map,
  Observable,
  range,
  shareReplay,
  switchMap,
  take,
  tap,
} from "rxjs";
import { concatMapEager } from "rxjs-etc/operators";

const DRAND_ENDPOINT = "https://api.drand.sh";
const DRAND_HASH =
  "8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce";

export interface DrandInfo {
  public_key: string;
  period: number;
  genesis_time: number;
  hash: string;
  groupHash: string;
  schemeID: string;
  metadata: Record<string, string>;
}

export interface DrandRound {
  round: number;
  randomness: string;
  signature: string;
  previous_signature: string;
}

@Injectable({
  providedIn: "root",
})
export class DrandService {
  public get requests() {
    return this.requests$.getValue();
  }
  private set requests(value) {
    this.requests$.next(value);
  }
  private requests$ = new BehaviorSubject(0);
  public isLoading$ = this.requests$.pipe(
    map(x => x > 0),
    shareReplay(1),
  );

  public readonly reloadData$ = new BehaviorSubject(null);
  private readonly data$: Observable<DrandInfo> = this.reloadData$.pipe(
    tap(() => this.requests++),
    switchMap(() => {
      this.requests++;
      return this.httpClient
        .get<DrandInfo>(DRAND_ENDPOINT + "/info")
        .pipe(finalize(() => this.requests--));
    }),
    retryBackoff({ maxRetries: 3, initialInterval: 1500 }),
    tap(() => this.requests--),
    finalize(() => this.requests--),
    map(x => {
      if (x.hash !== DRAND_HASH) throw Error("Invalid Drand network hash");
      return x;
    }),
    catchError(err => {
      this.messageService.add({
        severity: "error",
        summary: "Error fetching Drand info",
        detail: JSON.stringify(err),
      });
      return EMPTY;
    }),
    shareReplay(),
  );

  constructor(
    private httpClient: HttpClient,
    private messageService: MessageService,
  ) {}

  public getValues(timestamp: number, values: number): Observable<string> {
    return this.data$.pipe(
      switchMap(({ genesis_time, period }) => {
        const first_round = Math.ceil((timestamp - genesis_time) / period);

        this.requests++;
        return range(0, values).pipe(
          concatMapEager(x => {
            this.requests++;
            return this.httpClient
              .get<DrandRound>(`${DRAND_ENDPOINT}/public/${first_round + x}`)
              .pipe(finalize(() => this.requests--));
          }),
          retryBackoff({ maxRetries: 3, initialInterval: 1500 }),
          catchError(err => {
            this.messageService.add({
              severity: "error",
              summary: "Error fetching Drand round",
              detail: JSON.stringify(err),
            });
            return EMPTY;
          }),
          tap(() => this.requests--),
          finalize(() => this.requests--),
          map(x => x.randomness),
          take(values),
        );
      }),
    );
  }
}
