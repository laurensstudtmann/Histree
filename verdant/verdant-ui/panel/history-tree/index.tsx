import { connect, ConnectedProps } from "react-redux";
import * as React from "react";
import { verdantState } from "verdant/verdant-ui/redux";
import { TreeNodeDatum } from "react-d3-tree/lib/types/types/common";
import { GhostToNotebookConverter } from "../../../verdant-model/jupyter-hooks/ghost-to-ipynb";
import { PlayIcon, PlusIcon, SaveIcon, MoveIcon, SwapIcon, DeleteIcon, VerticalDotsIcon, StarIcon, PinIcon, StarOnOff, CollapseOnOff, ShimmerOnOff } from "../../../verdant-ui/icons";
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

    .button-group-with-tabbar {
      position: absolute;
      top: 52px;
      right: 10px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .button-group {
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    
    .button {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      height: 30px;
      background-color: white;
      border: none;
      font-size: 12px;
      cursor: pointer;
      box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
      border-radius: 5px;
      margin-bottom: 5px;
      padding: 0 2px 0 2px;
    }

    .button:hover {
      background-color: #f5f5f5;
    }

    .button-text {
      padding-left: 5px;
      padding-right: 5px;
    }

    .icon-div {
      display: flex;
      justify-content: flex-end;
    }

    `;

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
  verboseButtons: boolean,
  hoverX: number,
  hoverY: number,
  hoverNodeDatum: VerTreeNodeDatum,
  showMessage: boolean,
  messageText: string,
  containerWidth: number | null,
  contextMenuProps: { show: boolean, x: number, y: number, nodeDatum: VerTreeNodeDatum },
  enableHighlighting: boolean,
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
      verboseButtons: false,
      hoverX: 100,
      hoverY: 100,
      hoverNodeDatum: null,
      showMessage: false,
      messageText: undefined,
      containerWidth: undefined,
      contextMenuProps: null,
      enableHighlighting: false,
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
          nodeSize={{ x: 40, y: 40 }}
          pathFunc="straight"
          // Always takes the backup value instead of 1/3 of containerWidth, ever since using the history tree as the default tab...
          translate={{ x: this.state.containerWidth ? this.state.containerWidth / 3 : 100, y: 50 }}
          zoom={0.65}
          scaleExtent={{ max: 2, min: 0.1 }}
          collapsible={true}
          renderCustomNodeElement={(rd3tProps) => // Get the proper reference from the store instead of the copy provided by the rd3tProps
            this.renderNode(this.props.history.store.getNodeByNotebookIndex(rd3tProps.nodeDatum.attributes?.notebook as number))}
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
        {this.renderButtons()}
      </div>
    );
  }

  // Renders an SVG node with all its different styling possibilities based on its current attributes
  renderNode(
    nodeDatum: VerTreeNodeDatum
  ) {
    if (nodeDatum == null) return;
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
        // Use orange-ish glow around delete cells to better distinguish it from the red
        fill="#EF6C00"
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
      {showPinButton && <PinIcon fillOpacity={pinOpacity} fillColor={this.state.showHoverMenuOverride ? "#EF6C00" : "#AAA"} />}
      {/* Main node circle */}
      <circle r={15} fill={fillColor} stroke="none">
      </circle>
      {renderIcon(nodeDatum.attributes.changeType)}
      {/* Highlight glow */}
      {this.state.enableHighlighting && nodeDatum.attributes.isHighlighted &&
        <>
          <defs>
            <filter id="glow" filterUnits="userSpaceOnUse" x="-50%" y="-50%" width="200%" height="200%" filterRes="600">
              <feDropShadow dx="0" dy="0" stdDeviation="1" floodColor={nodeDatum.attributes.changeType === "delete" ? "#f57c00" : "#EF6C00"} />
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={nodeDatum.attributes.changeType === "delete" ? "#f57c00" : "#EF6C00"} />
            </filter>
          </defs>
          <circle r={15} fill="none" stroke={nodeDatum.attributes.changeType === "delete" ? "#f57c00" : "#EF6C00"} strokeWidth="3px" filter="url(#glow)">
          </circle>
        </>
      }
      {/* Display surrounding circle for currentNode */}
      {nodeDatum.attributes.notebook === this.currentNotebookIndex && (
        <circle r={20} fill="none" stroke={fillColor} strokeWidth="3px" />
      )}
      {/* Display execution counter if applicable */}
      {execCount > 1 &&  nodeDatum.attributes.changeType === "execute" &&(
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
    </g>
  }

  renderButtons() {
    return (
      <div className="button-group" onMouseEnter={() => { console.log("going over"); this.setState({ verboseButtons: true }); }} onMouseLeave={() => { console.log("going out"); this.setState({ verboseButtons: false }); }}>
        <button className="button" onClick={() => this.toggleNode(this.props.history.store.currentNode)}>
          {this.state.verboseButtons && (
            <div className="button-text">{(this.props.history.store.currentNode?.__rd3t.collapsed ? "Expand Current Node" : "Collapse Current Node")}</div>
          )}
          <div className="icon-div"><CollapseOnOff active={!this.props.history.store.currentNode?.__rd3t.collapsed}></CollapseOnOff></div>
        </button>
        <button className="button" onClick={() => this.toggleBookmark(this.props.history.store.currentNode)}>
          {this.state.verboseButtons && (
            <div className="button-text">{(this.props.history.store.currentNode?.attributes.isBookmarked ? "Remove Bookmark" : "Bookmark Current Node")}</div>
          )}
          <div className="icon-div"><StarOnOff active={!this.props.history.store.currentNode?.attributes.isBookmarked}></StarOnOff></div>
        </button>
        <button className="button" onClick={() => this.setHighlighting(!this.state.enableHighlighting)}>
          {this.state.verboseButtons && (
            <div className="button-text">{this.state.enableHighlighting ? "Disable Node Highlights" : "Highlight Relevant Nodes"}</div>
          )}
          <div className="icon-div"><ShimmerOnOff active={this.state.enableHighlighting}></ShimmerOnOff></div>
        </button>
      </div>
    );
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
  }

  // Currently unused
  handleGhostbookBtnClick() {
    this.setState({ contextMenuProps: { show: false, x: null, y: null, nodeDatum: null } });
    document.removeEventListener('click', this.handleClickOutside);

    this.props.openGhostBook(this.state.contextMenuProps.nodeDatum.attributes.notebook)
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

  setHighlighting(val: boolean) {
    if (val)
      this.setState({ enableHighlighting: true, showMessage: true, messageText: "Highlighting nodes which modified the currently selected cell." });
    else
      this.setState({ enableHighlighting: false });
  }
}

const mapStateToProps = (state: verdantState) => {
  let history = state.getHistory();
  let checkpoints = history.checkpoints.all();
  let numberOfCheckpoints = checkpoints.length; // Workaround to get React to rerender the component when a checkpoint is added
  let currentNodeName = history.store.currentNode?.name;  // Another workaround for rerendering
  // Do a shallow copy of the history tree data structure to force a rerender (react-d3-tree does not update otherwise)
  let treeData = Object.assign({}, history.store.historyTree);
  let openGhostBook = state.openGhostBook;

  return { checkpoints, history, numberOfCheckpoints, currentNodeName, treeData, openGhostBook };
};

const mapDispatchToProps = {
  switchCheckpoint: () => ({ type: "SWITCH_CHECKPOINT" }),
  toggleNodeCollapsed: () => ({ type: "TOGGLE_NODE_COLLAPSED" }),
}

const connector = connect(mapStateToProps, mapDispatchToProps);

export default connector(TreeTab);