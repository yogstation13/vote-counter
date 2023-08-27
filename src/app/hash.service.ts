import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { CompressionService } from "./compression.service";

@Injectable({
  providedIn: "root",
})
export class HashService {
  private lock: Promise<unknown> | null = null;
  private lockCanary = {};
  private subjects = new Map<string, BehaviorSubject<string | null>>();
  public hash$ = new BehaviorSubject(window.location.hash);

  constructor(private compressionService: CompressionService) {
    window.addEventListener("hashchange", () => {
      this.hash$.next(window.location.hash);
      void this.onUrlChange();
    });

    if (this.hash$.value === "" || this.hash$.value === "#") {
      const stored = localStorage.getItem("storedhash");
      if (stored !== null) window.location.hash = stored;
    }
  }

  private async _updateParam(param: string, value: string) {
    const params = await this.getHashParams();

    if (params.get(param) === value) return;

    params.set(param, value);
    window.location.hash = await this.compressionService.compress(
      params.toString(),
    );
    localStorage.setItem("storedhash", this.hash$.value);
  }

  private wrapCall<T>(fn: () => Promise<T>) {
    const currentCanary = (this.lockCanary = {});
    const self_destruct = (param: T) => {
      if (this.lockCanary === currentCanary) this.lock = null;
      return param;
    };

    let lock: Promise<T>;
    if (this.lock) {
      lock = this.lock.then(fn).then(self_destruct);
    } else {
      lock = fn().then(self_destruct);
    }
    this.lock = lock;

    return lock;
  }
  public updateParam = (param: string, value: string) =>
    this.wrapCall(() => this._updateParam(param, value));

  private async _getSubject(param: string) {
    const params = await this.getHashParams();

    let subject = this.subjects.get(param);
    if (subject === undefined)
      this.subjects.set(
        param,
        (subject = new BehaviorSubject<string | null>(params.get(param))),
      );
    return subject;
  }

  public getSubject = (param: string) =>
    this.wrapCall(() => this._getSubject(param));

  private async getHashParams(): Promise<URLSearchParams> {
    return new URLSearchParams(
      await this.compressionService.decompress(this.hash$.value.substring(1)),
    );
  }

  private async onUrlChange() {
    const params = await this.getHashParams();

    for (const [deletedKey, deletedSubject] of this.subjects.entries()) {
      if (params.has(deletedKey)) continue;
      if (deletedSubject.getValue() === null) continue;
      deletedSubject.next(null);
    }

    for (const [param, paramValue] of params.entries()) {
      const subject = this.subjects.get(param);
      if (subject !== undefined) {
        if (subject.getValue() !== paramValue) subject.next(paramValue);
      } else {
        this.subjects.set(
          param,
          new BehaviorSubject<string | null>(paramValue),
        );
      }
    }
  }
}
