import { IRef, Params, SubFn } from "./model";

/**
 * Each subscription maintains its own cache of active subscriptions based
 * on the params passed to it.
 *
 * TODO do we need to support a global clearSubscriptionCaches method?
 */
export interface ISubCache<V, P extends Params = []> {
    /**
     * Get a cached reference of the sub for the given params, if any exists
     */
    get(params: P): IRef<V> | undefined;

    /**
     * Store a cached reference
     */
    put(params: P, ref: IRef<V>): void;

    /**
     * Delete the cached reference for the given sub
     */
    delete(params: P): void;
}

class SimpleSubCache<V, P extends Params = []> implements ISubCache<V, P> {

    private cache = new Map<string, IRef<V>>();

    constructor(
        private toKey: ((params: P) => string) = JSON.stringify,
    ) {}

    get(params: P): IRef<V> | undefined {
        return this.cache.get(this.toKey(params));
    }

    put(params: P, ref: IRef<V>) {
        this.cache.set(this.toKey(params), ref);
    }

    delete(params: P) {
        this.cache.delete(this.toKey(params));
    }

}

export function createCacheFor<V, P extends Params = []>(
    fn: SubFn<V, P>,
): ISubCache<V, P> {
    // TODO would it be worth it to optimize for the 0-arg and 1-arg cases?

    return new SimpleSubCache();
}
