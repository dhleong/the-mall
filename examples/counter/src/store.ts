import { createStore } from "the-mall";

export interface ICounterState {
    count: number;
}

export const counterStore = createStore<ICounterState>({
    count: 0,
});
