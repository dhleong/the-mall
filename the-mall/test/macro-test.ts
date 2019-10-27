// @ts-ignore
import pluginTester from "babel-plugin-tester";

// NOTE: when not run from within this directory, ts-node
// seems to fail to find the @types file...

// @ts-ignore
import plugin from "babel-plugin-macros";

pluginTester({
    title: "@the-mall/macro",
    plugin,
    snapshot: false,
    babelOptions: { filename: __filename },
    tests: {
        "should work with sub": {
            code: `
                import { sub } from "../macro";
                const subscription = sub(() => {});
            `,
            output: `
                import { sub as _sub } from "the-mall";

                const subscription = _sub("subscription", () => {});
            `,
        },

        "should work with multiple": {
            code: `
                import { connect, sub } from "../macro";
                const subscription = sub(() => {});
                const Component = connect(() => {});
            `,
            output: `
                import { sub as _sub } from "the-mall";
                import { connect as _connect } from "the-mall";

                const subscription = _sub("subscription", () => {});

                const Component = _connect(() => {});

                Component.displayName = "ConnectedComponent";
            `,
        },
    },
});
