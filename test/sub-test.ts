import * as chai from "chai";

import { Store } from "../lib/store";
import { sub } from "../lib/sub";
import { derefWith } from "./test-util";

chai.should();

type StoreState = {
    ships: {},
};

const defaultState: StoreState = {
    ships: {
    },
};

let store: Store<StoreState>;
beforeEach(function() {
    store = new Store(defaultState);
});

describe("Level 0 sub()", () => {
    it("should return the store", () => {
        const s = sub();
        const v = derefWith(store, s());
        v.should.equal(defaultState);
    });
});

describe("Level 1 sub()", () => {
    it("should support const-ish values", () => {
        const s = sub(() => 42);
        const v = derefWith(store, s());
        v.should.equal(42);
    });
});
