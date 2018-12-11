import { SingleEffectorFactory } from "./effects";
import {
    IEffectorFactory,
    IFx,
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
): (...params: P) => StoreEvent<State> {

    // NOTE: if we ever add interceptors, it might be useful
    // to have this delegate to fx(). For now, though, this
    // is somewhat more efficient
    if (fn.length === 1) {
        // no params, only state
        return () => fn as StoreEvent<State>;
    }

    const withParams = fn as StorePropsEventFn<State, P>;
    return (...params: P) => {
        return (
            state: State,
            _: IStore<State>,
        ) => withParams(state, ...params);
    };
}

/**
 * Create an Effectful Event Handler.
 *
 * @return a factory that creates StoreEvent instances. The arguments you pass
 * to this factory will be passed along to your handler affector the first
 * argument, which you use to enqueue effects.
 */
export function fx<State, P extends Params>(
    handler: (fx: IFx<State>, ...params: P) => void,
): (...params: P) => StoreEvent<State> {
    const effectors: IEffectorFactory<State> = new SingleEffectorFactory();

    const eventFactory = (...params: P) => {

        // the StoreEvent is a function
        return (old: State, theStore: IStore<State>) => {
            const effector = effectors.acquire(old);

            // process the event
            handler(effector, ...params);

            // dispatch effects
            effector.invokeQueued(theStore);

            // return the new state (if any) and release the effector
            const newState = effector.state;
            effectors.release(effector);
            return newState;
        };

    };
    eventFactory.effectors = effectors;
    return eventFactory;
}
