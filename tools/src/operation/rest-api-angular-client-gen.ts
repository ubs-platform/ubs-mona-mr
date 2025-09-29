import { writeFileSync } from 'fs';
import { ControllerScanner } from '../rest-doc-extractor/controller-scanner';
import { DirectoryUtil } from '../util/directory-util';
import { NgxServiceFileGenerator } from '../angular-http-service-generator/ngx-service-file-generator';
import path from 'path';
import { IksirPackage } from '../data/iksir-package';

export class RestApiAngularClientGen {
    static async generate(workDir: string, paket: IksirPackage, exportPath?: string) {
        const mainPath = workDir;
        console.info('Project directory: ' + mainPath);
        const byProject = ControllerScanner.scanAllControllers(mainPath);
        const exportPathEdited = exportPath ? exportPath : `${mainPath}/xr-generated/angular-services/${paket.packageObject.name}`
        await DirectoryUtil.ensureDirectory(exportPathEdited);

        const projKeys = Object.keys(byProject);
        for (let index = 0; index < projKeys.length; index++) {
            const key = projKeys[index];
            const projectControllers = byProject[key];
            await NgxServiceFileGenerator.generateAndSaveServices(workDir, paket.packageObject.iksir!.childrenPrefix, path.join(exportPathEdited, key), projectControllers);
        }

    }
}
    