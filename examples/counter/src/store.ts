import { Store, sub } from "the-mall";

interface ICounterState {
    count: number;
}

export const counterStore = new Store<ICounterState>({
    count: 0,
});

export const rootSub = sub<ICounterState>();
