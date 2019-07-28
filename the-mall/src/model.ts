
export type Params = any[];
export type SubFn<V, P extends Params> = (... params: P) => V;

// tslint:disable-next-line interface-name
export interface Subscription<V, P extends Params> {
    (... params: P): IRef<V>;

    displayName?: string;
}

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
}

export type StoreEvent<T> = (old: T, store: IStore<T>) => T;

export type StoreEventFn<T> = (old: T) => T;
export type StorePropsEventFn<T, P extends Params> = (old: T, ...props: P) => T;

export interface IDispatchFn<StoreState> {
    (event: StoreEvent<StoreState>): void;
}

export interface IStore<V> extends IRef<V> {
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

    getSnapshot(): V;
    loadSnapshot(snapshot: V): void;
}

export interface IStoreImpl<V> extends IStore<V> {
}

/*
 * Effects
 */

export type SimpleEffectHandler<P extends Params> = (... params: P) => any;
export type StateEffectHandler<State, P extends Params> = (store: IStore<State>, ... params: P) => any;
export type EffectHandler<State, P extends Params> =
    SimpleEffectHandler<P> | StateEffectHandler<State, P>;

export type EffectHandlerParams<T> =
    T extends StateEffectHandler<infer _, infer SP> ? SP :
    T extends SimpleEffectHandler<infer P> ? P :
    never;

export type EffectVector<P extends Params, T extends EffectHandler<any, P>> = [T, P];
export type _EffectVector<T extends EffectHandler<any, any>> = [T, EffectHandlerParams<T>];
export type StateEffectVector<State> = _EffectVector<EffectHandler<State, any[]>>;

/**
 * Public Effector interface
 */
export interface IFx<State> {
    /** Produce an effect */
    produce<P extends Params>(handler: SimpleEffectHandler<P>, ...params: P): void;
    produce<P extends Params>(handler: StateEffectHandler<State, P>, ...params: P): void;

    // conveniences for built-in effects
    store(newState: State): void;
    dispatch(event: StoreEvent<State>): void;
    dispatchLater(event: StoreEvent<State>, timeoutMillis: number): void;
}

/** "Internal" interface for IFx implementations */
export interface IConfigurableFx<State> extends IFx<State> {
    state: State;
    effects: StateEffectVector<State>[];

    invokeQueued(store: IStore<State>): void;
    reset(): void;
}

export interface IEffectorFactory<State> {
    acquire(state: State): IConfigurableFx<State>;
    release(effector: IConfigurableFx<State>): void;
}
