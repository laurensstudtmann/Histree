import { connect } from "react-redux";
import * as React from "react";
import { verdantState } from "verdant/verdant-ui/redux";
import { History } from "../../../verdant-model/history";
import { Checkpoint } from "verdant/verdant-model/checkpoint";
import { GhostToNotebookConverter } from "../../../verdant-model/jupyter-hooks/ghost-to-ipynb";

const PANEL = "v-VerdantPanel-content";

type TreeTab_Props = {
  checkpoints: Checkpoint[];
  history: History
  numberOfCheckpoints: number
}
class TreeTab extends React.Component<TreeTab_Props> {
  render() {
    let css = `
    .node {
      height: 13px;
      width: 13px;
      background-color: #bbb;
      border-radius: 50%;
      display: inline-block;
      margin-right: 4px;
    }
    .node-wrapper {
      display: block;
    }
    .vertical-line {
      border-left: 1px solid grey;
      height: 10px;
      margin-top: -3px;
      margin-bottom: -3px;
      margin-left: 6px;
    }
    .tree-wrapper {
      margin-left: 10px;
    }
    .bottom-space {
      padding-bottom: 50px;
    }
    `;
    return (
      <div className={PANEL + " tree-wrapper"}>
        <style>{css}</style>
        <div className="node-wrapper">
          <div className="node"></div>
          Start
        </div>
        {this.props.checkpoints.map(cp => {
          return <div key={cp.id} className="node-wrapper">
            <div className="vertical-line"></div>
            <div className="node" onClick={() => GhostToNotebookConverter.convert(this.props.history, this.props.history.store.getNotebook(cp.notebook), false)}></div>
            {cp.notebook}
          </div>
        })
        }
        <div className="bottom-space"></div>
      </div>
    );
  }
}

const mapStateToProps = (state: verdantState) => {
  let checkpoints = state.getHistory().checkpoints.all();
  let history = state.getHistory();
  let numberOfCheckpoints = checkpoints.length; // Workaround to get React to rerender the component when a checkpoint is added
  return { checkpoints, history, numberOfCheckpoints };
};

export default connect(mapStateToProps, null)(TreeTab)
