import { BaseSubContext, withContext } from "./context";
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

    subscribeTo(parent: ISubContext) {
        // nop; StoreContext is never interested in dependencies
    }

    toString(): string {
        return "StoreContext()";
    }
}

export class Store<V> implements IStoreImpl<V> {
    private state: V;
    private ref = new Reference(() => this.state, []);

    constructor(initialState: V) {
        this.state = initialState;
        this.ref.name = "Reference(@Store)";
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
        this.dispatchStateChanged();
    }

    dispatch() {
        throw new Error("Method not implemented.");
    }

    toString(): string {
        return "Store()";
    }

    private dispatchStateChanged() {
        const snapshot = this.state;
        withContext(this, (state) => {
            this.ref.onDependenciesChanged(state);
        }, snapshot);
    }
}
