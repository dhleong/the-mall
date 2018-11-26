import { BaseSubContext } from "./context";
import { IStoreImpl, ISubContext } from "./model";
import { Reference } from "./sub";

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
    private ref = new Reference(() => this.state, []);

    constructor(initialState?: V) {
        this.state = initialState;
    }

    deref(): V {
        return this.ref.deref();
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
        this.ref.onDependenciesChanged(snapshot);
    }

    dispatch() {
        throw new Error("Method not implemented.");
    }

}
