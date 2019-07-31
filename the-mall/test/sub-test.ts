import * as chai from "chai";

import { Store } from "../src/store";
import { sub } from "../src/sub";

import { IStoreState, newState } from "./test-util";

chai.should();
const { expect } = chai;

let store: Store<IStoreState>;
beforeEach(function() {
    store = new Store(newState());
});

describe("Subscription factories", () => {
    it("support displayNames for their refs", () => {
        const s = sub("TestSubscription", () => store.deref());
        const ref = s();
        expect(ref.displayName).to.equal("Reference(sub(TestSubscription))");
    });
});

describe("Level 0 sub()", () => {
    it("returns the store", () => {
        const s = sub(() => store.deref());
        const v = s().deref();
        v.should.deep.equal(newState());
    });
});

describe("Level 1 sub()", () => {
    it("supports const-ish values", () => {
        const s = sub(() => 42);
        const v = s().deref();
        v.should.equal(42);
    });

    it("supports parameters", () => {
        const s = sub((one: number, two: string) =>
            `${two}${one}`,
        );
        const v = s(42, "Answer:").deref();
        v.should.equal("Answer:42");
    });
});

describe("Level 2 sub()", () => {
    it("handles deref'ing another sub", () => {
        const sub1 = sub(() => 42);
        const sub2 = sub(() => {
            return sub1().deref() + 9001;
        });

        const v = sub2().deref();
        v.should.equal(9043);
    });
});
