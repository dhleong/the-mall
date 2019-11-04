import { addDefault, addNamed } from "@babel/helper-module-imports";
import traverse from "@babel/traverse";
import { createMacro } from "babel-plugin-macros";

import babelPlugin from "@the-mall/babel-plugin-display-name";

// NOTE: this macro is largely based on styled-components'
function mallMacro({
    references,
    state,
    babel: { types: t },
    config,
}: { references: any, config: any, state: any, babel: any }) {
    const program = state.file.path;

    // FIRST STEP : replace `the-mall/macro` with `the-mall`
    // references looks like this
    // { default: [path, path], css: [path], ... }
    let customImportName: string | undefined;
    const importAliases: { [alias: string]: string } = {};
    Object.keys(references).forEach(refName => {
        // generate new identifier
        let id: any;
        if (refName === "default") {
            id = addDefault(program, "the-mall", { nameHint: "mall" });
            customImportName = id;
        } else {
            id = addNamed(program, refName, "the-mall", { nameHint: refName });
            importAliases[id.name] = refName;
        }

        // update references with the new identifiers
        references[refName].forEach((referencePath: any) => {
            // eslint-disable-next-line no-param-reassign
            referencePath.node.name = id.name;
        });
    });

    // SECOND STEP : apply babel-plugin-styled-components to the file
    const stateWithOpts = {
        ...state,
        opts: config,
        customImportName,
        importAliases,
    };
    traverse(program.parent, babelPlugin({ types: t }).visitor, undefined, stateWithOpts);
}

export default createMacro(mallMacro);
