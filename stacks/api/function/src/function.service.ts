import {Injectable} from "@nestjs/common";
import {BaseCollection, DatabaseService} from "@spica-server/database";
import {Observable} from "rxjs";
import {Function} from "./interface";

@Injectable()
export class FunctionService extends BaseCollection<Function>("function") {
  constructor(database: DatabaseService) {
    super(database);
  }

  targets(): Observable<TargetChange> {
    return new Observable(observer => {
      const emitHandlers = (fn: Function, kind: ChangeKind) => {
        for (const handler in fn.triggers) {
          const trigger = fn.triggers[handler];
          if (!trigger.active) {
            continue;
          }
          observer.next({
            kind,
            options: trigger.options,
            type: trigger.type,
            target: {
              id: fn._id.toString(),
              handler
            }
          });
        }
      };
      super.find().then(fns => {
        for (const fn of fns) {
          emitHandlers(fn, ChangeKind.Added);
        }
      });

      const stream = this._coll.watch([], {
        fullDocument: "updateLookup"
      });
      stream.on("change", change => {
        console.log(change);
        switch (change.operationType) {
          case "replace":
          case "update":
            emitHandlers(change.fullDocument as Function, ChangeKind.Updated);
            break;
          case "insert":
            emitHandlers(change.fullDocument as Function, ChangeKind.Added);
            break;
          case "delete":
            observer.next({
              kind: ChangeKind.Removed,
              target: {
                id: change.documentKey._id.toString()
              }
            });
            break;
        }
      });
      return () => {
        stream.close();
      };
    });
  }
}

export enum ChangeKind {
  Added = 0,
  Removed = 1,
  Updated = 2
}

export interface TargetChange {
  kind: ChangeKind;
  type?: string;
  options?: unknown;
  target: {
    id: string;
    handler?: string;
  };
}
