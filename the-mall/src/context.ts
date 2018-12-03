import { IContextManager, ISource, isSource, IStore, ISubContext, Params, SubFn } from "./model";

class GlobalContextManagerImpl implements IContextManager {

    private readonly contexts: ISubContext[] = [];

    peek(): ISubContext | null {
        const length = this.contexts.length;
        if (!length) return null;
        return this.contexts[length - 1];
    }

    push(context: ISubContext) {
        this.contexts.push(context);
        context.onEnter();
    }

    pop(context: ISubContext) {
        context.onExit();
        this.contexts.pop();
    }

    store(): IStore<any> {
        for (let i = this.contexts.length - 1; i >= 0; --i) {
            const s = this.contexts[i].store();
            if (s) return s;
        }

        // TODO any way we can detect if we're not in a connected component?
        throw new Error("No store in any registered context. Make sure your component is wrapped in connect()");
    }
}

export const GlobalContextManager = new GlobalContextManagerImpl();

export abstract class BaseSubContext implements ISubContext {

    private readonly subscriptions: Map<ISource<any>, (v: any) => any> = new Map();
    private readonly oldSubscriptions: Map<ISource<any>, (v: any) => any> = new Map();

    private readonly dependencyValues = new Map<ISubContext, any>();

    private myStore: IStore<any> | null = null;

    onEnter() {
        // prepare for subscriptions (subscribeTo)
        // basically, we copy all our current subscriptions
        // into oldSubscriptions; as we subscribeTo things
        // while in this context, attempting to subscribe to
        // a source we've already subscribed to will trigger
        // that source to be removed from oldSubscriptions
        this.subscriptions.forEach((onChange, source) => {
            this.oldSubscriptions.set(source, onChange);
        });
    }

    onExit() {
        // unsubscribe from any remaining old subscriptions
        // (anything not mentioned in a call subscribeTo
        // since onEnter)
        this.oldSubscriptions.forEach((onChange, parent) => {
            parent.unsubscribe(onChange);
        });
        this.oldSubscriptions.clear();
    }

    dispose() {
        this.subscriptions.forEach((onChange, parent) => {
            parent.unsubscribe(onChange);
        });
        this.subscriptions.clear();
    }

    subscribeTo(parent: ISubContext) {
        if (!isSource(parent)) return;
        if (this.subscriptions.has(parent)) {
            // already subscribed!
            // since we visited the subscription in this pass,
            // we want to keep it; remove from oldSubscriptions
            this.oldSubscriptions.delete(parent);
            return;
        }

        const onChange = (v: any) => {
            // pass it on
            this.dependencyValues.set(parent, v);

            // TODO debounce changed notification
            this.onDependenciesChanged(this.dependencyValues);
        };
        parent.subscribe(onChange);

        this.subscriptions.set(parent, onChange);
    }

    store(): IStore<any> | null {
        return this.myStore;
    }

    setStore(store: IStore<any>) {
        this.myStore = store;
    }

    abstract onDependenciesChanged(dependencies: any): void;

}

export function withContext<V, P extends Params = []>(store: IStore<any>, fn: SubFn<V, P>, ... params: P): V;
export function withContext<V, P extends Params = []>(context: ISubContext, fn: SubFn<V, P>, ... params: P): V;
export function withContext<V, P extends Params = []>(
    context: ISubContext | IStore<any>,
    fn: SubFn<V, P>,
    ... params: P
): V {
    // tslint:disable-next-line
    const isGivenStore = !!(context as any)["getContext"];

    const subContext: ISubContext = isGivenStore
        ? (context as IStore<any>).getContext()
        : context as ISubContext;

    const current = GlobalContextManager.peek();
    if (current) {
        // the Context stack is depth-first, so the "current"
        // Context will *depend on* our new one
        current.subscribeTo(subContext);
    }

    GlobalContextManager.push(subContext);
    const result = fn(...params);
    GlobalContextManager.pop(subContext);

    if (isGivenStore) {
        // ?
        subContext.dispose();
    }

    return result;
}
