import {History} from "../../lilgit/model/history";

import {NodeyCell, NodeyMarkdown, NodeyOutput} from "../../lilgit/model/nodey";
import {CELL_TYPE} from "../../lilgit/model/sampler";

const CELL_SAMPLE = "v-VerdantPanel-cellList-sample";

export namespace CellSampler {
  export async function sampleCell(historyModel: History, cell: NodeyCell) {
    let sample = document.createElement("div");
    sample.classList.add(CELL_SAMPLE);
    sample.classList.add(cell.typeChar);
    let res = historyModel.inspector.sampleNode(cell);
    sample.textContent = res[0];
    if (cell.typeChar === "m") {
      sample.classList.add("markdown");
      sample.classList.add("jp-RenderedHTMLCommon");
      sample.classList.add("markdown-sample");
      await historyModel.inspector.renderArtifactCell(
        cell,
        sample,
        CELL_TYPE.MARKDOWN,
        (cell as NodeyMarkdown).markdown,
      );
    }

    sample.addEventListener("click", () => {
      //TODO Try to get notebook to scroll to the cell clicked on
    });
    return sample;
  }

  export function sampleOutput(
    historyModel: History,
    output: NodeyOutput
  ): HTMLElement {
    let sample = document.createElement("div");
    sample.classList.add(CELL_SAMPLE);
    historyModel.inspector.renderArtifactCell(
      output,
      sample,
      CELL_TYPE.OUTPUT
    );
    return sample;
  }
}
