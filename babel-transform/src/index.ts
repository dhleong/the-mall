import { Visitor } from "@babel/traverse";
import * as types from "@babel/types";

export interface IPlugin {
    name: string;
    visitor: Visitor;
}

type FunctionExpr = types.ArrowFunctionExpression | types.FunctionExpression;

function isUnnamedFunction(
    expr: any,
): expr is FunctionExpr {
    return types.isArrowFunctionExpression(expr)
        || (types.isFunctionExpression(expr) && !expr.id);
}

function renameFn(
    fn: FunctionExpr,
    newName: string,
) {
    if (types.isFunctionExpression(fn)) {
        // easy case
        fn.id = types.identifier(newName);
    }
}

export default function mallTransformPlugin(
    {types: t}: {types: typeof types},
): IPlugin {

    // TODO verify sub/connect are imported as themself?

    return {
        name: "the-mall-babel-plugin-transform",
        visitor: {
            VariableDeclarator: (path) => {
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
                switch (method) {
                case "sub":
                case "connect":
                    renameFn(fn, node.id.name);
                    return;

                default:
                    // nop
                }
            },
        },
    };
}
