import { NgOptimizedImage } from "@angular/common";
import { HttpClientModule } from "@angular/common/http";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { BrowserModule } from "@angular/platform-browser";
import {
  faChevronDown,
  faChevronRight,
  faClose,
  faCopy,
  faPaste,
} from "@fortawesome/free-solid-svg-icons";
import { NgxEchartsModule } from "ngx-echarts";
import { MessageService } from "primeng/api";
import { DialogModule } from "primeng/dialog";
import { DividerModule } from "primeng/divider";
import { InputNumberModule } from "primeng/inputnumber";
import { KeyFilterModule } from "primeng/keyfilter";
import { MessagesModule } from "primeng/messages";
import { ProgressBarModule } from "primeng/progressbar";
import { TableModule } from "primeng/table";
import { TimelineModule } from "primeng/timeline";

import { AppComponent } from "./app.component";
import { SettingsComponent } from "./settings/settings.component";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { InputTextModule } from "primeng/inputtext";
import { FieldsetModule } from "primeng/fieldset";
import { VoteDataComponent } from "./vote-data/vote-data.component";
import { ButtonModule } from "primeng/button";
import { VoteResultsComponent } from "./vote-results/vote-results.component";
import {
  FaIconLibrary,
  FontAwesomeModule,
} from "@fortawesome/angular-fontawesome";

@NgModule({
  bootstrap: [AppComponent],
  declarations: [
    AppComponent,
    SettingsComponent,
    VoteDataComponent,
    VoteResultsComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    InputTextModule,
    FieldsetModule,
    ButtonModule,
    KeyFilterModule,
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
    FormsModule,
    InputNumberModule,
    FontAwesomeModule,
  ],
  providers: [MessageService],
})
export class AppModule {
  constructor(library: FaIconLibrary) {
    library.addIcons(faPaste, faCopy, faClose, faChevronDown, faChevronRight);
  }
}
