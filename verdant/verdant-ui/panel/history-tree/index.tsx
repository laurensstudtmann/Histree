import { connect, ConnectedProps } from "react-redux";
import * as React from "react";
import { verdantState } from "verdant/verdant-ui/redux";
import { TreeNodeDatum } from "react-d3-tree/lib/types/types/common";
import { GhostToNotebookConverter } from "../../../verdant-model/jupyter-hooks/ghost-to-ipynb";
import { PlayIcon, PlusIcon, SaveIcon, MoveIcon, SwapIcon, DeleteIcon, VerticalDotsIcon, StarIcon, PinIcon } from "../../../verdant-ui/icons";
import HoverMenu from "./hover-menu";
import ReactDOM from "react-dom";
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

    .context-menu {
      z-index: 100;
      background-color: white;
      border-radius: 5px;
      border-sizing: border-box !important;
      box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.4);
    }
    
    .context-menu button {
      display: block;
      width: 100%;
      padding: 5px 10px 5px 10px;
      border: none;
      border-radius: 5px;
      background-color: transparent;
      cursor: pointer;
      text-align: left;
    }
    
    .context-menu button:hover {
      background-color: #f5f5f5;
    }

    .context-menu * {
      box-sizing: border-box;
    }

    .pin {

    }
    `;
const nodeSize = { x: 40, y: 40 };
const foreignObjectProps = { width: nodeSize.x + 5, height: nodeSize.y, x: 18, y: -10 };

export interface VerTreeNodeDatum extends TreeNodeDatum {
  children?: VerTreeNodeDatum[],
  attributes?: {
    notebook: number,
    parentNotebook: number,
    changeType: string,
    isHighlighted?: boolean  // For highlighting relevant nodes
    isBookmarked?: boolean
  },
}

type TreeTab_Props = ConnectedProps<typeof connector>;
type TreeTab_State = {
  showHoverMenu: boolean,
  showHoverMenuOverride: boolean,
  pinHovered: boolean,
  hoverX: number,
  hoverY: number,
  hoverNodeDatum: VerTreeNodeDatum,
  showMessage: boolean,
  messageText: string,
  containerWidth: number | null,
  contextMenuProps: { show: boolean, x: number, y: number, nodeDatum: VerTreeNodeDatum }
}
class TreeTab extends React.Component<TreeTab_Props, TreeTab_State> {
  currentNotebookIndex: number
  containerRef: React.RefObject<HTMLDivElement>
  contextMenu: HTMLDivElement
  hoverMenu: HTMLElement

  constructor(props: TreeTab_Props) {
    super(props);
    this.containerRef = React.createRef();
    this.state = {
      showHoverMenu: false,
      showHoverMenuOverride: false,
      pinHovered: false,
      hoverX: 100,
      hoverY: 100,
      hoverNodeDatum: null,
      showMessage: false,
      messageText: undefined,
      containerWidth: undefined,
      contextMenuProps: null,
    };

    // Bind event handlers for correct 'this' inside handler
    this.handleClickOutside = this.handleClickOutside.bind(this);
  }

  componentDidMount(): void {
    this.setState({ containerWidth: this.containerRef.current?.offsetWidth ?? null })
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
  }

  render() {
    this.currentNotebookIndex = this.props.history.store.currentNotebookIndex;
    return (
      <div className="full-height" ref={this.containerRef}>
        <style>{css}</style>
        {ReactDOM.createPortal(
          <div ref={el => this.hoverMenu = el}>
            <HoverMenu
              show={this.state.showHoverMenu || this.state.showHoverMenuOverride}
              x={this.state.hoverX}
              y={this.state.hoverY}
              nodeDatum={this.state.hoverNodeDatum}
              history={this.props.history} />
          </div>,
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
          scaleExtent={{ max: 2, min: 0.1 }}
          collapsible={true}
          renderCustomNodeElement={(rd3tProps) => // Get the proper reference from the store instead of the copy provided by the rd3tProps
            this.renderForeignObjectNode(this.props.history.store.getNodeByNotebookIndex(rd3tProps.nodeDatum.attributes.notebook as number), foreignObjectProps)}
        />
        {/* Context Menu for right clicking on a node */}
        {this.state.contextMenuProps?.show && ReactDOM.createPortal(
          <div
            ref={el => (this.contextMenu = el)}
            style={{
              position: 'absolute',
              top: this.state.contextMenuProps.y,
              left: this.state.contextMenuProps.x,
            }}
            className="context-menu"
          >
            <button onClick={() => this.toggleNode(this.state.contextMenuProps?.nodeDatum)}>
              {this.state.contextMenuProps?.nodeDatum?.__rd3t.collapsed ? "Expand Node" : "Collapse Node"}
            </button>
            <button onClick={() => this.toggleBookmark(this.state.contextMenuProps?.nodeDatum)}>
              {this.state.contextMenuProps?.nodeDatum.attributes.isBookmarked ? "Remove Bookmark" : "Bookmark Node"}
            </button>
          </div>,
          document.body)}
        <BottomMessage message={this.state.messageText} show={this.state.showMessage} setShow={(val) => this.setState({ showMessage: val })}></BottomMessage>
      </div>
    );
  }

  // Here we're using `renderCustomNodeElement` render a component that uses
  // both SVG and HTML tags side-by-side.
  // This is made possible by `foreignObject`, which wraps the HTML tags to
  // allow for them to be injected into the SVG namespace.
  renderForeignObjectNode(
    nodeDatum: VerTreeNodeDatum,
    foreignObjectProps,
  ) {
    const fillColor = getNodeColor(nodeDatum.attributes.changeType);
    const darkFillColor = getNodeColor(nodeDatum.attributes.changeType, true);
    const execCount = nodeDatum.attributes.notebook != null ? this.props.history.checkpoints.all()[nodeDatum.attributes.notebook].mergeCount + 1 : 0;

    const showPinButton = (this.state.showHoverMenu || this.state.showHoverMenuOverride) && nodeDatum.attributes.notebook === this.state.hoverNodeDatum.attributes.notebook;
    const pinOpacity = this.state.showHoverMenuOverride
      ? 1
      : (this.state.pinHovered ? 0.7 : 0.3);
    return <g pointerEvents="visible"
      onClick={() => this.handleNodeClick(nodeDatum)}
      onContextMenu={(event) => this.handleContextMenu(event, nodeDatum)}
      onMouseEnter={(event) => this.handleMouseEnter(event, nodeDatum)}
      onMouseLeave={() => this.handleMouseLeave()}>
      {/* Main node circle */}
      <circle r={15} fill={fillColor} stroke="none">
      </circle>
      {renderIcon(nodeDatum.attributes.changeType)}
      {/* Pin button */}
      <circle style={{
        position: "absolute",
        top: this.state.hoverY,
        left: this.state.hoverX,
        visibility: showPinButton ? "visible" : "hidden",
      }}
        r={17}
        cx={32}
        cy={0}
        fill="#f57c00"
        fillOpacity={this.state.showHoverMenuOverride ? 0.2 : 0}
        stroke="#000"
        strokeWidth={7}
        strokeOpacity={0}
        onClickCapture={(e) => {
          document.addEventListener('click', this.handleClickOutside);
          e.stopPropagation();
          this.setState({ showHoverMenuOverride: !this.state.showHoverMenuOverride });
        }}
        onMouseEnter={() => this.setState({ pinHovered: true })}
        onMouseLeave={() => this.setState({ pinHovered: false })}
        >
        </circle>
        { showPinButton && <PinIcon fillOpacity={pinOpacity} fillColor={this.state.showHoverMenuOverride ? "#f57c00" : "#AAA"}/>}
      {/* Highlight glow */}
      {nodeDatum.attributes.isHighlighted &&
        <>
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle r={15} fill="none" stroke="#FFB300" strokeWidth="3px" filter="url(#glow)">
          </circle>
        </>
      }
      {/* Display surrounding circle for currentNode */}
      {nodeDatum.attributes.notebook === this.currentNotebookIndex && (
        <circle r={20} fill="none" stroke={fillColor} strokeWidth="3px" />
      )}
      {/* Display execution counter if applicable */}
      {execCount > 1 && (
        <>
          <circle r={10} cx={12} cy={-12} fill={darkFillColor} stroke="none"></circle>
          <text dx={12} dy={-7.5} textAnchor="middle" fill="#fff" stroke="none" fontSize="14px" fontWeight="bold">{execCount}</text>
        </>
      )}
      {/* Display bookmark star if applicable */}
      {nodeDatum.attributes.isBookmarked === true &&
        <StarIcon />
      }
      {/* Display three vertical dots to signal that this node has collapsed children */}
      {nodeDatum.__rd3t.collapsed &&
        <VerticalDotsIcon
          y={nodeDatum.attributes.notebook === this.currentNotebookIndex ? 20 : 15}
          onClickFn={() => this.expandNode(nodeDatum)}
        />}
      {/* `foreignObject` requires width & height to be explicitly set. */}
      {false && (
        <foreignObject {...foreignObjectProps}>
          <div style={{ verticalAlign: "top", textAlign: "center" }}>{nodeDatum.name}</div>
        </foreignObject>
      )}
    </g>
  }

  handleNodeClick(nodeDatum: VerTreeNodeDatum) {
    const kernel = this.props.history.notebook.view.panel.sessionContext.session.kernel;
    if (kernel.status === "busy") {
      console.log("HISTORY TREE: KERNEL BUSY");
      this.setState({ showMessage: true, messageText: "Cannot switch checkpoints because the kernel is busy!" });
      return;
    }
    if (nodeDatum.attributes == null || nodeDatum.attributes.notebook == null) {
      console.log("vernotebook cells", this.props.history.notebook.cells, this.props.history.notebook.cells.map(c => c.modelName));
      return; // Do not do anything when root node is clicked
    }
    GhostToNotebookConverter.convert(this.props.history, this.props.history.store.getNotebook(nodeDatum.attributes.notebook as number), false, nodeDatum)
      .then(this.props.switchCheckpoint);
  }

  handleMouseEnter(event: React.MouseEvent<SVGGElement, MouseEvent>, nodeDatum: VerTreeNodeDatum) {
    if (this.state.showHoverMenuOverride) return;
    let pos = event.currentTarget.getBoundingClientRect();
    
    this.setState({ hoverX: pos.right, hoverY: pos.top, showHoverMenu: true, hoverNodeDatum: nodeDatum })
  }
  handleMouseLeave() {
    if (!this.state.showHoverMenuOverride)
      this.setState({ showHoverMenu: false, hoverNodeDatum: null });
  }

  handleContextMenu(event: React.MouseEvent, node: VerTreeNodeDatum) {
    event.preventDefault();   // Do not show normal context menu
    this.setState({ contextMenuProps: { show: true, x: event.clientX, y: event.clientY, nodeDatum: node } });
    document.addEventListener('click', this.handleClickOutside);

    //if (node.__rd3t.collapsed) this.expandNode(node);
    //else this.collapseNode(node);
    console.log("context menu", node.name);
  }

  handleClickOutside(e) {
    if (this.state.contextMenuProps?.show && this.contextMenu && !this.contextMenu.contains(e.target)) {
      this.setState({ contextMenuProps: { show: false, x: null, y: null, nodeDatum: null } });
      document.removeEventListener('click', this.handleClickOutside);
    }
    if (this.state.showHoverMenuOverride && this.hoverMenu && !this.hoverMenu.contains(e.target)) {
      this.setState({ showHoverMenuOverride: false, showHoverMenu: false, hoverNodeDatum: null });
      document.removeEventListener('click', this.handleClickOutside);
    }

  }

  toggleNode(node: VerTreeNodeDatum) {
    this.setState({ contextMenuProps: { show: false, x: null, y: null, nodeDatum: null } });
    document.removeEventListener('click', this.handleClickOutside);

    if (node == null) return;
    if (node.__rd3t.collapsed) this.expandNode(node);
    else this.collapseNode(node);

  }

  expandNode(node: VerTreeNodeDatum) {
    node.__rd3t.collapsed = false;
    this.props.toggleNodeCollapsed();
  }

  collapseNode(node: VerTreeNodeDatum) {
    node.__rd3t.collapsed = true;
    this.props.toggleNodeCollapsed();
  }

  toggleBookmark(node: VerTreeNodeDatum) {
    this.setState({ contextMenuProps: { show: false, x: null, y: null, nodeDatum: null } });
    document.removeEventListener('click', this.handleClickOutside);

    if (node == null) return;
    if (node.attributes.isBookmarked === true)
      node.attributes.isBookmarked = false;
    else
      node.attributes.isBookmarked = true;
  }
}

const mapStateToProps = (state: verdantState) => {
  let history = state.getHistory();
  let checkpoints = history.checkpoints.all();
  let numberOfCheckpoints = checkpoints.length; // Workaround to get React to rerender the component when a checkpoint is added
  let currentNodeName = history.store.currentNode?.name;  // Another workaround for rerendering
  // Do a shallow copy of the history tree data structure to force a rerender (react-d3-tree does not update otherwise)
  let treeData = Object.assign({}, history.store.historyTree);

  // let treeDataLinear = makeTreeData(checkpoints);   // Linear version of the tree for comparison (debugging purposes)
  // log(treeData);
  return { checkpoints, history, numberOfCheckpoints, currentNodeName, treeData };
};

const mapDispatchToProps = {
  switchCheckpoint: () => ({ type: "SWITCH_CHECKPOINT" }),
  toggleNodeCollapsed: () => ({ type: "TOGGLE_NODE_COLLAPSED" }),
}

const connector = connect(mapStateToProps, mapDispatchToProps);

export default connector(TreeTab);