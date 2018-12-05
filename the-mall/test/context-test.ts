import * as chai from "chai";
import { events, sub } from "../src";
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

const setShip = events.store((old: IStoreState, name: string, score: number) => {
    return {
        ...old,
        ships: {
            ...(old.ships),
            [name]: score,
        },
    };
});

describe("Context", () => {
    it("should dispose subscriptions when unused", () => {
        // in a context:
        const ctx = new TestableContext();
        ctx.setStore(store);

        const shipsCount = sub(function _shipsCount() {
            return Object.keys(rootSub().deref().ships).length;
        });
        const ships = sub(function _ships() { return rootSub().deref().ships; });
        const shipById = sub(function _byId(id: string) {
            return ships().deref()[id];
        });

        function render() {
            // this creates a dependency on ships()
            const count = shipsCount().deref();
            if (count === 0) {
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
        store.dispatchSync(setShip("serenity", 9001));

        // FIXME: we depend on *two* subs, shipsCount() and shipsById()
        // future work should debounce the events dispatch so the context
        // only sees at most one onDependenciesChanged per event
        const postEventChanges = [... ctx.dependencyChanges];
        postEventChanges.should.have.lengthOf(2);

        // on pass 2, references that were not deref'd
        //  should get unsubscribed from
        withContext(ctx, render);

        // the shipsCount() sub will not change here, and the previous
        // render should have unsubscribed from shipById, so
        // this change should not trigger another render
        store.dispatchSync(setShip("serenity", 9002));
        ctx.dependencyChanges.should.have.lengthOf(postEventChanges.length);

        // the shipsCount() sub should now change:
        store.dispatchSync(setShip("firefly", 9003));
        ctx.dependencyChanges.should.have.lengthOf(1 + postEventChanges.length);
    });
});
