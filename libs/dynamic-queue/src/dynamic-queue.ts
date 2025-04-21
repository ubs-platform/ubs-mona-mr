// Import stylesheets
import { Observable, ReplaySubject, Subject, Subscriber, from } from 'rxjs';

export interface QueueOrder {
  key: number;
  output: Observable<any>;
}

export interface QueueAction {
  key: number;
  actualTask: Observable<any>;
  undoTask?: Observable<any>;
  outputSubject: Subject<any>;
}

/**
 * DynamicQueue holds observables and starts in a order.
 * Another observables can be dynamically added and it will be runned when its turn
 */
export class DynamicQueue {
  /**
   * Tasks are holding with a key and output subject
   */
  private _tasks: QueueAction[] = [];

  /**
   * When it is running, it is true
   */
  private _busy = false;

  /**
   * When it is runned its get changed immediately and notifies its subscribers
   */
  busyChange = new ReplaySubject<boolean>(1);

  /**
   * Constructor: Startup
   * DynamicQueue holds observables and starts in a order.
   * Another observables can be dynamically added and it will be runned when its turn
   */
  constructor() {
    this.setBusy(false);
  }

  /**
   * Busy field as public
   */
  get busy() {
    return this._busy;
  }

  /**
   * set busy field internally
   */
  private setBusy(b: boolean) {
    this._busy = b;
    this.busyChange.next(b);
  }

  /**
   * A new task will be runned when its turn
   * @param newTask - a task
   * @returns a information with subscriber and key
   */
  push(newTask_: (() => any) | Observable<any> | Promise<any>): QueueOrder {
    let newTask;

    if (newTask_ instanceof Function) {
      newTask = new Observable((subscriber) => {
        try {
          const result = newTask_();
          if (result instanceof Promise) {
            result
              .then((a) => subscriber.next(a))
              .catch((e) => subscriber.error(e));
          } else {
            subscriber.next(result);
          }
        } catch (error) {
          subscriber.error(error);
        }
        subscriber.complete();
      });
    } else {
      newTask = from(newTask_);
    }

    const task: QueueAction = {
      key: this._tasks.length,
      actualTask: newTask,
      outputSubject: new Subject<any>(),
    };
    this._tasks.push(task);
    //when it is running, it is never touched. otherwise, it will get started
    if (!this.busy) {
      this.setBusy(true);
      this.runFirst();
    }
    return {
      key: task.key,
      output: task.outputSubject.asObservable(),
    };
  }

  /**
   * Pulls a task and runs the task. When its over, calls itself for new.
   */
  private runFirst() {
    const firstStart = this._tasks.splice(0, 1)?.[0];

    if (firstStart) {
      firstStart.actualTask.subscribe({
        next: (a) => {
          firstStart.outputSubject.next(a);
        },
        error: (error) => {
          firstStart.outputSubject.error(error);
        },
        complete: () => {
          firstStart.outputSubject.complete();
          this.runFirst();
        },
      });
    } else {
      this.setBusy(false);
    }
  }
}
