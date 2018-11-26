import { withContext } from "../lib";
import { IRef, IStore } from "../lib/model";

export function derefWith<V>(
    store: IStore<any>,
    ref: IRef<V>,
): V {
    return withContext(store, () => ref.deref());
}
