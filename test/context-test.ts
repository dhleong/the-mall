import * as chai from "chai";
import { sub } from "../lib";
import { BaseSubContext, withContext } from "../lib/context";
import { Store } from "../lib/store";

import { IStoreState, newState } from "./test-util";

chai.should();

class TestableContext extends BaseSubContext {
    readonly dependencyChanges: any[] = [];

    onDependenciesChanged(dependencies: any) {
        this.dependencyChanges.push(dependencies);
    }
}

let store: Store<IStoreState>;
beforeEach(function() {
    store = new Store(newState());
});

const rootSub = sub<IStoreState>();

describe("Context", () => {
    it.skip("should dispose subscriptions when unused", () => {
        // in a context:
        const ctx = new TestableContext();
        ctx.setStore(store);

        const ships = sub(() => rootSub().deref().ships);
        const shipById = sub((id: string) => ships().deref()[id]);

        function render() {
            // this creates a dependency on ships()
            const all = ships().deref();
            if (!Object.keys(all).length) {
                // this doesn't make much sense, but...
                shipById("serenity").deref();
            }
        }

        // on pass 1, references that were deref'd
        //  get subscribed to
        withContext(ctx, render);

        // no changes yet
        ctx.dependencyChanges.should.be.empty;

        // changing the Store triggers another pass
        store.loadSnapshot({ ships: {serenity: 9001}});
        ctx.dependencyChanges.should.have.lengthOf(2);

        // TODO on pass 2, references that were not deref'd
        //  should get unsubscribed from
        withContext(ctx, render);

        // TODO the ships() sub did not change, and the previous
        // render should have unsubscribed from shipById, so
        // this change should not trigger another render
        store.loadSnapshot({ ships: {serenity: 9002}});
        ctx.dependencyChanges.should.have.lengthOf(2);

    });
});
