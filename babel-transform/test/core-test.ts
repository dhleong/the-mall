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
                import { connect } from "the-mall";
                const component = connect(function() {});
            `,

            output: `
                import { connect } from "the-mall";
                const component = connect(function component() {});
            `,
        },

        "Add name to sub() function expression": {
            code: `
                import { sub } from "the-mall";
                const subscription = sub(function() {});
            `,

            output: `
                import { sub } from "the-mall";
                const subscription = sub(function subscription() {});
            `,
        },

        "Set displayName on connect() arrow expression": {
            code: `
                import { connect } from "the-mall";
                const component = connect(() => {});
            `,

            output: `
                import { connect } from "the-mall";
                const component = connect(() => {});
                component.displayName = "component";
            `,
        },

        "Set displayName on sub() arrow expression": {
            code: `
                import { sub } from "the-mall";
                const subscription = sub(() => {});
            `,

            output: `
                import { sub } from "the-mall";
                const subscription = sub(() => {});
                subscription.displayName = "subscription";
            `,
        },

        "Ignore similar-looking but unrelated functions": {
            code: `
                const sub = () => {};

                const subscription = sub(() => {});
                const component = connect(() => {});
            `,

            output: `
                const sub = () => {};

                const subscription = sub(() => {});
                const component = connect(() => {});
            `,
        },
    },
});
