import {
  NodeyCodeCell,
  NodeyMarkdown,
  NodeyCode,
  NodeyRawCell,
  NodeyCell,
  Nodey,
} from "../../nodey";
import { History } from "../history";
import { OutputHistory } from "../store";
import { IOutput } from "@jupyterlab/nbformat";
import { FileManager } from "../../jupyter-hooks/file-manager";
import { jsn } from "../../notebook";

/*
 * Stage is responsible for figuring out which *potentially* changed nodey
 * are really edited and how, by verifying changes and working with the AST
 * module to figure out the exact changes to code nodey
 */
export class Stage {
  readonly history: History;
  //private readonly fileManager: FileManager;

  /*
   * Dirty nodey lists nodey that *might* be changed, but we'll need to verify
   * when it's time to stage changes
   */
  public dirty_nodey: string[] = [];

  /*
   * Staged data structures contain the instructions and data we need to create a
   * new updated version of the nodey in the history data store. Each instruction
   * is recorded by the cell name, which is the base artifact name of the cell
   * such as C5 or M4
   */
  private staged_total: Nodey[] = [];
  private staged_codeCell: {} = {};
  private staged_markdown: { [cellName: string]: { markdown: string } } = {};
  private staged_rawCell: { [cellName: string]: { literal: string } } = {};

  constructor(history: History, fileManager: FileManager) {
    this.history = history;
    //this.fileManager = fileManager;
  }

  public getAllStaged(): Nodey[] {
    return this.staged_total;
  }

  public getStaging(cell: NodeyCell) {
    if (cell instanceof NodeyCodeCell)
      return this.staged_codeCell[cell.artifactName];
    if (cell instanceof NodeyMarkdown)
      return this.staged_markdown[cell.artifactName];
    if (cell instanceof NodeyRawCell)
      return this.staged_rawCell[cell.artifactName];
  }

  public async stage(options: jsn = {}) {
    // create staging lists
    await Promise.all(
      this.dirty_nodey.map(async (name: string) => {
        // get potentially dirty nodey
        let nodey = this.history.store.get(name);

        if (nodey instanceof NodeyCode) {
          let nodeyCell;
          if (nodey instanceof NodeyCodeCell) nodeyCell = nodey;
          else nodeyCell = this.history.store.getCellParent(nodey);
          this.checkCodeCellNodey(nodeyCell, options["ignore_output"]);

          // HACK see image on-save issue
          if (!options["ignore_output"]) await this.checkOutputNodey(nodeyCell);
        } else if (nodey instanceof NodeyMarkdown) {
          this.checkMarkdownNodey(nodey);
        } else if (nodey instanceof NodeyRawCell) {
          this.checkRawCellNodey(nodey);
        }
      })
    );
    console.log("staged: ", this.isEdited());
    // empty after all have been considered
    this.dirty_nodey = [];
  }

  public isEdited() {
    let codeCells = Object.keys(this.staged_codeCell);
    let markdownCells = Object.keys(this.staged_markdown);
    let rawCells = Object.keys(this.staged_rawCell);
    return codeCells.length + markdownCells.length + rawCells.length > 0;
  }

  // Only allowed change is execution of a cell where the code did not change
  public onlyExecuted() {
    let markdownCells = Object.keys(this.staged_markdown);
    let rawCells = Object.keys(this.staged_rawCell);

    // If a staged codecells contains the "literal" key, its code was edited, so we return false
    const codeChanged = Object.keys(this.staged_codeCell).some(artifactName => {
      return "literal" in this.staged_codeCell[artifactName] && this.staged_codeCell[artifactName].no_changes !== true
    });

    return markdownCells.length + rawCells.length === 0 && !codeChanged;
  }

  private checkCodeCellNodey(nodey: NodeyCodeCell, checkIfDifferent: boolean = false) {
    let cell = this.history.notebook.getCellByNode(nodey);
    let newText = cell?.getText() || "";

    let oldText = nodey.literal || ""; // assuming no AST level data

    const bothEmpty = newText === "" && oldText === "";

    // Always stage even if code stayed the same, except when saving the notebook, then do ignore it when code stayed the same
    // But do not stage if both the old and new version are empty.
    if (!bothEmpty && (!checkIfDifferent || oldText !== newText)) {
      // store instructions for a new version of nodey in staging
      if (!this.staged_codeCell[nodey.artifactName]) {
        this.staged_codeCell[nodey.artifactName] = { literal: newText };
        this.staged_total.push(nodey);
      }
      this.staged_codeCell[nodey.artifactName]["literal"] = newText;
      this.staged_codeCell[nodey.artifactName]["no_changes"] = oldText === newText;
    }
  }

  private async checkOutputNodey(nodey: NodeyCodeCell) {
    // get current (new) output if any
    let cell = this.history.notebook.getCellByNode(nodey);
    
    // Get old and new version of cell to check if they are both empty
    let newText = cell?.getText() || "";
    let oldText = nodey.literal || ""; // assuming no AST level data

    let outputArea = cell?.outputArea;
    let raw: IOutput[] = []; // no output
    if (outputArea) raw = cell?.outputArea?.model.toJSON() || []; // output if present

    // first, don't record this output if it is completely errors
    let onlyErrors = OutputHistory.checkForAllErrors(raw);

    // Also do not record output when both versions of the code cell are empty and the output is also empty (meaning we've just executed an empty cell)
    const allEmpty = newText === "" && oldText === "" && raw.length === 0;
    if (!allEmpty && !onlyErrors) {
      // make instructions for a new Output in staging
      if (!this.staged_codeCell[nodey.artifactName]) {
        this.staged_codeCell[nodey.artifactName] = {};
        this.staged_total.push(nodey);
      }
      //if (raw.length === 0)
      //  raw = [{ name: "stdout", output_type: "stream", text: "This is a workaround, there should not be any output here." }];
      this.staged_codeCell[nodey.artifactName]["output"] = raw;
    }
  }

  /*private async checkOutputNodey(nodey: NodeyCodeCell) {
    // get current (new) output if any
    let cell = this.history.notebook.getCellByNode(nodey);
    let outputArea = cell?.outputArea;
    let raw: IOutput[] = []; // no output
    if (outputArea) raw = cell?.outputArea?.model.toJSON() || []; // output if present

    // get prior output if any
    let oldOutput = cell?.output;

    // first, don't record this output if it is completely errors
    let onlyErrors = OutputHistory.checkForAllErrors(raw);

    if (!onlyErrors) {
      // compare to see if output has changed
      let same = await OutputHistory.isSame(oldOutput, raw, this.fileManager);
      console.log(oldOutput);
      if (!same) {//((!same || same)) { //&& (raw.length > 0 || oldOutput != null)) {
        // make instructions for a new Output in staging
        if (!this.staged_codeCell[nodey.artifactName]) {
          this.staged_codeCell[nodey.artifactName] = {};
          this.staged_total.push(nodey);
        }
        //if (raw.length === 0)
        //  raw = [{ name: "stdout", output_type: "stream", text: "This is a workaround, there should not be any output here." }];
        this.staged_codeCell[nodey.artifactName]["output"] = raw;
      }
    }
  }*/

  private checkMarkdownNodey(nodey: NodeyMarkdown) {
    let cell = this.history.notebook.getCellByNode(nodey);
    let newText = cell?.getText() || "";
    let oldText = nodey.markdown;
    if (oldText != newText) {
      // store instructions for a new version of nodey in staging
      if (!this.staged_markdown[nodey.artifactName]) {
        this.staged_markdown[nodey.artifactName] = { markdown: newText };
        this.staged_total.push(nodey);
      } else this.staged_markdown[nodey.artifactName]["markdown"] = newText;
    }
  }

  private checkRawCellNodey(nodey: NodeyRawCell) {
    let cell = this.history.notebook.getCellByNode(nodey);
    let newText = cell?.getText() || "";
    let oldText = nodey.literal || "";
    if (oldText !== newText) {
      // store instructions for a new version of nodey in staging
      if (!this.staged_rawCell[nodey.artifactName]) {
        this.staged_rawCell[nodey.artifactName] = { literal: newText };
        this.staged_total.push(nodey);
      } else this.staged_rawCell[nodey.artifactName]["literal"] = newText;
    }
  }
}
