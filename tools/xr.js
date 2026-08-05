"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const colors_1 = require("./util/colors");
const all_libraries_builder_1 = require("./operation/all-libraries-builder");
const iksir_package_1 = require("./data/iksir-package");
const nest_cli_wrap_1 = require("./operation/nest-cli-wrap");
const rest_api_doc_gen_1 = require("./operation/rest-api-doc-gen");
const rest_api_angular_client_gen_1 = require("./operation/rest-api-angular-client-gen");
const rest_api_nestjs_client_gen_1 = require("./operation/rest-api-nestjs-client-gen");
const exec_util_1 = require("./util/exec-util");
console.info(`
▗▖  ▗▖ ▗▄▖ ▗▖  ▗▖ ▗▄▖ ▗▖  ▗▖▗▄▄▖ 
▐▛▚▞▜▌▐▌ ▐▌▐▛▚▖▐▌▐▌ ▐▌ ▝▚▞▘ ▐▌ ▐▌
▐▌  ▐▌▐▌ ▐▌▐▌ ▝▜▌▐▛▀▜▌  ▐▌  ▐▛▀▚▖
▐▌  ▐▌▝▚▄▞▘▐▌  ▐▌▐▌ ▐▌▗▞▘▝▚▖▐▌ ▐▌
MonaXr for Mona5            H.C.G`);
const program = new commander_1.Command();
const workingDirectory = process.cwd();
const getPeerLibraryNames = async () => {
    const paket = await iksir_package_1.IksirPackage.scanRoot(workingDirectory);
    return paket.children
        .filter((child) => child.libraryMode === 'PEER')
        .map((child) => child.packageName);
};
const setLatestTagForLibraries = async (version) => {
    const packageNames = await getPeerLibraryNames();
    for (const packageName of packageNames) {
        console.info((0, colors_1.strColor)(colors_1.COLORS.FgBlue, `Setting latest tag for ${packageName}@${version}`));
        await exec_util_1.ExecUtil.exec(`npm dist-tag add "${packageName}@${version}" latest`);
        console.info((0, colors_1.strColor)(colors_1.COLORS.FgGreen, `Latest tag set for ${packageName}@${version}`));
    }
};
const deprecateVersionForLibraries = async (version, message) => {
    const packageNames = await getPeerLibraryNames();
    for (const packageName of packageNames) {
        console.info((0, colors_1.strColor)(colors_1.COLORS.FgBlue, `Deprecating ${packageName}@${version}`));
        await exec_util_1.ExecUtil.exec(`npm deprecate "${packageName}@${version}" "${message}"`);
        console.info((0, colors_1.strColor)(colors_1.COLORS.FgGreen, `Deprecated ${packageName}@${version}`));
    }
};
program
    .name('xr')
    .description('MonaXr — Mona5 için yardımcı geliştirme aracı')
    .version('1.0.0');
program
    .command('generate-ngx-services [targetDirectory]')
    .description('Projedeki REST API controller\'larından Angular HttpClient servisleri üretir')
    .action(async (targetDirectory) => {
    const paket = await iksir_package_1.IksirPackage.scanRoot(workingDirectory);
    await rest_api_angular_client_gen_1.RestApiAngularClientGen.generate(workingDirectory, paket, targetDirectory);
});
program
    .command('generate-nestjs-services [targetDirectory]')
    .description('Projedeki REST API controller\'larından NestJS HttpService client servisleri üretir')
    .action(async (targetDirectory) => {
    const paket = await iksir_package_1.IksirPackage.scanRoot(workingDirectory);
    await rest_api_nestjs_client_gen_1.RestApiNestjsClientGen.generate(workingDirectory, paket, targetDirectory);
});
program
    .command('generate-rest-doc')
    .description('Kaynak kodlardan REST API dokümantasyonu üretir')
    .action(async () => {
    await rest_api_doc_gen_1.RestApiDocGen.generate();
});
program
    .command('publish-libs')
    .description('Kütüphaneleri derler ve NPM Registry\'ye gönderir')
    .action(async () => {
    const paket = await iksir_package_1.IksirPackage.scanRoot(workingDirectory);
    const paketBuilder = new all_libraries_builder_1.AllLibrariesBuilder(paket);
    await paketBuilder.initiateBuildPublish({ publishNpm: true });
});
program
    .command('patch-libs <targetDirectory>')
    .description('Kütüphaneleri derler ve başka bir dizine (ör. node_modules) kopyalar')
    .action(async (targetDirectory) => {
    const paket = await iksir_package_1.IksirPackage.scanRoot(workingDirectory);
    const paketBuilder = new all_libraries_builder_1.AllLibrariesBuilder(paket);
    await paketBuilder.initiateBuildPublish({
        patchAnotherDirectory: true,
        patchTarget: targetDirectory,
    });
});
program
    .command('set-latest <version>')
    .description('PEER kütüphaneler için verilen sürümü latest etiketi yapar')
    .action(async (version) => {
    await setLatestTagForLibraries(version);
});
program
    .command('deprecate-libs <version> [message]')
    .description('PEER kütüphanelerde verilen sürümü deprecate eder')
    .action(async (version, message) => {
    const deprecateMessage = message ||
        'This version is deprecated. Please use the latest stable version.';
    await deprecateVersionForLibraries(version, deprecateMessage);
});
program
    .command('extend-lib <targetDirectory>')
    .description('NestJS kütüphanesini xr ile uyumlu hale getirir (ör. extend-lib ./libs/library-name)')
    .action(async (targetDirectory) => {
    const a = new nest_cli_wrap_1.NestJsCliWrap(workingDirectory);
    await a.checkPrefixIsSame();
    await a.extendLib(targetDirectory);
});
program
    .command('generate-lib <libName>')
    .description('Yeni bir NestJS kütüphanesi oluşturur ve xr ile uyumlu hale getirir')
    .action(async (libName) => {
    const a = new nest_cli_wrap_1.NestJsCliWrap(workingDirectory);
    await a.generateLib(libName);
});
console.info('Working directory is ' + workingDirectory);
program
    .parseAsync(process.argv)
    .then(() => {
    console.info((0, colors_1.strColor)(colors_1.COLORS.FgGreen, 'It seems there is no problem'));
})
    .catch((error) => {
    console.info((0, colors_1.strColor)(colors_1.COLORS.FgRed, 'Task has been failed. You can review error via following output'));
    console.error(error);
});
//# sourceMappingURL=xr.js.map