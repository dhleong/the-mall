import { NodePath } from "@babel/traverse";
import * as types from "@babel/types";
import { MallUseContext } from "./context";
import { IAddDisplayNameStrategy, renameOrInsertDisplayNameString, renameOrSetDisplayName } from "./strategy";
import { FunctionExpr } from "./types";

function isUnnamedFunction(
    expr: any,
): expr is FunctionExpr {
    return types.isArrowFunctionExpression(expr)
        || (types.isFunctionExpression(expr) && !expr.id);
}

const strategies: {[fn: string]: IAddDisplayNameStrategy} = {
    "connect": renameOrSetDisplayName,
    "sub": renameOrInsertDisplayNameString,
};

export function visit(
    t: typeof types,
    path: NodePath<types.VariableDeclarator>,
) {
    const { node } = path;

    if (
        !types.isIdentifier(node.id)
        || !types.isCallExpression(node.init)
        || !types.isIdentifier(node.init.callee)
        || node.init.arguments.length < 1
    ) {
        return;
    }

    const fn = node.init.arguments[0];
    if (!isUnnamedFunction(fn)) {
        // different type of call, or already named
        return;
    }

    const method = node.init.callee.name;

    const context = new MallUseContext(t, path);
    const resolvedMethodName = context.resolveMallMethodInScope(method);
    if (!resolvedMethodName) {
        // not actually our version of the fn
        return;
    }

    const strategy = strategies[resolvedMethodName];
    if (!strategy) return; // unrelated fn

    strategy(context, node.init, fn, node.id.name);
}
