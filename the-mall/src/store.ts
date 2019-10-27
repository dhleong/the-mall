import { withContext } from "./context";
import { IStoreImpl, StoreEvent } from "./model";
import { IStoreOptions, StoreFsm } from "./store-fsm";
import { Reference } from "./sub";

export class Store<V> implements IStoreImpl<V> {
    private state: V;
    private readonly ref = new Reference(() => this.state, []);
    private fsm: StoreFsm<V>;

    constructor(initialState: V, opts?: IStoreOptions<V>) {
        this.state = initialState;
        this.ref.displayName = "Reference(@Store)";
        this.ref.setStore(this);

        this.fsm = new StoreFsm(
            this,
            () => this.state,
            (newState: V) => {
                this.state = newState;
                this.dispatchStateChanged();
            },
            opts,
        );
    }

    deref(): V {
        return this.ref.deref();
    }

    // see the IStore interface
    public dispatch(f: StoreEvent<V>) {
        this.fsm.dispatch(f);
    }

    public dispatchSync(f: StoreEvent<V>) {
        this.fsm.dispatchSync(f);
    }

    getSnapshot(): V {
        // TODO return *copy*
        return this.state;
    }

    loadSnapshot(snapshot: V): void {
        this.state = snapshot;
        this.dispatchStateChanged();
    }

    toString(): string {
        return "Store()";
    }

    private dispatchStateChanged() {
        withContext(this.ref, () => {
            this.ref.onDependenciesChanged();
        });
    }
}
