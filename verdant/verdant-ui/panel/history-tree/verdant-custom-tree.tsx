import Tree from "react-d3-tree";
import { TreeNodeDatum } from "react-d3-tree/lib/types/types/common";
import clone from 'clone';

class VerdantCustomTree extends Tree {
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
}

export default VerdantCustomTree;