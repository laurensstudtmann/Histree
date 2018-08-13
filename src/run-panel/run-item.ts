import {
  Run,
  ChangeType,
  CellRunData,
  RunCluster,
  RunModel
} from "../model/run";

import { Widget } from "@phosphor/widgets";

import { RunActions } from "./run-panel";

import { FilterFunction } from "../panel/search-bar";

import { HistoryModel } from "../model/history";

import { Sampler } from "../inspector-panel/sampler";

import { NodeyCell } from "../model/nodey";

import { DotMap } from "./dot-map";

import { Annotator } from "./annotator";

const RUN_ITEM_CLASS = "v-VerdantPanel-runItem";
const RUN_ITEM_CARET = "v-VerdantPanel-runItem-caret";
const RUN_LABEL = "v-VerdantPanel-runList-runDateTotal";
const RUN_ITEM_ACTIVE = "jp-mod-active";
const RUN_ITEM_TIME = "v-VerdantPanel-runItem-time";
const RUN_ITEM_LOADING = "loading";
const RUN_ITEM_TITLE_WRAPPER = "v-VerdantPanel-runItem-title-container";

const RUN_SAMPLE_ROW = "v-VerdantPanel-runItem-sampleRow";
const RUN_SAMPLE_BUTTON = "v-VerdantPanel-runItem-sampleButton";
const RUN_ITEM_STAR = "v-VerdantPanel-starButton";
const NOTES = "v-VerdantPanel-noteContainer";

const SUB_RUNLIST_CLASS = "v-VerdantPanel-runCluster-list";
const MAP_CELLBOX_DESCCONTAINER = "v-VerdantPanel-runCellMap-cellBox-descBox";
const MAP_CELLBOX_LABEL = "v-VerdantPanel-runCellMap-label";
const MAP_CELLBOX_ICON = "v-VerdantPanel-runCellMap-cellbox-icon";

export class RunItem extends Widget {
  readonly runs: RunCluster;
  readonly header: HTMLElement;
  readonly dotMap: DotMap;
  readonly runModel: RunModel;
  readonly historyModel: HistoryModel;
  readonly actions: RunActions;

  private activeFilter: (r: Run) => boolean;
  private activeTextFilter: (s: string) => boolean;

  constructor(runs: RunCluster, runModel: RunModel, actions: RunActions) {
    super();
    this.actions = actions;
    this.runModel = runModel;
    this.historyModel = runModel.historyModel;
    this.runs = runs;

    let caret = document.createElement("div");
    caret.classList.add(RUN_ITEM_CARET);

    let eventLabel = document.createElement("div");
    if (this.runs.length === 1) eventLabel.textContent = runs.checkpointType;
    else eventLabel.textContent = "(" + this.runs.length + ")";
    eventLabel.classList.add(RUN_LABEL);

    let time = document.createElement("div");
    let minTime = new Date(this.runs.first.timestamp);
    let maxTime = new Date(this.runs.last.timestamp);
    if (Run.sameMinute(minTime, maxTime))
      time.textContent = Run.formatTime(minTime);
    else {
      time.textContent =
        Run.formatTime(minTime) + "-" + Run.formatTime(maxTime);
    }
    time.classList.add(RUN_ITEM_TIME);

    this.dotMap = new DotMap(this.historyModel, this.runs.getCellMap());

    this.header = document.createElement("div");
    this.header.classList.add(RUN_ITEM_CLASS);

    let titleWrapper = document.createElement("div");
    titleWrapper.classList.add(RUN_ITEM_TITLE_WRAPPER);

    titleWrapper.appendChild(caret);
    titleWrapper.appendChild(eventLabel);
    titleWrapper.appendChild(time);
    this.header.appendChild(titleWrapper);

    this.header.appendChild(this.dotMap.node);

    this.node.appendChild(this.header);
    this.buildHeaderAnnotations();

    this.runs.newRunAdded.connect(
      (_: any, r: Run) => {
        this.updateLabel();
        if (this.hasClass("open")) {
          this.addToDetailList(r);
        }
      },
      this
    );

    this.header.addEventListener("click", ev => {
      this.actions.onClick(this, ev);
    });
  }

  private updateLabel() {
    if (this.runs.length === 1)
      this.label.textContent = this.runs.checkpointType;
    else this.label.textContent = "(" + this.runs.length + ")";
    let dots = this.dotMap.update(this.runs.getCellMap());
    this.header.replaceChild(dots, this.header.lastElementChild);
  }

  animLoading() {
    this.header.classList.remove(RUN_ITEM_LOADING);
    this.header.classList.add(RUN_ITEM_LOADING);
    void this.header.offsetLeft;
    return this;
  }

  blur() {
    this.dotMap.blur();
    let caret = this.header.firstElementChild;
    caret.classList.remove("highlight");
    this.header.classList.remove(RUN_ITEM_ACTIVE);
    this.header.classList.remove(RUN_ITEM_LOADING);
    let star = this.header.getElementsByClassName(RUN_ITEM_STAR)[0];
    if (star) star.classList.remove("highlight");
    var icons = this.header.getElementsByClassName(MAP_CELLBOX_ICON);
    for (var i = 0; i < icons.length; i++)
      icons[i].classList.remove("highlight");
  }

  nodeClicked() {
    let caret = this.header.firstElementChild;
    caret.classList.add("highlight");
    setTimeout(() => {
      this.header.classList.remove(RUN_ITEM_LOADING);
      void this.header.offsetLeft;
      this.header.classList.add(RUN_ITEM_ACTIVE);
      let star = this.header.getElementsByClassName(RUN_ITEM_STAR)[0];
      if (star) star.classList.add("highlight");
      var icons = this.header.getElementsByClassName(MAP_CELLBOX_ICON);
      for (var i = 0; i < icons.length; i++)
        icons[i].classList.add("highlight");
      this.dotMap.highlight();
    }, 5);
    return this;
  }

  get link() {
    return this.header;
  }

  get caret() {
    return this.header.firstElementChild as HTMLElement;
  }

  get label() {
    return this.header.getElementsByClassName(RUN_LABEL)[0] as HTMLElement;
  }

  public filter(fun: FilterFunction<Run>) {
    let match = this.runs.filter(fun.filter, this.activeTextFilter);
    this.activeFilter = fun.filter;
    if (match === 0) {
      this.node.style.display = "none";
    } else {
      this.label.textContent = "(" + match + "/" + this.runs.length + ")";
    }
    return match;
  }

  public filterByText(fun: FilterFunction<string>): number {
    if (this.node.style.display !== "none") {
      let match = this.runs.filterByText(fun.filter, this.activeFilter);
      this.activeTextFilter = fun.filter;
      if (match === 0) {
        this.node.style.display = "none";
      } else {
        this.label.textContent = "(" + match + "/" + this.runs.length + ")";
      }
      return match;
    }
    return 0;
  }

  public clearFilters() {
    this.activeFilter = null;
    this.activeTextFilter = null;
    this.node.style.display = "";
    this.updateLabel();
  }

  public caretClicked() {
    console.log("Caret was clicked!");
    if (!this.hasClass("open")) this.openHeader();
    else this.closeHeader();
  }

  private openHeader() {
    this.caret.classList.add("open");
    this.addClass("open");
    this.hideHeaderAnnotations();

    let dropdown = document.createElement("ul");
    dropdown.classList.add(SUB_RUNLIST_CLASS);
    if (this.runs.length === 1)
      dropdown.appendChild(
        Annotator.buildDetailNotes(this.runs.first, this.historyModel)
      );
    this.buildDetailList(dropdown);
    this.node.appendChild(dropdown);
  }

  public closeHeader() {
    // double check header is in fact open
    if (this.hasClass("open")) {
      this.caret.classList.remove("open");
      this.removeClass("open");
      this.node.removeChild(
        this.node.getElementsByClassName(SUB_RUNLIST_CLASS)[0]
      );
    }
    if (this.runs.length === 1) this.buildHeaderAnnotations();
  }

  private hideHeaderAnnotations() {
    let next = this.caret.nextElementSibling;
    if (next.classList.contains(RUN_ITEM_STAR)) next.remove();
    let notes = this.node.getElementsByClassName(NOTES);
    if (notes.length > 0) this.node.removeChild(notes[0]);
  }

  private buildHeaderAnnotations() {
    let run = this.runs.first;
    let next = this.caret.nextElementSibling;
    if (run.star > -1 && !next.classList.contains(RUN_ITEM_STAR)) {
      let star = document.createElement("div");
      star.classList.add(RUN_ITEM_STAR);
      star.classList.add("header");
      this.header.insertBefore(star, next);
    }

    if (run.note > -1) {
      let noteText = Annotator.buildHeaderNotes(run, this.historyModel);
      noteText.classList.add("header");
      this.node.appendChild(noteText);
    }
  }

  private buildDetailList(dropdown: HTMLElement) {
    console.log("FILTER", this.activeFilter);
    if (this.runs.length === 1)
      this._buildDetail_singleton(dropdown, this.runs.first);
    else this._buildDetail_accordian(dropdown);
  }

  private addToDetailList(run: Run) {
    let dropdown = this.node.getElementsByClassName(
      SUB_RUNLIST_CLASS
    )[0] as HTMLElement;
    if (this.runs.length === 1)
      this._buildDetail_singleton(dropdown, this.runs.first);
    else {
      this._addSubRun(run.id, dropdown);
    }
  }

  private _buildDetail_singleton(dropdown: HTMLElement, run: Run) {
    let cell = run.runCell;
    let nodey = this.historyModel.getNodey(cell.node) as NodeyCell;
    console.log("NODEY OPENING is", nodey, run);
    //var cellVer = nodey.version + 1;
    if (cell.changeType === ChangeType.SAME) {
      if (cell.run) {
        dropdown.appendChild(
          this.createCellDetail("same", ["No changes to cell."], nodey, cell)
        );
      }
      return;
    }

    switch (cell.changeType) {
      case ChangeType.ADDED:
        dropdown.appendChild(
          this.createCellDetail("added", ["Cell created"], nodey, cell)
        );
        break;
      case ChangeType.REMOVED:
        dropdown.appendChild(
          this.createCellDetail("removed", ["Cell deleted"], nodey, cell)
        );
        break;
      case ChangeType.CHANGED:
        let changes = this.historyModel.inspector.getRunChangeCount(nodey);
        dropdown.appendChild(
          this.createCellDetail(
            "changed",
            ["Cell changes: ", "++" + changes.added + " --" + changes.deleted],
            nodey,
            cell
          )
        );
        break;
    }
  }

  private goToCellDetail(nodeyName: string) {
    let nodey = this.historyModel.getNodey(nodeyName);
    this.historyModel.inspector.changeTarget([nodey]);
    this.actions.switchPane();
  }

  private gotToOutputDetail(outName: string) {
    let out = this.historyModel.getOutput(outName);
    this.historyModel.inspector.changeTarget([out]);
    this.actions.switchPane();
  }

  private createCellDetail(
    _: string,
    descLabels: string[],
    nodey: NodeyCell,
    dat: CellRunData
  ) {
    let cellContainer = document.createElement("div");

    //descriptions
    let descContainer = document.createElement("div");
    descContainer.classList.add(MAP_CELLBOX_DESCCONTAINER);

    descLabels.forEach(desc => {
      let label = document.createElement("div");
      label.textContent = desc;
      label.classList.add(MAP_CELLBOX_LABEL);
      descContainer.appendChild(label);
    });
    cellContainer.appendChild(descContainer);

    //cell sample
    let sampleRow = document.createElement("div");
    sampleRow.classList.add(RUN_SAMPLE_ROW);
    let sample = Sampler.sampleCell(this.historyModel, nodey);
    let button = document.createElement("div");
    button.classList.add(RUN_SAMPLE_BUTTON);
    button.addEventListener(
      "click",
      this.goToCellDetail.bind(this, nodey.name)
    );
    sampleRow.appendChild(button);
    sampleRow.appendChild(sample);
    cellContainer.appendChild(sampleRow);

    //output sample
    if (dat.newOutput) {
      //descriptions
      let descOut = document.createElement("div");
      descOut.classList.add(MAP_CELLBOX_DESCCONTAINER);
      let outLabel = document.createElement("div");
      outLabel.textContent = "New cell outputs:";
      outLabel.classList.add(MAP_CELLBOX_LABEL);
      descOut.appendChild(outLabel);
      cellContainer.appendChild(descOut);

      dat.newOutput.forEach(num => {
        let out = this.historyModel.getOutput(num);
        let outputRow = document.createElement("div");
        outputRow.classList.add(RUN_SAMPLE_ROW);
        let sampleOut = Sampler.sampleOutput(this.historyModel, out);
        let outButton = document.createElement("div");
        outButton.addEventListener(
          "click",
          this.gotToOutputDetail.bind(this, num)
        );
        outButton.classList.add(RUN_SAMPLE_BUTTON);
        outputRow.appendChild(outButton);
        outputRow.appendChild(sampleOut);
        cellContainer.appendChild(outputRow);
      });
    }

    return cellContainer;
  }

  private _buildDetail_accordian(dropdown: HTMLElement) {
    this.runs.getRunList().forEach((run: number) => {
      this._addSubRun(run, dropdown);
    });
    return dropdown;
  }

  private _addSubRun(run: number, dropdown: HTMLElement) {
    let cluster = new RunCluster(-1, this.runs.model, [run]);
    let runItem = new RunItem(cluster, cluster.model, this.actions);
    dropdown.insertBefore(runItem.node, dropdown.firstElementChild);
    runItem.caretClicked();
  }
}
