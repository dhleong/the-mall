
export type Params = any[];
export type SubFn<V, P extends Params> = (... params: P) => V;
export type Subscription<V, P extends Params> = (... params: P) => IRef<V>;

export interface IRef<V> {
    deref(): V;
}

export interface ISource<V> {
    subscribe(onChange: (value: V) => any): void;
    unsubscribe(onChange: (value: V) => any): void;
}

export function isSource(obj: any): obj is ISource<any> {
    if (obj.dispatch) return false; // it's a Store
    return obj.subscribe && obj.unsubscribe;
}

export interface ISubContext {
    onEnter(): void;
    onExit(): void;

    /**
     * Dispose any active subscriptions
     */
    dispose(): void;

    /**
     * Define a child relationship; `this` Context now
     * depends on `parent`. This generally is only interesting
     * if `parent` is an `ISource`
     */
    subscribeTo(parent: ISubContext): void;

    /**
     * If any, returns a reference to the IStore this
     * context is bound to
     */
    store(): IStore<any> | null;

    /**
     * @see IChangeBatcher
     */
    requestBatchedChanges(batcher: IChangeBatcher): void;
}

/**
 * IChangeBatchers can register with a parent [ISubContext]
 * to be notified when all change events have been delivered.
 * This is a useful optimization for a [ISubContext] with
 * multiple dependencies to only notify its dependencies
 * one time
 */
export interface IChangeBatcher {
    notifyChangesBatched(): void;
}

export interface IContextManager {
    peek(): ISubContext | null;
    push(context: ISubContext): void;
    pop(context: ISubContext): void;
    store(): IStore<any> | never;
}

export type StoreEvent<T> = (old: T, store: IStore<T>) => T;

export type StoreEventFn<T> = (old: T) => T;
export type StorePropsEventFn<T, P extends Params> = (old: T, ...props: P) => T;

export interface IDispatchFn<StoreState> {
    (event: StoreEvent<StoreState>): void;
}

export interface IStore<V> {
    /**
     * Dispatch a StoreEvent, created by one of the factories in the
     * `events` module.
     */
    dispatch: IDispatchFn<V>;

    /**
     * Dispatch a StoreEvent *synchronously*, created by one of the
     * factories in the `events` module.
     */
    dispatchSync: IDispatchFn<V>;

    getContext(): ISubContext;

    getSnapshot(): V;
    loadSnapshot(snapshot: V): void;
}

export interface IStoreImpl<V> extends IStore<V>, IRef<V> {
}
