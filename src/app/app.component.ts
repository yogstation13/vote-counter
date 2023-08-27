import { Component } from "@angular/core";
import { DrandService } from "./drand.service";
import { VoteService } from "./vote.service";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent {
  constructor(
    public voteService: VoteService,
    public drandService: DrandService,
  ) {}
}
