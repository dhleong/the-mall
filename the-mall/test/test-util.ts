export interface IStoreState {
    ships: {[key: string]: any};
    pilots?: {};
}

export function newState(): IStoreState {
    return {
        ships: {
        },
    };
}
