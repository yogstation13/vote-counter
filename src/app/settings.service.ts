import { Injectable } from "@angular/core";
import { BehaviorSubject, filter, scan } from "rxjs";
import { HashService } from "./hash.service";

@Injectable({
  providedIn: "root",
})
export class SettingsService {
  timestamp$ = new BehaviorSubject<number | null>(null);
  seats$ = new BehaviorSubject(5);
  rawVotes$ = new BehaviorSubject<string | null>(null);

  constructor(private hashService: HashService) {
    this.setupProp(() => this.timestamp$);
    this.setupProp(() => this.seats$);
    this.setupProp(() => this.rawVotes$);
  }

  // @ts-expect-error Cannot be bothered to figure out typescript overload syntax
  public updateStringValue(
    setting: BehaviorSubject<string>,
    value: string,
  ): void;
  public updateStringValue(
    setting: BehaviorSubject<string | null>,
    value: string | null,
  ): void;
  public updateStringValue(
    setting: BehaviorSubject<string | null>,
    value: string | null,
  ) {
    if (setting.getValue() === value) return;
    setting.next(value);
  }

  // @ts-expect-error Cannot be bothered to figure out typescript overload syntax
  public updateNumberValue(
    setting: BehaviorSubject<number>,
    _value: string,
  ): void;
  public updateNumberValue(
    setting: BehaviorSubject<number | null>,
    _value: string | null,
  ): void;
  public updateNumberValue(
    setting: BehaviorSubject<number | null>,
    _value: string | null,
  ): void {
    const value = _value === null ? null : parseInt(_value);

    if (Number.isNaN(value)) return;

    if (setting.getValue() === value) return;
    setting.next(value);
  }

  private setupProp<T>(subject: () => BehaviorSubject<T>) {
    const localStorageKey = `setting-(${subject.toString()})`;
    subject()
      .pipe(
        scan(([, prev], cur) => [prev, cur] as [T | null, T], [null, null] as [
          T | null,
          T,
        ]),
      )
      .subscribe(([prev, cur]) => {
        if (prev === cur) return;
        void this.hashService.updateParam(localStorageKey, JSON.stringify(cur));
      });
    this.hashService
      .getSubject(localStorageKey)
      .then(x =>
        x
          .pipe(
            filter((x): x is string => typeof x === "string" && true && true),
          )
          .subscribe(x => subject().next(JSON.parse(x))),
      );
  }
}
