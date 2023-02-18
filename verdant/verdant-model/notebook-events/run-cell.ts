import { NotebookEvent } from ".";
import { NodeyCell } from "../nodey";
import { VerNotebook } from "../notebook";

export class RunCell extends NotebookEvent {
  nodey: NodeyCell;

  constructor(notebook: VerNotebook, nodey: NodeyCell) {
    super(notebook);
    this.nodey = nodey;
  }

  async modelUpdate() {
    if (this.nodey) {
      // commit the notebook if the cell has changed
      this.history.stage.markAsPossiblyEdited(this.nodey, this.checkpoint);
      this.checkpoint = await this.history.stage.commit(this.checkpoint);

      // if notebook is null, we have executed something that does not change anything.
      // => Do not add a node to the tree
      if (this.checkpoint.notebook != null)
        this.history.store.appendNodeToTree(this.checkpoint, "execute");
    }
  }
}
