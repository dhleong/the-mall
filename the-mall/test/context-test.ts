import * as chai from "chai";
import { events, sub } from "../src";
import { BaseSubContext, withContext } from "../src/context";
import { Store } from "../src/store";

import { IStoreState, newState } from "./test-util";

chai.should();

class TestableContext extends BaseSubContext {
    dependencyChanges = 0;

    onDependenciesChanged() {
        ++this.dependencyChanges;
        this.dispatchChangesBatched();
    }

    toString() {
        return "TestableContext()";
    }
}

let store: Store<IStoreState>;
beforeEach(function() {
    store = new Store(newState());
});

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
            return Object.keys(store.deref().ships).length;
        });
        const ships = sub(function _ships() { return store.deref().ships; });
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
        ctx.dependencyChanges.should.equal(0);

        // verify subs are cached
        shipsCount().should.equal(shipsCount());
        ships().should.equal(ships());
        shipById("serenity").should.equal(shipById("serenity"));

        // changing the Store triggers a pass
        store.dispatchSync(setShip("serenity", 9001));

        // NOTE: we depend on *two* subs, shipsCount() and shipsById()
        // but we should "debounce" to get only a single notification
        const postEventChanges = ctx.dependencyChanges;
        postEventChanges.should.equal(1);

        // on pass 2, references that were not deref'd
        //  should get unsubscribed from
        withContext(ctx, render);

        // the shipsCount() sub will not change here, and the previous
        // render should have unsubscribed from shipById, so
        // this change should not trigger another render
        store.dispatchSync(setShip("serenity", 9002));
        ctx.dependencyChanges.should.equal(postEventChanges);

        // the shipsCount() sub should now change:
        store.dispatchSync(setShip("firefly", 9003));
        ctx.dependencyChanges.should.equal(1 + postEventChanges);
    });

    it("should still get notified with deep sub hierarchy", () => {
        // in a context:
        const ctx = new TestableContext();
        ctx.setStore(store);

        // level 1
        const ships = sub(() => store.deref().ships);
        const ships2 = sub(() => store.deref().ships);
        const pilots = sub(() => store.deref().pilots);
        const pilots2 = sub(() => store.deref().pilots);

        // level2
        const shipsCount = sub(() => {
            pilots().deref(); // depend on it for the graph
            return Object.keys(ships().deref()).length;
        });
        const ships2Count = sub(() => {
            pilots2().deref(); // depend on it for the graph
            return Object.keys(ships2().deref()).length;
        });
        const pilotsCount = sub(() => Object.keys(pilots().deref() || {}).length);

        // level 3
        const pilotsCountX2 = sub(() => 2 * pilotsCount().deref());

        function render() {
            shipsCount().deref();
            ships2Count().deref();
            pilotsCountX2().deref();
        }

        // on pass 1, references that were deref'd
        //  get subscribed to
        withContext(ctx, render);

        // no changes yet
        ctx.dependencyChanges.should.equal(0);

        // changing the Store triggers a pass
        store.dispatchSync(setShip("serenity", 9001));

        // we should get notified exactly once!
        ctx.dependencyChanges.should.equal(1);
    });
});
