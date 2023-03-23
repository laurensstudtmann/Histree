import * as React from "react";
import { DIFF_TYPE } from "../../../verdant-model/sampler";
// import { RawNodeDatum } from "react-d3-tree/lib/types/types/common";
import { VerTreeNodeDatum } from ".";
import { History } from "../../../verdant-model/history";
import { ChangeType } from "../../../verdant-model/checkpoint";
//import { NodeyCodeCell } from "../../../verdant-model/nodey";

/*const useConstructor = (callBack = () => { }) => {
  const [hasBeenCalled, setHasBeenCalled] = React.useState(false);
  if (hasBeenCalled) return;
  callBack();
  setHasBeenCalled(true);
}*/

const renderDiff = (props: HoverMenuProps, notebook_number: number) => {
  const notebook = props.nodeDatum.attributes.notebook;

  const checkpoint = props.history.checkpoints.all()[notebook];
  if (checkpoint == null) return { elementsPromise: null, outputsPromise: null, changeTypes: null, affectedCells: null, notebook_number: null };
  const nodeys = checkpoint.targetCells.map(cell => props.history.store.get(cell.cell));
  const outputNodeys = checkpoint.targetCells.map(cell => {
    if (!(cell.output?.length > 0)) return undefined;
    return props.history.store.get(cell.output[0]);
  });
  const changeTypes = checkpoint.targetCells.map(cell => cell.changeType);
  const affectedCells = checkpoint.targetCells.map(cell => {
    let [, cellNumber,] = cell.cell.split(".");
    return cellNumber
  });

  const parentNode = props.history.store.getParentNode(props.nodeDatum) as VerTreeNodeDatum | undefined;
  const parentNumber = parentNode?.attributes?.notebook;
  const diffType = parentNode ? DIFF_TYPE.TREE_CHANGE_DIFF : DIFF_TYPE.NO_DIFF;
  const elementsPromise = Promise.all(nodeys.map(nodey => props.history.inspector.diff.renderCell(nodey, diffType, parentNumber)));
  const outputsPromise = Promise.all(outputNodeys.map(outputNodey => {
    if (outputNodey == null) return undefined;
    return props.history.inspector.diff.renderCell(outputNodey, diffType, parentNumber);
  }));
  return { elementsPromise, outputsPromise, changeTypes, affectedCells, notebook_number, mergeCount: checkpoint.mergeCount };
}

type DiffMenuType = {
  elements: HTMLElement[],
  outputs: HTMLElement[],
  changeTypes: ChangeType[],
  affectedCells: string[],
  notebook_number: number,
  mergeCount: number,
}
type HoverMenuProps = {
  show: boolean,
  x: number,
  y: number,
  nodeDatum: VerTreeNodeDatum,
  history: History
}
const HoverMenu = (props: HoverMenuProps) => {
  const [diff, setDiff]: [DiffMenuType, React.Dispatch<DiffMenuType>] = React.useState(undefined);
  const [height, setHeight] = React.useState(0);
  const hoverRef = React.useRef(null);

  React.useEffect(() => {
    if (hoverRef.current && hoverRef.current.clientHeight !== height) {
      setHeight(hoverRef.current.clientHeight);
    }
  }, [diff]);
  //const height = hoverRef.current ? hoverRef.current.clientHeight : 0;

  const availableSpace = window.innerHeight - props.y - 5;  // Leave a margin at the bottom
  const yCoord = height > availableSpace
    ? props.y - (height - availableSpace)
    : props.y;

  // Request diff if we do not have one, or we have a diff for a different node
  let shouldRequestDiff =
    props.show &&
    props.nodeDatum != null &&
    (
      diff == null ||
      diff.notebook_number !== props.nodeDatum.attributes.notebook ||
      diff.mergeCount !== props.history.checkpoints.all()[props.nodeDatum.attributes.notebook].mergeCount
    )

  if (shouldRequestDiff) {
    let { elementsPromise, outputsPromise, changeTypes, affectedCells, notebook_number, mergeCount } = renderDiff(props, props.nodeDatum.attributes.notebook);
    if (elementsPromise != null) {
      Promise.all([elementsPromise, outputsPromise]).then(([elements, outputs]) => {
        setDiff({ elements, outputs, changeTypes, affectedCells, notebook_number, mergeCount });
      });
    }
  }

  // Render if our props told us to, there is a diff available, and it is the diff for the current node
  const visible = props.show && props.nodeDatum != null && (diff?.notebook_number === props.nodeDatum.attributes.notebook);
  return (
    <div
      ref={hoverRef}
      style={{
        position: "absolute",
        backgroundColor: "#fff",
        borderRadius: "5px",
        boxSizing: "border-box",
        boxShadow: "0px 0px 5px rgba(0, 0, 0, 0.4)",
        padding: "2px 5px 5px 5px",
        left: props.x,
        top: yCoord >= 5 ? yCoord : 5,  // Leave a margin at the top
        visibility: visible ? 'visible' : 'hidden',
        maxHeight: window.innerHeight - 10,
        overflow: "auto",
      }}>
      {/* {props.nodeDatum?.name} */}
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
            <div
              dangerouslySetInnerHTML={{
                __html: element.outerHTML,
              }} />
            {props.diff.outputs[i] &&
              <div>
                <div>Output of cell {props.diff.affectedCells[i]} was changed.</div>
                <div dangerouslySetInnerHTML={{
                  __html: props.diff.outputs[i].outerHTML,
                }} />
              </div>
            }
          </div>
        )
      }
      {props.diff?.elements?.length === 0 &&
        <div>Cell was executed</div>
      }
    </div>)
}


export default HoverMenu;