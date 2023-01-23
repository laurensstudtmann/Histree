import * as React from "react";
import { connect } from "react-redux";
import NotebookEventLabel from "./event-label";
import MiniMap from "./mini-map";
import { verdantState } from "../../redux/";
import { NodeyNotebook } from "../../../verdant-model/nodey";
import { Namer } from "../../../verdant-model/sampler";
import { Checkpoint } from "verdant/verdant-model/checkpoint";
import { GhostToNotebookConverter } from "../../../verdant-model/jupyter-hooks/ghost-to-ipynb";
import { History } from "verdant/verdant-model/history/history"

type react_NotebookEvent_Props = {
  checkpoint: Checkpoint;
};

type NotebookEvent_Props = {
  // provided by redux store
  notebook: NodeyNotebook;
  history: History;
  openGhostBook: () => void;
  currentGhostBook: () => boolean;
} & react_NotebookEvent_Props;

class NotebookEvent extends React.Component<NotebookEvent_Props> {
  render() {
    const ghostOpen = this.props.currentGhostBook();
    return (
      <div className={`Verdant-events-event${ghostOpen ? " ghostOpen" : ""}`}>
        <div className="Verdant-events-event-stamp">
          <NotebookEventLabel events={[this.props.checkpoint]} />
        </div>
        <div
          className="Verdant-events-event-row-index verdant-link"
          onClick={this.props.openGhostBook}
          onContextMenu={() => {
              console.log("hello " + this.props.notebook.version);
              GhostToNotebookConverter.convert(this.props.history, this.props.notebook, false);
            }
          }
        >
          {Namer.getNotebookVersionLabel(this.props.notebook)}
        </div>
        <div className="Verdant-events-event-row-map">
          <MiniMap
            targets={this.props.checkpoint.targetCells}
            notebook_ver={this.props?.notebook?.version}
          />
        </div>
      </div>
    );
  }
}

const mapStateToProps = (
  state: verdantState,
  ownProps: react_NotebookEvent_Props
) => {
  const history = state.getHistory();
  const notebook = state
    .getHistory()
    .store.getNotebook(ownProps.checkpoint.notebook);
  return {
    openGhostBook: () =>
      notebook ? state.openGhostBook(ownProps.checkpoint.notebook) : null,
    notebook,
    history,
    currentGhostBook: () => notebook?.version === state.ghostBook.notebook_ver,
  };
};

export default connect(mapStateToProps)(NotebookEvent);
