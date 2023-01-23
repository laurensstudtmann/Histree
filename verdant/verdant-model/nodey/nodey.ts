export abstract class Nodey {
  id: number | undefined; //id for this node
  version: number | undefined; //chronological number
  created: number | undefined; //id marking which checkpoint
  parent: string | undefined; //lookup id for the parent Nodey of this Nodey
  jnId: string; // Jupyter Notebook ICellModel ID that this Nodey is supposed to represent. Used for finding the notebook cell that is associated with this Nodey.

  constructor(options: Nodey.Options) {
    this.id = options.id;
    if (options.created !== undefined) this.created = options.created;
    if (options.parent !== undefined) this.parent = options.parent + "";
    if (options.jnId !== undefined) this.jnId = options.jnId;
  }

  get name(): string {
    return this.typeChar + "." + this.id + "." + this.version;
  }

  get artifactName(): string {
    return this.typeChar + "." + this.id;
  }

  public updateState(_: Nodey.Options) {}

  public toJSON(): Nodey.SERIALIZE {
    let jsn = {};
    if (this.created) jsn["start_checkpoint"] = this.created;
    if (this.parent) jsn["parent"] = this.parent;
    if (this.jnId) jsn["jnId"] = this.jnId;
    return jsn;
  }

  abstract get typeChar(): string;
}

export namespace Nodey {
  export type Options = {
    id?: number; //id for this node
    version?: any; //chronological number
    created?: number; //id marking which checkpoint
    parent?: string | number; //lookup id for the parent Nodey of this Nodey
    jnId?: string; // Jupyter Notebook ICellModel ID. Used for finding the notebook cell that is associated with this Nodey.
  };

  export interface SERIALIZE {
    parent?: string;
    start_checkpoint?: number;
    origin?: string; // only used if this nodey was derived from a prior seperate nodey
    jnId?: string; // Jupyter Notebook ICellModel ID. Used for finding the notebook cell that is associated with this Nodey.
  }
}

/*
 * Cell-level nodey interface
 */
export interface NodeyCell extends Nodey {}
