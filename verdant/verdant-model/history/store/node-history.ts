import { Nodey, NodeyNotebook } from "../../nodey";
import { OriginPointer } from "./origin-pointer";
import { log } from "../../notebook";
import { History } from "../history";

const DEBUG = false;

/*
 * Just a container for a list of nodey versions
 */
export class NodeHistory<T extends Nodey> {
  originPointer: OriginPointer | null = null;
  protected versions: T[] = [];
  private history: History;

  constructor(history: History) {
    this.history = history;
  }

  getAllVersions(): T[] {
    return this.versions.slice(0);
  }

  addVersion(nodey: T): void {
    let ver = this.versions.push(nodey);
    nodey.version = ver - 1;
  }

  getVersion(ver: number): T | undefined {
    return ver > -1 ? this.versions[ver] : undefined;
  }

  find(
    callbackfn: (value: T, index: number, array: T[]) => boolean
  ): T | undefined {
    return this.versions.find(callbackfn);
  }

  foreach(callbackfn: (value: T, index: number, array: T[]) => void): void {
    return this.versions.forEach(callbackfn);
  }

  // wrap to allow override implementation of filter
  filter(callbackfn: (value: T, index: number, array: T[]) => unknown): T[] {
    return this.versions.filter(callbackfn);
  }

  // wrap to allow override implementation of map
  map(callbackfn: (value: T, index?: number, array?: T[]) => any): any[] {
    return this.versions.map(callbackfn);
  }

  get name() {
    let latest = this.versions[this.versions.length - 1];
    if (latest)
      return (
        latest.typeChar + "." + (latest.id !== undefined ? latest.id : "???")
      );
  }

  get length() {
    return this.versions.length;
  }

  get latest(): T {
    return this.getLatestForNotebook(this.history.store.currentNotebook);
  }

  getLatestForNotebook(notebook: NodeyNotebook): T {
    const latestNaive = this.versions[this.versions.length - 1];
    let typeChar = latestNaive.typeChar;
    if (!["o", "c", "m", "r"].includes(typeChar)) return latestNaive;  // For notebooks or any other non-cell type

    let id: string;
    let forOutput = typeChar === "o";

    // Use parent in case of an output nodey
    if (forOutput) {
      [typeChar, id,] = latestNaive.parent.split(".");
    } else {
      id = latestNaive.id.toString();
    }
    let nodey: T;
    const cellName = notebook.cells.find(c => {
      const [compareType, compareID,] = c.split(".");
      return typeChar === compareType && id === compareID;
    });
    //if (cellName == null) return undefined;
    if (forOutput) {
      for (let i = this.versions.length - 1; i >= 0; i--) {
        if (this.versions[i].parent === cellName) {
          nodey = this.versions[i];
          break;
        }
      }
    } else {
      let ver = parseInt(cellName.split(".")[2]);
      nodey = this.getVersion(ver);
    }
    // if (nodey == null) return this.latestNaive;  // Fallback to naive implementation
    return nodey;
  }

  /*getLatestFromCurrent(history: History): T {
    let typeChar = this.latestNaive.typeChar;
    if (!["o", "c", "m", "r"].includes(typeChar)) return this.latestNaive;  // For notebooks or any other non-cell type

    let id: string;
    let forOutput = typeChar === "o";

    // Use parent in case of an output nodey
    if (forOutput) {
      [typeChar, id,] = this.latestNaive.parent.split(".");
    } else {
      id = this.latestNaive.id.toString();
    }
    let nodey: T;
    const cellName = history.store.currentNotebook.cells.find(c => {
      const [compareType, compareID,] = c.split(".");
      return typeChar === compareType && id === compareID;
    });
    if (forOutput) {
      for (let i = this.versions.length - 1; i >= 0; i--) {
        if (this.versions[i].parent === cellName) {
          nodey = this.versions[i];
          break;
        }
      }
    } else {
      let ver = parseInt(cellName.split(".")[2]);
      nodey = this.getVersion(ver);
    }
    // if (nodey == null) return this.latestNaive;  // Fallback to naive implementation
    return nodey;
  }*/

  addOriginPointer(origin: Nodey) {
    this.originPointer = new OriginPointer(origin);
  }

  toJSON(): NodeHistory.SERIALIZE {
    return this.serialize(this.versions);
  }

  fromJSON(
    jsn: NodeHistory.SERIALIZE,
    factory: (dat: Nodey.SERIALIZE) => T,
    id?: number
  ) {
    if (DEBUG) log("FACTORY DATA", jsn);
    this.versions = jsn.versions.map(
      (nodeDat: Nodey.SERIALIZE, version: number) => {
        if (nodeDat.origin)
          this.originPointer = new OriginPointer(nodeDat.origin);
        let nodey = factory(nodeDat);
        nodey.id = id;
        nodey.version = version;
        //log("MADE NODEY FROM DATA", nodey, nodeDat);
        return nodey;
      }
    );
  }

  sliceByTime(fromTime: number, toTime: number): NodeHistory.SERIALIZE {
    let slice: T[] = [];
    // get the first index of versions that happen on or after fromTime
    let i = this.versions.findIndex((nodey) => {
      return nodey.created >= fromTime && nodey.created < toTime;
    });
    let nodey: T = this.versions[i]; // check each nodey to see if it is within time
    while (nodey && nodey.created >= fromTime && nodey.created < toTime) {
      slice.push(nodey);
      i++;
      nodey = this.versions[i];
    }
    return this.serialize(slice);
  }

  sliceByVer(fromVer: number, toVer: number): NodeHistory.SERIALIZE {
    let slice = this.versions.slice(fromVer, toVer);
    return this.serialize(slice);
  }

  // helper method
  protected serialize(vers: T[]): NodeHistory.SERIALIZE {
    let data: Nodey.SERIALIZE[] = vers.map((node) => node.toJSON());
    if (this.originPointer && data.length > 0)
      data[data.length - 1].origin = this.originPointer.origin;
    return { artifact_name: this.name || "", versions: data };
  }
}

export namespace NodeHistory {
  export type SERIALIZE = {
    artifact_name: string;
    versions: Nodey.SERIALIZE[];
  };
}
