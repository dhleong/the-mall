import { BaseSubContext, GlobalContextManager, withContext } from "./context";
import { IRef, ISource, Params, SubFn, Subscription } from "./model";
import { createCacheFor } from "./sub-cache";
import { NO_VALUE, Valueless } from "./sub-values";
import { areSame } from "./util";

export class Reference<V, P extends Params>
extends BaseSubContext
implements IRef<V>, ISource<V> {

    name: string | undefined;

    onNoSubscribers: (() => void) | null = null;

    private lastValue: V | Valueless = NO_VALUE;
    private subscribers: Set<(v: V) => any> = new Set();

    constructor(
        private pullValue: SubFn<V, P>,
        private args: P,
    ) {
        super();
    }

    deref(): V {
        if (this.lastValue === NO_VALUE) {
            const value = this.forceDeref();

            // if we deref without context (IE: we have no subscribers)
            // we should not retain the cached value
            this.tryInvalidate();

            return value;
        }

        // we have a valid cached value, but since we're not actually
        // deref'ing our provider function, we need to manually signal to our
        // containing context that it should still be interested in us!
        const parentContext = GlobalContextManager.peek();
        if (parentContext) {
            parentContext.subscribeTo(this);
        }

        // return the cached value
        return this.lastValue;
    }

    onDependenciesChanged() {
        // compute new value; if it has changed, notify subscribers
        const last = this.lastValue;
        const next = this.forceDeref();

        if (!areSame(last, next)) {
            // notify subscribers
            this.subscribers.forEach(onChanged => {
                onChanged(next);
            });
            this.dispatchChangesBatched();
        }
    }

    subscribe(onChange: (v: V) => any): void {
        this.subscribers.add(onChange);
    }

    unsubscribe(onChange: (v: V) => any): void {
        this.subscribers.delete(onChange);

        // if we go to zero subscribers, we should invalidate
        // our cached value, since we're probably not being
        // notified of changes if nobody is interested in us
        this.tryInvalidate();
    }

    toString(): string {
        if (this.name) return this.name;
        const fnName = this.pullValue.name;
        if (fnName) {
            const name = `Reference(${fnName})`;
            this.name = name;
            return name;
        }
        return `Reference()`;
    }

    protected forceDeref(): V {
        // NOTE: we *depend on* any subscriptions that
        // get deref'd within this context.
        const v = withContext(this, this.pullValue, ...this.args);
        this.lastValue = v;
        return v;
    }

    private tryInvalidate() {
        if (!this.subscribers.size) {
            this.lastValue = NO_VALUE;

            const cb = this.onNoSubscribers;
            if (cb) cb();
        }
    }
}

/**
 * Declare a subscription that computes its value using the given function. The
 * returned value is a function that can be invoked with the same parameters as
 * `fn` and returns an `IRef<V>` for the value returned by your `fn`.
 */
export function sub<V, P extends Params = []>(
    fn: SubFn<V, P>,
): Subscription<V, P> {
    const cache = createCacheFor(fn);

    return function subscription(...params: P) {
        const cached = cache.get(params);
        if (cached) return cached;

        const ref = new Reference<V, P>(fn, params);
        cache.put(params, ref);

        // if the Reference ever ends up with zero active subscriptions, we
        // should be good citizens and de-cache it to free up memory
        ref.onNoSubscribers = () => {
            cache.delete(params);
        };
        return ref;
    };
}
