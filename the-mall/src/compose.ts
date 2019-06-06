import { IRef, IStore, StoreEvent } from "./model";
import { IStoreOptions, StoreFsm } from "./store-fsm";
import { sub } from "./sub";

export type IStoresMap = {
    [key: string]: IStore<any>,
};

type RefValueType<V extends IRef<any>> =
    V extends IRef<infer T> ? T :
    never;

export type ComposedState<V extends IStoresMap> = {
    [key in keyof V]: RefValueType<V[key]>;
};

export type ComposedStoreOf<V extends IStoresMap> =
    IStore<ComposedState<V>>;

export class ComposedStore<M extends IStoresMap> implements ComposedStoreOf<M> {

    private readonly ref: IRef<ComposedState<M>>;
    private readonly fsm: StoreFsm<ComposedState<M>>;

    constructor(
        private readonly stores: M,
        opts?: IStoreOptions<ComposedState<M>>,
    ) {
        this.ref = sub(() => {
            const v = {} as ComposedState<M>;
            for (const key of Object.keys(this.stores)) {
                v[key] = this.stores[key].deref();
            }
            return v;
        })();

        this.fsm = new StoreFsm(
            this,
            () => this.getSnapshot(),
            newState => this.loadSnapshot(newState),
            opts,
        );
    }

    dispatch(f: StoreEvent<ComposedState<M>>) {
        this.fsm.dispatch(f);
    }

    dispatchSync(f: StoreEvent<ComposedState<M>>) {
        this.fsm.dispatchSync(f);
    }

    getSnapshot(): ComposedState<M> {
        const v = {} as ComposedState<M>;
        for (const key of Object.keys(this.stores)) {
            v[key] = this.stores[key].getSnapshot();
        }
        return v;
    }

    loadSnapshot(snapshot: ComposedState<M>): void {
        for (const key of Object.keys(this.stores)) {
            this.stores[key].loadSnapshot(snapshot[key]);
        }
    }

    deref(): ComposedState<M> {
        return this.ref.deref();
    }

}
