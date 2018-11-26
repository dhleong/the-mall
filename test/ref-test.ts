import * as chai from "chai";

import { ISource } from "../lib/model";
import { Store } from "../lib/store";
import { sub } from "../lib/sub";

import { derefWith, IStoreState, newState } from "./test-util";

chai.should();

let store: Store<IStoreState>;
beforeEach(function() {
    store = new Store(newState());
});

const rootSub = sub<IStoreState>();

describe("Level 0 Ref", () => {
    // TODO
    it.skip("Notifies subscribers on Store change");
});

describe("Level 1 Ref", () => {
    it.skip("Notifies subscribers on Store change", () => {
        const s = sub(() => rootSub().deref().ships);
        const ref = s();
        const original = derefWith(store, ref);
        original.should.deep.equal({});

        const changes: any[] = [];

        const src = (ref as any as ISource<{}>);
        src.subscribe(v => {
            changes.push(v);
        });

        changes.should.be.empty;

        // TODO modify store
        store.loadSnapshot({ships: {1: 2}});

        changes.should.not.be.empty;
    });
});

describe("Level 2 Ref", () => {
    // TODO
    it("Notifies subscribers on Store change");
});
