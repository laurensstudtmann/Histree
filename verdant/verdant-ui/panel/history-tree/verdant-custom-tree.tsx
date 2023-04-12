import Tree from "react-d3-tree";
import { Point, RawNodeDatum, TreeNodeDatum } from "react-d3-tree/lib/types/types/common";
import clone from 'clone';
import { dequal as deepEqual } from 'dequal/lite';
import { v4 as uuidv4 } from 'uuid';
import { TreeProps } from "react-d3-tree/lib/types/Tree/types";

type TreeState = {
  dataRef: TreeProps['data'];
  data: TreeNodeDatum[];
  d3: { translate: Point; scale: number };
  isTransitioning: boolean;
  isInitialRenderForDataset: boolean;
};

class VerdantCustomTree extends Tree {
  state: TreeState = {
    dataRef: this.props.data,
    data: VerdantCustomTree.assignInternalProperties(clone(this.props.data)),
    d3: Tree.calculateD3Geometry(this.props),
    isTransitioning: false,
    isInitialRenderForDataset: true,
  };

  /**
   * Finds the node matching `nodeId` and
   * expands/collapses it, depending on the current state of
   * its internal `collapsed` property.
   * `setState` callback receives targetNode and handles
   * `props.onClick` if defined.
   */
  handleNodeToggle = (nodeId: string) => {
    const data = clone(this.state.data);
    const matches = this.findNodesById(nodeId, data, []);
    const targetNodeDatum = matches[0];

    if (this.props.collapsible && !this.state.isTransitioning) {
      if (targetNodeDatum.__rd3t.collapsed) {
        VerdantCustomTree.expandNode(targetNodeDatum);
        this.props.shouldCollapseNeighborNodes && this.collapseNeighborNodes(targetNodeDatum, data);
      } else {
        VerdantCustomTree.collapseNode(targetNodeDatum);
      }

      if (this.props.enableLegacyTransitions) {
        // Lock node toggling while transition takes place.
        this.setState({ data, isTransitioning: true });
        // Await transitionDuration + 10 ms before unlocking node toggling again.
        setTimeout(
          () => this.setState({ isTransitioning: false }),
          this.props.transitionDuration + 10
        );
      } else {
        this.setState({ data });
      }

      //this.internalState.targetNode = targetNodeDatum;
    }
  };

  static expandNode(nodeDatum: TreeNodeDatum) {
    nodeDatum.__rd3t.collapsed = false;

    if (nodeDatum.children && nodeDatum.children.length > 0) {
      nodeDatum.children.forEach(child => {
        VerdantCustomTree.expandNode(child);
      });
    }
  }

  /**
   * Assigns internal properties that are required for tree
   * manipulation to each node in the `data` set and returns a new `data` array.
   *
   * @static
   */
  static assignInternalProperties(data: RawNodeDatum[], currentDepth: number = 0): TreeNodeDatum[] {
    // Wrap the root node into an array for recursive transformations if it wasn't in one already.
    const d = Array.isArray(data) ? data : [data];
    return d.map(n => {
      const nodeDatum = n as TreeNodeDatum;
      // Keep existing collapsed state
      nodeDatum.__rd3t = { id: null, depth: null, collapsed: nodeDatum.__rd3t?.collapsed };
      nodeDatum.__rd3t.id = uuidv4();
      // D3@v5 compat: manually assign `depth` to node.data so we don't have
      // to hold full node+link sets in state.
      // TODO: avoid this extra step by checking D3's node.depth directly.
      nodeDatum.__rd3t.depth = currentDepth;
      // If there are children, recursively assign properties to them too.
      if (nodeDatum.children && nodeDatum.children.length > 0) {
        nodeDatum.children = VerdantCustomTree.assignInternalProperties(nodeDatum.children, currentDepth + 1);
      }
      return nodeDatum;
    });
  }

  static getDerivedStateFromProps(nextProps: TreeProps, prevState: TreeState) {
    let derivedState: Partial<TreeState> = null;
    // Clone new data & assign internal properties if `data` object reference changed.
    if (nextProps.data !== prevState.dataRef) {
      derivedState = {
        dataRef: nextProps.data,
        data: VerdantCustomTree.assignInternalProperties(clone(nextProps.data)),
        isInitialRenderForDataset: true,
      };
    }
    const d3 = Tree.calculateD3Geometry(nextProps);
    if (!deepEqual(d3, prevState.d3)) {
      derivedState = derivedState || {};
      derivedState.d3 = d3;
    }
    return derivedState;
  }
}

export default VerdantCustomTree;