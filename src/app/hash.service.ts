import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { CompressionService } from "./compression.service";

@Injectable({
  providedIn: "root",
})
export class HashService {
  private subjects = new Map<string, BehaviorSubject<string | null>>();

  constructor(private compressionService: CompressionService) {
    window.addEventListener("hashchange", ev => this.onUrlChange(ev.newURL));
  }

  public async updateParam(param: string, value: string) {
    const params = await this.getHashParams(window.location.href);

    if (params.get(param) === value) return;

    params.set(param, value);
    window.location.hash = await this.compressionService.compress(
      params.toString(),
    );
  }

  public async getSubject(param: string) {
    const params = await this.getHashParams(window.location.href);

    let subject = this.subjects.get(param);
    if (subject === undefined)
      this.subjects.set(
        param,
        (subject = new BehaviorSubject<string | null>(params.get(param))),
      );
    return subject;
  }

  private async getHashParams(_url: string): Promise<URLSearchParams> {
    const url = new URL(_url);
    return new URLSearchParams(
      await this.compressionService.decompress(url.hash.substring(1)),
    );
  }

  private async onUrlChange(url: string) {
    const params = await this.getHashParams(url);

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
