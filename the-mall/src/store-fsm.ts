import { IStore, StoreEvent } from "./model";
import { identity } from "./util";

export type DeferEventsFn = (runQueuedEvents: () => void) => void;

export interface IStoreOptions<T> {
    /**
     * Only used if you don't provide a specific processQueue fn
     */
    deepCopyStateForEvent?: (v: T) => T;

    /**
     * Provide your own function to defer the batched processing
     * of dispatched events. By default uses window.requestAnimationFrame
     */
    deferEvents?: DeferEventsFn;

    processQueue?: (state: T, fns: StoreEvent<T>[]) => T;
}

/**
 * Store State Machine
 */
enum State {
    Idle,
    Deferred,
    Running,
}

export class StoreFsm<V> {
    private readonly deepCopyStateForEvent: (v: V) => V;
    private readonly deferEvents: DeferEventsFn;

    private queue: StoreEvent<V>[] = [];
    private fsm: State = State.Idle;
    private myRunQueuedEvents: () => void;

    constructor(
        private readonly store: IStore<V>,
        private readonly getState: () => V,
        private readonly setState: (state: V) => void,
        opts?: IStoreOptions<V>,
    ) {
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

    dispatch(f: StoreEvent<V>) {
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

    dispatchSync(f: StoreEvent<V>) {
        if (this.fsm === State.Running) {
            throw new Error("You may not dispatchSync from an event handler");
        }

        this.applyEventsToState([f]);
    }

    private runQueuedEvents() {
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

    private applyEventsToState(fns: StoreEvent<V>[]) {
        // process the queued events
        const newState = this.processQueue(this.getState(), fns);

        // an undefined result means do nothing
        if (newState !== undefined) {
            // dispatch the new state
            this.setState(newState);
        }
    }

    private processQueue(state: V, fns: StoreEvent<V>[]): V {
        // (optionally) copy the state to prepare to dispatch
        let s = this.deepCopyStateForEvent(state);
        for (const f of fns) {
            s = f(s, this.store);
        }
        return s;
    }
}
