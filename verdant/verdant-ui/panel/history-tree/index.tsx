import { connect, ConnectedProps } from "react-redux";
import * as React from "react";
import { verdantState } from "verdant/verdant-ui/redux";
// import { Checkpoint } from "verdant/verdant-model/checkpoint";
// import Tree from 'react-d3-tree';
import { RawNodeDatum, TreeNodeDatum } from "react-d3-tree/lib/types/types/common";
import { GhostToNotebookConverter } from "../../../verdant-model/jupyter-hooks/ghost-to-ipynb";
import { log } from "../../../verdant-model/notebook";
import { PlayIcon, PlusIcon, SaveIcon, MoveIcon, SwapIcon, DeleteIcon } from "../../../verdant-ui/icons";
import HoverMenu from "./hover-menu";
import ReactDOM from "react-dom";
import { HierarchyPointNode } from 'd3-hierarchy';
import BottomMessage from "./bottom-message";
import VerdantCustomTree from "./verdant-custom-tree";


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
  else if (changeType === "delete")
    return <DeleteIcon></DeleteIcon>
}

const getNodeColor = (changeType: string, darken: boolean = false) => {
  if (changeType === "add")
    return "#43A047";
  else if (changeType === "delete")
    return "#FF5722";
  else
    return darken ? "#1565C0" : "#1E88E5";
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
  showMessage: Boolean,
  messageText: string,
  containerWidth: number | null,
}
class TreeTab extends React.Component<TreeTab_Props, TreeTab_State> {
  currentNotebookIndex: number
  containerRef: React.RefObject<HTMLDivElement>

  constructor(props: TreeTab_Props) {
    super(props);
    this.containerRef = React.createRef();
    this.state = { showHoverMenu: false, hoverX: 100, hoverY: 100, hoverNodeDatum: null, showMessage: false, messageText: undefined, containerWidth: undefined };
  }

  componentDidMount(): void {
    this.setState({ containerWidth: this.containerRef.current?.offsetWidth ?? null })
  }

  render() {
    this.currentNotebookIndex = this.props.history.store.currentNotebookIndex;
    return (
      <div className="full-height" ref={this.containerRef}>
        <style>{css}</style>
        {ReactDOM.createPortal(
          <HoverMenu
            show={this.state.showHoverMenu}
            x={this.state.hoverX}
            y={this.state.hoverY}
            nodeDatum={this.state.hoverNodeDatum}
            history={this.props.history} />,
          document.body)}
        {/* <div>{"asdf" + this.props.currentNodeName}</div> */}
        {/* <img src={playCustom} /> */}
        <VerdantCustomTree data={this.props.treeData}
          rootNodeClassName="node__all"
          branchNodeClassName="node__all"
          leafNodeClassName="node__all"
          orientation="vertical"
          nodeSize={nodeSize}
          pathFunc="straight"
          translate={{ x: this.state.containerWidth ? this.state.containerWidth / 2 : 50, y: 50 }}
          zoom={0.65}
          collapsible={true}
          renderCustomNodeElement={(rd3tProps) => this.renderForeignObjectNode({ ...rd3tProps, foreignObjectProps })}
          onNodeClick={(node) => this.handleNodeClick(node)}
        />
        <BottomMessage message={this.state.messageText} show={this.state.showMessage} setShow={(val) => this.setState({ showMessage: val })}></BottomMessage>
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
    const fillColor = getNodeColor(nodeDatum.attributes.changeType);
    const darkFillColor = getNodeColor(nodeDatum.attributes.changeType, true);
    const execCount = nodeDatum.attributes.notebook != null ? this.props.history.checkpoints.all()[nodeDatum.attributes.notebook].mergeCount + 1 : 0;
    return <g pointerEvents="visible"
      onClick={onNodeClick}
      onContextMenu={(event) => this.handleContextMenu(event, nodeDatum, toggleNode)}
      onMouseEnter={(event) => this.handleMouseEnter(event, nodeDatum)}
      onMouseLeave={() => this.handleMouseLeave()}>
      <circle r={15} fill={fillColor} stroke="none">
      </circle>
      {renderIcon(nodeDatum.attributes.changeType)}
      {nodeDatum.attributes.notebook === this.currentNotebookIndex && (
        <circle r={20} fill="none" stroke={fillColor} strokeWidth="3px" />
      )}
      {execCount > 1 && (
        <>
          <circle r={10} cx={12} cy={-12} fill={darkFillColor} stroke="none"></circle>
          <text dx={12} dy={-7.5} textAnchor="middle" fill="#fff" stroke="none" fontSize="14px" fontWeight="bold">{execCount}</text>
        </>
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
    const kernel = this.props.history.notebook.view.panel.sessionContext.session.kernel;
    if (kernel.status === "busy") {
      console.log("HISTORY TREE: KERNEL BUSY");
      this.setState({ showMessage: true, messageText: "Cannot switch checkpoints because the kernel is busy!" });
      return;
    }
    let nodeDatum: TreeNodeDatum = node.data;
    if (nodeDatum.attributes == null || nodeDatum.attributes.notebook == null) {
      console.log("vernotebook cells", this.props.history.notebook.cells, this.props.history.notebook.cells.map(c => c.modelName));
      return; // Do not do anything when root node is clicked
    }
    GhostToNotebookConverter.convert(this.props.history, this.props.history.store.getNotebook(nodeDatum.attributes.notebook as number), false, nodeDatum)
      .then(this.props.switchCheckpoint);
  }

  handleContextMenu(event: React.MouseEvent, node: TreeNodeDatum, toggleNode: () => void) {
    event.preventDefault();   // Do not show normal context menu
    toggleNode();
    console.log("context menu", node.name);
  }

  handleMouseEnter(event: React.MouseEvent<SVGGElement, MouseEvent>, nodeDatum: VerTreeNodeDatum) {
    let pos = event.currentTarget.getBoundingClientRect();
    this.setState({ hoverX: pos.right, hoverY: pos.top, showHoverMenu: true, hoverNodeDatum: nodeDatum })
  }
  handleMouseLeave() {
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