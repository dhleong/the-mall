import { NO_VALUE } from "./sub-values";

export function areSame(a: any, b: any): boolean {
    if (a === b) return true;
    if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;

    if (a === NO_VALUE && b !== NO_VALUE) return false;
    else if (b === NO_VALUE && a !== NO_VALUE) return false;

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    if (aKeys.length !== bKeys.length) return false;
    if (aKeys.length === 0) return true;

    for (const aKey of aKeys) {
        if (!areSame(a[aKey], b[aKey])) {
            return false;
        }
    }

    return a === b;
}

export const identity = (v: any) => v;
