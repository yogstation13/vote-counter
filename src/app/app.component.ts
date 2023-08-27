import { Component, HostListener, OnInit } from "@angular/core";
import { DrandService } from "./drand.service";
import { VoteService } from "./vote.service";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnInit {
  public innerWidth = 0;

  @HostListener("window:resize")
  ngOnInit() {
    this.innerWidth = window.innerWidth;
  }

  constructor(
    public voteService: VoteService,
    public drandService: DrandService,
  ) {}
}
