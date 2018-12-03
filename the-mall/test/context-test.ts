import * as chai from "chai";
import { sub } from "../src";
import { BaseSubContext, withContext } from "../src/context";
import { Store } from "../src/store";

import { IStoreState, newState } from "./test-util";

chai.should();

class TestableContext extends BaseSubContext {
    readonly dependencyChanges: any[] = [];

    onDependenciesChanged(dependencies: any) {
        this.dependencyChanges.push(dependencies);
    }

    toString() {
        return "TestableContext()";
    }
}

let store: Store<IStoreState>;
beforeEach(function() {
    store = new Store(newState());
});

const rootSub = sub<IStoreState>();

describe("Context", () => {
    it("should dispose subscriptions when unused", () => {
        // in a context:
        const ctx = new TestableContext();
        ctx.setStore(store);

        const ships = sub(function _ships() { return rootSub().deref().ships; });
        const shipById = sub(function _byId(id: string) {
            return ships().deref()[id];
        });

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
        const postSnapshotChanges = [... ctx.dependencyChanges];
        postSnapshotChanges.should.have.lengthOf(1);

        // on pass 2, references that were not deref'd
        //  should get unsubscribed from
        withContext(ctx, render);

        // the ships() sub did not change, and the previous
        // render should have unsubscribed from shipById, so
        // this change should not trigger another render
        store.loadSnapshot({ ships: {serenity: 9002}});
        ctx.dependencyChanges.should.have.lengthOf(postSnapshotChanges.length);
    });
});
