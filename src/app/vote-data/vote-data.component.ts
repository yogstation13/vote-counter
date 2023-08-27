import { Component, HostListener } from "@angular/core";
import { map } from "rxjs";
import { SettingsService } from "../settings.service";
import { ValidatedBallot } from "../types";
import { VoteService } from "../vote.service";

@Component({
  selector: "app-vote-data",
  templateUrl: "./vote-data.component.html",
  styleUrls: ["./vote-data.component.scss"],
})
export class VoteDataComponent {
  listening = false;
  displayHelp = false;
  pasteInvalid = false;
  copied = false;

  errorData$ = this.voteService.preprocessingData$.pipe(
    map(data => {
      if (data === null) return null;
      const ret = Array<{
        ballot: ValidatedBallot;
        ballotIdx: number;
        vote?: string;
      }>();
      data.ballots.forEach((ballot, ballotIdx) => {
        if (ballot.parseError === undefined) return;

        ballot.votes.forEach(vote => ret.push({ ballot, ballotIdx, vote }));
      });
      return ret;
    }),
  );
  totalBallots$ = this.voteService.preprocessingData$.pipe(
    map(x => x?.ballots.length),
  );
  erroredBallots$ = this.voteService.preprocessingData$.pipe(
    map(x => x?.ballots.filter(x => x.parseError !== undefined).length),
  );

  constructor(
    public voteService: VoteService,
    public settingService: SettingsService,
  ) {}

  @HostListener("document:paste", ["$event"])
  paste(event: ClipboardEvent) {
    if (!this.listening) return;
    this.listening = false;

    event.stopImmediatePropagation();
    event.preventDefault();

    if (!event.clipboardData) return;
    this.pasteInvalid = !this.voteService.load(
      event.clipboardData.getData("text"),
    );

    setTimeout(() => (this.pasteInvalid = false), 800);
  }

  public copy() {
    const rawValue = this.settingService.rawVotes$.getValue();
    if (rawValue === null) return;

    navigator.clipboard.writeText(rawValue).then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 800);
    });
  }
}
