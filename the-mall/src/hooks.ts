import { useContext } from "react";

import { IDispatchFn, IStore } from "./model";
import { storeContext } from "./provider";

export function useDispatch<V>(): IDispatchFn<V> {
    const store = useContext(storeContext);
    if (!store) throw new Error("No Store provided in Context");

    return (store as IStore<V>).dispatch.bind(store);
}
