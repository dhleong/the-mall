// @ts-ignore
import pluginTester from "babel-plugin-tester";

// NOTE: when not run from within this directory, ts-node
// seems to fail to find the @types file...

import mallTransformPlugin from "../src";

pluginTester({
    plugin: mallTransformPlugin,
    tests: {
        "Add name to connect() function expression": {
            code: `
                const component = connect(function() {});
            `,

            output: `
                const component = connect(function component() {});
            `,
        },

        "Add name to sub() function expression": {
            code: `
                const component = sub(function() {});
            `,

            output: `
                const component = sub(function component() {});
            `,
        },

        // TODO
        // "Rewrite connect() arrow expression to named function expression": {
        //     code: `
        //         const component = connect(() => {});
        //     `,
        //
        //     output: `
        //         const component = connect(function component() {});
        //     `,
        // },
    },
});
