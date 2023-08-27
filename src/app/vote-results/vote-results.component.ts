import { Component } from "@angular/core";
import { EChartsOption } from "echarts";
import {
  SankeyEdgeItemOption,
  SankeyNodeItemOption,
} from "echarts/types/src/chart/sankey/SankeySeries";
import { map, tap } from "rxjs";
import { EliminationReason } from "../types";
import { VoteService } from "../vote.service";

const colors = [
  "#564898",
  "#6fc96f",
  "#c2c16a",
  "#c86fda",
  "#fac47f",
  "#406b39",
  "#6dc8cc",
  "#4d3939",
];

@Component({
  selector: "app-vote-results",
  templateUrl: "./vote-results.component.html",
  styleUrls: ["./vote-results.component.scss"],
})
export class VoteResultsComponent {
  public collapsed = true;
  public loadGraphs = false;

  constructor(public voteService: VoteService) {}

  public rounds$ = this.voteService.rounds$.pipe(
    tap(() => {
      if (this.collapsed) this.loadGraphs = false;
    }),
    map(x =>
      x === null
        ? null
        : x.rounds.map<EChartsOption>((seat, seatIdx) => {
            const data: SankeyNodeItemOption[] = [];
            const links: SankeyEdgeItemOption[] = [];

            function pushRound(idx: number) {
              data.push({
                name: `Round ${idx}`,
                label: {
                  show: false,
                },
                // @ts-expect-error missing property in type def
                tooltip: {
                  show: false,
                },
              });
            }

            function pushCandidate(idx: number, candidate: string) {
              data.push({
                name: `${idx}-${candidate}`,
                itemStyle: {
                  color:
                    colors[
                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      x!.candidates.indexOf(candidate) % (colors.length - 1)
                    ],
                },
                // @ts-expect-error missing property in type def
                tooltip: {
                  formatter: `${candidate}: {c0}`,
                },
                label: {
                  formatter: candidate,
                },
              });
            }

            seat.forEach((round, idx) => {
              pushRound(idx);

              const eliminationReason = `Eliminated ${round.eliminated.join(
                ",",
              )}\n ${
                round.reason === EliminationReason.Lowest
                  ? `(LOWEST) Had the lowest amount of votes ${round.lowest_votes}`
                  : round.reason === EliminationReason.Logic
                  ? `(LOGIC) Could mathematically never win`
                  : round.reason === EliminationReason.TieBreak
                  ? `(RANDOM) Was randomly selected for elimination`
                  : "(UNKNOWN) Unknown elimination reason"
              }`;

              links.push({
                source: `Round ${idx}`,
                target: `Round ${idx + 1}`,
                lineStyle: {
                  opacity: 0,
                  color: "#ffffff",
                },
                edgeLabel: {
                  show: true,
                  formatter: `Round ${idx + 1}`,
                },
                //@ts-expect-error missing property in type definition
                tooltip: {
                  show: true,
                  formatter: eliminationReason,
                },
                value: 10,
              });

              for (const candidate of round.candidates_start) {
                pushCandidate(idx, candidate);
              }

              for (const [source, destinations] of round.transfers?.entries() ??
                []) {
                for (const [destination, amount] of destinations) {
                  if (amount === 0) continue;

                  links.push({
                    source: `${idx}-${source}`,
                    target: `${idx + 1}-${destination}`,
                    value: amount,
                    lineStyle: {
                      color:
                        source !== destination
                          ? "#ff0000"
                          : round.lowest_votes === amount
                          ? "#ffff00"
                          : undefined,
                      opacity:
                        source !== destination || round.lowest_votes === amount
                          ? 0.5
                          : undefined,
                    },
                    // @ts-expect-error Missing property
                    tooltip: {
                      show: true,
                      formatter: "{c}",
                    },
                  });
                }
              }
            });
            pushRound(seat.length);
            pushCandidate(seat.length, x.elected_candidates[seatIdx]);

            return {
              tooltip: {
                trigger: "item",
                triggerOn: "mousemove",
                show: true,
              },
              series: [
                {
                  top: "0",
                  bottom: "0",
                  left: "0",
                  right: "0",
                  layoutIterations: 50,
                  type: "sankey",
                  orient: "vertical",
                  name: `Seat #${seatIdx + 1}`,
                  data,
                  links,
                  label: {
                    position: "inside",
                    overflow: "truncate",
                    width: 80,
                  },
                  draggable: false,
                },
              ],
            };
          }),
    ),
  );

  checkAndLoad(): void {
    if (!this.loadGraphs && !this.collapsed) this.loadGraphs = true;
  }
}
