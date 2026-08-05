import path from 'path';
import { Command } from 'commander';
import { COLORS, strColor } from './util/colors';
import { AllLibrariesBuilder } from './operation/all-libraries-builder';
import { IksirPackage } from './data/iksir-package';
import { NestJsCliWrap } from './operation/nest-cli-wrap';
import { RestApiDocGen } from './operation/rest-api-doc-gen';
import { RestApiAngularClientGen } from './operation/rest-api-angular-client-gen';
import { RestApiNestjsClientGen } from './operation/rest-api-nestjs-client-gen';
import { ExecUtil } from './util/exec-util';

console.info(
    `
▗▖  ▗▖ ▗▄▖ ▗▖  ▗▖ ▗▄▖ ▗▖  ▗▖▗▄▄▖ 
▐▛▚▞▜▌▐▌ ▐▌▐▛▚▖▐▌▐▌ ▐▌ ▝▚▞▘ ▐▌ ▐▌
▐▌  ▐▌▐▌ ▐▌▐▌ ▝▜▌▐▛▀▜▌  ▐▌  ▐▛▀▚▖
▐▌  ▐▌▝▚▄▞▘▐▌  ▐▌▐▌ ▐▌▗▞▘▝▚▖▐▌ ▐▌
MonaXr for Mona5            H.C.G`,
);

const program = new Command();
const workingDirectory = process.cwd();

const getPeerLibraryNames = async () => {
    const paket = await IksirPackage.scanRoot(workingDirectory);
    return paket.children
        .filter((child) => child.libraryMode === 'PEER')
        .map((child) => child.packageName);
};

const setLatestTagForLibraries = async (version: string) => {
    const packageNames = await getPeerLibraryNames();

    for (const packageName of packageNames) {
        console.info(
            strColor(
                COLORS.FgBlue,
                `Setting latest tag for ${packageName}@${version}`,
            ),
        );
        await ExecUtil.exec(
            `npm dist-tag add "${packageName}@${version}" latest`,
        );
        console.info(
            strColor(
                COLORS.FgGreen,
                `Latest tag set for ${packageName}@${version}`,
            ),
        );
    }
};

const deprecateVersionForLibraries = async (
    version: string,
    message: string,
) => {
    const packageNames = await getPeerLibraryNames();

    for (const packageName of packageNames) {
        console.info(
            strColor(
                COLORS.FgBlue,
                `Deprecating ${packageName}@${version}`,
            ),
        );
        await ExecUtil.exec(
            `npm deprecate "${packageName}@${version}" "${message}"`,
        );
        console.info(
            strColor(
                COLORS.FgGreen,
                `Deprecated ${packageName}@${version}`,
            ),
        );
    }
};

program
    .name('xr')
    .description('MonaXr — Mona5 için yardımcı geliştirme aracı')
    .version('1.0.0');

program
    .command('generate-ngx-services [targetDirectory]')
    .description('Projedeki REST API controller\'larından Angular HttpClient servisleri üretir')
    .action(async (targetDirectory: string | undefined) => {
        const paket = await IksirPackage.scanRoot(workingDirectory);
        await RestApiAngularClientGen.generate(workingDirectory, paket, targetDirectory);
    });

program
    .command('generate-nestjs-services [targetDirectory]')
    .description('Projedeki REST API controller\'larından NestJS HttpService client servisleri üretir')
    .action(async (targetDirectory: string | undefined) => {
        const paket = await IksirPackage.scanRoot(workingDirectory);
        await RestApiNestjsClientGen.generate(workingDirectory, paket, targetDirectory);
    });

program
    .command('generate-rest-doc')
    .description('Kaynak kodlardan REST API dokümantasyonu üretir')
    .action(async () => {
        await RestApiDocGen.generate();
    });

program
    .command('publish-libs')
    .description('Kütüphaneleri derler ve NPM Registry\'ye gönderir')
    .action(async () => {
        const paket = await IksirPackage.scanRoot(workingDirectory);
        const paketBuilder = new AllLibrariesBuilder(paket);
        await paketBuilder.initiateBuildPublish({ publishNpm: true });
    });

program
    .command('patch-libs <targetDirectory>')
    .description('Kütüphaneleri derler ve başka bir dizine (ör. node_modules) kopyalar')
    .action(async (targetDirectory: string) => {
        const paket = await IksirPackage.scanRoot(workingDirectory);
        const paketBuilder = new AllLibrariesBuilder(paket);
        await paketBuilder.initiateBuildPublish({
            patchAnotherDirectory: true,
            patchTarget: targetDirectory,
        });
    });

program
    .command('set-latest <version>')
    .description('PEER kütüphaneler için verilen sürümü latest etiketi yapar')
    .action(async (version: string) => {
        await setLatestTagForLibraries(version);
    });

program
    .command('deprecate-libs <version> [message]')
    .description('PEER kütüphanelerde verilen sürümü deprecate eder')
    .action(async (version: string, message?: string) => {
        const deprecateMessage =
            message ||
            'This version is deprecated. Please use the latest stable version.';
        await deprecateVersionForLibraries(version, deprecateMessage);
    });

program
    .command('extend-lib <targetDirectory>')
    .description('NestJS kütüphanesini xr ile uyumlu hale getirir (ör. extend-lib ./libs/library-name)')
    .action(async (targetDirectory: string) => {
        const a = new NestJsCliWrap(workingDirectory);
        await a.checkPrefixIsSame();
        await a.extendLib(targetDirectory);
    });

program
    .command('generate-lib <libName>')
    .description('Yeni bir NestJS kütüphanesi oluşturur ve xr ile uyumlu hale getirir')
    .action(async (libName: string) => {
        const a = new NestJsCliWrap(workingDirectory);
        await a.generateLib(libName);
    });

console.info('Working directory is ' + workingDirectory);

program
    .parseAsync(process.argv)
    .then(() => {
        console.info(strColor(COLORS.FgGreen, 'It seems there is no problem'));
    })
    .catch((error) => {
        console.info(
            strColor(COLORS.FgRed, 'Task has been failed. You can review error via following output'),
        );
        console.error(error);
    });
