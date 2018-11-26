import { BaseSubContext, GlobalContextManager, withContext } from "./context";
import { IRef, ISource, IStoreImpl, Params, SubFn, Subscription } from "./model";

export class Reference<V, P extends Params>
extends BaseSubContext
implements IRef<V>, ISource<V> {

    constructor(
        private pullValue: SubFn<V, P>,
        private args: P,
    ) {
        super();
    }

    deref(): V {
        // TODO: we *depend on* any subscriptions that
        // get deref'd within this context.
        return withContext(this, this.pullValue, ...this.args);
    }

    onDependenciesChanged(dependencies: any) {
        // TODO compute new value; if it has changed,
        // notify subscribers
        throw new Error("TODO");
    }

    subscribe(onChange: (v: V) => any): void {
        // throw new Error("Method not implemented.");
    }

    unsubscribe(onChange: (v: V) => any): void {
        // throw new Error("Method not implemented.");
    }

}

const rootRef = new Reference(() => {
    const s = GlobalContextManager.store();

    // this seems like a hack:
    return (s as IStoreImpl<any>).peek();
}, []);

function rootSub<V>(): IRef<V> {
    return rootRef as any as IRef<V>;
}

/**
 * If `fn` is omitted, this returns the full root state
 */
export function sub<V, P extends Params = []>(fn?: SubFn<V, P>): Subscription<V, P> {
    if (!fn) {
        // root subscription
        return rootSub;
    }

    // TODO memoize
    return function subscription(...params: P) {
        return new Reference<V, P>(fn, params);
    };
}
