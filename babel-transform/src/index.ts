import { Visitor } from "@babel/traverse";
import * as types from "@babel/types";

import { visit } from "./visitor";

export interface IPlugin {
    name: string;
    visitor: Visitor;
}

export default function mallTransformPlugin(
    {types: t}: {types: typeof types},
): IPlugin {

    return {
        name: "the-mall-babel-plugin-transform",
        visitor: {
            VariableDeclarator: (path) => {
                visit(t, path);
            },
        },
    };
}
