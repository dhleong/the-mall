import { useCallback, useContext } from "react";

import { storeContext } from "./provider";

export function useDispatch() {
    const store = useContext(storeContext);
    return useCallback(() => {
        return store.dispatch.bind(store);
    }, [store]);
}
