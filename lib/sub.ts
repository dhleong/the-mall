import { BaseSubContext, GlobalContextManager, withContext } from "./context";
import { IRef, ISource, IStoreImpl, Params, SubFn, Subscription } from "./model";
import { NO_VALUE, Valueless } from "./sub-values";
import { areSame } from "./util";

export class Reference<V, P extends Params>
extends BaseSubContext
implements IRef<V>, ISource<V> {

    private lastValue: V | Valueless = NO_VALUE;
    private subscribers: Set<(v: V) => any> = new Set();

    constructor(
        private pullValue: SubFn<V, P>,
        private args: P,
    ) {
        super();
    }

    deref(): V {
        // TODO: we *depend on* any subscriptions that
        // get deref'd within this context.
        const v = withContext(this, this.pullValue, ...this.args);
        this.lastValue = v;
        return v;
    }

    onDependenciesChanged(dependencies: any) {
        // compute new value; if it has changed, notify subscribers
        const last = this.lastValue;
        const next = this.deref();

        if (!areSame(last, next)) {
            // notify subscribers
            this.subscribers.forEach(onChanged => {
                onChanged(next);
            });
        }

        // TODO notify *no* change, so we don't have to debounce?
    }

    subscribe(onChange: (v: V) => any): void {
        this.subscribers.add(onChange);
    }

    unsubscribe(onChange: (v: V) => any): void {
        this.subscribers.delete(onChange);
    }

}

// NOTE: we use an extra layer of indirection so that sub()
// doesn't have to be called within a context. If it's a big deal,
// we could add extra logic to detect if it *is* in a context and
// optimize away the indirection...
const rootRef = new Reference(() => {
    const s = GlobalContextManager.store();

    // this seems like a hack:
    return (s as IStoreImpl<any>).deref();
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
