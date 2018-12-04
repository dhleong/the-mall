import {
    IStore,
    Params,
    StoreEvent,
    StoreEventFn,
    StorePropsEventFn,
} from "./model";

/**
 * Create an Event handler that updates the Store state
 */
export function store<State>(
    fn: StoreEventFn<State>,
): () => StoreEvent<State>;

/**
 * Create an Event handler that updates the Store state
 * with whatever params you pass to it.
 */
export function store<State, P extends Params>(
    fn: StorePropsEventFn<State, P>,
): (...params: P) => StoreEvent<State>;

/**
 * Create an Event handler that updates the Store State
 */
export function store<State, P extends Params>(
    fn: StoreEventFn<State> | StorePropsEventFn<State, P>,
): (...props: P) => StoreEvent<State> {

    // NOTE: right now there are no "effects," so we just basically
    // pass this through directly. In the future, however, we might
    // wrap this in a "store" effect handler.
    if (fn.length === 1) {
        // no props, only state
        return () => fn as StoreEvent<State>;
    }

    const withProps = fn as StorePropsEventFn<State, P>;
    return (...props: P) => {
        return (
            state: State,
            _: IStore<State>,
        ) => withProps(state, ...props);
    };
}
