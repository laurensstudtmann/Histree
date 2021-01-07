import { History } from "../../../verdant-model/history";
import { ChangeType, Checkpoint } from "../../../verdant-model/checkpoint";
import { verdantState } from "../state";
import { NodeyNotebook } from "verdant/verdant-model/nodey";

export const INIT_EVENT_MAP = "INIT_EVENT_MAP";
export const UPDATE_CHECKPOINT = "UPDATE_CHECKPOINT";
const ADD_EVENT = "ADD_EVENT";
const DATE_EXPAND = "DATE_EXPAND";
const SAVE_BUNDLES = "SAVE_BUNDLES";
const BUNDLE_EXPAND = "BUNDLE_EXPAND";

export const initEventMap = () => ({
  type: INIT_EVENT_MAP,
});

export const addEvent = (ev: Checkpoint) => ({
  type: ADD_EVENT,
  event: ev,
});

export const updateCheckpoint = (event: Checkpoint) => {
  return {
    type: UPDATE_CHECKPOINT,
    currentEvent: event,
  };
};

export const dateOpen = (date: number) => {
  return {
    type: DATE_EXPAND,
    date: date,
    open: true,
  };
};

export const dateClose = (date: number) => {
  return {
    type: DATE_EXPAND,
    date: date,
    open: false,
  };
};

export const bundleOpen = (date: number, bundle: number) => {
  return {
    type: BUNDLE_EXPAND,
    date: date,
    bundle_id: bundle,
    open: true,
  };
};

export const bundleClose = (date: number, bundle: number) => {
  return {
    type: BUNDLE_EXPAND,
    date: date,
    bundle_id: bundle,
    open: false,
  };
};

export type eventState = {
  notebook: number;
  events: Checkpoint[];
};

export type bundleState = {
  isOpen: boolean;
};

export type dateState = {
  isOpen: boolean;
  date: number;
  events: eventState[];
  bundles: number[][];
  bundleStates: bundleState[];
};

/* main state */
export type eventMapState = {
  ready: boolean;
  dates: dateState[];
  currentEvent: Checkpoint | null;
};

export const eventsInitialState = (): eventMapState => {
  return { ready: false, dates: [] as dateState[], currentEvent: null };
};

export const eventReducer = (
  state: verdantState,
  action: any
): eventMapState => {
  const eventView = state.eventView;
  switch (action.type) {
    case INIT_EVENT_MAP:
      if (eventView.dates.length < 2)
        return {
          dates: reducer_initEventMap(state),
          currentEvent: getInitialEvent(state.getHistory()),
          ready: true,
        };
      else return eventView;
    case UPDATE_CHECKPOINT:
      if (action.currentEvent != eventView.currentEvent) {
        return {
          // update both event map and current event with new event
          ...eventView,
          currentEvent: action.currentEvent,
          dates: reducer_addEvent(
            action.currentEvent,
            eventView.dates,
            state.getHistory()
          ),
        };
      } else return eventView;
    case ADD_EVENT:
      return {
        ...eventView,
        dates: reducer_addEvent(
          action.ev,
          [...eventView.dates],
          state.getHistory()
        ),
      };
    case DATE_EXPAND:
      const updatedElement = {
        ...eventView.dates[action.date],
        isOpen: action.open,
      };
      if (action.open === true)
        updatedElement.bundles = computeBundles(
          updatedElement.events,
          state.getHistory()
        );
      return {
        ...eventView,
        dates: [
          ...eventView.dates.slice(0, action.date),
          updatedElement,
          ...eventView.dates.slice(action.date + 1),
        ],
      };
    case SAVE_BUNDLES:
      const updatedBundles = {
        ...eventView.dates[action.date],
        bundles: action.bundles,
      };
      return {
        ...eventView,
        dates: [
          ...eventView.dates.slice(0, action.date),
          updatedBundles,
          ...eventView.dates.slice(action.date + 1),
        ],
      };
    case BUNDLE_EXPAND:
      const bundleStates = eventView.dates[action.date].bundleStates;
      bundleStates[action.bundle_id].isOpen = action.open;
      const updatedBundleDate = {
        ...eventView.dates[action.date],
        bundleStates: bundleStates,
      };
      return {
        ...eventView,
        dates: [
          ...eventView.dates.slice(0, action.date),
          updatedBundleDate,
          ...eventView.dates.slice(action.date + 1),
        ],
      };
    default:
      return eventView;
  }
};

export function reducer_addEvent(
  event: Checkpoint,
  dates: dateState[],
  history: History
): dateState[] {
  let time = event.timestamp;
  let date = dates[dates.length - 1];
  if (!date || !Checkpoint.sameDay(time, date.date)) {
    // new date
    let newEvent: eventState = { notebook: event.notebook, events: [event] };
    let newDate: dateState = {
      isOpen: true,
      date: time,
      events: [newEvent],
      bundles: [],
      bundleStates: [{ isOpen: false }],
    };
    dates.push(newDate);
  } else {
    // existing date
    let lastEvent: eventState = date.events[date.events.length - 1];
    // existing notebook for this date
    if (lastEvent && lastEvent.notebook === event.notebook) {
      lastEvent.events.push(event);
    } else {
      // new notebook for this date
      let newEvent: eventState = {
        notebook: event.notebook,
        events: [event],
      };
      date.events.push(newEvent);
      // keep bundleStates as long as event list
      date.bundleStates.push({ isOpen: false });
    }
    // update bundles
    if (date.isOpen) date.bundles = computeBundles(date.events, history);
  }

  return dates;
}

function reducer_initEventMap(state: verdantState) {
  let dates = [] as dateState[];
  state
    .getHistory()
    .checkpoints.all()
    .forEach((event) => reducer_addEvent(event, dates, state.getHistory()));

  // Set all dates to closed except the most recent
  dates.forEach((d) => (d.isOpen = false));

  // initialize the most recent event
  dates[dates.length - 1].isOpen = true;
  dates[dates.length - 1].bundles = computeBundles(
    dates[dates.length - 1].events,
    state.getHistory()
  );

  return dates;
}

function getInitialEvent(history: History): Checkpoint {
  let checkpoints = history.checkpoints.all();
  return checkpoints[checkpoints.length - 1];
}

type accumulatorObject = {
  accumulator: number[][]; // Holds partially constructed bundle output
  timeBound: number; // Lower limit on time for inclusion in latest bundle
  changeByCell: { [cell: string]: ChangeType } | null; // Type of current bundle or null if no prev bundle
  cellOrder: string[];
};
const INTERVAL_WIDTH = 300000; // Max bundle time interval in milliseconds

function computeBundles(events: eventState[], history: History): number[][] {
  /* Helper method for makeBundles.
     Computes list of bundled indices based on timestamp, ordered such that
     flattening the outer list leads to a reversed list of the indices of
     this.props.events */

  let initial: accumulatorObject = {
    accumulator: [],
    timeBound: Infinity,
    changeByCell: {},
    cellOrder: [],
  };

  let result: accumulatorObject = events.reduceRight(
    (accObj, event, index) => bundle(accObj, event, index, history),
    initial
  );
  return result.accumulator;
}

function bundle(
  accObj: accumulatorObject,
  e: eventState,
  idx: number,
  history: History
): accumulatorObject {
  /* Helper method for computeBundles.
     Function to use in reducing over bundles in computeBundles. */
  // Compute properties of current element
  let timeStamp = e.events[0].timestamp;
  let newEventTypes = getEventTypes(e);
  let newNotebook = history?.store?.getNotebook(e.notebook);
  let newCellOrder = getCellOrder(newNotebook, e);

  /*
   * CONDITIONS TO BUNDLE EVENTS
   * 1. occur within the same time bound
   * 2. notebooks A and B don't have conflicting cells at the same index
   * 3. no events have conflicting events for the same cell
   */

  // 1. occur within the same time bound
  if (timeStamp > accObj.timeBound) {
    //2. notebooks A and B don't have conflicting cells at the same index
    let zippedCells = zipCellOrder(newCellOrder, accObj.cellOrder);
    if (zippedCells) {
      // 3. no events have conflicting events for the same cell
      let zippedEvents = zipEventTypes(newEventTypes, accObj.changeByCell);
      if (zippedEvents) {
        // add event to current bundle
        const newAccumulator = accObj.accumulator
          .slice(0, -1)
          .concat([
            accObj.accumulator[accObj.accumulator.length - 1].concat([idx]),
          ]);

        return {
          accumulator: newAccumulator,
          timeBound: accObj.timeBound,
          changeByCell: zippedEvents,
          cellOrder: zippedCells,
        };
      }
    }
  }

  // create new bundle if one or more conditions fail
  return {
    accumulator: accObj.accumulator.concat([[idx]]),
    timeBound: timeStamp - INTERVAL_WIDTH,
    changeByCell: newEventTypes,
    cellOrder: newCellOrder,
  };
}

function getEventTypes(e: eventState): { [key: string]: ChangeType } {
  let newEventTypes: { [key: string]: ChangeType } = {};
  e.events.forEach((event) =>
    event.targetCells.forEach(
      (cell) => (newEventTypes[cell.cell] = cell.changeType)
    )
  );
  return newEventTypes;
}

function zipEventTypes(
  A: { [key: string]: ChangeType },
  B: { [key: string]: ChangeType }
): { [key: string]: ChangeType } | null {
  let keys_A = Object.keys(A);
  let keys_B = Object.keys(B);

  // get the simplified artifact name of each cell version
  let art_A = keys_A.map((cell) =>
    cell?.substr(0, cell.lastIndexOf(".") || cell.length)
  );
  let art_B = keys_B.map((cell) =>
    cell?.substr(0, cell.lastIndexOf(".") || cell.length)
  );

  // first check if any conflicting changes on the same
  // artifact
  let zipped = {};
  let compatible = art_A.every((art, index) => {
    let index_b = art_B.indexOf(art);

    if (index_b > -1) {
      if (B[keys_B[index_b]] === A[keys_A[index]]) {
        return true;
      }
      return false;
    } else {
      zipped[keys_A[index]] = A[keys_A[index]];
      return true;
    }
  });

  if (compatible) {
    keys_B.forEach((cell) => (zipped[cell] = B[cell]));
  } else {
    zipped = null;
  }

  return zipped;
}

function zipCellOrder(A: string[], B: string[]) {
  let smaller = B;
  let larger = A;
  if (A.length < B.length) {
    smaller = A;
    larger = B;
  }

  let zipped = A;
  let compatible = smaller.every((cell, index) => cell === larger[index]);
  if (compatible && larger.length > smaller.length) {
    zipped = zipped.concat(larger.slice(smaller.length));
  }

  return compatible ? zipped : null;
}

function getCellOrder(notebook: NodeyNotebook, e: eventState) {
  if (!notebook) return []; // error state
  let order = notebook?.cells?.map((cell) => {
    let name = cell.substr(0, cell.lastIndexOf(".") || cell.length);
    return name;
  });

  // add in removed cells too
  e.events.forEach((event) => {
    event.targetCells.forEach((cell) => {
      if (cell.changeType === ChangeType.REMOVED) {
        let name = cell.cell;
        name = name?.substr(0, name.lastIndexOf(".") || name.length);
        if (cell.index !== undefined && order.length > cell.index) {
          order = order.splice(cell.index, 0, name);
        } else order.push(name);
      }
    });
  });

  return order;
}