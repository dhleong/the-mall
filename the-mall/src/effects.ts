import {
    EffectHandler,
    IConfigurableFx,
    IEffectorFactory,
    IStore,
    Params,
    SimpleEffectHandler,
    StateEffectHandler,
    StateEffectVector,
    StoreEvent,
} from "./model";

/*
 * These builtin effects don't use the effect() factory because they
 * need to remain properly generic; they have special conveniences
 * in the Effector that use them directly
 */

function dispatch<State>(
    theStore: IStore<State>,
    event: StoreEvent<State>,
) {
    theStore.dispatch(event);
}

function dispatchLater<State>(
    theStore: IStore<State>,
    event: StoreEvent<State>,
    timeoutMillis: number,
) {
    setTimeout(() => {
        theStore.dispatch(event);
    }, timeoutMillis);
}

/*
 * Effect handler util classes
 */

abstract class BaseEffector<State> implements IConfigurableFx<State> {
    abstract state: State;

    effects: StateEffectVector<State>[] = [];

    store(newState: State): void {
        this.state = newState;
    }

    dispatch(event: StoreEvent<State>): void {
        this.produce(dispatch, [event]);
    }

    dispatchLater(event: StoreEvent<State>, timeoutMillis: number): void {
        this.produce(dispatchLater, [event, timeoutMillis]);
    }

    produce<P extends Params>(handler: SimpleEffectHandler<P>, ...params: P): void;
    produce<P extends Params>(handler: StateEffectHandler<State, P>, ...params: P): void;
    produce<P extends Params>(handler: EffectHandler<State, P>, ...params: P) {
        this.effects.push([handler as EffectHandler<State, any[]>, params]);
    }

    /**
     * Invokes the effects enqueued in this Effector
     */
    invokeQueued(store: IStore<State>) {
        this.effects.forEach(([effectHandler, effectParams]) => {
            if (effectParams.length === effectHandler.length) {
                (effectHandler as SimpleEffectHandler<any[]>)(...effectParams);
            } else {
                effectHandler(store, ...effectParams);
            }
        });
    }

    reset() {
        // clear queued effects
        this.effects.splice(0);
    }
}

export class DefaultEffector<State> extends BaseEffector<State> {
    constructor(
        public state: State,
    ) {
        super();
    }

    store(newState: State): void {
        this.state = newState;
    }
}

export class SingleEffectorFactory<State> implements IEffectorFactory<State> {

    private lastInstance: IConfigurableFx<State> | undefined;

    acquire(state: State): IConfigurableFx<State> {
        if (!this.lastInstance) {
            return new DefaultEffector(state);
        }

        const acquired = this.lastInstance;
        acquired.state = state;
        return acquired;
    }

    release(effector: IConfigurableFx<State>): void {
        this.lastInstance = effector;
        effector.reset();
    }

}
