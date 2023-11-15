import { NotebookEvent } from ".";
import { log, VerNotebook } from "../notebook";

export class SaveNotebook extends NotebookEvent {
  actuallySave: Boolean

  constructor(notebook: VerNotebook, actuallySave: Boolean = true) {
    super(notebook);
    this.actuallySave = actuallySave;  
  }
  async modelUpdate() {
    // look through cells for potential unsaved changes
    this.notebook.cells.forEach((cell) => {
      if (cell.model) {
        this.history.stage.markAsPossiblyEdited(cell.model, this.checkpoint);
      }
    });

    // !!! HACK: avoiding saving duplicate images assuming if it hasn't been
    // run it can't be a new output
    this.checkpoint = await this.history.stage.commit(this.checkpoint, {
      ignore_output: true,
    });
    if (!this.actuallySave) log("NOT ACTUALLY SAVING");
    else log ("ACTUALLY SAVING");
    if (this.checkpoint.notebook == null) log("Notebook saved, no changes, no node added.");
    else {
      log("Notebook saved with changes, adding node");
      this.history.store.appendNodeToTree(this.checkpoint, "save");
    }
  }

  endEvent() {
    if (this.actuallySave)
      this.notebook.saveToFile();
  }
}
