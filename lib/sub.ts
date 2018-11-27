// for whatever reason, using `import` syntax on this module
// returns undefined (or a non-function) when running in tests
const memoize = require("fast-memoize");

import { BaseSubContext, GlobalContextManager, withContext } from "./context";
import { IRef, ISource, IStoreImpl, Params, SubFn, Subscription } from "./model";
import { NO_VALUE, Valueless } from "./sub-values";
import { areSame } from "./util";

export class Reference<V, P extends Params>
extends BaseSubContext
implements IRef<V>, ISource<V> {

    name: string | undefined;

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

        // return the cached value
        return this.lastValue;
    }

    onDependenciesChanged(dependencies: any) {
        // compute new value; if it has changed, notify subscribers
        const last = this.lastValue;
        const next = this.forceDeref();

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

        // if we go to zero subscribers, we should invalidate
        // our cached value, since we're probably not being
        // notified of changes if nobody is interested in us
        if (!this.subscribers.size) {
            this.lastValue = NO_VALUE;
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
export function sub<V, P extends Params = []>(fn?: SubFn<V, P>): Subscription<V, P> {
    if (!fn) {
        // root subscription
        return rootSub;
    }

    // TODO we should probably consider "releasing" References with no
    // active subscriptions, to free up memory
    return memoize(function subscription(...params: P) {
        return new Reference<V, P>(fn, params);
    });
}
