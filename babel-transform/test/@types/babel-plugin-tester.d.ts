declare module "babel-plugin-tester" {

    export interface ITestConfig {
        plugin: any;
        tests: any;
    }

    export default function pluginTester(config: ITestConfig): void;
}
