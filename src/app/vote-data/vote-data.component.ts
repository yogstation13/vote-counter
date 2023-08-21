import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from "@angular/core";

@Component({
  selector: "app-vote-data",
  templateUrl: "./vote-data.component.html",
  styleUrls: ["./vote-data.component.scss"],
})
export class VoteDataComponent {
  listening = false;

  @HostListener("document:paste", ["$event.clipboardData"])
  paste(event: DataTransfer) {
    if (!this.listening) return;
    this.listening = false;

    console.log(event.getData("text"));
  }
}
