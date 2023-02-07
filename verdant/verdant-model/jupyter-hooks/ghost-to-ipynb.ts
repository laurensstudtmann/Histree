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

export namespace GhostToNotebookConverter {
  export async function convert(history: History, notebook: NodeyNotebook, createNewModel: Boolean = true, clickedNode: RawNodeDatum = undefined) {
    const ver_notebook = history.notebook;

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
      model.cells.clear();

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
      ver_notebook.cells.forEach(c => c.hiddenThroughTimetravel = true);
    }

    // now create cells
    //await Promise.all(
      for (const [index, name] of notebook?.cells?.entries()) {//map(async (name, index) => {
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
        console.log("val", val);
        console.log("cell", cell, cell.name);
        if (val) {
          model.cells.push(val);
          let verCell = ver_notebook.getCellByNode(cell);
          console.log("vercell", verCell);
          console.log("ver_notebook.cells", ver_notebook.cells, ver_notebook.cells.map(c => c.model.name));

          if (verCell == null) {
            // No exact match found for the cell. Get the different version of the cell.
            verCell = ver_notebook.getRelatedCellByNode(cell);
            //verCell.model.version = cell.version;
            verCell.setModel(cell.name);
            // TODO: Are there instances where multiple VerCells could be found here?
            // Or where verCell would still be null here?
          }
          verCell.view = ver_notebook.view.notebook.widgets[index];
          verCell.hiddenThroughTimetravel = false;
          // Set current notebook index to the index of the checkpoint we clicked on:
          history.store.currentNotebookIndex = notebook.version;
          if (clickedNode != null) {

            history.store.setCurrentNodeDatum(clickedNode);
          }
        }
      }//)
    //);
    ver_notebook.canListen = true;  // Enable events again
    return model;
  }
}
