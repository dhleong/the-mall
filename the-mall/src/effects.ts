import {
    EffectHandler,
    EffectHandlerParams,
    EffectVector,
    IConfigurableFx,
    IEffectorFactory,
    IStore,
    StateEffectVector,
    StoreEvent,
} from "./model";

/*
 * Builtin Effects and the `effect()` factory
 */

/**
 * Create an Effect handler
 */
export function effect<State>(
    handler: EffectHandler<State, any[]>,
): (...params: EffectHandlerParams<typeof handler>) =>
    EffectVector<EffectHandlerParams<typeof handler>, typeof handler> {
    return (...params: EffectHandlerParams<typeof handler>) => {
        return [handler, params];
    };
}

/*
 * These builtin effects don't use the effect() factory because they
 * need to remain properly generic; they have special conveniences
 * in the Effector that use them directly
 */

export function dispatch<State>(
    theStore: IStore<State>,
    event: StoreEvent<State>,
) {
    theStore.dispatch(event);
}

export function dispatchLater<State>(
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
        this.produce([dispatch, [event]]);
    }

    dispatchLater(event: StoreEvent<State>, timeoutMillis: number): void {
        this.produce([dispatchLater, [event, timeoutMillis]]);
    }

    produce(effectVector: StateEffectVector<State>) {
        this.effects.push(effectVector);
    }

    reset() {
        // clear queued effects
        this.effects.splice(0);
    }
}

class DefaultEffector<State> extends BaseEffector<State> {
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
