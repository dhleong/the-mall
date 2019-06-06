import * as chai from "chai";

import { Store } from "../src/store";
import { sub } from "../src/sub";

import { composeStores, createStore } from "../src";
import { ISource } from "../src/model";
import { IStoreState, newState } from "./test-util";

chai.should();

let browncoatsStore: Store<IStoreState>;
let allianceStore: Store<IStoreState>;
beforeEach(function() {
    browncoatsStore = new Store(newState());
    allianceStore = new Store(newState());
});

describe("sub()", () => {
    it("works across stores", () => {
        browncoatsStore.loadSnapshot({ships: {"serenity": "serenity"}});
        allianceStore.loadSnapshot({ships: {"magellan": "magellan"}});

        const allShipsSub = sub(() => {
            const b = browncoatsStore.deref();
            const a = allianceStore.deref();
            return [ ...Object.keys(b.ships), ...Object.keys(a.ships) ];
        });

        const ref = allShipsSub();
        const original = ref.deref();
        original.should.deep.equal(["serenity", "magellan"]);

        const changes: any[] = [];

        const src = (ref as any as ISource<[]>);
        src.subscribe(v => {
            changes.push(v);
        });

        changes.should.be.empty;

        // update one store:
        browncoatsStore.loadSnapshot({ships: { "mals-ship": "serenity" }});
        changes.should.deep.equal([
            ["mals-ship", "magellan"],
        ]);

        // update the other:
        allianceStore.loadSnapshot({ships: { "alliance": "magellan" }});
        changes.should.deep.equal([
            ["mals-ship", "magellan"],
            ["mals-ship", "alliance"],
        ]);
    });
});

describe("compose()", () => {
    it("combines stores", () => {
        const cargoStore = createStore({
            cargo: {} as {[key: string]: string},
        });

        const store = composeStores({
            browncoats: browncoatsStore,
            cargo: cargoStore,
        });
        const v = store.deref();
        v.browncoats.ships.should.be.empty;
        v.cargo.should.deep.equal({
            cargo: {},
        });

        const newComposedState = {
            browncoats: {
                ships: {
                    serenity: "",
                },
            },

            cargo: {
                cargo: {
                    bhgd: "bobble-headed geisha dolls",
                },
            },
        };

        store.dispatchSync((old) => {
            return {
                ...old,
                ...newComposedState,
            };
        });

        const updated = store.getSnapshot();
        updated.should.deep.equal(newComposedState);
    });
});
