"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const colors_1 = require("./util/colors");
const all_libraries_builder_1 = require("./operation/all-libraries-builder");
const iksir_package_1 = require("./data/iksir-package");
const nest_cli_wrap_1 = require("./operation/nest-cli-wrap");
const rest_api_doc_gen_1 = require("./operation/rest-api-doc-gen");
const rest_api_angular_client_gen_1 = require("./operation/rest-api-angular-client-gen");
console.info(`
▗▖  ▗▖ ▗▄▖ ▗▖  ▗▖ ▗▄▖ ▗▖  ▗▖▗▄▄▖ 
▐▛▚▞▜▌▐▌ ▐▌▐▛▚▖▐▌▐▌ ▐▌ ▝▚▞▘ ▐▌ ▐▌
▐▌  ▐▌▐▌ ▐▌▐▌ ▝▜▌▐▛▀▜▌  ▐▌  ▐▛▀▚▖
▐▌  ▐▌▝▚▄▞▘▐▌  ▐▌▐▌ ▐▌▗▞▘▝▚▖▐▌ ▐▌
MonaXr for Mona5            H.C.G`);
const actionList = {
    'generate-ngx-services': {
        info: "Generates Angular HttpClient services from REST API controllers in the current project",
        action: async (workDir, targetDirectory) => {
            const paket = await iksir_package_1.IksirPackage.scanRoot(workDir);
            await rest_api_angular_client_gen_1.RestApiAngularClientGen.generate(workDir, paket, targetDirectory);
        },
    },
    'generate-rest-doc': {
        info: 'Generates REST API documentation from source codes',
        action: async () => {
            await rest_api_doc_gen_1.RestApiDocGen.generate();
        },
    },
    'publish-libs': {
        info: 'Builds libraries and pushes into NPM Registry',
        action: async (workDir) => {
            const paket = await iksir_package_1.IksirPackage.scanRoot(workDir);
            const paketBuilder = new all_libraries_builder_1.AllLibrariesBuilder(paket);
            await paketBuilder.initiateBuildPublish({ publishNpm: true });
        },
    },
    'patch-libs': {
        info: "Builds libraries and patches them into another directory (like your project's node_modules directory)",
        action: async (workDir, targetDirectory) => {
            if (targetDirectory) {
                const paket = await iksir_package_1.IksirPackage.scanRoot(workDir);
                const paketBuilder = new all_libraries_builder_1.AllLibrariesBuilder(paket);
                await paketBuilder.initiateBuildPublish({
                    patchAnotherDirectory: true,
                    patchTarget: targetDirectory,
                });
            }
            else {
                throw 'Target directory is needed. If you want to patch your another project that uses Mona, that directory should end with node_modules. More details, use "npm run xr:help"';
            }
        },
    },
    'extend-lib': {
        info: 'Makes a nestjs library compitable for xr (extend-lib ./libs/library-name)',
        action: async (workDir, targetDirectory) => {
            if (targetDirectory) {
                const a = await new nest_cli_wrap_1.NestJsCliWrap(workDir);
                await a.checkPrefixIsSame();
                await a.extendLib(targetDirectory);
            }
            else {
                throw "Target directory is needed. Usually it is 'libs/library-name'";
            }
        },
    },
    help: {
        info: 'Prints actions and parameters that can be used for monaxr command',
        action: async (params) => {
            console.info('MonaXr  is a tool that helps compile and publish their auxiliary libraries safely and quickly. This is not a replacement for "Nestjs CLI". It just helps with more orderly development in the Mona repository');
            console.info('Usage: npm run xr [COMMAND] [Extra Parameters]');
            console.info('Available Commands:\n', Object.entries(actionList)
                .map(([key, val]) => '\t' + key + ' => ' + val.info)
                .join('\n'));
        },
    },
};
const [node, file, action, ...parameters] = process.argv;
const workingDirectory = process.cwd();
console.info('Working directory is ' + workingDirectory);
let actionObj = actionList[action];
if (actionObj == null) {
    console.warn((0, colors_1.strColor)(colors_1.COLORS.FgYellow, `${action} action is not found. You can review the available commands`));
    actionObj = actionList['help'];
}
actionObj
    .action(workingDirectory, ...parameters)
    .then(() => {
    console.info((0, colors_1.strColor)(colors_1.COLORS.FgGreen, 'It seems there is no problem'));
})
    .catch((error) => {
    console.info((0, colors_1.strColor)(colors_1.COLORS.FgRed, 'Task has been failed. You can review error via following output'));
    console.error(error);
});
//# sourceMappingURL=xr.js.map