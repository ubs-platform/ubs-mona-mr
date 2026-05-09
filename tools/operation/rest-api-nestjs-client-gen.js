"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestApiNestjsClientGen = void 0;
const controller_scanner_1 = require("../rest-doc-extractor/controller-scanner");
const directory_util_1 = require("../util/directory-util");
const nestjs_service_file_generator_1 = require("../nestjs-http-service-generator/nestjs-service-file-generator");
const path_1 = __importDefault(require("path"));
class RestApiNestjsClientGen {
    static async generate(workDir, paket, targetDirectory) {
        const mainPath = workDir;
        console.info('Project directory: ' + mainPath);
        const byProject = await controller_scanner_1.ControllerScanner.scanAllControllers(mainPath);
        const exportPathEdited = targetDirectory
            ? targetDirectory
            : `${mainPath}/xr-generated/nestjs-services/${paket.packageObject.name}`;
        await directory_util_1.DirectoryUtil.ensureDirectory(exportPathEdited);
        const projKeys = Object.keys(byProject);
        for (let index = 0; index < projKeys.length; index++) {
            const key = projKeys[index];
            const projectControllers = byProject[key];
            await nestjs_service_file_generator_1.NestjsServiceFileGenerator.generateAndSaveServices(workDir, paket.packageObject.iksir.childrenPrefix, path_1.default.join(exportPathEdited, key), projectControllers);
        }
    }
}
exports.RestApiNestjsClientGen = RestApiNestjsClientGen;
//# sourceMappingURL=rest-api-nestjs-client-gen.js.map