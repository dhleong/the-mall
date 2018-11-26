import { BaseSubContext } from "./context";
import { IStoreImpl, ISubContext } from "./model";

class StoreContext<T> extends BaseSubContext {
    constructor(
        store: Store<T>,
    ) {
        super();
        this.setStore(store);
    }

    onDependenciesChanged(dependencies: any) {
        throw new Error("StoreContext should have no dependencies");
    }
}

export class Store<V> implements IStoreImpl<V> {
    private state: V;

    constructor(initialState?: V) {
        this.state = initialState;
    }

    peek(): V {
        return this.state;
    }

    getContext(): ISubContext {
        // TODO cache?
        // TODO should this be a Reference?
        return new StoreContext(this);
    }

    getSnapshot(): V {
        // TODO return *copy*
        return this.state;
    }

    loadSnapshot(snapshot: V): void {
        this.state = snapshot;
    }

    dispatch() {
        throw new Error("Method not implemented.");
    }

}
