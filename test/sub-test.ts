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
    it("returns the store", () => {
        const s = sub();
        const v = derefWith(store, s());
        v.should.equal(defaultState);
    });
});

describe("Level 1 sub()", () => {
    it("supports const-ish values", () => {
        const s = sub(() => 42);
        const v = derefWith(store, s());
        v.should.equal(42);
    });

    it("supports parameters", () => {
        const s = sub((one: number, two: string) =>
            `${two}${one}`,
        );
        const v = derefWith(store, s(42, "Answer:"));
        v.should.equal("Answer:42");
    });
});

describe("Level 2 sub()", () => {
    it("handles deref'ing another sub", () => {
        const sub1 = sub(() => 42);
        const sub2 = sub(() => {
            return sub1().deref() + 9001;
        });

        const v = derefWith(store, sub2());
        v.should.equal(9043);
    });
});
