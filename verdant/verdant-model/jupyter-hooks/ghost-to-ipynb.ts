import { INotebookModel, NotebookModel } from "@jupyterlab/notebook";
import { History, OutputHistory } from "../history";
import {
  NodeyCodeCell,
  NodeyMarkdown,
  NodeyNotebook,
  NodeyRawCell,
} from "../nodey";
import * as nbformat from "@jupyterlab/nbformat";
import { CodeCellModel, ICellModel } from "@jupyterlab/cells";
import { RawNodeDatum } from "react-d3-tree/lib/types/types/common";
import { VerCell } from "../cell";
import { IObservableUndoableList } from "@jupyterlab/observables";

export namespace GhostToNotebookConverter {
  export async function convert(history: History, notebook: NodeyNotebook, createNewModel: Boolean = true, clickedNode: RawNodeDatum = undefined) {
    let start = new Date().getTime();
    const ver_notebook = history.notebook;
    if (!ver_notebook.canListen) return;  // Switch is already in progress, do not switch again

    // first match language of notebook
    let metadata = ver_notebook.metadata;
    let options: NotebookModel.IOptions = {};
    let lang = metadata?.get("language_info") as nbformat.ILanguageInfoMetadata;
    if (lang) options["languagePreference"] = lang.name;

    let model: INotebookModel;
    if (createNewModel) {
      // For generating a notebook from a ghostbook
      model = new NotebookModel(options);
    }
    else {
      // For applying the notebook to the current working notebook
      model = ver_notebook.view.notebook.model;

      // Disable listening events so all the changed cells do not create any checkpoints
      ver_notebook.canListen = false;

      // Remove all current cells
      //model.cells.clear();
      //ver_notebook.cells = [];

      // Prepare cell list to be of the correct length with placeholder cells.
      //model.cells.pushAll(new Array(notebook?.cells?.length).fill(null));
      // for (let i = 0; i < notebook?.cells?.length; i++)
      //   model.cells.push({
      //     id: i.toString(),
      //     type: "code",
      //     contentChanged: undefined,
      //     stateChanged: undefined,
      //     trusted: false,
      //     metadata: undefined,
      //     toJSON: function (): nbformat.ICell {
      //       throw new Error("Function not implemented.");
      //     },
      //     mimeTypeChanged: undefined,
      //     value: undefined,
      //     mimeType: "",
      //     selections: undefined,
      //     modelDB: undefined,
      //     isDisposed: false,
      //     dispose: function (): void {
      //       throw new Error("Function not implemented.");
      //     }
      //   });


      // Mark all VerCells as hidden through time travel,
      // so we can mark all the ones we add back to the notebook
      // as visible again at the end of this method
    }

    let prepDone = new Date().getTime();

    // now create cells
    let iCellModels: ICellModel[] = [];
    let iCellNames: string[] = [];
    //let verCells: VerCell[] = [];

    await Promise.all(notebook?.cells?.map(async (name, index) => {
      //for (const [index, name] of notebook?.cells?.entries()) {//map(async (name, index) => {
      let cell = history.store.get(name);
      let val: ICellModel;

      // create a CellModel with the Nodey's text
      if (cell instanceof NodeyCodeCell) {
        val = model.contentFactory.createCodeCell({});
        val.value.text = cell.literal || "";

        // create outputs if needed
        let output = history.store.getOutput(cell);
        if (output) {
          let nodeyOut = output.latest;
          let rawList = await Promise.all(
            nodeyOut.raw.map(async (raw) => {
              if (raw) {
                if (OutputHistory.isOffsite(raw)) {
                  raw = await history.store.fileManager.getOutput(raw);
                }
                return raw as nbformat.IOutput;
              }
              return null;
            })
          );
          rawList.forEach((raw, index) => {
            if (raw) {
              let out = (val as CodeCellModel).outputs.contentFactory.createOutputModel(
                { value: raw }
              );
              (val as CodeCellModel).outputs.set(index, out.toJSON());
            }
          });
        }
      } else if (cell instanceof NodeyMarkdown) {
        val = model.contentFactory.createMarkdownCell({});
        val.value.text = cell.markdown || "";
      } else if (cell instanceof NodeyRawCell) {
        val = model.contentFactory.createRawCell({});
        val.value.text = cell.literal || "";
      }
      //console.log("val", val);
      //console.log("cell", cell, cell.name);
      if (val) {
        // Add cell to Jupyter Notebook
        //model.cells.push(val);  // Do this later
        iCellModels[index] = val;
        iCellNames[index] = name;

        //ver_notebook.cells[index] = verCell;
      }
    })
    );
    let workDone = new Date().getTime();

    /*if (model.cells.length > 0) {
      console.log("model.cells has length", model.cells.length, "Clearing now");
      model.cells.clear();
    }*/
    let old_nodeyNotebook = ver_notebook.model;
    console.log("old_nodeyNotebook.cells", old_nodeyNotebook.cells);
    //let prevCellNames = getCellNames(model.cells, ver_notebook);
    //ver_notebook.getCell(null).
    //ver_notebook.getCell()
    //ver_notebook.view.notebook.widgets[i].model.
    insertICells(iCellModels, iCellNames, model.cells, JSON.parse(JSON.stringify(old_nodeyNotebook.cells)));// ver_notebook.cells.map(vc => vc.modelName), history);  // vc.model.name
    checkICells(iCellModels, model.cells);
    //model.cells.insertAll(0, iCellModels);
    let icellsDone = new Date().getTime();
    console.log(model.cells);
    console.log(iCellModels);
    console.log(ver_notebook.view.notebook.widgets);
    console.log(notebook.cells);
    console.log("FOR LOOP");
    ver_notebook.cells = [];
    for (let i = 0; i < model.cells.length; i++) {
      // Create corresponding VerCell and add it to the VerNotebook
      let verCell = new VerCell(ver_notebook, ver_notebook.view.notebook.widgets[i], notebook.cells[i]);  // notebook.cells[i] is the respective name of the nodey
      ver_notebook.cells[i] = verCell;
      //verCells[i] = verCell;
      //console.log(i, model.cells.get(i), verCell, iCellModels[i], ver_notebook.view.notebook.widgets[i], notebook.cells[i]);
    }
    //ver_notebook.cells = verCells;
    ver_notebook.canListen = true;  // Enable events again

    // Set current notebook index to the index of the checkpoint we clicked on:
    history.store.currentNotebookIndex = notebook.version;
    if (clickedNode != null) {
      history.store.setCurrentNodeDatum(clickedNode);
    }

    console.log("SWITCHING DONE");
    let everythingDone = new Date().getTime();

    let totalTime = everythingDone - start;
    let prepTime = prepDone - start;
    let workTime = workDone - prepDone;
    let icellsTime = icellsDone - workDone;
    let verCellsTime = everythingDone - icellsDone;
    console.log("prep:", prepTime, ", work:", workTime, ", icellsTime:", icellsTime, ", verCellSTime:", verCellsTime, ", total:", totalTime);
    console.log("clickedNode", clickedNode.attributes.notebook);


    return model;
  }

  /*const getCellNames = (cells: IObservableUndoableList<ICellModel>, ver_notebook: VerNotebook): string[] => {
    let names = [];
    for (let i = 0; i < cells.length; i++) {
      let verCell = ver_notebook.getCell(cells.get(i))
      names[i] = verCell.model.name;
    }
    return [];
  }*/

  const insertICells = (sourceCells: ICellModel[], sourceCellNames: string[], targetCells: IObservableUndoableList<ICellModel>, verCellNames: string[]) => {
    if (sourceCells.length !== sourceCellNames.length) console.error("sourceCell and sourceCellNames not equal in length!");
    if (targetCells.length !== verCellNames.length) console.error("targetCells and verCells not equal in length!");
    for (let i = 0; i < sourceCells.length; i++) {
      //history.store..get(verCellNames[i]).;
      //if ()
      console.log("sourceCellName", sourceCellNames[i], ", verCellName", verCellNames[i]);
      if (sourceCellNames[i] === verCellNames[i]) continue;   // Cell at current index is the same as before

      let vcIndex = verCellNames.findIndex(vc => vc === sourceCellNames[i]);
      if (vcIndex !== -1) {
        console.log("found elsewhere. Moving...");
        targetCells.move(vcIndex, i);
        array_move(verCellNames, vcIndex, i);
      } else {
        console.log("not found. Replacing...");
        targetCells.insert(i, sourceCells[i]);
        verCellNames.splice(i, 0, "");
      }
    }
    // Remove left-over cells at the end
    if (targetCells.length > sourceCells.length) targetCells.removeRange(sourceCells.length, targetCells.length);
  }

  // From https://stackoverflow.com/questions/5306680/move-an-array-element-from-one-array-position-to-another
  const array_move = (arr, old_index, new_index) => {
    if (new_index >= arr.length) {
      var k = new_index - arr.length + 1;
      while (k--) {
        arr.push(undefined);
      }
    }
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
    return arr; // for testing
  };

  const checkICells = (sourceCells: ICellModel[], targetCells: IObservableUndoableList<ICellModel>) => {
    if (sourceCells.length !== targetCells.length) {
      console.error("Switching failed: Different number of cells!");
      return;
    }
    sourceCells.forEach((c, i) => {
      if (c.value.text !== targetCells.get(i).value.text)
        console.error("Switching failed: Cell " + i + " has different content:", c.value.text, "vs.", targetCells.get(i).value.text);
    })
  }
}
