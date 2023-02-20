import { connect } from "react-redux";
import * as React from "react";
import { verdantState } from "verdant/verdant-ui/redux";
import { History } from "../../../verdant-model/history";
import { Checkpoint } from "verdant/verdant-model/checkpoint";
import Tree from 'react-d3-tree';
import { RawNodeDatum, TreeNodeDatum } from "react-d3-tree/lib/types/types/common";
import { GhostToNotebookConverter } from "../../../verdant-model/jupyter-hooks/ghost-to-ipynb";
import { log } from "../../../verdant-model/notebook";
import { PlayIcon, PlusIcon, SaveIcon, MoveIcon, SwapIcon } from "../../../verdant-ui/icons";
//import playCustom from "playCustom.png";

//const PANEL = "v-VerdantPanel-content";

/*const orgChart = {
  name: 'CEO',
  children: [
    {
      name: 'Manager',
      attributes: {
      },
      children: [
        {
          name: 'Foreman',
          attributes: {
          },
          children: [
            {
              name: 'Worker',
            },
          ],
        },
        {
          name: 'Foreman',
          attributes: {
          },
          children: [
            {
              name: 'Worker',
            },
          ],
        },
      ],
    },
  ],
};
*/

// Here we're using `renderCustomNodeElement` render a component that uses
// both SVG and HTML tags side-by-side.
// This is made possible by `foreignObject`, which wraps the HTML tags to
// allow for them to be injected into the SVG namespace.
const renderForeignObjectNode = ({
  nodeDatum,
  onNodeClick,
  toggleNode,
  foreignObjectProps,
  currentNotebookIndex
}) => (
  <g>
    <circle r={15} fill={nodeDatum.attributes.changeType === "add" ? "#43A047" : "#1E88E5"} stroke="none" onClick={onNodeClick}>
    </circle>
    {renderIcon(nodeDatum.attributes.changeType, onNodeClick)}
    {nodeDatum.attributes.notebook === currentNotebookIndex && (
      <circle r={20} fill="none" stroke={nodeDatum.attributes.changeType === "add" ? "#43A047" : "#1E88E5"} strokeWidth="3px" />
    )}
    {/* `foreignObject` requires width & height to be explicitly set. */}
    {false && (
      <foreignObject {...foreignObjectProps}>
        <div style={{ verticalAlign: "top", textAlign: "center" }}>{nodeDatum.name}</div>
      </foreignObject>
    )}
  </g>
);

const renderIcon = (changeType: string, onNodeClick: any) => {
  if (changeType === "add")
    return <PlusIcon onClick={onNodeClick}></PlusIcon>
  else if (changeType === "save")
    return <SaveIcon onClick={onNodeClick}></SaveIcon>
  else if (changeType === "execute")
    return <PlayIcon onClick={onNodeClick}></PlayIcon>
  else if (changeType === "move")
    return <MoveIcon onClick={onNodeClick}></MoveIcon>
  else if (changeType === "changeCellType")
    return <SwapIcon onClick={onNodeClick}></SwapIcon>
}

const makeTreeData = (checkpoints: Checkpoint[]) => {
  let res = { name: "root", children: [] };
  return buildTreeRecursive(checkpoints, 0, res);
};

const buildTreeRecursive = (checkpoints: Checkpoint[], index: number, currentNode: RawNodeDatum) => {
  if (index < checkpoints.length) {
    let nextNode = buildTreeRecursive(checkpoints, index + 1, { name: checkpoints[index].notebook.toString(), attributes: { notebook: checkpoints[index].notebook }, children: [] });
    currentNode.children.push(nextNode);
  }
  return currentNode;
};

const handleNodeClick = (node: any, history: History) => {
  let nodeDatum: TreeNodeDatum = node.data;
  if (nodeDatum.attributes == null || nodeDatum.attributes.notebook == null) {
    console.log("vernotebook cells", history.notebook.cells, history.notebook.cells.map(c => c.model.name));
    return; // Do not do anything when root node is clicked
  }
  GhostToNotebookConverter.convert(history, history.store.getNotebook(nodeDatum.attributes.notebook as number), false, nodeDatum);
}

let css = `
    .node__all > circle {
      fill: #bbb;
      stroke-width: 1px;
    }

    .full-height {
      height: 100%
    }
    `;
const nodeSize = { x: 40, y: 40 };
const foreignObjectProps = { width: nodeSize.x + 5, height: nodeSize.y, x: 18, y: -10 };

type TreeTab_Props = {
  checkpoints: Checkpoint[];
  history: History
  numberOfCheckpoints: number
  treeData: RawNodeDatum
  treeDataLinear: RawNodeDatum
}
class TreeTab extends React.Component<TreeTab_Props> {
  render() {
    const currentNotebookIndex = this.props.history.store.currentNotebookIndex;
    return (
      <div className="full-height">
        <style>{css}</style>
        {/* <img src={playCustom} /> */}
        <Tree data={this.props.treeData}
          rootNodeClassName="node__all"
          branchNodeClassName="node__all"
          leafNodeClassName="node__all"
          orientation="vertical"
          nodeSize={nodeSize}
          zoom={0.65}
          collapsible={false}
          renderCustomNodeElement={(rd3tProps) => renderForeignObjectNode({ ...rd3tProps, foreignObjectProps, currentNotebookIndex })}
          onNodeClick={(node) => handleNodeClick(node, this.props.history)}
        />
      </div>
    );
  }
}

const mapStateToProps = (state: verdantState) => {
  let history = state.getHistory();
  let checkpoints = history.checkpoints.all();
  let numberOfCheckpoints = checkpoints.length; // Workaround to get React to rerender the component when a checkpoint is added

  // Do a shallow copy of the history tree data structure to force a rerender (react-d3-tree does not update otherwise)
  let treeData = Object.assign({ attributes: { numberOfCheckpoints } }, history.store.historyTree);

  let treeDataLinear = makeTreeData(checkpoints);   // Linear version of the tree for comparison (debugging purposes)
  log(treeData);
  return { checkpoints, history, numberOfCheckpoints, treeData, treeDataLinear };
};

export default connect(mapStateToProps, null)(TreeTab)