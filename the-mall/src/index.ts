
export { connect } from "./connect";
export { BaseSubContext, withContext } from "./context";
export { useDispatch } from "./hooks";
export { IFx, IStore } from "./model";
export { StoreProvider, storeContext } from "./provider";
export { sub } from "./sub";

import { ComposedState, ComposedStore, ComposedStoreOf, IStoresMap } from "./compose";
import { IStore } from "./model";
import { Store } from "./store";

export { IStoreOptions, StoreFsm } from "./store-fsm";
import { IStoreOptions } from "./store-fsm";

import * as events from "./events";
export { events };

/**
 * Create a new store with the given `initialState`
 */
export function createStore<V>(
    initialState: V,
    opts?: IStoreOptions<V>,
): IStore<V> {
    return new Store(initialState, opts);
}

/**
 * Create a Store that composes the given Stores into a single global store
 * that derefs to a map containing the deref'd values of each store. This is
 * useful for cross-module composition, where two or more modules might have
 * their own module-local store, and another module wishes to combine the
 * values of those stores for cross-concern subscriptions.
 *
 * @param stores A map of `key` to `IStore` instance. The `key` is arbitrary,
 * but will be used to reference the associated Store's value in dispatch
 * functions and when deref'd
 * @param opts Optional Store options
 * @returns an IStore instance whose state value mirrors the value of `stores`,
 * except the values of the keys are the deref'd Store values.
 */
export function composeStores<M extends IStoresMap>(
    stores: M,
    opts?: IStoreOptions<ComposedState<M>>,
): ComposedStoreOf<M> {
    return new ComposedStore(stores, opts);
}
