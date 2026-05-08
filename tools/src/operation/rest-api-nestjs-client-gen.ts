import { ControllerScanner } from '../rest-doc-extractor/controller-scanner';
import { DirectoryUtil } from '../util/directory-util';
import { NestjsServiceFileGenerator } from '../nestjs-http-service-generator/nestjs-service-file-generator';
import path from 'path';
import { IksirPackage } from '../data/iksir-package';

export class RestApiNestjsClientGen {
    static async generate(workDir: string, paket: IksirPackage, targetDirectory?: string) {
        const mainPath = workDir;
        console.info('Project directory: ' + mainPath);
        const byProject = await ControllerScanner.scanAllControllers(mainPath);
        const exportPathEdited = targetDirectory
            ? targetDirectory
            : `${mainPath}/xr-generated/nestjs-services/${paket.packageObject.name}`;
        await DirectoryUtil.ensureDirectory(exportPathEdited);

        const projKeys = Object.keys(byProject);
        for (let index = 0; index < projKeys.length; index++) {
            const key = projKeys[index];
            const projectControllers = byProject[key];
            await NestjsServiceFileGenerator.generateAndSaveServices(
                workDir,
                paket.packageObject.iksir!.childrenPrefix,
                path.join(exportPathEdited, key),
                projectControllers,
            );
        }
    }
}
