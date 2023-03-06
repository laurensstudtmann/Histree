import { connect, ConnectedProps } from "react-redux";
import * as React from "react";
import { verdantState } from "verdant/verdant-ui/redux";
// import { Checkpoint } from "verdant/verdant-model/checkpoint";
import Tree from 'react-d3-tree';
import { RawNodeDatum, TreeNodeDatum } from "react-d3-tree/lib/types/types/common";
import { GhostToNotebookConverter } from "../../../verdant-model/jupyter-hooks/ghost-to-ipynb";
import { log } from "../../../verdant-model/notebook";
import { PlayIcon, PlusIcon, SaveIcon, MoveIcon, SwapIcon } from "../../../verdant-ui/icons";
import HoverMenu from "./hover-menu";
import ReactDOM from "react-dom";
import { HierarchyPointNode } from 'd3-hierarchy';


const renderIcon = (changeType: string) => {
  if (changeType === "add")
    return <PlusIcon></PlusIcon>
  else if (changeType === "save")
    return <SaveIcon></SaveIcon>
  else if (changeType === "execute")
    return <PlayIcon></PlayIcon>
  else if (changeType === "move")
    return <MoveIcon></MoveIcon>
  else if (changeType === "changeCellType")
    return <SwapIcon></SwapIcon>
}

/*const makeTreeData = (checkpoints: Checkpoint[]) => {
  let res = { name: "root", children: [] };
  return buildTreeRecursive(checkpoints, 0, res);
};

const buildTreeRecursive = (checkpoints: Checkpoint[], index: number, currentNode: VerTreeNodeDatum) => {
  if (index < checkpoints.length) {
    let nextNode = buildTreeRecursive(checkpoints, index + 1, { name: checkpoints[index].notebook.toString(), attributes: { notebook: checkpoints[index].notebook }, children: [] });
    currentNode.children.push(nextNode);
  }
  return currentNode;
};*/

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

export interface VerTreeNodeDatum extends RawNodeDatum {
  attributes?: {
    notebook: number,
    parentNotebook: number,
    changeType: string
  },
}

type TreeTab_Props = ConnectedProps<typeof connector>;
type TreeTab_State = {
  showHoverMenu: boolean,
  hoverX: number,
  hoverY: number,
  hoverNodeDatum: VerTreeNodeDatum,
}
class TreeTab extends React.Component<TreeTab_Props, TreeTab_State> {
  currentNotebookIndex: number

  constructor(props: TreeTab_Props) {
    super(props);
    this.state = { showHoverMenu: false, hoverX: 100, hoverY: 100, hoverNodeDatum: null };
  }

  render() {
    this.currentNotebookIndex = this.props.history.store.currentNotebookIndex;
    console.log(this.state);
    return (
      <div className="full-height">
        <style>{css}</style>
        {ReactDOM.createPortal(
          <HoverMenu
            show={this.state.showHoverMenu}
            x={this.state.hoverX}
            y={this.state.hoverY}
            nodeDatum={this.state.hoverNodeDatum}
            history={this.props.history} />,
          document.body)}
        <div>{"asdf" + this.props.currentNodeName}</div>
        {/* <img src={playCustom} /> */}
        <Tree data={this.props.treeData}
          rootNodeClassName="node__all"
          branchNodeClassName="node__all"
          leafNodeClassName="node__all"
          orientation="vertical"
          nodeSize={nodeSize}
          zoom={0.65}
          collapsible={false}
          renderCustomNodeElement={(rd3tProps) => this.renderForeignObjectNode({ ...rd3tProps, foreignObjectProps })}
          onNodeClick={(node) => this.handleNodeClick(node)}
        />
      </div>
    );
  }

  // Here we're using `renderCustomNodeElement` render a component that uses
  // both SVG and HTML tags side-by-side.
  // This is made possible by `foreignObject`, which wraps the HTML tags to
  // allow for them to be injected into the SVG namespace.
  renderForeignObjectNode({
    nodeDatum,
    onNodeClick,
    toggleNode,
    foreignObjectProps,
  }) {
    return <g pointerEvents="visible"
      onMouseDown={() => console.log("mousedown")}//this.handleMouseLeave(nodeDatum)}
      onClick={onNodeClick}
      onMouseEnter={(event) => this.handleMouseEnter(event, nodeDatum)}
      onMouseLeave={() => this.handleMouseLeave(nodeDatum)}>
      <circle r={15} fill={nodeDatum.attributes.changeType === "add" ? "#43A047" : "#1E88E5"} stroke="none">
      </circle>
      {renderIcon(nodeDatum.attributes.changeType)}
      {nodeDatum.attributes.notebook === this.currentNotebookIndex && (
        <circle r={20} fill="none" stroke={nodeDatum.attributes.changeType === "add" ? "#43A047" : "#1E88E5"} strokeWidth="3px" />
      )}
      {/* `foreignObject` requires width & height to be explicitly set. */}
      {false && (
        <foreignObject {...foreignObjectProps}>
          <div style={{ verticalAlign: "top", textAlign: "center" }}>{nodeDatum.name}</div>
        </foreignObject>
      )}
    </g>
  }

  handleNodeClick(node: HierarchyPointNode<TreeNodeDatum>) {
    let nodeDatum: TreeNodeDatum = node.data;
    if (nodeDatum.attributes == null || nodeDatum.attributes.notebook == null) {
      console.log("vernotebook cells", this.props.history.notebook.cells, this.props.history.notebook.cells.map(c => c.modelName));
      return; // Do not do anything when root node is clicked
    }
    GhostToNotebookConverter.convert(this.props.history, this.props.history.store.getNotebook(nodeDatum.attributes.notebook as number), false, nodeDatum)
      .then(this.props.switchCheckpoint);
  }

  handleMouseEnter(event: React.MouseEvent<SVGGElement, MouseEvent>, nodeDatum: VerTreeNodeDatum) {
    let pos = event.currentTarget.getBoundingClientRect();
    this.setState({ hoverX: pos.right, hoverY: pos.top, showHoverMenu: true, hoverNodeDatum: nodeDatum })
    console.log("enteringg ", nodeDatum.name);
  }
  handleMouseLeave(nodeDatum: VerTreeNodeDatum) {
    console.log("leaving ", nodeDatum.name);
    this.setState({ showHoverMenu: false, hoverNodeDatum: null });
  }
}

const mapStateToProps = (state: verdantState) => {
  let history = state.getHistory();
  let checkpoints = history.checkpoints.all();
  let numberOfCheckpoints = checkpoints.length; // Workaround to get React to rerender the component when a checkpoint is added
  let currentNodeName = history.store.currentNode.name;  // Another workaround for rerendering
  // Do a shallow copy of the history tree data structure to force a rerender (react-d3-tree does not update otherwise)
  let treeData = Object.assign({ attributes: { numberOfCheckpoints } }, history.store.historyTree);

  // let treeDataLinear = makeTreeData(checkpoints);   // Linear version of the tree for comparison (debugging purposes)
  log(treeData);
  return { checkpoints, history, numberOfCheckpoints, currentNodeName, treeData };
};

const mapDispatchToProps = {
  switchCheckpoint: () => ({ type: "SWITCH_CHECKPOINT" }),
}

const connector = connect(mapStateToProps, mapDispatchToProps);

export default connector(TreeTab);