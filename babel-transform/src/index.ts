import { NodePath, Visitor } from "@babel/traverse";
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

class MallUseContext {

    constructor(
        private readonly t: typeof types,
        private readonly path: NodePath<any>,
    ) {}

    public isMallImportedInScope(
        identifier: string,
    ) {
        const binding = this.path.scope.getBinding(identifier);
        if (!binding) {
            // shouldn't happen? assume it is not, I guess
            return false;
        }

        const { t } = this;
        if (t.isImportSpecifier(binding.path.node)) {
            // verify it's actually a mall component
            const declaration = binding.path.find(parent => t.isImportDeclaration(parent));
            if (t.isImportDeclaration(declaration.node)) {
                return "the-mall" === declaration.node.source.value;
            }
        }

        return false;
    }

    public renameFn(
        container: types.CallExpression,
        fn: FunctionExpr,
        newName: string,
    ): void {
        if (types.isFunctionExpression(fn)) {
            // easy case
            fn.id = types.identifier(newName);
            return;
        }

        // container.arguments[0] = types.identifier("test");
        this.setDisplayNameAfter(container, newName);
    }

    private setDisplayNameAfter(
        container: types.CallExpression,
        newName: string,
    ) {
        const block = this.path.find(candidate => {
            if (candidate.parentPath.isBlock()) {
                return true;
            }
            return false;
        });

        if (!block) {
            return; // ?
        }

        const t = this.t;
        block.insertAfter(
            t.expressionStatement(t.assignmentExpression(
                "=",
                t.memberExpression(
                    this.path.node.id,
                    t.identifier("displayName"),
                ),
                t.stringLiteral(newName),
            )),
        );
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
                const context = new MallUseContext(t, path);
                switch (method) {
                case "sub":
                case "connect":
                    if (!context.isMallImportedInScope(method)) {
                        return;
                    }

                    context.renameFn(node.init, fn, node.id.name);
                    return;

                default:
                    // nop
                }
            },
        },
    };
}
