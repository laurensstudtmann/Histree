import { NotebookEvent } from ".";
import { log } from "../notebook";

export class SaveNotebook extends NotebookEvent {
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
    log("Notebook saved, no node added");
    //this.history.store.appendNodeToTree(this.checkpoint, "save");
  }

  endEvent() {
    this.notebook.saveToFile();
  }
}
