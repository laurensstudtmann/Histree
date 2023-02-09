import { NotebookEvent } from ".";
import { Cell } from "@jupyterlab/cells";
import { VerNotebook } from "../notebook";
import { VerCell } from "../cell";

export class SwitchCellType extends NotebookEvent {
  cell: Cell;
  cell_index: number;

  constructor(notebook: VerNotebook, cell: Cell, cell_index: number) {
    super(notebook);
    this.cell = cell;
    this.cell_index = cell_index;
  }

  async modelUpdate() {
    // this is going to create and store the new nodey
    let newNodey = await this.notebook.ast.create.fromCell(
      this.cell,
      this.checkpoint
    );
    let oldVerCell = this.notebook.cells[this.cell_index];
    let verCell = new VerCell(this.notebook, this.cell, newNodey.name);
    this.notebook.cells.splice(this.cell_index, 0, verCell);

    // make pointer in history from old type to new type
    let oldNodey = oldVerCell?.model;
    this.history.store.linkBackHistories(newNodey, oldNodey);
    // if (newNodey.name) verCell?.setModel(newNodey.name);
    // verCell.view = this.cell;

    // make sure cell is added to notebook model
    this.checkpoint = this.history.stage.commitCellTypeChanged(
      oldNodey,
      newNodey,
      this.checkpoint
    );
    this.history.store.appendNodeToTree(this.checkpoint, "changeCellType");

    console.log(oldVerCell);
    console.log(verCell);
  }
}
