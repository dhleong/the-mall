import * as chai from "chai";

import { ISource } from "../src/model";
import { Store } from "../src/store";
import { sub } from "../src/sub";

import { IStoreState, newState } from "./test-util";

chai.should();
const { expect } = chai;

let store: Store<IStoreState>;
beforeEach(function() {
    store = new Store(newState());
});

describe("Level 0 Ref", () => {
    it("Notifies subscribers on Store change", () => {
        const s = sub(() => store.deref());
        const ref = s();
        const original = ref.deref();
        original.should.deep.equal(newState());

        const changes: any[] = [];

        const src = (ref as any as ISource<{}>);
        src.subscribe(v => {
            changes.push(v);
        });

        changes.should.be.empty;

        // modify store
        store.loadSnapshot({ships: {1: 2}});

        changes.should.not.be.empty;
    });
});

describe("Level 1 Ref", () => {
    it("gets de-cached from unqualified deref", () => {
        const s = sub(() => "mreynolds");

        const ref = s();
        s().should.equal(ref);

        ref.deref();
        s().should.not.equal(ref);
    });

    it("Notifies subscribers on Store change", () => {
        const s = sub(function ships() { return store.deref().ships; });
        const ref = s();
        const original = ref.deref();
        original.should.deep.equal({});

        const changes: any[] = [];

        const src = (ref as any as ISource<{}>);
        src.subscribe(v => {
            changes.push(v);
        });

        changes.should.be.empty;

        // modify store
        store.loadSnapshot({ships: {1: 2}});

        changes.should.not.be.empty;
    });

    it("Does not notify on unrelated Store change", () => {
        const s = sub(function ships() { return store.deref().ships; });
        const ref = s();
        const changes: any[] = [];

        // subscribe *first* to simulate being in a context
        const src = (ref as any as ISource<{}>);
        src.subscribe(v => {
            changes.push(v);
        });

        const original = ref.deref();
        original.should.deep.equal({});

        changes.should.be.empty;

        // modify store
        store.loadSnapshot({
            ...newState(),
            pilots: {1: 2},
        });

        changes.should.be.empty;
    });
});

describe("Level 2 Ref", () => {
    it("Notifies subscribers on Store change", () => {
        const shipsSub = sub(function ships() { return store.deref().ships; });
        const myShipSub = sub(function myShip(id: string) {
            const ships = shipsSub().deref();
            return ships[id];
        });
        const ref = myShipSub("serenity");

        const initial = ref.deref();
        expect(initial).to.be.undefined;

        const changes: any[] = [];

        const src = (ref as any as ISource<{}>);
        src.subscribe(v => {
            changes.push(v);
        });

        changes.should.be.empty;

        // add the ship
        store.loadSnapshot({
            ships: {serenity: 9001},
        });

        changes.should.deep.equal([
            9001,
        ]);
    });
});
