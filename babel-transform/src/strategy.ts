import * as types from "@babel/types";
import { MallUseContext } from "./context";
import { FunctionExpr } from "./types";

export interface IAddDisplayNameStrategy {
    (
        context: MallUseContext,
        callSite: types.CallExpression,
        factoryFn: FunctionExpr,
        displayName: string,
    ): void;
}

export function renameOrSetDisplayNameWithPrefix(
    prefix: string,
) {
    return (
        context: MallUseContext,
        callSite: types.CallExpression,
        factoryFn: FunctionExpr,
        displayName: string,
    ) => {
        if (!context.renameFn(factoryFn, displayName)) {
            context.setDisplayName(prefix + displayName);
        }
    };
}

export function renameOrSetDisplayName(
    context: MallUseContext,
    callSite: types.CallExpression,
    factoryFn: FunctionExpr,
    displayName: string,
) {
    if (!context.renameFn(factoryFn, displayName)) {
        context.setDisplayName(displayName);
    }
}

export function renameOrInsertDisplayNameString(
    context: MallUseContext,
    callSite: types.CallExpression,
    factoryFn: FunctionExpr,
    displayName: string,
) {
    if (!context.renameFn(factoryFn, displayName)) {
        context.insertDisplayNameString(callSite, displayName);
    }
}
