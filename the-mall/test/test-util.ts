import { withContext } from "../src";
import { IRef, IStore } from "../src/model";

export function derefWith<V>(
    store: IStore<any>,
    ref: IRef<V>,
): V {
    return withContext(store, () => ref.deref());
}

export interface IStoreState {
    ships: {[key: string]: any};
    pilots?: {};
}

export function newState(): IStoreState {
    return {
        ships: {
        },
    };
}
