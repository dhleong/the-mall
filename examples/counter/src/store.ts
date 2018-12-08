import { Store, sub } from "the-mall";

export interface ICounterState {
    count: number;
}

export const counterStore = new Store<ICounterState>({
    count: 0,
});
