import * as chai from "chai";

import { createStore, IStore } from "../src";
import { DefaultEffector } from "../src/effects";

import { IStoreState, newState } from "./test-util";

chai.should();

describe("Effector", () => {
    it("can distinguish between Simple- and State- EffectHandlers", () => {
        const simpleInvokes: string[] = [];
        const stateInvokes: string[] = [];

        const simpleEffect = function(id: string) {
            simpleInvokes.push(id);
        };
        const stateEffect = function(store: IStore<IStoreState>, id: string) {
            stateInvokes.push(id);
        };

        const myStore = createStore<IStoreState>(newState());

        const fx = new DefaultEffector(myStore.getSnapshot());
        fx.produce(simpleEffect, "simple");
        fx.produce(stateEffect, "state");

        simpleInvokes.should.be.empty;
        stateInvokes.should.be.empty;

        fx.invokeQueued(myStore);

        simpleInvokes.should.deep.equal(["simple"]);
        stateInvokes.should.deep.equal(["state"]);
    });
});
