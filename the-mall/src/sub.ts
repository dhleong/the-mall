import { BaseSubContext, GlobalContextManager, withContext } from "./context";
import { IRef, ISource, IStoreImpl, Params, SubFn, Subscription } from "./model";
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
            return this.forceDeref();
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
        if (!this.subscribers.size) {
            this.lastValue = NO_VALUE;

            const cb = this.onNoSubscribers;
            if (cb) cb();
        }
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
}

// NOTE: we use an extra layer of indirection so that sub()
// doesn't have to be called within a context. If it's a big deal,
// we could add extra logic to detect if it *is* in a context and
// optimize away the indirection...
class RootReference<V> extends Reference<V, []> {
    constructor() {
        super(() => {
            const s = GlobalContextManager.store();

            // this seems like a hack:
            return (s as IStoreImpl<any>).deref();
        }, []);
        this.name = "Reference(@root)";
    }

    deref() {
        // TODO we only need to do this if the store has changed?
        // does it matter?
        return super.forceDeref();
    }
}
const rootRef = new RootReference();

function rootSub<V>(): IRef<V> {
    return rootRef as any as IRef<V>;
}

/**
 * If `fn` is omitted, this returns the full root state
 */
export function sub<V, P extends Params = []>(
    fn?: SubFn<V, P>,
): Subscription<V, P> {
    if (!fn) {
        // root subscription
        return rootSub;
    }

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
