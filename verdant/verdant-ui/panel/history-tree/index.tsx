import { connect } from "react-redux";
import * as React from "react";
import { verdantState } from "verdant/verdant-ui/redux";
import { History } from "../../../verdant-model/history";
import { Checkpoint } from "verdant/verdant-model/checkpoint";
import Tree from 'react-d3-tree';
import { RawNodeDatum, TreeNodeDatum } from "react-d3-tree/lib/types/types/common";
import { GhostToNotebookConverter } from "../../../verdant-model/jupyter-hooks/ghost-to-ipynb";
import { log } from "../../../verdant-model/notebook";

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

type TreeTab_Props = {
  checkpoints: Checkpoint[];
  history: History
  numberOfCheckpoints: number
  treeData: RawNodeDatum
  treeDataLinear: RawNodeDatum
}
class TreeTab extends React.Component<TreeTab_Props> {
  render() {
    return (
      <div className="full-height">
        <style>{css}</style>
        <Tree data={this.props.treeData}
          rootNodeClassName="node__all"
          branchNodeClassName="node__all"
          leafNodeClassName="node__all"
          orientation="vertical"
          nodeSize={{ x: 40, y: 40 }}
          zoom={0.65}
          collapsible={false}
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