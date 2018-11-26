
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
    return obj.subscribe && obj.unsubscribe;
}

export interface ISubContext {
    onEnter();
    onExit();

    /**
     * Dispose any active subscriptions
     */
    dispose();

    /**
     * Define a child relationship; `this` Context now
     * depends on `parent`. This generally is only interesting
     * if `parent` is an `ISource`
     */
    subscribeTo(parent: ISubContext);

    /**
     * If any, returns a reference to the IStore this
     * context is bound to
     */
    store(): IStore<any> | null;
}

export interface IContextManager {
    peek(): ISubContext;
    push(context: ISubContext);
    pop(context: ISubContext);
    store(): IStore<any> | never;
}

export interface IStore<V> {
    getContext(): ISubContext;

    getSnapshot(): V;
    loadSnapshot(snapshot: V): void;

    dispatch(); // TODO
}

export interface IStoreImpl<V> extends IStore<V> {
    /**
     * Like getSnapshot, but guaranteed to be the actual
     * internal state, for efficiency
     */
    peek(): V;
}
