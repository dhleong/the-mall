
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
}

export interface IContextManager {
    peek(): ISubContext | null;
    push(context: ISubContext): void;
    pop(context: ISubContext): void;
    store(): IStore<any> | never;
}

export interface IStore<V> {
    getContext(): ISubContext;

    getSnapshot(): V;
    loadSnapshot(snapshot: V): void;

    dispatch(): void; // TODO
}

export interface IStoreImpl<V> extends IStore<V>, IRef<V> {
}