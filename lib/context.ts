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

        throw new Error("No store in any registered context");
    }
}

export const GlobalContextManager = new GlobalContextManagerImpl();

export abstract class BaseSubContext implements ISubContext {

    private readonly subscriptions: Map<ISource<any>, (v: any) => any> = new Map();

    private readonly dependencyValues = new Map<ISubContext, any>();

    private myStore: IStore<any> | null;

    onEnter() {
        // TODO prepare for subscriptions (subscribeTo)
    }
    onExit() {
        // TODO unsubscribe from any old subscriptions
        // (anything not mentioned in a call subscribeTo
        // since onEnter)
    }

    dispose() {
        this.subscriptions.forEach((onChange, parent) => {
            parent.unsubscribe(onChange);
        });
        this.subscriptions.clear();
    }

    subscribeTo(parent: ISubContext) {
        if (!isSource(parent)) return;

        const onChange = v => {
            // pass it on
            this.dependencyValues.set(parent, v);

            // TODO debounce changed notification
            this.onDependenciesChanged(this.dependencyValues);
        };
        parent.subscribe(onChange);

        this.subscriptions.set(parent, onChange);
    }

    store(): IStore<any> {
        return this.myStore;
    }

    setStore(store: IStore<any>) {
        this.myStore = store;
    }

    abstract onDependenciesChanged(dependencies: any);

}

export function withContext<V, P extends Params = []>(store: IStore<any>, fn: SubFn<V, P>, ... params: P): V;
export function withContext<V, P extends Params = []>(context: ISubContext, fn: SubFn<V, P>, ... params: P): V;
export function withContext<V, P extends Params = []>(
    context: ISubContext | IStore<any>,
    fn: SubFn<V, P>,
    ... params: P
): V {

    // tslint:disable-next-line
    const subContext: ISubContext = context["getContext"]
        ? (context as IStore<any>).getContext()
        : context as ISubContext;

    const current = GlobalContextManager.peek();
    if (current) {
        subContext.subscribeTo(current);
    }

    GlobalContextManager.push(subContext);
    const result = fn(...params);
    GlobalContextManager.pop(subContext);
    return result;
}
