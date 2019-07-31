import { NodePath } from "@babel/traverse";
import * as types from "@babel/types";
import { FunctionExpr } from "./types";

export class MallUseContext {

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

    public insertDisplayNameString(
        callSite: types.CallExpression,
        displayName: string,
    ) {
        const { t } = this;
        callSite.arguments.splice(
            0, 0,
            t.stringLiteral(displayName),
        );
    }

    public renameFn(
        fn: FunctionExpr,
        newName: string,
    ): boolean {
        if (!types.isFunctionExpression(fn)) return false;

        // easy case
        fn.id = types.identifier(newName);
        return true;
    }

    public setDisplayName(
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
