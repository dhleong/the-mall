
export { connect } from "./connect";
export { BaseSubContext, withContext } from "./context";
export { useDispatch } from "./hooks";
export { IFx, IStore } from "./model";
export { StoreProvider, storeContext } from "./provider";
export { sub } from "./sub";

import { IStore } from "./model";
import { Store, StoreOptions } from "./store";

import * as events from "./events";
export { events };

export function createStore<V>(
    initialState: V,
    opts?: StoreOptions<V>,
): IStore<V> {
    return new Store(initialState, opts);
}
