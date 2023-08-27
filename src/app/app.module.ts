import { NgOptimizedImage } from "@angular/common";
import { HttpClientModule } from "@angular/common/http";
import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { NgxEchartsModule } from "ngx-echarts";
import { MessageService } from "primeng/api";
import { DialogModule } from "primeng/dialog";
import { DividerModule } from "primeng/divider";
import { KeyFilterModule } from "primeng/keyfilter";
import { MessagesModule } from "primeng/messages";
import { PaginatorModule } from "primeng/paginator";
import { ProgressBarModule } from "primeng/progressbar";
import { TableModule } from "primeng/table";
import { TimelineModule } from "primeng/timeline";

import { AppComponent } from "./app.component";
import { SettingsComponent } from "./settings/settings.component";
import { ReactiveFormsModule } from "@angular/forms";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { PanelModule } from "primeng/panel";
import { InputTextModule } from "primeng/inputtext";
import { FieldsetModule } from "primeng/fieldset";
import { VoteDataComponent } from "./vote-data/vote-data.component";
import { ButtonModule } from "primeng/button";
import { VoteResultsComponent } from "./vote-results/vote-results.component";

@NgModule({
  declarations: [
    AppComponent,
    SettingsComponent,
    VoteDataComponent,
    VoteResultsComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    PanelModule,
    InputTextModule,
    FieldsetModule,
    ButtonModule,
    KeyFilterModule,
    PaginatorModule,
    DialogModule,
    TableModule,
    DividerModule,
    HttpClientModule,
    ProgressBarModule,
    MessagesModule,
    NgxEchartsModule.forRoot({
      echarts: () => import("echarts"),
    }),
    TimelineModule,
    NgOptimizedImage,
  ],
  providers: [MessageService],
  bootstrap: [AppComponent],
})
export class AppModule {}
