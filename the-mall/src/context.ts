import { IChangeBatcher, IContextManager, ISource, isSource, IStore, ISubContext, Params, SubFn } from "./model";

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

    root(): ISubContext | null {
        if (!this.contexts.length) return null;
        return this.contexts[0];
    }
}

export const GlobalContextManager = new GlobalContextManagerImpl();

export abstract class BaseSubContext implements ISubContext, IChangeBatcher {

    private readonly subscriptions: Map<ISource<any>, (v: any) => any> = new Map();
    private readonly oldSubscriptions: Map<ISource<any>, (v: any) => any> = new Map();

    private readonly changeBatchers: Set<IChangeBatcher> = new Set();

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

            // NOTE: if we have more dependencies than this one, we register
            // with the root context that we're waiting; once the root
            // context that originally initiated the change has finished
            // notifying its dependents, it will sweep through and notify all
            // "pending" contexts
            if (this.subscriptions.size <= 1) {
                // easy case; dispatch immediately
                this.notifyChangesBatched();
            } else {
                // TODO a small optimization may be to detect if we eventually
                // receive changes from all our dependencies and cancel our
                // request for changes. Not sure if it would be significant...
                const rootContext = GlobalContextManager.root();
                if (rootContext === null) throw new Error("onChange without context");
                rootContext.requestBatchedChanges(this);
            }
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

    /**
     * Note: if you dispatch any changes to dependents from
     * this method, you MUST call [dispatchChangesBatched]
     */
    abstract onDependenciesChanged(): void;

    requestBatchedChanges(recipient: IChangeBatcher) {
        if (this === recipient) {
            // mostly a concern for a root context, like the Store's ref
            return;
        }

        this.changeBatchers.add(recipient);
    }

    notifyChangesBatched() {
        this.onDependenciesChanged();
        this.dispatchChangesBatched();
    }

    protected dispatchChangesBatched() {
        // NOTE: this needs to be a loop, since dependents of
        // batchers may themselves request batching if some of
        // their dependencies were not fulfilled

        // is it efficient enough to just keep making Sets like this?
        let workspace: Set<IChangeBatcher>;
        do {
            workspace = new Set(this.changeBatchers);
            this.changeBatchers.clear();

            workspace.forEach(target => {
                target.notifyChangesBatched();
            });
        } while (this.changeBatchers.size);
    }
}

export function withContext<V, P extends Params = []>(
    context: ISubContext,
    fn: SubFn<V, P>,
    ... params: P
): V {
    const current = GlobalContextManager.peek();
    if (current) {
        // the Context stack is depth-first, so the "current"
        // Context will *depend on* our new one
        current.subscribeTo(context);
    }

    GlobalContextManager.push(context);
    const result = fn(...params);
    GlobalContextManager.pop(context);

    return result;
}
