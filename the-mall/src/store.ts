import { BaseSubContext, withContext } from "./context";
import { IStoreImpl, ISubContext, StoreEvent } from "./model";
import { Reference } from "./sub";

class StoreContext<T> extends BaseSubContext {
    constructor(
        store: Store<T>,
    ) {
        super();
        this.setStore(store);
    }

    onDependenciesChanged() {
        throw new Error("StoreContext should have no dependencies");
    }

    subscribeTo(parent: ISubContext) {
        // nop; StoreContext is never interested in dependencies
    }

    toString(): string {
        return "StoreContext()";
    }
}

export type DeferEventsFn = (runQueuedEvents: () => void) => void;

export type StoreOptions<T> = {
  /**
   * Only used if you don't provide a specific processQueue fn
   */
  deepCopyStateForEvent?: (v: T) => T,

  /**
   * Provide your own function to defer the batched processing
   * of dispatched events. By default uses window.requestAnimationFrame
   */
  deferEvents?: DeferEventsFn,

  processQueue?: (state: T, fns: StoreEvent<T>[]) => T,
};

const identity = (v: any) => v;

/**
 * Store State Machine
 */
enum State {
  Idle,
  Deferred,
  Running,
}

export class Store<V> implements IStoreImpl<V> {
    private state: V;
    private readonly ref = new Reference(() => this.state, []);
    private readonly deepCopyStateForEvent: (v: V) => V;
    private readonly deferEvents: DeferEventsFn;

    private queue: StoreEvent<V>[] = [];
    private fsm: State = State.Idle;
    private myRunQueuedEvents: () => void;

    constructor(initialState: V, opts?: StoreOptions<V>) {
        this.state = initialState;
        this.ref.name = "Reference(@Store)";
        this.ref.setStore(this);

        if (opts && opts.deferEvents) {
            this.deferEvents = opts.deferEvents;
        } else if (typeof window === "undefined") {
            // non-browser environment; execute immediately (?)
            this.deferEvents = (f) => f();
        } else if (window.requestAnimationFrame) {
            this.deferEvents = window.requestAnimationFrame.bind(window);
        } else if (window.webkitRequestAnimationFrame) {
            this.deferEvents = window.webkitRequestAnimationFrame.bind(window);
        } else {
            this.deferEvents = window.setTimeout.bind(window);
        }

        if (opts && opts.processQueue) {
            this.processQueue = opts.processQueue;
            this.deepCopyStateForEvent = identity; // it won't be used
        } else if (opts && opts.deepCopyStateForEvent) {
            this.deepCopyStateForEvent = opts.deepCopyStateForEvent;
        } else {
            this.deepCopyStateForEvent = identity;
        }

        this.myRunQueuedEvents = this.runQueuedEvents.bind(this);
    }

    deref(): V {
        return this.ref.deref();
    }

    // see the IStore interface
    public dispatch(f: StoreEvent<V>) {
        this.queue.push(f);

        switch (this.fsm) {
            case State.Idle:
                this.deferEvents(this.myRunQueuedEvents);
                this.fsm = State.Deferred;
                break;

            case State.Deferred:
                // already deferred; do nothing
                break;

            case State.Running:
                // we'll deferEvents again when we finish running
                break;

            default:
                // it'd be nice if the compiler could detect that we don't need this case
                throw new Error("Unexpected State");
        }
    }

    public dispatchSync(f: StoreEvent<V>) {
        this.applyEventsToState([f]);
    }

    getContext(): ISubContext {
        // TODO cache?
        // TODO should this be a Reference?
        return new StoreContext(this);
    }

    getSnapshot(): V {
        // TODO return *copy*
        return this.state;
    }

    loadSnapshot(snapshot: V): void {
        this.state = snapshot;
        this.dispatchStateChanged();
    }

    toString(): string {
        return "Store()";
    }

    /**
     * @hide
     */
    runQueuedEvents() {
        this.fsm = State.Running;

        // grab the queue contents and empty it out
        const q = this.queue;
        this.queue = [];

        // process the queue
        this.applyEventsToState(q);

        if (this.queue.length) {
            // more events were dispatched while running these;
            // defer again
            this.fsm = State.Deferred;
            this.deferEvents(this.myRunQueuedEvents);
        } else {
            // done!
            this.fsm = State.Idle;
        }
    }

    private dispatchStateChanged() {
        withContext(this.ref, () => {
            this.ref.onDependenciesChanged();
        });
    }

    private applyEventsToState(fns: StoreEvent<V>[]) {
        // process the queued events
        const newState = this.processQueue(this.state, fns);

        // an undefined result means do nothing
        if (newState !== undefined) {
            // dispatch the new state
            this.state = newState;
            this.dispatchStateChanged();
        }
    }

    private processQueue(state: V, fns: StoreEvent<V>[]): V {
        // (optionally) copy the state to prepare to dispatch
        let s = this.deepCopyStateForEvent(state);
        for (const f of fns) {
            s = f(s, this);
        }
        return s;
    }
}
