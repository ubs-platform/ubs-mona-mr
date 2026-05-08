import { RestApiCollection } from '../rest-doc-extractor/parser/api.data';
import {
    NESTJS_SERVICE_FILE_CORE_HEAD,
    NESTJS_SERVICE_FILE_CORE_TAIL,
    NESTJS_SERVICE_HEADER,
    NESTJS_SERVICE_METHOD,
    NESTJS_SERVICE_NECESSARY_IMPORTS,
} from './templates';
import path from 'path';
import { DirectoryUtil } from '../util/directory-util';
import * as FileSystem from 'fs/promises';
import { NamingUtil } from '../util/naming-util';

export class NestjsServiceFileGenerator {
    static generateServiceClassStr(workDir: string, libraryPackageName: string, controller: RestApiCollection): string {
        const className = `${controller.name}Service`;
        const necessaryImports = NESTJS_SERVICE_NECESSARY_IMPORTS(workDir, libraryPackageName, controller.methods);
        const methods = controller.methods.map(method => NESTJS_SERVICE_METHOD(method)).join('\n');
        return `${NESTJS_SERVICE_HEADER}\n${necessaryImports}\n${NESTJS_SERVICE_FILE_CORE_HEAD(className, controller.parentPath)}\n${methods}\n${NESTJS_SERVICE_FILE_CORE_TAIL}`;
    }

    static async saveServiceToPath(workDir: string, libraryPackageName: string, savingPathPrefix: string, controller: RestApiCollection) {
        await DirectoryUtil.ensureDirectory(savingPathPrefix);
        const servicePath = path.join(savingPathPrefix, `${NamingUtil.camelOrPascalToKebab(controller.name)}.service.ts`);
        await FileSystem.writeFile(servicePath, this.generateServiceClassStr(workDir, libraryPackageName, controller), 'utf8');
    }

    static async generateAndSaveServices(workDir: string, libraryPackageName: string, savingPathPrefix: string, controllers: RestApiCollection[]) {
        for (let index = 0; index < controllers.length; index++) {
            const controller = controllers[index];
            if (controller.methods.length === 0) {
                continue;
            }
            await this.saveServiceToPath(workDir, libraryPackageName, savingPathPrefix, controller);
        }
    }
}
