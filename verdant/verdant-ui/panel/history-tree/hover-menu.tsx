import * as React from "react";
import { DIFF_TYPE } from "../../../verdant-model/sampler";
// import { RawNodeDatum } from "react-d3-tree/lib/types/types/common";
import { VerTreeNodeDatum } from ".";
import { History } from "../../../verdant-model/history";
import { ChangeType } from "../../../verdant-model/checkpoint";

/*const useConstructor = (callBack = () => { }) => {
  const [hasBeenCalled, setHasBeenCalled] = React.useState(false);
  if (hasBeenCalled) return;
  callBack();
  setHasBeenCalled(true);
}*/

const renderDiff = (props: HoverMenuProps, notebook_number: number) => {
  console.log("creating diff...");
  const notebook = props.nodeDatum.attributes.notebook;

  const checkpoint = props.history.checkpoints.all()[notebook];
  if (checkpoint == null) return { elementsPromise: null, changeTypes: null, affectedCells: null, notebook_number: null };
  const nodeys = checkpoint.targetCells.map(cell => props.history.store.get(cell.cell));
  const changeTypes = checkpoint.targetCells.map(cell => cell.changeType);
  const affectedCells = checkpoint.targetCells.map(cell => {
    let [, cellNumber,] = cell.cell.split(".");
    return cellNumber
  });

  const parentNode = props.history.store.getParentNode(props.nodeDatum) as VerTreeNodeDatum | undefined;
  const parentNumber = parentNode?.attributes?.notebook;
  const diffType = parentNode ? DIFF_TYPE.TREE_CHANGE_DIFF : DIFF_TYPE.NO_DIFF;
  const elementsPromise = Promise.all(nodeys.map(nodey => props.history.inspector.diff.renderCell(nodey, diffType, parentNumber)));
  return { elementsPromise, changeTypes, affectedCells, notebook_number };
}

type DiffMenuType = {
  elements: HTMLElement[],
  changeTypes: ChangeType[],
  affectedCells: string[],
  notebook_number: number,
}
type HoverMenuProps = {
  show: boolean,
  x: number,
  y: number,
  nodeDatum: VerTreeNodeDatum,
  history: History
}
const HoverMenu = (props: HoverMenuProps) => {
  console.log("Rendering Hovermenu...", props.nodeDatum?.attributes.notebook);
  const [diff, setDiff]: [DiffMenuType, React.Dispatch<DiffMenuType>] = React.useState(undefined);

  // Request diff if we do not have one, or we have a diff for a different node
  if (props.show && props.nodeDatum != null && (diff == null || diff.notebook_number !== props.nodeDatum.attributes.notebook)) {
    let { elementsPromise, changeTypes, affectedCells, notebook_number } = renderDiff(props, props.nodeDatum.attributes.notebook);
    elementsPromise?.then(elements => {
      console.log("Setting notebook", notebook_number);
      setDiff({ elements, changeTypes, affectedCells, notebook_number });
    });
  }

  // Render if our props told us to, there is a diff available, and it is the diff for the current node
  const visible = props.show && props.nodeDatum != null && diff?.notebook_number === props.nodeDatum.attributes.notebook;
  return (
    <div style={{
      position: "absolute",
      backgroundColor: "#eee",
      borderRadius: "5px",
      boxSizing: "border-box",
      left: props.x,
      top: props.y,
      visibility: visible ? 'visible' : 'hidden'

    }} className="hover-menu-container" >
      {props.nodeDatum?.name}
      <HoverMenuDiff diff={diff} />
    </div >
  );
};

const HoverMenuDiff = (props: { diff: DiffMenuType }) => {
  return (
    <div>
      {props.diff && props.diff.elements &&
        props.diff.elements.map((element, i) =>
          <div key={i}>
            <div>Cell {props.diff.affectedCells[i]} was {props.diff.changeTypes[i]}.</div>
            <div dangerouslySetInnerHTML={{
              __html: element.outerHTML,
            }} />
          </div>
        )
      }
      {props.diff && props.diff.elements.length === 0 &&
        <div>Cell was executed</div>
      }
    </div>)
}


export default HoverMenu;