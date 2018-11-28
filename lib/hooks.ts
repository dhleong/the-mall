import { useCallback, useContext } from "react";

import { storeContext } from "./provider";

export function useDispatch() {
    const store = useContext(storeContext);
    if (!store) throw new Error("No Store provided in Context");
    return useCallback(() => {
        return store.dispatch.bind(store);
    }, [store]);
}
